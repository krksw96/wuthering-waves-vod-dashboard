import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const collectorUrl = new URL("./collect-youtube-data-api.mjs", import.meta.url).href;
function runCollector(scenario, extraArgs = []) {
  const directory = mkdtempSync(join(tmpdir(), "ww-collector-test-"));
  const output = join(directory, "result.json");
  const args = ["--start=2026-09-01", "--end=2026-09-16", "--queries=명조|쇄명", "--maxPages=2", `--output=${output}`, ...extraArgs];
  const code = `
    const scenario = ${JSON.stringify(scenario)};
    let searches = 0;
    const reply = (body, status = 200) => new Response(JSON.stringify(body), {status, headers:{"content-type":"application/json"}});
    globalThis.setTimeout = (callback) => { callback(); return 0; };
    globalThis.fetch = async (url) => {
      const resource = new URL(url).pathname.split("/").at(-1);
      if (resource === "search") {
        searches += 1;
        if (scenario === "forbidden") return reply({error:{message:"Forbidden",errors:[{reason:"forbidden"}]}},403);
        if (scenario === "retry-budget") return reply({error:{message:"Try again"}},503);
        if (scenario === "quota" && searches > 1) return reply({error:{message:"Search quota exceeded",errors:[{reason:"quotaExceeded"}]}},403);
        return reply({items:[{id:{videoId:"RwVLGGKYoYI"}}],nextPageToken:"next"});
      }
      if (resource === "videos") return reply({items:[{id:"RwVLGGKYoYI",snippet:{title:"여우의 별자리",description:"#명조",channelTitle:"앙리형",channelId:"channel1",publishedAt:"2026-09-03T01:00:00Z"},statistics:{viewCount:"123"},contentDetails:{duration:"PT4M"}}]});
      if (resource === "channels") return reply({items:[{id:"channel1",statistics:{subscriberCount:"456"}}]});
      throw new Error("Unexpected resource " + resource);
    };
    process.argv = [process.execPath, "collector", ...${JSON.stringify(args)}];
    await import(${JSON.stringify(collectorUrl)});
  `;
  try {
    execFileSync(process.execPath, ["--input-type=module", "--eval", code], { cwd: root, env: { ...process.env, YOUTUBE_API_KEY: "fake-test-key" }, stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(readFileSync(output, "utf8"));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("search quota failure preserves candidates and continues metadata hydration", () => {
  const result = runCollector("quota");
  assert.equal(result.meta.searchCalls, 2);
  assert.equal(result.meta.searchQuotaExhausted, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.meta.videosListCalls, 1);
  assert.equal(result.meta.channelsListCalls, 1);
  assert.ok(result.meta.cappedQueries.every((entry) => entry.reason === "search-quota-exhausted"));
});

test("retries count against the hard search budget", () => {
  const result = runCollector("retry-budget", ["--maxSearchCalls=2", "--includeIds=RwVLGGKYoYI"]);
  assert.equal(result.meta.searchCalls, 2);
  assert.equal(result.meta.searchQuotaExhausted, false);
  assert.equal(result.rows.length, 1);
  assert.ok(result.meta.cappedQueries.every((entry) => entry.reason === "search-call-budget"));
});

test("explicit-only mode uses no search calls", () => {
  const result = runCollector("forbidden", ["--noSearch=true", "--includeIds=RwVLGGKYoYI"]);
  assert.equal(result.meta.searchCalls, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].explicitlyIncluded, true);
});

test("authentication errors do not masquerade as exhausted search quota", () => {
  assert.throws(() => runCollector("forbidden"), /Forbidden/);
});
