#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { classifyWutheringVideo } from "./wuthering-waves-relevance.mjs";

const source = resolve(process.argv[2] || "data/youtube-update-expanded.json");
const output = resolve(process.argv[3] || "data/youtube-update-final.json");
const data = JSON.parse(await readFile(source, "utf8"));
const rejectedReasons = { ...(data.meta?.rejectedReasons || {}) };
let filteredPlaylistRows = 0;
let filteredAiRows = 0;
let filteredCollisionRows = 0;
const rows = data.rows.filter((row) => {
  const decision = classifyWutheringVideo(row, {
    knownChannel: String(row.sources || "").includes("uploads playlist"),
    explicit: row.relevanceReason === "explicit-video-id" || row.explicitlyIncluded === true,
  });
  if (decision.accepted) {
    row.relevanceReason = decision.reason;
    return true;
  }
  rejectedReasons[decision.reason] = (rejectedReasons[decision.reason] || 0) + 1;
  if (decision.reason === "disclosed-ai-use") filteredAiRows += 1;
  else if (decision.reason.startsWith("cross-game")) filteredCollisionRows += 1;
  else filteredPlaylistRows += 1;
  return false;
}).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (b.viewCount ?? 0) - (a.viewCount ?? 0));

const result = {
  ...data,
  meta: {
    ...data.meta,
    preFilterResultCount: Number(data.meta?.preFilterResultCount || data.rows.length),
    filteredPlaylistRows: Number(data.meta?.filteredPlaylistRows || 0) + filteredPlaylistRows,
    filteredAiRows: Number(data.meta?.filteredAiRows || 0) + filteredAiRows,
    filteredCollisionRows: Number(data.meta?.filteredCollisionRows || 0) + filteredCollisionRows,
    rejectedReasons,
    resultCount: rows.length,
    seedFiles: Array.isArray(data.meta?.seedFiles) ? data.meta.seedFiles.map((file) => basename(file)) : data.meta?.seedFiles,
    qualityFilter: "Shared Wuthering Waves metadata/title classifier; known-channel context for ambiguous terms; disclosed AI use, official channel, and cross-game collisions excluded.",
  },
  rows,
};

await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source, output, before: data.rows.length, filteredPlaylistRows, filteredAiRows, filteredCollisionRows, after: rows.length, rejectedReasons }));
