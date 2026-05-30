/**
 * Terrain and radio-path analysis for CAMRAIL Connect.
 *
 * The primary elevation source is Open-Elevation. When the public service is
 * unavailable, the module returns a deterministic estimated profile and marks
 * the source accordingly so the UI can show that the result needs field/SIG
 * confirmation.
 */

export type SignalSystem = "fh" | "vhf";
export type TerrainSource = "open-elevation" | "estimated";

export type ElevationPoint = {
  latitude: number;
  longitude: number;
  elevation: number;
  distance: number;
  source?: TerrainSource;
};

export type LOSResult = {
  clear: boolean;
  obstructionIndex: number | null;
  obstructionElevation: number | null;
  obstructionDistance: number | null;
  clearanceMin: number;
};

export type FresnelPoint = {
  distance: number;
  terrain: number;
  losHeight: number;
  fresnelUpper: number;
  fresnelLower: number;
  fresnelRadius: number;
  requiredClearance: number;
  clearance: number;
  blocked: boolean;
};

export type AntennaRecommendation = {
  siteAHeightM: number;
  siteBHeightM: number;
  addedAHeightM: number;
  addedBHeightM: number;
  feasible: boolean;
  reason: string;
};

export type RelayPoint = {
  latitude: number;
  longitude: number;
  elevation: number;
  relayHeightM: number;
  distanceFromA: number;
  distanceFromB: number;
  azimuthFromA: number;
  azimuthToB: number;
  assured: boolean;
  reason: string;
};

export type PlanningSuggestion = {
  latitude: number;
  longitude: number;
  elevation: number;
  recommendedHeightM: number;
  distanceFromA: number;
  distanceFromB: number;
  role: string;
  reason: string;
};

export type TerrainObstacle = {
  type: "hill" | "vegetation" | "water" | "urban" | "unknown";
  distanceKm: number;
  elevation: number;
  severity: "critical" | "warning" | "info";
  description: string;
  solution: string;
};

export type CoverageAssessment = {
  system: SignalSystem;
  targetPct: number;
  estimatedPct: number;
  status: "ok" | "warning" | "critical";
  summary: string;
  actions: string[];
};

export type FullAnalysis = {
  profile: ElevationPoint[];
  fresnelProfile: FresnelPoint[];
  los: LOSResult;
  antennaRec: AntennaRecommendation;
  azimuthDeg: number;
  reverseAzimuthDeg: number;
  obstacles: TerrainObstacle[];
  relayPoint: RelayPoint | null;
  planningSuggestion: PlanningSuggestion | null;
  coverage: CoverageAssessment;
  diagnostics: string[];
  distanceKm: number;
  minFresnelClearanceM: number;
  terrainSource: TerrainSource;
};

type OpenElevationResponse = {
  results?: Array<{
    latitude?: number;
    longitude?: number;
    elevation?: number;
  }>;
};

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000;
const K_FACTOR = 4 / 3;
const FRESNEL_CLEARANCE_RATIO = 0.6;

export async function fetchElevationProfile(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
  numPoints = 100,
): Promise<ElevationPoint[]> {
  return (await fetchElevationProfileWithSource(latA, lonA, latB, lonB, numPoints)).profile;
}

async function fetchElevationProfileWithSource(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
  numPoints = 100,
): Promise<{ profile: ElevationPoint[]; source: TerrainSource }> {
  const sampleCount = clamp(Math.floor(numPoints), 8, 180);
  const points = interpolatePoints(latA, lonA, latB, lonB, sampleCount);

  try {
    const results: ElevationPoint[] = [];

    for (const chunk of chunkArray(points, 90)) {
      const locations = chunk.map((point) => ({
        latitude: point.lat,
        longitude: point.lon,
      }));

      const response = await fetch("https://api.open-elevation.com/api/v1/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(`Open-Elevation returned ${response.status}`);
      }

      const data = (await response.json()) as OpenElevationResponse;

      if (!Array.isArray(data.results) || data.results.length !== chunk.length) {
        throw new Error("Open-Elevation returned an invalid profile");
      }

      data.results.forEach((result, index) => {
        const sourcePoint = chunk[index];
        const elevation = Number(result.elevation);

        if (!Number.isFinite(elevation)) {
          throw new Error("Open-Elevation returned a non numeric elevation");
        }

        results.push({
          latitude: Number(result.latitude ?? sourcePoint.lat),
          longitude: Number(result.longitude ?? sourcePoint.lon),
          elevation: Math.round(elevation),
          distance: sourcePoint.distance,
          source: "open-elevation",
        });
      });
    }

    return { profile: results, source: "open-elevation" };
  } catch {
    return {
      profile: generateEstimatedProfile(latA, lonA, latB, lonB, sampleCount),
      source: "estimated",
    };
  }
}

