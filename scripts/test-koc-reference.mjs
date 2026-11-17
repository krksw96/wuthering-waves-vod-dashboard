import assert from 'node:assert/strict';
import { mergeKocReference } from './merge-koc-reference.mjs';
const current = { period: { start: '2025-01-01', end: '2026-11-17' }, videos: [{ id: 'abcdefghijk', date: '2026-11-10', views: 100, likes: 5, comments: 3, channelId: 'UC-test', isKoc: false }] };
const source = { mode: 'live', source: { url: 'https://example.com/wiki/reference' }, generatedAt: '2026-11-17T07:00:00Z', videos: [
  { id: 'abcdefghijk', date: '2026-11-11', creator: 'KOC', views: 90, topics: ['test'], sourceRow: 6 },
  { id: 'lmnopqrstuv', date: '2026-11-12', creator: 'KOC2', views: 12, likes: null, format: 'Shorts', sourceRow: 7 },
  { id: '12345678901', date: '2024-01-01', creator: 'Old' },
] };
const result = mergeKocReference(current, source);
assert.equal(result.added, 1);
assert.equal(result.matched, 1);
assert.equal(result.skipped, 1);
const matched = result.data.videos.find(v => v.id === 'abcdefghijk');
assert.equal(matched.views, 100);
assert.equal(matched.date, '2026-11-10');
assert.equal(matched.comments, 3);
assert.equal(matched.isKoc, true);
assert.equal(matched.channelId, 'UC-test');
assert.equal(result.data.videos.find(v => v.id === 'lmnopqrstuv').comments, null);
assert.equal(current.videos[0].isKoc, false);
assert.equal(mergeKocReference(result.data, source).added, 0);
assert.throws(() => mergeKocReference(current, { mode: 'pending', videos: [] }));
const excludedCurrent = { ...current, videos: [{ ...current.videos[0], creator: '카르띠띠', channelId: 'UCND6Ox1wVvKToDQAZLpuPsg', isKoc: true, kocName: '미오 Mio' }] };
const excluded = mergeKocReference(excludedCurrent, source).data.videos.find(v => v.id === 'abcdefghijk');
assert.equal(excluded.isKoc, false);
assert.equal(excluded.kocName, null);
assert.equal(excluded.views, 100);
assert.equal(mergeKocReference({ ...current, videos: [excluded] }, source).data.videos.find(v => v.id === excluded.id).isKoc, false);
console.log('KOC reference merge and exclusion tests passed');
