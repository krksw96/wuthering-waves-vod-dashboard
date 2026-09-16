#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { classifyWutheringVideo } from "./wuthering-waves-relevance.mjs";

await import("../config/wuthering-waves-search-config.js");
const { baseQueries, characterQueries, relatedQueries, allQueries } = globalThis.WUTHERING_WAVES_SEARCH_CONFIG;
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || true];
}));
const start = String(args.start || "2026-05-28");
const end = String(args.end || "2026-07-13");
const maxPages = Math.max(1, Math.min(Number.parseInt(args.maxPages || "5", 10), 5));
const maxSearchCalls = Math.max(0, Number.parseInt(args.maxSearchCalls ?? "100", 10));
const noSearch = args.noSearch === true || args.noSearch === "true";
const windowDays = Number.parseInt(args.windowDays || "0", 10);
const requestedQueries = String(args.queries || "").split("|").map((query) => query.trim()).filter(Boolean);
const selectedQueries = requestedQueries.length ? requestedQueries : (args.coreQueries ? baseQueries.slice(0, 4) : allQueries);
const searchQueries = selectedQueries.map((query) => ({
  query,
  pages: requestedQueries.length || args.coreQueries || !(characterQueries.includes(query) || relatedQueries.includes(query)) ? maxPages : Math.min(maxPages, 1),
}));
const includeIds = String(args.includeIds || "").split(",").map((id) => id.trim()).filter(Boolean);
if (args.includeIdsFile) {
  const input = JSON.parse(await readFile(resolve(String(args.includeIdsFile)), "utf8"));
  includeIds.push(...(Array.isArray(input) ? input : input.ids || input.videoIds || []).map((entry) => typeof entry === "string" ? entry : entry.youtubeId || entry.id).filter(Boolean));
}
const output = resolve(String(args.output || "../data/youtube_data_api_audit.json"));
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

const publishedDateInKorea = (value) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

async function api(resource, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (resource === "search") {
        if (searchCalls >= maxSearchCalls) {
          const error = new Error("Search call budget reached before retry");
          error.reason = "searchCallBudgetExceeded";
          error.retryable = false;
          throw error;
        }
        searchCalls += 1;
      } else if (resource === "videos") videosListCalls += 1;
      else if (resource === "channels") channelsListCalls += 1;
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const body = await response.json();
      if (response.ok) return body;
      const error = new Error(`${resource}: ${body.error?.message || response.status}`);
      error.reason = body.error?.errors?.[0]?.reason;
      error.retryable = response.status === 429 || response.status >= 500;
      throw error;
    } catch (error) {
      if (error.retryable === false || attempt === 2) throw error;
      await new Promise((done) => setTimeout(done, 500 * 2 ** attempt));
    }
  }
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
let videosListCalls = 0;
let channelsListCalls = 0;
const cappedQueries = [];
let searchQuotaExhausted = false;
const rangeStart = new Date(`${start}T00:00:00+09:00`);
const endExclusive = new Date(new Date(`${end}T00:00:00+09:00`).getTime() + 86400000);
const windows = [];
if (windowDays > 0) {
  for (let cursor = new Date(rangeStart); cursor < endExclusive;) {
    const windowStart = new Date(cursor);
    cursor = new Date(Math.min(cursor.getTime() + windowDays * 86400000, endExclusive.getTime()));
    windows.push({ after: windowStart.toISOString(), before: cursor.toISOString() });
  }
} else {
  windows.push({ after: rangeStart.toISOString(), before: endExclusive.toISOString() });
}
for (const { query, pages } of noSearch ? [] : searchQueries) {
  for (const window of windows) {
    let pageToken = "";
    for (let page = 0; page < pages; page += 1) {
      if (searchQuotaExhausted || searchCalls >= maxSearchCalls) {
        cappedQueries.push({ query, ...window, page, nextPageToken: pageToken, reason: searchQuotaExhausted ? "search-quota-exhausted" : "search-call-budget" });
        break;
      }
      let result;
      try {
        result = await api("search", {
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
      } catch (error) {
        if (!["quotaExceeded", "dailyLimitExceeded", "searchCallBudgetExceeded"].includes(error.reason)) throw error;
        searchQuotaExhausted = error.reason !== "searchCallBudgetExceeded";
        cappedQueries.push({ query, ...window, page, nextPageToken: pageToken, reason: searchQuotaExhausted ? "search-quota-exhausted" : "search-call-budget" });
        console.error("Search quota or configured budget reached; retaining discovered candidates and continuing metadata/playlist reconciliation.");
        break;
      }
      for (const item of result.items || []) {
        const id = item.id?.videoId;
        if (id) {
          const existing = candidates.get(id) || { queries: new Set(), searchSnippet: item.snippet };
          existing.queries.add(query);
          candidates.set(id, existing);
        }
      }
      pageToken = result.nextPageToken || "";
      if (!pageToken) break;
      if (page === pages - 1) cappedQueries.push({ query, ...window, page: page + 1, nextPageToken: pageToken, reason: "page-limit" });
    }
  }
  console.error(`${query}: ${candidates.size} unique candidates`);
}
for (const id of includeIds) candidates.set(id, { queries: new Set(["explicit video ID"]) });

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
  const date = publishedDateInKorea(snippet.publishedAt);
  const decision = classifyWutheringVideo(item, { explicit: includeIds.includes(item.id) });
  if (date < start || date > end || !decision.accepted) return [];
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
    explicitlyIncluded: includeIds.includes(item.id),
    gameTitle: "",
    sources: `YouTube Data API v3 search.list / ${[...(candidates.get(item.id)?.queries || [])].join(", ")}`,
  }];
}).sort((a, b) => b.date.localeCompare(a.date) || b.viewCount - a.viewCount);

await mkdir(dirname(output), { recursive: true });
const generalCalls = videosListCalls + channelsListCalls;
await writeFile(output, `${JSON.stringify({ meta: { collectedAt: new Date().toISOString(), start, end, searchCalls, maxSearchCalls, searchQuotaExhausted, videosListCalls, channelsListCalls, generalCalls, candidateCount: candidates.size, resultCount: rows.length, cappedQueries, searchCoverageComplete: !cappedQueries.length }, rows }, null, 2)}\n`, "utf8");
if (cappedQueries.length) console.error(`Search coverage warning: ${cappedQueries.length} query windows reached a page or call limit; uploads reconciliation is required.`);
console.log(JSON.stringify({ output, searchCalls, videosListCalls, channelsListCalls, generalCalls, candidates: candidates.size, rows: rows.length }));
