import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as THREE from "./vendor/three.module.min.js";
import * as parkModule from "./driving-park.mjs";
import * as challengesModule from "./driving-challenges.mjs";
import * as surfacesModule from "./driving-surfaces.mjs";
import * as carModule from "./driving-car.mjs";

// Exercise the shipped controller and geometry. Only browser presentation and
// time are replaced; vehicle physics, inputs, surfaces and scoring remain real.
const rootUrl = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", rootUrl), "utf8");
const source = await readFile(new URL("scripts/drive-portal.mjs", rootUrl), "utf8");
const STEP = 1 / 60;

function makeBrowser() {
  const elements = [];
  const byId = new Map();
  const globalEvents = new Map();
  const documentEvents = new Map();
  const storage = new Map([["vodLanguage", "en"], ["data-city-music", "off"]]);
  const navigations = [];
  const errors = [];
  let now = 0;
  let document;

  class Element {
    constructor(tagName, attributes = {}) {
      this.tagName = tagName.toUpperCase();
      this.attributes = new Map(Object.entries(attributes));
      this.id = attributes.id || "";
      this.dataset = Object.fromEntries(Object.entries(attributes).filter(([name]) => name.startsWith("data-")).map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase()), value]));
      this.children = [];
      this.listeners = new Map();
      this.parentElement = null;
      this.textContent = "";
      this.hidden = "hidden" in attributes;
      this.style = { setProperty(name, value) { this[name] = value; } };
      const classes = new Set((attributes.class || "").split(/\s+/).filter(Boolean));
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle: (name, enabled = !classes.has(name)) => enabled ? classes.add(name) : classes.delete(name),
      };
      elements.push(this);
      if (this.id) byId.set(this.id, this);
    }
    get clientWidth() { return document?.body.classList.contains("started") ? 1280 : 640; }
    get clientHeight() { return document?.body.classList.contains("started") ? 720 : 360; }
    getBoundingClientRect() { return { width: this.clientWidth, height: this.clientHeight }; }
    getContext() {
      const gradient = { addColorStop() {} };
      return new Proxy({}, { get: (_, key) => key === "canvas" ? this : key === "measureText" ? (value) => ({ width: String(value).length * 10 }) : key.startsWith("create") ? () => gradient : () => {} });
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    hasAttribute(name) { return this.attributes.has(name); }
    getAttribute(name) { return this.attributes.get(name); }
    removeAttribute(name) { this.attributes.delete(name); if (name === "src") this.src = ""; }
    matches(selector) {
      return selector.split(",").some((item) => {
        const part = item.trim();
        if (part === "[contenteditable]:not([contenteditable='false'])") return this.hasAttribute("contenteditable") && this.getAttribute("contenteditable") !== "false";
        if (part.startsWith("#")) return this.id === part.slice(1);
        if (part.startsWith(".")) return this.classList.contains(part.slice(1));
        const attribute = part.match(/^\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\](?:\.([\w-]+))?$/);
        if (attribute) return this.hasAttribute(attribute[1]) && (!attribute[2] || this.getAttribute(attribute[1]) === attribute[2]) && (!attribute[3] || this.classList.contains(attribute[3]));
        return this.tagName === part.toUpperCase();
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
    querySelector(selector) {
      for (const child of this.children) {
        if (child.matches(selector)) return child;
        const found = child.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
    append(child) {
      if (child.parentElement) child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
      child.parentElement = this;
      this.children.push(child);
    }
    addEventListener(type, callback) { this.listeners.set(type, [...this.listeners.get(type) || [], callback]); }
    dispatch(type, detail = {}) { for (const callback of this.listeners.get(type) || []) callback({ type, target: this, preventDefault() {}, ...detail }); }
    click() { this.dispatch("click"); }
    focus() { document.activeElement = this; }
    setPointerCapture() {}
    hasPointerCapture() { return false; }
  }

  const stack = [];
  for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*?)(\/?)>/gi)) {
    const [, closing, tag, raw, selfClosing] = match;
    if (closing) {
      while (stack.length) { if (stack.pop().tagName === tag.toUpperCase()) break; }
      continue;
    }
    const attributes = Object.fromEntries([...raw.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].map((item) => [item[1], item[2] ?? ""]));
    const element = new Element(tag, attributes);
    stack.at(-1)?.append(element);
    if (!selfClosing && !/^(meta|link|input|br|hr|img)$/i.test(tag)) stack.push(element);
  }
  const body = elements.find((element) => element.tagName === "BODY");
  document = {
    body,
    activeElement: body,
    hidden: false,
    documentElement: elements.find((element) => element.tagName === "HTML"),
    querySelector: (selector) => selector.startsWith("#") ? byId.get(selector.slice(1)) || null : elements.find((element) => element.matches(selector)) || null,
    querySelectorAll: (selector) => elements.filter((element) => element.matches(selector)),
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
    addEventListener: (type, callback) => documentEvents.set(type, [...documentEvents.get(type) || [], callback]),
  };
  const media = { matches: false, addEventListener() {} };
  let renderer;
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.renders = 0; }
    setPixelRatio(value) { this.pixelRatio = value; }
    setSize(width, height) { this.size = [width, height]; }
    setAnimationLoop(callback) { this.animate = callback; }
    render(scene, camera) { this.renders += 1; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  }
  const environment = {
    console: { ...console, error: (...args) => errors.push(args) },
    document,
    location: { origin: "http://localhost", assign: (href) => navigations.push(href) },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    performance: { now: () => now },
    devicePixelRatio: 2,
    innerHeight: 720,
    window: { scrollTo() {} },
    matchMedia: () => media,
    ResizeObserver: class { observe() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    addEventListener: (type, callback) => globalEvents.set(type, [...globalEvents.get(type) || [], callback]),
    dispatchEvent: (event) => (globalEvents.get(event.type) || []).forEach((callback) => callback(event)),
    __modules: {
      "./driving-park.mjs": {
        ...parkModule,
        buildDrivingPark(...args) {
          // This imported module also creates a canvas grain texture. Execute
          // that browser branch so seeded scenery matches the production park.
          const previousDocument = globalThis.document;
          globalThis.document = document;
          try { return parkModule.buildDrivingPark(...args); }
          finally {
            if (previousDocument === undefined) delete globalThis.document;
            else globalThis.document = previousDocument;
          }
        },
      },
      "./driving-challenges.mjs": challengesModule,
      "./driving-surfaces.mjs": surfacesModule,
      "./driving-car.mjs": carModule,
    },
    __three: { ...THREE, WebGLRenderer: Renderer, Clock: class { getDelta() { return STEP; } } },
  };
  const context = vm.createContext(environment);
  return {
    context, document, byId, storage, navigations, errors, media,
    get renderer() { return renderer; },
    frame(count = 1) { for (let index = 0; index < count; index += 1) { now += STEP * 1000; renderer.animate(); } },
    emit(type, detail = {}) { (globalEvents.get(type) || []).forEach((callback) => callback({ type, ...detail })); },
    key(type, code, target = document.activeElement) {
      const event = { code, target, repeat: false, preventDefault() { this.defaultPrevented = true; } };
      (globalEvents.get(type) || []).forEach((callback) => callback(event));
      return event;
    },
    button(selector) { const button = document.querySelector(selector); assert.ok(button, `Missing ${selector} in index.html`); return button; },
  };
}

