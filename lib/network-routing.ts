import type { LinkStatus, NetworkLink, Site } from "@/lib/local-db";
import { calculateDistanceKm } from "@/lib/rf";

type Edge = {
  from: string;
  to: string;
  link: NetworkLink;
  score: number;
};

type NodeCost = {
  siteId: string;
  cost: number;
};

type SegmentAlternative = {
  sitePath: string[];
  edges: Edge[];
  score: number;
};

export type RouteSegment = {
  linkId: string;
  fromSiteId: string;
  toSiteId: string;
  distanceKm: number;
  status: LinkStatus;
  rslDbm: number;
  availabilityPct: number;
  score: number;
};

export type RouteOption = {
  id: string;
  name: string;
  sitePath: string[];
  segments: RouteSegment[];
  totalDistanceKm: number;
  estimatedAvailabilityPct: number;
  weakestRslDbm: number;
  score: number;
  quality: "excellent" | "good" | "warning" | "critical";
  summary: string;
};

export type RoutePortion = {
  index: number;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  fromKm: number;
  toKm: number;
  distanceKm: number;
  estimatedAvailabilityPct: number;
  weakestRslDbm: number;
  recommendation: string;
};

export type RouteComputationInput = {
  sites: Site[];
  links: NetworkLink[];
  startSiteId: string;
  endSiteId: string;
  viaSiteIds?: string[];
  maxAlternatives?: number;
};

type Graph = Map<string, Edge[]>;

const MAX_COMBINED_CANDIDATES = 24;
const MAX_LEG_ALTERNATIVES = 3;

const statusPenalty: Record<LinkStatus, number> = {
  Active: 0,
  Planned: 4,
  Alert: 7,
  Maintenance: 10,
};

