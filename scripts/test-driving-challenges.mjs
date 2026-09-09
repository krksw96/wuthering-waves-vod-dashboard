import assert from "node:assert/strict";
import test from "node:test";
import { createDrivingChallenges } from "./driving-challenges.mjs";

const circuit = [
  { x: 0, z: 0, nx: 1, nz: 0, width: 4 },
  { x: 10, z: 10, nx: 0, nz: 1, width: 4 },
  { x: 0, z: 20, nx: -1, nz: 0, width: 4 },
  { x: -10, z: 10, nx: 0, nz: -1, width: 4 },
];
const slalom = [
  { x: -2, z: 10, nx: 0, nz: -1, width: 3 },
  { x: 2, z: 0, nx: 0, nz: -1, width: 3 },
  { x: 0, z: -10, nx: 0, nz: -1, width: 8 },
];
const create = () => createDrivingChallenges({ circuitCheckpoints: circuit, slalomGates: slalom });
const step = (controller, x, z, overrides = {}) => controller.update({
  x, z, y: 0, speed: 10, airborne: false, delta: 0.1, ...overrides,
});

function startTimed(controller, mode, x, z) {
  controller.start(mode);
  for (let frame = 0; frame < 12; frame += 1) step(controller, x, z, { delta: 0.25, speed: 0 });
  assert.equal(controller.snapshot().phase, "running");
  assert.equal(controller.snapshot().elapsed, 0);
}

function driveLap(controller) {
  const positions = [[2, 0], [10, 8], [10, 12], [2, 20], [-2, 20], [-10, 12], [-10, 8], [-2, 0], [2, 0]];
  for (const [x, z] of positions) step(controller, x, z);
  return controller.snapshot();
}

test("race requires an ordered full lap and interpolates the finish time", () => {
  const controller = create();
  startTimed(controller, "race", -2, 0);
  const firstGate = step(controller, 2, 0);
  assert.equal(firstGate.progress, 1);
  assert.equal(firstGate.total, 5);
  assert.equal(firstGate.phase, "running");
  assert.equal(firstGate.nextCheckpoint, 1);
  for (const [x, z] of [[10, 8], [10, 12], [2, 20], [-2, 20], [-10, 12], [-10, 8], [-2, 0]]) {
    step(controller, x, z);
  }
  const finished = step(controller, 2, 0);
  assert.equal(finished.phase, "finished");
  assert.equal(finished.progress, 5);
  assert.equal(finished.nextCheckpoint, null);
  assert.ok(Math.abs(finished.totalTime - 0.85) < 1e-8);
  assert.equal(finished.bestTime, finished.totalTime);
  assert.equal(finished.newBest, true);
  assert.deepEqual(finished.result, { time: finished.totalTime, rawTime: finished.elapsed, penalty: 0, hits: 0 });
  assert.deepEqual(step(controller, 30, 30), finished, "a completed result must stop accumulating time");
});

test("start-line loops, future gates, wrong-way travel, and wide shortcuts do not advance", () => {
  const controller = create();
  startTimed(controller, "race", -2, 0);
  step(controller, 2, 0);
  step(controller, -2, 0);
  assert.equal(step(controller, 2, 0).progress, 1, "repeated start-line crossings are not laps");
  step(controller, -10, 12);
  assert.equal(step(controller, -10, 8).progress, 1, "later gates cannot bypass the next gate");
  step(controller, 30, 8);
  assert.equal(step(controller, 30, 12).progress, 1, "crossing the plane outside its width is not a gate");
  step(controller, 10, 12);
  assert.equal(step(controller, 10, 8).progress, 1, "crossing backward is not a gate");
  assert.equal(step(controller, 10, 12, { speed: -10 }).progress, 1, "reversing across a gate is not forward driving");
  step(controller, 10, 8);
  assert.equal(step(controller, 10, 12, { airborne: true }).progress, 1, "flying over a gate is not passing it");
});

test("countdown and paused updates cannot advance gates or accrue penalties", () => {
  const controller = create();
  controller.start("slalom");
  step(controller, -2, 12);
  for (let frame = 0; frame < 28; frame += 1) step(controller, -2, frame % 2 ? 12 : 8);
  assert.equal(controller.snapshot().phase, "countdown");
  assert.equal(controller.snapshot().elapsed, 0);
  assert.equal(controller.hitCone("early").penalty, 0);
  assert.equal(controller.snapshot().progress, 0);
  step(controller, -2, 12);
  assert.equal(controller.snapshot().phase, "running");
  const beforePause = controller.snapshot();
  assert.deepEqual(step(controller, -2, 8, { delta: 0 }), beforePause);
  assert.equal(step(controller, -2, 8).progress, 1);
});

test("a stationary vehicle cannot claim a gate on the gate plane", () => {
  const controller = create();
  startTimed(controller, "race", 0, 0);
  for (let frame = 0; frame < 10; frame += 1) step(controller, 0, 0, { speed: 0 });
  assert.equal(controller.snapshot().progress, 0);
  assert.equal(step(controller, 2, 0).progress, 0, "a crossing must begin behind the line");
  step(controller, -2, 0);
  assert.equal(step(controller, 2, 0).progress, 1);
});

test("swept gate crossings preserve order even when multiple gates fit in one frame", () => {
  const gates = [10, 0, -10].map((z) => ({ x: 0, z, nx: 0, nz: -2, width: 4 }));
  const controller = createDrivingChallenges({ slalomGates: gates });
  startTimed(controller, "slalom", 0, 20);
  const finished = step(controller, 0, -20, { speed: 100 });
  assert.equal(finished.progress, 3);
  assert.equal(finished.phase, "finished");
  assert.ok(Math.abs(finished.totalTime - 0.075) < 1e-8);

  const outOfOrder = createDrivingChallenges({ slalomGates: [gates[1], gates[0], gates[2]] });
  startTimed(outOfOrder, "slalom", 0, 20);
  assert.equal(step(outOfOrder, 0, -20, { speed: 100 }).progress, 1,
    "a gate crossed earlier in this frame cannot count after a later crossing");
});