async function boot({ queued = false } = {}) {
  const browser = makeBrowser();
  browser.context.__loadThree = async () => {
    if (queued) browser.byId.get("start-button").click();
    return browser.context.__three;
  };
  const instrumented = source
    .replace(/^import \{([^}]+)\} from "([^"]+)";/gm, (_, names, path) => `const {${names}} = globalThis.__modules[${JSON.stringify(path)}];`)
    .replace('await import("./vendor/three.module.min.js")', "await globalThis.__loadThree()")
    .replace("renderer.setAnimationLoop(animate);", "globalThis.__drive = { state, inputs, car, park, challenge, vehicle, activeJumpRampAt, isOnRoad, resetCar, get mode() { return selectedMode; } }; renderer.setAnimationLoop(animate);");
  await vm.runInContext(`(async () => { ${instrumented}\n})()`, browser.context);
  assert.equal(browser.errors.length, 0, browser.errors.map((entry) => entry.map(String).join(" ")).join("\n"));
  assert.ok(browser.renderer?.animate, "controller installed its frame loop");
  browser.drive = browser.context.__drive;
  browser.selectMode = (mode) => browser.button(`[data-drive-mode="${mode}"]`).click();
  browser.start = () => browser.byId.get("start-button").click();
  browser.restart = () => browser.button("[data-restart]").click();
  browser.release = () => ["KeyW", "KeyS", "KeyA", "KeyD", "ShiftLeft", "Space"].forEach((key) => browser.key("keyup", key));
  return browser;
}

