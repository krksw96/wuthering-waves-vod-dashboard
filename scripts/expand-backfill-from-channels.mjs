#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { classifyWutheringVideo, excludedWutheringChannelIds } from "./wuthering-waves-relevance.mjs";

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
if (!sources.length && !args.channelsFile && !args.includeIds && !args.includeIdsFile) sources.push(resolve("data/youtube-backfill-seed.json"));
const output = resolve(String(args.output || sources[0] || "data/youtube-backfill-expanded.json"));
const maxPlaylistPages = Math.min(Math.max(Number.parseInt(String(args.maxPlaylistPages || "30"), 10), 1), 50);
const concurrency = Math.min(Math.max(Number.parseInt(String(args.concurrency || "4"), 10), 1), 8);
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

const seeds = await Promise.all(sources.map(async (source) => {
  const seed = JSON.parse(await readFile(source, "utf8"));
  if (!Array.isArray(seed.rows)) throw new Error(`Seed file has no rows array: ${source}`);
  return { source, ...seed };
}));
const starts = seeds.map((seed) => seed.meta?.start).filter(Boolean).map(String);
const ends = seeds.map((seed) => seed.meta?.end).filter(Boolean).map(String);
const start = String(args.start || starts.sort().at(0) || "");
const end = String(args.end || ends.sort().at(-1) || "");
if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
  throw new Error(`Invalid date range: ${start || "(missing)"} through ${end || "(missing)"}`);
}

const registryInput = args.channelsFile ? JSON.parse(await readFile(resolve(String(args.channelsFile)), "utf8")) : [];
const registryEntries = Array.isArray(registryInput) ? registryInput : registryInput.channels || [];
const registryChannelIds = registryEntries.map((entry) => typeof entry === "string" ? entry : entry.channelId || entry.id).filter(Boolean);
const includeIds = new Set(String(args.includeIds || "").split(",").map((id) => id.trim()).filter(Boolean));
if (args.includeIdsFile) {
  const input = JSON.parse(await readFile(resolve(String(args.includeIdsFile)), "utf8"));
  for (const entry of Array.isArray(input) ? input : input.ids || input.videoIds || []) {
    const id = typeof entry === "string" ? entry : entry.youtubeId || entry.id;
    if (id) includeIds.add(id);
  }
}
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
      error.status = response.status;
      error.reason = body.error?.errors?.[0]?.reason;
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
    if (row.youtubeId && row.date >= start && row.date <= end) seedRowsById.set(row.youtubeId, row);
  }
}
const seedUniqueRowCount = seedRowsById.size;
const seedInputRowCount = seeds.reduce((sum, seed) => sum + seed.rows.length, 0);
const seedChannelIds = [...new Set([...registryChannelIds, ...seeds.flatMap((seed) => seed.rows.map((row) => row.channelId))].filter((id) => id && !excludedWutheringChannelIds.has(id)))];
if (!seedChannelIds.length && !includeIds.size) throw new Error("No usable channels or explicit video IDs were provided");

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
const playlistVideoIds = new Set(includeIds);
const cappedChannelIds = [];
const failedChannels = [];
const channelCoverage = [];
let processedPlaylistCount = 0;

