#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const env = {
  baseUrl: String(process.env.KURO_BASE_URL || "https://ai-gateway.kurogames.com").replace(/\/$/, ""),
  apiKey: process.env.KURO_API_KEY || "",
  appId: process.env.FEISHU_APP_ID || "",
  appSecret: process.env.FEISHU_APP_SECRET || "",
  spreadsheetToken: process.env.FEISHU_SPREADSHEET_TOKEN || "V9C1sSLU4hOweEtvDRdcBnENnMh",
  sheetId: process.env.FEISHU_AD_SHEET_ID || "0GfgFb",
  range: process.env.FEISHU_AD_RANGE || "B:K",
  dataUrl: process.env.AD_TASK_DATA_URL || "https://raw.githubusercontent.com/krksw96/wuthering-waves-kol-dashboard/main/data/ad-task-video-ids.json",
};

const apiKeyHeaders = () => env.apiKey ? { "X-API-Key": env.apiKey } : {};
const youtubeIdFrom = (value) => {
  const text = String(value ?? "").trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  return text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/))([\w-]{11})/i)?.[1] || "";
};

async function loadSheetRows() {
  if (env.appId && env.appSecret) {
    const tokenResponse = await fetch(`${env.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", ...apiKeyHeaders() },
      body: JSON.stringify({ app_id: env.appId, app_secret: env.appSecret }),
    });
    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || tokenPayload.code !== 0 || !tokenPayload.tenant_access_token) {
      throw new Error(`Feishu token request failed (${tokenResponse.status}/${tokenPayload.code ?? "unknown"})`);
    }
    const valueRange = encodeURIComponent(`${env.sheetId}!${env.range}`);
    const response = await fetch(`${env.baseUrl}/open-apis/sheets/v2/spreadsheets/${env.spreadsheetToken}/values/${valueRange}`, {
      headers: { Authorization: `Bearer ${tokenPayload.tenant_access_token}`, ...apiKeyHeaders() },
    });
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) throw new Error(`Feishu values request failed (${response.status}/${payload.code ?? "unknown"})`);
    const values = payload?.data?.valueRange?.values || payload?.data?.values || payload?.values || [];
    return values.slice(2).map((row) => ({
      youtubeId: youtubeIdFrom(row[5]) || youtubeIdFrom(row[0]),
      link: String(row[5] || "").trim(),
      channelTitle: String(row[7] || "").trim(),
      title: String(row[9] || "").trim(),
    })).filter((row) => row.youtubeId);
  }
  const url = new URL(env.dataUrl);
  url.searchParams.set("v", Date.now().toString());
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Advertising-task data request failed (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.rows)) throw new Error("Advertising-task data has no rows array");
  return payload.rows.map((row) => ({ ...row, youtubeId: youtubeIdFrom(row.link) || youtubeIdFrom(row.youtubeId) })).filter((row) => row.youtubeId);
}

const sheetRows = await loadSheetRows();

const uniqueRows = [...new Map(sheetRows.map((row) => [row.youtubeId, row])).values()];
if (!uniqueRows.length) throw new Error("Advertising-task sheet returned no YouTube video IDs");

const adFile = resolve("data/ad-videos.json");
const currentAds = JSON.parse(await readFile(adFile, "utf8").catch(() => '{"rows":[]}'));
const currentById = new Map((currentAds.rows || []).map((row) => [row.youtubeId, row]));
const rows = uniqueRows.map((row) => ({
  ...currentById.get(row.youtubeId),
  ...row,
  link: row.link || currentById.get(row.youtubeId)?.link || `https://www.youtube.com/watch?v=${row.youtubeId}`,
  sources: `Feishu advertising task sheet ${env.sheetId}`,
}));
const now = new Date().toISOString();
await writeFile(adFile, `${JSON.stringify({
  meta: { syncedAt: now, spreadsheetToken: env.spreadsheetToken, sheetId: env.sheetId, resultCount: rows.length },
  rows,
}, null, 2)}\n`, "utf8");

globalThis.window = {};
const videosFile = resolve("data/videos.js");
await import(`${pathToFileURL(videosFile).href}?v=${Date.now()}`);
const payload = window.VOD_DATA;
const adIds = new Set(rows.map((row) => row.youtubeId));
let changed = 0;
for (const video of payload.videos) {
  const isAdTask = adIds.has(video.id);
  if (video.isAdTask !== isAdTask) changed += 1;
  video.isAdTask = isAdTask;
}
payload.generatedAt = now;
await writeFile(videosFile, `window.VOD_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");

console.log(JSON.stringify({ sheetRows: sheetRows.length, adTaskIds: adIds.size, dashboardVideos: payload.videos.length, changed }));