function assertAtSpawn(browser, mode) {
  const { car, park, state } = browser.drive;
  const spawn = park.spawns[mode];
  assert.ok(Math.hypot(car.position.x - spawn.x, car.position.z - spawn.z) < 1e-8, `${mode} reset uses its park spawn`);
  assert.equal(state.yaw, spawn.yaw);
  assert.equal(state.speed, 0);
  assert.equal(state.airborne, false);
}

function steerToward(browser, target, cruiseSpeed, deadband = 0.025) {
  const { car, state } = browser.drive;
  const desiredYaw = Math.atan2(target.x - car.position.x, -(target.z - car.position.z));
  const error = Math.atan2(Math.sin(desiredYaw - state.yaw), Math.cos(desiredYaw - state.yaw));
  browser.key(error > deadband ? "keydown" : "keyup", "KeyD");
  browser.key(error < -deadband ? "keydown" : "keyup", "KeyA");
  browser.key(state.speed < cruiseSpeed ? "keydown" : "keyup", "KeyW");
  browser.key(state.speed > cruiseSpeed + 1.0 ? "keydown" : "keyup", "KeyS");
}

test("actual steering and throttle complete the full circuit without cutting checkpoints", async () => {
  const browser = await boot(); browser.selectMode("race"); browser.start(); browser.frame(181);
  const { car, park, state } = browser.drive;
  const points = park.circuitPoints;
  let nearest = points.reduce((best, point, index) => Math.hypot(point.x - car.position.x, point.z - car.position.z) < Math.hypot(points[best].x - car.position.x, points[best].z - car.position.z) ? index : best, 0);
  let offRoadFrames = 0;
  for (let frame = 0; frame < 7200 && browser.drive.challenge.snapshot().phase !== "finished"; frame += 1) {
    let closestDistance = Infinity;
    let closestIndex = nearest;
    for (let offset = -3; offset <= 15; offset += 1) {
      const index = (nearest + offset + points.length) % points.length;
      const distance = Math.hypot(points[index].x - car.position.x, points[index].z - car.position.z);
      if (distance < closestDistance) { closestDistance = distance; closestIndex = index; }
    }
    nearest = closestIndex;
    let targetIndex = nearest;
    let ahead = 0;
    while (ahead < 5 + Math.abs(state.speed) * 0.48) {
      const next = (targetIndex + 1) % points.length;
      ahead += Math.hypot(points[next].x - points[targetIndex].x, points[next].z - points[targetIndex].z);
      targetIndex = next;
    }
    steerToward(browser, points[targetIndex], 12);
    browser.frame();
    if (!browser.drive.isOnRoad(car.position.x, car.position.z)) offRoadFrames += 1;
  }
  browser.release();
  const result = browser.drive.challenge.snapshot();
  assert.equal(result.phase, "finished", `circuit progress ${result.progress}/${result.total} at ${car.position.x.toFixed(1)},${car.position.z.toFixed(1)}`);
  assert.equal(result.progress, result.total);
  assert.equal(offRoadFrames, 0, "pursuit driver stays on the paved circuit");
  console.log(`Circuit feasibility: ${result.totalTime.toFixed(2)} s, all ${result.total} crossings, no grass excursions.`);
});

