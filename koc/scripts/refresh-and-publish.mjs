import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appendFile, mkdir, open, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execute = promisify(execFile);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATASET_PATH = 'koc/data/koc-data.json';

/** Parse porcelain -z without splitting or unquoting user-controlled filenames. */
export function parseStatusZ(output) {
  const records = output.split('\0');
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    if (record.length < 4 || record[2] !== ' ') throw new Error('Git 상태를 안전하게 해석하지 못했습니다.');
    const entry = { index: record[0], worktree: record[1], path: record.slice(3) };
    if (/[RC]/.test(entry.index + entry.worktree)) entry.originalPath = records[++index];
    entries.push(entry);
  }
  return entries;
}

export function assertWorkspace(entries, { allowDataset = false, stagedDataset = false } = {}) {
  for (const entry of entries) {
    if (!allowDataset || entry.path !== DATASET_PATH || entry.originalPath) {
      throw new Error('저장소에 사용자 변경이 있습니다. 변경을 보존하고 자동 갱신을 중단합니다.');
    }
    const expectedStatus = stagedDataset ? ['M ', 'A '] : [' M', '??'];
    if (!expectedStatus.includes(entry.index + entry.worktree)) {
      throw new Error('예상하지 못한 스테이징 또는 데이터 변경이 있습니다. 자동 갱신을 중단합니다.');
    }
  }
}

