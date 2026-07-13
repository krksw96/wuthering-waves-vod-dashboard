#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

globalThis.window = {};
await import(`${pathToFileURL(resolve("data/videos.js")).href}?v=${Date.now()}`);
const data = window.VOD_DATA;
const quote = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const headers = ["NO.", "유튜버 이름", "유튜버 구독자 수", "제목", "링크", "형식", "날짜", "조회수", "좋아요 수", "댓글 수", "KOC 여부", "KOC명", "장기협업 KOL 여부", "KOL명", "광고 과업 여부"];
const lines = [headers, ...data.videos
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date) || (b.views || 0) - (a.views || 0))
  .map((video, index) => [
    index + 1,
    video.creator,
    video.subscribers,
    video.title,
    video.url,
    video.format,
    video.date,
    video.views,
    video.likes,
    video.comments,
    video.isKoc ? "KOC" : "非KOC",
    video.kocName,
    video.isKol ? "장기협업 KOL" : "",
    video.kolName,
    video.isAdTask ? "광고 과업" : "",
  ])].map((row) => row.map(quote).join(","));
await writeFile(process.argv[2], `${lines.join("\r\n")}\r\n`, "utf8");
console.log(`Exported ${data.videos.length} rows`);
