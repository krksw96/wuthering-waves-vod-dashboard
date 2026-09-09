import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeName,
  validateDateRange,
  inferBroadcastDate,
  parseLiveSource,
  createKolDirectory,
  searchKols,
  summarizeKol,
} from "./kol-search-model.mjs";
import { buildKolVodIndex } from "./kol-vod-index.mjs";

const period = { start: "2026-09-01", end: "2026-09-09" };
const day = (date, format, count, views, likes, comments, viewsKnown = count, likesKnown = count, commentsKnown = count) =>
  [date, format, count, views, likes, comments, viewsKnown, likesKnown, commentsKnown];
const vodIndex = () => ({
  version: 1,
  game: "wuthering-waves",
  generatedAt: "2026-09-09T02:00:00Z",
  period: { ...period },
  aliases: [{ name: "마레플로스", aliases: ["MareFlos", "마레플로스 생방송 다시보기"] }],
  creators: [
    { name: "MareFlos", days: [day("2026-09-01", "VOD", 2, 400, 20, 4), day("2026-09-02", "Shorts", 1, 50, 0, 1, 1, 0, 1), day("2026-09-09", "VOD", 1, 250, 25, 5)] },
    { name: "마레플로스 생방송 다시보기", days: [day("2026-09-02", "VOD", 1, 100, 10, 2)] },
    { name: "MareFlos fan", days: [day("2026-09-02", "VOD", 10, 900000, 9000, 900)] },
    { name: "다른 채널", days: [day("2026-09-02", "VOD", 4, 800000, 8000, 800)], title: "MareFlos와 합방" },
    { name: "No uploads", days: [] },
  ],
});
const liveRow = (creator, date, overrides = {}) => ({
  creator, date, streams: 1, playHours: 2, maxViewers: 500, avgViewers: 100, viewershipTotal: 200, ...overrides,
});
const liveData = () => ({
  generatedAt: "2026-09-09T03:00:00Z",
  period: { start: "2026-09-02", end: "2026-09-08" },
  profiles: [{ name: "마레 플로스", youtubeUrl: "https://www.youtube.com/@MareFlos" }],
  records: [
    liveRow("마레 플로스", "2026-09-02"),
    liveRow("마레 플로스", "2026-09-08", { streams: 2, playHours: 6, maxViewers: 700, avgViewers: 300, viewershipTotal: 1800 }),
    liveRow("마레 플로스 팬", "2026-09-02", { streams: 99, playHours: 99, maxViewers: 99999, viewershipTotal: 999999 }),
  ],
});
const rawLiveRow = (overrides = {}) => ({
  creator: "마레 플로스", latestDate: "09.08 (화)", updatedAt: "2026-09-09T03:00:00Z",
  streams: 1, playHours: 2, maxViewers: 500, avgViewers: 100, viewershipTotal: 200, ...overrides,
});
const feed = (daily, summary = [{ creator: "마레 플로스", youtubeUrl: "https://www.youtube.com/@MareFlos", streams: 999, viewershipTotal: 999999 }]) =>
  `window.KOL_RECORDS = ${JSON.stringify(summary)};\nwindow.KOL_DAILY_RECORDS = ${JSON.stringify(daily)};\n`;
const selected = (index, live = null, query = "마레플로스") => {
  const directory = createKolDirectory(index, live);
  const exact = searchKols(directory, query).find((profile) => profile.aliases.some((alias) => normalizeName(alias) === normalizeName(query)));
  assert.ok(exact, `fixture has exact profile ${query}`);
  return exact;
};

test("name normalization folds width, case and whitespace while preserving identity punctuation", () => {
  assert.equal(normalizeName("  Ｍａｒｅ Ｆｌｏｓ\t"), "mareflos");
  assert.equal(normalizeName("마레\u00a0플로스"), "마레플로스");
  assert.notEqual(normalizeName("Creator-1"), normalizeName("Creator1"));
  assert.notEqual(normalizeName("Creator_1"), normalizeName("Creator1"));
  assert.equal(normalizeName(""), "");
});

