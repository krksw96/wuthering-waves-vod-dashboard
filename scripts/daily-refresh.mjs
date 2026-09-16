#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { readGameDataset } from "./game-dataset.mjs";
import { buildDailyRefreshPlan } from "./daily-refresh-plan.mjs";

const timeZone = "Asia/Seoul";
const dateParts = (date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(date).map((part) => [part.type, part.value]));
const isoDate = (date) => {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const end = process.env.TARGET_DATE || isoDate(new Date());
const current = await readGameDataset("wuthering-waves");
const plan = buildDailyRefreshPlan(current, end);
const compactEnd = end.replaceAll("-", "");
const updateFile = `data/youtube-update-${plan.uploadsStart}_${end}.json`;
const channelsFile = "data/wuthering-waves-channels.json";
const registry = JSON.parse(await readFile(channelsFile, "utf8"));
if (!Array.isArray(registry.channels) || !registry.channels.length) throw new Error("Known-channel registry is missing or empty");
console.log(JSON.stringify({ timeZone, ...plan, knownChannels: registry.channels.length, updateFile }));

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
    child.on("error", reject);
  });
}

await run("scripts/collect-youtube-data-api.mjs", [
  `--start=${plan.searchStart}`,
  `--end=${end}`,
  "--maxPages=2",
  "--windowDays=2",
  `--maxSearchCalls=${plan.maxSearchCalls}`,
  `--output=${updateFile}`,
]);
await run("scripts/expand-backfill-from-channels.mjs", [
  updateFile,
  `--channelsFile=${channelsFile}`,
  `--start=${plan.uploadsStart}`,
  `--end=${end}`,
  `--output=${updateFile}`,
  `--maxPlaylistPages=${plan.maxPlaylistPages}`,
]);
const collected = JSON.parse(await readFile(updateFile, "utf8"));
const coverageWarnings = [];
if (collected.meta.cappedChannelCount > 0) {
  coverageWarnings.push(`${collected.meta.cappedChannelCount} channel uploads reached the ${plan.maxPlaylistPages}-page limit; inspect cappedChannelIds in ${updateFile}`);
}
if (collected.meta.cappedQueries?.length) {
  coverageWarnings.push(`${collected.meta.cappedQueries.length} search windows reached a page or call limit; inspect cappedQueries in ${updateFile}`);
}
if (collected.meta.searchQuotaExhausted) {
  coverageWarnings.push("YouTube search quota was exhausted; known-channel uploads reconciliation still ran");
}
if (collected.meta.failedChannels?.length || collected.meta.failedChannelIds?.length) {
  const count = collected.meta.failedChannels?.length || collected.meta.failedChannelIds.length;
  coverageWarnings.push(`${count} channel uploads playlists were unavailable; inspect failedChannels in ${updateFile}`);
}
if (collected.meta.channelsWithoutUploads?.length) {
  coverageWarnings.push(`${collected.meta.channelsWithoutUploads.length} registered channels returned no uploads playlist; inspect channelsWithoutUploads in ${updateFile}`);
}
for (const warning of coverageWarnings) console.warn(`::warning::${warning}`);
collected.meta.dailyCoverage = { ...plan, knownChannels: registry.channels.length, warnings: coverageWarnings };
await writeFile(updateFile, `${JSON.stringify(collected, null, 2)}\n`, "utf8");
await run("scripts/sync-ad-task-tags.mjs", []);
await run("scripts/apply-youtube-update.mjs", [updateFile]);

const videosSource = await readFile("data/wuthering-waves.js", "utf8");
const total = Number(videosSource.match(/"videos": \[/) ? (videosSource.match(/\n      "id": /g) || []).length : 0);
if (!total) throw new Error("Could not determine refreshed video count");
const html = await readFile("dashboard.html", "utf8");
const refreshedHtml = html.replace(/data\/wuthering-waves\.js\?v=[^"]+/, `data/wuthering-waves.js?v=refresh-${compactEnd}-${total}`);
await writeFile("dashboard.html", refreshedHtml, "utf8");
console.log(JSON.stringify({ timeZone, ...plan, total, updateFile, coverageWarnings }));
