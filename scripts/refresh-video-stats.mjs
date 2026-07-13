#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.window = {};
await import(`${pathToFileURL(resolve("data/videos.js")).href}?v=${Date.now()}`);
const videos = window.VOD_DATA.videos;
const output = resolve("data/stats-overrides.json");
const headers = {
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  cookie: "CONSENT=YES+cb.20210328-17-p0.ko+FX+555; SOCS=CAI",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

function textOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.simpleText === "string") return value.simpleText;
  if (typeof value.content === "string") return value.content;
  if (Array.isArray(value.runs)) return value.runs.map((run) => run.text || "").join("");
  return "";
}

function parseCount(value) {
  const text = textOf(value).replace(/,/g, "");
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*([천만억KMB])?/i);
  if (!match) return null;
  const multipliers = { "천": 1_000, k: 1_000, "만": 10_000, "억": 100_000_000, m: 1_000_000, b: 1_000_000_000 };
  return Math.round(Number.parseFloat(match[1]) * (multipliers[match[2]?.toLowerCase()] || 1));
}

function walk(value, visitor) {
  if (!value || typeof value !== "object") return;
  visitor(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) walk(child, visitor);
}

const html = await (await fetch("https://www.youtube.com/results?search_query=%EB%AA%85%EC%A1%B0&hl=ko&gl=KR", { headers })).text();
const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
const clientVersion = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1];
const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
if (!apiKey || !clientVersion) throw new Error("YouTube public API configuration not found");
const context = { client: { clientName: "WEB", clientVersion, hl: "ko", gl: "KR", visitorData } };

async function youtubei(endpoint, body) {
  const response = await fetch(`https://www.youtube.com/youtubei/v1/${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ context, ...body }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
  return response.json();
}

function extractLikes(data) {
  let likes = null;
  walk(data, (node) => {
    const entity = node.likeCountEntity;
    if (!entity) return;
    likes ??= parseCount(entity.likeCountIfIndifferentNumber) ?? parseCount(entity.expandedLikeCountIfIndifferent) ?? parseCount(entity.likeButtonA11yText);
  });
  return likes;
}

function firstCommentsToken(data) {
  let token = "";
  walk(data, (node) => {
    if (token || !node.itemSectionRenderer?.header?.commentsHeaderRenderer) return;
    walk(node.itemSectionRenderer, (child) => {
      token ||= child.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || "";
    });
  });
  return token;
}

function commentPage(data) {
  let count = 0;
  let total = null;
  let nextToken = "";
  walk(data, (node) => {
    if (node.commentThreadRenderer) count += 1;
    const header = node.commentsHeaderRenderer;
    if (header) total ??= parseCount(header.countText) ?? parseCount(header.commentsCount) ?? parseCount(header.titleText);
    const continuation = node.continuationItemRenderer;
    if (continuation) {
      const target = continuation.continuationEndpoint?.commandMetadata?.webCommandMetadata?.apiUrl || "";
      if (!nextToken && target.includes("next")) nextToken = continuation.continuationEndpoint?.continuationCommand?.token || "";
    }
  });
  return { count, total, nextToken };
}

async function fetchComments(videoId, nextData) {
  let token = firstCommentsToken(nextData);
  if (!token) return 0;
  let counted = 0;
  const seen = new Set();
  for (let page = 0; token && !seen.has(token) && page < 100; page += 1) {
    seen.add(token);
    const data = await youtubei("next", { continuation: token });
    const result = commentPage(data);
    if (Number.isFinite(result.total)) return result.total;
    counted += result.count;
    token = result.nextToken;
  }
  return counted;
}

const existing = await readFile(output, "utf8").then(JSON.parse).catch(() => ({}));
const stats = { ...existing };
const errors = [];
const limit = Number.parseInt(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1], 10) || videos.length;

for (let offset = 0; offset < Math.min(videos.length, limit); offset += 4) {
  const batch = videos.slice(offset, offset + 4);
  const results = await Promise.all(batch.map(async (video) => {
    try {
      const [updated, next] = await Promise.all([
        youtubei("updated_metadata", { videoId: video.id }),
        youtubei("next", { videoId: video.id }),
      ]);
      return { id: video.id, likes: extractLikes(updated), comments: await fetchComments(video.id, next) };
    } catch (error) {
      return { id: video.id, error: error.message };
    }
  }));
  for (const result of results) {
    if (result.error) errors.push(result);
    else stats[result.id] = { likes: result.likes, comments: result.comments };
  }
  console.error(`Stats ${Math.min(offset + 4, limit)}/${Math.min(videos.length, limit)}`);
}

await writeFile(output, `${JSON.stringify(stats, null, 2)}\n`);
console.log(JSON.stringify({ videos: Object.keys(stats).length, errors: errors.length, output }));
