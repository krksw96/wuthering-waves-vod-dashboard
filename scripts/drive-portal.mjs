const fatalError = document.querySelector("#fatal-error");
const bootStartButton = document.querySelector("#start-button");
const bootLoadingCopy = document.querySelector("#loading-copy");
const musicToggle = document.querySelector("#music-toggle");
const youtubeAudio = document.querySelector("#youtube-audio");
const MUSIC_VIDEO_ID = "eg_yMhrRD0A";
const translations = {
  ko: {
    title: "DATA DRIVE — 게임 YouTube 데이터 시티",
    description: "자동차를 운전해 명조, 이환, 젠레스 존 제로 YouTube 데이터 구역을 탐험하세요.",
    worldAria: "세 게임의 데이터 구역을 자동차로 탐험하는 3D 화면",
    quickLinksAria: "대시보드 바로가기", languageAria: "언어 변경", controlsAria: "조작 방법",
    startDescription: "비 내리는 네온 시티를 직접 운전해 명조, 이환, 젠레스 존 제로 구역을 찾아가세요. 빛나는 데이터 포털 안에 잠시 머무르면 해당 대시보드가 열립니다.",
    startButton: "시동 걸기", accelerator: "액셀", brakeReverse: "브레이크 · 후진", steering: "앞바퀴 조향",
    boost: "부스터", resetCar: "차량 복귀", resetShort: "복귀", driveHint: "액셀·브레이크", cameraView: "드래그·휠 시야",
    loadingCity: "데이터 시티를 불러오는 중…", loadingRequested: "준비되는 즉시 자동으로 출발합니다",
    ready: "준비 완료 · 시동을 걸어 출발하세요", departing: "출발합니다", loadingButton: "도시 불러오는 중…",
    nearestDistrict: "NEAREST DATA DISTRICT", calculating: "거리 계산 중", portalHint: "원 안에 머무르면 대시보드가 열립니다",
    musicOn: "배경 음악 켜짐", musicOff: "배경 음악 꺼짐",
    games: { "wuthering-waves": "명조", "neverness-to-everness": "이환", "zenless-zone-zero": "젠레스" },
  },
  zh: {
    title: "DATA DRIVE — 游戏 YouTube 数据城",
    description: "驾驶汽车探索鸣潮、异环和绝区零的 YouTube 数据区域。",
    worldAria: "驾驶汽车探索三个游戏数据区域的 3D 场景",
    quickLinksAria: "数据看板快捷入口", languageAria: "切换语言", controlsAria: "驾驶操作",
    startDescription: "驾驶汽车穿过雨夜霓虹都市，前往鸣潮、异环和绝区零数据区。在发光传送门内停留片刻即可打开相应数据看板。",
    startButton: "启动引擎", accelerator: "油门", brakeReverse: "刹车 · 倒车", steering: "前轮转向",
    boost: "加速器", resetCar: "车辆复位", resetShort: "复位", driveHint: "油门·刹车", cameraView: "拖动·滚轮视角",
    loadingCity: "正在加载数据城…", loadingRequested: "准备完成后将自动出发",
    ready: "准备完成 · 启动引擎即可出发", departing: "出发", loadingButton: "正在加载城市…",
    nearestDistrict: "最近的数据区域", calculating: "正在计算距离", portalHint: "停留在圆环内即可打开数据看板",
    musicOn: "背景音乐已开启", musicOff: "背景音乐已关闭",
    games: { "wuthering-waves": "鸣潮", "neverness-to-everness": "异环", "zenless-zone-zero": "绝区零" },
  },
  en: {
    title: "DATA DRIVE — Game YouTube Data City",
    description: "Drive through the YouTube data districts for Wuthering Waves, NTE, and ZZZ.",
    worldAria: "A 3D driving world connecting three game data districts",
    quickLinksAria: "Dashboard shortcuts", languageAria: "Change language", controlsAria: "Driving controls",
    startDescription: "Drive through the rain-soaked neon city to the Wuthering Waves, NTE, and ZZZ districts. Stay inside a glowing portal to open its dashboard.",
    startButton: "START ENGINE", accelerator: "Accelerate", brakeReverse: "Brake · Reverse", steering: "Front-wheel steering",
    boost: "Boost", resetCar: "Reset car", resetShort: "Reset", driveHint: "Accelerate·Brake", cameraView: "Drag·wheel view",
    loadingCity: "Loading Data City…", loadingRequested: "Departure begins as soon as the city is ready",
    ready: "Ready · Start the engine to depart", departing: "Departing", loadingButton: "Loading city…",
    nearestDistrict: "NEAREST DATA DISTRICT", calculating: "Calculating distance", portalHint: "Stay inside the ring to open the dashboard",
    musicOn: "Background music on", musicOff: "Background music off",
    games: { "wuthering-waves": "Wuthering Waves", "neverness-to-everness": "NTE", "zenless-zone-zero": "ZZZ" },
  },
};
let currentLanguage = readPreference("data-city-language", "ko");
let musicWanted = readPreference("data-city-music", "on") !== "off";
const bootState = { launch: null, requested: false };

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Storage can be unavailable in private contexts. */ }
}

function copy() {
  return translations[currentLanguage] || translations.ko;
}

function updateMusicButton() {
  if (!musicToggle) return;
  musicToggle.textContent = musicWanted ? "♫ ON" : "♫ OFF";
  musicToggle.classList.toggle("muted", !musicWanted);
  musicToggle.setAttribute("aria-pressed", String(musicWanted));
  musicToggle.setAttribute("aria-label", musicWanted ? copy().musicOn : copy().musicOff);
}

function startMusic() {
  if (!musicWanted || !youtubeAudio || youtubeAudio.src) return;
  const origin = encodeURIComponent(location.origin);
  youtubeAudio.src = `https://www.youtube-nocookie.com/embed/${MUSIC_VIDEO_ID}?autoplay=1&loop=1&playlist=${MUSIC_VIDEO_ID}&controls=0&playsinline=1&rel=0&origin=${origin}`;
}

function stopMusic() {
  if (youtubeAudio) youtubeAudio.removeAttribute("src");
}

function applyLanguage(language, persist = true) {
  currentLanguage = translations[language] ? language : "ko";
  const languageCopy = copy();
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : currentLanguage;
  document.title = languageCopy.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", languageCopy.description);
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = languageCopy[element.dataset.i18n];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const value = languageCopy[element.dataset.i18nAria];
    if (value) element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-game-label]").forEach((element) => {
    element.textContent = languageCopy.games[element.dataset.gameLabel];
  });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    const active = button.dataset.lang === currentLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateMusicButton();
  if (persist) writePreference("data-city-language", currentLanguage);
  dispatchEvent(new CustomEvent("datacitylanguagechange", { detail: { language: currentLanguage } }));
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});

musicToggle?.addEventListener("click", () => {
  musicWanted = !musicWanted;
  writePreference("data-city-music", musicWanted ? "on" : "off");
  updateMusicButton();
  if (musicWanted && document.body.classList.contains("started")) startMusic();
  else stopMusic();
});

applyLanguage(currentLanguage, false);

bootStartButton?.addEventListener("click", () => {
  if (bootState.launch) {
    bootState.launch();
    return;
  }
  bootState.requested = true;
  bootStartButton.textContent = copy().loadingButton;
  bootStartButton.setAttribute("aria-busy", "true");
  if (bootLoadingCopy) bootLoadingCopy.textContent = copy().loadingRequested;
});

try {
  const THREE = await import("./vendor/three.module.min.js");
  initDataCity(THREE);
} catch (error) {
  console.error("Failed to start the 3D data city", error);
  bootStartButton?.removeAttribute("aria-busy");
  if (bootStartButton) bootStartButton.textContent = "3D 실행 불가 · 바로가기 이용";
  fatalError?.classList.add("visible");
}