test("date ranges are inclusive, calendar-valid and ordered", () => {
  assert.deepEqual(validateDateRange("2024-02-29", "2024-02-29"), { start: "2024-02-29", end: "2024-02-29" });
  assert.deepEqual(validateDateRange("2025-12-31", "2026-01-01"), { start: "2025-12-31", end: "2026-01-01" });
  for (const invalid of ["", "2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-09-00", "2026-9-01", "2026-09-01T00:00:00Z", "not-a-date"]) {
    assert.throws(() => validateDateRange(invalid, "2026-09-09"), RangeError, invalid);
    assert.throws(() => validateDateRange("2026-09-01", invalid), RangeError, invalid);
  }
  assert.throws(() => validateDateRange("2026-09-09", "2026-09-01"), RangeError);
});

test("broadcast dates use the update's Korean calendar year with New Year rollover", () => {
  assert.equal(inferBroadcastDate("09.08 (화)", "2026-09-09T03:00:00Z"), "2026-09-08");
  assert.equal(inferBroadcastDate("12.31 (목)", "2027-01-02T03:00:00Z"), "2026-12-31");
  assert.equal(inferBroadcastDate("01.01 (금)", "2026-12-31T16:00:00Z"), "2027-01-01", "KST has already crossed New Year");
  assert.equal(inferBroadcastDate("12.31", "2026-12-31T16:00:00Z"), "2026-12-31");
  assert.equal(inferBroadcastDate("02.29", "2024-03-01T00:00:00Z"), "2024-02-29");
  for (const invalid of ["", "13.01", "00.10", "04.31", "02.29", "09.00", "09.08 trailing", "09/08", "09.08 (화"])
    assert.throws(() => inferBroadcastDate(invalid, "2026-09-09T03:00:00Z"), RangeError, invalid);
  assert.throws(() => inferBroadcastDate("09.08", "not-a-timestamp"), RangeError);
  for (const malformedUpdate of ["2026-02-30T03:00:00Z", "2026-04-31T03:00:00Z"])
    assert.throws(() => inferBroadcastDate("02.28", malformedUpdate), RangeError, "invalid update days cannot silently roll into the next month");
});

test("live source parser reads JSON arrays through escaped punctuation without executing source text", () => {
  const source = feed([
    rawLiveRow({ latestDate: "09.07 (월)", notes: 'quoted "text"; brackets [] {} and slash \\; window.KOL_RECORDS = [999];' }),
    rawLiveRow({ updatedAt: "2026-09-09T04:00:00Z", streams: 2, playHours: 6, maxViewers: 700, avgViewers: 300, viewershipTotal: 1800 }),
  ]) + 'throw new Error("remote source must not run");\n';
  const parsed = parseLiveSource(source);
  assert.equal(parsed.generatedAt, "2026-09-09T04:00:00Z");
  assert.deepEqual(parsed.period, { start: "2026-09-07", end: "2026-09-08" });
  assert.deepEqual(parsed.records, [liveRow("마레 플로스", "2026-09-07"), liveRow("마레 플로스", "2026-09-08", { streams: 2, playHours: 6, maxViewers: 700, avgViewers: 300, viewershipTotal: 1800 })]);
  assert.deepEqual(parsed.profiles, [{ name: "마레 플로스", youtubeUrl: "https://www.youtube.com/@MareFlos" }]);
  assert.equal(parsed.records.reduce((sum, row) => sum + row.streams, 0), 3, "all-time summary totals never become daily rows");
});

