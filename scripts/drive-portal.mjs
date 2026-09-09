import { buildDrivingPark } from "./driving-park.mjs";
import { createDrivingChallenges } from "./driving-challenges.mjs";
import { createDrivingSurfaces } from "./driving-surfaces.mjs";
import { buildParkCar } from "./driving-car.mjs";

const fatalError = document.querySelector("#fatal-error");
const bootStartButton = document.querySelector("#start-button");
const bootLoadingCopy = document.querySelector("#loading-copy");
document.querySelector("#preview-launch")?.addEventListener("click", () => bootStartButton?.click());
const musicToggle = document.querySelector("#music-toggle");
const youtubeAudio = document.querySelector("#youtube-audio");
const MUSIC_VIDEO_ID = "eg_yMhrRD0A";
function setStartButtonText(value) {
  const label = bootStartButton?.querySelector('[data-i18n="startButton"]') || bootStartButton;
  if (label) label.textContent = value;
}
const translations = {
  ko: {
    title: "DATA DRIVE — 게임 YouTube 데이터 시티",
    description: "자동차를 운전해 명조, 이환, 젠레스 존 제로 YouTube 데이터 구역을 탐험하세요.",
    worldAria: "세 게임의 데이터 구역을 자동차로 탐험하는 3D 화면",
    quickLinksAria: "대시보드 바로가기", languageAria: "언어 변경", controlsAria: "조작 방법",
    startDescription: "탁 트인 서킷, 고깔 사이의 정교한 코너링, 경쾌한 점프. 나만의 속도로 달리며 세 게임의 데이터를 만나보세요.",
    startButton: "드라이브 시작", chooseDistrict: "목적지를 선택하세요", districtDescription: "궁금한 게임의 데이터로 바로 이동하세요.",
    openDashboard: "대시보드 열기", exploreCity: "드라이브 시작", skipDrive: "데이터 바로 보기", cityPreview: "나만의 속도로 달리는 드라이빙 파크",
    modesAria: "주행 모드", mapAria: "드라이빙 파크 미니맵", modeFree: "자유 주행", modeRace: "레이싱", modeSlalom: "슬라럼", modeJump: "점프",
    jumpRoutesAria: "점프 코스", jumpBig: "큰 점프", jumpFlow: "연속 점프", jumpWarm: "연습 점프", visitLake: "호숫가로 이동",
    freeDescription: "파크와 데이터 구역을 탐험하고, 오두막이 있는 호숫가도 방문하세요.", raceDescription: "연속 코너와 굽이진 서킷을 달리며 한 바퀴의 기록에 도전하세요.", slalomDescription: "18m 간격의 고깔을 지그재그로 통과하세요. 고깔 충돌마다 2초가 추가됩니다.", jumpDescription: "큰 점프, 연속 점프, 연습 점프. 세 코스에서 부스터로 더 멀리 날아보세요.",
    restart: "다시 시작", tryAgain: "다시 도전하기", bestRecord: "최고 기록", checkpoints: "체크포인트", gates: "게이트", coneHits: "충돌", airborne: "비행 중", landed: "착지 완료", readyJump: "점프 준비", attempts: "회 도전", newBest: "새로운 최고 기록", grassSurface: "잔디 · 감속", raceHint: "빛나는 게이트와 미니맵의 다음 지점을 따라가세요.", slalomHint: "표시된 게이트를 순서대로 통과하세요. 충돌 +2초.", jumpHint: "W로 가속 · Shift로 부스트 · R로 다시 도전", finishClean: "깔끔한 주행을 완주했습니다.", penaltyLabel: "페널티",
    districtCount: "3개 게임 데이터 구역", keyboardHint: "WASD로 이동 · 마우스로 시야 조절", backToLobby: "로비로 돌아가기",
    footerNote: "게임 콘텐츠를, 데이터의 관점으로.", controlsTitle: "드라이빙 조작법",
    accelerator: "액셀", brakeReverse: "브레이크 · 후진", steering: "앞바퀴 조향",
    boost: "부스터", drift: "핸드브레이크 · 드리프트", driftShort: "드리프트", resetCar: "차량 복귀", resetShort: "복귀", driveHint: "액셀·브레이크", cameraView: "드래그·휠 시야",
    loadingCity: "데이터 시티를 불러오는 중…", loadingRequested: "준비되는 즉시 자동으로 출발합니다",
    ready: "탐험 준비 완료", departing: "출발합니다", loadingButton: "도시 불러오는 중…",
    nearestDistrict: "NEAREST DATA DISTRICT", calculating: "거리 계산 중", portalHint: "원 안에 머무르면 대시보드가 열립니다",
    musicOn: "배경 음악 켜짐", musicOff: "배경 음악 꺼짐",
    speedAria: "차량 속도", touchAria: "모바일 차량 조작", steerLeft: "왼쪽으로 회전", steerRight: "오른쪽으로 회전",
    games: { "wuthering-waves": "명조", "neverness-to-everness": "이환", "zenless-zone-zero": "젠레스" },
  },
  zh: {
    title: "DATA DRIVE — 游戏 YouTube 数据城",
    description: "驾驶汽车探索鸣潮、异环和绝区零的 YouTube 数据区域。",
    worldAria: "驾驶汽车探索三个游戏数据区域的 3D 场景",
    quickLinksAria: "数据看板快捷入口", languageAria: "切换语言", controlsAria: "驾驶操作",
    startDescription: "开阔的赛道、灵巧的绕桩和轻快的飞跃。按自己的节奏驾驶，探索三个游戏的数据。",
    startButton: "开始驾驶", chooseDistrict: "选择目的地", districtDescription: "直接打开你关注的游戏数据。",
    openDashboard: "打开数据看板", exploreCity: "开始驾驶", skipDrive: "直接查看数据", cityPreview: "以自己的节奏探索驾驶公园",
    modesAria: "驾驶模式", mapAria: "驾驶公园地图", modeFree: "自由驾驶", modeRace: "竞速", modeSlalom: "绕桩", modeJump: "飞跃",
    jumpRoutesAria: "飞跃路线", jumpBig: "大跳台", jumpFlow: "连续跳", jumpWarm: "练习跳", visitLake: "前往湖畔",
    freeDescription: "探索公园和游戏数据区域，也去湖畔的小木屋看看。", raceDescription: "驶过连续弯道和蜿蜒赛道，挑战单圈最快成绩。", slalomDescription: "交替绕过间隔 18 米的锥桶，每次碰撞加罚 2 秒。", jumpDescription: "大跳台、连续跳、练习跳，三条路线等你加速飞跃。",
    restart: "重新开始", tryAgain: "再试一次", bestRecord: "最佳成绩", checkpoints: "检查点", gates: "通过", coneHits: "碰撞", airborne: "腾空中", landed: "已着陆", readyJump: "准备飞跃", attempts: "次尝试", newBest: "新纪录", grassSurface: "草地 · 减速", raceHint: "跟随高亮门和地图上的下一个检查点。", slalomHint: "按顺序通过标记的门。碰撞 +2 秒。", jumpHint: "W 加速 · Shift 冲刺 · R 重试", finishClean: "干净利落地完成了挑战。", penaltyLabel: "罚时",
    districtCount: "3 个游戏数据区域", keyboardHint: "WASD 移动 · 鼠标调整视角", backToLobby: "返回大厅",
    footerNote: "从数据的角度，看游戏内容。", controlsTitle: "驾驶操作指南",
    accelerator: "油门", brakeReverse: "刹车 · 倒车", steering: "前轮转向",
    boost: "加速器", drift: "手刹漂移", driftShort: "漂移", resetCar: "车辆复位", resetShort: "复位", driveHint: "油门·刹车", cameraView: "拖动·滚轮视角",
    loadingCity: "正在加载数据城…", loadingRequested: "准备完成后将自动出发",
    ready: "探索准备就绪", departing: "出发", loadingButton: "正在加载城市…",
    nearestDistrict: "最近的数据区域", calculating: "正在计算距离", portalHint: "停留在圆环内即可打开数据看板",
    musicOn: "背景音乐已开启", musicOff: "背景音乐已关闭",
    speedAria: "车速", touchAria: "触屏驾驶操作", steerLeft: "向左转", steerRight: "向右转",
    games: { "wuthering-waves": "鸣潮", "neverness-to-everness": "异环", "zenless-zone-zero": "绝区零" },
  },
  en: {
    title: "DATA DRIVE — Game YouTube Data City",
    description: "Drive through the YouTube data districts for Wuthering Waves, NTE, and ZZZ.",
    worldAria: "A 3D driving world connecting three game data districts",
    quickLinksAria: "Dashboard shortcuts", languageAria: "Change language", controlsAria: "Driving controls",
    startDescription: "Open circuits, precise slaloms and a little airtime. Find your own pace, then explore the data behind three games.",
    startButton: "Start driving", chooseDistrict: "Choose your destination", districtDescription: "Go straight to the game data you want to explore.",
    openDashboard: "Open dashboard", exploreCity: "Start driving", skipDrive: "Explore the data", cityPreview: "A motor park at your own pace",
    modesAria: "Driving mode", mapAria: "Motor park map", modeFree: "Free drive", modeRace: "Race", modeSlalom: "Slalom", modeJump: "Jump",
    jumpRoutesAria: "Jump course", jumpBig: "Big air", jumpFlow: "Flow line", jumpWarm: "Warm up", visitLake: "Visit the lakeside",
    freeDescription: "Explore the data districts, then take a detour to the lakeside cabins.", raceDescription: "Link the winding bends and tight corners to set your best lap time.", slalomDescription: "Weave around cones spaced 18 m apart. Every hit adds 2 seconds.", jumpDescription: "Big air, flow line or warm up. Pick a course and boost into the sky.",
    restart: "Restart", tryAgain: "Try again", bestRecord: "Personal best", checkpoints: "Checkpoint", gates: "Gate", coneHits: "Hits", airborne: "In the air", landed: "Landed", readyJump: "Ready to jump", attempts: "attempts", newBest: "New personal best", grassSurface: "Grass · slow down", raceHint: "Follow the highlighted gate and the next point on the map.", slalomHint: "Pass each marked gate in order. Cone hits add 2 seconds.", jumpHint: "W to accelerate · Shift to boost · R to retry", finishClean: "A clean run, all the way to the finish.", penaltyLabel: "Penalty",
    districtCount: "3 game data districts", keyboardHint: "WASD to drive · Mouse to look around", backToLobby: "Back to the lobby",
    footerNote: "Gaming content, seen through data.", controlsTitle: "Driving controls",
    accelerator: "Accelerate", brakeReverse: "Brake · Reverse", steering: "Front-wheel steering",
    boost: "Boost", drift: "Handbrake drift", driftShort: "Drift", resetCar: "Reset car", resetShort: "Reset", driveHint: "Accelerate·Brake", cameraView: "Drag·wheel view",
    loadingCity: "Loading Data City…", loadingRequested: "Departure begins as soon as the city is ready",
    ready: "Ready to explore", departing: "Departing", loadingButton: "Loading city…",
    nearestDistrict: "NEAREST DATA DISTRICT", calculating: "Calculating distance", portalHint: "Stay inside the ring to open the dashboard",
    musicOn: "Background music on", musicOff: "Background music off",
    speedAria: "Vehicle speed", touchAria: "Touch driving controls", steerLeft: "Steer left", steerRight: "Steer right",
    games: { "wuthering-waves": "Wuthering Waves", "neverness-to-everness": "NTE", "zenless-zone-zero": "ZZZ" },
  },
};
let currentLanguage = readPreference("data-city-language", readPreference("vodLanguage", "ko"));
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
  if (persist) {
    writePreference("data-city-language", currentLanguage);
    writePreference("vodLanguage", currentLanguage);
  }
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
  setStartButtonText(copy().loadingButton);
  bootStartButton.setAttribute("aria-busy", "true");
  if (bootLoadingCopy) bootLoadingCopy.textContent = copy().loadingRequested;
});