await mapConcurrent(playlistChannels, concurrency, async ({ channelId, playlistId }) => {
  let pageToken = "";
  let reachedBeforeRange = false;
  let pagesRead = 0;
  let scannedItems = 0;
  let candidatesInRange = 0;
  for (let page = 0; page < maxPlaylistPages; page += 1) {
    let result;
    try {
      result = await api("playlistItems", {
        part: "contentDetails,snippet", playlistId, maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      });
    } catch (error) {
      if (error.status !== 404 && !["playlistNotFound", "playlistItemsNotAccessible"].includes(error.reason)) throw error;
      failedChannels.push({ channelId, reason: error.reason || `HTTP ${error.status}` });
      console.error(`Unavailable uploads playlist for ${channelId}: ${error.message}`);
      break;
    }
    pagesRead += 1;
    scannedItems += (result.items || []).length;
    let oldestDate = "9999-12-31";
    for (const item of result.items || []) {
      const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      if (!publishedAt) continue;
      const date = publishedDateInKorea(publishedAt);
      if (date < oldestDate) oldestDate = date;
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (videoId && date >= start && date <= end) {
        playlistVideoIds.add(videoId);
        candidatesInRange += 1;
      }
    }
    if (oldestDate < start) {
      reachedBeforeRange = true;
      break;
    }
    pageToken = result.nextPageToken || "";
    if (!pageToken) break;
    if (page === maxPlaylistPages - 1 && !reachedBeforeRange) cappedChannelIds.push(channelId);
  }
  channelCoverage.push({ channelId, pagesRead, scannedItems, candidatesInRange, complete: !cappedChannelIds.includes(channelId) && !failedChannels.some((item) => item.channelId === channelId) });
  processedPlaylistCount += 1;
  if (processedPlaylistCount % 50 === 0 || processedPlaylistCount === playlistChannels.length) {
    console.error(`uploads playlists: ${processedPlaylistCount}/${playlistChannels.length}; API calls: ${expansionCalls.playlistItemsListCalls}`);
  }
});

const newCandidateIds = [...playlistVideoIds].filter((id) => !seedRowsById.has(id));
const detailBatches = await mapConcurrent(batches(newCandidateIds), concurrency, async (ids) => {
  const result = await api("videos", {
    part: "snippet,contentDetails,statistics,status",
    id: ids.join(","),
    maxResults: "50",
  });
  return result.items || [];
});
const details = detailBatches.flat();

// Explicit IDs may introduce channels that are not in the saved registry.
for (const ids of batches([...new Set(details.map((item) => item.snippet?.channelId).filter((id) => id && !channels.has(id)))])) {
  const result = await api("channels", { part: "snippet,statistics", id: ids.join(","), maxResults: "50" });
  for (const item of result.items || []) channels.set(item.id, item);
}

const decisions = [];
const expandedRows = details.flatMap((item) => {
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const channel = channels.get(snippet.channelId) || {};
  const date = publishedDateInKorea(snippet.publishedAt);
  const decision = date < start || date > end ? { accepted: false, reason: "out-of-range" } : classifyWutheringVideo(item, { knownChannel: seedChannelIds.includes(snippet.channelId), explicit: includeIds.has(item.id) });
  decisions.push({ youtubeId: item.id, channelId: snippet.channelId, title: snippet.title, date, ...decision });
  if (!decision.accepted) return [];
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
    tags: snippet.tags || [],
    defaultLanguage: snippet.defaultLanguage || "",
    defaultAudioLanguage: snippet.defaultAudioLanguage || "",
    relevanceReason: decision.reason,
    explicitlyIncluded: includeIds.has(item.id),
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
  failedChannels,
  failedChannelIds: failedChannels.map((item) => item.channelId),
  channelCoverage,
  channelsWithoutUploads: seedChannelIds.filter((id) => !playlistChannels.some((entry) => entry.channelId === id)),
  unavailableCandidateIds: newCandidateIds.filter((id) => !details.some((item) => item.id === id)),
  seedCalls,
  expansionCalls: {
    ...expansionCalls,
    generalCalls: expansionCalls.channelsListCalls + expansionCalls.playlistItemsListCalls + expansionCalls.videosListCalls,
  },
  quota: totalCalls,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ meta, rows }, null, 2)}\n`, "utf8");
if (args.candidatesOutput) {
  const candidateOutput = resolve(String(args.candidatesOutput));
  await mkdir(dirname(candidateOutput), { recursive: true });
  await writeFile(candidateOutput, `${JSON.stringify({ meta, items: details, decisions }, null, 2)}\n`, "utf8");
}
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
