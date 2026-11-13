import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getToday, getPeriodRange, validateDateRange, filterVideos, summarize,
  groupByCreator, groupByTopic, buildTrend, safeUrl, toCsv, formatNumber,
} from '../scripts/analytics.mjs';

const makeVideo = (overrides = {}) => ({
  id: 'video1', creator: '키플', title: '명조 공략', url: 'https://www.youtube.com/watch?v=video1',
  date: '2026-11-14', views: 100, likes: 10, topics: ['공략'], version: '3.0', format: 'VOD', ...overrides,
});

test('week includes exactly seven calendar dates and excludes future uploads', () => {
  const range = getPeriodRange('week', '2026-11-14');
  assert.deepEqual(range, { start: '2026-11-08', end: '2026-11-14' });
  const videos = ['2026-11-07', '2026-11-08', '2026-11-14', '2026-11-15'].map((date) => makeVideo({ date }));
  assert.deepEqual(filterVideos(videos, range).map((v) => v.date), ['2026-11-08', '2026-11-14']);
  assert.deepEqual(getPeriodRange('week', '2026-01-03'), { start: '2025-12-28', end: '2026-01-03' });
});

test('month/year ranges are rolling calendar intervals with clamped anniversaries', () => {
  assert.deepEqual(getPeriodRange('month', '2026-11-14'), { start: '2026-10-15', end: '2026-11-14' });
  assert.deepEqual(getPeriodRange('month', '2025-03-31'), { start: '2025-03-01', end: '2025-03-31' });
  assert.deepEqual(getPeriodRange('month', '2024-03-31'), { start: '2024-03-01', end: '2024-03-31' });
  assert.deepEqual(getPeriodRange('month', '2024-02-29'), { start: '2024-01-30', end: '2024-02-29' });
  assert.deepEqual(getPeriodRange('year', '2024-02-29'), { start: '2023-03-01', end: '2024-02-29' });
  assert.deepEqual(getPeriodRange('year', '2025-02-28'), { start: '2024-02-29', end: '2025-02-28' });
  assert.deepEqual(getPeriodRange('all'), { start: '', end: '' });
  assert.deepEqual(getPeriodRange('custom'), { start: '', end: '' });
  assert.throws(() => getPeriodRange('month', '2025-02-29'), RangeError);
  assert.throws(() => getPeriodRange('unknown', '2026-11-14'), RangeError);
});

test('date validation rejects impossible dates and reversed ranges, accepts open bounds', () => {
  assert.equal(validateDateRange('2024-02-29', '2024-02-29').valid, true);
  assert.equal(validateDateRange('2025-02-29', '').valid, false);
  assert.equal(validateDateRange('', '2026-13-01').valid, false);
  assert.equal(validateDateRange('2026-11-15', '2026-11-14').valid, false);
  assert.deepEqual(validateDateRange('', ''), { valid: true, error: null });
  assert.match(getToday('Asia/Seoul'), /^\d{4}-\d{2}-\d{2}$/);
});

test('combined filters use exact creator/topic/version and title or creator substring search', () => {
  const expected = makeVideo({ id: 'match', topics: ['공략', '캐릭터'] });
  const rows = [expected,
    makeVideo({ id: 'wrong-creator', creator: '키플 팬채널' }),
    makeVideo({ id: 'wrong-topic', topics: ['공략 모음'] }),
    makeVideo({ id: 'wrong-version', version: '3.1' }),
    makeVideo({ id: 'wrong-format', format: 'Shorts' }),
    makeVideo({ id: 'old', date: '2026-10-01' }),
  ];
  const filter = { start: '2026-11-08', end: '2026-11-14', creator: '키플', topic: '공략', version: '3.0', format: 'VOD', query: '명조' };
  assert.deepEqual(filterVideos(rows, filter), [expected]);
  assert.equal(filterVideos(rows, { ...filter, query: '키플' }).length, 1);
  assert.equal(filterVideos(rows, { ...filter, query: '없는 제목' }).length, 0);
  assert.equal(filterVideos(rows, { ...filter, start: '2026-11-15' }).length, 0);
  assert.equal(filterVideos(rows, { creator: 'all', topic: 'all' }).length, rows.length);
  assert.equal(filterVideos([makeVideo({ date: null })], { end: '2026-11-14' }).length, 0);
});

