#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import vm from "node:vm";
import { resolve } from "node:path";
import { classifyWutheringVideo } from "./wuthering-waves-relevance.mjs";
import { readGameDataset, writeGameDataset } from "./game-dataset.mjs";

const targetFiles = [
  "2025-01-01_2025-01-31", "2025-02-01_2025-02-28", "2025-03-01_2025-03-31",
  "2025-04-01_2025-04-30", "2025-05-01_2025-05-31", "2025-06-01_2025-06-30",
  "2025-07-01_2025-07-31", "2025-08-01_2025-08-31", "2025-09-01_2025-09-30",
  "2025-10-01_2025-10-31", "2025-11-01_2025-11-30", "2025-12-01_2025-12-31",
  "2026-01-01_2026-01-31", "2026-02-01_2026-02-28",
];
// The title/description classifier must not remove this WuWa cosplay video;
// its metadata contains no AI-use or AI-generation disclosure.
const preservedAmbiguousIds = new Set(["1rAhpvqg5nI"]);
const execFileAsync = promisify(execFile);
const originalSource = await execFileAsync("git", ["show", "HEAD:data/wuthering-waves.js"], { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 });
const originalContext = { window: {} };
vm.runInNewContext(originalSource.stdout, originalContext);
const originalDataset = originalContext.window.GAME_DATA["wuthering-waves"];
const preservedOriginalVideo = originalDataset.videos.find((video) => preservedAmbiguousIds.has(video.id));
if (!preservedOriginalVideo) throw new Error("Preserved original video was not found");
const preservedRow = {
  title: preservedOriginalVideo.title,
  link: preservedOriginalVideo.url,
  shortsLink: `https://www.youtube.com/shorts/${preservedOriginalVideo.id}`,
  youtubeId: preservedOriginalVideo.id,
  channelTitle: preservedOriginalVideo.creator,
  channelId: preservedOriginalVideo.channelId,
  subscriberCount: preservedOriginalVideo.subscribers,
  date: preservedOriginalVideo.date,
  viewCount: preservedOriginalVideo.views,
  likeCount: preservedOriginalVideo.likes,
  commentCount: preservedOriginalVideo.comments,
  durationSeconds: preservedOriginalVideo.duration,
  format: preservedOriginalVideo.format,
  description: "Wuthering Waves cosplay metadata; no AI-use disclosure.",
  sources: "historical audit restoration",
  relevanceReason: "manual-audit-preserved",
};

const decisions = new Map();
const audit = { months: [], removedAi: 0, removedCollision: 0, removedOfficial: 0 };

for (const stem of targetFiles) {
  const file = resolve(`data/youtube-update-${stem}-final.json`);
  const data = JSON.parse(await readFile(file, "utf8"));
  let restoredPreservedRow = false;
  if (stem === "2025-09-01_2025-09-30" && !data.rows.some((row) => row.youtubeId === preservedRow.youtubeId)) {
    data.rows.push(preservedRow);
    data.rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.viewCount ?? 0) - (a.viewCount ?? 0));
    data.meta.filteredAiRows = Math.max(0, Number(data.meta?.filteredAiRows || 0) - 1);
    if (data.meta?.rejectedReasons?.["disclosed-ai-use"]) {
      data.meta.rejectedReasons["disclosed-ai-use"] -= 1;
      if (data.meta.rejectedReasons["disclosed-ai-use"] <= 0) delete data.meta.rejectedReasons["disclosed-ai-use"];
    }
    restoredPreservedRow = true;
  }
  const removed = { ai: 0, collision: 0, official: 0 };
  const rows = data.rows.filter((row) => {
    if (preservedAmbiguousIds.has(row.youtubeId)) return true;
    const decision = classifyWutheringVideo(row, { knownChannel: true });
    const shouldRemove = decision.reason === "disclosed-ai-use"
      || decision.reason.startsWith("cross-game")
      || decision.reason === "official-channel";
    if (!shouldRemove) return true;
    decisions.set(row.youtubeId, decision.reason);
    if (decision.reason === "disclosed-ai-use") removed.ai += 1;
    else if (decision.reason.startsWith("cross-game")) removed.collision += 1;
    else removed.official += 1;
    return false;
  });
  if (rows.length !== data.rows.length || restoredPreservedRow) {
    const rejectedReasons = { ...(data.meta?.rejectedReasons || {}) };
    for (const [reason, count] of Object.entries({
      "disclosed-ai-use": removed.ai,
      "cross-game-collision": removed.collision,
      "official-channel": removed.official,
    })) rejectedReasons[reason] = (rejectedReasons[reason] || 0) + count;
    data.meta = {
      ...data.meta,
      resultCount: rows.length,
      filteredAiRows: Number(data.meta?.filteredAiRows || 0) + removed.ai,
      filteredCollisionRows: Number(data.meta?.filteredCollisionRows || 0) + removed.collision,
      rejectedReasons,
      lastAuditedAt: new Date().toISOString(),
    };
    data.rows = rows;
    await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
  audit.months.push({ stem, before: data.rows.length + removed.ai + removed.collision + removed.official, after: rows.length, ...removed });
  audit.removedAi += removed.ai;
  audit.removedCollision += removed.collision;
  audit.removedOfficial += removed.official;
}

const current = await readGameDataset("wuthering-waves");
const currentVideos = current.videos.some((video) => video.id === preservedOriginalVideo.id)
  ? current.videos
  : [...current.videos, preservedOriginalVideo];
const videos = currentVideos.filter((video) => !decisions.has(video.id));
if (current.videos.length !== videos.length) {
  await writeGameDataset("wuthering-waves", { ...current, generatedAt: new Date().toISOString(), videos });
}

const dashboardFile = resolve("dashboard.html");
const html = await readFile(dashboardFile, "utf8");
const cacheKey = `refresh-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${videos.length}`;
const refreshedHtml = html.replace(/data\/wuthering-waves\.js\?v=[^"]+/g, `data/wuthering-waves.js?v=${cacheKey}`);
if (refreshedHtml !== html) await writeFile(dashboardFile, refreshedHtml, "utf8");
else if (!html.includes(`data/wuthering-waves.js?v=${cacheKey}`)) throw new Error("Dashboard cache key was not found");

console.log(JSON.stringify({ ...audit, dashboardBefore: current.videos.length, dashboardAfter: videos.length, cacheKey }, null, 2));