function interpolatePoints(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
  count: number,
) {
  const totalDistance = haversineKm(latA, lonA, latB, lonB);

  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);

    return {
      lat: latA + (latB - latA) * ratio,
      lon: lonA + (lonB - lonA) * ratio,
      distance: round(totalDistance * ratio, 3),
    };
  });
}

function generateEstimatedProfile(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
  count: number,
): ElevationPoint[] {
  const totalDistance = haversineKm(latA, lonA, latB, lonB);
  const seed = Math.abs(latA * 997 + lonA * 389 + latB * 233 + lonB * 109);
  const avgLat = (latA + latB) / 2;
  const baseElevation = avgLat > 7 ? 360 : avgLat > 5 ? 470 : avgLat > 3.5 ? 220 : 65;

  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    const latitude = latA + (latB - latA) * ratio;
    const longitude = lonA + (lonB - lonA) * ratio;
    const broadRelief = Math.sin(ratio * Math.PI) * Math.min(140, totalDistance * 1.7);
    const ridge = Math.sin((index + seed) * 0.11) * 72;
    const localRelief = Math.cos((index + seed * 0.37) * 0.29) * 38;
    const microRelief = Math.sin(index * 0.51 + seed * 0.01) * 14;
    const valley = Math.sin(ratio * Math.PI * 4 + seed * 0.03) > 0.88 ? -55 : 0;
    const elevation = Math.max(
      4,
      baseElevation + broadRelief + ridge + localRelief + microRelief + valley,
    );

    return {
      latitude,
      longitude,
      elevation: Math.round(elevation),
      distance: round(totalDistance * ratio, 3),
      source: "estimated",
    };
  });
}

export function analyzeLOS(
  profile: ElevationPoint[],
  heightA: number,
  heightB: number,
): LOSResult {
  if (profile.length < 3) {
    return {
      clear: true,
      obstructionIndex: null,
      obstructionElevation: null,
      obstructionDistance: null,
      clearanceMin: 999,
    };
  }

  const totalDistance = profile[profile.length - 1].distance;

  if (totalDistance <= 0) {
    return {
      clear: true,
      obstructionIndex: null,
      obstructionElevation: null,
      obstructionDistance: null,
      clearanceMin: 999,
    };
  }

  const startHeight = profile[0].elevation + heightA;
  const endHeight = profile[profile.length - 1].elevation + heightB;
  let minClearance = Infinity;
  let worstIndex: number | null = null;

  for (let index = 1; index < profile.length - 1; index += 1) {
    const point = profile[index];
    const ratio = point.distance / totalDistance;
    const losHeight = startHeight + (endHeight - startHeight) * ratio;
    const effectiveTerrain = point.elevation + curvatureBulgeM(point.distance, totalDistance);
    const clearance = losHeight - effectiveTerrain;

    if (clearance < minClearance) {
      minClearance = clearance;
      worstIndex = index;
    }
  }

  return {
    clear: minClearance > 0,
    obstructionIndex: minClearance <= 0 ? worstIndex : null,
    obstructionElevation:
      worstIndex !== null && minClearance <= 0 ? profile[worstIndex].elevation : null,
    obstructionDistance:
      worstIndex !== null && minClearance <= 0 ? profile[worstIndex].distance : null,
    clearanceMin: round(minClearance, 1),
  };
}

