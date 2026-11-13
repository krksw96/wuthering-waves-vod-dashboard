#!/usr/bin/env node
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeRows, parseCsv, extractRows } from './lark-normalize.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowedApiOrigins = new Set(['https://open.larksuite.com', 'https://open.feishu.cn']);
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

function positiveInteger(value, name, upperBound) {
  if (!Number.isInteger(value) || value < 1 || value > upperBound) throw new Error(`${name} 설정이 유효하지 않습니다 (1~${upperBound}).`);
  return value;
}

export function columnLetter(index) {
  let value = index + 1, result = '';
  while (value > 0) { value -= 1; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
  return result;
}

export async function loadLarkRows(config, { env = process.env, fetchImpl = globalThis.fetch, wait = pause } = {}) {
  const apiBase = String(env.LARK_API_BASE || config.apiBase || 'https://open.larksuite.com').replace(/\/$/, '');
  if (!allowedApiOrigins.has(apiBase)) throw new Error('LARK_API_BASE는 공식 Lark/Feishu OpenAPI 주소여야 합니다.');
  const appId = env.LARK_APP_ID?.trim();
  const appSecret = env.LARK_APP_SECRET?.trim();
  let token = env.LARK_USER_ACCESS_TOKEN?.trim();
  if (!token && (!appId || !appSecret)) throw new Error('Lark 원본 연결 대기: LARK_APP_ID와 LARK_APP_SECRET이 필요합니다. docs/SOURCE_SETUP.md를 확인하세요.');
  if (!/^[A-Za-z0-9_-]+$/.test(config.sheetId || '')) throw new Error('source.json의 sheetId가 유효하지 않습니다.');
  const maxRequests = positiveInteger(config.maxRequests ?? 250, 'maxRequests', 2000);
  const batchRows = positiveInteger(config.batchRows ?? 500, 'batchRows', 5000);
  let requestCount = 0;
  async function request(path, { method = 'GET', body, authenticated = true } = {}) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      requestCount += 1;
      if (requestCount > maxRequests) throw new Error('Lark 요청 한도를 초과했습니다. 데이터 일부로 덮어쓰지 않았습니다.');
      let response;
      try {
        response = await fetchImpl(`${apiBase}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(30000),
        });
      } catch {
        if (attempt < 2) { await wait(1000 * 2 ** attempt); continue; }
        throw new Error('Lark 네트워크 요청이 실패했습니다. 기존 데이터는 그대로 보존됩니다.');
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retrySeconds = Math.min(10, Math.max(1, Number(response.headers?.get?.('retry-after')) || 2 ** attempt));
        await wait(retrySeconds * 1000);
        continue;
      }
      let payload;
      try { payload = await response.json(); } catch { throw new Error(`Lark가 JSON 응답을 반환하지 않았습니다 (HTTP ${response.status}).`); }
      if (!response.ok || payload.code !== 0) {
        const code = Number.isInteger(payload.code) ? payload.code : 'unknown';
        // Do not log API response bodies: they may include user or authentication data.
        throw new Error(`Lark 요청 실패 (HTTP ${response.status}, code ${code}). 앱의 읽기 권한과 원본 시트 공유 설정을 확인하세요.`);
      }
      return payload;
    }
    throw new Error('Lark 요청 재시도 한도를 초과했습니다.');
  }

  if (!token) {
    const auth = await request('/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST', authenticated: false, body: { app_id: appId, app_secret: appSecret },
    });
    token = auth.tenant_access_token;
    if (!token || typeof token !== 'string') throw new Error('Lark 인증 응답에 토큰이 없습니다.');
  }

  let spreadsheetToken = config.spreadsheetToken;
  if (!spreadsheetToken) {
    const sourceUrl = new URL(config.url);
    const wikiToken = config.wikiToken || sourceUrl.pathname.match(/^\/wiki\/([A-Za-z0-9_-]+)\/?$/)?.[1];
    if (!wikiToken || !/^[A-Za-z0-9_-]+$/.test(wikiToken)) throw new Error('원본의 wikiToken 또는 spreadsheetToken이 필요합니다.');
    const info = await request(`/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`);
    if (!['sheet', 'sheets'].includes(info.data?.node?.obj_type)) throw new Error('지정한 Wiki 노드는 전자표가 아닙니다. 올바른 시트 링크를 확인하세요.');
    spreadsheetToken = info.data.node.obj_token;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetToken || '')) throw new Error('Lark 원본 전자표 토큰이 유효하지 않습니다.');
  const book = await request(`/open-apis/sheets/v3/spreadsheets/${encodeURIComponent(spreadsheetToken)}/sheets/query`);
  const sheet = book.data?.sheets?.find((candidate) => candidate.sheet_id === config.sheetId);
  if (!sheet) throw new Error('원본 전자표에 지정된 sheetId가 없습니다. 다른 탭을 대신 읽지 않았습니다.');
  const rowCount = positiveInteger(sheet.grid_properties?.row_count, '원본 행 수', config.maxRows ?? 100000);
  const columnCount = positiveInteger(sheet.grid_properties?.column_count, '원본 열 수', config.maxColumns ?? 256);
  if (Math.ceil(rowCount / batchRows) + requestCount > maxRequests) throw new Error('전체 시트를 읽는 데 필요한 요청 수가 설정 한도를 초과합니다. batchRows/maxRequests를 확인하세요.');
  const lastColumn = columnLetter(columnCount - 1);
  const rows = [];
  for (let start = 1; start <= rowCount; start += batchRows) {
    const end = Math.min(start + batchRows - 1, rowCount);
    const range = `${config.sheetId}!A${start}:${lastColumn}${end}`;
    const payload = await request(`/open-apis/sheets/v2/spreadsheets/${encodeURIComponent(spreadsheetToken)}/values/${encodeURIComponent(range)}`);
    const result = payload.data?.valueRange;
    if (!result || !Array.isArray(result.values)) throw new Error('Lark 범위 응답에 values 배열이 없습니다.');
    if (result.values.length > end - start + 1 || result.values.some((row) => !Array.isArray(row))) throw new Error('Lark 범위 응답의 행 구조가 예상과 다릅니다.');
    // APIs trim trailing empty rows; padding retains physical source row numbers.
    for (let offset = 0; offset <= end - start; offset += 1) rows.push(result.values[offset] || []);
  }
  return { rows, sheetTitle: sheet.title, requestCount };
}

export function validateReplacement(previous, next, maxRecordDropRatio = 0.4) {
  if (typeof maxRecordDropRatio !== 'number' || maxRecordDropRatio < 0 || maxRecordDropRatio >= 1) throw new Error('maxRecordDropRatio는 0 이상 1 미만 숫자여야 합니다.');
  if (previous?.mode !== 'live' || previous?.source?.url !== next.source.url || !previous.videos?.length) return;
  const dropRatio = 1 - next.videos.length / previous.videos.length;
  if (dropRatio > maxRecordDropRatio) throw new Error(`영상 수가 이전보다 ${Math.round(dropRatio * 100)}% 감소해 기존 데이터를 보존했습니다. 의도한 원본 삭제인지 확인하세요.`);
}

export async function writeDatasetAtomically(outputPath, dataset) {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporary = `${outputPath}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
    await rename(temporary, outputPath);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function runSync(argv = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--dry-run' || key === '--help') { options[key.slice(2)] = true; continue; }
    if (!['--input', '--output', '--config'].includes(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('사용법: node scripts/sync-lark.mjs [--input export.csv|export.json] [--config config/source.json] [--output data/koc-data.json] [--dry-run]');
    options[key.slice(2)] = argv[++i];
  }
  if (options.help) {
    console.log('Lark 원본을 읽어 정규화합니다. --input은 네트워크 없이 실제 CSV/JSON 내보내기를 가져옵니다. --dry-run은 결과 요약만 검사하며 기존 파일을 변경하지 않습니다.');
    return;
  }
  const configPath = options.config ? resolve(options.config) : resolve(root, 'config/source.json');
  const outputPath = options.output ? resolve(options.output) : resolve(root, 'data/koc-data.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  let rows;
  if (options.input) {
    const path = resolve(options.input);
    const content = await readFile(path, 'utf8');
    if (extname(path).toLowerCase() === '.csv') rows = parseCsv(content);
    else if (extname(path).toLowerCase() === '.json') rows = extractRows(JSON.parse(content));
    else throw new Error('--input은 CSV 또는 JSON 파일을 지정해야 합니다.');
  } else {
    ({ rows } = await loadLarkRows(config));
  }
  const dataset = normalizeRows(rows, config, { imported: Boolean(options.input) });
  let previous;
  try { previous = JSON.parse(await readFile(outputPath, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('기존 데이터 파일을 읽을 수 없습니다. 덮어쓰지 않았습니다.');
  }
  validateReplacement(previous, dataset, config.maxRecordDropRatio ?? 0.4);
  if (!options['dry-run']) await writeDatasetAtomically(outputPath, dataset);
  const summary = { dryRun: Boolean(options['dry-run']), status: dataset.source.status, videos: dataset.videos.length, coverage: dataset.coverage, warnings: dataset.warnings, quality: dataset.quality };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runSync().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
