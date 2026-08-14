#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readGameDataset, writeGameDataset } from "./game-dataset.mjs";

const source = resolve(process.argv[2] || "data/neverness-youtube-update-2026-08-01_2026-08-14.json");
const current = await readGameDataset("neverness-to-everness");
const update = JSON.parse(await readFile(source, "utf8"));
const byId = new Map(current.videos.map((video) => [video.id, video]));

for (const row of update.rows) {
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
    isKoc: false,
    isKol: false,
    isAdTask: false,
    searchKeyword: row.searchKeyword || "",
  });
}

const videos = [...byId.values()]
  .filter((video) => video.date >= update.meta.start && video.date <= update.meta.end)
  .sort((a, b) => b.date.localeCompare(a.date) || b.views - a.views);
const payload = {
  ...current,
  generatedAt: new Date().toISOString(),
  period: { start: update.meta.start, end: update.meta.end },
  videos,
};

await writeGameDataset("neverness-to-everness", payload);
console.log(JSON.stringify({ previous: current.videos.length, updateRows: update.rows.length, total: videos.length }));
