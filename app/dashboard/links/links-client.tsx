"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart,
  Download,
  Edit,
  Info,
  MapPin,
  Mountain,
  Plus,
  RadioTower,
  RefreshCw,
  Route,
  Save,
  Settings2,
  ShieldCheck,
  Target,
  Trash2,
  Trees,
  Waves,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Equipment, LinkStatus, NetworkLink, Site } from "@/lib/local-db";
import {
  computeRouteAlternatives,
  splitRouteIntoPortions,
  type RouteOption,
} from "@/lib/network-routing";
import { exportSimulationPdf } from "@/lib/simulation-pdf";
import type { FullAnalysis, SignalSystem, TerrainObstacle } from "@/lib/terrain";
import { cn } from "@/lib/utils";
import {
  createLinkAction,
  deleteLinkAction,
  saveSimulationAction,
  updateLinkAction,
} from "./actions";

type LinksClientProps = {
  sites: Site[];
  equipment: Equipment[];
  initialLinks: NetworkLink[];
  initialFocusId?: string;
  initialQuery?: string;
};

type TerrainRequest = {
  linkId: string;
  system: SignalSystem;
  latA: number;
  lonA: number;
  heightA: number;
  latB: number;
  lonB: number;
  heightB: number;
  frequencyGhz: number;
};

type PlannerMarker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  note: string;
  siteId?: string;
  createdAt: string;
};

type RoadRoute = {
  id: string;
  routeId: string;
  source: "osrm" | "fallback";
  distanceKm: number;
  durationMin: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
};

type AiSuggestionPayload = {
  summary: string;
  suggestions: string[];
  provider: "nvidia";
};

const statusLabels: Record<LinkStatus, string> = {
  Active: "Actif",
  Alert: "Alerte",
  Planned: "Planifie",
  Maintenance: "Maintenance",
};

const systemLabels: Record<SignalSystem, { title: string; subtitle: string }> = {
  fh: {
    title: "FH",
    subtitle: "Objectif 100%",
  },
  vhf: {
    title: "VHF",
    subtitle: "Objectif 95%",
  },
};

const chartNames: Record<string, string> = {
  terrain: "Relief",
  losHeight: "Ligne de visee",
  fresnelLower: "Fresnel 60%",
  fresnelUpper: "Envelope Fresnel",
};

const NetworkMap = dynamic(
  () => import("@/components/dashboard/network-map").then((module) => module.NetworkMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] animate-pulse rounded-md bg-muted/50" />,
  },
);

const Realistic3DMap = dynamic(
  () => import("@/components/dashboard/realistic-3d-map").then((module) => module.Realistic3DMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] animate-pulse rounded-md bg-muted/50" />,
  },
);

