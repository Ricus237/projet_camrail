import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type CoordinateInput = {
  latitude: number;
  longitude: number;
};

type RouteRequest = {
  points?: CoordinateInput[];
  profile?: "driving" | "cycling" | "walking";
};

type RoadRoute = {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMin: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RouteRequest;
    const points = (body.points ?? []).filter(isValidCoordinate);

    if (points.length < 2) {
      return NextResponse.json({ error: "Au moins 2 points sont requis." }, { status: 400 });
    }

    const profile = body.profile ?? "driving";
    const fallback = buildFallbackRoutes(points);

    try {
      const coordinatesPath = points
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(";");
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinatesPath}?overview=full&alternatives=true&geometries=geojson&steps=false`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(`OSRM status ${response.status}`);
      }

      const payload = (await response.json()) as Partial<{
        routes: Array<{
          distance?: number;
          duration?: number;
          geometry?: {
            coordinates?: Array<[number, number]>;
          };
        }>;
      }>;
      const routes = (payload.routes ?? [])
        .map((route) => {
          const geometry = route.geometry?.coordinates ?? [];

          if (geometry.length < 2) {
            return null;
          }

          return {
            coordinates: geometry,
            distanceKm: round((route.distance ?? 0) / 1000, 3),
            durationMin: round((route.duration ?? 0) / 60, 2),
          } as RoadRoute;
        })
        .filter((route): route is RoadRoute => Boolean(route))
        .slice(0, 3);

      if (routes.length === 0) {
        throw new Error("OSRM geometry missing");
      }

      return NextResponse.json({
        source: "osrm",
        routes,
      });
    } catch {
      return NextResponse.json({
        source: "fallback",
        routes: fallback,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur routage." },
      { status: 500 },
    );
  }
}

function buildFallbackRoutes(points: CoordinateInput[]): RoadRoute[] {
  return [
    {
      coordinates: points.map((point) => [point.longitude, point.latitude]),
      distanceKm: estimateDistanceKm(points),
      durationMin: 0,
    },
  ];
}

function estimateDistanceKm(points: CoordinateInput[]) {
  let distance = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    distance += haversineKm(points[index], points[index + 1]);
  }

  return round(distance, 3);
}

function haversineKm(a: CoordinateInput, b: CoordinateInput) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function isValidCoordinate(value: CoordinateInput | undefined): value is CoordinateInput {
  return Boolean(
    value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude) &&
      value.latitude >= -90 &&
      value.latitude <= 90 &&
      value.longitude >= -180 &&
      value.longitude <= 180,
  );
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
