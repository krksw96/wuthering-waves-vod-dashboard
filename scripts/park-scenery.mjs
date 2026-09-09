/** Quiet lakeside scenery for the eastern park expansion. Units are metres. */
export function buildParkScenery(THREE) {
  const group = new THREE.Group();
  group.name = "Lakeside retreat";
  const colliders = [];
  const exclusions = [];
  const lake = { x: 174, z: 0, radiusX: 27, radiusZ: 36 };
  let seed = 19547;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const material = (color, roughness = 0.95) => new THREE.MeshStandardMaterial({ color, roughness });
  const palette = {
    sand: material(0xc1b994), shore: material(0xa8ae89), water: material(0x568f89, 0.32),
    shallowWater: material(0x73a298, 0.5), gravel: material(0xaaa88b),
    wood: material(0x8e775a), darkWood: material(0x615644), cream: material(0xd4c9a9),
    roof: material(0x9b6653), roofDark: material(0x687367), glass: material(0x91b8ac, 0.3),
    stone: material(0x999e8c), metal: material(0x4b5c51, 0.7), reed: material(0x849060),
  };
  function mesh(geometry, mat, x = 0, y = 0, z = 0, parent = group) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(width, height, depth, mat, x, y, z, parent = group) {
    const object = mesh(new THREE.BoxGeometry(width, height, depth), mat, x, y, z, parent);
    object.castShadow = true;
    return object;
  }
  function batchDetails(parent) {
    const batches = new Map();
    for (const object of [...parent.children]) {
      if (!object.isMesh || object.isInstancedMesh) continue;
      object.updateMatrix();
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(object.matrix);
      const batch = batches.get(object.material) || { positions: [], normals: [], uvs: [], castShadow: false };
      batch.positions.push(...geometry.attributes.position.array);
      batch.normals.push(...geometry.attributes.normal.array);
      batch.uvs.push(...geometry.attributes.uv.array);
      batch.castShadow ||= object.castShadow;
      batches.set(object.material, batch);
      geometry.dispose(); object.geometry.dispose(); parent.remove(object);
    }
    for (const [mat, batch] of batches) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(batch.normals, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(batch.uvs, 2));
      const object = mesh(geometry, mat, 0, 0, 0, parent);
      object.castShadow = batch.castShadow;
    }
  }
  function lakeSurface(scale, mat, y) {
    const shape = new THREE.Shape();
    for (let index = 0; index <= 80; index += 1) {
      const angle = index / 80 * Math.PI * 2;
      const variation = 1 + Math.sin(angle * 3 + 0.3) * 0.035 + Math.sin(angle * 5 - 0.4) * 0.025;
      const x = Math.cos(angle) * lake.radiusX * variation * scale;
      const z = Math.sin(angle) * lake.radiusZ * variation * scale;
      if (index === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    }
    shape.closePath();
    const surface = mesh(new THREE.ShapeGeometry(shape), mat, lake.x, y, lake.z);
    surface.rotation.x = -Math.PI / 2;
    surface.userData.disableProximityFade = true;
    return surface;
  }
  lakeSurface(1.13, palette.shore, 0.011);
  lakeSurface(1.075, palette.sand, 0.018);
  lakeSurface(1, palette.shallowWater, 0.026);
  lakeSurface(0.945, palette.water, 0.031);
  const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xd6e2c9, transparent: true, opacity: 0.24, depthWrite: false });
  for (let index = 0; index < 34; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 0.76;
    const glint = mesh(new THREE.PlaneGeometry(0.8 + random() * 2.9, 0.065 + random() * 0.08), glintMaterial,
      lake.x + Math.cos(angle) * lake.radiusX * distance, 0.038, lake.z + Math.sin(angle) * lake.radiusZ * distance);
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = 0.13;
    glint.userData.disableProximityFade = true;
  }
  exclusions.push({ x: lake.x, z: lake.z, radius: 43 });
  for (let index = 0; index < 72; index += 1) {
    const angle = index / 72 * Math.PI * 2;
    colliders.push({ x: lake.x + Math.cos(angle) * 26.5, z: lake.z + Math.sin(angle) * 35.4, radius: 2.5 });
  }

  function cabin(x, z, yaw, roofMaterial) {
    const cabinGroup = new THREE.Group();
    cabinGroup.name = "Timber lakeside cabin";
    cabinGroup.position.set(x, 0, z);
    cabinGroup.rotation.y = yaw;
    group.add(cabinGroup);
    box(9, 0.35, 8, palette.stone, 0, 0.175, 0, cabinGroup);
    box(8.2, 4.2, 7.2, palette.wood, 0, 2.4, 0, cabinGroup);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-4.8, 0); roofShape.lineTo(0, 2.8); roofShape.lineTo(4.8, 0); roofShape.closePath();
    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: 8.4, bevelEnabled: false });
    const roof = mesh(roofGeometry, palette.wood, 0, 4.45, -4.2, cabinGroup);
    roof.castShadow = true;
    for (const side of [-1, 1]) {
      const slope = box(Math.hypot(4.8, 2.8), 0.19, 8.75, roofMaterial, side * 2.4, 5.93, 0, cabinGroup);
      slope.rotation.z = -side * Math.atan2(2.8, 4.8);
      box(0.15, 4.25, 0.15, palette.darkWood, side * 4.12, 2.4, -3.66, cabinGroup);
      box(0.15, 4.25, 0.15, palette.darkWood, side * 4.12, 2.4, 3.66, cabinGroup);
      box(0.18, 3.6, 0.18, palette.darkWood, side * 4.02, 2.25, -5.7, cabinGroup);
      box(0.18, 1.15, 1.95, palette.darkWood, side * 4.03, 1.1, -4.74, cabinGroup);
      box(0.2, 0.16, 2.3, palette.cream, side * 4.03, 1.7, -4.7, cabinGroup);
      box(0.18, 1.8, 2.0, palette.cream, side * 4.2, 2.6, 0.4, cabinGroup);
      box(0.08, 1.4, 1.6, palette.glass, side * 4.32, 2.6, 0.4, cabinGroup);
      box(0.1, 0.08, 1.64, palette.cream, side * 4.38, 2.6, 0.4, cabinGroup);
      box(0.1, 1.44, 0.08, palette.cream, side * 4.38, 2.6, 0.4, cabinGroup);
    }
    box(0.2, 0.18, 8.85, roofMaterial, 0, 7.33, 0, cabinGroup);
    box(1.05, 2.0, 1.05, palette.stone, 2.3, 6.7, 1.5, cabinGroup);
    box(1.28, 0.19, 1.28, palette.darkWood, 2.3, 7.76, 1.5, cabinGroup);
    box(8.55, 0.18, 2.35, roofMaterial, 0, 4.05, -4.75, cabinGroup);
    box(9, 0.3, 2.7, palette.wood, 0, 0.32, -4.7, cabinGroup);
    box(3, 0.18, 0.7, palette.stone, 0, 0.09, -6.2, cabinGroup);
    box(1.75, 2.9, 0.15, palette.darkWood, 0, 1.82, -3.66, cabinGroup);
    box(0.07, 0.25, 0.12, palette.cream, 0.56, 1.67, -3.78, cabinGroup);
    for (let row = 0; row < 8; row += 1) {
      const y = 0.58 + row * 0.49;
      box(8.24, 0.035, 0.035, palette.darkWood, 0, y, 3.62, cabinGroup);
      for (const side of [-1, 1]) box(0.035, 0.035, 7.2, palette.darkWood, side * 4.12, y, 0, cabinGroup);
    }
    for (const side of [-1, 1]) {
      box(2.05, 1.7, 0.16, palette.cream, side * 2.65, 2.55, -3.68, cabinGroup);
      box(1.65, 1.3, 0.08, palette.glass, side * 2.65, 2.55, -3.79, cabinGroup);
      box(0.08, 1.34, 0.1, palette.cream, side * 2.65, 2.55, -3.85, cabinGroup);
      box(1.7, 0.08, 0.1, palette.cream, side * 2.65, 2.55, -3.85, cabinGroup);
    }
    colliders.push({ x, z, radius: 5.6 });
    exclusions.push({ x, z, radius: 12 });
    batchDetails(cabinGroup);
  }
  cabin(137, 79, -0.12, palette.roof);
  cabin(167, 81, 0.08, palette.roofDark);
  cabin(215, 78, 0.18, palette.roof);

  function bench(x, z, yaw) {
    const benchGroup = new THREE.Group();
    benchGroup.name = "Lakeside bench";
    benchGroup.position.set(x, 0, z);
    benchGroup.rotation.y = yaw;
    group.add(benchGroup);
    const pad = mesh(new THREE.CircleGeometry(2.7, 18), palette.gravel, x, 0.012, z);
    pad.rotation.x = -Math.PI / 2;
    pad.userData.disableProximityFade = true;
    for (const side of [-1, 1]) {
      box(0.12, 0.9, 1.1, palette.metal, side * 1.18, 0.45, 0, benchGroup);
      box(0.12, 1.6, 0.12, palette.metal, side * 1.18, 0.92, 0.46, benchGroup);
    }
    for (const dz of [-0.32, 0, 0.32]) box(3.15, 0.14, 0.25, palette.wood, 0, 0.97, dz, benchGroup);
    for (const y of [1.27, 1.62]) box(3.15, 0.24, 0.14, palette.wood, 0, y, 0.46, benchGroup);
    colliders.push({ x, z, radius: 1.7 });
    exclusions.push({ x, z, radius: 4.5 });
    batchDetails(benchGroup);
  }
  bench(139, 34, -0.9);
  bench(207, 22, 1.2);
  bench(186, 45, 0.15);
  for (let index = 0; index < 15; index += 1) box(4.2, 0.16, 0.54, palette.wood, 173.5, 0.45, 34 + index * 0.61);
  for (const x of [171.5, 175.5]) for (const z of [34.5, 39, 42.2]) {
    box(0.18, 1.55, 0.18, palette.darkWood, x, 0.65, z);
  }
  exclusions.push({ x: 173.5, z: 39, radius: 6.5 });

  function footpath(points, width = 2.1) {
    const positions = [];
    const indices = [];
    for (let index = 0; index < points.length; index += 1) {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      const dx = after[0] - before[0], dz = after[1] - before[1];
      const length = Math.hypot(dx, dz) || 1;
      const sideX = -dz / length * width / 2, sideZ = dx / length * width / 2;
      positions.push(points[index][0] + sideX, 0.014, points[index][1] + sideZ,
        points[index][0] - sideX, 0.014, points[index][1] - sideZ);
      if (index) {
        const vertex = index * 2;
        indices.push(vertex - 2, vertex, vertex - 1, vertex, vertex + 1, vertex - 1);
      }
      exclusions.push({ x: points[index][0], z: points[index][1], radius: 4.0 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const pathMaterial = palette.gravel.clone();
    pathMaterial.side = THREE.DoubleSide;
    const path = mesh(geometry, pathMaterial);
    path.userData.disableProximityFade = true;
  }
  footpath([[136, 73], [139, 66], [145, 58], [153, 51], [163, 46], [173.5, 44]]);
  footpath([[167, 75], [167, 67], [168, 60], [172, 52], [173.5, 44]]);
  footpath([[214, 72], [211, 64], [206, 53], [196, 47], [187, 44]]);

  // Batch fine shoreline details so the extra scenery adds few draw calls.
  const reedInstances = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.028, 0.045, 1, 5), palette.reed, 132);
  const reedHeads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.062, 0.062, 0.21, 5), palette.darkWood, 132);
  const instance = new THREE.Object3D();
  let reedCount = 0;
  for (let clump = 0; clump < 30; clump += 1) {
    const angle = clump / 30 * Math.PI * 2;
    if (Math.sin(angle) > 0.85 && Math.abs(Math.cos(angle)) < 0.34) continue;
    const variation = 1 + Math.sin(angle * 3 + 0.3) * 0.035 + Math.sin(angle * 5 - 0.4) * 0.025;
    const x = lake.x + Math.cos(angle) * lake.radiusX * variation * 1.025;
    const z = lake.z + Math.sin(angle) * lake.radiusZ * variation * 1.025;
    for (let stem = 0; stem < 4; stem += 1) {
      const height = 0.7 + random() * 0.95;
      const stemX = x + (random() - 0.5) * 1.3, stemZ = z + (random() - 0.5) * 1.3;
      instance.position.set(stemX, height / 2, stemZ);
      instance.rotation.set((random() - 0.5) * 0.12, 0, (random() - 0.5) * 0.12);
      instance.scale.set(1, height, 1); instance.updateMatrix();
      reedInstances.setMatrixAt(reedCount, instance.matrix);
      instance.position.y = height - 0.03;
      instance.scale.set(1, 1, 1); instance.updateMatrix();
      reedHeads.setMatrixAt(reedCount, instance.matrix);
      reedCount += 1;
    }
  }
  for (const reeds of [reedInstances, reedHeads]) {
    reeds.count = reedCount;
    reeds.instanceMatrix.needsUpdate = true;
    reeds.userData.disableProximityFade = true;
    group.add(reeds);
  }
  const stoneInstances = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), palette.stone, 22);
  for (let index = 0; index < 22; index += 1) {
    const angle = index / 22 * Math.PI * 2 + 0.03;
    const size = 0.45 + random() * 0.9;
    const x = lake.x + Math.cos(angle) * 29.5, z = lake.z + Math.sin(angle) * 39.4;
    instance.position.set(x, size * 0.24, z);
    instance.rotation.set(0, random() * Math.PI, 0);
    instance.scale.set(size * 1.1, size * 0.58, size * 0.9); instance.updateMatrix();
    stoneInstances.setMatrixAt(index, instance.matrix);
  }
  stoneInstances.castShadow = true;
  stoneInstances.receiveShadow = true;
  stoneInstances.userData.disableProximityFade = true;
  group.add(stoneInstances);

  for (const [x, z] of [[130, 74], [158, 74], [207, 73], [193, 49]]) {
    const lamp = new THREE.Group();
    lamp.name = "Warm park lantern";
    lamp.position.set(x, 0, z); group.add(lamp);
    box(0.2, 3.5, 0.2, palette.darkWood, 0, 1.75, 0, lamp);
    box(0.8, 0.12, 0.8, palette.metal, 0, 3.35, 0, lamp);
    const glow = material(0xd8c89c, 0.6);
    glow.emissive.setHex(0xa88747); glow.emissiveIntensity = 0.2;
    box(0.51, 0.65, 0.51, glow, 0, 3.75, 0, lamp);
    const cap = mesh(new THREE.ConeGeometry(0.61, 0.35, 4), palette.metal, 0, 4.23, 0, lamp);
    cap.rotation.y = Math.PI / 4;
    colliders.push({ x, z, radius: 0.25 });
    exclusions.push({ x, z, radius: 2.5 });
  }
  return { group, colliders, exclusions, lake };
}
