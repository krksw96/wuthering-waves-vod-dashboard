import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { parseMetric, parseDate, parseCsv, textOf, linkOf, normalizeRows, extractRows, findHeader } from '../scripts/lark-normalize.mjs';
import { loadLarkRows, validateReplacement, writeDatasetAtomically, runSync, columnLetter } from '../scripts/sync-lark.mjs';

const config = { url: 'https://example.larksuite.com/wiki/test?sheet=target', sheetId: 'target', maxInvalidRowRatio: 0.5 };
const at = { generatedAt: '2026-11-14T00:00:00.000Z' };
const headers = ['KOC명', '영상 제목', '영상 링크', '게시일', '조회수', '좋아요 수', '콘텐츠 주제', '버전', '형식'];
const row = ['테스트 KOC', '명조 가이드', 'https://youtu.be/abcdefghijk', '2026-11-13', '1.2만', '0', '공략,캐릭터', '3.4', 'VOD'];

test('metric parsing preserves missing versus zero and rejects malformed values', () => {
  assert.equal(parseMetric('0'), 0);
  assert.equal(parseMetric('1,234'), 1234);
  assert.equal(parseMetric('1.25 K'), 1250);
  assert.equal(parseMetric('2.3만'), 23000);
  assert.equal(parseMetric('0.2亿'), 20000000);
  assert.equal(parseMetric('2,400회'), 2400);
  for (const value of ['', null, '비공개', '—', '-12', '-1만', '1,23', '100%', 'abc100', '1.2', Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(parseMetric(value), null, String(value));
});

test('dates are strict, leap-safe, timezone-aware and do not guess month/day order', () => {
  assert.equal(parseDate('2024.2.29'), '2024-02-29');
  assert.equal(parseDate('2026년 11월 2일'), '2026-11-02');
  assert.equal(parseDate('2026年11月2日'), '2026-11-02');
  assert.equal(parseDate('2026/11/02 12:30'), '2026-11-02');
  assert.equal(parseDate('2026-11-13T23:00:00Z'), '2026-11-14');
  assert.equal(parseDate(45292), '2024-01-01');
  assert.equal(parseDate('31/12/2026', { dateOrder: 'DMY' }), '2026-12-31');
  assert.equal(parseDate('12/31/2026', { dateOrder: 'MDY' }), '2026-12-31');
  for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '01/02/2026', '11/14', '2026-11-14T99:00:00Z', 60]) assert.equal(parseDate(value), null, String(value));
});

test('rich text links are decoded without carrying arbitrary cell metadata', () => {
  const value = [{ type: 'text', text: '영상 ' }, { type: 'url', text: 'LINK', link: 'https://youtu.be/abcdefghijk' }];
  assert.equal(textOf(value), '영상 LINK');
  assert.equal(linkOf(value), 'https://youtu.be/abcdefghijk');
  assert.equal(linkOf({ value: { link: { url: 'https://example.com/video' } } }), 'https://example.com/video');
  assert.equal(linkOf('=HYPERLINK("https://example.com/video", "LINK")'), 'https://example.com/video');
  assert.equal(linkOf('javascript:alert(1)'), '');
  assert.equal(linkOf('https://user:pass@example.com'), '');
});

test('CSV parser handles Korean, BOM, embedded newlines, escaped quotes and trailing empties', () => {
  assert.deepEqual(parseCsv('\uFEFFKOC,제목,조회수\r\n테스트,"첫줄\n둘째줄, ""인용""",0\r\n'), [['KOC', '제목', '조회수'], ['테스트', '첫줄\n둘째줄, "인용"', '0']]);
  assert.deepEqual(parseCsv('a,b,\n'), [['a', 'b', '']]);
  assert.throws(() => parseCsv('a,"broken'), /닫히지/);
  assert.throws(() => parseCsv('"a"broken,b'), /잘못된 문자/);
});

