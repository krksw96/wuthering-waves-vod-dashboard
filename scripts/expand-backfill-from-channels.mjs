#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((arg) => !arg.startsWith("--"));
const args = Object.fromEntries(rawArgs.filter((arg) => arg.startsWith("--")).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || true];
}));
const configuredSeeds = [args.seed, args.input]
  .filter(Boolean)
  .flatMap((value) => String(value).split(",").map((item) => item.trim()).filter(Boolean));
const sources = [...new Set([...positional, ...configuredSeeds].map((value) => resolve(String(value))))];
if (!sources.length) sources.push(resolve("data/youtube-backfill-seed.json"));
const output = resolve(String(args.output || sources[0]));
const maxPlaylistPages = Math.min(Math.max(Number.parseInt(String(args.maxPlaylistPages || "30"), 10), 1), 50);
const concurrency = Math.min(Math.max(Number.parseInt(String(args.concurrency || "4"), 10), 1), 8);
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

const seeds = await Promise.all(sources.map(async (source) => {
  const seed = JSON.parse(await readFile(source, "utf8"));
  if (!Array.isArray(seed.rows)) throw new Error(`Seed file has no rows array: ${source}`);
  return { source, ...seed };
}));
const starts = [args.start, ...seeds.map((seed) => seed.meta?.start)].filter(Boolean).map(String);
const ends = [args.end, ...seeds.map((seed) => seed.meta?.end)].filter(Boolean).map(String);
const start = starts.sort().at(0) || "";
const end = ends.sort().at(-1) || "";
if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
  throw new Error(`Invalid date range: ${start || "(missing)"} through ${end || "(missing)"}`);
}

const related = /명조|워더링\s*웨이브|wuthering\s*waves|\bwuwa\b|鳴潮/i;
const wutheringTitleTerms = /히유키|카멜탈|데니아|에데치|에이메스|플로로|치사(?!량)|시그리카|루실라|카르티시아|장리|앙코(?!르)|파수인|카멜리아|금희|젠니|카를로타|모니에|니보라|린네(?!아)|방랑자|라하이로이|잔성|공명자|종말\s*매트릭스|hiyuki|cartethyia|denia|aemeath|chisa|sigrika|camellya|shorekeeper|phrolova|zani|carlotta|mornye|lynae/i;
const unrelatedTitleCollision = /린네아|앙코르|치사량|(?:원신|소녀전선|마비카|두린).*방랑자|방랑자.*(?:원신|소녀전선|마비카|두린)|(?:roblox|로블록스|세일러\s*피스).*cartethyia|cartethyia.*(?:roblox|로블록스|세일러\s*피스)/i;
const unrelatedGameEvidence = /퍼니싱\s*그레이\s*레이븐|punishing\s*gray\s*raven|#네티아만가/i;
const aiNamedTool = /\b(?:suno|udio|chatgpt|rvc|tts)\b|인공지능|생성형\s*ai|(?:^|[^a-z0-9])ai\s*(?:아이돌|버튜버|번역|요약)/i;
const aiInTitle = /(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$)/i;
const aiDisclosure = /(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$).{0,40}(?:만들|제작|생성|변환|보정|활용|이용|도움|업스케일|보이스|음악|노래|이미지|영상|목소리)|(?:만들|제작|생성|변환|보정|활용|이용|도움|업스케일|보이스|음악|노래|이미지|영상|목소리).{0,40}(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$)|\busing\s+ai\b|ai[-\s]?(?:generated|made|voice|music|image|video|animation|art|cover)/is;
const korean = /[가-힣]/;
const excludedChannelIds = new Set(["UCKuq0c-RXYaulECSuu5hFug"]); // @WW_KR_Official
const publishedDateInKorea = (value) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const expansionCalls = {
  channelsListCalls: 0,
  playlistItemsListCalls: 0,
  videosListCalls: 0,
};

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function api(resource, params) {
  const counter = `${resource}ListCalls`;
  if (!(counter in expansionCalls)) throw new Error(`No quota counter configured for ${resource}.list`);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
    expansionCalls[counter] += 1;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const body = await response.json();
      if (response.ok) return body;
      const message = `${resource}: ${body.error?.message || response.status}`;
      const error = new Error(message);
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    } catch (error) {
      lastError = error;
      if (error?.retryable === false) throw error;
    }
    if (attempt < 2) await delay(500 * (2 ** attempt));
  }
  throw lastError;
}

