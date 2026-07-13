#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const queries = [
  "명조", "명조 워더링 웨이브", "워더링 웨이브", "wuthering waves 명조",
  "명조 3.5", "명조 양양", "명조 현령", "명조 수수",
  "명조 공략", "명조 스토리", "명조 다시보기", "명조 리액션",
  "명조 쇼츠", "명조 shorts", "워더링 웨이브 쇼츠", "워더링 웨이브 shorts",
];
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || true];
}));
const start = String(args.start || "2026-05-28");
const end = String(args.end || "2026-07-13");
const maxPages = Math.min(Number.parseInt(args.maxPages || "5", 10), 5);
const windowDays = Number.parseInt(args.windowDays || "0", 10);
const searchQueries = args.coreQueries ? queries.slice(0, 4) : queries;
const includeIds = String(args.includeIds || "").split(",").map((id) => id.trim()).filter(Boolean);
const output = resolve(String(args.output || "../data/youtube_data_api_audit.json"));
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

const related = /명조|워더링\s*웨이브|wuthering\s*waves|\bwuwa\b|鳴潮/i;
const aiUse = /\b(?:suno|udio|chatgpt)\b|인공지능|생성형\s*ai|ai\s*(?:생성|사용|커버|노래|그림|영상)/i;
const korean = /[가-힣]/;

async function api(resource, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`${resource}: ${body.error?.message || response.status}`);
  return body;
}

function batches(values, size = 50) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

function durationSeconds(value = "") {
  const match = value.match(/^P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0);
}

const candidates = new Map();
let searchCalls = 0;
const endExclusive = new Date(new Date(`${end}T00:00:00Z`).getTime() + 86400000);
const windows = [];
if (windowDays > 0) {
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor < endExclusive;) {
    const windowStart = new Date(cursor);
    cursor = new Date(Math.min(cursor.getTime() + windowDays * 86400000, endExclusive.getTime()));
    windows.push({ after: windowStart.toISOString(), before: cursor.toISOString() });
  }
} else {
  windows.push({ after: `${start}T00:00:00Z`, before: endExclusive.toISOString() });
}
for (const query of searchQueries) {
  for (const window of windows) {
    let pageToken = "";
    for (let page = 0; page < maxPages; page += 1) {
      const result = await api("search", {
      part: "snippet",
      q: query,
      type: "video",
      order: "date",
      maxResults: "50",
      regionCode: "KR",
      relevanceLanguage: "ko",
      publishedAfter: window.after,
      publishedBefore: window.before,
      ...(pageToken ? { pageToken } : {}),
    });
      searchCalls += 1;
      for (const item of result.items || []) {
        const id = item.id?.videoId;
        if (id) candidates.set(id, { query, searchSnippet: item.snippet });
      }
      pageToken = result.nextPageToken || "";
      if (!pageToken) break;
    }
  }
  console.error(`${query}: ${candidates.size} unique candidates`);
}
for (const id of includeIds) candidates.set(id, { query: "explicit video ID" });

const details = [];
for (const ids of batches([...candidates.keys()])) {
  const result = await api("videos", { part: "snippet,contentDetails,statistics,status", id: ids.join(","), maxResults: "50" });
  details.push(...(result.items || []));
}
const channelIds = [...new Set(details.map((item) => item.snippet?.channelId).filter(Boolean))];
const channels = new Map();
for (const ids of batches(channelIds)) {
  const result = await api("channels", { part: "snippet,statistics", id: ids.join(","), maxResults: "50" });
  for (const item of result.items || []) channels.set(item.id, item);
}

const rows = details.flatMap((item) => {
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const channel = channels.get(snippet.channelId) || {};
  const text = [snippet.title, snippet.description, ...(snippet.tags || []), snippet.channelTitle].join(" ");
  const date = String(snippet.publishedAt || "").slice(0, 10);
  const koreanEvidence = korean.test(`${snippet.title || ""} ${snippet.channelTitle || ""}`) || /^ko(?:-|$)/i.test(snippet.defaultLanguage || snippet.defaultAudioLanguage || "");
  if (date < start || date > end || !related.test(text) || !koreanEvidence || aiUse.test(text)) return [];
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
    sources: `YouTube Data API v3 search.list / ${candidates.get(item.id)?.query || ""}`,
  }];
}).sort((a, b) => b.date.localeCompare(a.date) || b.viewCount - a.viewCount);

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ meta: { collectedAt: new Date().toISOString(), start, end, searchCalls, candidateCount: candidates.size, resultCount: rows.length }, rows }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, searchCalls, candidates: candidates.size, rows: rows.length }));
