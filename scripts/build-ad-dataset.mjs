#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = JSON.parse(await readFile(resolve("../data/youtube_myeongjo_ads.json"), "utf8"));
const ids = new Set(["FGm9_9sJg2I", "Av081yF_H_g"]);
const rows = source.rows.filter((row) => ids.has(row.youtubeId));
if (rows.length !== ids.size) throw new Error(`Expected ${ids.size} ad tasks, found ${rows.length}`);
const organicIds = new Set(["Kr9AIiI4IPw"]);
const organicRows = source.rows.filter((row) => organicIds.has(row.youtubeId));
if (organicRows.length !== organicIds.size) throw new Error(`Expected ${organicIds.size} supplemental videos, found ${organicRows.length}`);
await writeFile(resolve("data/ad-videos.json"), `${JSON.stringify({
  meta: { start: "2026-05-28", end: "2026-07-13", resultCount: rows.length },
  rows,
}, null, 2)}\n`);
await writeFile(resolve("data/supplemental-videos.json"), `${JSON.stringify({
  meta: { start: "2026-05-28", end: "2026-07-13", resultCount: organicRows.length },
  rows: organicRows,
}, null, 2)}\n`);
console.log(`Built ${rows.length} ad task videos`);
