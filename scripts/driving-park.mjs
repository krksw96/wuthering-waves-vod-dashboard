/** Geometry and a shared, renderer-independent course contract. Units are metres. */
export function buildDrivingPark(THREE, { makeLabel } = {}) {
  const group = new THREE.Group();
  group.name = "Meadow motor park";
  const roadHalfWidth = 6.5;
  const bounds = { minX: -105, maxX: 105, minZ: -98, maxZ: 98 };
  let seed = 47261;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mat = (color, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });
  const grass = mat(0x748c65);
  const shoulder = mat(0xa5a58b);
  const white = mat(0xe4dfc9);
  const red = mat(0xb77253);
  const charcoal = mat(0x34413a);
  const metal = mat(0x7c8a78, 0.65);
  const timber = mat(0x80755b);
  const asphalt = mat(0x535c57);
  const palePaint = mat(0xd6d8bf);
  const sagePaint = mat(0xacbf89);

  // Fine grain keeps the track tactile without external textures or downloads.
  if (typeof document !== "undefined") {
    const scenerySeed = seed;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 128;
    const context = tile.getContext("2d");
    context.fillStyle = "#89908a";
    context.fillRect(0, 0, 128, 128);
    for (let index = 0; index < 3500; index += 1) {
      context.fillStyle = random() > 0.5 ? "rgba(255,255,235,.12)" : "rgba(22,30,20,.14)";
      context.fillRect(random() * 128, random() * 128, 1.2, 1.2);
    }
    const texture = new THREE.CanvasTexture(tile);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    asphalt.map = texture;
    seed = scenerySeed;
  }

  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = group) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, material, x, y, z, parent) {
    const object = mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
    object.castShadow = true;
    return object;
  }
  function disc(radius, material, x, z, y = 0.04) {
    const object = mesh(new THREE.CircleGeometry(radius, 64), material, x, y, z);
    object.rotation.x = -Math.PI / 2;
    return object;
  }
  function ribbon(points, inner, outer, material, y, closed = false) {
    const positions = [], uvs = [], indices = [];
    let length = 0;
    for (let index = 0; index <= points.length - (closed ? 0 : 1); index += 1) {
      const point = points[index % points.length];
      const before = points[closed ? (index - 1 + points.length) % points.length : Math.max(0, index - 1)];
      const after = points[closed ? (index + 1) % points.length : Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x, dz = after.z - before.z;
      const distance = Math.hypot(dx, dz) || 1;
      const nx = -dz / distance, nz = dx / distance;
      if (index) length += Math.hypot(point.x - points[(index - 1) % points.length].x, point.z - points[(index - 1) % points.length].z);
      positions.push(point.x + nx * inner, y, point.z + nz * inner, point.x + nx * outer, y, point.z + nz * outer);
      uvs.push(inner / 5, length / 5, outer / 5, length / 5);
      if (index) {
        const current = index * 2;
        indices.push(current - 2, current - 1, current, current, current - 1, current + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    // Clockwise tracks and connector paths can have either orientation.
    const surfaceMaterial = material.clone();
    surfaceMaterial.side = THREE.DoubleSide;
    if (y > 0.05) {
      surfaceMaterial.polygonOffset = true;
      surfaceMaterial.polygonOffsetFactor = -1;
      surfaceMaterial.polygonOffsetUnits = -1;
    }
    const object = mesh(geometry, surfaceMaterial);
    object.userData.disableProximityFade = true;
    return object;
  }
  function road(points, halfWidth, closed = false) {
    ribbon(points, -halfWidth - 0.65, halfWidth + 0.65, shoulder, 0.015, closed);
    ribbon(points, -halfWidth, halfWidth, asphalt, 0.035, closed);
  }
  function paintLine(a, b, width = 0.13, material = palePaint, y = 0.058) {
    return ribbon([a, b], -width / 2, width / 2, material, y);
  }
  function label(title, subtitle, x, z, width = 7) {
    if (!makeLabel) return;
    const sign = makeLabel(title, subtitle, "#dbe6be");
    sign.position.set(x, 4.5, z);
    sign.scale.set(width, width * 0.286, 1);
    group.add(sign);
    for (const side of [-1, 1]) box(0.12, 4.1, 0.12, timber, x + side * width * 0.42, 2.05, z);
  }

  const ground = mesh(new THREE.PlaneGeometry(850, 850), grass, 0, -0.025, 0);
  ground.rotation.x = -Math.PI / 2;
  const anchors = [[0, 72], [37, 59], [67, 34], [77, -12], [62, -49], [24, -70], [-28, -70], [-68, -46], [-82, 0], [-78, 42], [-52, 70]];
  const curve = new THREE.CatmullRomCurve3(anchors.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "catmullrom", 0.4);
  const circuitPoints = curve.getSpacedPoints(384).slice(0, -1).map(({ x, z }) => ({ x, z }));
  const roadPaths = [{ points: circuitPoints, halfWidth: roadHalfWidth, closed: true }];
  road(circuitPoints, roadHalfWidth, true);
  ribbon(circuitPoints, -6.02, -5.88, palePaint, 0.056, true);
  ribbon(circuitPoints, 5.88, 6.02, palePaint, 0.056, true);
  // Muted red-and-ivory kerbs make the racing line legible in daylight.
  for (let index = 0; index < circuitPoints.length; index += 8) {
    const segment = Array.from({ length: 9 }, (_, step) => circuitPoints[(index + step) % circuitPoints.length]);
    const material = index % 16 ? white : red;
    ribbon(segment, 6.5, 7.12, material, 0.067);
    ribbon(segment, -7.12, -6.5, material, 0.067);
  }
  const checkpoints = Array.from({ length: 10 }, (_, index) => {
    const pointIndex = Math.floor(index / 10 * circuitPoints.length);
    const point = circuitPoints[pointIndex];
    const before = circuitPoints[(pointIndex + 383) % 384], after = circuitPoints[(pointIndex + 1) % 384];
    const length = Math.hypot(after.x - before.x, after.z - before.z);
    return { id: `circuit-${index}`, index: pointIndex, ...point, nx: (after.x - before.x) / length, nz: (after.z - before.z) / length, width: 13 };
  });
  for (const gate of checkpoints) {
    const sideX = -gate.nz, sideZ = gate.nx;
    for (const side of [-1, 1]) {
      const pole = box(0.11, 1.1, 0.11, white, gate.x + sideX * side * 7.9, 0.55, gate.z + sideZ * side * 7.9);
      pole.rotation.y = Math.atan2(gate.nx, gate.nz);
    }
    // Small chevrons repeat along the course and show its direction.
    const start = { x: gate.x - gate.nx * 2, z: gate.z - gate.nz * 2 };
    paintLine({ x: start.x + sideX * 0.7, z: start.z + sideZ * 0.7 }, gate, 0.18);
    paintLine({ x: start.x - sideX * 0.7, z: start.z - sideZ * 0.7 }, gate, 0.18);
  }
  const startGate = checkpoints[0];
  const finishStripe = new THREE.Group();
  finishStripe.position.set(startGate.x, 0.064, startGate.z);
  finishStripe.rotation.y = -Math.atan2(startGate.nx, -startGate.nz);
  for (let row = 0; row < 2; row += 1) for (let cell = 0; cell < 16; cell += 1) {
    const tile = mesh(new THREE.PlaneGeometry(0.8, 0.7), (row + cell) % 2 ? charcoal : white, (cell - 7.5) * 0.8, 0, (row - 0.5) * 0.7, finishStripe);
    tile.rotation.x = -Math.PI / 2;
  }
  group.add(finishStripe);
  label("MOTOR PARK", "START / FINISH", 12, 86, 7);

  const addRoad = (anchors, halfWidth) => {
    const points = anchors.length > 2
      ? new THREE.CatmullRomCurve3(anchors.map(({ x, z }) => new THREE.Vector3(x, 0, z)), false, "centripetal")
        .getPoints(anchors.length * 16).map(({ x, z }) => ({ x, z }))
      : anchors;
    roadPaths.push({ points, halfWidth, closed: false });
    road(points, halfWidth);
  };
  addRoad([{ x: -45, z: 49 }, { x: -45, z: -47 }], 5.5);
  addRoad([{ x: 46, z: 51 }, { x: 46, z: -47 }], 6);
  addRoad([{ x: -45, z: 47 }, { x: -20, z: 46 }, { x: 0, z: 33 }, { x: 24, z: 43 }, { x: 46, z: 47 }], 3.6);
  addRoad([{ x: -45, z: -45 }, { x: -26, z: -38 }, { x: 0, z: -34 }, { x: 25, z: -38 }, { x: 46, z: -45 }], 3.5);
  addRoad([{ x: -28, z: -12 }, { x: 0, z: 0 }, { x: 28, z: -12 }], 3.4);
  addRoad([{ x: 0, z: -34 }, { x: 0, z: 0 }, { x: 0, z: 33 }, { x: 0, z: 72 }], 3.5);
  addRoad([{ x: -45, z: 0 }, { x: -28, z: -12 }], 3.1);
  addRoad([{ x: 46, z: 0 }, { x: 28, z: -12 }], 3.1);
  const roadPads = [{ x: 0, z: 4, radius: 9 }, { x: -28, z: -12, radius: 6 }, { x: 28, z: -12, radius: 6 }, { x: 0, z: 33, radius: 6 }];
  for (const pad of roadPads) disc(pad.radius, asphalt, pad.x, pad.z, 0.048);

  const conePositions = Array.from({ length: 7 }, (_, index) => ({ id: `slalom-cone-${index}`, x: -45, z: 30 - index * 10, radius: 0.46 }));
  const coneMeshes = conePositions.map((position) => {
    const cone = new THREE.Group();
    cone.name = position.id;
    cone.position.set(position.x, 0, position.z);
    box(0.76, 0.09, 0.76, charcoal, 0, 0.095, 0, cone);
    const orange = mat(0xe2873c);
    const body = mesh(new THREE.ConeGeometry(0.31, 0.93, 16), orange, 0, 0.6, 0, cone);
    body.castShadow = true;
    mesh(new THREE.CylinderGeometry(0.124, 0.183, 0.18, 16), white, 0, 0.615, 0, cone);
    group.add(cone);
    return cone;
  });
  const slalomGates = [
    { id: "slalom-start", x: -45, z: 38, nx: 0, nz: -1, width: 9 },
    ...conePositions.map((cone, index) => ({ id: `slalom-gate-${index}`, x: -45 + (index % 2 ? 2.65 : -2.65), z: cone.z, nx: 0, nz: -1, width: 3.2 })),
    { id: "slalom-finish", x: -45, z: -38, nx: 0, nz: -1, width: 9 },
  ];
  slalomGates.forEach((gate) => {
    paintLine({ x: gate.x - gate.width / 2, z: gate.z }, { x: gate.x + gate.width / 2, z: gate.z }, 0.20, sagePaint, 0.077);
    for (const side of [-1, 1]) disc(0.15, sagePaint, gate.x + side * gate.width / 2, gate.z, 0.08);
  });
  label("SLALOM", "PRECISION / 07 CONES", -54, 39, 5);

  const ramps = [
    { id: "hero-jump", centerX: 46, centerZ: 10, halfLength: 5, halfWidth: 4, height: 2.4, directionX: 0, directionZ: -1, baseHeight: 0, launch: true },
    { id: "jump-landing", centerX: 46, centerZ: -14, halfLength: 7, halfWidth: 5, height: 2.4, directionX: 0, directionZ: 1, baseHeight: 0, launch: false },
  ];
  for (const ramp of ramps) {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(ramp.centerX, 0.055, ramp.centerZ);
    rampGroup.rotation.y = -Math.atan2(ramp.directionX, -ramp.directionZ);
    const shape = new THREE.Shape();
    shape.moveTo(-ramp.halfLength, 0); shape.lineTo(ramp.halfLength, 0); shape.lineTo(ramp.halfLength, ramp.height); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: ramp.halfWidth * 2, bevelEnabled: false });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-ramp.halfWidth, 0, 0);
    const wedge = mesh(geometry, mat(0x7f8977), 0, 0, 0, rampGroup);
    wedge.castShadow = true;
    const slopeLength = Math.hypot(ramp.halfLength * 2, ramp.height);
    const top = mesh(new THREE.PlaneGeometry(ramp.halfWidth * 2 - 0.12, slopeLength), asphalt, 0, ramp.height / 2 + 0.035, 0, rampGroup);
    top.rotation.x = -Math.PI / 2 + Math.atan2(ramp.height, ramp.halfLength * 2);
    for (const side of [-1, 1]) {
      const edge = box(0.14, 0.075, slopeLength, white, side * (ramp.halfWidth - 0.18), ramp.height / 2 + 0.075, 0, rampGroup);
      edge.rotation.x = Math.atan2(ramp.height, ramp.halfLength * 2);
    }
    group.add(rampGroup);
  }
  for (let distance = 10; distance <= 40; distance += 10) {
    const z = 5 - distance;
    paintLine({ x: 51.5, z }, { x: 52, z }, 0.18);
    if (makeLabel) {
      const marker = makeLabel(`${distance} M`, "AIR DISTANCE", "#dbe6be");
      marker.position.set(54.5, 1.1, z); marker.scale.set(2.3, 0.66, 1); group.add(marker);
    }
  }
  label("AIRFIELD", "ACCELERATE / TAKE OFF", 56, 32, 5);

  const colliders = [];
  function roadDistance(x, z) {
    let best = Infinity;
    for (const path of roadPaths) for (let index = 0; index < path.points.length - (path.closed ? 0 : 1); index += 1) {
      const a = path.points[index], b = path.points[(index + 1) % path.points.length];
      const dx = b.x - a.x, dz = b.z - a.z;
      const projection = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - a.x - dx * projection, z - a.z - dz * projection) - path.halfWidth);
    }
    for (const pad of roadPads) best = Math.min(best, Math.hypot(x - pad.x, z - pad.z) - pad.radius);
    return best;
  }
  const leafMaterials = [mat(0x566f46), mat(0x6d8451), mat(0x87915d), mat(0x456b51)];
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.32, 3.7, 7);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
  let treeCount = 0;
  for (let attempt = 0; attempt < 360 && treeCount < 82; attempt += 1) {
    const x = (random() - 0.5) * 230, z = (random() - 0.5) * 214;
    if (roadDistance(x, z) < 7 || Math.hypot(x + 15, z + 51) < 14) continue;
    const height = 0.8 + random() * 0.8;
    const trunk = mesh(trunkGeometry, timber, x, 1.85 * height, z); trunk.scale.y = height; trunk.castShadow = true;
    const crown = mesh(crownGeometry, leafMaterials[treeCount % 4], x, 4.5 * height, z);
    crown.scale.set(2.2 * height, 2.65 * height, 2.15 * height);
    crown.rotation.y = random() * Math.PI; crown.castShadow = true;
    const crownSide = mesh(crownGeometry, leafMaterials[(treeCount + 1) % 4], x + height, 3.9 * height, z + 0.4);
    crownSide.scale.set(1.8 * height, 1.85 * height, 1.7 * height); crownSide.castShadow = true;
    colliders.push({ x, z, radius: 0.36 }); treeCount += 1;
  }
  const rockMaterial = mat(0x8a9081);
  for (let index = 0; index < 28; index += 1) {
    const x = (random() - 0.5) * 230, z = (random() - 0.5) * 214;
    if (roadDistance(x, z) < 4) continue;
    const size = 0.4 + random() * 1.0;
    const rock = mesh(crownGeometry, rockMaterial, x, size * 0.35, z);
    rock.scale.set(size * 1.3, size * 0.7, size); rock.rotation.y = random() * 6.28; rock.castShadow = true;
    colliders.push({ x, z, radius: size });
  }
  // A low service pavilion and distant, gently rounded hills frame the park.
  box(10, 3.1, 6, mat(0xd0c9b0), -15, 1.55, -51);
  box(11.5, 0.30, 7.2, charcoal, -15, 3.25, -51);
  for (const x of [-18, -12]) box(3.6, 2.4, 0.07, metal, x, 1.3, -47.96);
  for (const x of [-19, -15, -11]) colliders.push({ x, z: -51, radius: 3.6 });
  label("PIT STOP", "MEADOW SERVICE", -15, -51, 6);
  for (let index = 0; index < 15; index += 1) {
    const angle = index / 15 * Math.PI * 2;
    const radius = 205 + random() * 50;
    const hill = mesh(new THREE.SphereGeometry(1, 22, 12), mat(index % 2 ? 0x93a784 : 0x869c7c), Math.sin(angle) * radius, -9, Math.cos(angle) * radius);
    hill.scale.set(50 + random() * 30, 16 + random() * 24, 45 + random() * 35);
    hill.userData.disableProximityFade = true;
  }
  // A simple wooden boundary reads as a park, without blocking the race line.
  for (let index = -2; index <= 2; index += 1) for (const side of [-1, 1]) {
    const x = index * 17, z = side * 96;
    box(15, 0.12, 0.12, timber, x, 0.9, z);
    box(15, 0.12, 0.12, timber, x, 1.4, z);
    for (const edge of [-1, 1]) box(0.14, 1.6, 0.14, timber, x + edge * 7.5, 0.8, z);
  }
  return {
    group, circuitPoints, roadHalfWidth, checkpoints, slalomGates, conePositions, coneMeshes, ramps,
    spawns: {
      race: { x: startGate.x - startGate.nx * 7, z: startGate.z - startGate.nz * 7, yaw: Math.atan2(startGate.nx, -startGate.nz) },
      slalom: { x: -45, z: 44, yaw: 0 }, jump: { x: 46, z: 40, yaw: 0 }, free: { x: 0, z: 8, yaw: 0 },
    },
    bounds, roadPaths, roadPads, colliders,
  };
}
