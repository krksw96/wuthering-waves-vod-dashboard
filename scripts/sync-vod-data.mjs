import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const source = resolve(projectRoot, "..", "data", "youtube_myeongjo_2026-07-10_2026-07-13.kr_all_filtered.json");
const output = resolve(projectRoot, "data", "videos.js");
const kocSource = resolve(projectRoot, "data", "koc-list.json");

const input = JSON.parse(await readFile(source, "utf8"));
const kocList = JSON.parse(await readFile(kocSource, "utf8"));
const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const kocAliases = new Map();
for (const koc of kocList) {
  for (const alias of koc.aliases) kocAliases.set(normalizeName(alias), koc.name);
}
const videos = input.rows.map((row) => ({
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
  isKoc: kocAliases.has(normalizeName(row.channelTitle)),
  kocName: kocAliases.get(normalizeName(row.channelTitle)) || null,
}));

const payload = {
  generatedAt: new Date().toISOString(),
  period: { start: input.meta.start, end: input.meta.end },
  kocList,
  videos,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `window.VOD_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Synced ${videos.length} videos to ${output}`);