function initDataCity(THREE) {
  const canvas = document.querySelector("#world");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  const loadingCopy = document.querySelector("#loading-copy");
  const speedValue = document.querySelector("#speed-value");
  const gear = document.querySelector("#gear");
  const missionCard = document.querySelector("#mission-card");
  const missionName = document.querySelector("#mission-name");
  const missionDistance = document.querySelector("#mission-distance");
  const mapCar = document.querySelector("#map-car");
  const zonePrompt = document.querySelector("#zone-prompt");
  const zonePromptTitle = document.querySelector("#zone-prompt-title");
  const liveStatus = document.querySelector("#live-status");

  if (!canvas || !startButton) throw new Error("Required lobby elements are missing");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030c12);
  scene.fog = new THREE.FogExp2(0x07171d, 0.018);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 210);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0x66b8c2, 0x130f22, 1.45));
  const moonLight = new THREE.DirectionalLight(0xbcecff, 2.1);
  moonLight.position.set(-18, 30, 14);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.left = -48;
  moonLight.shadow.camera.right = 48;
  moonLight.shadow.camera.top = 48;
  moonLight.shadow.camera.bottom = -48;
  scene.add(moonLight);
  const cyanStreetGlow = new THREE.PointLight(0x36d6df, 16, 34, 1.7);
  cyanStreetGlow.position.set(-7, 6, 2);
  scene.add(cyanStreetGlow);
  const pinkStreetGlow = new THREE.PointLight(0xff477e, 12, 31, 1.8);
  pinkStreetGlow.position.set(10, 5, 12);
  scene.add(pinkStreetGlow);

  const zones = [
    {
      id: "wuthering-waves",
      shortName: copy().games["wuthering-waves"],
      name: "명조 데이터 구역",
      position: new THREE.Vector3(-28, 0, -12),
      color: 0x65e8de,
      cssColor: "#65e8de",
      href: "dashboard.html?game=wuthering-waves",
      symbol: "WAVE ARCHIVE",
    },
    {
      id: "neverness-to-everness",
      shortName: copy().games["neverness-to-everness"],
      name: "이환 데이터 구역",
      position: new THREE.Vector3(28, 0, -12),
      color: 0xff5c9f,
      cssColor: "#ff5c9f",
      href: "dashboard.html?game=neverness-to-everness",
      symbol: "NEON CITY",
    },
    {
      id: "zenless-zone-zero",
      shortName: copy().games["zenless-zone-zero"],
      name: "젠레스 존 제로 데이터 구역",
      position: new THREE.Vector3(0, 0, 33),
      color: 0xffd84d,
      cssColor: "#ffd84d",
      href: "dashboard.html?game=zenless-zone-zero",
      symbol: "HOLLOW DEPOT",
    },
  ];

  const zoneName = (zone) => {
    const gameName = copy().games[zone.id];
    if (currentLanguage === "zh") return `${gameName}数据区`;
    if (currentLanguage === "en") return `${gameName} Data District`;
    return `${gameName}${zone.id === "zenless-zone-zero" ? " 존 제로" : ""} 데이터 구역`;
  };
  const distanceCopy = (distance) => {
    const meters = Math.max(0, Math.round(distance * 10));
    if (currentLanguage === "zh") return `剩余 ${meters}m`;
    if (currentLanguage === "en") return `${meters}m remaining`;
    return `${meters}m 남음`;
  };
  const portalCopy = (zone, opening = false) => {
    const name = zoneName(zone);
    if (currentLanguage === "zh") return opening ? `正在打开${name}…` : `正在进入${name}传送门`;
    if (currentLanguage === "en") return opening ? `Opening ${name}…` : `Entering ${name} portal`;
    return opening ? `${name} 여는 중…` : `${name} 포털 진입 중`;
  };
  const nearestCopy = (zone) => {
    const name = zoneName(zone);
    if (currentLanguage === "zh") return `最近目的地已变更为${name}。`;
    if (currentLanguage === "en") return `Nearest destination changed to ${name}.`;
    return `가장 가까운 목적지가 ${name}(으)로 변경되었습니다.`;
  };

  const world = new THREE.Group();
  const atmosphere = { rain: null, hologram: null, petals: null, lanterns: [], clouds: [] };
  // Keep the city sparse and low so architecture never overwhelms the car.
  // These heights are two thirds of the previous compact-diorama buildings.
  const architecture = { minHeight: 1.83, maxHeight: 2.5 };
  scene.add(world);
  buildGround();
  buildSkyline();
  zones.forEach((zone, index) => buildDistrict(zone, index));

  const { car, carBody, wheelSpins, frontWheelPivots, boostTrails } = buildCar();
  scene.add(car);
  const proximityFadeMeshes = [];
  const proximityFadeRayMeshes = [];
  const fadeWorldPosition = new THREE.Vector3();
  const fadeWorldScale = new THREE.Vector3();
  const fadeRayTarget = new THREE.Vector3();
  const fadeRayDirection = new THREE.Vector3();
  const fadeRaycaster = new THREE.Raycaster();
  const directSightOccluders = new Set();
  prepareProximityFades();

  const inputs = { forward: false, backward: false, left: false, right: false, boost: false };
  const vehicle = {
    wheelBase: 2.27,
    trackWidth: 2.24,
    rearAxleOffset: 1.12,
    wheelRadius: 0.42,
    maxForwardSpeed: 18,
    boostedMaxForwardSpeed: 30,
    maxReverseSpeed: 7,
    fixedStep: 1 / 120,
  };
  const state = {
    started: false,
    speed: 0,
    yaw: 0,
    yawRate: 0,
    acceleration: 0,
    steeringAngle: 0,
    boostUntil: 0,
    reverseHold: 0,
    wheelRotation: 0,
    physicsAccumulator: 0,
    rearAxle: new THREE.Vector3(0, 0, vehicle.rearAxleOffset),
    elapsed: 0,
    entryProgress: 0,
    activePortal: null,
    nearestZone: null,
    navigating: false,
  };
  const clock = new THREE.Clock();
  const cameraPosition = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const targetCameraPosition = new THREE.Vector3();
  const targetCameraLook = new THREE.Vector3();
  const right = new THREE.Vector3();
  const cameraOrbit = {
    yawOffset: 0,
    pitch: 0.866,
    distance: 10.5,
    targetDistance: 10.5,
    minDistance: 5.5,
    maxDistance: 24,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  };

  resetCar();
  cameraPosition.set(0, 11.8, 14);
  cameraTarget.set(0, 0.9, -2.4);
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  const launchDrive = () => {
    if (state.started) return;
    state.started = true;
    document.body.classList.add("started");
    startScreen.classList.add("hidden");
    startButton.removeAttribute("aria-busy");
    startMusic();
    canvas.focus();
    clock.getDelta();
  };
  bootState.launch = launchDrive;
  startButton.disabled = false;
  startButton.removeAttribute("aria-busy");
  loadingCopy.textContent = bootState.requested ? copy().departing : copy().ready;
  if (bootState.requested) launchDrive();

  const keyMap = new Map([
    ["KeyW", "forward"], ["ArrowUp", "forward"],
    ["KeyS", "backward"], ["ArrowDown", "backward"],
    ["KeyA", "left"], ["ArrowLeft", "left"],
    ["KeyD", "right"], ["ArrowRight", "right"],
  ]);

  addEventListener("keydown", (event) => {
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      inputs.boost = true;
      state.boostUntil = performance.now() + 280;
      event.preventDefault();
    }
    if (keyMap.has(event.code)) {
      inputs[keyMap.get(event.code)] = true;
      event.preventDefault();
    }
    if (event.code === "KeyR" && !event.repeat) resetCar();
    if ((event.code === "Enter" || event.code === "Space") && !state.started) startButton.click();
  });
  addEventListener("keyup", (event) => {
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      inputs.boost = false;
      event.preventDefault();
      return;
    }
    if (!keyMap.has(event.code)) return;
    inputs[keyMap.get(event.code)] = false;
    event.preventDefault();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (!state.started || event.button !== 0) return;
    cameraOrbit.dragging = true;
    cameraOrbit.pointerId = event.pointerId;
    cameraOrbit.lastX = event.clientX;
    cameraOrbit.lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
    document.body.classList.add("camera-dragging");
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!cameraOrbit.dragging || event.pointerId !== cameraOrbit.pointerId) return;
    const movementX = event.clientX - cameraOrbit.lastX;
    const movementY = event.clientY - cameraOrbit.lastY;
    cameraOrbit.lastX = event.clientX;
    cameraOrbit.lastY = event.clientY;
    cameraOrbit.yawOffset -= movementX * 0.006;
    cameraOrbit.yawOffset = Math.atan2(Math.sin(cameraOrbit.yawOffset), Math.cos(cameraOrbit.yawOffset));
    cameraOrbit.pitch = THREE.MathUtils.clamp(cameraOrbit.pitch + movementY * 0.0045, 0.28, 1.22);
    event.preventDefault();
  });
  const releaseCameraDrag = (event) => {
    if (!cameraOrbit.dragging || event.pointerId !== cameraOrbit.pointerId) return;
    cameraOrbit.dragging = false;
    cameraOrbit.pointerId = null;
    document.body.classList.remove("camera-dragging");
  };
  canvas.addEventListener("pointerup", releaseCameraDrag);
  canvas.addEventListener("pointercancel", releaseCameraDrag);
  canvas.addEventListener("lostpointercapture", releaseCameraDrag);
  canvas.addEventListener("wheel", (event) => {
    if (!state.started) return;
    const deltaScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const wheelDelta = THREE.MathUtils.clamp(event.deltaY * deltaScale, -240, 240);
    cameraOrbit.targetDistance = THREE.MathUtils.clamp(
      cameraOrbit.targetDistance + wheelDelta * 0.018,
      cameraOrbit.minDistance,
      cameraOrbit.maxDistance,
    );
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("dblclick", () => {
    cameraOrbit.yawOffset = 0;
    cameraOrbit.pitch = 0.866;
    cameraOrbit.distance = 10.5;
    cameraOrbit.targetDistance = 10.5;
  });
  addEventListener("blur", () => {
    clearInputs();
    cameraOrbit.dragging = false;
    cameraOrbit.pointerId = null;
    document.body.classList.remove("camera-dragging");
  });
  document.addEventListener("visibilitychange", () => {
    clearInputs();
    clock.getDelta();
  });
  addEventListener("pageshow", (event) => {
    if (!event.persisted && !state.navigating) return;
    clearInputs();
    resetCar();
    state.navigating = false;
    state.nearestZone = null;
    cameraOrbit.yawOffset = 0;
    cameraOrbit.pitch = 0.866;
    cameraOrbit.distance = 10.5;
    cameraOrbit.targetDistance = 10.5;
    cameraPosition.set(0, 11.8, 14);
    cameraTarget.set(0, 0.9, -2.4);
    clock.getDelta();
    if (state.started && musicWanted) {
      stopMusic();
      startMusic();
    }
  });
  addEventListener("datacitylanguagechange", () => {
    loadingCopy.textContent = state.started ? copy().departing : copy().ready;
    zones.forEach((zone) => {
      zone.shortName = copy().games[zone.id];
      if (zone.label && zone.district) {
        const fadeIndex = proximityFadeMeshes.indexOf(zone.label);
        if (fadeIndex >= 0) proximityFadeMeshes.splice(fadeIndex, 1);
        zone.district.remove(zone.label);
        zone.label.material.map?.dispose();
        zone.label.material.dispose();
        zone.label = makeLabel(zone.shortName, zone.symbol, zone.cssColor);
        zone.label.position.set(0, 7.2, 0);
        zone.label.scale.set(8.4, 2.5, 1);
        zone.district.add(zone.label);
        registerProximityFade(zone.label);
      }
    });
    state.nearestZone = null;
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const press = (event) => {
      event.preventDefault();
      inputs[control] = true;
      button.classList.add("active");
      button.setPointerCapture?.(event.pointerId);
    };
    const release = (event) => {
      event.preventDefault();
      inputs[control] = false;
      button.classList.remove("active");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
  });

  renderer.setAnimationLoop(animate);

  function buildGround() {
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x07151a, roughness: 0.32, metalness: 0.72 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

    const grid = new THREE.GridHelper(120, 60, 0x3a8790, 0x16333d);
    grid.position.y = 0.018;
    grid.material.transparent = true;
    grid.material.opacity = 0.2;
    world.add(grid);

    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 0.14, 48),
      new THREE.MeshStandardMaterial({ color: 0x101d25, roughness: 0.3, metalness: 0.7 }),
    );
    center.position.y = 0.07;
    center.receiveShadow = true;
    world.add(center);

    zones.forEach((zone) => {
      buildRoad(new THREE.Vector3(0, 0, 2), zone.position, zone.color);
    });

    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(6.6, 6.75, 64),
      new THREE.MeshBasicMaterial({ color: 0x43c7d2, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.16;
    world.add(centerRing);
  }

  function buildRoad(start, end, color) {
    const delta = new THREE.Vector3().subVectors(end, start);
    const length = Math.hypot(delta.x, delta.z);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.09, length),
      new THREE.MeshStandardMaterial({ color: 0x0b151c, roughness: 0.24, metalness: 0.78 }),
    );
    road.position.copy(start).add(end).multiplyScalar(0.5);
    road.position.y = 0.07;
    road.rotation.y = Math.atan2(delta.x, delta.z);
    road.receiveShadow = true;
    world.add(road);

    const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x26353a, roughness: 0.42, metalness: 0.58 });
    [-1, 1].forEach((side) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, length), curbMaterial);
      curb.position.copy(road.position);
      const offset = new THREE.Vector3(Math.cos(road.rotation.y), 0, -Math.sin(road.rotation.y)).multiplyScalar(side * 3.15);
      curb.position.add(offset);
      curb.position.y = 0.13;
      curb.rotation.y = road.rotation.y;
      world.add(curb);
    });

    const stripeMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 });
    const steps = Math.max(3, Math.floor(length / 4));
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 1.25), stripeMaterial);
      stripe.position.lerpVectors(start, end, t);
      stripe.position.y = 0.14;
      stripe.rotation.y = road.rotation.y;
      world.add(stripe);
    }

    const puddleMaterial = new THREE.MeshBasicMaterial({ color: 0x77dbe6, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (let index = 1; index < 5; index += 1) {
      const puddle = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + (index % 2), 0.65), puddleMaterial);
      puddle.position.lerpVectors(start, end, index / 5);
      puddle.position.y = 0.15;
      puddle.position.x += index % 2 ? 1.45 : -1.35;
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = -road.rotation.y;
      world.add(puddle);
    }
  }

  function buildSkyline() {
    const random = seededRandom(8626);
    const buildingMaterials = [0x12232c, 0x1c202d, 0x201b2b, 0x163039].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.52 }));
    const neonColors = [0x4ee8e2, 0xff537f, 0x9f7bff, 0xffb936];
    for (let index = 0; index < 25; index += 1) {
      const x = random() * 106 - 53;
      const z = random() * 106 - 53;
      if (Math.hypot(x, z) < 13.5 || Math.hypot(x - 14.5, z + 51) < 11 || distanceToAnyRoad(x, z) < 5.7 || zones.some((zone) => Math.hypot(x - zone.position.x, z - zone.position.z) < 11.5)) continue;
      const width = 2.4 + random() * 4.8;
      const depth = 2.4 + random() * 4.6;
      const height = architecture.minHeight + random() * (architecture.maxHeight - architecture.minHeight);
      const building = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterials[index % buildingMaterials.length]);
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      building.add(body);

      const neon = neonColors[index % neonColors.length];
      const stripMaterial = new THREE.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 2.3, roughness: 0.25 });
      const floorCount = 2;
      for (let floor = 1; floor <= floorCount; floor += 1) {
        if (random() > 0.72) continue;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.035, 0.055, depth + 0.035), stripMaterial);
        strip.position.y = 1.2 + floor * (height - 2) / (floorCount + 1);
        building.add(strip);
      }
      if (index % 4 === 0) {
        const antennaHeight = 0.35 + random() * 0.3;
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, antennaHeight, 6), stripMaterial);
        antenna.position.y = height + antennaHeight / 2;
        building.add(antenna);
      }
      if (index % 3 === 0) {
        const verticalSign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.65, width * 0.24), Math.min(1.4, height * 0.45), 0.07), stripMaterial);
        verticalSign.position.set(width * (random() > 0.5 ? 0.28 : -0.28), height * 0.48, depth / 2 + 0.055);
        building.add(verticalSign);
      }
      building.position.set(x, 0, z);
      world.add(building);
    }

    buildElevatedRail();
    buildCentralBoulevard(random);
    buildMoonAndClouds(random);
    buildMegatower();
    buildServiceGarage();
    buildGarageShowroom();
    buildCherryMarket(random);
    buildLanternMarket(random);
    buildRooftopGarden(random);
    buildNightCityDetails(random);
    buildStreetFurniture(random);
    buildRain(random);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let index = 0; index < 320; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 45 + random() * 75;
      starPositions.push(Math.cos(angle) * radius, 22 + random() * 38, Math.sin(angle) * radius);
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbec7ff, size: 0.13, transparent: true, opacity: 0.68 }));
    scene.add(stars);
  }

  function buildElevatedRail() {
    const concrete = new THREE.MeshStandardMaterial({ color: 0x20292c, roughness: 0.64, metalness: 0.33 });
    const railGlow = new THREE.MeshStandardMaterial({ color: 0xff517f, emissive: 0xff294f, emissiveIntensity: 2.2, roughness: 0.28 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(110, 0.75, 4.2), concrete);
    deck.position.set(0, architecture.maxHeight - 0.38, -34);
    deck.castShadow = true;
    world.add(deck);
    const lightLine = new THREE.Mesh(new THREE.BoxGeometry(110, 0.1, 0.12), railGlow);
    lightLine.position.set(0, architecture.maxHeight - 0.77, -31.92);
    world.add(lightLine);
  }

  function buildCentralBoulevard(random) {
    const boulevard = new THREE.Group();
    const wetRoad = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.11, 48),
      new THREE.MeshStandardMaterial({ color: 0x071116, roughness: 0.14, metalness: 0.86 }),
    );
    wetRoad.position.set(0, 0.105, -25.5);
    wetRoad.receiveShadow = true;
    boulevard.add(wetRoad);

    const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x1a292d, roughness: 0.48, metalness: 0.48 });
    [-5.55, 5.55].forEach((x) => {
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 48), sidewalkMaterial);
      sidewalk.position.set(x, 0.15, -25.5);
      sidewalk.receiveShadow = true;
      boulevard.add(sidewalk);
    });

    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xb6e9ec, transparent: true, opacity: 0.5 });
    for (let z = -6; z > -49; z -= 5.4) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 2.3), laneMaterial);
      lane.position.set(0, 0.18, z);
      boulevard.add(lane);
    }

    const drainMaterial = new THREE.MeshStandardMaterial({ color: 0x080d10, roughness: 0.65, metalness: 0.8 });
    [-4.55, 4.55].forEach((x) => {
      const drain = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 47), drainMaterial);
      drain.position.set(x, 0.19, -25.5);
      boulevard.add(drain);
    });

    const shopBodyMaterials = [0x122027, 0x1c1c29, 0x152b2f].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.55 }));
    const glowMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xb5ffff, emissive: 0x44dae5, emissiveIntensity: 3.5, roughness: 0.18 }),
      new THREE.MeshStandardMaterial({ color: 0xff9ac6, emissive: 0xff397f, emissiveIntensity: 3.2, roughness: 0.18 }),
      new THREE.MeshStandardMaterial({ color: 0xffdf8d, emissive: 0xff9d32, emissiveIntensity: 2.8, roughness: 0.2 }),
    ];
    for (let index = 0; index < 4; index += 1) {
      [-1, 1].forEach((side) => {
        const width = 3.4 + random() * 1.5;
        const height = architecture.minHeight + random() * (architecture.maxHeight - architecture.minHeight);
        const depth = 3.8 + random() * 2.5;
        const z = -7.5 - index * 4.25;
        const shop = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), shopBodyMaterials[(index + (side > 0 ? 1 : 0)) % shopBodyMaterials.length]);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        shop.add(body);

        const facade = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 1.15, 0.06), glowMaterials[(index + (side > 0 ? 1 : 0)) % glowMaterials.length]);
        facade.position.set(0, 1.55, side > 0 ? -depth / 2 - 0.035 : depth / 2 + 0.035);
        shop.add(facade);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.12, 0.72), sidewalkMaterial);
        canopy.position.set(0, 2.45, side > 0 ? -depth / 2 - 0.35 : depth / 2 + 0.35);
        shop.add(canopy);
        for (let floor = 3.35; floor < height - 0.3; floor += 1.25) {
          const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.08, 0.035), glowMaterials[(index + floor) % 2 | 0]);
          windowStrip.position.set(0, floor, side > 0 ? -depth / 2 - 0.025 : depth / 2 + 0.025);
          shop.add(windowStrip);
        }
        shop.position.set(side * (8.1 + width * 0.22), 0, z);
        shop.rotation.y = side > 0 ? 0 : Math.PI;
        boulevard.add(shop);
      });
    }

    const roadGlow = new THREE.PointLight(0x61e9ef, 12, 28, 1.7);
    roadGlow.position.set(-1.8, 4.2, -19);
    boulevard.add(roadGlow);
    const marketGlow = new THREE.PointLight(0xff4d91, 10, 27, 1.8);
    marketGlow.position.set(3, 4.5, -31);
    boulevard.add(marketGlow);
    world.add(boulevard);
  }

  function buildMoonAndClouds(random) {
    const moon = new THREE.Group();
    moon.position.set(-9, 27, -88);

    const moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(18, 72),
      new THREE.MeshBasicMaterial({ color: 0xc7f4ea, transparent: true, opacity: 0.8, fog: false, depthWrite: false }),
    );
    moon.add(moonDisc);
    const moonHalo = new THREE.Mesh(
      new THREE.RingGeometry(18.1, 20.2, 72),
      new THREE.MeshBasicMaterial({ color: 0x8bded7, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }),
    );
    moonHalo.position.z = -0.03;
    moon.add(moonHalo);

    const craterMaterial = new THREE.MeshBasicMaterial({ color: 0x6daaa9, transparent: true, opacity: 0.22, fog: false, depthWrite: false });
    [
      [-6.1, 5.2, 2.3, 1.1], [4.4, 8.2, 2.8, 1.3], [7.4, -2.1, 1.8, 1],
      [-2.3, -6.4, 3.6, 1.55], [-8.6, -3.2, 1.5, 0.8], [1.1, 2.6, 1.2, 0.65],
    ].forEach(([x, y, rx, ry]) => {
      const crater = new THREE.Mesh(new THREE.CircleGeometry(1, 28), craterMaterial);
      crater.position.set(x, y, 0.03);
      crater.scale.set(rx, ry, 1);
      moon.add(crater);
    });
    scene.add(moon);

    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0x0b3439, transparent: true, opacity: 0.42, fog: false, depthWrite: false });
    for (let index = 0; index < 8; index += 1) {
      const cloud = new THREE.Group();
      const width = 8 + random() * 12;
      for (let blob = 0; blob < 5; blob += 1) {
        const puff = new THREE.Mesh(new THREE.CircleGeometry(1, 20), cloudMaterial);
        puff.position.set((blob - 2) * width * 0.18, Math.sin(blob * 1.7) * 0.75, 0);
        puff.scale.set(width * (0.19 + random() * 0.08), 1.5 + random() * 2.2, 1);
        cloud.add(puff);
      }
      cloud.position.set(-46 + random() * 92, 24 + random() * 22, -75 - random() * 8);
      cloud.userData.drift = 0.18 + random() * 0.22;
      atmosphere.clouds.push(cloud);
      scene.add(cloud);
    }
  }

  function buildMegatower() {
    const tower = new THREE.Group();
    tower.position.set(14.5, 0, -57);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1b21, roughness: 0.28, metalness: 0.78 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x16282e, roughness: 0.4, metalness: 0.72 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0xa9ffff, emissive: 0x38dce5, emissiveIntensity: 4.2, roughness: 0.14 });
    const rose = new THREE.MeshStandardMaterial({ color: 0xff9bbd, emissive: 0xff386f, emissiveIntensity: 3.4, roughness: 0.18 });

    const towerHeight = architecture.maxHeight;
    const core = new THREE.Mesh(new THREE.BoxGeometry(7.4, towerHeight, 6.4), coreMaterial);
    core.position.y = towerHeight / 2;
    core.castShadow = true;
    tower.add(core);
    [-3.86, 3.86].forEach((x) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, towerHeight, 7.2), frameMaterial);
      fin.position.set(x, towerHeight / 2, 0);
      tower.add(fin);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.11, towerHeight - 0.2, 7.28), cyan);
      beam.position.set(x + (x < 0 ? -0.27 : 0.27), towerHeight / 2, 0);
      tower.add(beam);
    });
    for (let y = 1.15; y < towerHeight; y += 1.15) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(7.65, 0.08, 6.65), y % 6.8 ? cyan : rose);
      floor.position.y = y;
      tower.add(floor);
    }
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.9, 0.42, 6), frameMaterial);
    crown.position.y = towerHeight - 0.21;
    tower.add(crown);

    [1.45, 2.65].forEach((y, index) => {
      const panel = makeLabel(["NIGHT", "DATA"][index], ["SIGNAL 04", "LIVE ARCHIVE"][index], index === 1 ? "#ff6799" : "#69eff0");
      panel.position.set(0, y, 3.28);
      panel.scale.set(4.4, 1.25, 1);
      tower.add(panel);
    });
    const towerGlow = new THREE.PointLight(0x57e8ea, 18, 34, 1.6);
    towerGlow.position.set(0, 2.4, 4);
    tower.add(towerGlow);
    world.add(tower);
  }

  function buildGarageShowroom() {
    const displayCar = (paint, accent) => {
      const car = new THREE.Group();
      const paintMaterial = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.22, metalness: 0.74 });
      const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x08161f, roughness: 0.08, metalness: 0.78 });
      const accentMaterial = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 3.6, roughness: 0.16 });
      const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.86 });

      const nose = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.48, 2.8), paintMaterial);
      nose.position.set(0, 0.63, -1.15);
      nose.rotation.x = -0.055;
      car.add(nose);
      const rear = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.62, 2.45), paintMaterial);
      rear.position.set(0, 0.77, 1.45);
      car.add(rear);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.78, 2.15), glassMaterial);
      cabin.position.set(0, 1.25, 0.35);
      cabin.rotation.x = 0.05;
      car.add(cabin);
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.12, 0.46), accentMaterial);
      splitter.position.set(0, 0.42, -2.48);
      car.add(splitter);
      [-1.42, 1.42].forEach((x) => {
        const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.08), accentMaterial);
        headlight.position.set(x * 0.64, 0.85, -2.55);
        car.add(headlight);
      });
      [[-1.62, -1.45], [1.62, -1.45], [-1.62, 1.5], [1.62, 1.5]].forEach(([x, z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.35, 18), tireMaterial);
        wheel.position.set(x, 0.53, z);
        wheel.rotation.z = Math.PI / 2;
        car.add(wheel);
      });
      return car;
    };

    const amberCar = displayCar(0xb7a51c, 0xe9ffff);
    amberCar.scale.setScalar(0.74);
    amberCar.position.set(-5.1, 0.05, 4.6);
    amberCar.rotation.y = -0.2;
    world.add(amberCar);
    const silverCar = displayCar(0xb8c2cc, 0xff4e98);
    silverCar.scale.setScalar(0.74);
    silverCar.position.set(5.15, 0.05, 4.4);
    silverCar.rotation.y = 0.22;
    world.add(silverCar);

    [-5.1, 5.15].forEach((x, index) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(3.05, 3.15, 0.16, 40),
        new THREE.MeshStandardMaterial({ color: 0x111a20, roughness: 0.26, metalness: 0.8 }),
      );
      pad.position.set(x, 0.08, 4.5);
      world.add(pad);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.72, 2.84, 48),
        new THREE.MeshBasicMaterial({ color: index ? 0xff5c9f : 0x75edf0, transparent: true, opacity: 0.76, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.18, 4.5);
      world.add(ring);
    });
  }

  function buildCherryMarket(random) {
    const market = new THREE.Group();
    market.position.set(28, 0, -12);
    const concrete = new THREE.MeshStandardMaterial({ color: 0x263033, roughness: 0.66, metalness: 0.28 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x10151a, roughness: 0.46, metalness: 0.64 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xffb2d1, emissive: 0xff377f, emissiveIntensity: 3.1, roughness: 0.28 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0xb8ffff, emissive: 0x39dbe5, emissiveIntensity: 3.2, roughness: 0.2 });
    const blossom = new THREE.MeshStandardMaterial({ color: 0xff82b5, emissive: 0xff286f, emissiveIntensity: 1.75, roughness: 0.52 });
    const trunk = new THREE.MeshStandardMaterial({ color: 0x2d1c24, roughness: 0.9 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.72, 4.4), concrete);
    deck.position.set(2, architecture.maxHeight - 0.36, -8.2);
    deck.castShadow = true;
    market.add(deck);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(34, 0.12, 0.14), pink);
    rail.position.set(2, architecture.maxHeight - 0.78, -5.95);
    market.add(rail);
    const marketSign = makeLabel("BLOSSOM 24", "NEON MARKET · NIGHT LINE", "#ff77ad");
    marketSign.position.set(4.5, 4.65, -7.95);
    marketSign.scale.set(7.4, 2.1, 1);
    market.add(marketSign);

    [-1, 1].forEach((side) => {
      for (let index = 0; index < 5; index += 1) {
        const tree = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 3.2, 7), trunk);
        stem.position.y = 1.6;
        tree.add(stem);
        for (let cluster = 0; cluster < 7; cluster += 1) {
          const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + random() * 0.45, 1), blossom);
          crown.position.set((random() - 0.5) * 2.4, 3 + random() * 1.4, (random() - 0.5) * 1.7);
          tree.add(crown);
        }
        tree.position.set(-10 + index * 6.1, 0, side * 7.2 + 1.2);
        market.add(tree);

        const kiosk = new THREE.Group();
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.35, 1.5), dark);
        cabinet.position.y = 1.18;
        kiosk.add(cabinet);
        const display = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 0.06), (index + side) % 2 ? pink : cyan);
        display.position.set(0, 1.42, side > 0 ? -0.78 : 0.78);
        kiosk.add(display);
        kiosk.position.set(-10 + index * 6.1, 0, side * 10.1 + 1.2);
        kiosk.rotation.y = side > 0 ? 0 : Math.PI;
        market.add(kiosk);
      }
    });

    const petals = [];
    for (let index = 0; index < 260; index += 1) {
      petals.push(random() * 34 - 17, 1 + random() * 11, random() * 28 - 14);
    }
    const petalGeometry = new THREE.BufferGeometry();
    petalGeometry.setAttribute("position", new THREE.Float32BufferAttribute(petals, 3));
    const petalCloud = new THREE.Points(petalGeometry, new THREE.PointsMaterial({ color: 0xffa7c8, size: 0.11, transparent: true, opacity: 0.88, depthWrite: false }));
    market.add(petalCloud);
    atmosphere.petals = petalCloud;
    const marketGlow = new THREE.PointLight(0xff4b91, 15, 25, 1.8);
    marketGlow.position.set(1, 5, 2);
    market.add(marketGlow);
    world.add(market);
  }

  function buildLanternMarket(random) {
    const market = new THREE.Group();
    market.position.set(0, 0, 32);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x161417, roughness: 0.5, metalness: 0.58 });
    const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x282126, roughness: 0.5, metalness: 0.42 });
    const awningMaterials = [0x5b1823, 0x283d42, 0x42264f].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
    const warm = new THREE.MeshStandardMaterial({ color: 0xffd2a1, emissive: 0xff5b24, emissiveIntensity: 3.8, roughness: 0.24 });
    const violet = new THREE.MeshStandardMaterial({ color: 0xffa4dc, emissive: 0xff45aa, emissiveIntensity: 3.2, roughness: 0.2 });

    [-1, 1].forEach((side) => {
      for (let index = 0; index < 5; index += 1) {
        const stall = new THREE.Group();
        const back = new THREE.Mesh(new THREE.BoxGeometry(3.7, 3.3, 0.35), frameMaterial);
        back.position.set(0, 1.65, side > 0 ? 1.35 : -1.35);
        stall.add(back);
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1, 1.05), counterMaterial);
        counter.position.set(0, 0.55, side > 0 ? -0.42 : 0.42);
        stall.add(counter);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.18, 2.5), awningMaterials[index % awningMaterials.length]);
        awning.position.y = 3.25;
        awning.rotation.x = side * 0.12;
        stall.add(awning);
        const menu = makeLabel(["STEAM", "NOODLE", "TEA", "GRILL", "NIGHT"][index], "MIDNIGHT KITCHEN", index % 2 ? "#ff84c0" : "#ff9960");
        menu.position.set(0, 2.35, side > 0 ? -1.58 : 1.58);
        menu.scale.set(3.25, 0.95, 1);
        stall.add(menu);
        stall.position.set(side * 7.6, 0, -10 + index * 5.1);
        stall.rotation.y = side > 0 ? 0 : Math.PI;
        market.add(stall);
      }
    });

    for (let row = 0; row < 5; row += 1) {
      const z = -9 + row * 5.5;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 14.5, 5), frameMaterial);
      cable.position.set(0, 3.55 + (row % 2) * 0.15, z);
      cable.rotation.z = Math.PI / 2;
      market.add(cable);
      for (let lantern = 0; lantern < 7; lantern += 1) {
        const lamp = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.32 + (lantern % 2) * 0.09, 12, 9), warm);
        body.scale.y = 1.35;
        lamp.add(body);
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 5), warm);
        tassel.position.y = -0.55;
        lamp.add(tassel);
        lamp.position.set(-6 + lantern * 2, 3.23 + (row % 2) * 0.15 + random() * 0.08, z);
        lamp.userData.phase = random() * Math.PI * 2;
        atmosphere.lanterns.push(lamp);
        market.add(lamp);
      }
    }
    const alleySign = makeLabel("LANTERN ALLEY", "FOOD · LIGHT · RAIN", "#ff7556");
    alleySign.position.set(0, 4.75, -11);
    alleySign.scale.set(7.8, 2.15, 1);
    market.add(alleySign);
    const violetGlow = new THREE.PointLight(0xff4fb7, 12, 25, 1.9);
    violetGlow.position.set(4, 4, 7);
    market.add(violetGlow);
    world.add(market);
  }

  function buildRooftopGarden(random) {
    const garden = new THREE.Group();
    garden.position.set(-28, 0, -12);
    const stone = new THREE.MeshStandardMaterial({ color: 0x1a2728, roughness: 0.68, metalness: 0.28 });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x0e1718, roughness: 0.75, metalness: 0.2 });
    const foliage = new THREE.MeshStandardMaterial({ color: 0x163e34, emissive: 0x0a392d, emissiveIntensity: 0.52, roughness: 0.86 });
    const bark = new THREE.MeshStandardMaterial({ color: 0x31261f, roughness: 0.9 });
    const stepLight = new THREE.MeshStandardMaterial({ color: 0xffedbf, emissive: 0xffc35c, emissiveIntensity: 3.2, roughness: 0.22 });
    const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x153e45, emissive: 0x0a8796, emissiveIntensity: 0.6, roughness: 0.08, metalness: 0.68, transparent: true, opacity: 0.88 });

    const terrace = new THREE.Mesh(new THREE.BoxGeometry(25, 0.48, 25), stone);
    terrace.position.y = -0.12;
    terrace.receiveShadow = true;
    garden.add(terrace);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.3, 40), waterMaterial);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-5.5, 0.2, 4.8);
    garden.add(pond);
    const pondRing = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.7, 40), darkStone);
    pondRing.rotation.x = -Math.PI / 2;
    pondRing.position.copy(pond.position);
    garden.add(pondRing);

    const treePositions = [[-8, -5], [7.5, -5.5], [-7.4, 7.4], [7.8, 6.3]];
    treePositions.forEach(([x, z], index) => {
      const planter = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.9, 0.75, 12), darkStone);
      planter.position.set(x, 0.38, z);
      garden.add(planter);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.28, 3.7, 7), bark);
      trunk.position.y = 2.15;
      trunk.rotation.z = (index % 2 ? -1 : 1) * 0.12;
      tree.add(trunk);
      for (let tier = 0; tier < 5; tier += 1) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + random() * 0.42, 1), foliage);
        crown.position.set((random() - 0.5) * 1.7, 2.9 + tier * 0.47, (random() - 0.5) * 1.2);
        crown.scale.set(1.5, 0.58, 1.05);
        tree.add(crown);
      }
      tree.position.set(x, 0.35, z);
      garden.add(tree);
    });

    for (let step = 0; step < 5; step += 1) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.3, 1.2), stone);
      stair.position.set(0, 0.15 + step * 0.28, 11.5 + step * 0.82);
      garden.add(stair);
      const light = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.055, 0.08), stepLight);
      light.position.set(0, 0.32 + step * 0.28, 10.88 + step * 0.82);
      garden.add(light);
    }
    const gardenSign = makeLabel("SKY GARDEN", "QUIET ABOVE THE SIGNAL", "#83eee3");
    gardenSign.position.set(0, 4.55, 10.6);
    gardenSign.scale.set(7.2, 2, 1);
    garden.add(gardenSign);
    const gardenGlow = new THREE.PointLight(0x55dfd0, 10, 20, 1.8);
    gardenGlow.position.set(0, 5, 2);
    garden.add(gardenGlow);
    world.add(garden);
  }

  function buildServiceGarage() {
    const garage = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x111a20, roughness: 0.34, metalness: 0.82 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x070d11, roughness: 0.5, metalness: 0.65 });
    const cyanLight = new THREE.MeshStandardMaterial({ color: 0xa6ffff, emissive: 0x55deeb, emissiveIntensity: 3.8, roughness: 0.18 });
    const violetLight = new THREE.MeshStandardMaterial({ color: 0xf1c7ff, emissive: 0xa764ff, emissiveIntensity: 3, roughness: 0.2 });

    [-6.5, 0, 6.5].forEach((z) => {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.48, 0.62), steel);
      crossBeam.position.set(0, architecture.maxHeight - 0.25, z + 4.2);
      crossBeam.visible = false;
      crossBeam.castShadow = true;
      garage.add(crossBeam);
    });

    [-5.3, 5.3].forEach((x, index) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 17.5, 10), darkSteel);
      pipe.position.set(x, architecture.maxHeight - 0.18, 4.4);
      pipe.rotation.x = Math.PI / 2;
      garage.add(pipe);
      const connectorMaterial = index ? violetLight : cyanLight;
      for (let z = -3; z <= 11; z += 3.5) {
        const connector = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 7, 18), connectorMaterial);
        connector.position.set(x, architecture.maxHeight - 0.18, z);
        connector.rotation.x = Math.PI / 2;
        garage.add(connector);
      }
    });

    const ceilingPanels = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 0.18, 15),
      new THREE.MeshStandardMaterial({ color: 0x0a1116, roughness: 0.55, metalness: 0.68, transparent: true, opacity: 0.07, depthWrite: false }),
    );
    ceilingPanels.position.set(0, architecture.maxHeight, 4.8);
    ceilingPanels.visible = false;
    garage.add(ceilingPanels);

    for (let x = -5.5; x <= 5.5; x += 3.65) {
      const ceilingLamp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.18), x < 0 ? cyanLight : violetLight);
      ceilingLamp.position.set(x, architecture.maxHeight - 0.08, 0.1);
      garage.add(ceilingLamp);
    }

    const serviceRing = new THREE.Mesh(
      new THREE.RingGeometry(3.1, 3.22, 64),
      new THREE.MeshBasicMaterial({ color: 0x78f4ff, transparent: true, opacity: 0.48, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    serviceRing.rotation.x = -Math.PI / 2;
    serviceRing.position.set(0, 0.19, 0);
    garage.add(serviceRing);

    const hologram = new THREE.Group();
    const hologramMaterial = new THREE.MeshBasicMaterial({
      color: 0x72f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.21,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const hologramBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.72, 6.1, 5, 2, 8), hologramMaterial);
    hologramBody.position.y = 1.05;
    hologram.add(hologramBody);
    const hologramCabin = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.92, 2.5, 4, 2, 4), hologramMaterial);
    hologramCabin.position.set(0, 1.82, 0.3);
    hologram.add(hologramCabin);
    [[-1.72, -1.85], [1.72, -1.85], [-1.72, 1.85], [1.72, 1.85]].forEach(([x, z]) => {
      const hologramWheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 6, 16), hologramMaterial);
      hologramWheel.position.set(x, 0.72, z);
      hologramWheel.rotation.y = Math.PI / 2;
      hologram.add(hologramWheel);
    });
    hologram.position.set(-5.1, 0.15, -2.9);
    hologram.rotation.y = -0.22;
    garage.add(hologram);
    atmosphere.hologram = hologram;

    const diagnosticFrame = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.04, 7, 48), violetLight);
    diagnosticFrame.position.set(0, 2.75, -7.4);
    diagnosticFrame.scale.x = 1.3;
    garage.add(diagnosticFrame);

    const garageSign = makeLabel("DATA GARAGE", "NIGHT SHIFT · SYSTEM ONLINE", "#67e7ee");
    garageSign.position.set(0, 4.45, -8.1);
    garageSign.scale.set(5.5, 1.6, 1);
    garage.add(garageSign);

    const serviceGlow = new THREE.PointLight(0x5debf4, 13, 19, 1.8);
    serviceGlow.position.set(0, 3.1, 2.2);
    garage.add(serviceGlow);
    world.add(garage);
  }

  function buildNightCityDetails(random) {
    const metal = new THREE.MeshStandardMaterial({ color: 0x10181d, roughness: 0.45, metalness: 0.7 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xff9cc8, emissive: 0xff3d86, emissiveIntensity: 3.4, roughness: 0.2 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0xb6ffff, emissive: 0x45dbe8, emissiveIntensity: 3.5, roughness: 0.18 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xffdda2, emissive: 0xff9c32, emissiveIntensity: 2.7, roughness: 0.2 });

    const arch = new THREE.Group();
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(17.8, 1.25, 2), metal);
    bridge.position.set(0, architecture.maxHeight - 0.62, -19);
    bridge.castShadow = true;
    arch.add(bridge);
    const archLight = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.11, 0.1), pink);
    archLight.position.set(0, architecture.maxHeight - 1.28, -17.95);
    arch.add(archLight);
    const archSign = makeLabel("MIDNIGHT DATA", "THREE DISTRICTS · ONE SIGNAL", "#ff74ae");
    archSign.position.set(0, 4.75, -18.8);
    archSign.scale.set(7.2, 2.05, 1);
    arch.add(archSign);
    world.add(arch);

    const signData = [
      [-14, 4.2, -10, "SYNC", "RESONANCE", "#66f0ed"],
      [14, 4.15, -9, "DREAM", "NEON CROSSING", "#ff6aa6"],
      [-8.5, 4.45, 18, "24H", "DATA MARKET", "#ffca59"],
      [9, 4.35, 20, "SIGNAL", "OPEN ALL NIGHT", "#8c7dff"],
    ];
    signData.forEach(([x, y, z, title, subtitle, color], index) => {
      const sign = makeLabel(title, subtitle, color);
      sign.position.set(x, y, z);
      sign.scale.set(index < 2 ? 4.9 : 5.5, index < 2 ? 1.5 : 1.7, 1);
      sign.material.rotation = index % 2 ? 0.04 : -0.04;
      world.add(sign);
    });

    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 ? -1 : 1;
      const x = side * (10.5 + random() * 4.2);
      const z = -24 + index * 2.9;
      const vending = new THREE.Group();
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.55), metal);
      cabinet.position.y = 0.9;
      vending.add(cabinet);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.03), index % 3 === 0 ? amber : index % 2 ? pink : cyan);
      screen.position.set(0, 1.08, side > 0 ? -0.29 : 0.29);
      vending.add(screen);
      vending.position.set(x, 0, z);
      vending.rotation.y = side > 0 ? 0 : Math.PI;
      world.add(vending);
    }

    for (let index = 0; index < 14; index += 1) {
      const cableGeometry = new THREE.TorusGeometry(4 + (index % 3), 0.025, 5, 28, Math.PI * 0.72);
      const cable = new THREE.Mesh(cableGeometry, metal);
      cable.position.set((index % 2 ? -1 : 1) * (8 + index * 0.5), 3.15 + (index % 4) * 0.18, -30 + index * 4.5);
      cable.rotation.set(Math.PI / 2, 0, index % 2 ? 0.4 : -0.4);
      world.add(cable);
    }
  }

  function buildStreetFurniture(random) {
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2d32, roughness: 0.45, metalness: 0.72 });
    zones.forEach((zone, zoneIndex) => {
      for (let index = 1; index <= 5; index += 1) {
        const position = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 2), zone.position, index / 6);
        const direction = new THREE.Vector3().subVectors(zone.position, new THREE.Vector3(0, 0, 2)).normalize();
        const side = new THREE.Vector3(direction.z, 0, -direction.x);
        [-1, 1].forEach((sign) => {
          const lamp = new THREE.Group();
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 3.6, 7), poleMaterial);
          pole.position.y = 1.8;
          lamp.add(pole);
          const bulbMaterial = new THREE.MeshBasicMaterial({ color: zone.color });
          const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), bulbMaterial);
          bulb.position.y = 3.58;
          lamp.add(bulb);
          lamp.position.copy(position).addScaledVector(side, sign * 4.2);
          world.add(lamp);
        });
      }
      const billboard = makeLabel(zone.shortName, ["RESONANCE · ARCHIVE", "DREAM · CROSSING", "HOLLOW · SIGNAL"][zoneIndex], zone.cssColor);
      billboard.position.copy(new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 2), zone.position, 0.58));
      billboard.position.y = 5.3;
      billboard.position.x += zoneIndex === 0 ? -5.4 : zoneIndex === 1 ? 5.4 : -5.4;
      billboard.scale.set(5.7, 1.7, 1);
      world.add(billboard);
    });

    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x311c27, roughness: 0.82 });
    const blossomMaterial = new THREE.MeshStandardMaterial({ color: 0xff70a7, emissive: 0xff286d, emissiveIntensity: 1.4, roughness: 0.55 });
    for (let index = 0; index < 9; index += 1) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.8, 6), trunkMaterial);
      trunk.position.y = 1.4;
      tree.add(trunk);
      for (let cluster = 0; cluster < 5; cluster += 1) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 + random() * 0.35, 0), blossomMaterial);
        crown.position.set((random() - 0.5) * 1.8, 2.8 + random() * 1.1, (random() - 0.5) * 1.5);
        tree.add(crown);
      }
      tree.position.set(14 + index * 3.1, 0, 7 + (index % 2) * 5.5);
      tree.rotation.y = random() * Math.PI;
      world.add(tree);
    }
  }

  function buildRain(random) {
    const positions = [];
    for (let index = 0; index < 850; index += 1) {
      const x = random() * 112 - 56;
      const y = random() * 32;
      const z = random() * 112 - 56;
      positions.push(x, y, z, x + 0.04, y - 0.48, z + 0.06);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const material = new THREE.LineBasicMaterial({ color: 0x9bd9e1, transparent: true, opacity: 0.24, depthWrite: false });
    atmosphere.rain = new THREE.LineSegments(geometry, material);
    scene.add(atmosphere.rain);
  }

  function buildDistrict(zone, districtIndex) {
    const district = new THREE.Group();
    district.position.copy(zone.position);
    world.add(district);
    zone.district = district;

    const color = new THREE.Color(zone.color);
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(9.5, 9.8, 0.22, 48),
      new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.15), roughness: 0.68, metalness: 0.35 }),
    );
    platform.position.y = 0.09;
    platform.receiveShadow = true;
    district.add(platform);

    const platformRing = new THREE.Mesh(
      new THREE.RingGeometry(8.55, 8.75, 64),
      new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
    );
    platformRing.rotation.x = -Math.PI / 2;
    platformRing.position.y = 0.22;
    district.add(platformRing);

    const portalGroup = new THREE.Group();
    portalGroup.position.y = 3.45;
    district.add(portalGroup);
    zone.portalGroup = portalGroup;

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: zone.color,
      emissive: zone.color,
      emissiveIntensity: 3.1,
      roughness: 0.24,
      metalness: 0.62,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.16, 12, 64), ringMaterial);
    ring.castShadow = true;
    portalGroup.add(ring);
    zone.portalRing = ring;

    const innerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(2.92, 48),
      new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.11, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    innerGlow.position.z = 0.02;
    portalGroup.add(innerGlow);
    zone.portalGlow = innerGlow;

    const beacon = new THREE.PointLight(zone.color, 14, 16, 2.2);
    beacon.position.set(0, 1.2, 0);
    district.add(beacon);

    const label = makeLabel(zone.shortName, zone.symbol, zone.cssColor);
    label.position.set(0, 7.2, 0);
    label.scale.set(8.4, 2.5, 1);
    district.add(label);
    zone.label = label;

    const baseMaterial = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.24), roughness: 0.55, metalness: 0.45 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: zone.color, emissive: zone.color, emissiveIntensity: 1.4, roughness: 0.35 });
    const arrangements = [
      [[-6.5, -2, 1.5, 2.13]],
      [[6.3, -2, 1.8, 2.1]],
      [[-6.1, 4.4, 1.5, 2.37]],
    ][districtIndex];
    arrangements.forEach(([x, z, width, height], index) => {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), baseMaterial);
      tower.position.set(x, height / 2 + 0.2, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      district.add(tower);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.1, width + 0.12), edgeMaterial);
      cap.position.set(x, height + 0.23, z);
      district.add(cap);
      if (districtIndex === 0 && index < 2) {
        const wave = new THREE.Mesh(new THREE.TorusGeometry(1.15 + index * 0.25, 0.05, 6, 36, Math.PI), edgeMaterial);
        wave.position.set(x, height + 0.35, z);
        wave.rotation.z = index ? Math.PI : 0;
        district.add(wave);
      }
    });

    if (districtIndex === 1) {
      [-1, 1].forEach((side) => {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.2, 0.16), edgeMaterial);
        sign.position.set(side * 5.15, 2.1, 3.4);
        sign.rotation.z = side * 0.12;
        district.add(sign);
      });
    }
    if (districtIndex === 2) {
      const hazard = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), edgeMaterial);
      hazard.position.set(0, 8.25, 0);
      hazard.rotation.z = Math.PI / 4;
      district.add(hazard);
      zone.hazard = hazard;
    }
  }

  function buildCar() {
    const group = new THREE.Group();
    // Keep the driving footprint stable while making the on-screen vehicle
    // closer to the compact, diorama-like proportions of the reference.
    group.scale.setScalar(0.78);
    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.48, 3.7),
      new THREE.MeshStandardMaterial({ color: 0xf3f5ff, roughness: 0.34, metalness: 0.42 }),
    );
    chassis.position.y = 0.72;
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.72, 1.72),
      new THREE.MeshStandardMaterial({ color: 0x252b52, roughness: 0.16, metalness: 0.66 }),
    );
    cabin.position.set(0, 1.25, 0.2);
    cabin.rotation.x = -0.03;
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    const bumperMaterial = new THREE.MeshStandardMaterial({ color: 0x111425, roughness: 0.52, metalness: 0.72 });
    [-1.78, 1.78].forEach((z) => {
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.18, 0.2), bumperMaterial);
      bumper.position.set(0, 0.55, z);
      bodyGroup.add(bumper);
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x080912, roughness: 0.84 });
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x8b93ad, roughness: 0.3, metalness: 0.78 });
    const allWheelSpins = [];
    const steerPivots = [];
    [[-1.12, -1.15], [1.12, -1.15], [-1.12, 1.12], [1.12, 1.12]].forEach(([x, z], index) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.54, z);
      const spin = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), wheelMaterial);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 12), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      tire.add(hub);
      spin.add(tire);
      pivot.add(spin);
      group.add(pivot);
      allWheelSpins.push(spin);
      if (index < 2) steerPivots.push(pivot);
    });

    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xd8ffff });
    const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff3568 });
    [-0.67, 0.67].forEach((x) => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.07), headlightMaterial);
      headlight.position.set(x, 0.77, -1.87);
      bodyGroup.add(headlight);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.07), taillightMaterial);
      taillight.position.set(x, 0.77, 1.87);
      bodyGroup.add(taillight);
    });
    const underglow = new THREE.PointLight(0x8c78ff, 4.5, 7, 2.2);
    underglow.position.set(0, 0.36, 0);
    group.add(underglow);

    const boostTrails = new THREE.Group();
    boostTrails.visible = false;
    const outerTrailMaterial = new THREE.MeshBasicMaterial({
      color: 0x4cf7ec,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerTrailMaterial = new THREE.MeshBasicMaterial({
      color: 0xf1e6ff,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    [-0.57, 0.57].forEach((x, index) => {
      const outerTrail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.4, 18, 1, true), outerTrailMaterial.clone());
      outerTrail.position.set(x, 0.72, 3.25);
      outerTrail.rotation.x = Math.PI / 2;
      outerTrail.userData.baseOpacity = 0.62;
      boostTrails.add(outerTrail);
      const innerTrail = new THREE.Mesh(new THREE.ConeGeometry(0.19, 2.3, 16, 1, true), innerTrailMaterial.clone());
      innerTrail.position.set(x, 0.72, 2.7);
      innerTrail.rotation.x = Math.PI / 2;
      innerTrail.userData.baseOpacity = 0.94;
      boostTrails.add(innerTrail);
      const exhaustCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 8),
        new THREE.MeshBasicMaterial({
          color: index ? 0xc296ff : 0x8ffff8,
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      exhaustCore.position.set(x, 0.72, 2.02);
      exhaustCore.userData.baseOpacity = 0.96;
      exhaustCore.userData.isBoostCore = true;
      boostTrails.add(exhaustCore);
      const exhaustLight = new THREE.PointLight(index ? 0xad72ff : 0x58f8ee, 0, 6, 2.1);
      exhaustLight.position.set(x, 0.72, 2.05);
      exhaustLight.userData.boostLight = true;
      boostTrails.add(exhaustLight);
    });
    group.add(boostTrails);
    return { car: group, carBody: bodyGroup, wheelSpins: allWheelSpins, frontWheelPivots: steerPivots, boostTrails };
  }

  function makeLabel(title, subtitle, color) {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 768;
    labelCanvas.height = 220;
    const context = labelCanvas.getContext("2d");
    context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
    context.fillStyle = "rgba(8, 10, 25, .82)";
    roundRect(context, 10, 10, 748, 200, 38);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 5;
    roundRect(context, 10, 10, 748, 200, 38);
    context.stroke();
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "900 86px sans-serif";
    context.fillText(title, 384, 105);
    context.fillStyle = color;
    context.font = "700 25px sans-serif";
    context.letterSpacing = "7px";
    context.fillText(subtitle, 384, 160);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    return sprite;
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function distanceToAnyRoad(x, z) {
    return Math.min(...zones.map((zone) => pointToSegmentDistance(x, z, 0, 2, zone.position.x, zone.position.z)));
  }

  function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSquared)) : 0;
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function clearInputs() {
    Object.keys(inputs).forEach((key) => { inputs[key] = false; });
    document.querySelectorAll("[data-control].active").forEach((button) => button.classList.remove("active"));
  }

  function prepareProximityFades() {
    world.updateMatrixWorld(true);
    const protectedMeshes = new Set(zones.flatMap((zone) => [zone.portalRing, zone.portalGlow, zone.hazard]).filter(Boolean));
    world.traverse((object) => {
      if (!protectedMeshes.has(object)) registerProximityFade(object);
    });
  }

  function registerProximityFade(object) {
    if ((!object.isMesh && !object.isSprite) || !object.visible || object.userData.proximityFade || Array.isArray(object.material)) return;
    const material = object.material;
    if (!material) return;

    let halfX = 0.5;
    let halfZ = 0.5;
    if (object.isMesh) {
      if (material.transparent || material.opacity < 0.99 || !object.geometry) return;
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      if (!bounds) return;
      const size = new THREE.Vector3();
      bounds.getSize(size);
      if (object.geometry.type === "PlaneGeometry" || size.y < 0.85) return;
      halfX = Math.max(0.2, size.x * 0.5);
      halfZ = Math.max(0.2, size.z * 0.5);
    }

    object.material = material.clone();
    object.material.transparent = true;
    object.userData.proximityFade = {
      halfX,
      halfZ,
      originalOpacity: material.opacity,
      originalDepthWrite: material.depthWrite,
    };
    proximityFadeMeshes.push(object);
    if (object.isMesh) proximityFadeRayMeshes.push(object);
  }

  function updateProximityFades(delta) {
    directSightOccluders.clear();
    [-0.75, 0, 0.75].forEach((lateralOffset) => {
      fadeRayTarget.copy(car.position);
      fadeRayTarget.x += Math.cos(state.yaw) * lateralOffset;
      fadeRayTarget.y += 0.72;
      fadeRayTarget.z += Math.sin(state.yaw) * lateralOffset;
      const sightDistance = camera.position.distanceTo(fadeRayTarget);
      fadeRayDirection.subVectors(fadeRayTarget, camera.position).normalize();
      fadeRaycaster.set(camera.position, fadeRayDirection);
      fadeRaycaster.far = Math.max(0.1, sightDistance - 0.35);
      fadeRaycaster.intersectObjects(proximityFadeRayMeshes, false).forEach(({ object }) => directSightOccluders.add(object));
    });

    proximityFadeMeshes.forEach((object) => {
      object.getWorldPosition(fadeWorldPosition);
      object.getWorldScale(fadeWorldScale);
      const fadeData = object.userData.proximityFade;
      const radius = Math.max(fadeData.halfX * fadeWorldScale.x, fadeData.halfZ * fadeWorldScale.z);
      const carClearance = Math.hypot(fadeWorldPosition.x - car.position.x, fadeWorldPosition.z - car.position.z) - radius;
      const sightClearance = pointToSegmentDistance(
        fadeWorldPosition.x,
        fadeWorldPosition.z,
        camera.position.x,
        camera.position.z,
        car.position.x,
        car.position.z,
      ) - radius;
      let targetOpacity = fadeData.originalOpacity;
      if (carClearance < 4.2) targetOpacity = Math.min(
        targetOpacity,
        THREE.MathUtils.clamp(0.18 + Math.max(0, carClearance) / 4.2, 0.18, fadeData.originalOpacity),
      );
      if (sightClearance < 2.1) targetOpacity = Math.min(targetOpacity, 0.12);
      if (directSightOccluders.has(object) || sightClearance < 0.75) targetOpacity = Math.min(targetOpacity, 0.035);
      const fadeSpeed = targetOpacity < object.material.opacity ? 14 : 5;
      object.material.opacity = THREE.MathUtils.lerp(object.material.opacity, targetOpacity, 1 - Math.exp(-fadeSpeed * delta));
      object.material.depthWrite = object.material.opacity > fadeData.originalOpacity * 0.94 ? fadeData.originalDepthWrite : false;
    });
  }

  function resetCar() {
    state.speed = 0;
    state.yaw = 0;
    state.yawRate = 0;
    state.acceleration = 0;
    state.steeringAngle = 0;
    state.boostUntil = 0;
    state.reverseHold = 0;
    state.wheelRotation = 0;
    state.physicsAccumulator = 0;
    state.entryProgress = 0;
    state.activePortal = null;
    state.nearestZone = null;
    state.navigating = false;
    state.rearAxle.set(0, 0, vehicle.rearAxleOffset);
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    carBody.position.set(0, 0, 0);
    carBody.rotation.set(0, 0, 0);
    frontWheelPivots.forEach((pivot) => { pivot.rotation.y = 0; });
    zonePrompt.classList.remove("visible");
    zonePrompt.style.setProperty("--entry-progress", "0%");
    document.body.classList.remove("boosting");
  }

  function stepVehiclePhysics(step) {
    const steeringInput = Number(inputs.right) - Number(inputs.left);
    const boostActive = (inputs.boost || performance.now() < state.boostUntil) && inputs.forward && state.speed >= 0;
    let longitudinalForce = 0;

    if (inputs.forward) {
      state.reverseHold = 0;
      if (state.speed < -0.12) longitudinalForce = 25;
      else if (boostActive) longitudinalForce = 22;
      else longitudinalForce = 11.4 * (1 - Math.max(0, state.speed) / (vehicle.maxForwardSpeed * 1.45));
    } else if (inputs.backward) {
      if (state.speed > 0.12) {
        state.reverseHold = 0;
        longitudinalForce = -25;
      } else {
        state.reverseHold += step;
        if (state.reverseHold > 0.18) longitudinalForce = -8.2 * (1 - Math.abs(Math.min(0, state.speed)) / (vehicle.maxReverseSpeed * 1.4));
      }
    } else {
      state.reverseHold = 0;
    }

    const rollingResistance = Math.abs(state.speed) > 0.02 ? Math.sign(state.speed) * 0.62 : 0;
    const aerodynamicDrag = state.speed * Math.abs(state.speed) * 0.028;
    if (!boostActive && state.speed > vehicle.maxForwardSpeed) longitudinalForce -= (state.speed - vehicle.maxForwardSpeed) * 2.4;
    state.acceleration = longitudinalForce - rollingResistance - aerodynamicDrag;
    state.speed += state.acceleration * step;
    state.speed = THREE.MathUtils.clamp(state.speed, -vehicle.maxReverseSpeed, vehicle.boostedMaxForwardSpeed);
    if (!inputs.forward && !inputs.backward) state.speed *= Math.exp(-0.48 * step);
    if (Math.abs(state.speed) < 0.035 && Math.abs(longitudinalForce) < 0.01) {
      state.speed = 0;
      state.acceleration = 0;
    }

    const speedRatio = Math.min(Math.abs(state.speed) / vehicle.maxForwardSpeed, 1);
    const steeringLimit = THREE.MathUtils.lerp(0.6, 0.18, Math.pow(speedRatio, 0.68));
    const targetSteering = steeringInput * steeringLimit;
    const steeringResponse = steeringInput ? 5.8 : 8.5;
    state.steeringAngle = THREE.MathUtils.lerp(
      state.steeringAngle,
      targetSteering,
      1 - Math.exp(-steeringResponse * step),
    );

    state.yawRate = Math.abs(state.speed) > 0.015
      ? (state.speed / vehicle.wheelBase) * Math.tan(state.steeringAngle)
      : 0;
    const middleYaw = state.yaw + state.yawRate * step * 0.5;
    forward.set(Math.sin(middleYaw), 0, -Math.cos(middleYaw));
    // A no-slip bicycle model: the rear axle can only move along its own heading.
    state.rearAxle.addScaledVector(forward, state.speed * step);
    state.yaw += state.yawRate * step;
    state.wheelRotation -= state.speed * step / vehicle.wheelRadius;

    state.rearAxle.x = THREE.MathUtils.clamp(state.rearAxle.x, -54, 54);
    state.rearAxle.z = THREE.MathUtils.clamp(state.rearAxle.z, -54, 54);
  }

  function updateCar(delta) {
    state.physicsAccumulator = Math.min(state.physicsAccumulator + delta, vehicle.fixedStep * 8);
    while (state.physicsAccumulator >= vehicle.fixedStep) {
      stepVehiclePhysics(vehicle.fixedStep);
      state.physicsAccumulator -= vehicle.fixedStep;
    }
    const boostActive = (inputs.boost || performance.now() < state.boostUntil) && inputs.forward && state.speed > 0.2;
    document.body.classList.toggle("boosting", boostActive);
    boostTrails.visible = boostActive;
    if (boostActive) {
      const boostRatio = THREE.MathUtils.clamp(state.speed / vehicle.boostedMaxForwardSpeed, 0.2, 1);
      const pulse = 0.88 + Math.sin(state.elapsed * 32) * 0.12;
      boostTrails.children.forEach((trail) => {
        if (trail.isMesh) {
          if (trail.userData.isBoostCore) trail.scale.setScalar(0.9 + pulse * 0.2);
          else trail.scale.y = (0.8 + boostRatio * 1.25) * pulse;
          trail.material.opacity = trail.userData.baseOpacity * (0.78 + boostRatio * 0.3);
        }
        if (trail.userData.boostLight) trail.intensity = 5 + boostRatio * 8 + Math.sin(state.elapsed * 25) * 1.2;
      });
    }

    forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    car.position.copy(state.rearAxle).addScaledVector(forward, vehicle.rearAxleOffset);
    // The physics heading is clockwise-positive, while Three.js rotates Y counter-clockwise.
    car.rotation.y = -state.yaw;

    const absoluteSteering = Math.abs(state.steeringAngle);
    let leftWheelAngle = state.steeringAngle;
    let rightWheelAngle = state.steeringAngle;
    if (absoluteSteering > 0.001) {
      const turnRadius = vehicle.wheelBase / Math.tan(absoluteSteering);
      const inner = Math.atan(vehicle.wheelBase / Math.max(0.35, turnRadius - vehicle.trackWidth / 2));
      const outer = Math.atan(vehicle.wheelBase / (turnRadius + vehicle.trackWidth / 2));
      if (state.steeringAngle > 0) {
        leftWheelAngle = outer;
        rightWheelAngle = inner;
      } else {
        leftWheelAngle = -inner;
        rightWheelAngle = -outer;
      }
    }
    frontWheelPivots[0].rotation.y = THREE.MathUtils.lerp(frontWheelPivots[0].rotation.y, -leftWheelAngle, 1 - Math.exp(-12 * delta));
    frontWheelPivots[1].rotation.y = THREE.MathUtils.lerp(frontWheelPivots[1].rotation.y, -rightWheelAngle, 1 - Math.exp(-12 * delta));
    wheelSpins.forEach((wheel) => { wheel.rotation.x = state.wheelRotation; });

    const lateralLoad = THREE.MathUtils.clamp(state.yawRate * Math.abs(state.speed) / 22, -1, 1);
    const targetRoll = lateralLoad * 0.095;
    const targetPitch = THREE.MathUtils.clamp(state.acceleration / 42, -0.055, 0.055);
    carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, targetRoll, 1 - Math.exp(-6.5 * delta));
    carBody.rotation.x = THREE.MathUtils.lerp(carBody.rotation.x, targetPitch, 1 - Math.exp(-7.5 * delta));
    carBody.position.y = Math.sin(state.elapsed * 13) * Math.min(0.018, Math.abs(state.speed) * 0.0015);
  }

  function updateCamera(delta) {
    forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, Math.sin(state.yaw));
    const speedRatio = Math.min(Math.abs(state.speed) / vehicle.boostedMaxForwardSpeed, 1);
    cameraOrbit.distance = THREE.MathUtils.lerp(
      cameraOrbit.distance,
      cameraOrbit.targetDistance,
      1 - Math.exp(-8 * delta),
    );
    const orbitDistance = cameraOrbit.distance + speedRatio * 1.2;
    const horizontalDistance = Math.cos(cameraOrbit.pitch) * orbitDistance;
    const orbitAngle = -state.yaw + cameraOrbit.yawOffset;
    targetCameraPosition.copy(car.position).add(new THREE.Vector3(
      Math.sin(orbitAngle) * horizontalDistance,
      Math.sin(cameraOrbit.pitch) * orbitDistance,
      Math.cos(orbitAngle) * horizontalDistance,
    ));
    targetCameraLook.copy(car.position)
      .addScaledVector(forward, THREE.MathUtils.lerp(2.4, 3.8, speedRatio))
      .addScaledVector(right, state.yawRate * 0.82)
      .add(new THREE.Vector3(0, 0.72, 0));
    const positionDamping = 1 - Math.exp(-(cameraOrbit.dragging ? 10 : 4.2) * delta);
    const lookDamping = 1 - Math.exp(-4.6 * delta);
    cameraPosition.lerp(targetCameraPosition, positionDamping);
    cameraTarget.lerp(targetCameraLook, lookDamping);
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
    const zoomRatio = (cameraOrbit.distance - cameraOrbit.minDistance) / (cameraOrbit.maxDistance - cameraOrbit.minDistance);
    const targetFov = THREE.MathUtils.lerp(49, 62, zoomRatio) + speedRatio * 3;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-5 * delta));
    camera.updateProjectionMatrix();
  }

  function updatePortals(delta) {
    let nearest = zones[0];
    let nearestDistance = Infinity;
    zones.forEach((zone, index) => {
      const distance = Math.hypot(car.position.x - zone.position.x, car.position.z - zone.position.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = zone;
      }
      const pulse = 1 + Math.sin(state.elapsed * 2.2 + index * 1.9) * 0.035;
      zone.portalRing.scale.setScalar(pulse);
      zone.portalGlow.material.opacity = 0.085 + Math.sin(state.elapsed * 2.6 + index) * 0.025;
      if (zone.hazard) zone.hazard.rotation.y += delta * 0.75;
    });

    if (nearest !== state.nearestZone) {
      state.nearestZone = nearest;
      liveStatus.textContent = nearestCopy(nearest);
    }
    missionCard.style.setProperty("--zone-color", nearest.cssColor);
    missionCard.style.setProperty("--distance-progress", `${Math.max(3, 100 - nearestDistance * 2.1)}%`);
    missionName.textContent = zoneName(nearest);
    missionDistance.textContent = distanceCopy(nearestDistance);

    const portal = nearestDistance < 3.8 ? nearest : null;
    if (portal && state.started && !state.navigating) {
      if (state.activePortal !== portal) state.entryProgress = 0;
      state.activePortal = portal;
      state.entryProgress = Math.min(1, state.entryProgress + delta / 1.45);
      state.speed *= Math.exp(-3.2 * delta);
      zonePrompt.classList.add("visible");
      zonePrompt.style.setProperty("--prompt-color", portal.cssColor);
      zonePrompt.style.setProperty("--entry-progress", `${state.entryProgress * 100}%`);
      zonePromptTitle.textContent = portalCopy(portal);
      if (state.entryProgress >= 1) {
        state.navigating = true;
        zonePromptTitle.textContent = portalCopy(portal, true);
        location.assign(portal.href);
      }
    } else {
      state.activePortal = null;
      state.entryProgress = Math.max(0, state.entryProgress - delta * 2.8);
      zonePrompt.style.setProperty("--entry-progress", `${state.entryProgress * 100}%`);
      if (!state.entryProgress) zonePrompt.classList.remove("visible");
    }
  }

  function updateHud() {
    speedValue.textContent = String(Math.round(Math.abs(state.speed) * 7.2)).padStart(2, "0");
    gear.textContent = state.speed > 0.15 ? "D" : state.speed < -0.15 ? "R" : "N";
    const mapX = THREE.MathUtils.clamp(50 + car.position.x * 0.78, 9, 91);
    const mapY = THREE.MathUtils.clamp(50 + car.position.z * 0.78, 9, 91);
    mapCar.style.left = `${mapX}%`;
    mapCar.style.top = `${mapY}%`;
    mapCar.style.transform = `rotate(${state.yaw}rad)`;
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.05);
    state.elapsed += delta;
    if (atmosphere.rain) {
      const rainPositions = atmosphere.rain.geometry.attributes.position.array;
      for (let index = 1; index < rainPositions.length; index += 3) {
        rainPositions[index] -= delta * 13;
        if (rainPositions[index] < 0) rainPositions[index] += 32;
      }
      atmosphere.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (atmosphere.hologram) {
      atmosphere.hologram.position.y = 0.15 + Math.sin(state.elapsed * 1.8) * 0.09;
      atmosphere.hologram.children.forEach((part, index) => {
        part.material.opacity = 0.16 + Math.sin(state.elapsed * 4.2 + index) * 0.055;
      });
    }
    if (atmosphere.petals) {
      atmosphere.petals.rotation.y = state.elapsed * 0.045;
      atmosphere.petals.position.y = Math.sin(state.elapsed * 0.7) * 0.22;
    }
    atmosphere.lanterns.forEach((lantern) => {
      lantern.rotation.z = Math.sin(state.elapsed * 1.15 + lantern.userData.phase) * 0.055;
    });
    atmosphere.clouds.forEach((cloud) => {
      cloud.position.x += delta * cloud.userData.drift;
      if (cloud.position.x > 58) cloud.position.x = -58;
    });
    if (state.started && !document.hidden) updateCar(delta);
    updatePortals(delta);
    updateCamera(delta);
    updateProximityFades(delta);
    updateHud();
    renderer.render(scene, camera);
  }
}
