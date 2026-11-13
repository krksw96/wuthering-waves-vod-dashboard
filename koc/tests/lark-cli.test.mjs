import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCsvBatch, readCliSource, runCliSync } from '../scripts/sync-lark-cli.mjs';

test('CLI CSV reader preserves embedded newlines and requires full physical row coverage', () => {
  const data = { has_more: false, actual_range: 'A5:C6', row_indices: [5, 6], annotated_csv: '[row=5] ,제목,날짜\n[row=6] ,"첫 줄\n둘째 줄",2026-11-14' };
  assert.deepEqual(decodeCsvBatch(data, 5, 6, 3), [['', '제목', '날짜'], ['', '첫 줄\n둘째 줄', '2026-11-14']]);
  assert.throws(() => decodeCsvBatch({ ...data, has_more: true }, 5, 6, 3), /누락|잘렸/);
  assert.throws(() => decodeCsvBatch({ ...data, row_indices: [5, 7] }, 5, 6, 3), /행 번호/);
  assert.throws(() => decodeCsvBatch({ ...data, actual_range: 'A5:C5' }, 5, 6, 3), /누락|잘렸/);
});

test('CLI source rejects mixed revisions and checks the revision after every batch', async () => {
  const config = { url: 'https://example.larksuite.com/wiki/test', sheetId: 'main', spreadsheetToken: 'book', batchRows: 1 };
  const book = { token: 'book', revision: 7, title: 'DB', sheets: [{ sheet_id: 'main', row_count: 2, column_count: 2 }] };
  const calls = [];
  const source = await readCliSource(config, async args => {
    calls.push(args);
    if (args[1] === '+workbook-info') return book;
    const range = args[args.indexOf('--range') + 1];
    const index = range === 'A1:B1' ? 1 : 2;
    return { revision: 7, has_more: false, actual_range: range, row_indices: [index], annotated_csv: `[row=${index}] ,r${index}` };
  });
  assert.deepEqual(source.rows, [['', 'r1'], ['', 'r2']]);
  assert.equal(calls.filter(args => args[1] === '+workbook-info').length, 2);
  await assert.rejects(readCliSource(config, async args => args[1] === '+workbook-info' ? book : { revision: 8 }), /원본이 변경/);
});

test('CLI sync rejects unknown options before any source request', async () => {
  await assert.rejects(runCliSync(['--bad-flag']), /사용법/);
  await assert.rejects(runCliSync(['--save-raw']), /사용법/);
});