export function computeFresnelProfile(
  profile: ElevationPoint[],
  heightA: number,
  heightB: number,
  frequencyGhz: number,
): FresnelPoint[] {
  if (profile.length === 0) {
    return [];
  }

  const safeFrequency = Math.max(frequencyGhz, 0.001);
  const totalDistance = Math.max(profile[profile.length - 1].distance, 0.001);
  const startHeight = profile[0].elevation + heightA;
  const endHeight = profile[profile.length - 1].elevation + heightB;

  return profile.map((point) => {
    const ratio = point.distance / totalDistance;
    const losHeight = startHeight + (endHeight - startHeight) * ratio;
    const d1 = Math.max(point.distance, 0);
    const d2 = Math.max(totalDistance - point.distance, 0);
    const fresnelRadius =
      d1 > 0 && d2 > 0 ? 17.32 * Math.sqrt((d1 * d2) / (safeFrequency * totalDistance)) : 0;
    const requiredClearance = fresnelRadius * FRESNEL_CLEARANCE_RATIO;
    const effectiveTerrain = point.elevation + curvatureBulgeM(point.distance, totalDistance);
    const clearance = losHeight - requiredClearance - effectiveTerrain;

    return {
      distance: round(point.distance, 3),
      terrain: round(effectiveTerrain, 1),
      losHeight: round(losHeight, 1),
      fresnelUpper: round(losHeight + requiredClearance, 1),
      fresnelLower: round(losHeight - requiredClearance, 1),
      fresnelRadius: round(fresnelRadius, 1),
      requiredClearance: round(requiredClearance, 1),
      clearance: round(clearance, 1),
      blocked: clearance < 0,
    };
  });
}

export function recommendAntennaHeights(
  profile: ElevationPoint[],
  frequencyGhz: number,
  currentHeightA: number,
  currentHeightB: number,
): AntennaRecommendation {
  const currentWorst = getWorstFresnelClearance(
    profile,
    frequencyGhz,
    currentHeightA,
    currentHeightB,
  );

  if (currentWorst >= 0) {
    return {
      siteAHeightM: round(currentHeightA, 1),
      siteBHeightM: round(currentHeightB, 1),
      addedAHeightM: 0,
      addedBHeightM: 0,
      feasible: true,
      reason: `Fresnel clearance is already positive (${currentWorst.toFixed(1)} m).`,
    };
  }

  const maxRaise = 120;
  let best: { addA: number; addB: number; clearance: number } | null = null;

  for (let totalRaise = 1; totalRaise <= maxRaise && best === null; totalRaise += 1) {
    const candidates: Array<{ addA: number; addB: number; clearance: number }> = [];

    for (let addA = 0; addA <= totalRaise; addA += 1) {
      const addB = totalRaise - addA;
      const clearance = getWorstFresnelClearance(
        profile,
        frequencyGhz,
        currentHeightA + addA,
        currentHeightB + addB,
      );

      if (clearance >= 0) {
        candidates.push({ addA, addB, clearance });
      }
    }

    if (candidates.length > 0) {
      best = candidates.sort((a, b) => {
        const balanceA = Math.abs(a.addA - a.addB);
        const balanceB = Math.abs(b.addA - b.addB);

        if (balanceA !== balanceB) {
          return balanceA - balanceB;
        }

        return b.clearance - a.clearance;
      })[0];
    }
  }

  if (!best) {
    const extra = Math.ceil(Math.abs(currentWorst) + 10);
    const addA = Math.min(maxRaise, Math.ceil(extra / 2));
    const addB = Math.min(maxRaise, Math.ceil(extra / 2));

    return {
      siteAHeightM: round(currentHeightA + addA, 1),
      siteBHeightM: round(currentHeightB + addB, 1),
      addedAHeightM: addA,
      addedBHeightM: addB,
      feasible: false,
      reason:
        "The path remains constrained after the standard height search. A relay or alternate route is recommended.",
    };
  }

  return {
    siteAHeightM: round(currentHeightA + best.addA, 1),
    siteBHeightM: round(currentHeightB + best.addB, 1),
    addedAHeightM: best.addA,
    addedBHeightM: best.addB,
    feasible: true,
    reason: `Raise A by ${best.addA} m and B by ${best.addB} m to restore 60% Fresnel clearance.`,
  };
}

