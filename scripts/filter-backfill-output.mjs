#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const source = resolve(process.argv[2] || "data/youtube-update-expanded.json");
const output = resolve(process.argv[3] || "data/youtube-update-final.json");
const data = JSON.parse(await readFile(source, "utf8"));

const related = /명조|워더링\s*웨이브|wuthering\s*waves|\bwuwa\b|鳴潮/i;
const wutheringTitleTerms = /히유키|카멜탈|데니아|에데치|에이메스|플로로|치사|시그리카|루실라|카르티시아|장리|앙코|파수인|카멜리아|금희|젠니|카를로타|모니에|니보라|방랑자|라하이로이|잔성|공명자|종말\s*매트릭스|hiyuki|cartethyia|denia|aemeath|chisa|sigrika|camellya|shorekeeper|phrolova|zani|carlotta|mornye/i;
const aiNamedTool = /\b(?:suno|udio|chatgpt|rvc|tts)\b|인공지능|생성형\s*ai/i;
const aiInTitle = /(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$)/i;
const aiDisclosure = /(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$).{0,40}(?:만들|제작|생성|변환|보정|활용|이용|도움|업스케일|보이스|음악|노래|이미지|영상|목소리)|(?:만들|제작|생성|변환|보정|활용|이용|도움|업스케일|보이스|음악|노래|이미지|영상|목소리).{0,40}(?:^|[^a-z0-9])ai(?:[^a-z0-9]|$)|\busing\s+ai\b|ai[-\s]?(?:generated|made|voice|music|image|video|animation|art|cover)/is;

let filteredPlaylistRows = 0;
let filteredAiRows = 0;
const rows = data.rows.filter((row) => {
  const text = `${row.title || ""} ${row.description || ""} ${row.channelTitle || ""}`;
  const disclosedAiUse = aiNamedTool.test(text) || aiInTitle.test(row.title || "") || aiDisclosure.test(text) || /^dear\s+ai$/i.test(String(row.channelTitle || "").trim());
  if (disclosedAiUse) {
    filteredAiRows += 1;
    return false;
  }
  if (String(row.sources || "").includes("uploads playlist") && !(related.test(row.title || "") || wutheringTitleTerms.test(row.title || ""))) {
    filteredPlaylistRows += 1;
    return false;
  }
  return true;
}).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.viewCount ?? 0) - (a.viewCount ?? 0));

const result = {
  ...data,
  meta: {
    ...data.meta,
    preFilterResultCount: data.rows.length,
    filteredPlaylistRows,
    filteredAiRows,
    resultCount: rows.length,
    seedFiles: Array.isArray(data.meta?.seedFiles) ? data.meta.seedFiles.map((file) => basename(file)) : data.meta?.seedFiles,
    qualityFilter: "Search seeds retained; uploads-playlist additions require Wuthering Waves title or known title term; disclosed AI-use rows excluded.",
  },
  rows,
};

await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source, output, before: data.rows.length, filteredPlaylistRows, filteredAiRows, after: rows.length }));