test("live source parser preserves missing metrics and rejects malformed records instead of false zeros", () => {
  const row = parseLiveSource(feed([rawLiveRow({ streams: 0, playHours: null, maxViewers: undefined, avgViewers: "", viewershipTotal: 0 })])).records[0];
  assert.deepEqual(row, { creator: "마레 플로스", date: "2026-09-08", streams: 0, playHours: null, maxViewers: null, avgViewers: null, viewershipTotal: 0 });
  for (const invalid of [null, {}, rawLiveRow({ creator: " " }), rawLiveRow({ latestDate: "02.30" }), rawLiveRow({ playHours: -1 }), rawLiveRow({ streams: "1" })])
    assert.throws(() => parseLiveSource(feed([invalid])));
  assert.throws(() => parseLiveSource(feed([])));
  assert.throws(() => parseLiveSource(feed([rawLiveRow(), rawLiveRow()])), /duplicate/);
  assert.throws(() => parseLiveSource("window.KOL_RECORDS = [];"));
  assert.throws(() => parseLiveSource("window.KOL_RECORDS = [];\nwindow.KOL_DAILY_RECORDS = [notJSON];"));
  assert.throws(() => parseLiveSource("window.KOL_RECORDS = [];\nwindow.KOL_DAILY_RECORDS = [{"));
});

test("directory joins only exact normalized identities and declared aliases", () => {
  const index = vodIndex();
  index.creators.push({ name: "과로사", days: [] }, { name: "과로사11", days: [] }, { name: "Creator-1", days: [] }, { name: "Creator1", days: [] }, { name: "Saved channel", canonicalName: "Canonical", days: [] });
  const live = liveData();
  live.records.push(liveRow("과로사1", "2026-09-02"), liveRow("Canonical", "2026-09-02"));
  const profile = selected(index, live);
  assert.deepEqual([...profile.vodNames].sort(), ["MareFlos", "마레플로스 생방송 다시보기"].sort());
  assert.deepEqual(profile.liveNames, ["마레 플로스"]);
  assert.equal(selected(index, live, "과로사").liveNames[0], "과로사1");
  assert.deepEqual(selected(index, live, "과로사").vodNames, ["과로사"]);
  assert.notEqual(selected(index, live, "과로사11").key, selected(index, live, "과로사").key);
  assert.notEqual(selected(index, live, "Creator-1").key, selected(index, live, "Creator1").key);
  assert.deepEqual(selected(index, live, "Canonical").vodNames, ["Saved channel"]);
});

test("candidate search is bounded and supports partial names while blank queries expose no profiles", () => {
  const directory = createKolDirectory(vodIndex(), liveData());
  assert.deepEqual(searchKols(directory, ""), []);
  assert.deepEqual(searchKols(directory, " \t\n\u00a0"), []);
  assert.deepEqual(searchKols(directory, "합방"), [], "video titles are never candidate names");
  const partial = searchKols(directory, "Mare");
  assert.equal(partial.length, 2);
  assert.equal(searchKols(directory, "MareFlos")[0].name, "마레플로스", "exact registered alias ranks ahead of longer names");
  assert.equal(searchKols(directory, "Mare", 1).length, 1);
  assert.equal(searchKols(directory, "Mare", 0).length, 0);
});

test("selected VOD aggregation includes both boundary dates and only exact profile members", () => {
  const index = vodIndex(), live = liveData();
  const profile = selected(index, live);
  const before = JSON.stringify({ index, live, profile });
  const result = summarizeKol(profile, { vodIndex: index, liveData: live, start: "2026-09-01", end: "2026-09-09" });
  assert.deepEqual(result.vod, { count: 5, vodCount: 4, shortsCount: 1, views: 800, likes: 55, comments: 12, known: { views: 5, likes: 4, comments: 5 }, coverage: { status: "full", ...period } });
  const oneDay = summarizeKol(profile, { vodIndex: index, liveData: live, start: "2026-09-02", end: "2026-09-02" });
  assert.equal(oneDay.vod.count, 2);
  assert.equal(oneDay.vod.views, 150);
  assert.equal(oneDay.vod.likes, 10);
  assert.equal(oneDay.vod.known.likes, 1, "missing likes remain excluded from known-value count");
  assert.equal(JSON.stringify({ index, live, profile }), before, "searches cannot mutate source data or selected identity");
  assert.throws(() => summarizeKol(profile, { vodIndex: index, start: "2026-09-09", end: "2026-09-01" }), RangeError);
});