export function calculateAzimuth(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const dLon = toRad(lonB - lonA);
  const startLat = toRad(latA);
  const endLat = toRad(latB);
  const y = Math.sin(dLon) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);

  return round((toDeg(Math.atan2(y, x)) + 360) % 360, 1);
}

export function findRelayPoint(
  profile: ElevationPoint[],
  heightA: number,
  heightB: number,
  frequencyGhz: number,
): RelayPoint | null {
  if (profile.length < 8) {
    return null;
  }

  const indexes = getCandidateRelayIndexes(profile);
  let fallback: RelayPoint | null = null;

  for (const index of indexes) {
    const profileA = normalizeProfile(profile.slice(0, index + 1));
    const profileB = normalizeProfile(profile.slice(index));

    if (profileA.length < 4 || profileB.length < 4) {
      continue;
    }

    for (let relayHeight = 18; relayHeight <= 90; relayHeight += 2) {
      const losA = analyzeLOS(profileA, heightA, relayHeight);
      const losB = analyzeLOS(profileB, relayHeight, heightB);
      const fresnelA = getWorstFresnelClearance(profileA, frequencyGhz, heightA, relayHeight);
      const fresnelB = getWorstFresnelClearance(profileB, frequencyGhz, relayHeight, heightB);
      const assured = losA.clear && losB.clear && fresnelA >= 0 && fresnelB >= 0;

      const candidate = makeRelayPoint(profile, index, relayHeight, assured);

      if (assured) {
        return candidate;
      }

      if (!fallback || relayHeight < fallback.relayHeightM) {
        fallback = candidate;
      }
    }
  }

  return fallback;
}

function makeRelayPoint(
  profile: ElevationPoint[],
  index: number,
  relayHeightM: number,
  assured: boolean,
): RelayPoint {
  const start = profile[0];
  const end = profile[profile.length - 1];
  const point = profile[index];
  const offsetPoint = offsetPerpendicular(start, end, point, 0.8);

  return {
    latitude: round(offsetPoint.latitude, 6),
    longitude: round(offsetPoint.longitude, 6),
    elevation: Math.round(point.elevation),
    relayHeightM,
    distanceFromA: round(haversineKm(start.latitude, start.longitude, offsetPoint.latitude, offsetPoint.longitude), 2),
    distanceFromB: round(haversineKm(end.latitude, end.longitude, offsetPoint.latitude, offsetPoint.longitude), 2),
    azimuthFromA: calculateAzimuth(start.latitude, start.longitude, offsetPoint.latitude, offsetPoint.longitude),
    azimuthToB: calculateAzimuth(offsetPoint.latitude, offsetPoint.longitude, end.latitude, end.longitude),
    assured,
    reason: assured
      ? "Relay candidate clears both sub-paths with the current terrain profile."
      : "Best topographic relay candidate found; validate with field/SIG data before deployment.",
  };
}

export function detectObstacles(
  profile: ElevationPoint[],
  fresnelProfile: FresnelPoint[],
  system: SignalSystem = "fh",
): TerrainObstacle[] {
  if (profile.length < 3 || fresnelProfile.length < 3) {
    return [];
  }

  const obstacles: TerrainObstacle[] = [];
  const blockedSegments = collectBlockedSegments(fresnelProfile);

  for (const segment of blockedSegments) {
    const worstIndex = findWorstIndex(fresnelProfile, segment.start, segment.end);
    const point = profile[worstIndex];
    const fresnelPoint = fresnelProfile[worstIndex];
    const classification = classifyObstacle(profile, worstIndex, system);

    obstacles.push({
      type: classification.type,
      distanceKm: round(fresnelPoint.distance, 2),
      elevation: point.elevation,
      severity: fresnelPoint.clearance < -10 ? "critical" : "warning",
      description: classification.description(point, fresnelPoint),
      solution: classification.solution,
    });
  }

  if (system === "vhf") {
    addVhfShadowRisks(profile, fresnelProfile, obstacles);
  }

  return obstacles.slice(0, 8);
}

