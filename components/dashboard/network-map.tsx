"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Polyline,
  Popup,
  CircleMarker,
  TileLayer,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import * as L from "leaflet";
import { Layers, Upload, Trash2, Eye, EyeOff, Key, Compass, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NetworkLink, Site } from "@/lib/local-db";
import type { RouteOption, RoutePortion } from "@/lib/network-routing";
import type { ElevationPoint, RelayPoint } from "@/lib/terrain";

type GeoJsonObject = {
  type: "FeatureCollection" | "Feature" | "GeometryCollection";
  [key: string]: unknown;
};

type ComputedBounds = L.LatLngBoundsExpression & { isValid: () => boolean };

type LeafletGeoJsonFactory = typeof L & {
  geoJSON: (data: GeoJsonObject) => { getBounds: () => ComputedBounds };
};

type LeafletMapLike = {
  fitBounds: (bounds: L.LatLngBoundsExpression) => void;
};

type NetworkMapProps = {
  sites: Site[];
  links: NetworkLink[];
  className?: string;
  terrainProfile?: ElevationPoint[];
  relayPoint?: RelayPoint | null;
  defaultMapType?: string;
  routeAlternatives?: RouteOption[];
  selectedRouteId?: string | null;
  routePortions?: RoutePortion[];
  activeRoutePortionIndex?: number;
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
    note?: string;
  }>;
  onMapRepereAdd?: (latitude: number, longitude: number) => void;
};

type CustomLayer = {
  id: string;
  name: string;
  data: GeoJsonObject;
  color: string;
  visible: boolean;
};

const statusColors = {
  Operational: "#16a34a",
  Maintenance: "#e11d48",
  Alert: "#f59e0b",
  Planned: "#64748b",
};

const linkColors = {
  Active: "#e30613",
  Alert: "#f59e0b",
  Planned: "#64748b",
  Maintenance: "#e11d48",
};

const geoJsonPopupProps = {
  onEachFeature: bindGeoJsonPopup,
};

