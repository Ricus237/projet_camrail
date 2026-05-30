"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { RouteOption } from "@/lib/network-routing";
import type { Site } from "@/lib/local-db";
import type { FullAnalysis } from "@/lib/terrain";
import { cn } from "@/lib/utils";

type Realistic3DMapProps = {
  analysis: FullAnalysis | null;
  sites?: Site[];
  routeAlternatives?: RouteOption[];
  selectedRouteId?: string | null;
  roadRoutes?: Array<{
    id: string;
    routeId: string;
    source: "osrm" | "fallback";
    distanceKm: number;
    durationMin: number;
    coordinates: Array<{ latitude: number; longitude: number }>;
  }>;
  markers?: Array<{
    id: string;
    label: string;
    latitude: number;
    longitude: number;
  }>;
  onMapRepereAdd?: (latitude: number, longitude: number) => void;
  className?: string;
};

const openStreetStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
const terrainTileUrl = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export function Realistic3DMap({
  analysis,
  sites = [],
  routeAlternatives = [],
  selectedRouteId = null,
  roadRoutes = [],
  markers = [],
  onMapRepereAdd,
  className,
}: Realistic3DMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const selectedRoute =
    routeAlternatives.find((route) => route.id === selectedRouteId) ?? routeAlternatives[0];
  const selectedRouteCoordinates = useMemo(
    () =>
      selectedRoute
        ? selectedRoute.sitePath
            .map((siteId) => siteById.get(siteId))
            .filter((site): site is Site => Boolean(site))
            .map((site) => [site.longitude, site.latitude] as Position)
        : [],
    [selectedRoute, siteById],
  );

  const mapData = useMemo(() => {
    const profilePath =
      analysis?.profile.length && analysis.profile.length > 1
        ? analysis.profile.map((point) => [point.longitude, point.latitude] as Position)
        : [];
    const selectedRoadCandidates = selectedRoute
      ? roadRoutes.filter((route) => route.routeId === selectedRoute.id)
      : [];
    const selectedRoadPath =
      selectedRoadCandidates[0]?.coordinates.map(
        (point) => [point.longitude, point.latitude] as Position,
      ) ?? [];
    const pathCoordinates =
      selectedRoadPath.length > 1
        ? selectedRoadPath
        : selectedRouteCoordinates.length > 1
          ? selectedRouteCoordinates
          : profilePath;

    if (pathCoordinates.length < 2) {
      return null;
    }

    const siteFeatures: Feature[] = [];
    const startSiteLabel =
      selectedRoute && selectedRoute.sitePath.length > 0
        ? siteById.get(selectedRoute.sitePath[0])?.name ?? selectedRoute.sitePath[0]
        : "Site A";
    const endSiteLabel =
      selectedRoute && selectedRoute.sitePath.length > 1
        ? siteById.get(selectedRoute.sitePath[selectedRoute.sitePath.length - 1])?.name ??
          selectedRoute.sitePath[selectedRoute.sitePath.length - 1]
        : "Site B";

    siteFeatures.push(
      createPointFeature(pathCoordinates[0], {
        kind: "siteA",
        name: startSiteLabel,
      }),
    );

    siteFeatures.push(
      createPointFeature(pathCoordinates[pathCoordinates.length - 1], {
        kind: "siteB",
        name: endSiteLabel,
      }),
    );

    if (selectedRoute) {
      selectedRoute.sitePath.slice(1, -1).forEach((siteId, index) => {
        const site = siteById.get(siteId);

        if (!site) {
          return;
        }

        siteFeatures.push(
          createPointFeature([site.longitude, site.latitude], {
            kind: "via",
            name: `Via ${index + 1}: ${site.name}`,
          }),
        );
      });
    }

    if (analysis?.relayPoint) {
      siteFeatures.push(
        createPointFeature([analysis.relayPoint.longitude, analysis.relayPoint.latitude], {
          kind: "relay",
          name: "Relais",
          elevationM: analysis.relayPoint.elevation,
          assured: analysis.relayPoint.assured,
        }),
      );
    }

    const obstacleFeatures: Feature[] =
      analysis?.profile && analysis.profile.length > 0
        ? analysis.obstacles.map((obstacle, index) => {
            const closest = findClosestProfilePoint(analysis.profile, obstacle.distanceKm);
            return createPointFeature([closest.longitude, closest.latitude], {
              id: `obs-${index}`,
              severity: obstacle.severity,
              type: obstacle.type,
              distanceKm: obstacle.distanceKm,
            });
          })
        : [];

    const alternativeFeatures: Feature[] = routeAlternatives.flatMap((route) => {
      const routedCandidates = roadRoutes
        .filter((roadRoute) => roadRoute.routeId === route.id)
        .map((roadRoute) =>
          roadRoute.coordinates.map((point) => [point.longitude, point.latitude] as Position),
        )
        .filter((coordinates) => coordinates.length > 1);
      const fallbackCoordinates = route.sitePath
        .map((siteId) => siteById.get(siteId))
        .filter((site): site is Site => Boolean(site))
        .map((site) => [site.longitude, site.latitude] as Position);
      const candidates = routedCandidates.length > 0 ? routedCandidates : [fallbackCoordinates];

      return candidates
        .filter((coordinates) => coordinates.length > 1)
        .map((coordinates, index) => ({
          type: "Feature",
          properties: {
            id: `${route.id}-${index}`,
            selected: selectedRoute?.id === route.id && index === 0,
          },
          geometry: {
            type: "LineString",
            coordinates,
          },
        }) as Feature);
    });

    const markerFeatures = markers.map((marker) =>
      createPointFeature([marker.longitude, marker.latitude], {
        id: marker.id,
        label: marker.label,
      }),
    );
    const alternativeCoordinates: Position[] = alternativeFeatures.flatMap((feature) => {
      const geometry = feature.geometry;

      return geometry.type === "LineString" ? geometry.coordinates : [];
    });
    const markerCoordinates: Position[] = markerFeatures.flatMap((feature) => {
      const geometry = feature.geometry;

      return geometry.type === "Point" ? [geometry.coordinates] : [];
    });
    const allBoundsCoordinates = [
      ...pathCoordinates,
      ...alternativeCoordinates,
      ...markerCoordinates,
    ];
    const bearing = analysis?.azimuthDeg ?? calculateBearing(pathCoordinates[0], pathCoordinates[pathCoordinates.length - 1]);

    return {
      pathGeoJson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: "link-path",
            },
            geometry: {
              type: "LineString",
              coordinates: pathCoordinates,
            },
          },
        ],
      } as FeatureCollection,
      sitesGeoJson: {
        type: "FeatureCollection",
        features: siteFeatures,
      } as FeatureCollection,
      alternativesGeoJson: {
        type: "FeatureCollection",
        features: alternativeFeatures,
      } as FeatureCollection,
      obstaclesGeoJson: {
        type: "FeatureCollection",
        features: obstacleFeatures,
      } as FeatureCollection,
      markersGeoJson: {
        type: "FeatureCollection",
        features: markerFeatures,
      } as FeatureCollection,
      bounds: coordinatesToBounds(allBoundsCoordinates.length > 1 ? allBoundsCoordinates : pathCoordinates),
      center: pathCoordinates[0] as [number, number],
      bearing,
      distanceLabel: analysis
        ? `${analysis.distanceKm.toFixed(1)} km`
        : selectedRoadCandidates[0]
          ? `${selectedRoadCandidates[0].distanceKm.toFixed(1)} km`
        : selectedRoute
          ? `${selectedRoute.totalDistanceKm.toFixed(1)} km`
          : "-",
      terrainLabel: analysis?.terrainSource ?? "route-reseau",
      losLabel: analysis
        ? analysis.los.clear
          ? "LOS OK"
          : "LOS bloquee"
        : selectedRoute
          ? selectedRoute.quality === "critical"
            ? "Risque eleve"
            : "Route calculee"
          : "-",
    };
  }, [analysis, markers, roadRoutes, routeAlternatives, selectedRoute, selectedRouteCoordinates, siteById]);

  useEffect(() => {
    if (!mapData || !mapContainerRef.current) {
      return;
    }

    setMapError(null);
    const container = mapContainerRef.current;

    const map = new maplibregl.Map({
      container,
      style: openStreetStyleUrl,
      hash: false,
      center: mapData.center,
      zoom: 11,
      pitch: 74,
      bearing: mapData.bearing,
      maxPitch: 85,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 180, unit: "metric" }), "bottom-left");

    const onError = (event: maplibregl.ErrorEvent) => {
      const message = event.error instanceof Error ? event.error.message : String(event.error);
      if (message.includes("Failed to fetch")) {
        setMapError("Certaines couches 3D n'ont pas pu se charger. Verifie la connexion reseau.");
      }
    };
    map.on("error", onError);
    const onMapClick = (event: maplibregl.MapMouseEvent) => {
      onMapRepereAdd?.(event.lngLat.lat, event.lngLat.lng);
    };
    map.on("click", onMapClick);

    map.on("load", () => {
      if (!map.getSource("terrain-dem")) {
        map.addSource("terrain-dem", {
          type: "raster-dem",
          tiles: [terrainTileUrl],
          tileSize: 256,
          maxzoom: 14,
          attribution: "DEM: Mapzen Terrain via AWS Open Data",
          encoding: "terrarium",
        });
      }

      map.setTerrain({
        source: "terrain-dem",
        exaggeration: 1.55,
      });

      if (!map.getLayer("terrain-hillshade")) {
        map.addLayer({
          id: "terrain-hillshade",
          type: "hillshade",
          source: "terrain-dem",
          paint: {
            "hillshade-highlight-color": "#f4f8fb",
            "hillshade-shadow-color": "#4a5d65",
            "hillshade-exaggeration": 0.75,
          },
        });
      }

      tuneBuildingLayer(map);
      addOrReplaceGeoJson(map, "link-path", mapData.pathGeoJson);
      addOrReplaceGeoJson(map, "route-alternatives", mapData.alternativesGeoJson);
      addOrReplaceGeoJson(map, "sites-3d", mapData.sitesGeoJson);
      addOrReplaceGeoJson(map, "obstacles-3d", mapData.obstaclesGeoJson);
      addOrReplaceGeoJson(map, "markers-3d", mapData.markersGeoJson);
      ensureLinkLayers(map);
      ensureAlternativeLayers(map);
      ensureSiteLayers(map);
      ensureObstacleLayers(map);
      ensureMarkerLayers(map);

      map.fitBounds(mapData.bounds, {
        padding: { top: 70, right: 70, bottom: 70, left: 70 },
        duration: 1200,
      });
    });

    return () => {
      map.off("error", onError);
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [mapData, onMapRepereAdd]);

  if (!mapData) {
    return (
      <div
        className={cn(
          "flex h-[420px] items-center justify-center rounded-md border border-dashed border-border bg-muted/40 px-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Selectionne un itineraire pour charger la carte 3D detaillee.
      </div>
    );
  }

  return (
    <div className={cn("relative h-[420px] overflow-hidden rounded-md border border-border", className)}>
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <div className="font-medium">Carte 3D realiste</div>
        <div className="mt-1 text-muted-foreground">
          Sol 3D + batiments + corridor radio
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <span className="font-medium">{mapData.distanceLabel}</span>
        <span className="mx-2 text-muted-foreground">|</span>
        <span>{mapData.terrainLabel}</span>
        <span className="mx-2 text-muted-foreground">|</span>
        <span
          className={cn(
            mapData.losLabel === "LOS OK" || mapData.losLabel === "Route calculee"
              ? "text-emerald-600"
              : mapData.losLabel === "Risque eleve"
                ? "text-rose-600"
                : "text-sky-600",
          )}
        >
          {mapData.losLabel}
        </span>
      </div>

      {mapError && (
        <div className="absolute right-4 top-4 max-w-sm rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 shadow-sm">
          {mapError}
        </div>
      )}
    </div>
  );
}

function tuneBuildingLayer(map: maplibregl.Map) {
  if (!map.getLayer("building-3d")) {
    return;
  }

  map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.95);
  map.setPaintProperty("building-3d", "fill-extrusion-color", [
    "interpolate",
    ["linear"],
    ["zoom"],
    14,
    "#d5d0c6",
    18,
    "#f2efe9",
  ]);
}

function ensureLinkLayers(map: maplibregl.Map) {
  if (!map.getLayer("link-path-casing")) {
    map.addLayer({
      id: "link-path-casing",
      type: "line",
      source: "link-path",
      paint: {
        "line-color": "#ffffff",
        "line-width": 6,
        "line-opacity": 0.95,
      },
    });
  }

  if (!map.getLayer("link-path-core")) {
    map.addLayer({
      id: "link-path-core",
      type: "line",
      source: "link-path",
      paint: {
        "line-color": "#e30613",
        "line-width": 3.6,
        "line-opacity": 0.96,
      },
    });
  }
}

function ensureAlternativeLayers(map: maplibregl.Map) {
  if (!map.getLayer("route-alt-lines")) {
    map.addLayer({
      id: "route-alt-lines",
      type: "line",
      source: "route-alternatives",
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "selected"], true],
          "#e30613",
          "#2563eb",
        ],
        "line-width": [
          "case",
          ["==", ["get", "selected"], true],
          4.5,
          2.2,
        ],
        "line-opacity": [
          "case",
          ["==", ["get", "selected"], true],
          0.92,
          0.5,
        ],
      },
    });
  }
}

