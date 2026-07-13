#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const channels = [
  { name: "러끼", id: "UC_8GOc5dWX2Kpb74_nQ7vSQ" },
  { name: "마레플로스", id: "UCYk95JQsXbgk5Vto4MvRh2g" },
  { name: "델로략국", id: "UCls1Y2LgkPk6t5TMFIKaoBQ" },
  { name: "코렛트", id: "UCvmHDocKuL6MVx1qRgqLV9g" },
  { name: "과로사", id: "UC31ypOxFsuU3Q0OFpQzcQ3g" },
];
const tabs = ["videos", "shorts", "streams"];
const headers = {
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  cookie: "CONSENT=YES+cb.20210328-17-p0.ko+FX+555; SOCS=CAI",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

function pickInitialJson(html, variableName) {
  const markers = [`${variableName} = `, `${variableName}=`];
  let start = -1;
  for (const marker of markers) {
    const index = html.indexOf(marker);
    if (index !== -1) {
      start = index + marker.length;
      break;
    }
  }
  while (start >= 0 && /\s/.test(html[start])) start += 1;
  if (start < 0 || html[start] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  return null;
}

function walk(value, visitor) {
  if (!value || typeof value !== "object") return;
  visitor(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) walk(child, visitor);
}

function textOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((run) => run.text || "").join("");
  return "";
}

function mayOverlapCollectionPeriod(publishedText) {
  const text = textOf(publishedText).trim();
  if (!text) return true;
  if (/초|분|시간|일|주\s*전|스트리밍 중|예정/.test(text)) return true;
  const months = Number.parseInt(text.match(/(\d+)\s*개월\s*전/)?.[1], 10);
  if (Number.isFinite(months)) return months <= 2;
  const years = Number.parseInt(text.match(/(\d+)\s*년\s*전/)?.[1], 10);
  if (Number.isFinite(years)) return false;
  return true;
}

function extractPage(data) {
  const candidates = new Map();
  const continuations = new Set();
  walk(data, (node) => {
    const renderer = node.videoRenderer || node.gridVideoRenderer || node.reelItemRenderer || node.shortsLockupViewModel || node.lockupViewModel;
    if (renderer) {
      const raw = JSON.stringify(renderer);
      const id = renderer.videoId || renderer.contentId || renderer.navigationEndpoint?.reelWatchEndpoint?.videoId || raw.match(/"videoId":"([^"]+)"/)?.[1];
      const publishedText = textOf(renderer.publishedTimeText) || raw.match(/"content":"(\d+\s*(?:초|분|시간|일|주|개월|년)\s*전)"/)?.[1] || "";
      const title = textOf(renderer.title || renderer.headline || renderer.overlayMetadata?.primaryText) || renderer.metadata?.lockupMetadataViewModel?.title?.content || renderer.rendererContext?.accessibilityContext?.label || "";
      if (typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id) && mayOverlapCollectionPeriod(publishedText)) {
        candidates.set(id, { videoId: id, publishedText, title });
      }
    }
    const token = node.continuationCommand?.token;
    if (token) continuations.add(token);
  });
  return { candidates, continuations };
}

async function fetchText(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function collectTab(channel, tab) {
  const url = `https://www.youtube.com/channel/${channel.id}/${tab}?hl=ko&gl=KR`;
  const html = await fetchText(url);
  const data = pickInitialJson(html, "ytInitialData");
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1];
  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
  if (!data || !apiKey || !clientVersion) throw new Error(`YouTube config missing for ${channel.name}/${tab}`);

  const collected = new Map();
  let { candidates, continuations } = extractPage(data);
  candidates.forEach((candidate, id) => collected.set(id, candidate));
  const seen = new Set();

  for (let page = 1; page <= 10; page += 1) {
    const token = [...continuations].find((item) => !seen.has(item));
    if (!token) break;
    seen.add(token);
    const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion, hl: "ko", gl: "KR", visitorData } },
        continuation: token,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) break;
    ({ candidates, continuations } = extractPage(await response.json()));
    candidates.forEach((candidate, id) => collected.set(id, candidate));
  }
  return collected;
}

const records = [];
for (const channel of channels) {
  const channelIds = new Map();
  for (const tab of tabs) {
    try {
      const ids = await collectTab(channel, tab);
      ids.forEach((candidate, id) => channelIds.set(id, candidate));
      console.error(`${channel.name}/${tab}: ${ids.size}`);
    } catch (error) {
      console.error(`${channel.name}/${tab}: ${error.message}`);
    }
  }
  records.push({ ...channel, candidates: [...channelIds.values()] });
}

const output = resolve(process.argv[2] || "../data/youtube_kol_candidates.json");
await writeFile(output, `${JSON.stringify({ collectedAt: new Date().toISOString(), channels: records }, null, 2)}\n`);
console.log(JSON.stringify({ output, total: new Set(records.flatMap((record) => record.candidates.map((candidate) => candidate.videoId))).size }));
