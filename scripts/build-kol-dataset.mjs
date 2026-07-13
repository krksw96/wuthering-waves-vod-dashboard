#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const broad = JSON.parse(await readFile(resolve("../data/youtube_kol_2026-05-28_2026-07-13.json"), "utf8"));
const channelSearch = JSON.parse(await readFile(resolve("../data/youtube_kol_channel_search_enriched.json"), "utf8"));
const output = resolve("data/kol-videos.json");
const channelMap = new Map([
  ["UCYk95JQsXbgk5Vto4MvRh2g", "마레플로스"],
  ["UCOg7d0qVUnr2URJeWSgfQFA", "마레플로스"],
  ["UC31ypOxFsuU3Q0OFpQzcQ3g", "과로사"],
  ["UCls1Y2LgkPk6t5TMFIKaoBQ", "델로략국"],
  ["UCvmHDocKuL6MVx1qRgqLV9g", "코렛트"],
  ["UC_8GOc5dWX2Kpb74_nQ7vSQ", "러끼"],
]);
const explicitRelatedIds = new Set(["I7nIxc3SU4U"]);
const isRelated = (row) => /명조|워더링|wuthering\s*waves|wuwa|鳴潮/i.test(`${row.title || ""} ${row.description || ""}`) || explicitRelatedIds.has(row.youtubeId);

const rowsById = new Map();
for (const row of broad.rows) {
  if (channelMap.has(row.channelId)) rowsById.set(row.youtubeId, row);
}
for (const row of channelSearch.rows) {
  if (channelMap.has(row.channelId) && isRelated(row)) rowsById.set(row.youtubeId, row);
}

const rows = [...rowsById.values()]
  .filter((row) => row.date >= "2026-05-28" && row.date <= "2026-07-13")
  .map((row) => ({ ...row, kolName: channelMap.get(row.channelId) }))
  .sort((a, b) => b.date.localeCompare(a.date) || (b.viewCount || 0) - (a.viewCount || 0));

await writeFile(output, `${JSON.stringify({
  meta: { start: "2026-05-28", end: "2026-07-13", resultCount: rows.length },
  rows,
}, null, 2)}\n`);
console.log(`Built ${rows.length} KOL videos at ${output}`);
