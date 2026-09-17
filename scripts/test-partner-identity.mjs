import assert from "node:assert/strict";
import test from "node:test";
import { createPartnerIdentityMatcher } from "./partner-identity.mjs";
import { buildKolVodIndex } from "./kol-vod-index.mjs";
import { createKolDirectory } from "./kol-search-model.mjs";

const realChannelId = "UCdOPKgTTrPArV9oamVVdL8g";
const unrelatedChannelId = "UCtLnqpNLY-X3MR0A0ilgvhQ";
const partners = [
  { name: "키플 KEYPLE", aliases: ["키플 KEYPLE", "KEYPLE"], channelIds: [realChannelId] },
  { name: "매드라이프", aliases: ["매드라이프", "MadLife", "매드라이FULL"] },
];
const match = createPartnerIdentityMatcher(partners);

test("a similarly named channel cannot inherit a channel-bound partner identity", () => {
  assert.equal(match({ channelId: unrelatedChannelId, creator: "키플" }), null);
  assert.equal(match({ channelId: unrelatedChannelId, creator: "KEYPLE" }), null);
  assert.equal(match({ channelId: unrelatedChannelId, creator: "키플 KEYPLE" }), null);
});

test("the registered channel matches even after changing its display name", () => {
  assert.equal(match({ channelId: realChannelId, creator: "새 이름" }), "키플 KEYPLE");
  assert.equal(match({ channelId: realChannelId, channelTitle: "키플" }), "키플 KEYPLE");
});

test("channel-bound aliases do not match records with absent channel IDs", () => {
  assert.equal(match({ creator: "KEYPLE" }), null);
  assert.equal(match({ channelId: null, channelTitle: "키플 KEYPLE" }), null);
  assert.equal(createPartnerIdentityMatcher([{ name: "Pending", aliases: ["Pending"], channelIds: [] }])({ creator: "Pending" }), null);
});

test("partners without ID bindings retain previous normalized-alias matching", () => {
  assert.equal(match({ creator: "MAD life!" }), "매드라이프");
  assert.equal(match({ channelId: unrelatedChannelId, channelTitle: "매드라이FULL" }), "매드라이프");
  assert.equal(match({ creator: "Unrelated creator" }), null);
});

test("channel ID binding takes priority over another partner's display-name alias", () => {
  assert.equal(match({ channelId: realChannelId, creator: "MadLife" }), "키플 KEYPLE");
});

test("the public channel name keeps unrelated 키플 separate in the KOL directory", () => {
  const videos = [
    { id: "actual", creator: "키플 KEYPLE", channelId: realChannelId, date: "2026-09-01", format: "VOD" },
    { id: "unrelated", creator: "키플", channelId: unrelatedChannelId, date: "2026-09-01", format: "VOD" },
  ].map((video) => ({ ...video, kocName: match(video) }));
  const index = buildKolVodIndex("wuthering-waves", { kocList: partners, videos });
  const directory = createKolDirectory(index);
  assert.equal(directory.length, 2);
  assert.deepEqual(directory.find((entry) => entry.name === "키플").vodNames, ["키플"]);
  assert.deepEqual(directory.find((entry) => entry.name === "키플 KEYPLE").vodNames, ["키플 KEYPLE"]);
});
