#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const source = resolve(process.argv[2] || "data/youtube-update-2026-07-14_2026-07-16.json");
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

globalThis.window = {};
await import(`${pathToFileURL(resolve("data/videos.js")).href}?v=${Date.now()}`);
const current = window.VOD_DATA;
const update = JSON.parse(await readFile(source, "utf8"));
const kocList = JSON.parse(await readFile("data/koc-list.json", "utf8"));
const kolList = JSON.parse(await readFile("data/kol-list.json", "utf8"));
const adVideos = JSON.parse(await readFile("data/ad-videos.json", "utf8"));

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const aliases = (items) => new Map(items.flatMap((item) => item.aliases.map((alias) => [normalize(alias), item.name])));
const kocAliases = aliases(kocList);
const kolAliases = aliases(kolList);
const adIds = new Set(adVideos.rows.map((row) => row.youtubeId));
const byId = new Map(current.videos.map((video) => [video.id, video]));

for (const row of update.rows) {
  const creatorKey = normalize(row.channelTitle);
  byId.set(row.youtubeId, {
    id: row.youtubeId,
    title: row.title,
    url: row.link,
    creator: row.channelTitle,
    subscribers: row.subscriberCount ?? null,
    date: row.date,
    views: row.viewCount ?? 0,
    likes: row.likeCount ?? null,
    comments: row.commentCount ?? 0,
    duration: row.durationSeconds ?? null,
    format: row.format,
    isKoc: kocAliases.has(creatorKey),
    kocName: kocAliases.get(creatorKey) || null,
    isKol: kolAliases.has(creatorKey),
    kolName: kolAliases.get(creatorKey) || null,
    isAdTask: adIds.has(row.youtubeId),
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
for (const ids of batches([...byId.keys()])) {
  const result = await api("videos", { part: "snippet,statistics", id: ids.join(","), maxResults: "50" });
  for (const item of result.items || []) {
    const video = byId.get(item.id);
    const stats = item.statistics || {};
    video.title = item.snippet?.title || video.title;
    video.creator = item.snippet?.channelTitle || video.creator;
    video.views = Number(stats.viewCount ?? video.views ?? 0);
    video.likes = stats.likeCount == null ? null : Number(stats.likeCount);
    video.comments = stats.commentCount == null ? 0 : Number(stats.commentCount);
    if (item.snippet?.channelId) channelIds.set(item.snippet.channelId, video.creator);
    video.channelId = item.snippet?.channelId || video.channelId;
    refreshed += 1;
  }
}

const subscribers = new Map();
for (const ids of batches([...channelIds.keys()])) {
  const result = await api("channels", { part: "statistics", id: ids.join(","), maxResults: "50" });
  for (const item of result.items || []) subscribers.set(item.id, item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? 0));
}
for (const video of byId.values()) {
  if (video.channelId && subscribers.has(video.channelId)) video.subscribers = subscribers.get(video.channelId);
  delete video.channelId;
}

const videos = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || b.views - a.views);
const payload = {
  ...current,
  generatedAt: new Date().toISOString(),
  period: { start: current.period.start, end: update.meta.end },
  videos,
};
await writeFile("data/videos.js", `window.VOD_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(JSON.stringify({ previous: current.videos.length, added: videos.length - current.videos.length, total: videos.length, refreshed }));