test("actual steering completes the slalom at 6.5 m/s without reversing or cone penalties", async () => {
  const browser = await boot(); browser.selectMode("slalom"); browser.start(); browser.frame(181);
  const { car, park, state } = browser.drive;
  const firstCone = park.conePositions[0];
  const lastCone = park.conePositions.at(-1);
  const coneSpacing = Math.abs(park.conePositions[1].z - firstCone.z);
  const startGate = park.slalomGates[0];
  const finishGate = park.slalomGates.at(-1);
  let drivenDistance = 0;
  let frameCount = 0;
  let peakSpeed = 0;
  let offRoadFrames = 0;
  let reverseFrames = 0;
  for (; frameCount < 3000 && browser.drive.challenge.snapshot().phase !== "finished"; frameCount += 1) {
    // Follow a continuous weave so the rear of the car clears each cone before
    // the next change of direction. Smooth entry/exit join the +/-3.6 m weave.
    const targetZ = car.position.z - 3.5;
    let offset = -3.6 * Math.cos(Math.PI * (firstCone.z - targetZ) / coneSpacing);
    if (targetZ > firstCone.z) {
      const phase = THREE.MathUtils.clamp((startGate.z - targetZ) / (startGate.z - firstCone.z), 0, 1);
      offset = -3.6 * (1 - Math.cos(phase * Math.PI)) / 2;
    } else if (targetZ < lastCone.z) {
      const phase = THREE.MathUtils.clamp((lastCone.z - targetZ) / (lastCone.z - finishGate.z), 0, 1);
      offset = -3.6 * (1 + Math.cos(phase * Math.PI)) / 2;
    }
    const previous = car.position.clone();
    steerToward(browser, { x: firstCone.x + offset, z: targetZ }, 6.5, 0.012);
    browser.frame();
    drivenDistance += previous.distanceTo(car.position);
    peakSpeed = Math.max(peakSpeed, state.speed);
    if (state.speed < -1e-6 || car.position.z > previous.z + 1e-6) reverseFrames += 1;
    if (!browser.drive.isOnRoad(car.position.x, car.position.z)) offRoadFrames += 1;
  }
  browser.release();
  const result = browser.drive.challenge.snapshot();
  const averageSpeed = drivenDistance / (frameCount * STEP);
  assert.equal(result.phase, "finished", `slalom progress ${result.progress}/${result.total} at ${car.position.x.toFixed(1)},${car.position.z.toFixed(1)}, ${result.hits} hits`);
  assert.equal(result.hits, 0, `clean route should be feasible, received ${result.hits} cone hits`);
  assert.equal(reverseFrames, 0, "every slalom movement is forward toward the finish");
  assert.equal(offRoadFrames, 0, "the faster slalom fits the paved corridor");
  assert.ok(peakSpeed >= 6.3, `peak speed ${peakSpeed.toFixed(2)} m/s reaches the 6.5 m/s cruise`);
  assert.ok(averageSpeed >= 2 * 2.8, `average ${averageSpeed.toFixed(2)} m/s must exceed twice the old 2.8 m/s cruise`);
  console.log(`Slalom feasibility: ${result.totalTime.toFixed(2)} s, ${result.progress} gates, ${averageSpeed.toFixed(2)} m/s average, no reverse, grass or cone hits.`);
});

test("all four launch ramps and the double-jump flow line work with forward throttle", async () => {
  const coveredLaunches = new Set();
  const expectedLaunches = new Set();
  for (const routeId of ["big-air", "flow-line", "warm-up"]) {
    const browser = await boot(); browser.selectMode("jump"); browser.start();
    const { park, state, car } = browser.drive;
    const route = park.jumpRoutes.find((candidate) => candidate.id === routeId);
    assert.ok(route, `${routeId} has a shared park route`);
    park.ramps.filter((ramp) => ramp.launch).forEach((ramp) => expectedLaunches.add(ramp.id));
    browser.button(`[data-jump-route="${route.id}"]`).click();
    assert.ok(Math.hypot(car.position.x - route.x, car.position.z - route.z) < 1e-8, `${routeId} picker selects the shared park spawn`);
    assert.equal(state.yaw, route.yaw);
    assert.equal(state.speed, 0);
    assert.equal(browser.button(`[data-jump-route="${route.id}"]`).getAttribute("aria-pressed"), "true");
    browser.key("keydown", "KeyW");
    const launches = [];
    const landings = [];
    let reverseFrames = 0;
    let offRoadFrames = 0;
    let stableRollout = 0;
    for (let frame = 0; frame < 1200; frame += 1) {
      const wasAirborne = state.airborne;
      const previous = car.position.clone();
      browser.frame();
      if (state.speed < -1e-6 || car.position.z > previous.z + 1e-6) reverseFrames += 1;
      if (!browser.drive.isOnRoad(car.position.x, car.position.z)) offRoadFrames += 1;
      if (!wasAirborne && state.airborne) {
        const contact = browser.drive.activeJumpRampAt(state.rearAxle.x, state.rearAxle.z);
        assert.ok(contact?.ramp.launch, `${routeId} takeoff at ${state.rearAxle.x.toFixed(2)},${state.rearAxle.z.toFixed(2)} is from a launch ramp`);
        launches.push(contact.ramp.id);
        coveredLaunches.add(contact.ramp.id);
      }
      if (wasAirborne && !state.airborne) {
        const contact = browser.drive.activeJumpRampAt(state.rearAxle.x, state.rearAxle.z);
        landings.push({ ramp: contact?.ramp.id || "runway", z: state.rearAxle.z, height: state.rearAxle.y });
      }
      if (landings.length === route.ramps.length && !state.airborne) {
        stableRollout += 1;
        if (stableRollout === 30) break;
      }
    }
    browser.release();
    assert.deepEqual(launches, route.ramps, `${routeId} launches every ramp exactly once and in route order`);
    assert.equal(landings.length, route.ramps.length, `${routeId} lands after every launch`);
    assert.equal(browser.drive.challenge.snapshot().jumpCount, route.ramps.length, `${routeId} records each completed jump`);
    assert.equal(stableRollout, 30, `${routeId} has a stable forward rollout after its final landing`);
    assert.equal(reverseFrames, 0, `${routeId} requires no reverse or repositioning between jumps`);
    assert.equal(offRoadFrames, 0, `${routeId} keeps the complete jump and rollout above its paved runway`);
    console.log(`${route.name} feasibility: ${launches.join(" → ")}; ${landings.length} landings, forward throttle only.`);
    browser.restart();
    assert.ok(Math.hypot(car.position.x - route.x, car.position.z - route.z) < 1e-8, `${routeId} restart retains the selected course spawn`);
    assert.equal(state.speed, 0);
    assert.equal(state.airborne, false);
    assert.equal(browser.drive.challenge.snapshot().jumpCount, 0);
  }
  assert.equal(expectedLaunches.size, 4, "the park has four distinct launch ramps");
  assert.deepEqual([...coveredLaunches].sort(), [...expectedLaunches].sort(), "every physical launch ramp is driven and landed");
});

