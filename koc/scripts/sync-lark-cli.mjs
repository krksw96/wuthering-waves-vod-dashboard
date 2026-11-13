import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeRows, parseCsv } from './lark-normalize.mjs';
import { validateReplacement, writeDatasetAtomically, columnLetter } from './sync-lark.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function decodeCsvBatch(data, start, end, columnCount) {
  if (!data || data.has_more !== false || data.actual_range !== `A${start}:${columnLetter(columnCount - 1)}${end}`) throw new Error('원본 범위가 누락되거나 잘렸습니다. 기존 데이터를 유지합니다.');
  const records = parseCsv(data.annotated_csv);
  if (records.length !== end - start + 1 || data.row_indices?.length !== records.length) throw new Error('원본 행 개수가 요청 범위와 다릅니다.');
  return records.map((record, index) => {
    const rowNumber = data.row_indices[index];
    const prefix = record[0]?.match(/^\[row=(\d+)\]\s?/);
    if (!prefix || Number(prefix[1]) !== rowNumber || rowNumber !== start + index || record.length !== columnCount) throw new Error('원본 행 번호 또는 열 개수가 예상과 다릅니다.');
    return [record[0].slice(prefix[0].length), ...record.slice(1)];
  });
}

export async function invokeLark(args) {
  const entry = process.env.LARK_CLI_ENTRY || resolve(process.env.APPDATA || '', 'npm/node_modules/@larksuite/cli/scripts/run.js');
  const command = existsSync(entry) ? process.execPath : 'lark-cli';
  const commandArgs = existsSync(entry) ? [entry, ...args] : args;
  try {
    const { stdout } = await execute(command, commandArgs, {
      cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 90_000, windowsHide: true,
      env: { ...process.env, LARKSUITE_CLI_NO_UPDATE_NOTIFIER: '1', LARKSUITE_CLI_NO_SKILLS_NOTIFIER: '1' },
    });
    const payload = JSON.parse(stdout.replace(/^\uFEFF/, ''));
    if (!payload.ok) throw new Error('Lark 읽기 응답이 성공 상태가 아닙니다.');
    return payload.data;
  } catch (error) {
    let message = 'Lark 원본 읽기를 완료하지 못했습니다. 로그인 상태와 원본 읽기 권한을 확인하세요.';
    try {
      const failure = JSON.parse(error.stderr);
      if (['authentication', 'authorization'].includes(failure.error?.type)) message = 'Lark 사용자 인증 또는 원본 권한이 만료되었습니다. 다시 읽기 인증이 필요합니다.';
    } catch { /* Never echo raw CLI output or authentication data. */ }
    throw new Error(message, { cause: error });
  }
}

export async function readCliSource(config, invoke = invokeLark) {
  const book = await invoke(['sheets', '+workbook-info', '--url', config.url, '--as', 'user']);
  const sheet = book.sheets?.find((candidate) => candidate.sheet_id === config.sheetId);
  if (!sheet || !Number.isInteger(sheet.row_count) || !Number.isInteger(sheet.column_count)) throw new Error('지정한 원본 탭을 찾지 못했습니다.');
  if (sheet.row_count > (config.maxRows || 100000) || sheet.column_count > (config.maxColumns || 256)) throw new Error('원본 크기가 설정 한도를 초과했습니다.');
  const token = book.token;
  if (!token || (config.spreadsheetToken && token !== config.spreadsheetToken)) throw new Error('전자표 토큰이 확인한 원본과 다릅니다.');
  const rows = [];
  const size = config.batchRows || 500;
  if (!Number.isInteger(size) || size < 1 || size > 5000 || Math.ceil(sheet.row_count / size) + 2 > (config.maxRequests || 250)) throw new Error('전체 원본을 읽는 데 필요한 요청 수가 설정 한도를 초과합니다.');
  for (let start = 1; start <= sheet.row_count; start += size) {
    const end = Math.min(start + size - 1, sheet.row_count);
    const range = `A${start}:${columnLetter(sheet.column_count - 1)}${end}`;
    const data = await invoke(['sheets', '+csv-get', '--spreadsheet-token', token, '--sheet-id', config.sheetId, '--range', range, '--max-chars', '1000000', '--as', 'user']);
    if (data.revision !== book.revision) throw new Error('읽는 도중 원본이 변경되었습니다. 다음 갱신에 전체를 다시 확인합니다.');
    rows.push(...decodeCsvBatch(data, start, end, sheet.column_count));
    console.log(`Read source rows ${start}-${end}`);
  }
  const after = await invoke(['sheets', '+workbook-info', '--url', config.url, '--as', 'user']);
  if (after.revision !== book.revision) throw new Error('읽는 도중 원본이 변경되어 이번 데이터를 반영하지 않았습니다.');
  return { rows, revision: book.revision, title: book.title };
}

export async function runCliSync(args = process.argv.slice(2)) {
  let dryRun = false, rawPath = null;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--dry-run') dryRun = true;
    else if (args[index] === '--save-raw' && args[index + 1] && !args[index + 1].startsWith('--')) rawPath = args[++index];
    else throw new Error('사용법: node scripts/sync-lark-cli.mjs [--dry-run] [--save-raw path]');
  }
  const config = JSON.parse(await readFile(resolve(root, 'config/source.json'), 'utf8'));
  const result = await readCliSource(config);
  if (rawPath) await writeFile(resolve(rawPath), JSON.stringify({ values: result.rows, revision: result.revision }), 'utf8');
  const dataset = normalizeRows(result.rows, config);
  dataset.source = { ...dataset.source, label: result.title, reader: 'lark-cli-user', revision: result.revision };
  dataset.sync = { method: 'local-authenticated-cli', enabled: config.localSyncEnabled === true, intervalHours: 6, requiresComputer: true };
  const output = resolve(root, 'data/koc-data.json');
  let previous;
  try { previous = JSON.parse(await readFile(output, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  validateReplacement(previous, dataset, config.maxRecordDropRatio);
  if (!dryRun) await writeDatasetAtomically(output, dataset);
  const summary = { dryRun, videos: dataset.videos.length, creators: new Set(dataset.videos.map(v => v.creator)).size, versions: dataset.versions, coverage: dataset.coverage, quality: dataset.quality, warnings: dataset.warnings };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCliSync().catch(error => { console.error(error.message); process.exitCode = 1; });
}