export async function runFullAnalysis(
  latA: number,
  lonA: number,
  heightA: number,
  latB: number,
  lonB: number,
  heightB: number,
  frequencyGhz: number,
  system: SignalSystem = "fh",
): Promise<FullAnalysis> {
  const { profile, source } = await fetchElevationProfileWithSource(latA, lonA, latB, lonB, 120);
  const safeFrequency = system === "vhf" ? Math.max(0.03, Math.min(frequencyGhz, 0.3)) : frequencyGhz;
  const los = analyzeLOS(profile, heightA, heightB);
  const fresnelProfile = computeFresnelProfile(profile, heightA, heightB, safeFrequency);
  const antennaRec = recommendAntennaHeights(profile, safeFrequency, heightA, heightB);
  const azimuthDeg = calculateAzimuth(latA, lonA, latB, lonB);
  const reverseAzimuthDeg = calculateAzimuth(latB, lonB, latA, lonA);
  const minFresnelClearanceM = round(
    Math.min(...fresnelProfile.map((point) => point.clearance)),
    1,
  );
  const obstacles = detectObstacles(profile, fresnelProfile, system);
  const relayPoint =
    !los.clear || minFresnelClearanceM < 0
      ? findRelayPoint(profile, heightA, heightB, safeFrequency)
      : null;
  const planningSuggestion = suggestPlanningSite(profile, heightA, heightB, safeFrequency);
  const coverage = assessCoverage(system, los, minFresnelClearanceM, obstacles, antennaRec, relayPoint);
  const diagnostics = buildDiagnostics({
    system,
    source,
    los,
    antennaRec,
    azimuthDeg,
    reverseAzimuthDeg,
    minFresnelClearanceM,
    obstacles,
    relayPoint,
    coverage,
  });

  return {
    profile,
    fresnelProfile,
    los,
    antennaRec,
    azimuthDeg,
    reverseAzimuthDeg,
    obstacles,
    relayPoint,
    planningSuggestion,
    coverage,
    diagnostics,
    distanceKm: round(profile[profile.length - 1]?.distance ?? 0, 2),
    minFresnelClearanceM,
    terrainSource: source,
  };
}

function assessCoverage(
  system: SignalSystem,
  los: LOSResult,
  minFresnelClearanceM: number,
  obstacles: TerrainObstacle[],
  antennaRec: AntennaRecommendation,
  relayPoint: RelayPoint | null,
): CoverageAssessment {
  const targetPct = system === "fh" ? 100 : 95;
  const criticalCount = obstacles.filter((obstacle) => obstacle.severity === "critical").length;
  const warningCount = obstacles.filter((obstacle) => obstacle.severity === "warning").length;
  const losPenalty = los.clear ? 0 : system === "fh" ? 18 : 11;
  const fresnelPenalty = minFresnelClearanceM >= 0 ? 0 : Math.min(12, Math.abs(minFresnelClearanceM) * 0.28);
  const obstaclePenalty = criticalCount * (system === "fh" ? 3.2 : 2.4) + warningCount * 1.1;
  const estimatedPct = round(clamp(targetPct - losPenalty - fresnelPenalty - obstaclePenalty, 0, targetPct), 2);
  const status =
    estimatedPct >= targetPct - 0.2
      ? "ok"
      : estimatedPct >= targetPct - 5
        ? "warning"
        : "critical";
  const actions =
    system === "fh"
      ? [
          antennaRec.addedAHeightM > 0 || antennaRec.addedBHeightM > 0
            ? `Raise antennas to ${antennaRec.siteAHeightM} m / ${antennaRec.siteBHeightM} m.`
            : "Keep current tower heights; maintain the Fresnel corridor clear.",
          relayPoint
            ? `Use the relay candidate at ${relayPoint.latitude}, ${relayPoint.longitude}.`
            : "Use the computed azimuths for antenna alignment and future link extension.",
          "Validate vegetation/building clearance on field survey before commissioning.",
        ]
      : [
          "Add a fill-in repeater or passive relay for persistent shadow zones.",
          "Raise the VHF antenna or move it toward the highest clear point on the path.",
          "Use space diversity and extra fading margin near water or dense vegetation.",
        ];

  return {
    system,
    targetPct,
    estimatedPct,
    status,
    summary:
      system === "fh"
        ? `FH target ${targetPct}% direct-path usefulness; estimated terrain score ${estimatedPct}%.`
        : `VHF target ${targetPct}% coverage; estimated terrain score ${estimatedPct}%.`,
    actions,
  };
}

