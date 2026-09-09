const ROAD_PADDING = 0.5;
const EPSILON = 1e-8;

const isPoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.z);

function roadSegments(paths) {
  const segments = [];
  for (const path of paths) {
    if (!Array.isArray(path.points) || !Number.isFinite(path.halfWidth) || path.halfWidth < 0) continue;
    const width = path.halfWidth + ROAD_PADDING;
    const count = path.points.length;
    const segmentCount = count === 1 ? 1 : path.closed ? count : count - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const from = path.points[index];
      const to = path.points[(index + 1) % count];
      if (!isPoint(from) || !isPoint(to)) continue;
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      segments.push({
        x: from.x,
        z: from.z,
        dx,
        dz,
        lengthSquared: dx * dx + dz * dz,
        widthSquared: width * width,
        minX: Math.min(from.x, to.x) - width,
        maxX: Math.max(from.x, to.x) + width,
        minZ: Math.min(from.z, to.z) - width,
        maxZ: Math.max(from.z, to.z) + width,
      });
    }
  }
  return segments;
}

function prepareRamp(ramp) {
  if (!ramp || ![
    ramp.centerX, ramp.centerZ, ramp.halfLength, ramp.halfWidth,
    ramp.height, ramp.directionX, ramp.directionZ,
  ].every(Number.isFinite) || ramp.halfLength <= 0 || ramp.halfWidth < 0 || ramp.height < 0) return null;
  const directionLength = Math.hypot(ramp.directionX, ramp.directionZ);
  if (directionLength <= EPSILON) return null;
  return {
    ramp,
    centerX: ramp.centerX,
    centerZ: ramp.centerZ,
    halfLength: ramp.halfLength,
    halfWidth: ramp.halfWidth,
    height: ramp.height,
    baseHeight: Number.isFinite(ramp.baseHeight) ? ramp.baseHeight : 0,
    directionX: ramp.directionX / directionLength,
    directionZ: ramp.directionZ / directionLength,
  };
}

function contactAt(prepared, x, z) {
  if (!prepared || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  const offsetX = x - prepared.centerX;
  const offsetZ = z - prepared.centerZ;
  const along = offsetX * prepared.directionX + offsetZ * prepared.directionZ;
  const across = offsetX * -prepared.directionZ + offsetZ * prepared.directionX;
  if (Math.abs(along) > prepared.halfLength + EPSILON
    || Math.abs(across) > prepared.halfWidth + EPSILON) return null;
  const progress = Math.min(1, Math.max(0, (along + prepared.halfLength) / (prepared.halfLength * 2)));
  return { ramp: prepared.ramp, progress, height: prepared.baseHeight + prepared.height * progress };
}

/**
 * Surface queries for static park geometry, independent of the renderer.
 * Road paths use finite line segments plus 0.5 m of shoulder tolerance.
 * Ramp direction points uphill: progress 0 is its low edge and 1 its high
 * edge. Reverse that direction for a landing face descending with travel.
 * Ramp contact preserves the original ramp object, including its launch flag.
 */
export function createDrivingSurfaces(park = {}) {
  const segments = roadSegments(park.roadPaths ?? []);
  const pads = (park.roadPads ?? [])
    .filter((pad) => isPoint(pad) && Number.isFinite(pad.radius) && pad.radius >= 0)
    .map((pad) => ({ x: pad.x, z: pad.z, radiusSquared: (pad.radius + ROAD_PADDING) ** 2 }));
  const ramps = (park.ramps ?? []).map(prepareRamp).filter(Boolean);
  const preparedRamps = new Map(ramps.map((prepared) => [prepared.ramp, prepared]));

  function isOnRoad(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    for (const pad of pads) {
      if ((x - pad.x) ** 2 + (z - pad.z) ** 2 <= pad.radiusSquared + EPSILON) return true;
    }
    for (const segment of segments) {
      if (x < segment.minX || x > segment.maxX || z < segment.minZ || z > segment.maxZ) continue;
      const along = segment.lengthSquared > EPSILON
        ? Math.min(1, Math.max(0, ((x - segment.x) * segment.dx + (z - segment.z) * segment.dz) / segment.lengthSquared))
        : 0;
      const dx = x - segment.x - segment.dx * along;
      const dz = z - segment.z - segment.dz * along;
      if (dx * dx + dz * dz <= segment.widthSquared + EPSILON) return true;
    }
    return false;
  }

  function rampContactAt(ramp, x, z) {
    return contactAt(preparedRamps.get(ramp) ?? prepareRamp(ramp), x, z);
  }

  function activeRampAt(x, z) {
    let highest = null;
    for (const ramp of ramps) {
      const contact = contactAt(ramp, x, z);
      if (contact && (!highest || contact.height > highest.height)) highest = contact;
    }
    return highest;
  }

  function surfaceHeightAt(x, z) {
    return Math.max(0, activeRampAt(x, z)?.height ?? 0);
  }

  return { isOnRoad, rampContactAt, activeRampAt, surfaceHeightAt };
}