test("slalom finishes once at its final gate and each cone costs two seconds once", () => {
  const controller = create();
  startTimed(controller, "slalom", -2, 12);
  controller.hitCone("cone-a");
  controller.hitCone("cone-a");
  controller.hitCone("cone-b");
  assert.equal(controller.snapshot().penalty, 4);
  assert.equal(controller.snapshot().hits, 2);
  assert.equal(step(controller, -2, 8).progress, 1);
  step(controller, 2, 2);
  assert.equal(step(controller, 2, -2).progress, 2);
  step(controller, 0, -8);
  const finished = step(controller, 0, -12);
  assert.equal(finished.phase, "finished");
  assert.equal(finished.total, 3);
  assert.equal(finished.progress, 3);
  assert.ok(Math.abs(finished.result.rawTime - 0.45) < 1e-8);
  assert.ok(Math.abs(finished.result.time - 4.45) < 1e-8);
  assert.equal(controller.hitCone("after-finish").penalty, 4);
});

test("a missed slalom gate must be retried before a later gate can count", () => {
  const controller = create();
  startTimed(controller, "slalom", 2, 12);
  assert.equal(step(controller, 2, 8).progress, 0, "wrong side of the cone misses the gate");
  assert.equal(step(controller, 2, -2).progress, 0);
  step(controller, -2, 12);
  assert.equal(step(controller, -2, 8).progress, 1);
});

test("jump distance is horizontal and recorded only after takeoff then landing", () => {
  const controller = create();
  controller.start("jump");
  step(controller, 0, 0);
  const takeoff = step(controller, 3, 4, { y: 2, airborne: true });
  assert.equal(takeoff.jumpAirborne, true);
  assert.equal(takeoff.currentJump.distance, 5);
  assert.equal(takeoff.lastJump, null);
  step(controller, 6, 8, { y: 4, airborne: true });
  const landed = step(controller, 9, 12);
  assert.equal(landed.jumpCount, 1);
  assert.equal(landed.lastJump.distance, 15);
  assert.ok(Math.abs(landed.lastJump.airTime - 0.3) < 1e-8);
  assert.equal(landed.bestJump, 15);
  assert.equal(landed.jumpAirborne, false);
  assert.equal(landed.currentJump, null);
  assert.equal(landed.phase, "running");
  const grounded = step(controller, 12, 16);
  assert.equal(grounded.jumpCount, 1);
  assert.deepEqual(grounded.lastJump, landed.lastJump);
  step(controller, 13, 16, { y: 2, airborne: true });
  const secondLanding = step(controller, 14, 16);
  assert.equal(secondLanding.jumpCount, 2);
  assert.equal(secondLanding.lastJump.distance, 2);
  assert.equal(secondLanding.bestJump, 15);
  assert.equal(secondLanding.newBest, false);
});

test("starting while airborne cannot fabricate a jump result", () => {
  const controller = create();
  controller.start("jump");
  step(controller, 0, 0, { y: 5, airborne: true });
  step(controller, 10, 0, { y: 3, airborne: true });
  assert.equal(step(controller, 20, 0).lastJump, null);
  assert.equal(controller.snapshot().jumpCount, 0);
});

test("resetting during flight discards the attempt and needs a new takeoff", () => {
  const controller = create();
  controller.start("jump");
  controller.setBest("jump", 8);
  step(controller, 0, 0);
  step(controller, 4, 0, { y: 2, airborne: true });
  assert.equal(controller.snapshot().jumpAirborne, true);
  const reset = controller.reset();
  assert.equal(reset.jumpAirborne, false);
  assert.equal(reset.currentJump, null);
  assert.equal(reset.jumpCount, 0);
  assert.equal(reset.lastJump, null);
  step(controller, 10, 0, { y: 2, airborne: true });
  assert.equal(step(controller, 14, 0).lastJump, null);
  assert.equal(controller.snapshot().bestJump, 8);
});

test("reset clears session state, preserves records, and creates a fresh countdown", () => {
  const controller = create();
  controller.setBest("race", 25);
  controller.setBest("race", 30);
  controller.setBest("slalom", 20);
  controller.setBest("jump", 15);
  controller.setBest("jump", 10);
  controller.setBest("race", NaN);
  controller.setBest("jump", -1);
  startTimed(controller, "slalom", -2, 12);
  controller.hitCone("cone-a");
  step(controller, -2, 8);
  const reset = controller.reset();
  assert.equal(reset.mode, "slalom");
  assert.equal(reset.phase, "countdown");
  assert.equal(reset.countdown, 3);
  assert.equal(reset.progress, 0);
  assert.equal(reset.elapsed, 0);
  assert.equal(reset.penalty, 0);
  assert.equal(reset.hits, 0);
  assert.equal(reset.result, null);
  assert.deepEqual(reset.bests, { race: 25, slalom: 20, jump: 15 });
  controller.start("free");
  assert.equal(controller.snapshot().phase, "idle");
  assert.equal(controller.snapshot().nextCheckpoint, null);
  startTimed(controller, "race", -2, 0);
  const raceResult = driveLap(controller);
  assert.ok(raceResult.bestTime < 25);
  assert.equal(raceResult.bests.slalom, 20);
});

test("snapshot values cannot mutate controller records", () => {
  const controller = create();
  controller.setBest("jump", 8);
  const snapshot = controller.snapshot();
  snapshot.bests.jump = 100;
  assert.equal(controller.snapshot().bestJump, 8);
});