function ensureSiteLayers(map: maplibregl.Map) {
  if (!map.getLayer("site-points")) {
    map.addLayer({
      id: "site-points",
      type: "circle",
      source: "sites-3d",
      paint: {
        "circle-radius": [
          "match",
          ["get", "kind"],
          "relay",
          7,
          "via",
          6,
          8,
        ],
        "circle-color": [
          "match",
          ["get", "kind"],
          "siteA",
          "#16a34a",
          "siteB",
          "#2563eb",
          "relay",
          "#f59e0b",
          "via",
          "#8b5cf6",
          "#e30613",
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  if (!map.getLayer("site-labels")) {
    map.addLayer({
      id: "site-labels",
      type: "symbol",
      source: "sites-3d",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    });
  }
}

function ensureMarkerLayers(map: maplibregl.Map) {
  if (!map.getLayer("markers-3d-points")) {
    map.addLayer({
      id: "markers-3d-points",
      type: "circle",
      source: "markers-3d",
      paint: {
        "circle-radius": 5,
        "circle-color": "#a855f7",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.6,
      },
    });
  }
}

function ensureObstacleLayers(map: maplibregl.Map) {
  if (!map.getLayer("obstacle-points")) {
    map.addLayer({
      id: "obstacle-points",
      type: "circle",
      source: "obstacles-3d",
      paint: {
        "circle-radius": 4,
        "circle-color": [
          "match",
          ["get", "severity"],
          "critical",
          "#e11d48",
          "warning",
          "#f59e0b",
          "#94a3b8",
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }
}

function addOrReplaceGeoJson(map: maplibregl.Map, sourceId: string, data: FeatureCollection) {
  const existing = map.getSource(sourceId);

  if (!existing) {
    map.addSource(sourceId, {
      type: "geojson",
      data,
    });
    return;
  }

  const geoJsonSource = existing as maplibregl.GeoJSONSource;
  geoJsonSource.setData(data);
}

function createPointFeature(
  coordinates: Position,
  properties: Record<string, unknown>,
): Feature<Geometry> {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

function findClosestProfilePoint(
  profile: FullAnalysis["profile"],
  distanceKm: number,
) {
  return profile.reduce((closest, point) =>
    Math.abs(point.distance - distanceKm) < Math.abs(closest.distance - distanceKm)
      ? point
      : closest,
  );
}

function coordinatesToBounds(coordinates: Position[]) {
  const bounds = new maplibregl.LngLatBounds(
    coordinates[0] as [number, number],
    coordinates[0] as [number, number],
  );

  coordinates.forEach((coordinate) => {
    bounds.extend(coordinate as [number, number]);
  });

  return bounds;
}

function calculateBearing(start: Position, end: Position) {
  const lon1 = toRadians(start[0]);
  const lat1 = toRadians(start[1]);
  const lon2 = toRadians(end[0]);
  const lat2 = toRadians(end[1]);
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