test("VOD totals distinguish all-missing fields, known zero, and partial-known sums", () => {
  const index = vodIndex();
  index.creators = [{ name: "Metrics", days: [day("2026-09-02", "VOD", 2, 0, 0, 7, 0, 1, 1)] }];
  const result = summarizeKol(selected(index, null, "Metrics"), { vodIndex: index, start: "2026-09-02", end: "2026-09-02" }).vod;
  assert.equal(result.count, 2);
  assert.equal(result.views, null);
  assert.equal(result.likes, 0);
  assert.equal(result.comments, 7);
  assert.deepEqual(result.known, { views: 0, likes: 1, comments: 1 });
});

test("live aggregation sums hours and viewer-hours, weights the average, and takes the highest peak", () => {
  const index = vodIndex(), live = liveData();
  const result = summarizeKol(selected(index, live), { vodIndex: index, liveData: live, start: "2026-09-02", end: "2026-09-08" }).live;
  assert.deepEqual(result, { streams: 3, playHours: 8, viewershipTotal: 2000, maxViewers: 700, avgViewers: 250, coverage: { status: "full", start: "2026-09-02", end: "2026-09-08" } });
  assert.notEqual(result.avgViewers, 200, "a simple mean of daily viewers would be wrong");
  const sameDay = summarizeKol(selected(index, live), { vodIndex: index, liveData: live, start: "2026-09-08", end: "2026-09-08" }).live;
  assert.equal(sameDay.streams, 2);
  assert.equal(sameDay.avgViewers, 300);
});

test("missing live totals cannot become zero or an invented average", () => {
  const index = vodIndex(), live = liveData();
  live.records = [liveRow("마레 플로스", "2026-09-02", { playHours: null, viewershipTotal: null, maxViewers: null })];
  const result = summarizeKol(selected(index, live), { vodIndex: index, liveData: live, start: "2026-09-02", end: "2026-09-08" }).live;
  assert.equal(result.streams, 1);
  assert.equal(result.playHours, null);
  assert.equal(result.viewershipTotal, null);
  assert.equal(result.avgViewers, null);
  assert.equal(result.maxViewers, null);
});

test("coverage distinguishes covered inactivity, partial periods, outside periods and unavailable sources", () => {
  const index = vodIndex(), live = liveData(), profile = selected(index, live);
  const inactive = summarizeKol(profile, { vodIndex: index, liveData: live, start: "2026-09-04", end: "2026-09-05" });
  assert.equal(inactive.vod.coverage.status, "full");
  assert.equal(inactive.vod.count, 0);
  assert.equal(inactive.vod.views, 0);
  assert.deepEqual(inactive.vod.known, { views: 0, likes: 0, comments: 0 });
  assert.deepEqual(inactive.live, { streams: 0, playHours: 0, viewershipTotal: 0, maxViewers: 0, avgViewers: null, coverage: { status: "full", start: "2026-09-02", end: "2026-09-08" } });
  const partial = summarizeKol(profile, { vodIndex: index, liveData: live, start: "2026-09-01", end: "2026-09-09" });
  assert.equal(partial.vod.coverage.status, "full");
  assert.equal(partial.live.coverage.status, "partial");
  assert.equal(partial.live.streams, 3);
  for (const [start, end] of [["2026-08-01", "2026-08-31"], ["2026-09-10", "2026-09-11"]]) {
    const outside = summarizeKol(profile, { vodIndex: index, liveData: live, start, end });
    assert.equal(outside.vod.coverage.status, "outside");
    assert.equal(outside.live.coverage.status, "outside");
    for (const field of ["count", "views", "likes", "comments"]) assert.equal(outside.vod[field], null);
    for (const field of ["streams", "playHours", "viewershipTotal", "maxViewers", "avgViewers"]) assert.equal(outside.live[field], null);
  }
  const otherGame = summarizeKol(profile, { vodIndex: { ...index, game: "zenless-zone-zero" }, liveData: null, start: "2026-09-02", end: "2026-09-08" });
  assert.equal(otherGame.vod.coverage.status, "full");
  assert.deepEqual(otherGame.live, { streams: null, playHours: null, viewershipTotal: null, maxViewers: null, avgViewers: null, coverage: { status: "unavailable", start: null, end: null } });
  const noVod = summarizeKol(profile, { vodIndex: null, liveData: live, start: "2026-09-02", end: "2026-09-08" });
  assert.equal(noVod.vod.coverage.status, "unavailable");
  assert.equal(noVod.vod.count, null);
});

