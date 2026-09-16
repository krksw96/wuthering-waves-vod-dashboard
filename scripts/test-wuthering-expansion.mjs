import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const expansionUrl = new URL("./expand-backfill-from-channels.mjs", import.meta.url).href;

test("registry reconciliation honors explicit dates, metadata evidence, unavailable playlists and caps", () => {
  const directory = mkdtempSync(join(tmpdir(), "ww-expansion-test-"));
  const seed = join(directory, "seed.json");
  const registry = join(directory, "channels.json");
  const output = join(directory, "result.json");
  const candidates = join(directory, "candidates.json");
  writeFileSync(seed, JSON.stringify({ meta: { start: "2025-01-01", end: "2026-09-16" }, rows: [{ youtubeId: "oldVideo000", channelId: "channel1", title: "명조", date: "2025-01-02" }] }));
  writeFileSync(registry, JSON.stringify({ channels: [{ channelId: "channel1", title: "앙리형" }, { channelId: "channel2", title: "삭제된 채널" }] }));
  const args = [seed, `--channelsFile=${registry}`, "--start=2026-09-01", "--end=2026-09-10", "--maxPlaylistPages=1", `--output=${output}`, `--candidatesOutput=${candidates}`];
  const code = `
    const reply = (body, status = 200) => new Response(JSON.stringify(body), {status});
    globalThis.fetch = async (value) => {
      const url = new URL(value);
      const resource = url.pathname.split("/").at(-1);
      if (resource === "channels") return reply({items:["channel1","channel2"].map(id=>({id,snippet:{title:"앙리형"},contentDetails:{relatedPlaylists:{uploads:id}},statistics:{subscriberCount:"5"}}))});
      if (resource === "playlistItems") {
        if (url.searchParams.get("playlistId") === "channel2") return reply({error:{message:"Unavailable",errors:[{reason:"playlistNotFound"}]}},404);
        return reply({items:[{contentDetails:{videoId:"RwVLGGKYoYI",videoPublishedAt:"2026-09-03T01:00:00Z"}}],nextPageToken:"more"});
      }
      if (resource === "videos") return reply({items:[{id:"RwVLGGKYoYI",snippet:{title:"이제 숨기지 않겠습니다",description:"#명조",channelId:"channel1",channelTitle:"앙리형",defaultAudioLanguage:"ko",publishedAt:"2026-09-03T01:00:00Z"},statistics:{viewCount:"8"},contentDetails:{duration:"PT10M"}}]});
      throw new Error("Unexpected resource " + resource);
    };
    process.argv = [process.execPath, "expansion", ...${JSON.stringify(args)}];
    await import(${JSON.stringify(expansionUrl)});
  `;
  try {
    execFileSync(process.execPath, ["--input-type=module", "--eval", code], { cwd: root, env: { ...process.env, YOUTUBE_API_KEY: "fake-test-key" }, stdio: ["ignore", "pipe", "pipe"] });
    const result = JSON.parse(readFileSync(output, "utf8"));
    const raw = JSON.parse(readFileSync(candidates, "utf8"));
    assert.equal(result.meta.start, "2026-09-01");
    assert.equal(result.meta.end, "2026-09-10");
    assert.deepEqual(result.rows.map((row) => row.youtubeId), ["RwVLGGKYoYI"]);
    assert.equal(result.rows[0].defaultAudioLanguage, "ko");
    assert.deepEqual(result.meta.cappedChannelIds, ["channel1"]);
    assert.deepEqual(result.meta.failedChannelIds, ["channel2"]);
    assert.equal(result.meta.expansionCalls.playlistItemsListCalls, 2);
    assert.equal(raw.items.length, 1);
    assert.equal(raw.decisions[0].reason, "explicit-game-metadata");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