test('summary distinguishes missing metrics from observed zero and weights rate on paired values', () => {
  const rows = [
    makeVideo({ views: 100, likes: 10 }),
    makeVideo({ views: 900, likes: 9 }),
    makeVideo({ views: 1000, likes: null }),
    makeVideo({ views: null, likes: 100 }),
    makeVideo({ creator: '니브', views: 0, likes: 0 }),
  ];
  assert.deepEqual(summarize(rows), {
    count: 5, creatorCount: 2, views: 2000, likes: 119, viewsAvailable: 4, likesAvailable: 4,
    viewsMissing: 1, likesMissing: 1, likeRate: 1.9, likeRateVideos: 3,
  });
  assert.equal(summarize([makeVideo({ views: null, likes: null })]).views, null);
  assert.equal(summarize([makeVideo({ views: 0, likes: 0 })]).views, 0);
  assert.equal(summarize([makeVideo({ views: 0, likes: 0 })]).likeRate, null);
  assert.equal(summarize([]).views, null);
  assert.equal(summarize([]).count, 0);
  assert.equal(summarize([makeVideo({ views: NaN, likes: -1 })]).likesMissing, 1);
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(0), '0');
});

test('creator totals do not inflate for multiple topics, while topic memberships intentionally overlap', () => {
  const rows = [makeVideo({ topics: ['공략', '캐릭터', '공략'] }), makeVideo({ creator: '니브', views: 50, topics: ['캐릭터'] })];
  assert.equal(summarize(rows).views, 150);
  assert.deepEqual(groupByCreator(rows).map(({ creator, views }) => ({ creator, views })), [{ creator: '키플', views: 100 }, { creator: '니브', views: 50 }]);
  assert.deepEqual(groupByTopic(rows).map(({ topic, count, views }) => ({ topic, count, views })), [{ topic: '캐릭터', count: 2, views: 150 }, { topic: '공략', count: 1, views: 100 }]);
  assert.equal(groupByTopic([makeVideo({ topics: [] })])[0].topic, '미분류');
});

test('trend uses upload-date cohorts, sorted dates, and preserves unknown totals', () => {
  const rows = [makeVideo({ date: '2026-11-14', views: null, likes: null }), makeVideo({ date: '2026-11-13', views: 10 }), makeVideo({ date: '2026-11-13', views: 20 }), makeVideo({ date: 'invalid' })];
  assert.deepEqual(buildTrend(rows, 'views'), [
    { date: '2026-11-13', count: 2, views: 30, likes: 20, value: 30 },
    { date: '2026-11-14', count: 1, views: null, likes: null, value: null },
  ]);
  assert.equal(buildTrend(rows, 'count')[0].value, 2);
  assert.equal(buildTrend(rows, 'likes')[1].value, null);
});

test('links reject executable URLs, protocol-relative URLs, and credential spoofing', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example/path', 'file:///etc/passwd', 'https://trusted.example@evil.example', 'not a URL', null]) assert.equal(safeUrl(value), '');
  assert.equal(safeUrl('https://www.youtube.com/watch?v=abc&x=1'), 'https://www.youtube.com/watch?v=abc&x=1');
  assert.equal(safeUrl('http://example.com'), 'http://example.com/');
});

test('CSV includes UTF-8 BOM, escapes quotes/newlines, blocks formulas, and leaves unknown metrics blank', () => {
  const csv = toCsv([makeVideo({ id: '=ID()', creator: '  @SUM(1)', title: '=HYPERLINK("https://bad.example")\n둘째 줄', url: 'javascript:alert(1)', likes: null })]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"\'=ID()"'));
  assert.ok(csv.includes('"\'  @SUM(1)"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://bad.example"")\n둘째 줄"'));
  assert.ok(!csv.includes('javascript:'));
  assert.ok(csv.endsWith('"100",""\r\n'));
  const controls = toCsv([makeVideo({ creator: '\tformula', title: '\r=1+1' })]);
  assert.ok(controls.includes('"\'\tformula"'));
  assert.ok(controls.includes('"\'\r=1+1"'));
});