export function NetworkMap({
  sites,
  links,
  className,
  terrainProfile = [],
  relayPoint,
  defaultMapType = "opentopo",
  routeAlternatives = [],
  selectedRouteId = null,
  routePortions = [],
  activeRoutePortionIndex = 0,
  roadRoutes = [],
  markers = [],
  onMapRepereAdd,
}: NetworkMapProps) {
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const selectedRoute =
    routeAlternatives.find((route) => route.id === selectedRouteId) ?? routeAlternatives[0];
  const roadRoutesByRouteId = useMemo(() => {
    const grouped = new Map<string, typeof roadRoutes>();

    for (const route of roadRoutes) {
      grouped.set(route.routeId, [...(grouped.get(route.routeId) ?? []), route]);
    }

    return grouped;
  }, [roadRoutes]);
  const center = sites.length
    ? averageCenter(sites)
    : ([4.0511, 9.7085] as [number, number]);

  const [mapType, setMapType] = useState<string>(() =>
    readStorageValue("camrail_map_type", defaultMapType),
  );
  const [googleApiKey, setGoogleApiKey] = useState<string>(() =>
    readStorageValue("camrail_google_maps_api_key", ""),
  );
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>(readStoredLayers);
  const [showControls, setShowControls] = useState(false);
  const [layerColor, setLayerColor] = useState("#3b82f6");
  const [zoomBounds, setZoomBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const networkBounds = useMemo(
    () =>
      buildNetworkBounds(
        sites,
        terrainProfile,
        relayPoint,
        routeAlternatives,
        selectedRoute,
        routePortions,
        roadRoutes,
        markers,
      ),
    [markers, relayPoint, roadRoutes, routeAlternatives, routePortions, selectedRoute, sites, terrainProfile],
  );

  const handleMapTypeChange = (type: string) => {
    setMapType(type);
    localStorage.setItem("camrail_map_type", type);
  };

  const handleApiKeyChange = (key: string) => {
    setGoogleApiKey(key);
    localStorage.setItem("camrail_google_maps_api_key", key);
  };

  const saveLayersToLocalStorage = (layers: CustomLayer[]) => {
    try {
      localStorage.setItem("camrail_custom_layers", JSON.stringify(layers));
    } catch {
      console.warn("Storage limit exceeded, layers not saved to localStorage");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as unknown;

        if (isGeoJsonObject(json)) {
          const newLayer: CustomLayer = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            data: json,
            color: layerColor,
            visible: true,
          };
          const updated = [...customLayers, newLayer];
          setCustomLayers(updated);
          saveLayersToLocalStorage(updated);
        } else {
          alert("Le fichier ne semble pas être un GeoJSON valide (FeatureCollection attendu).");
        }
      } catch {
        alert("Erreur lors de la lecture ou du décodage du fichier JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteLayer = (id: string) => {
    const updated = customLayers.filter((l) => l.id !== id);
    setCustomLayers(updated);
    saveLayersToLocalStorage(updated);
  };

  const handleToggleLayer = (id: string) => {
    const updated = customLayers.map((l) =>
      l.id === id ? { ...l, visible: !l.visible } : l,
    );
    setCustomLayers(updated);
    saveLayersToLocalStorage(updated);
  };

  const handleZoomToLayer = (layer: CustomLayer) => {
    try {
      const bounds = (L as LeafletGeoJsonFactory).geoJSON(layer.data).getBounds();
      if (bounds.isValid()) {
        setZoomBounds(bounds);
      } else {
        alert("Impossible de déterminer les limites de cette couche.");
      }
    } catch {
      alert("Erreur lors du calcul des limites géographiques.");
    }
  };

  const getGoogleTileUrl = (lyr: string) => {
    return `https://mt1.google.com/vt/lyrs=${lyr}&x={x}&y={y}&z={z}${
      googleApiKey ? `&key=${googleApiKey}` : ""
    }`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Floating Control Toggle Button */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className="glass hover:bg-muted/80 text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 shadow-lg border border-border"
          title="Fonds de carte et imports SIG"
        >
          <Layers className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* Floating Control Panel */}
      {showControls && (
        <div className="absolute top-16 right-4 z-[1000] w-80 glass rounded-xl border border-border shadow-2xl p-4 max-h-[75vh] flex flex-col text-sm overflow-hidden select-none">
          <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
            <span className="font-bold text-foreground flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Contrôles de la carte
            </span>
            <button
              onClick={() => setShowControls(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Fermer
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            {/* Base Layer Selection */}
            <div className="space-y-2">
              <span className="font-bold text-xs uppercase text-muted-foreground tracking-wider block">
                Fond de carte
              </span>
              <select
                value={mapType}
                onChange={(e) => handleMapTypeChange(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
              >
                <option value="osm">OpenStreetMap</option>
                <option value="opentopo">OpenTopoMap (Relief)</option>
                <option value="google_road">Google Maps (Routier)</option>
                <option value="google_satellite">Google Maps (Satellite)</option>
                <option value="google_hybrid">Google Maps (Hybride)</option>
                <option value="google_terrain">Google Maps (Terrain)</option>
              </select>
            </div>

            {/* Google Maps API Key */}
            {mapType.startsWith("google_") && (
              <div className="space-y-1.5 p-2.5 bg-muted/40 rounded-lg border border-border">
                <span className="text-xs font-medium flex items-center gap-1.5 text-foreground">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  Clé API Google Maps
                </span>
                <Input
                  type="password"
                  placeholder={googleApiKey ? "Clé configurée" : "Clé API (Optionnelle)"}
                  value={googleApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="h-8 bg-background border-border text-xs text-foreground"
                />
                <p className="text-[10px] text-muted-foreground">
                  La clé API est facultative pour l&apos;usage de base mais recommandée pour la conformité.
                </p>
              </div>
            )}

            {/* QGIS / GIS Layer Import */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-muted-foreground tracking-wider block">
                  Couches SIG (QGIS / GeoJSON)
                </span>
              </div>

              {/* Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Couleur :</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setLayerColor(c)}
                        className={`w-4 h-4 rounded-full border ${
                          layerColor === c ? "ring-2 ring-primary ring-offset-1" : "border-border"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={layerColor}
                      onChange={(e) => setLayerColor(e.target.value)}
                      className="w-5 h-5 border border-border rounded cursor-pointer p-0 bg-transparent"
                    />
                  </div>
                </div>

                <label className="flex flex-col items-center justify-center border border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      Importer GeoJSON / JSON
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Glisser-déposer ou cliquer pour choisir
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".json,.geojson"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* List of Custom Layers */}
              {customLayers.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-foreground">
                    Couches importées ({customLayers.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {customLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="truncate font-medium text-foreground" title={layer.name}>
                            {layer.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleLayer(layer.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title={layer.visible ? "Masquer" : "Afficher"}
                          >
                            {layer.visible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleZoomToLayer(layer)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Zoomer sur la couche"
                          >
                            <Globe2 className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-rose-500"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MapContainer */}
      <MapContainer
        center={center}
        zoom={6}
        minZoom={3}
        maxZoom={19}
        attributionControl={true}
        className="h-full w-full camrail-map"
      >
        {/* Dynamic Tile Layer */}
        {mapType === "osm" && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {mapType === "opentopo" && (
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        )}
        {mapType === "google_road" && (
          <TileLayer
            url={getGoogleTileUrl("m")}
          />
        )}
        {mapType === "google_satellite" && (
          <TileLayer
            url={getGoogleTileUrl("s")}
          />
        )}
        {mapType === "google_hybrid" && (
          <TileLayer
            url={getGoogleTileUrl("y")}
          />
        )}
        {mapType === "google_terrain" && (
          <TileLayer
            url={getGoogleTileUrl("p")}
          />
        )}

        {/* Zoom bounds controller */}
        <MapRefHandler bounds={zoomBounds ?? networkBounds} />
        <MapClickHandler onMapRepereAdd={onMapRepereAdd} />

        {/* Custom GeoJSON layers */}
        {customLayers
          .filter((l) => l.visible)
          .map((layer) => (
            <GeoJSON
              key={`${layer.id}-${layer.color}`}
              data={layer.data}
              pathOptions={{
                color: layer.color,
                weight: 3,
                opacity: 0.8,
                fillColor: layer.color,
                fillOpacity: 0.35,
              }}
              {...geoJsonPopupProps}
            />
          ))}

        {routeAlternatives.flatMap((route) => {
          const selected = selectedRoute?.id === route.id;
          const roadCandidates = roadRoutesByRouteId.get(route.id) ?? [];
          const fallbackPositions = routeToPositions(route, siteById);
          const candidates =
            roadCandidates.length > 0
              ? roadCandidates.map((candidate) => ({
                  id: candidate.id,
                  source: candidate.source,
                  distanceKm: candidate.distanceKm,
                  durationMin: candidate.durationMin,
                  positions: candidate.coordinates.map((point) => [point.latitude, point.longitude] as [number, number]),
                }))
              : [
                  {
                    id: route.id,
                    source: "fallback" as const,
                    distanceKm: route.totalDistanceKm,
                    durationMin: 0,
                    positions: fallbackPositions,
                  },
                ];

          return candidates
            .filter((candidate) => candidate.positions.length >= 2)
            .map((candidate, index) => {
              const primaryCandidate = index === 0;
              const emphasize = selected && primaryCandidate;

              return (
                <Polyline
                  key={`${route.id}-${candidate.id}`}
                  positions={candidate.positions}
                  pathOptions={{
                    color: emphasize ? "#e30613" : selected ? "#f97316" : "#2563eb",
                    weight: emphasize ? 6 : selected ? 4 : 3,
                    opacity: emphasize ? 0.94 : selected ? 0.8 : 0.6,
                  }}
                >
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className={emphasize ? "text-primary" : "text-sky-600"}>
                        {route.name}
                      </strong>
                      <br />
                      <span className="text-muted-foreground">{route.summary}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {candidate.distanceKm.toFixed(2)} km
                        {candidate.durationMin > 0 ? ` | ${candidate.durationMin.toFixed(1)} min` : ""}
                        {candidate.source === "fallback" ? " | trace directe" : " | trace routiere"}
                      </span>
                    </div>
                  </Popup>
                </Polyline>
              );
            });
        })}

        {routePortions.map((portion, index) => (
          <Polyline
            key={`portion-${portion.index}`}
            positions={[
              [portion.from.latitude, portion.from.longitude],
              [portion.to.latitude, portion.to.longitude],
            ]}
            pathOptions={{
              color: index === activeRoutePortionIndex ? "#16a34a" : "#22c55e",
              weight: index === activeRoutePortionIndex ? 5 : 3,
              opacity: index === activeRoutePortionIndex ? 0.9 : 0.46,
            }}
          />
        ))}

        {/* Existing site-to-site Links */}
        {links.map((link) => {
          const siteA = siteById.get(link.siteAId);
          const siteB = siteById.get(link.siteBId);

          if (!siteA || !siteB) {
            return null;
          }

          return (
            <Polyline
              key={link.id}
              positions={[
                [siteA.latitude, siteA.longitude],
                [siteB.latitude, siteB.longitude],
              ]}
              pathOptions={{
                color: linkColors[link.status],
                weight: routeAlternatives.length ? 2 : 3,
                opacity: routeAlternatives.length ? 0.3 : 0.78,
              }}
            >
              <Popup>
                <div className="text-xs font-sans">
                  <strong className="text-primary">{link.id}</strong>
                  <br />
                  <span className="font-semibold">{link.siteAName}</span> - <span className="font-semibold">{link.siteBName}</span>
                  <br />
                  <span className="text-muted-foreground">{link.frequencyGhz} GHz | {link.rslDbm.toFixed(1)} dBm</span>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {terrainProfile.length > 1 && (
          <Polyline
            positions={terrainProfile.map((point) => [point.latitude, point.longitude])}
            pathOptions={{
              color: "#0ea5e9",
              weight: 5,
              opacity: 0.86,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-primary">Profil terrain</strong>
                <br />
                <span className="text-muted-foreground">
                  {terrainProfile.length} points d&apos;elevation echantillonnes
                </span>
              </div>
            </Popup>
          </Polyline>
        )}

        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.latitude, site.longitude]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: statusColors[site.status],
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-foreground">{site.name}</strong>
                <br />
                <span className="text-muted-foreground">{site.region}</span>
                <br />
                <span className="text-muted-foreground">{site.towerType} | {site.towerHeightM}m</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.latitude, marker.longitude]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#8b5cf6",
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-primary">{marker.label}</strong>
                <br />
                <span className="text-muted-foreground">
                  {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
                </span>
                {marker.note && (
                  <>
                    <br />
                    <span className="text-muted-foreground">{marker.note}</span>
                  </>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {relayPoint && (
          <CircleMarker
            center={[relayPoint.latitude, relayPoint.longitude]}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: relayPoint.assured ? "#0ea5e9" : "#f59e0b",
              fillOpacity: 0.96,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-primary">Point relais</strong>
                <br />
                <span className="text-muted-foreground">
                  {relayPoint.latitude}, {relayPoint.longitude}
                </span>
                <br />
                <span className="text-muted-foreground">
                  Pylone conseille: {relayPoint.relayHeightM}m
                </span>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

function averageCenter(sites: Site[]): [number, number] {
  const total = sites.reduce(
    (acc, site) => ({
      latitude: acc.latitude + site.latitude,
      longitude: acc.longitude + site.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [total.latitude / sites.length, total.longitude / sites.length];
}

function buildNetworkBounds(
  sites: Site[],
  terrainProfile: ElevationPoint[],
  relayPoint?: RelayPoint | null,
  routeAlternatives: RouteOption[] = [],
  selectedRoute?: RouteOption,
  routePortions: RoutePortion[] = [],
  roadRoutes: Array<{
    coordinates: Array<{ latitude: number; longitude: number }>;
  }> = [],
  markers: Array<{ latitude: number; longitude: number }> = [],
): L.LatLngBoundsExpression | null {
  const points: Array<[number, number]> = [];
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const routesToDraw = selectedRoute ? [selectedRoute] : routeAlternatives;

  if (routesToDraw.length === 0) {
    sites.forEach((site) => {
      points.push([site.latitude, site.longitude]);
    });
  }

  terrainProfile.forEach((point) => {
    points.push([point.latitude, point.longitude]);
  });

  if (relayPoint) {
    points.push([relayPoint.latitude, relayPoint.longitude]);
  }

  routesToDraw.forEach((route) => {
    routeToPositions(route, siteById).forEach((position) => {
      points.push(position);
    });
  });

  routePortions.forEach((portion) => {
    points.push([portion.from.latitude, portion.from.longitude]);
    points.push([portion.to.latitude, portion.to.longitude]);
  });

  roadRoutes.forEach((route) => {
    route.coordinates.forEach((point) => {
      points.push([point.latitude, point.longitude]);
    });
  });

  markers.forEach((marker) => {
    points.push([marker.latitude, marker.longitude]);
  });

  return points.length > 1 ? points : null;
}

function routeToPositions(route: RouteOption, siteById: Map<string, Site>) {
  return route.sitePath
    .map((siteId) => siteById.get(siteId))
    .filter((site): site is Site => Boolean(site))
    .map((site) => [site.latitude, site.longitude] as [number, number]);
}

function bindGeoJsonPopup(
  feature: { properties?: Record<string, unknown> | null },
  leafletLayer: { bindPopup: (html: string) => void },
) {
  const properties = feature.properties;

  if (!properties) {
    return;
  }

  const rows = Object.entries(properties)
    .map(
      ([key, val]) =>
        `<tr><td class="pr-2 font-bold py-0.5 border-b border-border text-foreground">${key}:</td><td class="py-0.5 border-b border-border font-mono text-muted-foreground">${String(val)}</td></tr>`,
    )
    .join("");

  leafletLayer.bindPopup(
    `<div class="text-[11px] max-h-48 overflow-y-auto max-w-64">
      <p class="font-bold border-b border-primary pb-1 mb-1 text-xs text-foreground font-sans font-medium">Attributs SIG</p>
      <table class="w-full text-left border-collapse">${rows}</table>
    </div>`,
  );
}

function MapRefHandler({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap() as unknown as LeafletMapLike;
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
}

function MapClickHandler({
  onMapRepereAdd,
}: {
  onMapRepereAdd?: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event: { latlng: { lat: number; lng: number } }) {
      onMapRepereAdd?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function readStorageValue(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return localStorage.getItem(key) ?? fallback;
}

function readStoredLayers() {
  if (typeof window === "undefined") {
    return [];
  }

  const savedLayers = localStorage.getItem("camrail_custom_layers");

  if (!savedLayers) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedLayers) as CustomLayer[];

    return Array.isArray(parsed) ? parsed.filter((layer) => isGeoJsonObject(layer.data)) : [];
  } catch {
    return [];
  }
}

function isGeoJsonObject(value: unknown): value is GeoJsonObject {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const type = (value as { type?: unknown }).type;

  return type === "FeatureCollection" || type === "Feature" || type === "GeometryCollection";
}
