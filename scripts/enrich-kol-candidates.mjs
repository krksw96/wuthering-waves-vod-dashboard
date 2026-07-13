#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve(process.argv[2] || "../data/youtube_kol_candidates.json");
const output = resolve(process.argv[3] || "../data/youtube_kol_official_enriched.json");
const includeAll = process.argv.includes("--all");
const payload = JSON.parse((await readFile(source, "utf8")).replace(/^\uFEFF/, ""));
const headers = {
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  cookie: "CONSENT=YES+cb.20210328-17-p0.ko+FX+555; SOCS=CAI",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

function clean(value) {
  if (!value) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value.simpleText === "string") return clean(value.simpleText);
  if (Array.isArray(value.runs)) return clean(value.runs.map((run) => run.text || "").join(""));
  if (typeof value.content === "string") return clean(value.content);
  return "";
}

function parseCount(value) {
  const text = clean(value).replace(/,/g, "");
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

function extractStats(value) {
  const stats = { likes: null, comments: null, subscribers: null };
  walk(value, (node) => {
    if (node.likeCountEntity) stats.likes ??= parseCount(node.likeCountEntity.likeCountIfIndifferentNumber || node.likeCountEntity.expandedLikeCountIfIndifferent);
    const commentText = clean(node.commentsHeaderRenderer?.countText || node.commentCountEntity?.commentCount);
    if (commentText) stats.comments ??= parseCount(commentText);
    const subscriberText = clean(node.videoOwnerRenderer?.subscriberCountText || node.subscriberCountText);
    if (subscriberText) stats.subscribers ??= parseCount(subscriberText);
  });
  return stats;
}

function extractGameTitle(value) {
  let gameTitle = "";
  walk(value, (node) => {
    if (gameTitle || typeof node.title !== "string") return;
    if (/^(?:명조(?::\s*워더링\s*웨이브)?|워더링\s*웨이브|wuthering\s*waves)$/i.test(node.title.trim())) {
      gameTitle = node.title.trim();
    }
  });
  return gameTitle;
}

const configHtml = await (await fetch("https://www.youtube.com/results?search_query=%EB%AA%85%EC%A1%B0&hl=ko&gl=KR", { headers })).text();
const apiKey = configHtml.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
const clientVersion = configHtml.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1];
const visitorData = configHtml.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
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

const relevant = payload.channels.flatMap((channel) => (channel.candidates || channel.videoIds.map((videoId) => ({ videoId, title: "" })))
  .filter((candidate) => includeAll || !channel.candidates || /명조|워더링|wuthering\s*waves|wuwa|鳴潮/i.test(candidate.title))
  .map((candidate) => ({ ...candidate, kolName: channel.name, expectedChannelId: channel.id })));
const rows = [];
const errors = [];

async function enrichCandidate(candidate) {
  try {
    const player = await youtubei("player", { videoId: candidate.videoId });
    const details = player.videoDetails || {};
    const micro = player.microformat?.playerMicroformatRenderer || {};
    const channelId = details.channelId || "";
    if (channelId !== candidate.expectedChannelId) return null;
    const date = String(micro.publishDate || micro.uploadDate || "").slice(0, 10);
    if (date < "2026-05-28" || date > "2026-07-13") return null;
    const title = clean(details.title || candidate.title);
    const description = clean(details.shortDescription || micro.description);
    if (/\b(?:ai|suno|udio|chatgpt)\b|인공지능|생성형/i.test(`${title} ${description}`)) return null;
    if (/광고|협찬|유료\s*프로모션|paid\s*promotion|sponsored/i.test(`${title} ${description}`)) return null;

    let next = {};
    let updated = {};
    try { next = await youtubei("next", { videoId: candidate.videoId }); } catch {}
    try { updated = await youtubei("updated_metadata", { videoId: candidate.videoId }); } catch {}
    const gameTitle = extractGameTitle(next);
    const isMyeongjo = /명조|워더링|wuthering\s*waves|wuwa|鳴潮/i.test(`${title} ${description}`) || Boolean(gameTitle);
    if (!isMyeongjo) return null;
    const stats = { ...extractStats(next), ...Object.fromEntries(Object.entries(extractStats(updated)).filter(([, value]) => value != null)) };
    const seconds = Number.parseInt(details.lengthSeconds, 10) || null;
    let format = "VOD";
    if (seconds && seconds <= 180) {
      const shorts = await fetch(`https://www.youtube.com/shorts/${candidate.videoId}?hl=ko&gl=KR`, { headers, redirect: "manual" });
      if (shorts.ok) format = "Shorts";
    }
    const row = {
      title,
      link: `https://www.youtube.com/watch?v=${candidate.videoId}`,
      shortsLink: `https://www.youtube.com/shorts/${candidate.videoId}`,
      youtubeId: candidate.videoId,
      channelTitle: clean(details.author),
      channelId,
      subscriberCount: stats.subscribers,
      date,
      viewCount: parseCount(details.viewCount),
      likeCount: stats.likes,
      commentCount: stats.comments,
      durationSeconds: seconds,
      format,
      description,
      gameTitle,
      sources: `official KOL channel / ${candidate.kolName}`,
    };
    console.error(`${candidate.kolName} ${date} ${format} ${title}`);
    return row;
  } catch (error) {
    errors.push({ videoId: candidate.videoId, message: error.message });
    return null;
  }
}

for (let offset = 0; offset < relevant.length; offset += 6) {
  const batch = await Promise.all(relevant.slice(offset, offset + 6).map(enrichCandidate));
  rows.push(...batch.filter(Boolean));
  if (offset % 60 === 0) console.error(`Processed ${Math.min(offset + 6, relevant.length)}/${relevant.length}`);
}

await writeFile(output, `${JSON.stringify({ meta: { start: "2026-05-28", end: "2026-07-13", resultCount: rows.length, errors }, rows }, null, 2)}\n`);
console.log(JSON.stringify({ output, rows: rows.length, errors: errors.length }));
