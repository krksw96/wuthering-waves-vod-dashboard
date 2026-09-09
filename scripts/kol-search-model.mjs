export const LIVE_DASHBOARD_URL = "https://krksw96.github.io/wuthering-waves-kol-dashboard/";

export function normalizeName(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, "");
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateDateRange(start, end) {
  if (!isDate(start) || !isDate(end)) throw new RangeError("invalid-date");
  if (start > end) throw new RangeError("reversed-date");
  return { start, end };
}

export function inferBroadcastDate(latestDate, updatedAt) {
  if (isDate(latestDate)) return latestDate;
  const match = /^(\d{1,2})\.(\d{1,2})(?:\s*\([^)]*\))?\s*$/.exec(String(latestDate || ""));
  const updateParts = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(String(updatedAt || ""));
  const timestamp = Date.parse(updatedAt);
  if (!match || !updateParts || !isDate(updateParts[1]) || Number(updateParts[2]) > 23 || Number(updateParts[3]) > 59 || Number(updateParts[4]) > 59 || !Number.isFinite(timestamp)) throw new RangeError("invalid-live-date");
  const updatedDay = new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
  const monthDay = `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  let year = Number(updatedDay.slice(0, 4));
  if (monthDay > updatedDay.slice(5)) year -= 1;
  const date = `${year}-${monthDay}`;
  if (!isDate(date)) throw new RangeError("invalid-live-date");
  return date;
}

// The published feed is JavaScript wrapping JSON. Read just its arrays, without
// running remote code; strings may contain semicolons, brackets and escapes.
function readJsonAssignment(text, name) {
  const match = new RegExp(`(?:^|[\\r\\n])\\s*window\\.${name}\\s*=\\s*`, "m").exec(text);
  if (!match) throw new Error(`missing-${name}`);
  const start = match.index + match[0].length;
  if (text[start] !== "[") throw new Error(`invalid-${name}`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "[" || char === "{") depth += 1;
    else if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  throw new Error(`incomplete-${name}`);
}

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError("invalid-metric");
  return value;
}

export function parseLiveSource(text) {
  const summary = readJsonAssignment(text, "KOL_RECORDS");
  const daily = readJsonAssignment(text, "KOL_DAILY_RECORDS");
  if (!Array.isArray(summary) || !Array.isArray(daily) || !daily.length) throw new TypeError("invalid-live-feed");
  const seen = new Set();
  const records = daily.map((row) => {
    if (!row || typeof row.creator !== "string" || !row.creator.trim()) throw new TypeError("invalid-live-creator");
    const date = inferBroadcastDate(row.latestDate, row.updatedAt);
    const key = `${row.creator}\0${date}`;
    if (seen.has(key)) throw new TypeError("duplicate-live-day");
    seen.add(key);
    return Object.fromEntries([
      ["creator", row.creator], ["date", date],
      ...["streams", "playHours", "maxViewers", "avgViewers", "viewershipTotal"].map((field) => [field, numeric(row[field])]),
    ]);
  });
  const dates = records.map((row) => row.date).sort();
  const updates = daily.map((row) => row.updatedAt).filter((value) => Number.isFinite(Date.parse(value))).sort();
  return {
    generatedAt: updates.at(-1) || null,
    period: { start: dates[0], end: dates.at(-1) },
    records,
    profiles: summary.filter((row) => typeof row?.creator === "string").map((row) => ({ name: row.creator, youtubeUrl: row.youtubeUrl || "" })),
  };
}

export function createKolDirectory(vodIndex, liveData = null) {
  const parents = new Map();
  const labels = new Map();
  const add = (name, priority = 0) => {
    const key = normalizeName(name);
    if (!key) return "";
    if (!parents.has(key)) parents.set(key, key);
    const current = labels.get(key);
    if (!current || priority > current.priority) labels.set(key, { name, priority });
    return key;
  };
  const find = (key) => {
    const parent = parents.get(key);
    if (parent !== key) parents.set(key, find(parent));
    return parents.get(key);
  };
  const join = (name, aliases) => {
    const key = add(name, 2);
    if (!key) return;
    for (const alias of aliases || []) {
      const other = add(alias);
      if (other) parents.set(find(other), find(key));
    }
  };
  const creators = vodIndex?.creators || [];
  const liveNames = [...new Set((liveData?.records || []).map((row) => row.creator))];
  creators.forEach((creator) => add(creator.name, 1));
  liveNames.forEach((name) => add(name, 1));
  for (const alias of vodIndex?.aliases || []) join(alias.name, alias.aliases);
  for (const creator of creators) if (creator.canonicalName) join(creator.canonicalName, [creator.name]);
  // This source calls the same creator 과로사1; the VOD source explicitly uses 과로사.
  join("과로사", ["과로사1"]);
  const groups = new Map();
  for (const [key, label] of labels) {
    const root = find(key);
    if (!groups.has(root)) groups.set(root, { labels: [], vodNames: [], liveNames: [] });
    groups.get(root).labels.push(label);
  }
  creators.forEach((creator) => groups.get(find(normalizeName(creator.name)))?.vodNames.push(creator.name));
  liveNames.forEach((name) => groups.get(find(normalizeName(name)))?.liveNames.push(name));
  return [...groups.values()].filter((group) => group.vodNames.length || group.liveNames.length).map((group) => {
    group.labels.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "ko"));
    const name = group.labels[0].name;
    return { key: normalizeName(name), name, aliases: [...new Set(group.labels.map((label) => label.name))], vodNames: group.vodNames, liveNames: group.liveNames };
  }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function searchKols(directory, query, limit = 12) {
  const term = normalizeName(query);
  if (!term) return [];
  const score = (profile) => Math.min(...profile.aliases.map((name) => {
    const normalized = normalizeName(name);
    return normalized === term ? 0 : normalized.startsWith(term) ? 1 : normalized.includes(term) ? 2 : 3;
  }));
  return directory.map((profile) => ({ profile, score: score(profile) })).filter((item) => item.score < 3)
    .sort((a, b) => a.score - b.score || a.profile.name.localeCompare(b.profile.name, "ko"))
    .slice(0, limit).map((item) => item.profile);
}

function coverageFor(source, start, end) {
  const period = source?.period;
  if (!period || !isDate(period.start) || !isDate(period.end)) return { status: "unavailable", start: null, end: null };
  const status = end < period.start || start > period.end ? "outside"
    : start < period.start || end > period.end ? "partial" : "full";
  return { status, start: period.start, end: period.end };
}

export function summarizeKol(profile, { vodIndex, liveData = null, start, end }) {
  validateDateRange(start, end);
  const vodCoverage = coverageFor(vodIndex, start, end);
  const liveCoverage = coverageFor(liveData, start, end);
  const unavailable = (coverage) => ["outside", "unavailable"].includes(coverage.status);
  const vod = { count: 0, vodCount: 0, shortsCount: 0, views: 0, likes: 0, comments: 0, known: { views: 0, likes: 0, comments: 0 }, coverage: vodCoverage };
  if (unavailable(vodCoverage)) {
    for (const field of ["count", "vodCount", "shortsCount", "views", "likes", "comments"]) vod[field] = null;
  } else {
    const names = new Set(profile.vodNames);
    for (const creator of vodIndex.creators) {
      if (!names.has(creator.name)) continue;
      for (const row of creator.days) {
        if (row[0] < start || row[0] > end) continue;
        vod.count += row[2];
        if (row[1] === "Shorts") vod.shortsCount += row[2]; else vod.vodCount += row[2];
        ["views", "likes", "comments"].forEach((key, index) => {
          vod[key] += row[index + 3];
          vod.known[key] += row[index + 6];
        });
      }
    }
    for (const key of ["views", "likes", "comments"]) if (vod.count && !vod.known[key]) vod[key] = null;
  }
  const live = { streams: 0, playHours: 0, viewershipTotal: 0, maxViewers: 0, avgViewers: null, coverage: liveCoverage };
  if (unavailable(liveCoverage)) {
    for (const field of ["streams", "playHours", "viewershipTotal", "maxViewers"]) live[field] = null;
  } else {
    const names = new Set(profile.liveNames);
    const rows = liveData.records.filter((row) => names.has(row.creator) && row.date >= start && row.date <= end);
    for (const field of ["streams", "playHours", "viewershipTotal"]) {
      live[field] = rows.some((row) => row[field] === null) ? null : rows.reduce((total, row) => total + row[field], 0);
    }
    const peaks = rows.map((row) => row.maxViewers).filter((value) => value !== null);
    live.maxViewers = rows.length && !peaks.length ? null : Math.max(0, ...peaks);
    if (live.playHours > 0 && live.viewershipTotal !== null) live.avgViewers = Math.round(live.viewershipTotal / live.playHours);
    if (live.playHours !== null) live.playHours = Math.round(live.playHours * 100) / 100;
  }
  return { vod, live };
}
