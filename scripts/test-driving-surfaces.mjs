import assert from "node:assert/strict";
import test from "node:test";
import { createDrivingSurfaces } from "./driving-surfaces.mjs";

const launchRamp = {
  centerX: 46, centerZ: 20, halfLength: 6, halfWidth: 4,
  height: 3, directionX: 0, directionZ: -1, baseHeight: 0.2, launch: true,
};
const landingRamp = {
  centerX: 46, centerZ: -10, halfLength: 8, halfWidth: 5,
  height: 3, directionX: 0, directionZ: 1, baseHeight: 0.2, launch: false,
};

test("roads use nearest finite segments, including curved path bends", () => {
  const surfaces = createDrivingSurfaces({
    roadPaths: [{
      points: [{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 14, z: 6 }, { x: 14, z: 14 }],
      halfWidth: 1,
      closed: false,
    }],
  });
  assert.equal(surfaces.isOnRoad(4, 1.4), true);
  assert.equal(surfaces.isOnRoad(4, 1.6), false);
  assert.equal(surfaces.isOnRoad(11, 3), true);
  assert.equal(surfaces.isOnRoad(10, 4), true, "diagonal segment distance uses perpendicular projection");
  assert.equal(surfaces.isOnRoad(9, 5), false);
  assert.equal(surfaces.isOnRoad(7.5, 0.5), true, "a joined bend has continuous road coverage");
  assert.equal(surfaces.isOnRoad(20, 0), false, "a road's infinite extension is not drivable road");
  assert.equal(surfaces.isOnRoad(14, 15.4), true, "the shoulder includes the segment end cap");
  assert.equal(surfaces.isOnRoad(14, 15.6), false);
});

test("closed roads connect their final point back to their first", () => {
  const path = {
    points: [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }],
    halfWidth: 0.5,
  };
  const open = createDrivingSurfaces({ roadPaths: [path] });
  const closed = createDrivingSurfaces({ roadPaths: [{ ...path, closed: true }] });
  assert.equal(open.isOnRoad(5, 5), false);
  assert.equal(closed.isOnRoad(5, 5), true);
  assert.equal(closed.isOnRoad(4, 6), false);
});

test("road pads use circular boundaries and the same shoulder tolerance", () => {
  const surfaces = createDrivingSurfaces({ roadPads: [{ x: -10, z: 20, radius: 5 }] });
  assert.equal(surfaces.isOnRoad(-10, 20), true);
  assert.equal(surfaces.isOnRoad(-6.7, 24.4), true);
  assert.equal(surfaces.isOnRoad(-6.6, 24.5), false);
  assert.equal(surfaces.isOnRoad(-4.5, 20), true);
  assert.equal(surfaces.isOnRoad(-4.4, 20), false);
});

test("duplicate points, isolated points, and empty paths remain finite", () => {
  const surfaces = createDrivingSurfaces({ roadPaths: [
    { points: [], halfWidth: 1, closed: true },
    { points: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 10 }], halfWidth: 1 },
    { points: [{ x: 20, z: 20 }], halfWidth: 1 },
  ] });
  assert.equal(surfaces.isOnRoad(0, 5), true);
  assert.equal(surfaces.isOnRoad(20, 21), true);
  assert.equal(surfaces.isOnRoad(20, 22), false);
  assert.equal(surfaces.isOnRoad(NaN, 0), false);
  assert.equal(surfaces.isOnRoad(0, Infinity), false);
});

test("north-facing launch ramp rises from its approach edge to its launch lip", () => {
  const surfaces = createDrivingSurfaces({ ramps: [launchRamp] });
  const bottom = surfaces.rampContactAt(launchRamp, 46, 26);
  const middle = surfaces.rampContactAt(launchRamp, 46, 20);
  const top = surfaces.rampContactAt(launchRamp, 46, 14);
  assert.equal(bottom.progress, 0);
  assert.equal(bottom.height, 0.2);
  assert.equal(middle.progress, 0.5);
  assert.equal(middle.height, 1.7);
  assert.equal(top.progress, 1);
  assert.equal(top.height, 3.2);
  assert.equal(top.ramp, launchRamp, "the original object and launch metadata are preserved");
  assert.equal(top.ramp.launch, true);
  assert.equal(surfaces.rampContactAt(launchRamp, 50, 20)?.progress, 0.5);
  assert.equal(surfaces.rampContactAt(launchRamp, 50.01, 20), null);
  assert.equal(surfaces.rampContactAt(launchRamp, 46, 26.01), null);
  assert.equal(surfaces.rampContactAt(launchRamp, 46, 13.99), null);
});

test("opposite-facing landing ramp descends while driving north", () => {
  const surfaces = createDrivingSurfaces({ ramps: [landingRamp] });
  assert.equal(surfaces.rampContactAt(landingRamp, 46, -2).height, 3.2);
  assert.equal(surfaces.rampContactAt(landingRamp, 46, -10).height, 1.7);
  const exit = surfaces.rampContactAt(landingRamp, 46, -18);
  assert.equal(exit.height, 0.2);
  assert.equal(exit.progress, 0);
  assert.equal(exit.ramp.launch, false);
});

test("rotated ramp projection normalizes direction and measures lateral width", () => {
  const ramp = {
    centerX: 0, centerZ: 0, halfLength: 10, halfWidth: 2,
    height: 4, directionX: 3, directionZ: 4,
  };
  const surfaces = createDrivingSurfaces();
  assert.equal(surfaces.rampContactAt(ramp, -6, -8).height, 0);
  assert.equal(surfaces.rampContactAt(ramp, 0, 0).height, 2);
  assert.equal(surfaces.rampContactAt(ramp, 6, 8).height, 4);
  assert.equal(surfaces.rampContactAt(ramp, -1.6, 1.2)?.progress, 0.5);
  assert.equal(surfaces.rampContactAt(ramp, -1.68, 1.26), null);
});

test("active ramps choose the highest overlapping surface regardless of array order", () => {
  const low = { ...launchRamp, baseHeight: 0, height: 2 };
  const high = { ...launchRamp, baseHeight: 2, height: 2, launch: false };
  for (const ramps of [[low, high], [high, low]]) {
    const surfaces = createDrivingSurfaces({ ramps });
    assert.equal(surfaces.activeRampAt(46, 20).ramp, high);
    assert.equal(surfaces.surfaceHeightAt(46, 20), 3);
    assert.equal(surfaces.activeRampAt(0, 0), null);
    assert.equal(surfaces.surfaceHeightAt(0, 0), 0);
  }
});

test("invalid ramps or nonfinite query points cannot introduce invalid physics heights", () => {
  const invalid = { ...launchRamp, directionX: 0, directionZ: 0 };
  const flatInvalidLength = { ...launchRamp, halfLength: 0 };
  const surfaces = createDrivingSurfaces({ ramps: [invalid, flatInvalidLength] });
  assert.equal(surfaces.rampContactAt(invalid, 46, 20), null);
  assert.equal(surfaces.rampContactAt(flatInvalidLength, 46, 20), null);
  assert.equal(surfaces.activeRampAt(46, 20), null);
  assert.equal(surfaces.surfaceHeightAt(46, 20), 0);
  assert.equal(surfaces.rampContactAt(launchRamp, NaN, 20), null);
  assert.equal(surfaces.surfaceHeightAt(Infinity, 0), 0);
});