test("compact VOD index deduplicates IDs and preserves known-value counts without titles", () => {
  const dataset = {
    generatedAt: "2026-09-09T00:00:00Z", period,
    kolList: [{ name: "Canonical", aliases: ["Alias"] }],
    videos: [
      { id: "invalid-first", creator: "Alias", date: "2026-02-30", views: 999 },
      { id: "invalid-first", creator: "Alias", date: "2026-09-02", format: "VOD", views: 10, likes: null, comments: 0, kolName: "Canonical", title: "Hidden title", url: "https://example.com/video" },
      { id: "invalid-first", creator: "Alias", date: "2026-09-02", format: "VOD", views: 9999, likes: 99, comments: 99 },
      { id: "known-zero", creator: "Alias", date: "2026-09-02", format: "VOD", views: 0, likes: 0, comments: null, kolName: "Canonical" },
      { creator: "Alias", date: "2026-09-02", format: "VOD", views: -1, likes: Infinity, comments: NaN },
      { creator: "Alias", date: "2026-09-02", format: "VOD", views: undefined, likes: "3", comments: "" },
      { id: "short", creator: "Alias", date: "2026-09-02", format: "Shorts", views: 50, likes: 5, comments: 1 },
    ],
  };
  const index = buildKolVodIndex("wuthering-waves", dataset);
  assert.equal(index.version, 1);
  assert.equal(index.game, "wuthering-waves");
  assert.deepEqual(index.period, period);
  assert.deepEqual(index.aliases, [{ name: "Canonical", aliases: ["Alias"] }]);
  assert.deepEqual(index.creators, [{ name: "Alias", canonicalName: "Canonical", days: [day("2026-09-02", "Shorts", 1, 50, 5, 1), day("2026-09-02", "VOD", 4, 10, 0, 0, 2, 1, 1)] }]);
  assert.ok(!JSON.stringify(index).includes("Hidden title"));
  assert.ok(!JSON.stringify(index).includes("example.com/video"));
  const result = summarizeKol(selected(index, null, "Canonical"), { vodIndex: index, start: "2026-09-02", end: "2026-09-02" }).vod;
  assert.equal(result.count, 5);
  assert.deepEqual(result.known, { views: 3, likes: 2, comments: 2 });
});

test("conflicting canonical metadata cannot silently merge different creators", () => {
  const index = buildKolVodIndex("wuthering-waves", { period, videos: [
    { id: "one", creator: "Mixed channel", date: "2026-09-02", kolName: "Person A" },
    { id: "two", creator: "Mixed channel", date: "2026-09-03", kolName: "Person B" },
    { id: "three", creator: "Person A", date: "2026-09-02" },
  ] });
  assert.equal(index.creators.find((row) => row.name === "Mixed channel").canonicalName, undefined);
  assert.deepEqual(selected(index, null, "Mixed channel").vodNames, ["Mixed channel"]);
  assert.deepEqual(selected(index, null, "Person A").vodNames, ["Person A"]);
});