function batches(values, size = 50) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

async function mapConcurrent(values, limit, operation) {
  let cursor = 0;
  const results = new Array(values.length);
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      results[index] = await operation(values[index], index);
    }
  }));
  return results;
}

function durationSeconds(value = "") {
  const match = value.match(/^P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0);
}

const seedRowsById = new Map();
for (const seed of seeds) {
  for (const row of seed.rows) {
    if (row.youtubeId) seedRowsById.set(row.youtubeId, row);
  }
}
const seedUniqueRowCount = seedRowsById.size;
const seedInputRowCount = seeds.reduce((sum, seed) => sum + seed.rows.length, 0);
const seedChannelIds = [...new Set([...seedRowsById.values()].map((row) => row.channelId).filter((id) => id && !excludedChannelIds.has(id)))];
if (!seedChannelIds.length) throw new Error("Seed rows do not contain any usable channelId values");

const channels = new Map();
for (const ids of batches(seedChannelIds)) {
  const result = await api("channels", {
    part: "contentDetails,snippet,statistics",
    id: ids.join(","),
    maxResults: "50",
  });
  for (const item of result.items || []) channels.set(item.id, item);
}

const playlistChannels = [...channels.values()].flatMap((channel) => {
  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
  return playlistId ? [{ channelId: channel.id, playlistId }] : [];
});
const playlistVideoIds = new Set();
const cappedChannelIds = [];
let processedPlaylistCount = 0;