test("unboosted straight jump lands on the descending ramp and completes its rollout", async () => {
  const browser = await boot(); browser.selectMode("jump"); browser.start();
  browser.key("keydown", "KeyW");
  let tookOff = false;
  let firstLanding = null;
  let peak = 0;
  for (let frame = 0; frame < 900; frame += 1) {
    const before = browser.drive.state.airborne;
    browser.frame();
    tookOff ||= browser.drive.state.airborne;
    peak = Math.max(peak, browser.drive.car.position.y);
    if (before && !browser.drive.state.airborne) {
      firstLanding = { x: browser.drive.state.rearAxle.x, z: browser.drive.state.rearAxle.z, height: browser.drive.state.rearAxle.y };
      break;
    }
  }
  assert.ok(tookOff && firstLanding, "plain throttle makes a complete jump");
  const landingContact = browser.drive.activeJumpRampAt(firstLanding.x, firstLanding.z);
  assert.equal(landingContact?.ramp.launch, false, `unboosted landing ${JSON.stringify(firstLanding)} should meet the descending ramp`);
  assert.ok(Math.abs(firstLanding.height - landingContact.height) < 0.05);
  browser.frame(50);
  browser.release();
  const result = browser.drive.challenge.snapshot();
  assert.equal(result.jumpCount, 1, "the descending rollout must not count a second jump");
  assert.ok(result.lastJump.distance > 8 && result.lastJump.distance < 32);
  console.log(`Unboosted jump: ${result.lastJump.distance.toFixed(2)} m, ${result.lastJump.airTime.toFixed(2)} s, peak ${peak.toFixed(2)} m; descending-ramp landing.`);
});

test("real scene boots, queues early launch and survives mode/reset/exit/language lifecycle", async () => {
  const browser = await boot({ queued: true });
  assert.equal(browser.document.documentElement.lang, "en");
  assert.equal(browser.drive.state.started, true);
  assert.deepEqual(browser.renderer.size, [1280, 720]);
  for (const mode of ["free", "race", "slalom", "jump"]) {
    browser.selectMode(mode);
    assert.equal(browser.drive.challenge.snapshot().mode, mode);
    assertAtSpawn(browser, mode);
    browser.frame(mode === "race" || mode === "slalom" ? 190 : 2);
    browser.key("keydown", "KeyW");
    browser.frame(12);
    assert.ok(browser.drive.state.speed > 0);
    browser.restart();
    assertAtSpawn(browser, mode);
  }
  browser.button('[data-lang="ko"]').click();
  assert.equal(browser.storage.get("vodLanguage"), "ko");
  assert.equal(browser.storage.get("data-city-language"), "ko");
  browser.byId.get("exit-drive").click();
  assert.equal(browser.drive.state.started, false);
  assert.equal(browser.byId.get("world").parentElement, browser.byId.get("city-canvas-mount"));
  assert.equal(browser.document.activeElement, browser.byId.get("start-button"));
  assert.deepEqual(browser.renderer.size, [640, 360]);
  browser.frame();
  const draws = browser.renderer.renders;
  browser.frame(30);
  assert.equal(browser.renderer.renders, draws, "lobby does not redraw continuously");
  browser.byId.get("world").dispatch("webglcontextrestored");
  browser.frame();
  assert.equal(browser.renderer.renders, draws + 1);
});

