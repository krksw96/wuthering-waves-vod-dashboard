const COUNTDOWN_SECONDS = 3;
const MAX_FRAME_SECONDS = 0.25;
const EPSILON = 1e-8;
const TIMED_MODES = new Set(["race", "slalom"]);

function prepareGates(gates, label) {
  return gates.map((gate, index) => {
    const length = Math.hypot(gate.nx, gate.nz);
    if (![gate.x, gate.z, gate.width, length].every(Number.isFinite)
      || gate.width <= 0 || length <= EPSILON) {
      throw new TypeError(`${label}[${index}] needs finite x/z, a direction, and a positive width.`);
    }
    return {
      x: gate.x,
      z: gate.z,
      nx: gate.nx / length,
      nz: gate.nz / length,
      halfWidth: gate.width / 2,
    };
  });
}

// Gates face the driving direction. Their width is the full usable width.
// Swept intersections avoid missing a gate between two physics samples.
function crossingAt(from, to, gate) {
  const fromSide = (from.x - gate.x) * gate.nx + (from.z - gate.z) * gate.nz;
  const toSide = (to.x - gate.x) * gate.nx + (to.z - gate.z) * gate.nz;
  if (fromSide >= 0 || toSide < 0 || toSide - fromSide <= EPSILON) return null;
  const fraction = -fromSide / (toSide - fromSide);
  const x = from.x + (to.x - from.x) * fraction - gate.x;
  const z = from.z + (to.z - from.z) * fraction - gate.z;
  return Math.abs(x * -gate.nz + z * gate.nx) <= gate.halfWidth + EPSILON
    ? fraction
    : null;
}

/**
 * Pure, simulation-time challenge state. No timers, storage, DOM, or renderer.
 *
 * update receives world x/z/y, forward speed, airborne, and delta in seconds.
 * Delta is capped at 0.25 seconds; zero/invalid delta leaves state untouched.
 * start("race" | "slalom") starts a three-second countdown; freeze the vehicle
 * while phase is "countdown". Gate zero is crossed once to enter a race, then
 * again after every other gate to finish. Slalom ends at its last gate.
 * Jump mode allows repeated attempts and records each result on landing.
 * reset restarts the current mode. Best records survive starts and resets.
 */
