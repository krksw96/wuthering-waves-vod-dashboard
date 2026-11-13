import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatusZ, assertWorkspace, assertPublicationCommit, DATASET_PATH } from '../scripts/refresh-and-publish.mjs';

test('publisher refuses any pre-existing work, including staged data and untracked files', () => {
  assert.doesNotThrow(() => assertWorkspace([]));
  for (const output of [' M index.html\0', '?? notes.md\0', `M  ${DATASET_PATH}\0`, ` M ${DATASET_PATH}\0`]) {
    assert.throws(() => assertWorkspace(parseStatusZ(output)));
  }
});

test('post-sync guard allows only unstaged generated dataset and never renames or conflicts', () => {
  assert.doesNotThrow(() => assertWorkspace(parseStatusZ(` M ${DATASET_PATH}\0`), { allowDataset: true }));
  for (const output of [` M ${DATASET_PATH}\0 M dashboard.html\0`, `M  ${DATASET_PATH}\0`, `UU ${DATASET_PATH}\0`, `R  ${DATASET_PATH}\0private-notes.txt\0`]) {
    assert.throws(() => assertWorkspace(parseStatusZ(output), { allowDataset: true }));
  }
});

test('NUL-delimited Git paths preserve spaces, newlines and rename origins', () => {
  const parsed = parseStatusZ(' M notes with spaces\nand newline.md\0R  renamed.md\0original.md\0');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].path, 'notes with spaces\nand newline.md');
  assert.equal(parsed[1].originalPath, 'original.md');
});

test('commit guard verifies staged path isolation', () => {
  assert.doesNotThrow(() => assertWorkspace(parseStatusZ(`M  ${DATASET_PATH}\0`), { allowDataset: true, stagedDataset: true }));
  assert.throws(() => assertWorkspace(parseStatusZ(`MM ${DATASET_PATH}\0`), { allowDataset: true, stagedDataset: true }));
  assert.throws(() => assertWorkspace(parseStatusZ(`M  ${DATASET_PATH}\0A  unrelated.txt\0`), { allowDataset: true, stagedDataset: true }));
});

test('publisher will push only its own single dataset commit on main', () => {
  const own = 'a'.repeat(40);
  const valid = { branch: 'main', ahead: [own], changedPaths: [DATASET_PATH], expectedCommit: own };
  assert.doesNotThrow(() => assertPublicationCommit(valid));
  assert.throws(() => assertPublicationCommit({ ...valid, branch: 'codex/user-work' }));
  assert.throws(() => assertPublicationCommit({ ...valid, ahead: [own, 'b'.repeat(40)] }));
  assert.throws(() => assertPublicationCommit({ ...valid, expectedCommit: 'b'.repeat(40) }));
  assert.throws(() => assertPublicationCommit({ ...valid, changedPaths: [DATASET_PATH, 'index.html'] }));
  assert.throws(() => assertPublicationCommit({ ...valid, changedPaths: [] }));
});
