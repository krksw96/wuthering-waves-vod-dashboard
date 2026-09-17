#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readGameDataset, writeGameDataset } from "./game-dataset.mjs";
import { createPartnerIdentityMatcher } from "./partner-identity.mjs";

const source = resolve(process.argv[2] || "data/zenless-youtube-update-2026-08-01_2026-08-31.json");
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

const current = await readGameDataset("zenless-zone-zero");
const update = JSON.parse(await readFile(source, "utf8"));
const kocList = JSON.parse(await readFile("data/koc-list.json", "utf8").catch(() => "[]"));
const kolList = JSON.parse(await readFile("data/kol-list.json", "utf8").catch(() => "[]"));
const adVideos = JSON.parse(await readFile("data/ad-videos.json", "utf8").catch(() => '{"rows":[]}'));
const statsOverrides = JSON.parse(await readFile("data/stats-overrides.json", "utf8").catch(() => "{}"));

const matchKoc = createPartnerIdentityMatcher(kocList);
const matchKol = createPartnerIdentityMatcher(kolList);
const adIds = new Set(adVideos.rows.map((row) => row.youtubeId));
const byId = new Map(current.videos.map((video) => [video.id, video]));

for (const row of update.rows) {
  const channelId = row.channelId || byId.get(row.youtubeId)?.channelId || null;
  const identity = { channelId, channelTitle: row.channelTitle };
  const kocName = matchKoc(identity);
  const kolName = matchKol(identity);
  byId.set(row.youtubeId, {
    ...byId.get(row.youtubeId),
    id: row.youtubeId,
    title: row.title,
    url: row.link,
    creator: row.channelTitle,
    channelId,
    subscribers: row.subscriberCount ?? null,
    date: row.date,
    views: row.viewCount ?? 0,
    likes: row.likeCount ?? null,
    comments: row.commentCount ?? 0,
    duration: row.durationSeconds ?? null,
    format: row.format,
    isKoc: Boolean(kocName),
    kocName,
    isKol: Boolean(kolName),
    kolName,
    isAdTask: adIds.has(row.youtubeId),
    searchKeyword: row.searchKeyword || "",
  });
}

async function api(resource, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`${resource}: ${body.error?.message || response.status}`);
  return body;
}

const batches = (values, size = 50) => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
const channelIds = new Map();
let refreshed = 0;
let videosListCalls = 0;
let channelsListCalls = 0;
for (const ids of batches([...byId.keys()])) {
  const result = await api("videos", { part: "snippet,statistics", id: ids.join(","), maxResults: "50" });
  videosListCalls += 1;
  for (const item of result.items || []) {
    const video = byId.get(item.id);
    const stats = item.statistics || {};
    video.title = item.snippet?.title || video.title;
    video.creator = item.snippet?.channelTitle || video.creator;
    video.views = Number(stats.viewCount ?? video.views ?? 0);
    video.likes = stats.likeCount == null ? null : Number(stats.likeCount);
    video.comments = stats.commentCount == null ? 0 : Number(stats.commentCount);
    if (item.snippet?.channelId) channelIds.set(item.snippet.channelId, video.creator);
    video.channelId = item.snippet?.channelId || video.channelId || null;
    refreshed += 1;
  }
}

const subscribers = new Map();
for (const ids of batches([...channelIds.keys()])) {
  const result = await api("channels", { part: "statistics", id: ids.join(","), maxResults: "50" });
  channelsListCalls += 1;
  for (const item of result.items || []) subscribers.set(item.id, item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? 0));
}
for (const video of byId.values()) {
  if (video.channelId && subscribers.has(video.channelId)) video.subscribers = subscribers.get(video.channelId);
  const override = statsOverrides[video.id];
  if (override && Object.prototype.hasOwnProperty.call(override, "likes")) video.likes = override.likes;
  if (override && Object.prototype.hasOwnProperty.call(override, "comments")) video.comments = override.comments;
  video.kocName = matchKoc(video);
  video.isKoc = Boolean(video.kocName);
  video.kolName = matchKol(video);
  video.isKol = Boolean(video.kolName);
  video.isAdTask = adIds.has(video.id);
}

const videos = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || b.views - a.views);
const payload = {
  ...current,
  generatedAt: new Date().toISOString(),
  kocList,
  kolList,
  period: {
    start: [current.period.start, update.meta.start].filter(Boolean).sort().at(0),
    end: [current.period.end, update.meta.end].filter(Boolean).sort().at(-1),
  },
  videos,
};
await writeGameDataset("zenless-zone-zero", payload);
console.log(JSON.stringify({
  previous: current.videos.length,
  added: videos.length - current.videos.length,
  total: videos.length,
  refreshed,
  videosListCalls,
  channelsListCalls,
  generalCalls: videosListCalls + channelsListCalls,
}));