test('header detection spans preambles and rejects ambiguous metrics', () => {
  assert.equal(findHeader([['제목 행'], [], headers, row]).index, 2);
  assert.throws(() => findHeader([['KOC', '게시일', '제목', '조회수', '조회 수']]), /여러 개/);
  const mapped = findHeader([['KOC', '게시일', '제목', '조회수', '조회 수']], { columnMap: { views: 'E' } });
  assert.equal(mapped.columns.views, 4);
  assert.equal(findHeader([headers], { columnMap: { creator: 'KOC명' } }).columns.creator, 0);
  assert.throws(() => findHeader([headers], { columnMap: { creator: 'A', title: 'A' } }), /중복/);
});

test('normalization preserves source rows, counts and only allowlisted fields', () => {
  const data = normalizeRows([['프리앰블'], [], [...headers, '은행 계좌', '연락처'], [...row, 'DO-NOT-EXPORT', 'PRIVATE'], [], ['다른 KOC', '새 영상', 'https://example.com/2', '2026-11-14', '', '비공개']], config, at);
  assert.equal(data.mode, 'live');
  assert.equal(data.source.status, 'connected');
  assert.deepEqual(data.coverage, { start: '2026-11-13', end: '2026-11-14' });
  const first = data.videos.find((video) => video.id === 'abcdefghijk');
  assert.equal(first.sourceRow, 4);
  assert.equal(first.views, 12000);
  assert.equal(first.likes, 0);
  assert.deepEqual(first.topics, ['공략', '캐릭터']);
  assert.equal(first.url, 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(data.videos[0].views, null);
  assert.equal(data.videos[0].likes, null);
  assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  assert.ok(!JSON.stringify(data).includes('DO-NOT-EXPORT'));
});

test('duplicate canonical YouTube IDs use the complete final row without maximizing metrics', () => {
  const later = [...row];
  later[2] = 'https://www.youtube.com/shorts/abcdefghijk?feature=share';
  later[4] = '9000'; later[5] = '';
  const data = normalizeRows([headers, row, later], config, at);
  assert.equal(data.videos.length, 1);
  assert.equal(data.videos[0].sourceRow, 3);
  assert.equal(data.videos[0].views, 9000);
  assert.equal(data.videos[0].likes, null);
  assert.equal(data.videos[0].format, 'Shorts');
  assert.equal(data.quality.duplicateRows, 1);
});

test('missing and invalid dates cannot become current dates or partially erase the database', () => {
  const invalid = [...row]; invalid[3] = '2026-02-30';
  assert.throws(() => normalizeRows([headers, invalid], config, at), /유효한 영상이 없습니다/);
  assert.throws(() => normalizeRows([headers, row, invalid], { ...config, maxInvalidRowRatio: 0.1 }, at), /부분 데이터/);
  const accepted = normalizeRows([headers, row, invalid], config, at);
  assert.equal(accepted.quality.invalidRows, 1);
  assert.equal(accepted.videos.length, 1);
});

test('versions come from source or explicit nonoverlapping date ranges only', () => {
  const noVersion = [...row]; noVersion[7] = '';
  const plain = normalizeRows([headers, noVersion], config, at);
  assert.equal(plain.videos[0].version, null);
  assert.deepEqual(plain.versions, []);
  const versions = [{ id: '3.4', label: '3.4', start: '2026-11-01', end: '2026-11-30' }];
  assert.equal(normalizeRows([headers, noVersion], { ...config, versions }, at).videos[0].version, '3.4');
  const sourceWins = [...row]; sourceWins[7] = '원본 버전';
  assert.equal(normalizeRows([headers, sourceWins], { ...config, versions }, at).videos[0].version, '원본 버전');
  assert.throws(() => normalizeRows([headers, noVersion], { ...config, versions: [...versions, { id: '3.5', start: '2026-11-20', end: '2026-12-30' }] }, at), /겹칩니다/);
});

test('offline import never claims live API connection', () => {
  const imported = normalizeRows([headers, row], config, { ...at, imported: true });
  assert.equal(imported.source.status, 'imported');
  assert.equal(imported.syncedAt, undefined);
  assert.equal(imported.importedAt, at.generatedAt);
  assert.deepEqual(extractRows({ data: { sheets: [{ columns: headers, data: [row] }] } }), [headers, row]);
  assert.deepEqual(extractRows({ data: { sheets: [{ columns: headers, data: [row], range: 'A3:I4' }] } }), [[], [], headers, row]);
  assert.deepEqual(extractRows({ data: { valueRange: { values: [headers, row] } } }), [headers, row]);
  assert.throws(() => extractRows({ sheets: [{ columns: headers, data: [row] }, { columns: headers, data: [row] }] }), /여러 시트/);
});

test('without a link, equal titles do not merge potentially separate videos', () => {
  const missingUrl = [...row]; missingUrl[2] = '';
  const data = normalizeRows([headers, missingUrl, missingUrl], config, at);
  assert.equal(data.videos.length, 2);
  assert.equal(data.quality.duplicateRows, 0);
});

test('Lark pagination covers empty gaps and the entire physical grid with correct row numbers', async () => {
  const paths = [];
  const responses = [
    { code: 0, data: { node: { obj_type: 'sheet', obj_token: 'book' } } },
    { code: 0, data: { sheets: [{ sheet_id: 'target', title: 'KOC', grid_properties: { row_count: 5, column_count: 9 } }] } },
    { code: 0, data: { valueRange: { values: [headers, row] } } },
    { code: 0, data: { valueRange: { values: [] } } },
    { code: 0, data: { valueRange: { values: [[...row.slice(0, 2), 'https://youtu.be/abcdefghijl', ...row.slice(3)]] } } },
  ];
  const fetchImpl = async (url) => { paths.push(url); return new Response(JSON.stringify(responses.shift()), { status: 200 }); };
  const result = await loadLarkRows({ ...config, batchRows: 2 }, { env: { LARK_USER_ACCESS_TOKEN: 'test-token-not-real' }, fetchImpl });
  assert.equal(result.rows.length, 5);
  assert.deepEqual(result.rows[2], []);
  assert.equal(normalizeRows(result.rows, config, at).videos[1].sourceRow, 5);
  assert.ok(paths[2].endsWith(encodeURIComponent('target!A1:I2')));
  assert.ok(paths[4].endsWith(encodeURIComponent('target!A5:I5')));
  assert.equal(columnLetter(25), 'Z'); assert.equal(columnLetter(26), 'AA');
});

test('API errors are sanitized and no alternate tab is selected when the target is missing', async () => {
  let requests = 0;
  await assert.rejects(loadLarkRows(config, { env: {}, fetchImpl: async () => { requests += 1; } }), /연결 대기/);
  assert.equal(requests, 0);
  await assert.rejects(loadLarkRows({ ...config, spreadsheetToken: 'book' }, {
    env: { LARK_USER_ACCESS_TOKEN: 'sensitive-token' },
    fetchImpl: async () => new Response(JSON.stringify({ code: 0, data: { sheets: [{ sheet_id: 'other' }] } }), { status: 200 }),
  }), /다른 탭을 대신 읽지/);
  await assert.rejects(loadLarkRows(config, {
    env: { LARK_USER_ACCESS_TOKEN: 'sensitive-token' },
    fetchImpl: async () => new Response(JSON.stringify({ code: 131006, msg: 'sensitive-token PRIVATE' }), { status: 403 }),
  }), (error) => /131006/.test(error.message) && !/sensitive|PRIVATE/.test(error.message));
});

test('failed imports and suspicious source shrinkage preserve the previous successful file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'koc-import-test-'));
  try {
    const outputPath = join(directory, 'data.json');
    const inputPath = join(directory, 'bad.json');
    const configPath = join(directory, 'source.json');
    const original = normalizeRows([headers, row], config, at);
    await writeDatasetAtomically(outputPath, original);
    const before = await readFile(outputPath, 'utf8');
    await writeFile(configPath, JSON.stringify(config));
    await writeFile(inputPath, JSON.stringify([headers, ['bad']]));
    await assert.rejects(runSync(['--input', inputPath, '--output', outputPath, '--config', configPath]), /유효한 영상/);
    assert.equal(await readFile(outputPath, 'utf8'), before);
    const previous = { ...original, videos: Array.from({ length: 10 }, () => row) };
    assert.throws(() => validateReplacement(previous, original), /90% 감소/);
    assert.doesNotThrow(() => validateReplacement({ ...previous, mode: 'preview' }, original));
  } finally {
    assert.ok(resolve(directory).startsWith(`${resolve(tmpdir())}${sep}`) && basename(directory).startsWith('koc-import-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