try {
  const THREE = await import("./vendor/three.module.min.js");
  initDataCity(THREE);
} catch (error) {
  console.error("Failed to start the 3D data city", error);
  bootStartButton?.removeAttribute("aria-busy");
  setStartButtonText("3D 실행 불가 · 바로가기 이용");
  fatalError?.classList.add("visible");
}

function initDataCity(THREE) {
  const canvas = document.querySelector("#world");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  const exitButton = document.querySelector("#exit-drive");
  const canvasMount = document.querySelector("#city-canvas-mount") || canvas?.parentElement;
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
  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = -1;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let previewNeedsRender = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8dce0);
  scene.fog = new THREE.Fog(0xc8dce0, 230, 720);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 850);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  canvas.addEventListener("webglcontextrestored", () => { previewNeedsRender = true; });
  let renderWidth = 0;
  let renderHeight = 0;
  let renderPixelRatio = 0;
  function resizeRenderer() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(canvas.clientWidth || bounds.width));
    const height = Math.max(1, Math.round(canvas.clientHeight || bounds.height));
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.75);
    if (width === renderWidth && height === renderHeight && pixelRatio === renderPixelRatio) return;
    renderWidth = width;
    renderHeight = height;
    renderPixelRatio = pixelRatio;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    previewNeedsRender = true;
  }
  resizeRenderer();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xd8edf4, 0x62734a, 2.3));
  const sunlight = new THREE.DirectionalLight(0xffe5b5, 3.15);
  sunlight.position.set(-55, 175, 70);
  sunlight.target.position.set(45, 0, 0);
  scene.add(sunlight.target);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -205, right: 205, top: 175, bottom: -175, near: 1, far: 540 });
  sunlight.shadow.normalBias = 0.03;
  sunlight.shadow.bias = -0.00008;
  sunlight.shadow.radius = 3;
  scene.add(sunlight);

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
    const meters = Math.max(0, Math.round(distance));
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
  scene.add(world);
  const park = buildDrivingPark(THREE, { makeLabel });
  world.add(park.group);
  const trafficCones = park.coneMeshes || [];
  const { isOnRoad, activeRampAt: activeJumpRampAt, surfaceHeightAt: driveSurfaceHeightAt } = createDrivingSurfaces(park);
  trafficCones.forEach((cone, index) => {
    const position = park.conePositions[index];
    cone.userData.physics = {
      homeX: position.x, homeZ: position.z, homeY: 0, knocked: false,
      velocityX: 0, velocityZ: 0, lift: 0, liftVelocity: 0, fallDirection: 0,
      tilt: 0, tiltVelocity: 0, spin: 0, spinVelocity: 0, hitCooldown: 0,
    };
  });
  zones.forEach(buildDataTerminal);
  let selectedMode = "free";
  let selectedJumpRoute = "big-air";
  const recordsKey = "data-drive-records-v2";
  let mapBounds = { minX: -138, maxX: 138, minZ: -122, maxZ: 122 };
  const challenge = createDrivingChallenges({ circuitCheckpoints: park.checkpoints, slalomGates: park.slalomGates });
  try {
    const records = JSON.parse(readPreference(recordsKey, "{}"));
    for (const mode of ["race", "slalom", "jump"]) {
      if (Number.isFinite(records[mode]) && records[mode] > 0) challenge.setBest(mode, records[mode]);
    }
  } catch { /* Invalid records never prevent a drive. */ }
  let lastResultKey = "";
  let hudAccumulator = 0;
  let lastSurfaceCheck = 0;
  let onRoad = true;
  let wasAirborne = false;
  let landingKick = 0;
  const modeTitles = { free: "modeFree", race: "modeRace", slalom: "modeSlalom", jump: "modeJump" };
  const challengeElements = Object.fromEntries([
    "card", "mode", "tag", "value", "unit", "progress", "extra", "progress-fill", "best", "hint", "countdown", "finish",
  ].map((id) => [id, document.querySelector(`#challenge-${id}`)]));
  const checkpointMarker = new THREE.Group();
  const checkpointMaterial = new THREE.MeshBasicMaterial({ color: 0xe1f6a6, transparent: true, opacity: 0.62, depthWrite: false });
  for (const x of [-0.5, 0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.018, 3.6, 0.16), checkpointMaterial);
    post.position.set(x, 1.8, 0);
    checkpointMarker.add(post);
  }
  const checkpointBar = new THREE.Mesh(new THREE.BoxGeometry(1.015, 0.16, 0.16), checkpointMaterial);
  checkpointBar.position.y = 3.6;
  checkpointMarker.add(checkpointBar);
  checkpointMarker.visible = false;
  scene.add(checkpointMarker);

  const { car, carBody, wheelSpins, frontWheelPivots, boostTrails, driftSmoke } = buildParkCar(THREE);
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

  const inputs = { forward: false, backward: false, left: false, right: false, boost: false, drift: false };
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
    lateralVelocity: 0,
    driftFactor: 0,
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
    airborne: false,
    onRamp: false,
    terrainPitch: 0,
    verticalVelocity: 0,
    jumpCooldown: 0,
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
    pitch: 0.46,
    distance: 12.8,
    targetDistance: 12.8,
    minDistance: 5.5,
    maxDistance: 24,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  };

  resetCar();
  snapCameraToCar();

  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  const launchDrive = () => {
    if (state.started) return;
    clearInputs();
    state.started = true;
    liveStatus.textContent = "";
    scene.fog.near = 190;
    resetCar();
    challenge.start(selectedMode);
    snapCameraToCar();
    updateChallengeHud();
    document.body.append(canvas);
    document.body.classList.add("started");
    startScreen.classList.add("hidden");
    startButton.removeAttribute("aria-busy");
    loadingCopy.textContent = copy().departing;
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
    camera.fov = 55;
    resizeRenderer();
    camera.updateProjectionMatrix();
    window.scrollTo({ top: 0, behavior: "instant" });
    startMusic();
    canvas.focus({ preventScroll: true });
    clock.getDelta();
  };
  const exitDrive = () => {
    if (!state.started) return;
    state.started = false;
    clearInputs();
    resetCar();
    if (cameraOrbit.pointerId !== null && canvas.hasPointerCapture?.(cameraOrbit.pointerId)) {
      canvas.releasePointerCapture(cameraOrbit.pointerId);
    }
    cameraOrbit.dragging = false;
    cameraOrbit.pointerId = null;
    cameraOrbit.yawOffset = 0;
    cameraOrbit.pitch = 0.46;
    cameraOrbit.distance = 12.8;
    cameraOrbit.targetDistance = 12.8;
    snapCameraToCar();

    stopMusic();
    challenge.start("free");
    checkpointMarker.visible = false;
    document.body.classList.remove("started", "camera-dragging");
    startScreen.classList.remove("hidden");
    canvasMount?.append(canvas);
    bootState.requested = false;
    loadingCopy.textContent = copy().ready;
    setStartButtonText(copy().startButton);
    previewNeedsRender = true;
    resizeRenderer();
    window.scrollTo({ top: 0, behavior: "instant" });
    startButton.focus({ preventScroll: true });
    clock.getDelta();
  };
  exitButton?.addEventListener("click", exitDrive);
  document.querySelectorAll("[data-drive-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMode = button.dataset.driveMode;
      document.querySelectorAll("[data-drive-mode]").forEach((item) => {
        const active = item.dataset.driveMode === selectedMode;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      document.body.dataset.driveMode = selectedMode;
      document.querySelector("#mode-description").textContent = copy()[`${selectedMode}Description`];
      if (state.started) restartChallenge();
      else {
        resetCar();
        previewNeedsRender = true;
      }
    });
  });
  document.querySelectorAll("[data-restart]").forEach((button) => button.addEventListener("click", restartChallenge));
  document.querySelector("#scenic-visit").addEventListener("click", () => {
    if (!state.started || selectedMode !== "free") return;
    clearInputs();
    resetCar(park.scenicSpawn);
    cameraOrbit.yawOffset = -0.42;
    snapCameraToCar();
    canvas.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-jump-route]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedJumpRoute = button.dataset.jumpRoute;
      document.querySelectorAll("[data-jump-route]").forEach((item) => {
        const active = item.dataset.jumpRoute === selectedJumpRoute;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      if (state.started && selectedMode === "jump") restartChallenge();
    });
  });
  buildMinimap();
  document.querySelector("#mode-description").textContent = copy().freeDescription;
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
  const isInteractiveTarget = (target) => Boolean(target?.closest?.(
    "button, a, input, select, textarea, details, [contenteditable]:not([contenteditable='false'])",
  ));

  addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isInteractiveTarget(event.target)) return;
    if (!state.started) {
      if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
        event.preventDefault();
        startButton.click();
      }
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
      inputs.boost = true;
      state.boostUntil = performance.now() + 280;
      event.preventDefault();
    }
    if (keyMap.has(event.code)) {
      inputs[keyMap.get(event.code)] = true;
      event.preventDefault();
    }
    if (event.code === "Space") {
      inputs.drift = true;
      event.preventDefault();
    }
    if (event.code === "KeyR" && !event.repeat) restartChallenge();
  });
  addEventListener("keyup", (event) => {
    const control = event.code === "ShiftLeft" || event.code === "ShiftRight"
      ? "boost"
      : event.code === "Space" ? "drift" : keyMap.get(event.code);
    if (!control) return;
    // Always release held controls, even if focus moved to a button mid-drive.
    inputs[control] = false;
    if (!state.started || isInteractiveTarget(event.target)) return;
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
    if (!state.started) return;
    cameraOrbit.yawOffset = 0;
    cameraOrbit.pitch = 0.46;
    cameraOrbit.distance = 12.8;
    cameraOrbit.targetDistance = 12.8;
  });
  addEventListener("blur", () => {
    clearInputs();
    cameraOrbit.dragging = false;
    cameraOrbit.pointerId = null;
    document.body.classList.remove("camera-dragging");
  });
  document.addEventListener("visibilitychange", () => {
    clearInputs();
    previewNeedsRender = true;
    clock.getDelta();
  });
  addEventListener("pageshow", (event) => {
    if (!event.persisted && !state.navigating) return;
    clearInputs();
    resetCar();
    challenge.start(state.started ? selectedMode : "free");
    if (state.started) updateChallengeHud();
    state.navigating = false;
    state.nearestZone = null;
    cameraOrbit.yawOffset = 0;
    cameraOrbit.pitch = 0.46;
    cameraOrbit.distance = 12.8;
    cameraOrbit.targetDistance = 12.8;
    snapCameraToCar();

    previewNeedsRender = true;
    resizeRenderer();
    clock.getDelta();
    if (state.started && musicWanted) {
      stopMusic();
      startMusic();
    }
  });
  addEventListener("datacitylanguagechange", () => {
    loadingCopy.textContent = state.started ? copy().departing : copy().ready;
    previewNeedsRender = true;
    zones.forEach((zone) => {
      zone.shortName = copy().games[zone.id];
      if (zone.label && zone.district) {
        const fadeIndex = proximityFadeMeshes.indexOf(zone.label);
        if (fadeIndex >= 0) proximityFadeMeshes.splice(fadeIndex, 1);
        zone.district.remove(zone.label);
        zone.label.material.map?.dispose();
        zone.label.material.dispose();
        zone.label = makeLabel(zone.shortName, zone.symbol, zone.cssColor);
        zone.label.position.set(0, 4.8, -3.5);
        zone.label.scale.set(6.2, 1.8, 1);
        zone.district.add(zone.label);
        registerProximityFade(zone.label);
      }
    });
    state.nearestZone = null;
    document.querySelector("#mode-description").textContent = copy()[`${selectedMode}Description`];
    updateChallengeHud();
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const press = (event) => {
      if (!state.started) return;
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

  addEventListener("resize", resizeRenderer);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resizeRenderer).observe(canvas);
  reducedMotion.addEventListener("change", () => { previewNeedsRender = true; });

  renderer.setAnimationLoop(animate);

  function buildDataTerminal(zone) {
    const district = new THREE.Group();
    district.position.copy(zone.position);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x556757, roughness: 0.82 });
    for (const x of [-3.3, 3.3]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.4, 10), frameMaterial);
      post.position.set(x, 2.2, -3.5);
      post.castShadow = true;
      district.add(post);
    }
    const label = makeLabel(zone.shortName, zone.symbol, zone.cssColor);
    label.position.set(0, 4.8, -3.5);
    label.scale.set(6.2, 1.8, 1);
    district.add(label);
    const portalRing = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.76, 64), new THREE.MeshBasicMaterial({ color: zone.color, side: THREE.DoubleSide }));
    portalRing.rotation.x = -Math.PI / 2;
    portalRing.position.y = 0.075;
    district.add(portalRing);
    const portalGlow = new THREE.Mesh(new THREE.CircleGeometry(3.55, 64), new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.085, depthWrite: false }));
    portalGlow.rotation.x = -Math.PI / 2;
    portalGlow.position.y = 0.072;
    district.add(portalGlow);
    Object.assign(zone, { district, label, portalRing, portalGlow });
    world.add(district);
  }

  function buildMinimap() {
    const svg = document.querySelector("#map-routes");
    const ns = "http://www.w3.org/2000/svg";
    if (park.lake) {
      const lake = document.createElementNS(ns, "ellipse");
      lake.setAttribute("cx", String(park.lake.x));
      lake.setAttribute("cy", String(park.lake.z));
      lake.setAttribute("rx", String(park.lake.radiusX));
      lake.setAttribute("ry", String(park.lake.radiusZ));
      lake.setAttribute("class", "map-lake");
      svg.append(lake);
    }
    park.roadPaths.forEach((path, index) => {
      const line = document.createElementNS(ns, "polyline");
      const points = path.closed ? [...path.points, path.points[0]] : path.points;
      line.setAttribute("points", points.map((point) => `${point.x},${point.z}`).join(" "));
      line.setAttribute("class", `map-road ${index === 0 ? "circuit" : "practice"}`);
      line.setAttribute("stroke-width", "2");
      svg.append(line);
    });
    park.ramps.filter((ramp) => ramp.launch).forEach((ramp) => {
      const marker = document.createElementNS(ns, "path");
      marker.setAttribute("d", `M ${ramp.centerX} ${ramp.centerZ - 3} l -2.5 5 h 5 Z`);
      marker.setAttribute("class", "map-jump");
      svg.append(marker);
    });
    updateMapBounds();
  }

  function mapPosition(x, z) {
    return { x: (x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX) * 100, y: (z - mapBounds.minZ) / (mapBounds.maxZ - mapBounds.minZ) * 100 };
  }

  function updateMapBounds() {
    mapBounds = selectedMode === "free"
      ? { minX: -145, maxX: 245, minZ: -183, maxZ: 183 }
      : { minX: -138, maxX: 138, minZ: -122, maxZ: 122 };
    document.querySelector("#map-routes").setAttribute("viewBox", `${mapBounds.minX} ${mapBounds.minZ} ${mapBounds.maxX - mapBounds.minX} ${mapBounds.maxZ - mapBounds.minZ}`);
    zones.forEach((zone) => {
      const label = document.querySelector(`.map-label[data-game-label="${zone.id}"]`);
      const position = mapPosition(zone.position.x, zone.position.z);
      if (label) { label.style.left = `${position.x}%`; label.style.top = `${position.y}%`; }
    });
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds * 100));
    return `${String(Math.floor(value / 6000)).padStart(2, "0")}:${String(Math.floor(value / 100) % 60).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
  }

  function updateChallengeHud(snapshot = challenge.snapshot()) {
    const text = copy();
    const timed = selectedMode === "race" || selectedMode === "slalom";
    const playingChallenge = selectedMode !== "free";
    document.querySelector("#jump-route-picker").hidden = selectedMode !== "jump";
    missionCard.hidden = playingChallenge;
    challengeElements.card.hidden = !playingChallenge;
    challengeElements.mode.textContent = text[modeTitles[selectedMode]];
    challengeElements.tag.textContent = selectedMode === "jump" ? "AIR SESSION" : "TIME ATTACK";
    challengeElements.value.textContent = selectedMode === "jump"
      ? (snapshot.currentJump?.distance ?? snapshot.lastJump?.distance ?? 0).toFixed(1)
      : formatTime(snapshot.totalTime);
    challengeElements.unit.textContent = selectedMode === "jump" ? "m" : "";
    challengeElements.progress.textContent = timed
      ? `${text[selectedMode === "race" ? "checkpoints" : "gates"]} ${snapshot.progress} / ${snapshot.total}`
      : snapshot.jumpAirborne ? text.airborne : snapshot.lastJump ? text.landed : text.readyJump;
    challengeElements.extra.textContent = selectedMode === "slalom"
      ? `${text.coneHits} ${snapshot.hits} · +${snapshot.penalty}s`
      : selectedMode === "jump" ? `${snapshot.jumpCount} ${text.attempts}` : "1 LAP";
    challengeElements["progress-fill"].style.width = `${timed ? snapshot.progress / Math.max(1, snapshot.total) * 100 : Math.min(100, (snapshot.currentJump?.distance ?? snapshot.lastJump?.distance ?? 0) * 2.5)}%`;
    challengeElements.best.textContent = selectedMode === "jump"
      ? snapshot.bestJump ? `${snapshot.bestJump.toFixed(1)} m` : "—"
      : snapshot.bestTime === null ? "—" : formatTime(snapshot.bestTime);
    challengeElements.hint.textContent = text[`${selectedMode}Hint`] || "";
    const cue = snapshot.phase === "countdown" ? String(Math.ceil(snapshot.countdown))
      : timed && snapshot.phase === "running" && snapshot.elapsed < 0.7 ? "GO" : "";
    if (challengeElements.countdown.textContent !== cue) challengeElements.countdown.textContent = cue;
    challengeElements.finish.hidden = snapshot.phase !== "finished";
    if (snapshot.phase === "finished") {
      document.querySelector("#finish-eyebrow").textContent = snapshot.newBest ? text.newBest : "FINISH";
      document.querySelector("#finish-time").textContent = formatTime(snapshot.totalTime);
      document.querySelector("#finish-detail").textContent = snapshot.penalty > 0
        ? `${text.coneHits} ${snapshot.hits} · ${text.penaltyLabel} +${snapshot.penalty}s`
        : text.finishClean;
      state.speed = 0;
      state.lateralVelocity = 0;
      boostTrails.visible = false;
      driftSmoke.visible = false;
      document.body.classList.remove("boosting", "drifting");
    }
    if (snapshot.result) {
      const resultKey = `${selectedMode}:${snapshot.jumpCount}:${JSON.stringify(snapshot.result)}`;
      if (resultKey !== lastResultKey) {
        lastResultKey = resultKey;
        writePreference(recordsKey, JSON.stringify(snapshot.bests));
        liveStatus.textContent = `${snapshot.newBest ? text.newBest : text.landed} · ${challengeElements.value.textContent}${challengeElements.unit.textContent}`;
      }
    }
    const gates = selectedMode === "race" ? park.checkpoints : park.slalomGates;
    const nextGate = timed && snapshot.phase !== "finished" ? gates[snapshot.nextCheckpoint] : null;
    checkpointMarker.visible = Boolean(nextGate);
    const target = document.querySelector("#map-target");
    target.hidden = !nextGate;
    if (nextGate) {
      checkpointMarker.position.set(nextGate.x, 0.09, nextGate.z);
      checkpointMarker.rotation.y = -Math.atan2(nextGate.nx, -nextGate.nz);
      checkpointMarker.scale.x = nextGate.width;
      const position = mapPosition(nextGate.x, nextGate.z);
      target.style.left = `${position.x}%`;
      target.style.top = `${position.y}%`;
    }
  }

  function restartChallenge() {
    clearInputs();
    resetCar();
    challenge.start(selectedMode);
    lastResultKey = "";
    liveStatus.textContent = "";
    cameraOrbit.yawOffset = 0;
    snapCameraToCar();
    updateChallengeHud();
    canvas.focus({ preventScroll: true });
    clock.getDelta();
  }

  function snapCameraToCar() {
    const horizontalDistance = Math.cos(cameraOrbit.pitch) * cameraOrbit.distance;
    const angle = -state.yaw + cameraOrbit.yawOffset;
    cameraPosition.copy(car.position).add(new THREE.Vector3(
      Math.sin(angle) * horizontalDistance,
      Math.sin(cameraOrbit.pitch) * cameraOrbit.distance,
      Math.cos(angle) * horizontalDistance,
    ));
    cameraTarget.copy(car.position).add(new THREE.Vector3(Math.sin(state.yaw) * 2.4, 0.72, -Math.cos(state.yaw) * 2.4));
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
  }

  function resolveSceneryCollisions() {
    if (state.rearAxle.y > 2.5) return;
    const fx = Math.sin(state.yaw);
    const fz = -Math.cos(state.yaw);
    if (!state.airborne && park.lake) {
      const centerX = state.rearAxle.x + fx * vehicle.rearAxleOffset;
      const centerZ = state.rearAxle.z + fz * vehicle.rearAxleOffset;
      const dx = centerX - park.lake.x;
      const dz = centerZ - park.lake.z;
      // Fill the shoreline ring: a jump can land beyond its small colliders.
      // This margin clears their outer edges and the irregular waterline.
      const radiusX = park.lake.radiusX + 3.8;
      const radiusZ = park.lake.radiusZ + 3.8;
      const normalizedDistance = Math.hypot(dx / radiusX, dz / radiusZ);
      if (normalizedDistance < 1) {
        const nearCenter = normalizedDistance < 1e-8;
        const directionX = nearCenter ? -fx : dx;
        const directionZ = nearCenter ? -fz : dz;
        const scale = 1 / Math.hypot(directionX / radiusX, directionZ / radiusZ);
        const shoreX = directionX * scale;
        const shoreZ = directionZ * scale;
        state.rearAxle.x += park.lake.x + shoreX - centerX;
        state.rearAxle.z += park.lake.z + shoreZ - centerZ;
        const normalX = shoreX / (radiusX * radiusX);
        const normalZ = shoreZ / (radiusZ * radiusZ);
        if ((fx * normalX + fz * normalZ) * state.speed < 0) state.speed *= -0.18;
        state.lateralVelocity *= 0.4;
      }
    }
    for (const obstacle of park.colliders) {
      const centerX = state.rearAxle.x + fx * vehicle.rearAxleOffset;
      const centerZ = state.rearAxle.z + fz * vehicle.rearAxleOffset;
      const dx = centerX - obstacle.x;
      const dz = centerZ - obstacle.z;
      const distance = Math.hypot(dx, dz);
      const clearance = obstacle.radius + 0.98;
      if (distance >= clearance) continue;
      const nx = distance > 0.001 ? dx / distance : -fx;
      const nz = distance > 0.001 ? dz / distance : -fz;
      state.rearAxle.x += nx * (clearance - distance);
      state.rearAxle.z += nz * (clearance - distance);
      if ((fx * nx + fz * nz) * state.speed < 0) state.speed *= -0.18;
      state.lateralVelocity *= 0.4;
    }
  }

  function knockTrafficCone(cone, impactForwardX, impactForwardZ, impactSpeed, lateralPush) {
    const physics = cone.userData.physics;
    const speedStrength = THREE.MathUtils.clamp(Math.abs(impactSpeed), 1.5, 18);
    const pushLength = Math.hypot(impactForwardX, impactForwardZ) || 1;
    const directionX = impactForwardX / pushLength;
    const directionZ = impactForwardZ / pushLength;
    const sideX = directionZ;
    const sideZ = -directionX;
    const sideStrength = THREE.MathUtils.clamp(lateralPush * 0.5, -0.75, 0.75);
    const fallX = directionX + sideX * sideStrength;
    const fallZ = directionZ + sideZ * sideStrength;

    physics.knocked = true;
    physics.hitCooldown = 0.22;
    physics.velocityX += fallX * (1.25 + speedStrength * 0.13);
    physics.velocityZ += fallZ * (1.25 + speedStrength * 0.13);
    physics.liftVelocity = Math.max(physics.liftVelocity, 0.75 + speedStrength * 0.055);
    physics.fallDirection = Math.atan2(fallX, fallZ);
    physics.tiltVelocity = Math.max(physics.tiltVelocity, 3.2 + speedStrength * 0.12);
    physics.spinVelocity += (lateralPush >= 0 ? -1 : 1) * (1.5 + speedStrength * 0.08);
  }

  function checkTrafficConeCollisions() {
    if (Math.abs(state.speed) < 0.35 || state.rearAxle.y > 1.2) return;
    const directionSign = state.speed >= 0 ? 1 : -1;
    const impactForwardX = forward.x * directionSign;
    const impactForwardZ = forward.z * directionSign;
    const centerX = state.rearAxle.x + forward.x * vehicle.rearAxleOffset;
    const centerZ = state.rearAxle.z + forward.z * vehicle.rearAxleOffset;
    const rightX = Math.cos(state.yaw);
    const rightZ = Math.sin(state.yaw);
    let hitCount = 0;

    trafficCones.forEach((cone) => {
      const physics = cone.userData.physics;
      if (physics.hitCooldown > 0) return;
      const dx = cone.position.x - centerX;
      const dz = cone.position.z - centerZ;
      const longitudinal = dx * forward.x + dz * forward.z;
      const lateral = dx * rightX + dz * rightZ;
      if (Math.abs(longitudinal) > 1.72 || Math.abs(lateral) > 1.22) return;
      if (!physics.knocked) challenge.hitCone(cone.name || String(trafficCones.indexOf(cone)));
      knockTrafficCone(cone, impactForwardX, impactForwardZ, state.speed, lateral);
      hitCount += 1;
    });
    if (hitCount) state.speed *= Math.pow(0.95, hitCount);
  }

  function updateTrafficCones(delta) {
    trafficCones.forEach((cone) => {
      const physics = cone.userData.physics;
      physics.hitCooldown = Math.max(0, physics.hitCooldown - delta);
      if (!physics.knocked) return;

      physics.liftVelocity -= 7.8 * delta;
      physics.lift = Math.max(0, physics.lift + physics.liftVelocity * delta);
      if (physics.lift === 0 && physics.liftVelocity < 0) {
        physics.liftVelocity *= -0.18;
        if (Math.abs(physics.liftVelocity) < 0.16) physics.liftVelocity = 0;
      }

      cone.position.x += physics.velocityX * delta;
      cone.position.z += physics.velocityZ * delta;
      cone.position.y = driveSurfaceHeightAt(cone.position.x, cone.position.z) + physics.lift;
      const slideDamping = Math.exp(-(physics.lift > 0 ? 1.1 : 3.1) * delta);
      physics.velocityX *= slideDamping;
      physics.velocityZ *= slideDamping;

      if (physics.tilt < 1.47) {
        physics.tiltVelocity += 5.8 * delta;
        physics.tilt = Math.min(1.47, physics.tilt + physics.tiltVelocity * delta);
        if (physics.tilt >= 1.47) physics.tiltVelocity *= -0.18;
      } else {
        physics.tilt = THREE.MathUtils.lerp(physics.tilt, 1.47, 1 - Math.exp(-10 * delta));
      }
      physics.spin += physics.spinVelocity * delta;
      physics.spinVelocity *= Math.exp(-2.4 * delta);
      cone.rotation.x = Math.cos(physics.fallDirection) * physics.tilt;
      cone.rotation.z = -Math.sin(physics.fallDirection) * physics.tilt;
      cone.rotation.y = physics.spin;
    });
  }

  function resetTrafficCones() {
    trafficCones.forEach((cone) => {
      const physics = cone.userData.physics;
      cone.position.set(physics.homeX, physics.homeY, physics.homeZ);
      cone.rotation.set(0, 0, 0);
      Object.assign(physics, {
        knocked: false,
        velocityX: 0,
        velocityZ: 0,
        lift: 0,
        liftVelocity: 0,
        fallDirection: 0,
        tilt: 0,
        tiltVelocity: 0,
        spin: 0,
        spinVelocity: 0,
        hitCooldown: 0,
      });
    });
  }

  function makeLabel(title, subtitle, color) {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 768;
    labelCanvas.height = 220;
    const context = labelCanvas.getContext("2d");
    context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
    context.fillStyle = "rgba(25, 42, 33, .94)";
    roundRect(context, 10, 10, 748, 200, 14);
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

  function pointToSegmentDistance(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSquared)) : 0;
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
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
    if ((!object.isMesh && !object.isSprite)
      || !object.visible
      || object.userData.disableProximityFade
      || object.parent?.userData.disableProximityFade
      || object.userData.proximityFade
      || Array.isArray(object.material)) return;
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

  function resetCar(spawnOverride = null) {
    const spawn = spawnOverride || (selectedMode === "jump"
      ? park.jumpRoutes.find((route) => route.id === selectedJumpRoute) || park.spawns.jump
      : park.spawns[selectedMode] || park.spawns.free);
    updateMapBounds();
    state.speed = 0;
    state.yaw = spawn.yaw;
    state.yawRate = 0;
    state.lateralVelocity = 0;
    state.driftFactor = 0;
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
    state.airborne = false;
    state.onRamp = false;
    state.terrainPitch = 0;
    state.verticalVelocity = 0;
    state.jumpCooldown = 0;
    const spawnForwardX = Math.sin(spawn.yaw);
    const spawnForwardZ = -Math.cos(spawn.yaw);
    state.rearAxle.set(spawn.x - spawnForwardX * vehicle.rearAxleOffset, 0, spawn.z - spawnForwardZ * vehicle.rearAxleOffset);
    car.position.set(spawn.x, 0, spawn.z);
    car.rotation.set(0, -spawn.yaw, 0);
    onRoad = isOnRoad(spawn.x, spawn.z);
    wasAirborne = false;
    landingKick = 0;
    lastSurfaceCheck = 0;
    carBody.position.set(0, 0, 0);
    carBody.rotation.set(0, 0, 0);
    frontWheelPivots.forEach((pivot) => { pivot.rotation.y = 0; });
    resetTrafficCones();
    zonePrompt.classList.remove("visible");
    zonePrompt.setAttribute("aria-hidden", "true");
    zonePrompt.style.setProperty("--entry-progress", "0%");
    document.body.classList.remove("boosting", "drifting");
    boostTrails.visible = false;
    driftSmoke.visible = false;
  }

  function stepVehiclePhysics(step) {
    const steeringInput = Number(inputs.right) - Number(inputs.left);
    const boostActive = (inputs.boost || performance.now() < state.boostUntil) && inputs.forward && state.speed >= 0;
    const handbrakeActive = inputs.drift && !state.airborne && state.speed > 2.2;
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
    if (handbrakeActive) longitudinalForce -= 3.8;
    if (!boostActive && state.speed > vehicle.maxForwardSpeed) longitudinalForce -= (state.speed - vehicle.maxForwardSpeed) * 2.4;
    if (!onRoad && !state.airborne) longitudinalForce -= state.speed * 1.25;
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
    const steeringResponse = handbrakeActive ? 28 : steeringInput ? 5.8 : 8.5;
    state.steeringAngle = THREE.MathUtils.lerp(
      state.steeringAngle,
      targetSteering,
      1 - Math.exp(-steeringResponse * step),
    );

    const baseYawRate = Math.abs(state.speed) > 0.015
      ? (state.speed / vehicle.wheelBase) * Math.tan(state.steeringAngle)
      : 0;
    const driftRequested = handbrakeActive && Math.abs(steeringInput) > 0.05;
    const targetDriftFactor = driftRequested
      ? 0.62 + THREE.MathUtils.clamp((state.speed - 2.2) / 10, 0, 1) * 0.38
      : 0;
    if (driftRequested) state.driftFactor = Math.max(state.driftFactor, 0.42);
    state.driftFactor = THREE.MathUtils.lerp(
      state.driftFactor,
      targetDriftFactor,
      1 - Math.exp(-(targetDriftFactor > state.driftFactor ? 22 : 8) * step),
    );
    const driftYawRate = steeringInput
      * Math.sign(state.speed || 1)
      * THREE.MathUtils.lerp(0.82, 2.15, speedRatio);
    const targetYawRate = THREE.MathUtils.clamp(
      driftRequested ? driftYawRate : baseYawRate,
      -2.35,
      2.35,
    );
    const changingDriftDirection = driftRequested
      && Math.abs(state.yawRate) > 0.08
      && Math.sign(state.yawRate) !== Math.sign(targetYawRate);
    state.yawRate = THREE.MathUtils.lerp(
      state.yawRate,
      targetYawRate,
      1 - Math.exp(-(changingDriftDirection ? 38 : driftRequested ? 24 : 13) * step),
    );
    const targetLateralVelocity = driftRequested
      ? -steeringInput * Math.abs(state.speed) * (0.44 + state.driftFactor * 0.16)
      : 0;
    const changingSlideDirection = driftRequested
      && Math.abs(state.lateralVelocity) > 0.08
      && Math.sign(state.lateralVelocity) !== Math.sign(targetLateralVelocity);
    if (!state.airborne) {
      state.lateralVelocity = THREE.MathUtils.lerp(
        state.lateralVelocity,
        targetLateralVelocity,
        1 - Math.exp(-(changingSlideDirection ? 42 : driftRequested ? 25 : 8) * step),
      );
    }
    if (Math.abs(state.lateralVelocity) < 0.01 && state.driftFactor < 0.01) state.lateralVelocity = 0;
    const middleYaw = state.yaw + state.yawRate * step * 0.5;
    forward.set(Math.sin(middleYaw), 0, -Math.cos(middleYaw));
    right.set(Math.cos(middleYaw), 0, Math.sin(middleYaw));
    // Normal driving stays on the bicycle-model heading; the handbrake alone
    // releases rear grip and adds a controlled lateral slide.
    state.rearAxle.addScaledVector(forward, state.speed * step);
    state.rearAxle.addScaledVector(right, state.lateralVelocity * step);
    state.yaw += state.yawRate * step;
    state.wheelRotation -= state.speed * step / vehicle.wheelRadius;
    checkTrafficConeCollisions();

    state.jumpCooldown = Math.max(0, state.jumpCooldown - step);
    const rampContact = activeJumpRampAt(state.rearAxle.x, state.rearAxle.z);
    const movingTowardRamp = rampContact
      && forward.x * rampContact.ramp.directionX + forward.z * rampContact.ramp.directionZ > 0.25
      && state.speed > 2;
    const terrainHeight = 0;
    if (!state.airborne && rampContact) {
      state.rearAxle.y = Math.max(terrainHeight, rampContact.height);
      state.onRamp = true;
      if (rampContact.ramp.launch !== false && rampContact.progress > 0.91 && movingTowardRamp && state.jumpCooldown <= 0) {
        state.speed = THREE.MathUtils.clamp(state.speed, 2, vehicle.boostedMaxForwardSpeed);
        state.airborne = true;
        state.onRamp = false;
        state.verticalVelocity = Math.max(3.4, state.speed * rampContact.ramp.height / (rampContact.ramp.halfLength * 2)) + 1.6;
        state.jumpCooldown = 1.2;
      }
    } else if (state.airborne) {
      state.verticalVelocity -= 10.5 * step;
      state.rearAxle.y += state.verticalVelocity * step;
      const landingHeight = driveSurfaceHeightAt(state.rearAxle.x, state.rearAxle.z);
      if (state.rearAxle.y <= landingHeight) {
        state.rearAxle.y = landingHeight;
        state.verticalVelocity = 0;
        state.airborne = false;
      }
    } else {
      state.onRamp = false;
      const dropHeight = state.rearAxle.y - terrainHeight;
      if (dropHeight > 0.38 && Math.abs(state.speed) > 0.8) {
        state.airborne = true;
        state.verticalVelocity = 0;
      } else {
        state.rearAxle.y = terrainHeight;
      }
    }

    if (!state.airborne) {
      const surfaceBehind = driveSurfaceHeightAt(
        state.rearAxle.x - forward.x * vehicle.wheelBase * 0.35,
        state.rearAxle.z - forward.z * vehicle.wheelBase * 0.35,
      );
      const surfaceAhead = driveSurfaceHeightAt(
        state.rearAxle.x + forward.x * vehicle.wheelBase * 0.65,
        state.rearAxle.z + forward.z * vehicle.wheelBase * 0.65,
      );
      const targetTerrainPitch = Math.atan2(surfaceAhead - surfaceBehind, vehicle.wheelBase);
      state.terrainPitch = THREE.MathUtils.lerp(
        state.terrainPitch,
        THREE.MathUtils.clamp(targetTerrainPitch, -0.34, 0.34),
        1 - Math.exp(-10 * step),
      );
    } else {
      state.terrainPitch = THREE.MathUtils.lerp(state.terrainPitch, 0, 1 - Math.exp(-4 * step));
    }

    state.rearAxle.x = THREE.MathUtils.clamp(state.rearAxle.x, park.bounds.minX, park.bounds.maxX);
    state.rearAxle.z = THREE.MathUtils.clamp(state.rearAxle.z, park.bounds.minZ, park.bounds.maxZ);
    resolveSceneryCollisions();
  }

  function updateCar(delta) {
    state.physicsAccumulator = Math.min(state.physicsAccumulator + delta, vehicle.fixedStep * 8);
    while (state.physicsAccumulator >= vehicle.fixedStep) {
      stepVehiclePhysics(vehicle.fixedStep);
      state.physicsAccumulator -= vehicle.fixedStep;
    }
    const boostActive = (inputs.boost || performance.now() < state.boostUntil) && inputs.forward && state.speed > 0.2;
    const driftActive = state.driftFactor > 0.08 && Math.abs(state.lateralVelocity) > 0.08 && !state.airborne;
    document.body.classList.toggle("boosting", boostActive);
    document.body.classList.toggle("drifting", driftActive);
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
    driftSmoke.visible = driftActive;
    if (driftActive) {
      const smokeStrength = THREE.MathUtils.clamp(state.driftFactor + Math.abs(state.lateralVelocity) / 9, 0.25, 1);
      driftSmoke.children.forEach((puff) => {
        const pulse = 0.82 + Math.sin(state.elapsed * 12 + puff.userData.phase) * 0.18;
        puff.scale.setScalar((0.78 + smokeStrength * 0.72) * pulse);
        puff.material.opacity = puff.userData.baseOpacity * smokeStrength * pulse;
      });
    }

    forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    car.position.copy(state.rearAxle).addScaledVector(forward, vehicle.rearAxleOffset);
    if (!state.airborne) car.position.y += Math.sin(state.terrainPitch) * vehicle.rearAxleOffset;
    // The physics heading is clockwise-positive, while Three.js rotates Y counter-clockwise.
    car.rotation.order = "YXZ";
    car.rotation.y = -state.yaw;
    car.rotation.x = state.terrainPitch;
    if (wasAirborne && !state.airborne) landingKick = 0.13;
    wasAirborne = state.airborne;
    landingKick *= Math.exp(-11 * delta);
    updateTrafficCones(delta);

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
    const wheelSteeringResponse = state.driftFactor > 0.08 ? 26 : 12;
    frontWheelPivots[0].rotation.y = THREE.MathUtils.lerp(frontWheelPivots[0].rotation.y, -leftWheelAngle, 1 - Math.exp(-wheelSteeringResponse * delta));
    frontWheelPivots[1].rotation.y = THREE.MathUtils.lerp(frontWheelPivots[1].rotation.y, -rightWheelAngle, 1 - Math.exp(-wheelSteeringResponse * delta));
    wheelSpins.forEach((wheel) => { wheel.rotation.x = state.wheelRotation; });

    const lateralLoad = THREE.MathUtils.clamp(state.yawRate * Math.abs(state.speed) / 22, -1, 1);
    const targetRoll = lateralLoad * 0.095;
    const jumpPitch = state.airborne ? THREE.MathUtils.clamp(state.verticalVelocity * 0.045, -0.16, 0.13) : 0;
    const targetPitch = THREE.MathUtils.clamp(state.acceleration / 42, -0.055, 0.055) + jumpPitch;
    carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, targetRoll, 1 - Math.exp(-6.5 * delta));
    carBody.rotation.x = THREE.MathUtils.lerp(carBody.rotation.x, targetPitch, 1 - Math.exp(-7.5 * delta));
    carBody.position.y = Math.sin(state.elapsed * 13) * Math.min(0.012, Math.abs(state.speed) * 0.0008) - landingKick;
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
      const pulse = reducedMotion.matches ? 1 : 1 + Math.sin(state.elapsed * 2.2 + index * 1.9) * 0.035;
      zone.portalRing.scale.setScalar(pulse);
      zone.portalGlow.material.opacity = reducedMotion.matches ? 0.085 : 0.085 + Math.sin(state.elapsed * 2.6 + index) * 0.025;
      if (zone.hazard && !reducedMotion.matches) zone.hazard.rotation.y += delta * 0.75;
    });

    if (nearest !== state.nearestZone) {
      state.nearestZone = nearest;
      if (selectedMode === "free") liveStatus.textContent = nearestCopy(nearest);
    }
    missionCard.style.setProperty("--zone-color", nearest.cssColor);
    missionCard.style.setProperty("--distance-progress", `${Math.max(3, 100 - nearestDistance * 2.1)}%`);
    missionName.textContent = zoneName(nearest);
    missionDistance.textContent = distanceCopy(nearestDistance);

    const portal = nearestDistance < 3.8 ? nearest : null;
    if (selectedMode === "free" && portal && state.started && !state.navigating) {
      if (state.activePortal !== portal) state.entryProgress = 0;
      state.activePortal = portal;
      state.entryProgress = Math.min(1, state.entryProgress + delta / 1.45);
      state.speed *= Math.exp(-3.2 * delta);
      zonePrompt.classList.add("visible");
      zonePrompt.setAttribute("aria-hidden", "false");
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
      if (!state.entryProgress) {
        zonePrompt.classList.remove("visible");
        zonePrompt.setAttribute("aria-hidden", "true");
      }
    }
  }

  function updateHud() {
    speedValue.textContent = String(Math.round(Math.abs(state.speed) * 3.6)).padStart(2, "0");
    gear.textContent = state.speed > 0.15 ? "D" : state.speed < -0.15 ? "R" : "N";
    const position = mapPosition(car.position.x, car.position.z);
    const mapX = THREE.MathUtils.clamp(position.x, 2, 98);
    const mapY = THREE.MathUtils.clamp(position.y, 2, 98);
    mapCar.style.left = `${mapX}%`;
    mapCar.style.top = `${mapY}%`;
    mapCar.style.transform = `rotate(${state.yaw}rad)`;
    document.querySelector("#surface-pill").hidden = onRoad || state.airborne;
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) return;
    if (!state.started) {
      if (!previewNeedsRender) return;
      scene.fog.near = 420;
      camera.position.set(204, 244, 268);
      camera.lookAt(45, 0, 0);
      camera.fov = 54;
      camera.updateProjectionMatrix();
      proximityFadeMeshes.forEach((object) => {
        object.material.opacity = object.userData.proximityFade.originalOpacity;
        object.material.depthWrite = object.userData.proximityFade.originalDepthWrite;
      });
      renderer.render(scene, camera);
      previewNeedsRender = false;
      return;
    }
    state.elapsed += delta;
    const phase = challenge.snapshot().phase;
    if (phase !== "countdown" && phase !== "finished") {
      lastSurfaceCheck += delta;
      if (lastSurfaceCheck > 0.12) {
        onRoad = isOnRoad(car.position.x, car.position.z);
        lastSurfaceCheck = 0;
      }
      updateCar(delta);
    }
    const result = challenge.update({
      x: car.position.x, z: car.position.z, y: car.position.y,
      speed: state.speed, airborne: state.airborne, delta,
    });
    hudAccumulator += delta;
    if (hudAccumulator >= 0.08 || result.phase !== phase) {
      updateChallengeHud(result);
      hudAccumulator = 0;
    }
    updatePortals(delta);
    updateCamera(delta);
    updateProximityFades(delta);
    updateHud();
    renderer.render(scene, camera);
  }
}
