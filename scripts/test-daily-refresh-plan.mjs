import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyRefreshPlan, mergeChannelRegistry } from "./daily-refresh-plan.mjs";

test("normal daily collection revisits 14 days of all channel uploads", () => {
  const plan = buildDailyRefreshPlan({ period: { end: "2026-09-15" } }, "2026-09-16");
  assert.equal(plan.searchStart, "2026-09-15");
  assert.equal(plan.uploadsStart, "2026-09-03");
  assert.equal(plan.catchingUp, false);
  assert.equal(plan.maxSearchCalls, 85);
});

test("a long interruption extends both scans and overlaps the last collection day", () => {
  const plan = buildDailyRefreshPlan({ period: { end: "2026-08-25" } }, "2026-09-16");
  assert.equal(plan.searchStart, "2026-08-24");
  assert.equal(plan.uploadsStart, "2026-08-24");
  assert.equal(plan.catchingUp, true);
});

test("month boundaries and explicit past target dates remain valid", () => {
  const plan = buildDailyRefreshPlan({ period: { end: "2026-09-16" } }, "2026-09-01");
  assert.equal(plan.searchStart, "2026-08-31");
  assert.equal(plan.uploadsStart, "2026-08-19");
  assert.throws(() => buildDailyRefreshPlan({}, "2026-02-30"), /Invalid collection date/);
});

test("registry preserves unavailable channels and merges newly discovered channel IDs", () => {
  const registry = mergeChannelRegistry({
    provenance: "historical audits",
    channels: [
      { channelId: "UC-old", title: "Unavailable creator", lastSeenAt: "2026-09-01" },
      { channelId: "UC-active", title: "Old title", firstSeenAt: "2026-08-01" },
    ],
  }, [
    { channelId: "UC-active", creator: "Current title" },
    { channelId: "UC-new", creator: "New creator" },
    { creator: "Unknown channel ID" },
  ], "2026-09-16T00:00:00Z");
  assert.equal(registry.provenance, "historical audits");
  assert.equal(registry.channels.length, 3);
  assert.deepEqual(registry.channels.find((row) => row.channelId === "UC-old"), {
    channelId: "UC-old", title: "Unavailable creator", lastSeenAt: "2026-09-01",
  });
  assert.equal(registry.channels.find((row) => row.channelId === "UC-active").title, "Current title");
  assert.equal(registry.channels.find((row) => row.channelId === "UC-active").firstSeenAt, "2026-08-01");
  assert.equal(registry.channels.find((row) => row.channelId === "UC-new").lastSeenAt, "2026-09-16T00:00:00Z");
  assert.throws(() => mergeChannelRegistry({}, [], "2026-09-16"), /channels array/);
});