function suggestPlanningSite(
  profile: ElevationPoint[],
  heightA: number,
  heightB: number,
  frequencyGhz: number,
): PlanningSuggestion | null {
  if (profile.length < 8) {
    return null;
  }

  const indexes = getCandidateRelayIndexes(profile);

  for (const index of indexes) {
    const point = profile[index];
    const profileA = normalizeProfile(profile.slice(0, index + 1));
    const profileB = normalizeProfile(profile.slice(index));
    const recommendedHeightM = 30;
    const aClear = analyzeLOS(profileA, heightA, recommendedHeightM).clear;
    const bClear = analyzeLOS(profileB, recommendedHeightM, heightB).clear;
    const aFresnel = getWorstFresnelClearance(profileA, frequencyGhz, heightA, recommendedHeightM);
    const bFresnel = getWorstFresnelClearance(profileB, frequencyGhz, recommendedHeightM, heightB);

    if (aClear && bClear && aFresnel >= -3 && bFresnel >= -3) {
      return {
        latitude: round(point.latitude, 6),
        longitude: round(point.longitude, 6),
        elevation: point.elevation,
        recommendedHeightM,
        distanceFromA: round(point.distance, 2),
        distanceFromB: round((profile[profile.length - 1].distance ?? 0) - point.distance, 2),
        role: "candidate-extension-site",
        reason: "High-clearance point suitable for extending the network or placing a planned relay.",
      };
    }
  }

  const midpoint = profile[Math.floor(profile.length / 2)];

  return {
    latitude: round(midpoint.latitude, 6),
    longitude: round(midpoint.longitude, 6),
    elevation: midpoint.elevation,
    recommendedHeightM: 35,
    distanceFromA: round(midpoint.distance, 2),
    distanceFromB: round((profile[profile.length - 1].distance ?? 0) - midpoint.distance, 2),
    role: "survey-required",
    reason: "No fully clear planning point was found from the profile; use this midpoint for field/SIG validation.",
  };
}

function buildDiagnostics(input: {
  system: SignalSystem;
  source: TerrainSource;
  los: LOSResult;
  antennaRec: AntennaRecommendation;
  azimuthDeg: number;
  reverseAzimuthDeg: number;
  minFresnelClearanceM: number;
  obstacles: TerrainObstacle[];
  relayPoint: RelayPoint | null;
  coverage: CoverageAssessment;
}) {
  const diagnostics: string[] = [];

  diagnostics.push(
    input.source === "open-elevation"
      ? "Elevation source: Open-Elevation terrain samples."
      : "Elevation source: estimated fallback profile; confirm with SIG/field survey.",
  );

  diagnostics.push(
    input.los.clear
      ? `LOS clear. Minimum ray clearance: ${input.los.clearanceMin.toFixed(1)} m.`
      : `LOS blocked near ${input.los.obstructionDistance?.toFixed(1)} km at about ${input.los.obstructionElevation} m ASL.`,
  );

  diagnostics.push(
    input.minFresnelClearanceM >= 0
      ? `60% Fresnel clearance OK. Minimum margin: ${input.minFresnelClearanceM.toFixed(1)} m.`
      : `60% Fresnel clearance blocked by ${Math.abs(input.minFresnelClearanceM).toFixed(1)} m.`,
  );

  diagnostics.push(
    `Antenna azimuths: A to B ${input.azimuthDeg.toFixed(1)} deg, B to A ${input.reverseAzimuthDeg.toFixed(1)} deg.`,
  );
  diagnostics.push(input.antennaRec.reason);

  if (input.relayPoint) {
    diagnostics.push(
      input.relayPoint.assured
        ? `Relay candidate clears both legs at ${input.relayPoint.relayHeightM} m.`
        : `Relay candidate requires validation at ${input.relayPoint.latitude}, ${input.relayPoint.longitude}.`,
    );
  }

  if (input.obstacles.length > 0) {
    diagnostics.push(`${input.obstacles.length} terrain/radio risk(s) found on the path.`);
  }

  diagnostics.push(input.coverage.summary);

  return diagnostics;
}

