#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const source = JSON.parse(await readFile(resolve("../data/youtube_myeongjo_ads.json"), "utf8"));
const ids = new Set(["Kr9AIiI4IPw", "FGm9_9sJg2I", "Av081yF_H_g"]);
const rows = source.rows.filter((row) => ids.has(row.youtubeId));
if (rows.length !== ids.size) throw new Error(`Expected ${ids.size} ad tasks, found ${rows.length}`);
await writeFile(resolve("data/ad-videos.json"), `${JSON.stringify({
  meta: { start: "2026-05-28", end: "2026-07-13", resultCount: rows.length },
  rows,
}, null, 2)}\n`);
console.log(`Built ${rows.length} ad task videos`);