test("countdown freezes the actual vehicle even with throttle held", async () => {
  const browser = await boot();
  browser.selectMode("race"); browser.start();
  browser.key("keydown", "KeyW");
  browser.frame(179);
  assert.equal(browser.drive.challenge.snapshot().phase, "countdown");
  assertAtSpawn(browser, "race");
  browser.frame(3);
  assert.equal(browser.drive.challenge.snapshot().phase, "running");
  assert.ok(browser.drive.state.speed > 0);
  const target = browser.button('[data-lang="ko"]');
  const event = browser.key("keydown", "Space", target);
  assert.ok(!event.defaultPrevented);
  assert.equal(browser.drive.inputs.drift, false);
  browser.key("keyup", "KeyW", target);
  assert.equal(browser.drive.inputs.forward, false);
});

test("browser Back restarts a timed attempt consistently with its reset vehicle", async () => {
  const browser = await boot(); browser.selectMode("race"); browser.start();
  browser.frame(181);
  browser.key("keydown", "KeyW"); browser.frame(90); browser.release();
  assert.ok(browser.drive.challenge.snapshot().elapsed > 1);
  browser.emit("pageshow", { persisted: true });
  assertAtSpawn(browser, "race");
  const returned = browser.drive.challenge.snapshot();
  assert.equal(returned.phase, "countdown", "respawn must also restart the challenge countdown");
  assert.equal(returned.elapsed, 0);
  assert.equal(returned.progress, 0);
});

test("straight jump run takes off, lands and records actual flight distance", async () => {
  const browser = await boot();
  browser.selectMode("jump"); browser.start();
  browser.key("keydown", "KeyW"); browser.key("keydown", "ShiftLeft");
  let tookOff = false;
  let peak = 0;
  for (let frame = 0; frame < 900; frame += 1) {
    browser.frame();
    tookOff ||= browser.drive.state.airborne;
    peak = Math.max(peak, browser.drive.car.position.y);
    if (browser.drive.challenge.snapshot().jumpCount > 0) break;
  }
  browser.release();
  const result = browser.drive.challenge.snapshot();
  assert.ok(tookOff, "real throttle crosses launch ramp");
  assert.ok(peak > 2, `jump peak ${peak.toFixed(2)} m`);
  assert.equal(result.jumpCount, 1, "one takeoff produces one landing result");
  assert.ok(result.lastJump.distance > 8, `flight distance ${result.lastJump?.distance}`);
  assert.ok(result.lastJump.airTime > 0.5);
  assert.equal(result.bestJump, result.lastJump.distance);
  browser.frame(6);
  assert.equal(JSON.parse(browser.storage.get("data-drive-records-v2")).jump, result.bestJump, "landing best is persisted by the HUD update");
  console.log(`Jump integration: ${result.lastJump.distance.toFixed(2)} m, ${result.lastJump.airTime.toFixed(2)} s, peak ${peak.toFixed(2)} m.`);
});