function collectBlockedSegments(fresnelProfile: FresnelPoint[]) {
  const segments: Array<{ start: number; end: number }> = [];
  let activeStart: number | null = null;

  for (let index = 1; index < fresnelProfile.length - 1; index += 1) {
    if (fresnelProfile[index].blocked && activeStart === null) {
      activeStart = index;
    }

    if ((!fresnelProfile[index].blocked || index === fresnelProfile.length - 2) && activeStart !== null) {
      segments.push({
        start: activeStart,
        end: fresnelProfile[index].blocked ? index : index - 1,
      });
      activeStart = null;
    }
  }

  return segments;
}

function findWorstIndex(fresnelProfile: FresnelPoint[], start: number, end: number) {
  let worstIndex = start;

  for (let index = start; index <= end; index += 1) {
    if (fresnelProfile[index].clearance < fresnelProfile[worstIndex].clearance) {
      worstIndex = index;
    }
  }

  return worstIndex;
}

function classifyObstacle(profile: ElevationPoint[], index: number, system: SignalSystem) {
  const point = profile[index];
  const windowStart = Math.max(0, index - 4);
  const windowEnd = Math.min(profile.length - 1, index + 4);
  const window = profile.slice(windowStart, windowEnd + 1);
  const minElevation = Math.min(...window.map((item) => item.elevation));
  const maxElevation = Math.max(...window.map((item) => item.elevation));
  const localRelief = maxElevation - minElevation;
  const isLowFlat = point.elevation < 120 && localRelief < 14;
  const isRidge = point.elevation - minElevation > 28 || localRelief > 55;
  const isVegetationRisk = system === "vhf" || (point.elevation > 120 && localRelief < 35);

  if (isLowFlat) {
    return {
      type: "water" as const,
      description: (elevationPoint: ElevationPoint, fresnelPoint: FresnelPoint) =>
        `Low flat zone near ${fresnelPoint.distance.toFixed(1)} km (${elevationPoint.elevation} m ASL). Water or humid ground can create multipath fading.`,
      solution:
        "Increase fading margin, use space diversity, and avoid grazing angles over water when aligning antennas.",
    };
  }

  if (isRidge) {
    return {
      type: "hill" as const,
      description: (elevationPoint: ElevationPoint, fresnelPoint: FresnelPoint) =>
        `Terrain ridge near ${fresnelPoint.distance.toFixed(1)} km, altitude ${elevationPoint.elevation} m, Fresnel deficit ${Math.abs(fresnelPoint.clearance).toFixed(1)} m.`,
      solution:
        "Raise both antennas, place a relay on the ridge, or reroute the link through a higher clear point.",
    };
  }

  if (isVegetationRisk) {
    return {
      type: "vegetation" as const,
      description: (elevationPoint: ElevationPoint, fresnelPoint: FresnelPoint) =>
        `Probable vegetation/clutter risk near ${fresnelPoint.distance.toFixed(1)} km (${elevationPoint.elevation} m ASL).`,
      solution:
        "Clear the Fresnel corridor where allowed, raise the antennas, or add a fill-in relay for VHF shadowing.",
    };
  }

  return {
    type: "unknown" as const,
    description: (elevationPoint: ElevationPoint, fresnelPoint: FresnelPoint) =>
      `Path obstruction near ${fresnelPoint.distance.toFixed(1)} km, altitude ${elevationPoint.elevation} m.`,
    solution: "Validate the obstruction in GIS/field survey, then raise antennas or plan a relay.",
  };
}

