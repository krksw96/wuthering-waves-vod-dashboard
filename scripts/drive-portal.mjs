const fatalError = document.querySelector("#fatal-error");
const bootStartButton = document.querySelector("#start-button");
const bootLoadingCopy = document.querySelector("#loading-copy");
const bootState = { launch: null, requested: false };

bootStartButton?.addEventListener("click", () => {
  if (bootState.launch) {
    bootState.launch();
    return;
  }
  bootState.requested = true;
  bootStartButton.textContent = "도시 불러오는 중…";
  bootStartButton.setAttribute("aria-busy", "true");
  if (bootLoadingCopy) bootLoadingCopy.textContent = "준비되는 즉시 자동으로 출발합니다";
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

  const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 180);
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
      shortName: "명조",
      name: "명조 데이터 구역",
      position: new THREE.Vector3(-28, 0, -12),
      color: 0x65e8de,
      cssColor: "#65e8de",
      href: "dashboard.html?game=wuthering-waves",
      symbol: "WAVE ARCHIVE",
    },
    {
      id: "neverness-to-everness",
      shortName: "이환",
      name: "이환 데이터 구역",
      position: new THREE.Vector3(28, 0, -12),
      color: 0xff5c9f,
      cssColor: "#ff5c9f",
      href: "dashboard.html?game=neverness-to-everness",
      symbol: "NEON CITY",
    },
    {
      id: "zenless-zone-zero",
      shortName: "젠레스",
      name: "젠레스 존 제로 데이터 구역",
      position: new THREE.Vector3(0, 0, 33),
      color: 0xffd84d,
      cssColor: "#ffd84d",
      href: "dashboard.html?game=zenless-zone-zero",
      symbol: "HOLLOW DEPOT",
    },
  ];

  const world = new THREE.Group();
  const atmosphere = { rain: null };
  scene.add(world);
  buildGround();
  buildSkyline();
  zones.forEach((zone, index) => buildDistrict(zone, index));

  const { car, wheels, frontWheelPivots } = buildCar();
  scene.add(car);

  const inputs = { forward: false, backward: false, left: false, right: false };
  const state = {
    started: false,
    speed: 0,
    yaw: 0,
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

  resetCar();
  camera.position.set(0, 8.2, 16);
  camera.lookAt(0, 1, 0);
  const launchDrive = () => {
    if (state.started) return;
    state.started = true;
    document.body.classList.add("started");
    startScreen.classList.add("hidden");
    startButton.removeAttribute("aria-busy");
    canvas.focus();
    clock.getDelta();
  };
  bootState.launch = launchDrive;
  startButton.disabled = false;
  startButton.removeAttribute("aria-busy");
  loadingCopy.textContent = bootState.requested ? "출발합니다" : "준비 완료 · 시동을 걸어 출발하세요";
  if (bootState.requested) launchDrive();

  const keyMap = new Map([
    ["KeyW", "forward"], ["ArrowUp", "forward"],
    ["KeyS", "backward"], ["ArrowDown", "backward"],
    ["KeyA", "left"], ["ArrowLeft", "left"],
    ["KeyD", "right"], ["ArrowRight", "right"],
  ]);

  addEventListener("keydown", (event) => {
    if (keyMap.has(event.code)) {
      inputs[keyMap.get(event.code)] = true;
      event.preventDefault();
    }
    if (event.code === "KeyR" && !event.repeat) resetCar();
    if ((event.code === "Enter" || event.code === "Space") && !state.started) startButton.click();
  });
  addEventListener("keyup", (event) => {
    if (!keyMap.has(event.code)) return;
    inputs[keyMap.get(event.code)] = false;
    event.preventDefault();
  });
  addEventListener("blur", clearInputs);
  document.addEventListener("visibilitychange", () => {
    clearInputs();
    clock.getDelta();
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
    for (let index = 0; index < 76; index += 1) {
      const x = random() * 106 - 53;
      const z = random() * 106 - 53;
      if (Math.hypot(x, z) < 13.5 || distanceToAnyRoad(x, z) < 5.7 || zones.some((zone) => Math.hypot(x - zone.position.x, z - zone.position.z) < 11.5)) continue;
      const width = 2.4 + random() * 4.8;
      const depth = 2.4 + random() * 4.6;
      const height = 5 + random() * 19;
      const building = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterials[index % buildingMaterials.length]);
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      building.add(body);

      const neon = neonColors[index % neonColors.length];
      const stripMaterial = new THREE.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 2.3, roughness: 0.25 });
      const floorCount = Math.min(6, Math.max(2, Math.floor(height / 3.2)));
      for (let floor = 1; floor <= floorCount; floor += 1) {
        if (random() > 0.72) continue;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.035, 0.055, depth + 0.035), stripMaterial);
        strip.position.y = 1.2 + floor * (height - 2) / (floorCount + 1);
        building.add(strip);
      }
      if (index % 4 === 0) {
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 3 + random() * 3, 6), stripMaterial);
        antenna.position.y = height + 1.5;
        building.add(antenna);
      }
      if (index % 3 === 0) {
        const verticalSign = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.65, width * 0.24), Math.min(5.4, height * 0.45), 0.07), stripMaterial);
        verticalSign.position.set(width * (random() > 0.5 ? 0.28 : -0.28), height * 0.48, depth / 2 + 0.055);
        building.add(verticalSign);
      }
      building.position.set(x, 0, z);
      world.add(building);
    }

    buildElevatedRail();
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
    deck.position.set(0, 7.4, -34);
    deck.castShadow = true;
    world.add(deck);
    const lightLine = new THREE.Mesh(new THREE.BoxGeometry(110, 0.1, 0.12), railGlow);
    lightLine.position.set(0, 7.05, -31.92);
    world.add(lightLine);
    for (let x = -48; x <= 48; x += 12) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.25, 7.3, 1.25), concrete);
      pillar.position.set(x, 3.65, -34);
      pillar.castShadow = true;
      world.add(pillar);
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

    const baseMaterial = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.24), roughness: 0.55, metalness: 0.45 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: zone.color, emissive: zone.color, emissiveIntensity: 1.4, roughness: 0.35 });
    const arrangements = [
      [[-6.5, -2, 1.5, 4.8], [6.5, -1, 1.6, 6.8], [-6.2, 4, 1.3, 3.3]],
      [[-6.4, -1, 1.6, 7], [6.3, -2, 1.8, 4.6], [5.7, 4.5, 1.25, 3.5]],
      [[-6.6, -2, 1.8, 4], [6.4, -2, 1.8, 4], [-6.1, 4.4, 1.5, 5.2], [6.1, 4.4, 1.5, 5.2]],
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
        wave.position.set(x, height + 1.15, z);
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
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.48, 3.7),
      new THREE.MeshStandardMaterial({ color: 0xf3f5ff, roughness: 0.34, metalness: 0.42 }),
    );
    chassis.position.y = 0.72;
    chassis.castShadow = true;
    group.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.72, 0.72, 1.72),
      new THREE.MeshStandardMaterial({ color: 0x252b52, roughness: 0.16, metalness: 0.66 }),
    );
    cabin.position.set(0, 1.25, 0.2);
    cabin.rotation.x = -0.03;
    cabin.castShadow = true;
    group.add(cabin);

    const bumperMaterial = new THREE.MeshStandardMaterial({ color: 0x111425, roughness: 0.52, metalness: 0.72 });
    [-1.78, 1.78].forEach((z) => {
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.18, 0.2), bumperMaterial);
      bumper.position.set(0, 0.55, z);
      group.add(bumper);
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x080912, roughness: 0.84 });
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x8b93ad, roughness: 0.3, metalness: 0.78 });
    const allWheels = [];
    const steerPivots = [];
    [[-1.12, -1.15], [1.12, -1.15], [-1.12, 1.12], [1.12, 1.12]].forEach(([x, z], index) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.54, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), wheelMaterial);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 12), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      tire.add(hub);
      pivot.add(tire);
      group.add(pivot);
      allWheels.push(tire);
      if (index < 2) steerPivots.push(pivot);
    });

    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xd8ffff });
    const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff3568 });
    [-0.67, 0.67].forEach((x) => {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.07), headlightMaterial);
      headlight.position.set(x, 0.77, -1.87);
      group.add(headlight);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.07), taillightMaterial);
      taillight.position.set(x, 0.77, 1.87);
      group.add(taillight);
    });
    const underglow = new THREE.PointLight(0x8c78ff, 4.5, 7, 2.2);
    underglow.position.set(0, 0.36, 0);
    group.add(underglow);
    return { car: group, wheels: allWheels, frontWheelPivots: steerPivots };
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

  function resetCar() {
    state.speed = 0;
    state.yaw = 0;
    state.entryProgress = 0;
    state.activePortal = null;
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    zonePrompt.classList.remove("visible");
    zonePrompt.style.setProperty("--entry-progress", "0%");
  }

  function updateCar(delta) {
    const throttle = Number(inputs.forward) - Number(inputs.backward);
    const steering = Number(inputs.right) - Number(inputs.left);
    const maxForward = 17;
    const maxReverse = -7.5;

    if (throttle > 0) state.speed += (state.speed < 0 ? 20 : 10.5) * delta;
    else if (throttle < 0) state.speed -= (state.speed > 0 ? 21 : 8) * delta;
    else state.speed *= Math.exp(-2.15 * delta);
    state.speed = THREE.MathUtils.clamp(state.speed, maxReverse, maxForward);
    if (Math.abs(state.speed) < 0.025) state.speed = 0;

    const speedRatio = Math.min(Math.abs(state.speed) / maxForward, 1);
    const turnStrength = (0.9 + speedRatio * 1.3) * Math.sign(state.speed || 1);
    if (Math.abs(state.speed) > 0.08) state.yaw += steering * turnStrength * delta;

    forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    car.position.addScaledVector(forward, state.speed * delta);
    car.position.x = THREE.MathUtils.clamp(car.position.x, -54, 54);
    car.position.z = THREE.MathUtils.clamp(car.position.z, -54, 54);
    car.rotation.y = state.yaw;
    car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, -steering * speedRatio * 0.06, 1 - Math.exp(-8 * delta));

    frontWheelPivots.forEach((pivot) => {
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, steering * 0.42, 1 - Math.exp(-10 * delta));
    });
    wheels.forEach((wheel) => { wheel.rotation.x -= state.speed * delta / 0.42; });
  }

  function updateCamera(delta) {
    forward.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    targetCameraPosition.copy(car.position).addScaledVector(forward, -8.5).add(new THREE.Vector3(0, 5.7, 0));
    targetCameraLook.copy(car.position).addScaledVector(forward, 4.1).add(new THREE.Vector3(0, 1.05, 0));
    const positionDamping = 1 - Math.exp(-4.3 * delta);
    const lookDamping = 1 - Math.exp(-5.7 * delta);
    cameraPosition.lerp(targetCameraPosition, positionDamping);
    cameraTarget.lerp(targetCameraLook, lookDamping);
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
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
      liveStatus.textContent = `가장 가까운 목적지가 ${nearest.name}(으)로 변경되었습니다.`;
    }
    missionCard.style.setProperty("--zone-color", nearest.cssColor);
    missionCard.style.setProperty("--distance-progress", `${Math.max(3, 100 - nearestDistance * 2.1)}%`);
    missionName.textContent = nearest.name;
    missionDistance.textContent = `${Math.max(0, Math.round(nearestDistance * 10))}m 남음`;

    const portal = nearestDistance < 3.8 ? nearest : null;
    if (portal && state.started && !state.navigating) {
      if (state.activePortal !== portal) state.entryProgress = 0;
      state.activePortal = portal;
      state.entryProgress = Math.min(1, state.entryProgress + delta / 1.45);
      state.speed *= Math.exp(-3.2 * delta);
      zonePrompt.classList.add("visible");
      zonePrompt.style.setProperty("--prompt-color", portal.cssColor);
      zonePrompt.style.setProperty("--entry-progress", `${state.entryProgress * 100}%`);
      zonePromptTitle.textContent = `${portal.name} 포털 진입 중`;
      if (state.entryProgress >= 1) {
        state.navigating = true;
        zonePromptTitle.textContent = `${portal.name} 여는 중…`;
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
    if (state.started && !document.hidden) updateCar(delta);
    updatePortals(delta);
    updateCamera(delta);
    updateHud();
    renderer.render(scene, camera);
  }
}