export function computeRouteAlternatives(input: RouteComputationInput): RouteOption[] {
  const {
    sites,
    links,
    startSiteId,
    endSiteId,
    viaSiteIds = [],
    maxAlternatives = 4,
  } = input;
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const sanitizedVias = sanitizeVias(viaSiteIds, startSiteId, endSiteId, siteById);

  if (!siteById.has(startSiteId) || !siteById.has(endSiteId)) {
    return [];
  }

  const graph = buildGraph(links, siteById);
  const checkpoints = [startSiteId, ...sanitizedVias, endSiteId];
  const legAlternatives: SegmentAlternative[][] = [];

  for (let legIndex = 0; legIndex < checkpoints.length - 1; legIndex += 1) {
    const from = checkpoints[legIndex];
    const to = checkpoints[legIndex + 1];
    const alternatives = findSegmentAlternatives(graph, from, to, MAX_LEG_ALTERNATIVES);

    if (!alternatives.length) {
      return [];
    }

    legAlternatives.push(alternatives);
  }

  const combinations = combineLegAlternatives(legAlternatives);
  const routed = combinations
    .map((candidate, index) => toRouteOption(candidate, index + 1))
    .sort((a, b) => a.score - b.score);

  const deduped: RouteOption[] = [];
  const seen = new Set<string>();

  for (const option of routed) {
    const signature = `${option.sitePath.join(">")}|${option.segments.map((segment) => segment.linkId).join(">")}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      deduped.push(option);
    }

    if (deduped.length >= maxAlternatives) {
      break;
    }
  }

  return deduped;
}

export function splitRouteIntoPortions(
  route: RouteOption,
  sites: Site[],
  requestedPortions: number,
): RoutePortion[] {
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const polyline = route.sitePath
    .map((siteId) => siteById.get(siteId))
    .filter((site): site is Site => Boolean(site))
    .map((site) => ({
      latitude: site.latitude,
      longitude: site.longitude,
    }));

  if (polyline.length < 2) {
    return [];
  }

  const segmentLengths: number[] = [];
  const cumulative = [0];

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distanceKm = calculateDistanceKm(polyline[index], polyline[index + 1]);
    segmentLengths.push(distanceKm);
    cumulative.push(cumulative[cumulative.length - 1] + distanceKm);
  }

  const totalDistance = cumulative[cumulative.length - 1];

  if (totalDistance <= 0) {
    return [];
  }

  const portionCount = clamp(Math.floor(requestedPortions), 1, 24);
  const portions: RoutePortion[] = [];

  for (let portionIndex = 0; portionIndex < portionCount; portionIndex += 1) {
    const fromKm = round((totalDistance * portionIndex) / portionCount, 3);
    const toKm = round((totalDistance * (portionIndex + 1)) / portionCount, 3);
    const fromCoord = coordinateAtDistance(polyline, segmentLengths, cumulative, fromKm);
    const toCoord = coordinateAtDistance(polyline, segmentLengths, cumulative, toKm);
    const overlappingSegments = route.segments.filter((segment) => {
      const segmentStart = segmentDistanceBefore(route, segment.linkId);
      const segmentEnd = segmentStart + segment.distanceKm;
      return segmentEnd > fromKm && segmentStart < toKm;
    });
    const weakestRsl = overlappingSegments.length
      ? Math.min(...overlappingSegments.map((segment) => segment.rslDbm))
      : route.weakestRslDbm;
    const availability = overlappingSegments.length
      ? round(
          overlappingSegments.reduce((sum, segment) => sum + segment.availabilityPct, 0) /
            overlappingSegments.length,
          3,
        )
      : route.estimatedAvailabilityPct;

    portions.push({
      index: portionIndex + 1,
      from: fromCoord,
      to: toCoord,
      fromKm,
      toKm,
      distanceKm: round(toKm - fromKm, 3),
      estimatedAvailabilityPct: availability,
      weakestRslDbm: weakestRsl,
      recommendation: createPortionRecommendation(weakestRsl, availability),
    });
  }

  return portions;
}

function sanitizeVias(
  vias: string[],
  start: string,
  end: string,
  siteById: Map<string, Site>,
) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const siteId of vias) {
    if (!siteById.has(siteId) || siteId === start || siteId === end || seen.has(siteId)) {
      continue;
    }

    seen.add(siteId);
    result.push(siteId);
  }

  return result;
}

function buildGraph(links: NetworkLink[], siteById: Map<string, Site>): Graph {
  const graph: Graph = new Map();

  for (const link of links) {
    const siteA = siteById.get(link.siteAId);
    const siteB = siteById.get(link.siteBId);

    if (!siteA || !siteB) {
      continue;
    }

    const score = computeEdgeScore(link);
    const edgeA: Edge = {
      from: link.siteAId,
      to: link.siteBId,
      link,
      score,
    };
    const edgeB: Edge = {
      from: link.siteBId,
      to: link.siteAId,
      link,
      score,
    };
    graph.set(edgeA.from, [...(graph.get(edgeA.from) ?? []), edgeA]);
    graph.set(edgeB.from, [...(graph.get(edgeB.from) ?? []), edgeB]);
  }

  return graph;
}

function computeEdgeScore(link: NetworkLink) {
  const fadeMargin = Math.max(0, link.rslDbm + 80);
  const fadePenalty = Math.max(0, 22 - fadeMargin) * 0.55;
  const availabilityPenalty = Math.max(0, 99.995 - link.availabilityPct) * 70;
  return link.distanceKm + statusPenalty[link.status] + fadePenalty + availabilityPenalty;
}

function findSegmentAlternatives(
  graph: Graph,
  startSiteId: string,
  endSiteId: string,
  limit: number,
) {
  const initial = dijkstra(graph, startSiteId, endSiteId);

  if (!initial) {
    return [];
  }

  const candidates: SegmentAlternative[] = [initial];
  const seen = new Set<string>([initial.sitePath.join(">")]);

  for (const edge of initial.edges) {
    const alternative = dijkstra(
      graph,
      startSiteId,
      endSiteId,
      new Set([edgeKey(edge.from, edge.to, edge.link.id)]),
    );

    if (alternative && !seen.has(alternative.sitePath.join(">"))) {
      seen.add(alternative.sitePath.join(">"));
      candidates.push(alternative);
    }
  }

  for (const intermediateSiteId of initial.sitePath.slice(1, -1)) {
    const alternative = dijkstra(
      graph,
      startSiteId,
      endSiteId,
      undefined,
      new Set([intermediateSiteId]),
    );

    if (alternative && !seen.has(alternative.sitePath.join(">"))) {
      seen.add(alternative.sitePath.join(">"));
      candidates.push(alternative);
    }
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, limit);
}

function dijkstra(
  graph: Graph,
  startSiteId: string,
  endSiteId: string,
  blockedEdges?: Set<string>,
  blockedSites?: Set<string>,
): SegmentAlternative | null {
  if (startSiteId === endSiteId) {
    return {
      sitePath: [startSiteId],
      edges: [],
      score: 0,
    };
  }

  const distances = new Map<string, number>([[startSiteId, 0]]);
  const previousSite = new Map<string, string>();
  const previousEdge = new Map<string, Edge>();
  const visited = new Set<string>();
  const queue: NodeCost[] = [{ siteId: startSiteId, cost: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (visited.has(current.siteId)) {
      continue;
    }

    visited.add(current.siteId);

    if (current.siteId === endSiteId) {
      break;
    }

    const edges = graph.get(current.siteId) ?? [];

    for (const edge of edges) {
      if (blockedSites?.has(edge.to) || blockedSites?.has(edge.from)) {
        continue;
      }

      if (blockedEdges?.has(edgeKey(edge.from, edge.to, edge.link.id))) {
        continue;
      }

      const nextCost = current.cost + edge.score;
      const knownCost = distances.get(edge.to);

      if (knownCost === undefined || nextCost < knownCost) {
        distances.set(edge.to, nextCost);
        previousSite.set(edge.to, current.siteId);
        previousEdge.set(edge.to, edge);
        queue.push({ siteId: edge.to, cost: nextCost });
      }
    }
  }

  if (!distances.has(endSiteId)) {
    return null;
  }

  const reversedSites: string[] = [];
  const reversedEdges: Edge[] = [];
  let cursor = endSiteId;
  reversedSites.push(cursor);

  while (cursor !== startSiteId) {
    const parentSiteId = previousSite.get(cursor);
    const edge = previousEdge.get(cursor);

    if (!parentSiteId || !edge) {
      return null;
    }

    reversedEdges.push(edge);
    cursor = parentSiteId;
    reversedSites.push(cursor);
  }

  return {
    sitePath: reversedSites.reverse(),
    edges: reversedEdges.reverse(),
    score: round(distances.get(endSiteId) ?? 0, 3),
  };
}

function combineLegAlternatives(legs: SegmentAlternative[][]) {
  let combined: SegmentAlternative[] = [
    {
      sitePath: [],
      edges: [],
      score: 0,
    },
  ];

  for (const leg of legs) {
    const next: SegmentAlternative[] = [];

    for (const partial of combined) {
      for (const candidate of leg) {
        const mergedPath =
          partial.sitePath.length === 0
            ? candidate.sitePath
            : [...partial.sitePath, ...candidate.sitePath.slice(1)];
        const mergedEdges = [...partial.edges, ...candidate.edges];

        next.push({
          sitePath: mergedPath,
          edges: mergedEdges,
          score: round(partial.score + candidate.score, 3),
        });
      }
    }

    combined = next.sort((a, b) => a.score - b.score).slice(0, MAX_COMBINED_CANDIDATES);
  }

  return combined;
}

function toRouteOption(candidate: SegmentAlternative, rank: number): RouteOption {
  const segments: RouteSegment[] = candidate.edges.map((edge) => ({
    linkId: edge.link.id,
    fromSiteId: edge.from,
    toSiteId: edge.to,
    distanceKm: edge.link.distanceKm,
    status: edge.link.status,
    rslDbm: edge.link.rslDbm,
    availabilityPct: edge.link.availabilityPct,
    score: edge.score,
  }));
  const totalDistanceKm = round(
    segments.reduce((sum, segment) => sum + segment.distanceKm, 0),
    2,
  );
  const weakestRslDbm = segments.length
    ? Math.min(...segments.map((segment) => segment.rslDbm))
    : -120;
  const estimatedAvailabilityPct = segments.length
    ? round(
        segments.reduce((sum, segment) => sum + segment.availabilityPct, 0) / segments.length,
        3,
      )
    : 0;
  const quality = routeQuality(weakestRslDbm, estimatedAvailabilityPct);

  return {
    id: `route-${rank}`,
    name: rank === 1 ? "Itineraire recommande" : `Alternative ${rank}`,
    sitePath: candidate.sitePath,
    segments,
    totalDistanceKm,
    estimatedAvailabilityPct,
    weakestRslDbm: round(weakestRslDbm, 1),
    score: candidate.score,
    quality,
    summary: createRouteSummary(totalDistanceKm, weakestRslDbm, estimatedAvailabilityPct, quality),
  };
}

function createRouteSummary(
  distanceKm: number,
  weakestRslDbm: number,
  availabilityPct: number,
  quality: RouteOption["quality"],
) {
  const qualityText =
    quality === "excellent"
      ? "Tres bonne route"
      : quality === "good"
        ? "Route stable"
        : quality === "warning"
          ? "Route a surveiller"
          : "Route critique";

  return `${qualityText} | ${distanceKm.toFixed(1)} km | RSL min ${weakestRslDbm.toFixed(1)} dBm | dispo moyenne ${availabilityPct.toFixed(3)}%.`;
}

function routeQuality(weakestRslDbm: number, availabilityPct: number): RouteOption["quality"] {
  if (weakestRslDbm >= -58 && availabilityPct >= 99.997) {
    return "excellent";
  }

  if (weakestRslDbm >= -65 && availabilityPct >= 99.992) {
    return "good";
  }

  if (weakestRslDbm >= -74 && availabilityPct >= 99.98) {
    return "warning";
  }

  return "critical";
}

function createPortionRecommendation(weakestRslDbm: number, availability: number) {
  if (weakestRslDbm < -75 || availability < 99.97) {
    return "Portion sensible: verifier relief, vegetation et orientation antenne.";
  }

  if (weakestRslDbm < -68 || availability < 99.985) {
    return "Portion moyenne: garder une marge de fade supplementaire.";
  }

  return "Portion stable: conserver le cap et monitorer periodiquement.";
}

function segmentDistanceBefore(route: RouteOption, linkId: string) {
  let offset = 0;

  for (const segment of route.segments) {
    if (segment.linkId === linkId) {
      return offset;
    }

    offset += segment.distanceKm;
  }

  return offset;
}

function coordinateAtDistance(
  polyline: Array<{ latitude: number; longitude: number }>,
  segmentLengths: number[],
  cumulative: number[],
  targetKm: number,
) {
  if (targetKm <= 0) {
    return polyline[0];
  }

  const total = cumulative[cumulative.length - 1];

  if (targetKm >= total) {
    return polyline[polyline.length - 1];
  }

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentStart = cumulative[index];
    const segmentEnd = cumulative[index + 1];

    if (targetKm < segmentStart || targetKm > segmentEnd) {
      continue;
    }

    const length = segmentEnd - segmentStart;
    const ratio = length <= 0 ? 0 : (targetKm - segmentStart) / length;
    const start = polyline[index];
    const end = polyline[index + 1];

    return {
      latitude: round(start.latitude + (end.latitude - start.latitude) * ratio, 6),
      longitude: round(start.longitude + (end.longitude - start.longitude) * ratio, 6),
    };
  }

  return polyline[polyline.length - 1];
}

function edgeKey(from: string, to: string, linkId: string) {
  return `${from}->${to}#${linkId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