function addVhfShadowRisks(
  profile: ElevationPoint[],
  fresnelProfile: FresnelPoint[],
  obstacles: TerrainObstacle[],
) {
  const totalDistance = profile[profile.length - 1].distance;
  const riskIndexes = profile
    .map((point, index) => ({ point, index }))
    .filter(({ point, index }) => {
      if (index === 0 || index === profile.length - 1) {
        return false;
      }

      const previous = profile[Math.max(0, index - 3)].elevation;
      const next = profile[Math.min(profile.length - 1, index + 3)].elevation;
      const flat = Math.abs(point.elevation - previous) < 8 && Math.abs(point.elevation - next) < 8;
      const valley = point.elevation < previous + 5 && point.elevation < next + 5;

      return flat && valley && point.distance > totalDistance * 0.12 && point.distance < totalDistance * 0.88;
    })
    .slice(0, 2);

  for (const { point, index } of riskIndexes) {
    if (obstacles.some((obstacle) => Math.abs(obstacle.distanceKm - point.distance) < 1)) {
      continue;
    }

    obstacles.push({
      type: "water",
      distanceKm: round(point.distance, 2),
      elevation: point.elevation,
      severity: "info",
      description: `VHF shadow/fading risk near ${point.distance.toFixed(1)} km; low flat terrain can indicate water or humid corridor.`,
      solution:
        "Use a fill-in site, antenna diversity, and additional fading margin. Inspect the corridor after heavy rain/vegetation growth.",
    });

    if (fresnelProfile[index]?.clearance < 5) {
      obstacles[obstacles.length - 1].severity = "warning";
    }
  }
}

function getCandidateRelayIndexes(profile: ElevationPoint[]) {
  const start = Math.max(1, Math.floor(profile.length * 0.15));
  const end = Math.min(profile.length - 2, Math.ceil(profile.length * 0.85));
  const candidates = new Set<number>();
  const los = analyzeLOS(profile, 0, 0);

  if (los.obstructionIndex !== null) {
    candidates.add(los.obstructionIndex);
  }

  const sortedByElevation = profile
    .map((point, index) => ({ index, elevation: point.elevation }))
    .filter((point) => point.index >= start && point.index <= end)
    .sort((a, b) => b.elevation - a.elevation)
    .slice(0, 8);

  sortedByElevation.forEach((point) => candidates.add(point.index));
  candidates.add(Math.floor(profile.length / 2));

  return Array.from(candidates).sort((a, b) => a - b);
}

function offsetPerpendicular(
  start: ElevationPoint,
  end: ElevationPoint,
  point: ElevationPoint,
  offsetKm: number,
) {
  const dx = end.longitude - start.longitude;
  const dy = end.latitude - start.latitude;
  const norm = Math.sqrt(dx * dx + dy * dy) || 1;
  const offsetDeg = offsetKm / 111;

  return {
    latitude: point.latitude + (dx / norm) * offsetDeg,
    longitude: point.longitude - (dy / norm) * offsetDeg,
  };
}

function normalizeProfile(profile: ElevationPoint[]) {
  if (profile.length === 0) {
    return [];
  }

  const offset = profile[0].distance;

  return profile.map((point) => ({
    ...point,
    distance: round(point.distance - offset, 3),
  }));
}

function getWorstFresnelClearance(
  profile: ElevationPoint[],
  frequencyGhz: number,
  heightA: number,
  heightB: number,
) {
  const fresnel = computeFresnelProfile(profile, heightA, heightB, frequencyGhz);

  if (fresnel.length === 0) {
    return 999;
  }

  return Math.min(...fresnel.map((point) => point.clearance));
}

function curvatureBulgeM(distanceKm: number, totalDistanceKm: number) {
  const d1 = distanceKm * 1000;
  const d2 = Math.max(totalDistanceKm - distanceKm, 0) * 1000;

  return (d1 * d2) / (2 * K_FACTOR * EARTH_RADIUS_M);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const startLat = toRad(lat1);
  const endLat = toRad(lat2);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
