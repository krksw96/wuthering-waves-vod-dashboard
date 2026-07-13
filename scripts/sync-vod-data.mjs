import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const source = resolve(projectRoot, "..", "data", "youtube_myeongjo_2026-07-10_2026-07-13.kr_all_filtered.json");
const output = resolve(projectRoot, "data", "videos.js");
const kocSource = resolve(projectRoot, "data", "koc-list.json");
const kolSource = resolve(projectRoot, "data", "kol-list.json");
const kolVideosSource = resolve(projectRoot, "data", "kol-videos.json");

const input = JSON.parse(await readFile(source, "utf8"));
const kocList = JSON.parse(await readFile(kocSource, "utf8"));
const kolList = JSON.parse(await readFile(kolSource, "utf8"));
const kolVideos = JSON.parse(await readFile(kolVideosSource, "utf8"));
const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const kocAliases = new Map();
for (const koc of kocList) {
  for (const alias of koc.aliases) kocAliases.set(normalizeName(alias), koc.name);
}
const kolAliases = new Map();
for (const kol of kolList) {
  for (const alias of kol.aliases) kolAliases.set(normalizeName(alias), kol.name);
}
const rowsById = new Map();
for (const row of [...input.rows, ...kolVideos.rows]) {
  const existing = rowsById.get(row.youtubeId) || {};
  rowsById.set(row.youtubeId, Object.fromEntries(Object.entries({ ...existing, ...row }).map(([key, value]) => [key, value ?? existing[key] ?? null])));
}
const videos = [...rowsById.values()].map((row) => ({
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
  isKol: kolAliases.has(normalizeName(row.channelTitle)),
  kolName: kolAliases.get(normalizeName(row.channelTitle)) || null,
}));

const payload = {
  generatedAt: new Date().toISOString(),
  period: { start: [input.meta.start, kolVideos.meta.start].sort()[0], end: [input.meta.end, kolVideos.meta.end].sort().at(-1) },
  kocList,
  kolList,
  videos,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `window.VOD_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Synced ${videos.length} videos to ${output}`);