export function assertPublicationCommit({ branch, ahead, changedPaths, expectedCommit }) {
  if (branch !== 'main') throw new Error('main 브랜치에서만 자동 게시할 수 있습니다.');
  if (!/^[0-9a-f]{40,64}$/.test(expectedCommit || '') || ahead.length !== 1 || ahead[0] !== expectedCommit) {
    throw new Error('자동 갱신이 만든 커밋 외에 게시되지 않은 커밋이 있습니다. 사용자 커밋을 보존합니다.');
  }
  if (changedPaths.length !== 1 || changedPaths[0] !== DATASET_PATH) {
    throw new Error('게시 대상 커밋이 데이터 파일 이외의 변경을 포함합니다.');
  }
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function main() {
  const localRoot = resolve(appRoot, 'tmp');
  const lockPath = resolve(localRoot, 'publisher.lock');
  const pendingPath = resolve(localRoot, 'pending-publication.json');
  const statusPath = resolve(localRoot, 'sync-status.json');
  const logPath = resolve(localRoot, 'sync.log');
  const gitCommand = process.env.KOC_GIT_PATH || 'git';
  let repoRoot = resolve(appRoot, '..');
  let lockOwned = false;
  const run = async (command, args, options = {}) => {
    try {
      return await execute(command, args, {
        cwd: repoRoot, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
        timeout: 120_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' }, ...options,
      });
    } catch (error) {
      // Do not copy raw CLI/Git output into logs: it can contain authentication details.
      const failure = new Error(`${command === gitCommand ? 'Git' : '데이터 갱신 또는 검증'} 단계가 실패했습니다. 인증·연결·저장소 상태를 확인하세요.`);
      failure.exitCode = error.code;
      throw failure;
    }
  };
  const git = async (args) => (await run(gitCommand, args)).stdout;
  const clean = async (options) => assertWorkspace(parseStatusZ(await git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])), options);
  const branch = async () => (await git(['branch', '--show-current'])).trim();
  const head = async () => (await git(['rev-parse', 'HEAD'])).trim();
  const log = async (status, message, extra = {}) => {
    const item = { at: new Date().toISOString(), status, message, ...extra };
    await writeFile(statusPath, `${JSON.stringify(item, null, 2)}\n`, 'utf8');
    await appendFile(logPath, `${JSON.stringify(item)}\n`, 'utf8');
  };
  const pendingSave = async (commit) => writeFile(pendingPath, `${JSON.stringify({ commit, createdAt: new Date().toISOString() })}\n`, 'utf8');
  const clearPending = async () => unlink(pendingPath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  const verifyOwnCommit = async (commit) => {
    if (await head() !== commit) throw new Error('자동 갱신 커밋 이후 저장소가 변경되었습니다. 수동 확인이 필요합니다.');
    assertPublicationCommit({
      branch: await branch(), expectedCommit: commit,
      ahead: (await git(['rev-list', 'origin/main..HEAD'])).trim().split('\n').filter(Boolean),
      changedPaths: (await git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', commit])).split('\0').filter(Boolean),
    });
    await clean();
  };
  const publish = async (originalCommit) => {
    let commit = originalCommit;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await verifyOwnCommit(commit);
      try {
        await git(['push', 'origin', `${commit}:refs/heads/main`]);
        await clearPending();
        return commit;
      } catch (error) {
        if (attempt === 2) throw error;
        await clean();
        await git(['fetch', 'origin', 'main']);
        const remaining = (await git(['rev-list', 'origin/main..HEAD'])).trim().split('\n').filter(Boolean);
        if (!remaining.length) { await clearPending(); return commit; }
        await verifyOwnCommit(commit);
        try { await git(['rebase', 'origin/main']); }
        catch {
          await git(['rebase', '--abort']);
          throw new Error('원격 데이터 변경과 충돌했습니다. 자동 커밋을 보존하고 재배치를 취소했습니다.');
        }
        commit = await head();
        const rebasedAhead = (await git(['rev-list', 'origin/main..HEAD'])).trim();
        if (!rebasedAhead) { await clearPending(); return commit; }
        await pendingSave(commit);
      }
    }
  };

  try {
    repoRoot = (await git(['rev-parse', '--show-toplevel'])).trim();
    if (resolve(repoRoot, 'koc') !== appRoot) throw new Error('koc 폴더가 저장소 루트 아래에 있지 않습니다.');
    await git(['check-ignore', '--quiet', '--', 'koc/tmp/sync-status.json']);
    await mkdir(localRoot, { recursive: true });
    try { await open(lockPath, 'wx').then(async (file) => { await file.writeFile(JSON.stringify({ pid: process.pid })); await file.close(); }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const previous = await readJson(lockPath);
      if (!Number.isInteger(previous?.pid) || previous.pid <= 0) throw new Error('자동 갱신 잠금 파일을 확인해야 합니다.');
      try { process.kill(previous.pid, 0); throw new Error('다른 자동 갱신이 실행 중입니다.'); }
      catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
      await unlink(lockPath);
      await open(lockPath, 'wx').then(async (file) => { await file.writeFile(JSON.stringify({ pid: process.pid })); await file.close(); });
    }
    lockOwned = true;
    await log('running', 'Lark 원본 자동 갱신을 시작합니다.');
    if (await branch() !== 'main') throw new Error('main 브랜치에서만 자동 갱신할 수 있습니다.');
    await clean();
    await git(['fetch', 'origin', 'main']);
    const pending = await readJson(pendingPath);
    let ahead = (await git(['rev-list', 'origin/main..HEAD'])).trim();
    if (pending) {
      if (await head() !== pending.commit) throw new Error('미게시 자동 커밋 이후 저장소가 변경되어 수동 확인이 필요합니다.');
      if (ahead) await publish(pending.commit);
      else await clearPending();
    } else if (ahead) {
      throw new Error('게시되지 않은 사용자 커밋이 있습니다. 자동 게시를 중단합니다.');
    }
    await git(['pull', '--ff-only', 'origin', 'main']);
    await clean();
    const baseCommit = await head();
    await run(process.execPath, [resolve(appRoot, 'scripts/sync-lark-cli.mjs')], { cwd: appRoot, timeout: 10 * 60_000 });
    const tests = (await readdir(resolve(appRoot, 'tests'))).filter((name) => name.endsWith('.test.mjs')).map((name) => resolve(appRoot, 'tests', name));
    if (!tests.length) throw new Error('자동 게시 전 검증 테스트를 찾지 못했습니다.');
    await run(process.execPath, ['--test', ...tests], { cwd: appRoot, timeout: 3 * 60_000 });
    if (await branch() !== 'main' || await head() !== baseCommit) throw new Error('갱신 도중 브랜치 또는 커밋이 변경되었습니다. 생성 데이터를 보존합니다.');
    await clean({ allowDataset: true });
    const changed = parseStatusZ(await git(['status', '--porcelain=v1', '-z', '--untracked-files=all']));
    if (!changed.length) { await log('success', '원본을 확인했습니다. 게시할 데이터 변경이 없습니다.', { commit: baseCommit }); return; }
    await git(['add', '--', DATASET_PATH]);
    await clean({ allowDataset: true, stagedDataset: true });
    await git(['-c', 'user.name=KOC Data Sync', '-c', 'user.email=koc-data-sync@localhost', 'commit', '--only', '-m', 'Refresh KOC analytics from Lark source', '--', DATASET_PATH]);
    const commit = await head();
    await pendingSave(commit);
    const publishedCommit = await publish(commit);
    await log('success', 'Lark 원본 데이터를 GitHub Pages 저장소에 게시했습니다.', { commit: publishedCommit });
  } catch (error) {
    if (lockOwned) await log('failed', error.message);
    throw error;
  } finally {
    if (lockOwned) await unlink(lockPath).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