export function LinksClient({
  sites,
  equipment,
  initialLinks,
  initialFocusId,
  initialQuery = "",
}: LinksClientProps) {
  const chartReady = useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const defaultFocusedLink =
    (initialFocusId ? initialLinks.find((link) => link.id === initialFocusId) : undefined) ??
    initialLinks[0];
  const [query, setQuery] = useState(initialQuery);
  const [activePanel, setActivePanel] = useState<"details" | "map" | "terrain3d">("details");
  const [system, setSystem] = useState<SignalSystem>("fh");
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<NetworkLink | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState(
    initialFocusId && initialLinks.some((link) => link.id === initialFocusId)
      ? initialFocusId
      : initialLinks[0]?.id,
  );
  const [heightA, setHeightA] = useState(30);
  const [heightB, setHeightB] = useState(30);
  const [analysisRequest, setAnalysisRequest] = useState<TerrainRequest | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [routeStartId, setRouteStartId] = useState(
    defaultFocusedLink?.siteAId ?? sites[0]?.id ?? "",
  );
  const [routeEndId, setRouteEndId] = useState(
    defaultFocusedLink?.siteBId ?? sites[1]?.id ?? sites[0]?.id ?? "",
  );
  const [viaSiteIdInput, setViaSiteIdInput] = useState("");
  const [viaSiteIds, setViaSiteIds] = useState<string[]>([]);
  const [portionCount, setPortionCount] = useState(3);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [activePortionIndex, setActivePortionIndex] = useState(0);
  const [markerSiteId, setMarkerSiteId] = useState(sites[0]?.id ?? "");
  const [markerNote, setMarkerNote] = useState("");
  const [markers, setMarkers] = useState<PlannerMarker[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [roadRoutes, setRoadRoutes] = useState<RoadRoute[]>([]);
  const [isRoutingRoads, setIsRoutingRoads] = useState(false);
  const [isSavingSimulation, setIsSavingSimulation] = useState(false);

  const filteredLinks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return initialLinks;
    }

    return initialLinks.filter((link) =>
      [
        link.id,
        link.siteAName,
        link.siteBName,
        link.status,
        `${link.frequencyGhz} GHz`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [initialLinks, query]);

  const selectedLink =
    initialLinks.find((link) => link.id === selectedLinkId) ?? initialLinks[0];
  const routeStartSite = routeStartId ? siteById.get(routeStartId) : undefined;
  const routeEndSite = routeEndId ? siteById.get(routeEndId) : undefined;
  const effectiveViaSiteIds = useMemo(
    () =>
      viaSiteIds.filter(
        (siteId) =>
          siteId !== routeStartId &&
          siteId !== routeEndId &&
          siteById.has(siteId),
      ),
    [routeEndId, routeStartId, siteById, viaSiteIds],
  );
  const routeAlternatives = useMemo(
    () =>
      routeStartId && routeEndId && routeStartId !== routeEndId
        ? computeRouteAlternatives({
            sites,
            links: initialLinks,
            startSiteId: routeStartId,
            endSiteId: routeEndId,
            viaSiteIds: effectiveViaSiteIds,
            maxAlternatives: 4,
          })
        : [],
    [effectiveViaSiteIds, initialLinks, routeEndId, routeStartId, sites],
  );
  const selectedRoute =
    routeAlternatives.find((route) => route.id === selectedRouteId) ?? routeAlternatives[0];
  const routePortions = useMemo(
    () =>
      selectedRoute
        ? splitRouteIntoPortions(selectedRoute, sites, portionCount)
        : [],
    [portionCount, selectedRoute, sites],
  );
  const normalizedActivePortionIndex =
    routePortions.length > 0
      ? Math.min(activePortionIndex, routePortions.length - 1)
      : 0;
  const activePortion = routePortions[normalizedActivePortionIndex] ?? routePortions[0];
  const markerDetails = markers;
  const fadeMargin = selectedRoute
    ? Math.max(0, selectedRoute.weakestRslDbm + 80)
    : selectedLink
      ? Math.max(0, selectedLink.rslDbm + 80)
      : 0;
  const linkHealth =
    analysis?.coverage.status === "critical"
      ? "Trajet critique"
      : analysis?.coverage.status === "warning"
        ? "A optimiser"
        : selectedRoute?.quality === "critical"
          ? "A surveiller"
          : selectedRoute?.quality === "warning"
            ? "A ajuster"
            : fadeMargin >= 25
              ? "Excellent"
              : fadeMargin >= 15
                ? "Correct"
                : "Limite";

  const terrainTarget = useMemo(() => {
    const frequencyGhz = system === "vhf" ? 0.15 : Math.max(0.001, selectedLink?.frequencyGhz ?? 15);

    if (activePortion) {
      return {
        linkId: `${selectedRoute?.id ?? "route"}-portion-${activePortion.index}`,
        latA: activePortion.from.latitude,
        lonA: activePortion.from.longitude,
        latB: activePortion.to.latitude,
        lonB: activePortion.to.longitude,
        frequencyGhz,
      };
    }

    if (routeStartSite && routeEndSite) {
      return {
        linkId: selectedRoute?.id ?? selectedLink?.id ?? "route-direct",
        latA: routeStartSite.latitude,
        lonA: routeStartSite.longitude,
        latB: routeEndSite.latitude,
        lonB: routeEndSite.longitude,
        frequencyGhz,
      };
    }

    return null;
  }, [
    activePortion,
    routeEndSite,
    routeStartSite,
    selectedLink?.frequencyGhz,
    selectedLink?.id,
    selectedRoute?.id,
    system,
  ]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (!terrainTarget) {
        setAnalysis(null);
        setAnalysisRequest(null);
        return;
      }

      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisRequest(
        buildTerrainRequestFromPoints(
          terrainTarget,
          system,
          heightA,
          heightB,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [heightA, heightB, system, terrainTarget]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(async () => {
      if (cancelled) {
        return;
      }

      if (!routeAlternatives.length) {
        setRoadRoutes([]);
        return;
      }

      setIsRoutingRoads(true);

      try {
        const results = await Promise.all(
          routeAlternatives.map(async (route) => {
            const points = route.sitePath
              .map((siteId) => siteById.get(siteId))
              .filter((site): site is Site => Boolean(site))
              .map((site) => ({
                latitude: site.latitude,
                longitude: site.longitude,
              }));

            if (points.length < 2) {
              return [] as RoadRoute[];
            }

            try {
              const response = await fetch("/api/routing/road-path", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  points,
                  profile: "driving",
                }),
              });
              const payload = (await response.json()) as {
                source?: "osrm" | "fallback";
                routes?: Array<{
                  coordinates?: Array<[number, number]>;
                  distanceKm?: number;
                  durationMin?: number;
                }>;
              };

              if (!response.ok || !Array.isArray(payload.routes) || payload.routes.length === 0) {
                throw new Error("Road routing unavailable");
              }

              const wantsAlternatives =
                route.id === (selectedRoute?.id ?? routeAlternatives[0]?.id);

              return payload.routes.slice(0, wantsAlternatives ? 3 : 1).map((item, itemIndex) => {
                const coordinates =
                  item.coordinates?.map((coord) => ({
                    latitude: coord[1],
                    longitude: coord[0],
                  })) ?? [];

                return {
                  id: itemIndex === 0 ? route.id : `${route.id}-alt-${itemIndex}`,
                  routeId: route.id,
                  source: payload.source ?? "osrm",
                  distanceKm: item.distanceKm ?? route.totalDistanceKm,
                  durationMin: item.durationMin ?? 0,
                  coordinates,
                } satisfies RoadRoute;
              });
            } catch {
              return [
                {
                  id: route.id,
                  routeId: route.id,
                  source: "fallback",
                  distanceKm: route.totalDistanceKm,
                  durationMin: 0,
                  coordinates: points,
                } satisfies RoadRoute,
              ];
            }
          }),
        );

        if (!cancelled) {
          setRoadRoutes(results.flat());
        }
      } finally {
        if (!cancelled) {
          setIsRoutingRoads(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routeAlternatives, selectedRoute?.id, siteById]);

  useEffect(() => {
    if (!analysisRequest) {
      return;
    }

    const controller = new AbortController();

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setIsAnalyzing(true);
        setAnalysisError(null);
      }
    });

    fetch("/api/terrain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysisRequest),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as FullAnalysis | { error?: string };

        if (!response.ok) {
          throw new Error("error" in payload ? payload.error ?? "Analyse terrain impossible." : "Analyse terrain impossible.");
        }

        setAnalysis(payload as FullAnalysis);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAnalysisError(error instanceof Error ? error.message : "Analyse terrain impossible.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAnalyzing(false);
        }
      });

    return () => controller.abort();
  }, [analysisRequest]);

  function runTerrainAnalysis() {
    if (!terrainTarget) {
      return;
    }

    setAnalysisRequest(
      buildTerrainRequestFromPoints(
        terrainTarget,
        system,
        heightA,
        heightB,
      ),
    );
  }

  const availableViaCandidates = useMemo(
    () =>
      sites.filter(
        (site) =>
          site.id !== routeStartId &&
          site.id !== routeEndId &&
          !effectiveViaSiteIds.includes(site.id),
      ),
    [effectiveViaSiteIds, routeEndId, routeStartId, sites],
  );

  const plannerSuggestions = useMemo(
    () =>
      buildPlannerSuggestions({
        route: selectedRoute,
        portions: routePortions,
        markers: markerDetails,
        analysis,
        system,
      }),
    [analysis, markerDetails, routePortions, selectedRoute, system],
  );
  const effectiveMarkerSiteId =
    markerSiteId && siteById.has(markerSiteId)
      ? markerSiteId
      : routeStartId || sites[0]?.id || "";

  function addViaSite() {
    if (!viaSiteIdInput || effectiveViaSiteIds.includes(viaSiteIdInput)) {
      return;
    }

    if (viaSiteIdInput === routeStartId || viaSiteIdInput === routeEndId) {
      return;
    }

    setViaSiteIds((current) => [...current, viaSiteIdInput]);
    setViaSiteIdInput("");
    setSelectedRouteId("");
    setActivePortionIndex(0);
    setAiSummary(null);
    setAiSuggestions([]);
    setAiError(null);
  }

  function removeViaSite(siteId: string) {
    setViaSiteIds((current) => current.filter((item) => item !== siteId));
    setSelectedRouteId("");
    setActivePortionIndex(0);
    setAiSummary(null);
    setAiSuggestions([]);
    setAiError(null);
  }

  function addMarker() {
    if (!effectiveMarkerSiteId || !siteById.has(effectiveMarkerSiteId)) {
      return;
    }

    const site = siteById.get(effectiveMarkerSiteId);

    if (!site) {
      return;
    }

    setMarkers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        note: markerNote.trim(),
        siteId: site.id,
        createdAt: new Date().toISOString(),
      },
    ]);
    setMarkerNote("");
    setAiSummary(null);
    setAiSuggestions([]);
    setAiError(null);
  }

  function addMarkerFromMap(latitude: number, longitude: number) {
    setMarkers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: `Repere ${current.length + 1}`,
        latitude: roundNumber(latitude, 6),
        longitude: roundNumber(longitude, 6),
        note: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setAiSummary(null);
    setAiSuggestions([]);
    setAiError(null);
  }

  function removeMarker(id: string) {
    setMarkers((current) => current.filter((marker) => marker.id !== id));
    setAiSummary(null);
    setAiSuggestions([]);
    setAiError(null);
  }

  function buildAiInsightsRequest() {
    if (!selectedRoute) {
      return null;
    }

    return {
      system,
      route: selectedRoute,
      alternatives: routeAlternatives.map((route) => ({
        id: route.id,
        name: route.name,
        totalDistanceKm: route.totalDistanceKm,
        estimatedAvailabilityPct: route.estimatedAvailabilityPct,
        weakestRslDbm: route.weakestRslDbm,
        quality: route.quality,
        summary: route.summary,
        sitePath: route.sitePath.map((siteId) => siteById.get(siteId)?.name ?? siteId),
        intermediateSites: route.sitePath
          .slice(1, -1)
          .map((siteId) => siteById.get(siteId)?.name ?? siteId),
        viaCount: Math.max(0, route.sitePath.length - 2),
      })),
      activeRoadPath:
        roadRoutes.find((route) => route.routeId === selectedRoute.id) ?? null,
      portions: routePortions,
      markers: markerDetails.map((marker) => ({
        siteId: marker.siteId ?? marker.id,
        siteName: marker.label,
        latitude: marker.latitude,
        longitude: marker.longitude,
        note: marker.note,
      })),
      coverage: analysis?.coverage ?? null,
      analysisSnapshot: analysis
        ? {
            distanceKm: analysis.distanceKm,
            losClear: analysis.los.clear,
            losClearanceMin: analysis.los.clearanceMin,
            minFresnelClearanceM: analysis.minFresnelClearanceM,
            azimuthDeg: analysis.azimuthDeg,
            reverseAzimuthDeg: analysis.reverseAzimuthDeg,
            terrainSource: analysis.terrainSource,
            antennaRec: analysis.antennaRec,
            relayPoint: analysis.relayPoint,
            planningSuggestion: analysis.planningSuggestion,
          }
        : null,
      obstacles: analysis?.obstacles ?? [],
      diagnostics: analysis?.diagnostics ?? [],
    };
  }

  async function requestAiInsights() {
    const request = buildAiInsightsRequest();

    if (!request) {
      throw new Error("Selectionnez une route avant de generer les suggestions IA.");
    }

    const response = await fetch("/api/ai/network-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const payload = (await response.json()) as Partial<AiSuggestionPayload> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation IA indisponible.");
      }

    return {
      summary: payload.summary ?? "",
      suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
    };
  }

  async function generateAiInsights() {
    if (!selectedRoute) {
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const payload = await requestAiInsights();
      setAiSummary(payload.summary);
      setAiSuggestions(payload.suggestions);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Generation IA indisponible.");
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleSaveSimulationReport() {
    if (!selectedLink) {
      return;
    }

    setIsSavingSimulation(true);
    setAiError(null);

    let reportAiSummary = aiSummary;
    let reportAiSuggestions = aiSuggestions;
    let reportAiError = aiError;

    try {
      if (selectedRoute && (!reportAiSummary || reportAiSuggestions.length === 0)) {
        setIsGeneratingAi(true);

        try {
          const payload = await requestAiInsights();
          reportAiSummary = payload.summary;
          reportAiSuggestions = payload.suggestions;
          reportAiError = null;
          setAiSummary(payload.summary);
          setAiSuggestions(payload.suggestions);
        } catch (error) {
          reportAiError = error instanceof Error ? error.message : "Generation IA indisponible.";
          setAiError(reportAiError);
        } finally {
          setIsGeneratingAi(false);
        }
      }

      await exportSimulationPdf({
        selectedLink,
        sites,
        startSite: routeStartSite,
        endSite: routeEndSite,
        viaSites: effectiveViaSiteIds
          .map((siteId) => siteById.get(siteId))
          .filter((site): site is Site => Boolean(site)),
        system,
        heightA,
        heightB,
        selectedRoute,
        routeAlternatives,
        routePortions,
        activePortionIndex: normalizedActivePortionIndex,
        roadRoutes,
        markers: markerDetails,
        analysis,
        plannerSuggestions,
        aiSummary: reportAiSummary,
        aiSuggestions: reportAiSuggestions,
        aiError: reportAiError,
      });

      const formData = new FormData();
      formData.set("linkId", selectedLink.id);
      await saveSimulationAction(formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export PDF impossible.";
      setAiError(message);
      window.alert(message);
    } finally {
      setIsSavingSimulation(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Simulation de Liaison</h1>
          <p className="text-muted-foreground">
            Relief reel, visibilite directe, Fresnel, orientation et planification radio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-border bg-card" asChild>
            <Link href="/dashboard/sites">
              <Plus className="mr-2 h-4 w-4" /> Nouveau Site
            </Link>
          </Button>
          <Button variant="outline" className="border-border bg-card" asChild>
            <Link href="/dashboard/links/export">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Link>
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Liaison
          </Button>
          {selectedLink && (
            <Button
              type="button"
              className="bg-primary text-primary-foreground"
              onClick={handleSaveSimulationReport}
              disabled={isSavingSimulation}
            >
              {isSavingSimulation ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSavingSimulation ? "Generation PDF..." : "Enregistrer Simulation"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <div className="glass space-y-5 rounded-lg border border-border p-6">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Configuration active</h3>
            </div>

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une liaison..."
              className="border-border bg-background"
            />

            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {filteredLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    setSelectedLinkId(link.id);
                    setRouteStartId(link.siteAId);
                    setRouteEndId(link.siteBId);
                    setViaSiteIds([]);
                    setSelectedRouteId("");
                    setActivePortionIndex(0);
                    const nextSiteA = siteById.get(link.siteAId);
                    const nextSiteB = siteById.get(link.siteBId);
                    if (nextSiteA) {
                      setHeightA(nextSiteA.towerHeightM || 30);
                    }
                    if (nextSiteB) {
                      setHeightB(nextSiteB.towerHeightM || 30);
                    }
                  }}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    selectedLink?.id === link.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <p className="text-sm font-bold">
                    {link.siteAName} - {link.siteBName}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{link.id}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span>{link.frequencyGhz} GHz</span>
                    <span>{statusLabels[link.status]}</span>
                  </div>
                </button>
              ))}

              {filteredLinks.length === 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Aucune liaison ne correspond a la recherche.
                </div>
              )}
            </div>

            {selectedLink && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingLink(selectedLink)}>
                  <Edit className="mr-2 h-3 w-3" /> Modifier
                </Button>
                <form action={deleteLinkAction}>
                  <input type="hidden" name="id" value={selectedLink.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="mr-2 h-3 w-3" /> Supprimer
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Routage reseau</h3>
            </div>

            <div className="space-y-3">
              <Label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Depart</span>
                <select
                  value={routeStartId}
                  onChange={(event) => {
                    const nextStartId = event.target.value;
                    setRouteStartId(nextStartId);
                    setViaSiteIds((current) =>
                      current.filter((siteId) => siteId !== nextStartId && siteId !== routeEndId),
                    );
                    setSelectedRouteId("");
                    setActivePortionIndex(0);
                    const site = siteById.get(nextStartId);
                    if (site) {
                      setHeightA(site.towerHeightM || 30);
                    }
                  }}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </Label>

              <Label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Arrivee</span>
                <select
                  value={routeEndId}
                  onChange={(event) => {
                    const nextEndId = event.target.value;
                    setRouteEndId(nextEndId);
                    setViaSiteIds((current) =>
                      current.filter((siteId) => siteId !== routeStartId && siteId !== nextEndId),
                    );
                    setSelectedRouteId("");
                    setActivePortionIndex(0);
                    const site = siteById.get(nextEndId);
                    if (site) {
                      setHeightB(site.towerHeightM || 30);
                    }
                  }}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </Label>
            </div>

            <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Passage via
              </p>
              <div className="flex gap-2">
                <select
                  value={viaSiteIdInput}
                  onChange={(event) => setViaSiteIdInput(event.target.value)}
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs"
                >
                  <option value="">Choisir un site intermediaire</option>
                  {availableViaCandidates.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" variant="outline" onClick={addViaSite}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>

              {effectiveViaSiteIds.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {effectiveViaSiteIds.map((siteId, index) => (
                    <div
                      key={siteId}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5 text-xs"
                    >
                      <span>
                        Etape {index + 1}: {siteById.get(siteId)?.name ?? siteId}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeViaSite(siteId)}
                        className="text-muted-foreground transition-colors hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ControlledNumber
                label="Portions"
                value={portionCount}
                onChange={(value) => setPortionCount(clampNumber(value, 1, 24))}
              />
              <Label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Portion active</span>
                <select
                  value={String(normalizedActivePortionIndex)}
                  onChange={(event) => setActivePortionIndex(Number(event.target.value))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {routePortions.length === 0 ? (
                    <option value="0">Unique</option>
                  ) : (
                    routePortions.map((portion, index) => (
                      <option key={portion.index} value={index}>
                        P{portion.index} ({portion.distanceKm.toFixed(1)} km)
                      </option>
                    ))
                  )}
                </select>
              </Label>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Alternatives
              </p>
              {isRoutingRoads && (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Calcul des traces routieres en cours...
                </div>
              )}
              {routeAlternatives.length ? (
                routeAlternatives.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => {
                      setSelectedRouteId(route.id);
                      setActivePortionIndex(0);
                    }}
                    className={cn(
                      "w-full rounded-md border p-2.5 text-left text-xs transition-colors",
                      selectedRoute?.id === route.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:bg-muted",
                    )}
                  >
                    <p className="font-semibold">{route.name}</p>
                    <p className="mt-0.5 text-muted-foreground">{route.summary}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Aucune route calculee pour cette combinaison de sites.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Mode radio</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["fh", "vhf"] as SignalSystem[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSystem(value)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    system === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 hover:bg-muted",
                  )}
                >
                  <span className="block text-sm font-bold">{systemLabels[value].title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {systemLabels[value].subtitle}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ControlledNumber
                label="Antenne A (m)"
                value={heightA}
                onChange={setHeightA}
              />
              <ControlledNumber
                label="Antenne B (m)"
                value={heightB}
                onChange={setHeightB}
              />
            </div>

            <Button
              type="button"
              className="mt-4 w-full"
              onClick={runTerrainAnalysis}
              disabled={!terrainTarget || isAnalyzing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isAnalyzing && "animate-spin")} />
              Recalculer relief
            </Button>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-emerald-500/10 p-2">
                <Zap className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-500">
                  {selectedRoute || selectedLink ? linkHealth : "Aucune liaison"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedRoute || selectedLink
                    ? `Marge radio locale: ${fadeMargin.toFixed(1)} dB. Source relief: ${analysis?.terrainSource ?? "en cours"}.`
                    : "Creez une premiere liaison pour calculer le bilan."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Carte terrain et profil d&apos;elevation</h3>
                  <p className="text-xs text-muted-foreground">
                    {routeStartSite && routeEndSite
                      ? `${routeStartSite.name} - ${routeEndSite.name}${effectiveViaSiteIds.length ? ` | via ${effectiveViaSiteIds.length} etape(s)` : ""} | ${formatFrequency(system, selectedLink?.frequencyGhz ?? 15)}`
                      : "Selectionnez une liaison."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activePanel === "details" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePanel("details")}
                >
                  <Info className="mr-2 h-4 w-4" /> Profil
                </Button>
                <Button
                  variant={activePanel === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePanel("map")}
                >
                  <MapPin className="mr-2 h-4 w-4" /> Carte
                </Button>
                <Button
                  variant={activePanel === "terrain3d" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePanel("terrain3d")}
                >
                  <Mountain className="mr-2 h-4 w-4" /> 3D
                </Button>
              </div>
            </div>

            {activePanel === "details" ? (
              <TerrainProfileChart
                analysis={analysis}
                chartReady={chartReady}
                error={analysisError}
                isAnalyzing={isAnalyzing}
              />
            ) : activePanel === "map" ? (
              <NetworkMap
                sites={sites}
                links={initialLinks}
                terrainProfile={analysis?.profile ?? []}
                relayPoint={analysis?.relayPoint}
                routeAlternatives={routeAlternatives}
                selectedRouteId={selectedRoute?.id ?? null}
                routePortions={routePortions}
                roadRoutes={roadRoutes}
                activeRoutePortionIndex={normalizedActivePortionIndex}
                markers={markerDetails}
                onMapRepereAdd={addMarkerFromMap}
                defaultMapType="opentopo"
                className="h-[420px] overflow-hidden rounded-md border border-border"
              />
            ) : (
              <Realistic3DMap
                analysis={analysis}
                sites={sites}
                routeAlternatives={routeAlternatives}
                selectedRouteId={selectedRoute?.id ?? null}
                roadRoutes={roadRoutes}
                markers={markerDetails}
                onMapRepereAdd={addMarkerFromMap}
              />
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-bold">Assistant IA de planification</h3>
                  <p className="text-xs text-muted-foreground">
                    Suggestions NVIDIA basees sur vos mesures actuelles et les alternatives.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={generateAiInsights}
                disabled={!selectedRoute || isGeneratingAi}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isGeneratingAi && "animate-spin")} />
                Generer suggestions IA
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                {aiError && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {aiError}
                  </div>
                )}

                {aiSummary ? (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold">Resume IA</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{aiSummary}</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Lance la generation IA pour obtenir un diagnostic detaille (contexte, mesures, actions, alternative de chemin/station).
                  </div>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {aiSuggestions.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <p className="font-semibold">Contexte courant</p>
                  <p className="mt-1 text-muted-foreground">
                    {selectedRoute
                      ? `${selectedRoute.name} | ${selectedRoute.totalDistanceKm.toFixed(2)} km | RSL min ${selectedRoute.weakestRslDbm.toFixed(1)} dBm`
                      : "Aucun trajet actif"}
                  </p>
                  {analysis && (
                    <p className="mt-1 text-muted-foreground">
                      LOS {analysis.los.clear ? "OK" : "bloquee"} | Fresnel min {analysis.minFresnelClearanceM.toFixed(1)} m | Couverture {analysis.coverage.estimatedPct.toFixed(2)}%
                    </p>
                  )}
                </div>

                {plannerSuggestions.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-xs font-semibold">Pre-analyse locale</p>
                    {plannerSuggestions.slice(0, 4).map((suggestion) => (
                      <p key={suggestion} className="text-xs leading-5 text-muted-foreground">
                        {suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              label="Visibilite"
              value={analysis ? (analysis.los.clear ? "LOS OK" : "Bloquee") : "-"}
              suffix=""
              detail={analysis ? `${analysis.los.clearanceMin.toFixed(1)} m min` : "Analyse terrain"}
              tone={analysis?.los.clear ? "good" : analysis ? "critical" : "neutral"}
            />
            <MetricCard
              label="Fresnel 60%"
              value={analysis ? analysis.minFresnelClearanceM.toFixed(1) : "-"}
              suffix="m"
              detail="Marge minimale"
              tone={
                !analysis
                  ? "neutral"
                  : analysis.minFresnelClearanceM >= 0
                    ? "good"
                    : "warning"
              }
            />
            <MetricCard
              label="Azimut A-B"
              value={analysis ? analysis.azimuthDeg.toFixed(1) : "-"}
              suffix="deg"
              detail={analysis ? `Retour ${analysis.reverseAzimuthDeg.toFixed(1)} deg` : "Orientation"}
              tone="neutral"
            />
            <MetricCard
              label="Couverture"
              value={analysis ? analysis.coverage.estimatedPct.toFixed(2) : "-"}
              suffix="%"
              detail={analysis ? `Objectif ${analysis.coverage.targetPct}%` : "FH/VHF"}
              tone={analysis ? coverageTone(analysis.coverage.status) : "neutral"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-6 xl:col-span-3">
              <div className="mb-5 flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold">Analyse du trajet</h3>
              </div>

              {selectedRoute || (routeStartSite && routeEndSite) ? (
                <div className="space-y-4">
                  {isAnalyzing && (
                    <InfoRow
                      tone="neutral"
                      title="Analyse en cours"
                      description="Lecture du relief et recalcul du trajet radio."
                    />
                  )}

                  {analysisError && (
                    <InfoRow
                      tone="warning"
                      title="Analyse indisponible"
                      description={analysisError}
                    />
                  )}

                  {analysis?.diagnostics.map((item) => (
                    <InfoRow
                      key={item}
                      tone={diagnosticTone(item)}
                      title={diagnosticTitle(item)}
                      description={item}
                    />
                  ))}

                  {analysis && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {analysis.coverage.actions.map((action) => (
                        <div
                          key={action}
                          className="rounded-md border border-border bg-muted/40 p-4 text-sm"
                        >
                          <div className="mb-2 flex items-center gap-2 font-medium">
                            <Target className="h-4 w-4 text-primary" />
                            Action concrete
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">{action}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {routePortions.length > 0 && (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Portions de la liaison
                      </p>
                      <div className="space-y-2">
                        {routePortions.map((portion, index) => (
                          <button
                            key={portion.index}
                            type="button"
                            onClick={() => setActivePortionIndex(index)}
                            className={cn(
                              "w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                              index === normalizedActivePortionIndex
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card hover:bg-muted",
                            )}
                          >
                            <p className="font-semibold">
                              Portion {portion.index} | {portion.distanceKm.toFixed(2)} km
                            </p>
                            <p className="mt-0.5 text-muted-foreground">
                              Dispo {portion.estimatedAvailabilityPct.toFixed(3)}% | RSL min{" "}
                              {portion.weakestRslDbm.toFixed(1)} dBm
                            </p>
                            <p className="mt-1 text-muted-foreground">{portion.recommendation}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Aucune liaison locale n&apos;est encore disponible.
                </div>
              )}
            </div>

            <div className="space-y-6 xl:col-span-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-5 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Hauteurs et relais</h3>
                </div>

                {analysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <SmallStat
                        label="Site A"
                        value={`${analysis.antennaRec.siteAHeightM} m`}
                        hint={`+${analysis.antennaRec.addedAHeightM} m`}
                      />
                      <SmallStat
                        label="Site B"
                        value={`${analysis.antennaRec.siteBHeightM} m`}
                        hint={`+${analysis.antennaRec.addedBHeightM} m`}
                      />
                    </div>

                    {analysis.relayPoint ? (
                      <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-300">
                          <Route className="h-4 w-4" />
                          Point relais
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {formatCoordinate(analysis.relayPoint.latitude)},{" "}
                          {formatCoordinate(analysis.relayPoint.longitude)} |{" "}
                          {analysis.relayPoint.relayHeightM} m
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          A: {analysis.relayPoint.distanceFromA} km, B:{" "}
                          {analysis.relayPoint.distanceFromB} km.{" "}
                          {analysis.relayPoint.assured ? "LOS assuree." : "Validation terrain requise."}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
                        Aucun relais obligatoire pour le profil courant.
                      </div>
                    )}

                    {analysis.planningSuggestion && (
                      <div className="rounded-md border border-border bg-muted/40 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                          <MapPin className="h-4 w-4 text-primary" />
                          Site candidat
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {formatCoordinate(analysis.planningSuggestion.latitude)},{" "}
                          {formatCoordinate(analysis.planningSuggestion.longitude)} |{" "}
                          {analysis.planningSuggestion.recommendedHeightM} m
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {analysis.planningSuggestion.reason}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                    Resultats disponibles apres analyse.
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-5 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="font-bold">Zones d&apos;ombre</h3>
                </div>
                {analysis?.obstacles.length ? (
                  <div className="space-y-3">
                    {analysis.obstacles.map((obstacle) => (
                      <ObstacleRow key={`${obstacle.type}-${obstacle.distanceKm}`} obstacle={obstacle} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/40 p-5 text-sm text-muted-foreground">
                    {analysis
                      ? "Aucun obstacle critique detecte sur le profil courant."
                      : "L'analyse FH/VHF signalera relief, vegetation et eau ici."}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Reperes terrain</h3>
                </div>

                <div className="space-y-3">
                  <Label className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Nouveau repere</span>
                    <select
                      value={effectiveMarkerSiteId}
                      onChange={(event) => setMarkerSiteId(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    >
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </Label>

                  <Input
                    value={markerNote}
                    onChange={(event) => setMarkerNote(event.target.value)}
                    placeholder="Note du repere (optionnel)"
                    className="border-border bg-background"
                  />

                  <Button type="button" variant="outline" className="w-full" onClick={addMarker}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter repere
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Astuce: clique directement sur la carte pour ajouter un repere libre (comme Google Maps).
                  </p>

                  {markerDetails.length > 0 && (
                    <div className="space-y-2">
                      {markerDetails.map((marker) => (
                        <div
                          key={marker.id}
                          className="rounded-md border border-border bg-muted/40 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">{marker.label}</p>
                            <button
                              type="button"
                              onClick={() => removeMarker(marker.id)}
                              className="text-muted-foreground transition-colors hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatCoordinate(marker.latitude)}, {formatCoordinate(marker.longitude)}
                          </p>
                          {marker.note && (
                            <p className="mt-1 text-xs text-muted-foreground">{marker.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Les suggestions IA sont affichees dans le bloc en haut pour rester visibles pendant la lecture carte/profil.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(isCreating || editingLink) && (
        <LinkFormDialog
          link={editingLink}
          sites={sites}
          equipment={equipment}
          onClose={() => {
            setIsCreating(false);
            setEditingLink(null);
          }}
        />
      )}
    </div>
  );
}

function TerrainProfileChart({
  analysis,
  chartReady,
  error,
  isAnalyzing,
}: {
  analysis: FullAnalysis | null;
  chartReady: boolean;
  error: string | null;
  isAnalyzing: boolean;
}) {
  const data = useMemo(
    () =>
      analysis?.fresnelProfile.map((point) => ({
        distance: Number(point.distance.toFixed(2)),
        terrain: point.terrain,
        losHeight: point.losHeight,
        fresnelLower: point.fresnelLower,
        fresnelUpper: point.fresnelUpper,
      })) ?? [],
    [analysis],
  );
  const worstPoint = useMemo(() => {
    if (!analysis || analysis.fresnelProfile.length === 0) {
      return null;
    }

    return analysis.fresnelProfile.reduce((worst, point) =>
      point.clearance < worst.clearance ? point : worst,
    );
  }, [analysis]);

  if (error) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!chartReady || (!analysis && isAnalyzing)) {
    return <div className="h-[420px] animate-pulse rounded-md bg-muted/50" />;
  }

  if (!analysis) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        Selectionnez une liaison pour calculer le relief.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 28, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="terrainFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="fresnelFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.16} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="distance"
            type="number"
            unit=" km"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            unit=" m"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toFixed(1)} m`,
              chartNames[String(name)] ?? String(name),
            ]}
            labelFormatter={(label) => `${Number(label).toFixed(2)} km`}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Area
            type="monotone"
            dataKey="fresnelUpper"
            stroke="none"
            fill="url(#fresnelFill)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="terrain"
            stroke="#d97706"
            strokeWidth={2}
            fill="url(#terrainFill)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="losHeight"
            stroke="#e30613"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="fresnelLower"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="6 6"
            dot={false}
            isAnimationActive={false}
          />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3 text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Lecture du profil:</span> orange = relief,
            rouge = ligne de visee, bleu pointille = limite Fresnel 60%, bleu clair = enveloppe
            Fresnel.
          </p>
          <p className="mt-1">
            Regle terrain: le relief doit rester sous la courbe Fresnel 60% pour garder une bonne
            marge de propagation.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-3 text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Point le plus critique:</span>{" "}
            {worstPoint
              ? `${worstPoint.distance.toFixed(2)} km | clearance ${worstPoint.clearance.toFixed(1)} m`
              : "-"}
          </p>
          <p className="mt-1">
            {analysis.minFresnelClearanceM >= 0
              ? "Profil globalement degage: la zone Fresnel minimale reste positive."
              : "Profil contraint: la clearance Fresnel passe sous zero, il faut corriger (hauteur, route, ou relais)."}
          </p>
        </div>
      </div>
    </div>
  );
}

function LinkFormDialog({
  link,
  sites,
  equipment,
  onClose,
}: {
  link: NetworkLink | null;
  sites: Site[];
  equipment: Equipment[];
  onClose: () => void;
}) {
  const isEdit = Boolean(link);
  const action = isEdit ? updateLinkAction : createLinkAction;
  const firstSite = sites[0]?.id ?? "";
  const secondSite = sites[1]?.id ?? firstSite;
  const [siteAId, setSiteAId] = useState(link?.siteAId ?? firstSite);
  const [siteBId, setSiteBId] = useState(link?.siteBId ?? secondSite);
  const [frequencyGhz, setFrequencyGhz] = useState(String(link?.frequencyGhz ?? 15));
  const [txPowerDbm, setTxPowerDbm] = useState(String(link?.txPowerDbm ?? 20));
  const [antennaGainDbi, setAntennaGainDbi] = useState(String(link?.antennaGainDbi ?? 36));
  const [cableLossDb, setCableLossDb] = useState(String(link?.cableLossDb ?? 2));
  const [status, setStatus] = useState<LinkStatus>(link?.status ?? "Active");
  const radio = equipment.find((item) => item.powerDbm !== null);
  const antenna = equipment.find((item) => item.gainDbi !== null);

  function applyEquipmentDefaults() {
    if (radio?.powerDbm !== null && radio?.powerDbm !== undefined) {
      setTxPowerDbm(String(radio.powerDbm));
    }

    if (antenna?.gainDbi !== null && antenna?.gainDbi !== undefined) {
      setAntennaGainDbi(String(antenna.gainDbi));
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit ? "Modifier la liaison" : "Nouvelle liaison"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Le bilan RF sera recalcule et persiste en SQLite.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form action={action} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <input type="hidden" name="id" value={link?.id ?? ""} />
          <SelectField label="Site A" name="siteAId" value={siteAId} onChange={setSiteAId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Site B" name="siteBId" value={siteBId} onChange={setSiteBId}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </SelectField>
          <ControlledField
            label="Frequence (GHz)"
            name="frequencyGhz"
            type="number"
            step="0.1"
            value={frequencyGhz}
            onChange={setFrequencyGhz}
          />
          <ControlledField
            label="Puissance radio (dBm)"
            name="txPowerDbm"
            type="number"
            step="0.1"
            value={txPowerDbm}
            onChange={setTxPowerDbm}
          />
          <ControlledField
            label="Gain antenne (dBi)"
            name="antennaGainDbi"
            type="number"
            step="0.1"
            value={antennaGainDbi}
            onChange={setAntennaGainDbi}
          />
          <ControlledField
            label="Pertes cables (dB)"
            name="cableLossDb"
            type="number"
            step="0.1"
            value={cableLossDb}
            onChange={setCableLossDb}
          />
          <SelectField label="Statut" name="status" value={status} onChange={(value) => setStatus(value as LinkStatus)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4 md:col-span-2">
            <div>
              <p className="text-sm font-medium">Equipement entreprise</p>
              <p className="text-xs text-muted-foreground">
                {radio || antenna
                  ? `${radio ? `${radio.brand} ${radio.model}` : "Radio non definie"} / ${
                      antenna ? `${antenna.brand} ${antenna.model}` : "antenne non definie"
                    }`
                  : "Aucun equipement catalogue disponible."}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={applyEquipmentDefaults}>
              Charger Equipement Entreprise
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{isEdit ? "Enregistrer" : "Creer la liaison"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ControlledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        step="1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="border-border bg-background"
      />
    </label>
  );
}

function ControlledField({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Input
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="border-border bg-background"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Label className="space-y-2">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
      >
        {children}
      </select>
    </Label>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  detail,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  detail: string;
  tone: "good" | "warning" | "critical" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex min-h-10 items-end gap-2">
        <span className="text-2xl font-bold leading-none">{value}</span>
        {suffix && <span className="mb-0.5 text-muted-foreground">{suffix}</span>}
      </div>
      <div
        className={cn(
          "mt-4 flex items-center gap-2 text-xs",
          tone === "good"
            ? "text-emerald-500"
            : tone === "warning"
              ? "text-amber-500"
              : tone === "critical"
                ? "text-rose-500"
                : "text-muted-foreground",
        )}
      >
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            tone === "good"
              ? "bg-emerald-500"
              : tone === "warning"
                ? "bg-amber-500"
                : tone === "critical"
                  ? "bg-rose-500"
                  : "bg-muted-foreground",
          )}
        />
        {detail}
      </div>
    </div>
  );
}

function SmallStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-primary">{hint}</p>
    </div>
  );
}

function InfoRow({
  title,
  description,
  tone,
  action,
}: {
  title: string;
  description: string;
  tone: "good" | "warning" | "critical" | "neutral";
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            tone === "good"
              ? "bg-emerald-500/10 text-emerald-500"
              : tone === "warning"
                ? "bg-amber-500/10 text-amber-500"
                : tone === "critical"
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-primary/10 text-primary",
          )}
        >
          {tone === "good" ? (
            <ShieldCheck className="h-5 w-5" />
          ) : tone === "warning" || tone === "critical" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Info className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ObstacleRow({ obstacle }: { obstacle: TerrainObstacle }) {
  const Icon =
    obstacle.type === "water"
      ? Waves
      : obstacle.type === "vegetation"
        ? Trees
        : obstacle.type === "hill"
          ? Mountain
          : AlertTriangle;

  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Icon
            className={cn(
              "h-4 w-4",
              obstacle.severity === "critical" ? "text-rose-500" : "text-amber-500",
            )}
          />
          {obstacle.type} | {obstacle.distanceKm} km
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            obstacle.severity === "critical"
              ? "bg-rose-500/10 text-rose-500"
              : obstacle.severity === "warning"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary",
          )}
        >
          {obstacle.severity}
        </span>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{obstacle.description}</p>
      <p className="mt-2 text-xs leading-5 text-foreground">{obstacle.solution}</p>
    </div>
  );
}

function buildTerrainRequestFromPoints(
  target: {
    linkId: string;
    latA: number;
    lonA: number;
    latB: number;
    lonB: number;
    frequencyGhz: number;
  },
  system: SignalSystem,
  heightA: number,
  heightB: number,
): TerrainRequest {
  return {
    linkId: target.linkId,
    system,
    latA: target.latA,
    lonA: target.lonA,
    heightA: Math.max(0, Number.isFinite(heightA) ? heightA : 30),
    latB: target.latB,
    lonB: target.lonB,
    heightB: Math.max(0, Number.isFinite(heightB) ? heightB : 30),
    frequencyGhz: system === "vhf" ? 0.15 : Math.max(0.001, target.frequencyGhz),
  };
}

function buildPlannerSuggestions(input: {
  route: RouteOption | undefined;
  portions: ReturnType<typeof splitRouteIntoPortions>;
  markers: PlannerMarker[];
  analysis: FullAnalysis | null;
  system: SignalSystem;
}) {
  const suggestions: string[] = [];

  if (!input.route) {
    suggestions.push("Definir un depart et une arrivee pour activer les suggestions.");
    return suggestions;
  }

  suggestions.push(input.route.summary);

  if (input.route.quality === "critical") {
    suggestions.push("Prioriser une alternative de route ou ajouter un site relais intermediaire.");
  } else if (input.route.quality === "warning") {
    suggestions.push("Verifier orientation des antennes et marge de fading sur les portions les plus faibles.");
  }

  const weakestPortion = input.portions.reduce(
    (worst, portion) =>
      !worst || portion.weakestRslDbm < worst.weakestRslDbm ? portion : worst,
    null as (typeof input.portions)[number] | null,
  );

  if (weakestPortion) {
    suggestions.push(
      `Portion ${weakestPortion.index} est la plus sensible (${weakestPortion.weakestRslDbm.toFixed(1)} dBm).`,
    );
  }

  if (input.markers.length > 0) {
    suggestions.push(
      `${input.markers.length} repere(s) actif(s): utiliser ces points pour valider l'implantation terrain avant travaux.`,
    );
  }

  const hasWaterRisk = Boolean(
    input.analysis?.obstacles.some((obstacle) => obstacle.type === "water"),
  );
  const hasVegetationRisk = Boolean(
    input.analysis?.obstacles.some((obstacle) => obstacle.type === "vegetation"),
  );

  if (hasWaterRisk && input.system === "vhf") {
    suggestions.push("Zone humide detectee: ajouter marge anti-evanouissement et diversite spatiale.");
  }

  if (hasVegetationRisk) {
    suggestions.push("Vegetation dense detectee: prevoir rehausse d'antenne ou degagement du couloir Fresnel.");
  }

  return [...new Set(suggestions)].slice(0, 8);
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function roundNumber(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatFrequency(system: SignalSystem, linkFrequencyGhz: number) {
  return system === "vhf" ? "150 MHz VHF" : `${linkFrequencyGhz} GHz FH`;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function coverageTone(status: FullAnalysis["coverage"]["status"]) {
  return status === "ok" ? "good" : status === "warning" ? "warning" : "critical";
}

function diagnosticTone(item: string): "good" | "warning" | "critical" | "neutral" {
  const normalized = item.toLowerCase();

  if (normalized.includes("blocked") || normalized.includes("critical")) {
    return "critical";
  }

  if (normalized.includes("fallback") || normalized.includes("deficit") || normalized.includes("risk")) {
    return "warning";
  }

  if (normalized.includes("clear") || normalized.includes("ok")) {
    return "good";
  }

  return "neutral";
}

function diagnosticTitle(item: string) {
  const normalized = item.toLowerCase();

  if (normalized.includes("elevation source")) return "Source elevation";
  if (normalized.includes("los")) return "Visibilite directe";
  if (normalized.includes("fresnel")) return "Zone Fresnel";
  if (normalized.includes("azimuth")) return "Orientation";
  if (normalized.includes("antenna")) return "Hauteur antennes";
  if (normalized.includes("relay")) return "Relais";

  return "Diagnostic";
}

function noopSubscribe() {
  return () => {};
}

function clientSnapshot() {
  return true;
}

function serverSnapshot() {
  return false;
}