export function createDrivingChallenges({ circuitCheckpoints = [], slalomGates = [] } = {}) {
  const routes = {
    race: prepareGates(circuitCheckpoints, "circuitCheckpoints"),
    slalom: prepareGates(slalomGates, "slalomGates"),
  };
  const bests = { race: null, slalom: null, jump: 0 };
  let mode = "free";
  let phase = "idle";
  let countdown = 0;
  let elapsed = 0;
  let penalty = 0;
  let progress = 0;
  let total = 0;
  let previous = null;
  let jump = null;
  let lastJump = null;
  let jumpCount = 0;
  let result = null;
  let newBest = false;
  const hitCones = new Set();

  function snapshot() {
    return {
      mode,
      phase,
      countdown,
      elapsed,
      penalty,
      totalTime: result?.time ?? elapsed + penalty,
      progress,
      total,
      nextCheckpoint: TIMED_MODES.has(mode) && phase !== "finished"
        ? progress % routes[mode].length
        : null,
      hits: hitCones.size,
      bestTime: TIMED_MODES.has(mode) ? bests[mode] : null,
      bestJump: bests.jump,
      bests: { ...bests },
      jumpAirborne: Boolean(jump),
      currentJump: jump && previous
        ? { distance: Math.hypot(previous.x - jump.x, previous.z - jump.z), airTime: jump.airTime }
        : null,
      lastJump: lastJump ? { ...lastJump } : null,
      jumpCount,
      result: result ? { ...result } : null,
      newBest,
    };
  }

  function start(nextMode = "free") {
    if (!["free", "race", "slalom", "jump"].includes(nextMode)) {
      throw new RangeError(`Unknown driving challenge: ${nextMode}`);
    }
    if (TIMED_MODES.has(nextMode) && routes[nextMode].length < (nextMode === "race" ? 2 : 1)) {
      throw new RangeError(`${nextMode} needs configured gates.`);
    }
    mode = nextMode;
    phase = TIMED_MODES.has(mode) ? "countdown" : mode === "jump" ? "running" : "idle";
    countdown = phase === "countdown" ? COUNTDOWN_SECONDS : 0;
    elapsed = 0;
    penalty = 0;
    progress = 0;
    total = TIMED_MODES.has(mode) ? routes[mode].length + (mode === "race" ? 1 : 0) : 0;
    previous = null;
    jump = null;
    lastJump = null;
    jumpCount = 0;
    result = null;
    newBest = false;
    hitCones.clear();
    return snapshot();
  }

  function setBest(bestMode, value) {
    if (!Object.hasOwn(bests, bestMode) || !Number.isFinite(value) || value <= 0) return snapshot();
    bests[bestMode] = bestMode === "jump"
      ? Math.max(bests.jump, value)
      : Math.min(bests[bestMode] ?? Infinity, value);
    return snapshot();
  }

  function finish(time) {
    elapsed = time;
    phase = "finished";
    result = { time: elapsed + penalty, rawTime: elapsed, penalty, hits: hitCones.size };
    newBest = bests[mode] === null || result.time < bests[mode];
    setBest(mode, result.time);
  }

  function updateJump(sample, delta) {
    if (!previous) return;
    if (sample.airborne) {
      if (!previous.airborne) {
        jump = { x: previous.x, z: previous.z, airTime: delta };
      } else if (jump) {
        jump.airTime += delta;
      }
    } else if (jump) {
      // Starting a mode in the air cannot create an attempt: a grounded
      // sample followed by a takeoff must have created jump first.
      lastJump = {
        distance: Math.hypot(sample.x - jump.x, sample.z - jump.z),
        airTime: jump.airTime + delta,
      };
      jumpCount += 1;
      newBest = lastJump.distance > bests.jump;
      setBest("jump", lastJump.distance);
      result = { ...lastJump };
      jump = null;
    }
  }

  function update(input = {}) {
    const delta = Number.isFinite(input.delta) ? Math.min(MAX_FRAME_SECONDS, Math.max(0, input.delta)) : 0;
    if (delta === 0 || !Number.isFinite(input.x) || !Number.isFinite(input.z)) return snapshot();
    const sample = {
      x: input.x,
      z: input.z,
      y: Number.isFinite(input.y) ? input.y : 0,
      speed: Number.isFinite(input.speed) ? input.speed : 0,
      airborne: Boolean(input.airborne),
    };
    if (phase === "countdown") {
      countdown = Math.max(0, countdown - delta);
      if (countdown < EPSILON) {
        countdown = 0;
        phase = "running";
      }
      // Ignore every position transition during the countdown, including
      // its final frame; the driver is released on the next simulation step.
      previous = sample;
      return snapshot();
    }
    if (phase !== "running") {
      previous = sample;
      return snapshot();
    }

    const frameStart = elapsed;
    elapsed += delta;
    if (mode === "jump") {
      updateJump(sample, delta);
    } else if (previous && !sample.airborne && !previous.airborne && sample.speed > 0.1) {
      const gates = routes[mode];
      let lastFraction = -EPSILON;
      // Process only the expected gate, then the next. Fractions must rise
      // within this frame, so an out-of-order shortcut cannot satisfy a lap.
      for (let checked = 0; checked < gates.length && progress < total; checked += 1) {
        const fraction = crossingAt(previous, sample, gates[progress % gates.length]);
        if (fraction === null || fraction <= lastFraction + EPSILON) break;
        progress += 1;
        lastFraction = fraction;
        if (progress === total) {
          finish(frameStart + delta * fraction);
          break;
        }
      }
    }
    previous = sample;
    return snapshot();
  }

  function hitCone(id) {
    if (mode === "slalom" && phase === "running" && id !== undefined && id !== null && !hitCones.has(id)) {
      hitCones.add(id);
      penalty += 2;
    }
    return snapshot();
  }

  return { start, reset: () => start(mode), update, hitCone, snapshot, setBest };
}
