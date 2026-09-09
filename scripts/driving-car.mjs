/** A compact coupe for the park. Forward is -Z; wheel spin is about X. */
export function buildParkCar(THREE) {
  const car = new THREE.Group();
  car.name = "Park coupe";
  car.scale.setScalar(0.78);
  const carBody = new THREE.Group();
  carBody.name = "Suspended coupe body";
  car.add(carBody);

  const paint = new THREE.MeshStandardMaterial({ color: 0xf1eee0, roughness: 0.32, metalness: 0.22 });
  const sage = new THREE.MeshStandardMaterial({ color: 0x849783, roughness: 0.36, metalness: 0.18 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x29443e, roughness: 0.18, metalness: 0.48 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x242a26, roughness: 0.95 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x354038, roughness: 0.65, metalness: 0.18 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xc4c9bd, roughness: 0.31, metalness: 0.72 });
  const brake = new THREE.MeshStandardMaterial({ color: 0x6c746c, roughness: 0.67, metalness: 0.45 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff5d8, emissive: 0xffedc4, emissiveIntensity: 0.28, roughness: 0.28 });
  const rearLamp = new THREE.MeshStandardMaterial({ color: 0xab4035, emissive: 0x9f352b, emissiveIntensity: 0.16, roughness: 0.3 });

  function mesh(geometry, material, parent = carBody) {
    const part = new THREE.Mesh(geometry, material);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }

  // A profile is drawn in longitudinal Z / height Y, then extruded across X.
  function profileGeometry(points, width, bevel = 0.035) {
    const shape = new THREE.Shape();
    points.forEach(([z, y], index) => {
      if (index === 0) shape.moveTo(-z, y);
      else shape.lineTo(-z, y);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      steps: 1,
      bevelEnabled: bevel > 0,
      bevelSegments: 2,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 12,
    });
    geometry.rotateY(Math.PI / 2);
    geometry.translate(-width / 2, 0, 0);
    return geometry;
  }

  function box(width, height, depth, material, x, y, z, parent = carBody) {
    const part = mesh(new THREE.BoxGeometry(width, height, depth), material, parent);
    part.position.set(x, y, z);
    return part;
  }

  function strut(a, b, radius, material, parent = carBody) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const part = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material, parent);
    part.position.copy(from).add(to).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return part;
  }

  const silhouette = [
    [-1.93, 0.46], [-1.92, 0.77], [-1.70, 1.01], [-1.32, 1.10],
    [-0.70, 1.12], [0.30, 1.10], [1.30, 1.13], [1.80, 1.02],
    [1.92, 0.77], [1.88, 0.46], [1.60, 0.46],
  ];
  // Open wheel arches retain visible tire shoulders and real ground clearance.
  for (let index = 0; index <= 14; index += 1) {
    const angle = index / 14 * Math.PI;
    silhouette.push([1.12 + Math.cos(angle) * 0.48, 0.54 + Math.sin(angle) * 0.48]);
  }
  silhouette.push([0.64, 0.46], [-0.67, 0.46]);
  for (let index = 0; index <= 14; index += 1) {
    const angle = index / 14 * Math.PI;
    silhouette.push([-1.15 + Math.cos(angle) * 0.48, 0.54 + Math.sin(angle) * 0.48]);
  }
  silhouette.push([-1.63, 0.46]);
  const shell = mesh(profileGeometry(silhouette, 1.96, 0.045), paint);
  shell.name = "Beveled body with open wheel arches";

  // Tapered glazing and an inset sage roof give the car a low coupe silhouette.
  const cabin = mesh(profileGeometry([
    [-0.84, 1.115], [-0.30, 1.66], [0.44, 1.70], [0.68, 1.59], [1.12, 1.13],
  ], 1.54, 0.018), glass);
  cabin.name = "Sloped windscreen and side glazing";
  mesh(profileGeometry([
    [-0.31, 1.66], [-0.25, 1.715], [0.45, 1.75], [0.66, 1.63], [0.46, 1.68],
  ], 1.57, 0.022), sage).name = "Sage roof";
  mesh(profileGeometry([
    [-1.72, 1.06], [-1.32, 1.13], [-0.79, 1.145], [-0.84, 1.105], [-1.65, 1.03],
  ], 0.94, 0.01), sage).name = "Inset hood panel";

  for (const side of [-1, 1]) {
    const x = side * 0.79;
    strut([x, 1.125, -0.84], [x, 1.675, -0.30], 0.038, paint);
    strut([x, 1.68, 0.47], [x, 1.13, 1.12], 0.047, paint);
    strut([x, 1.145, -0.76], [x, 1.145, 1.035], 0.022, alloy);
    strut([x, 1.15, 0.34], [x, 1.70, 0.34], 0.024, trim);
    box(0.052, 0.06, 1.18, sage, side * 1.015, 0.54, -0.015);
    box(0.028, 0.028, 0.19, alloy, side * 1.017, 1.045, 0.39);
    strut([side * 0.79, 1.24, -0.61], [side * 1.04, 1.23, -0.61], 0.025, trim);
    const mirror = mesh(new THREE.SphereGeometry(0.14, 12, 8), sage);
    mirror.scale.set(1, 0.45, 0.7);
    mirror.position.set(side * 1.045, 1.245, -0.60);
  }

  // Recessed dark intakes, warm headlamps and a quiet red rear light bar.
  box(1.48, 0.15, 0.065, trim, 0, 0.65, -1.931);
  box(1.78, 0.075, 0.12, trim, 0, 0.485, -1.895);
  box(1.61, 0.17, 0.075, trim, 0, 0.59, 1.919);
  box(1.58, 0.065, 0.053, rearLamp, 0, 0.88, 1.883);
  box(0.39, 0.135, 0.035, paint, 0, 0.706, 1.959);
  box(0.31, 0.05, 0.038, trim, 0, 0.718, 1.961);
  for (const side of [-1, 1]) {
    const light = box(0.45, 0.085, 0.066, lamp, side * 0.67, 0.88, -1.871);
    light.rotation.y = side * 0.13;
    const exhaust = mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.22, 12), alloy);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(side * 0.59, 0.50, 1.98);
    const exhaustOpening = mesh(new THREE.CircleGeometry(0.053, 12), rubber);
    exhaustOpening.position.set(side * 0.59, 0.50, 2.095);
  }

  const wheelSpins = [];
  const frontWheelPivots = [];
  // Cylinder geometry is baked onto X. Every visible rim part shares that axle.
  const tireGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.30, 24);
  tireGeometry.rotateZ(Math.PI / 2);
  const rimGeometry = new THREE.CylinderGeometry(0.275, 0.275, 0.315, 20);
  rimGeometry.rotateZ(Math.PI / 2);
  const recessGeometry = new THREE.CylinderGeometry(0.225, 0.225, 0.326, 20);
  recessGeometry.rotateZ(Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(0.083, 0.083, 0.355, 12);
  hubGeometry.rotateZ(Math.PI / 2);

  [[-1.12, -1.15], [1.12, -1.15], [-1.12, 1.12], [1.12, 1.12]].forEach(([x, z], index) => {
    const pivot = new THREE.Group();
    pivot.name = `${index < 2 ? "Front" : "Rear"} ${x < 0 ? "left" : "right"} wheel pivot`;
    pivot.position.set(x, 0.54, z);
    const spin = new THREE.Group();
    spin.name = "Wheel axle X";
    mesh(tireGeometry, rubber, spin);
    mesh(rimGeometry, alloy, spin);
    mesh(recessGeometry, brake, spin);
    mesh(hubGeometry, alloy, spin);
    for (let spoke = 0; spoke < 5; spoke += 1) {
      const angle = spoke / 5 * Math.PI * 2;
      const bar = box(0.035, 0.18, 0.044, alloy, Math.sign(x) * 0.17, Math.cos(angle) * 0.137, Math.sin(angle) * 0.137, spin);
      bar.rotation.x = angle;
    }
    pivot.add(spin);
    car.add(pivot);
    wheelSpins.push(spin);
    if (index < 2) frontWheelPivots.push(pivot);
  });

  const boostTrails = new THREE.Group();
  boostTrails.name = "Restrained exhaust boost";
  boostTrails.visible = false;
  for (const x of [-0.59, 0.59]) {
    const plume = mesh(
      new THREE.ConeGeometry(0.075, 0.58, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xefcca0, transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false }),
      boostTrails,
    );
    plume.position.set(x, 0.50, 2.36);
    plume.rotation.x = Math.PI / 2;
    plume.userData.baseOpacity = 0.19;
    plume.castShadow = false;
    const core = mesh(
      new THREE.SphereGeometry(0.058, 10, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe5ba, transparent: true, opacity: 0.30, depthWrite: false }),
      boostTrails,
    );
    core.position.set(x, 0.50, 2.10);
    core.userData.baseOpacity = 0.30;
    core.userData.isBoostCore = true;
    core.castShadow = false;
  }
  car.add(boostTrails);

  const driftSmoke = new THREE.Group();
  driftSmoke.name = "Soft tire dust";
  driftSmoke.visible = false;
  const smokeGeometry = new THREE.SphereGeometry(1, 9, 6);
  for (const x of [-1.05, 1.05]) {
    for (let index = 0; index < 3; index += 1) {
      const size = 0.19 + index * 0.07;
      // Radius is baked in: the driving loop animates each puff's scalar scale.
      const geometry = smokeGeometry.clone().scale(size, size * 0.72, size);
      const puff = mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xe3e4d7, transparent: true, opacity: 0.11, depthWrite: false }), driftSmoke);
      puff.position.set(x, 0.24 + index * 0.055, 1.25 + index * 0.33);
      puff.userData.baseOpacity = 0.11 - index * 0.024;
      puff.userData.phase = index * 1.7 + (x > 0 ? 0.8 : 0);
      puff.castShadow = false;
    }
  }
  smokeGeometry.dispose();
  car.add(driftSmoke);

  return { car, carBody, wheelSpins, frontWheelPivots, boostTrails, driftSmoke };
}