test("park uses its expanded bounds and applies grass drag through frame updates", async () => {
  const browser = await boot();
  browser.selectMode("jump"); browser.start();
  const { park, state, car, vehicle } = browser.drive;
  assert.ok(park.bounds.maxX > 54 && park.bounds.maxZ > 54 && park.bounds.minX < -54 && park.bounds.minZ < -54);
  // Set up two stationary fixtures, then use real throttle frames to compare
  // road/grass dynamics; no physics calculation is replaced by the test.
  function place(x, z, yaw = 0) {
    browser.release();
    browser.drive.resetCar();
    state.yaw = yaw;
    state.rearAxle.set(x - Math.sin(yaw) * vehicle.rearAxleOffset, 0, z + Math.cos(yaw) * vehicle.rearAxleOffset);
    car.position.set(x, 0, z);
    browser.frame(10);
  }
  const runway = park.spawns.jump;
  place(runway.x, runway.z, runway.yaw);
  browser.key("keydown", "KeyW"); browser.frame(90);
  const roadSpeed = state.speed;
  let grass;
  for (let x = park.bounds.minX + 8; x < park.bounds.maxX - 8 && !grass; x += 4) {
    for (let z = park.bounds.minZ + 20; z < park.bounds.maxZ - 8; z += 4) {
      if (![0, 5, 10].every((distance) => !browser.drive.isOnRoad(x, z - distance))) continue;
      if (park.colliders.some((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + 15)) continue;
      grass = { x, z }; break;
    }
  }
  assert.ok(grass, "park has unobstructed grass for drag comparison");
  place(grass.x, grass.z);
  browser.key("keydown", "KeyW"); browser.frame(90);
  const grassSpeed = state.speed;
  assert.ok(grassSpeed < roadSpeed * 0.8, `grass ${grassSpeed.toFixed(2)} < road ${roadSpeed.toFixed(2)}`);
  assert.ok(Math.abs(car.position.x) > 54 || Math.abs(car.position.z) > 54, "vehicle remains beyond the old city clamp");
});

test("grounded lake contacts and deep airborne landings recover onto shore", async () => {
  const browser = await boot(); browser.start();
  const { park, car, state } = browser.drive;
  const lake = park.lake;
  assert.ok(lake, "park exposes the actual lake footprint");
  function assertOnShore(label) {
    assert.ok([car.position.x, car.position.y, car.position.z, state.speed].every(Number.isFinite), `${label} has finite position and speed`);
    const waterRadius = Math.hypot((car.position.x - lake.x) / lake.radiusX, (car.position.z - lake.z) / lake.radiusZ);
    assert.ok(waterRadius > 1.08, `${label} clears the waterline and its visible lobes: ${waterRadius.toFixed(4)}`);
    for (const obstacle of park.colliders) {
      assert.ok(Math.hypot(car.position.x - obstacle.x, car.position.z - obstacle.z) >= obstacle.radius + 0.98 - 1e-6, `${label} clears the shoreline and scenery colliders`);
    }
  }
  const contacts = [
    { label: "exact center", x: lake.x, z: lake.z, yaw: 0 },
    { label: "near center", x: lake.x + 1e-10, z: lake.z - 1e-10, yaw: Math.PI / 2 },
    { label: "deep eastern interior", x: lake.x + 11, z: lake.z + 6, yaw: -Math.PI / 2 },
    { label: "deep western interior", x: lake.x - 8, z: lake.z - 15, yaw: Math.PI / 2 },
  ];
  for (const contact of contacts) {
    browser.release();
    browser.drive.resetCar(contact);
    browser.frame();
    assert.equal(state.airborne, false);
    assertOnShore(`Grounded ${contact.label}`);
    // Keep steering into the lake after recovery; real throttle and boost
    // cannot move a grounded car back through the shoreline.
    state.yaw = Math.atan2(lake.x - car.position.x, -(lake.z - car.position.z));
    state.rearAxle.set(
      car.position.x - Math.sin(state.yaw) * browser.drive.vehicle.rearAxleOffset,
      0,
      car.position.z + Math.cos(state.yaw) * browser.drive.vehicle.rearAxleOffset,
    );
    browser.key("keydown", "KeyW"); browser.key("keydown", "ShiftLeft");
    for (let frame = 0; frame < 150; frame += 1) {
      browser.frame();
      assertOnShore(`Inward throttle from ${contact.label}`);
    }
  }
  for (const contact of contacts.slice(0, 3)) {
    browser.release();
    browser.drive.resetCar(contact);
    state.airborne = true;
    state.rearAxle.y = car.position.y = 4;
    state.verticalVelocity = -2;
    // A stationary horizontal fixture isolates a genuine gravity-driven
    // landing well inside the rim, including its zero-radius singularity.
    browser.frame(4);
    assert.equal(state.airborne, true, `${contact.label} remains airborne above the lake`);
    assert.ok(Math.hypot(car.position.x - contact.x, car.position.z - contact.z) < 1e-7, "lake exclusion must not teleport a flying car");
    let landed = false;
    for (let frame = 0; frame < 180; frame += 1) {
      browser.frame();
      if (!state.airborne) { landed = true; break; }
      assert.ok(Math.hypot(car.position.x - contact.x, car.position.z - contact.z) < 1e-7, "deep airborne approach stays untouched until landing");
    }
    assert.ok(landed, `${contact.label} completes a gravity-driven landing`);
    assert.equal(state.rearAxle.y, 0);
    assertOnShore(`Landing at ${contact.label}`);
  }
});

test("lakeside visit clears driving state and ordinary restart returns to free spawn", async () => {
  const browser = await boot(); browser.start();
  const { state, car, park, inputs } = browser.drive;
  browser.key("keydown", "KeyW"); browser.key("keydown", "ShiftLeft");
  browser.frame(30);
  state.airborne = true;
  state.verticalVelocity = -2;
  browser.byId.get("scenic-visit").click();
  assert.ok(Math.hypot(car.position.x - park.scenicSpawn.x, car.position.z - park.scenicSpawn.z) < 1e-8);
  assert.equal(state.yaw, park.scenicSpawn.yaw);
  assert.equal(state.speed, 0);
  assert.equal(state.airborne, false);
  assert.equal(state.verticalVelocity, 0);
  assert.ok(Object.values(inputs).every((value) => value === false), "visit releases held controls");
  assert.equal(browser.document.activeElement, browser.byId.get("world"));
  browser.frame(30);
  assert.ok(Math.hypot(car.position.x - park.scenicSpawn.x, car.position.z - park.scenicSpawn.z) < 1e-8, "scenic spawn is stable and clear of colliders");
  browser.restart();
  assertAtSpawn(browser, "free");
  browser.selectMode("race");
  const before = browser.drive.challenge.snapshot();
  browser.byId.get("scenic-visit").click();
  assertAtSpawn(browser, "race");
  assert.equal(browser.drive.challenge.snapshot().phase, before.phase, "hidden scenic visit cannot interrupt a timed challenge");
});

test("portal dwell navigates only during free drive", async () => {
  const browser = await boot(); browser.start();
  function placeAtTerminal() {
    const { state, car, vehicle } = browser.drive;
    state.speed = 0; state.yaw = 0; state.rearAxle.set(-28, 0, -12 + vehicle.rearAxleOffset);
    car.position.set(-28, 0, -12);
  }
  for (const mode of ["race", "slalom", "jump"]) {
    browser.selectMode(mode); placeAtTerminal(); browser.frame(320);
    assert.equal(browser.navigations.length, 0, `${mode} cannot navigate to a dashboard`);
  }
  browser.selectMode("free"); placeAtTerminal(); browser.frame(100);
  assert.deepEqual(browser.navigations, ["dashboard.html?game=wuthering-waves"]);
});

test("slalom cone collision uses actual moving car and applies one penalty per cone", async () => {
  const browser = await boot(); browser.selectMode("slalom"); browser.start(); browser.frame(181);
  const { car, state, park } = browser.drive;
  const cone = [...park.coneMeshes].sort((a, b) => a.position.distanceTo(car.position) - b.position.distanceTo(car.position))[0];
  assert.ok(cone, "park exposes collidable cones");
  // Aim by actual steering and throttle, then stop once contact is recorded.
  browser.key("keydown", "KeyW");
  for (let frame = 0; frame < 1000 && !cone.userData.physics.knocked; frame += 1) {
    const targetYaw = Math.atan2(cone.position.x - car.position.x, -(cone.position.z - car.position.z));
    const error = Math.atan2(Math.sin(targetYaw - state.yaw), Math.cos(targetYaw - state.yaw));
    const forward = Math.hypot(cone.position.x - car.position.x, cone.position.z - car.position.z) > 4 || state.speed < 3;
    browser.key(forward ? "keydown" : "keyup", "KeyW");
    browser.key(error > 0.04 ? "keydown" : "keyup", "KeyD");
    browser.key(error < -0.04 ? "keydown" : "keyup", "KeyA");
    browser.frame();
  }
  browser.release();
  assert.ok(cone.userData.physics.knocked, "actual steering and motion reaches a cone");
  const result = browser.drive.challenge.snapshot();
  assert.ok(result.hits >= 1);
  assert.equal(result.penalty, result.hits * 2);
  assert.ok(Math.hypot(car.position.x - park.spawns.slalom.x, car.position.z - park.spawns.slalom.z) > 1);
  console.log(`Slalom integration: ${result.hits} cone hits, ${result.penalty} s penalty.`);
});