await mapConcurrent(playlistChannels, concurrency, async ({ channelId, playlistId }) => {
  let pageToken = "";
  let reachedBeforeRange = false;
  for (let page = 0; page < maxPlaylistPages; page += 1) {
    const result = await api("playlistItems", {
      part: "contentDetails,snippet",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    let oldestDate = "9999-12-31";
    for (const item of result.items || []) {
      const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      if (!publishedAt) continue;
      const date = publishedDateInKorea(publishedAt);
      if (date < oldestDate) oldestDate = date;
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (videoId && date >= start && date <= end) playlistVideoIds.add(videoId);
    }
    if (oldestDate < start) {
      reachedBeforeRange = true;
      break;
    }
    pageToken = result.nextPageToken || "";
    if (!pageToken) break;
    if (page === maxPlaylistPages - 1 && !reachedBeforeRange) cappedChannelIds.push(channelId);
  }
  processedPlaylistCount += 1;
  if (processedPlaylistCount % 50 === 0 || processedPlaylistCount === playlistChannels.length) {
    console.error(`uploads playlists: ${processedPlaylistCount}/${playlistChannels.length}; API calls: ${expansionCalls.playlistItemsListCalls}`);
  }
});

const newCandidateIds = [...playlistVideoIds].filter((id) => !seedRowsById.has(id));
const details = [];
for (const ids of batches(newCandidateIds)) {
  const result = await api("videos", {
    part: "snippet,contentDetails,statistics,status",
    id: ids.join(","),
    maxResults: "50",
  });
  details.push(...(result.items || []));
}

const expandedRows = details.flatMap((item) => {
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const channel = channels.get(snippet.channelId) || {};
  const normalizedTitle = String(snippet.title || "").normalize("NFKC");
  const text = [normalizedTitle, snippet.description, ...(snippet.tags || []), snippet.channelTitle].join(" ").normalize("NFKC");
  const date = publishedDateInKorea(snippet.publishedAt);
  const koreanEvidence = korean.test(`${snippet.title || ""} ${snippet.channelTitle || ""}`) || /^ko(?:-|$)/i.test(snippet.defaultLanguage || snippet.defaultAudioLanguage || "");
  const strongTitleEvidence = related.test(normalizedTitle) || wutheringTitleTerms.test(normalizedTitle);
  const collisionWithoutWutheringEvidence = (unrelatedTitleCollision.test(normalizedTitle) || unrelatedGameEvidence.test(text)) && !related.test(text);
  const disclosedAiUse = aiNamedTool.test(text) || aiInTitle.test(snippet.title || "") || aiDisclosure.test(text) || /^dear\s+ai$/i.test(snippet.channelTitle || "");
  if (date < start || date > end || excludedChannelIds.has(snippet.channelId) || !strongTitleEvidence || collisionWithoutWutheringEvidence || !koreanEvidence || disclosedAiUse) return [];
  const seconds = durationSeconds(item.contentDetails?.duration);
  return [{
    title: snippet.title,
    link: `https://www.youtube.com/watch?v=${item.id}`,
    shortsLink: `https://www.youtube.com/shorts/${item.id}`,
    youtubeId: item.id,
    channelTitle: snippet.channelTitle,
    channelId: snippet.channelId,
    subscriberCount: channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount ?? 0),
    date,
    viewCount: Number(stats.viewCount ?? 0),
    likeCount: stats.likeCount == null ? null : Number(stats.likeCount),
    commentCount: stats.commentCount == null ? 0 : Number(stats.commentCount),
    durationSeconds: seconds,
    format: seconds != null && seconds <= 180 ? "Shorts" : "VOD",
    description: snippet.description || "",
    gameTitle: "",
    sources: `YouTube Data API v3 uploads playlist / ${snippet.channelTitle || snippet.channelId}`,
  }];
});

for (const row of expandedRows) seedRowsById.set(row.youtubeId, row);
const rows = [...seedRowsById.values()].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.viewCount ?? 0) - (a.viewCount ?? 0));
const sumSeedCounter = (name) => seeds.reduce((sum, seed) => sum + Number(seed.meta?.[name] || 0), 0);
const seedCalls = {
  searchListCalls: sumSeedCounter("searchCalls"),
  channelsListCalls: sumSeedCounter("channelsListCalls"),
  playlistItemsListCalls: sumSeedCounter("playlistItemsListCalls"),
  videosListCalls: sumSeedCounter("videosListCalls"),
};
seedCalls.generalCalls = seedCalls.channelsListCalls + seedCalls.playlistItemsListCalls + seedCalls.videosListCalls;
const totalCalls = {
  searchListCalls: seedCalls.searchListCalls,
  channelsListCalls: seedCalls.channelsListCalls + expansionCalls.channelsListCalls,
  playlistItemsListCalls: seedCalls.playlistItemsListCalls + expansionCalls.playlistItemsListCalls,
  videosListCalls: seedCalls.videosListCalls + expansionCalls.videosListCalls,
};
totalCalls.generalCalls = totalCalls.channelsListCalls + totalCalls.playlistItemsListCalls + totalCalls.videosListCalls;
const meta = {
  ...(seeds[0]?.meta || {}),
  collectedAt: new Date().toISOString(),
  start,
  end,
  searchCalls: totalCalls.searchListCalls,
  videosListCalls: totalCalls.videosListCalls,
  channelsListCalls: totalCalls.channelsListCalls,
  playlistItemsListCalls: totalCalls.playlistItemsListCalls,
  generalCalls: totalCalls.generalCalls,
  resultCount: rows.length,
  seedFiles: sources,
  seedFileCount: seeds.length,
  seedInputRowCount,
  seedUniqueRowCount,
  seedChannelCount: seedChannelIds.length,
  uploadsPlaylistCount: playlistChannels.length,
  playlistCandidateCount: playlistVideoIds.size,
  newPlaylistCandidateCount: newCandidateIds.length,
  addedFromPlaylists: expandedRows.length,
  maxPlaylistPagesPerChannel: maxPlaylistPages,
  cappedChannelCount: cappedChannelIds.length,
  cappedChannelIds,
  seedCalls,
  expansionCalls: {
    ...expansionCalls,
    generalCalls: expansionCalls.channelsListCalls + expansionCalls.playlistItemsListCalls + expansionCalls.videosListCalls,
  },
  quota: totalCalls,
};

await writeFile(output, `${JSON.stringify({ meta, rows }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  sources,
  output,
  seedInputRows: seedInputRowCount,
  seedUniqueRows: seedUniqueRowCount,
  channels: seedChannelIds.length,
  playlists: playlistChannels.length,
  playlistCandidates: playlistVideoIds.size,
  addedRows: expandedRows.length,
  totalRows: rows.length,
  cappedChannels: cappedChannelIds.length,
  seedCalls,
  expansionCalls: meta.expansionCalls,
  totalCalls,
}));
