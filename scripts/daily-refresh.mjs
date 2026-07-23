#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const timeZone = "Asia/Shanghai";
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
const endNoon = new Date(`${end}T12:00:00+08:00`);
const start = isoDate(new Date(endNoon.getTime() - 86400000));
const compactEnd = end.replaceAll("-", "");
const updateFile = `data/youtube-update-${start}_${end}.json`;

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
    child.on("error", reject);
  });
}

await run("scripts/collect-youtube-data-api.mjs", [
  `--start=${start}`,
  `--end=${end}`,
  "--maxPages=2",
  `--output=${updateFile}`,
]);
await run("scripts/apply-youtube-update.mjs", [updateFile]);

const videosSource = await readFile("data/videos.js", "utf8");
const total = Number(videosSource.match(/"videos": \[/) ? (videosSource.match(/\n      "id": /g) || []).length : 0);
if (!total) throw new Error("Could not determine refreshed video count");
const html = await readFile("index.html", "utf8");
const refreshedHtml = html.replace(/data\/videos\.js\?v=[^"]+/, `data/videos.js?v=refresh-${compactEnd}-${total}`);
await writeFile("index.html", refreshedHtml, "utf8");
console.log(JSON.stringify({ timeZone, start, end, total, updateFile }));
