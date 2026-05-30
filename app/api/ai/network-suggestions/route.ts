import { NextResponse, type NextRequest } from "next/server";
import type { SignalSystem } from "@/lib/terrain";

export const dynamic = "force-dynamic";

type CoverageInput = {
  estimatedPct: number;
  targetPct: number;
  status: "ok" | "warning" | "critical";
};

type RouteInput = {
  id?: string;
  name?: string;
  summary?: string;
  totalDistanceKm?: number;
  weakestRslDbm?: number;
  estimatedAvailabilityPct?: number;
  quality?: "excellent" | "good" | "warning" | "critical";
  sitePath?: string[];
  intermediateSites?: string[];
  viaCount?: number;
};

type PortionInput = {
  index: number;
  distanceKm: number;
  estimatedAvailabilityPct: number;
  weakestRslDbm: number;
  recommendation: string;
};

type MarkerInput = {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  note?: string;
};

type ObstacleInput = {
  type: string;
  severity: string;
  description?: string;
  solution?: string;
};

type SuggestionRequest = {
  system: SignalSystem;
  route?: RouteInput | null;
  alternatives?: RouteInput[];
  activeRoadPath?: {
    source?: "osrm" | "fallback";
    distanceKm?: number;
    durationMin?: number;
  } | null;
  portions?: PortionInput[];
  markers?: MarkerInput[];
  coverage?: CoverageInput | null;
  analysisSnapshot?: {
    distanceKm?: number;
    losClear?: boolean;
    losClearanceMin?: number;
    minFresnelClearanceM?: number;
    azimuthDeg?: number;
    reverseAzimuthDeg?: number;
    terrainSource?: string;
    antennaRec?: {
      siteAHeightM?: number;
      siteBHeightM?: number;
      addedAHeightM?: number;
      addedBHeightM?: number;
      feasible?: boolean;
      reason?: string;
    };
    relayPoint?: {
      latitude?: number;
      longitude?: number;
      relayHeightM?: number;
      assured?: boolean;
      reason?: string;
    } | null;
    planningSuggestion?: {
      latitude?: number;
      longitude?: number;
      recommendedHeightM?: number;
      reason?: string;
    } | null;
  } | null;
  obstacles?: ObstacleInput[];
  diagnostics?: string[];
};

type SuggestionResponse = {
  summary: string;
  suggestions: string[];
  provider: "nvidia";
};

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestionRequest;
    const route = body.route ?? null;

    if (!route) {
      return NextResponse.json({ error: "Aucune route a analyser." }, { status: 400 });
    }

    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY;

    if (!nvidiaKey) {
      return NextResponse.json(
        {
          error:
            "Aucune cle NVIDIA configuree. Ajoute NVIDIA_NIM_API_KEY (ou NVIDIA_API_KEY) pour activer les suggestions IA.",
        },
        { status: 503 },
      );
    }

    try {
      const aiSuggestion = await requestNvidiaSuggestion(body, nvidiaKey);
      return NextResponse.json(aiSuggestion);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `NVIDIA indisponible: ${error.message}`
              : "NVIDIA indisponible.",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur IA interne." },
      { status: 500 },
    );
  }
}

async function requestNvidiaSuggestion(
  input: SuggestionRequest,
  apiKey: string,
) {
  const baseUrl = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-70b-instruct";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const systemPrompt =
    "Tu es un assistant RF senior. Reponds strictement en JSON avec les cles summary (string) et suggestions (array de strings). Chaque suggestion doit inclure: (1) le contexte mesure actuel, (2) les chiffres utilises, (3) l'action d'amelioration ciblee, (4) une verification de decision de chemin/station alternative quand pertinent. Maximum 10 suggestions.";
  const userPrompt = JSON.stringify(
    {
      system: input.system,
      route: input.route,
      alternatives: input.alternatives ?? [],
      activeRoadPath: input.activeRoadPath ?? null,
      portions: input.portions ?? [],
      markers: input.markers ?? [],
      coverage: input.coverage ?? null,
      analysisSnapshot: input.analysisSnapshot ?? null,
      obstacles: input.obstacles ?? [],
      diagnostics: input.diagnostics ?? [],
      expected_language: "fr",
    },
    null,
    2,
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`NVIDIA API returned ${response.status}`);
  }

  const payload = (await response.json()) as NvidiaChatResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("NVIDIA response empty");
  }

  const parsed = parseAssistantJson(content);

  if (!parsed) {
    const fallbackFromModel = parseSuggestionsFromText(content);
    return {
      summary: fallbackFromModel.summary,
      suggestions: fallbackFromModel.suggestions,
      provider: "nvidia",
    } as SuggestionResponse;
  }

  return {
    summary: parsed.summary || "Synthese IA disponible.",
    suggestions: parsed.suggestions.length > 0 ? parsed.suggestions.slice(0, 10) : [],
    provider: "nvidia",
  } as SuggestionResponse;
}

function parseSuggestionsFromText(content: string) {
  const normalized = content.trim();

  if (!normalized) {
    return {
      summary: "Reponse IA recue, mais vide.",
      suggestions: [],
    };
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d\.\)\s]+/, "").trim())
    .filter((line) => line.length > 0);
  const summary = lines[0] ?? normalized.slice(0, 240);
  const suggestions = lines.slice(1, 11);

  return {
    summary,
    suggestions,
  };
}

function parseAssistantJson(content: string): { summary: string; suggestions: string[] } | null {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]) as Partial<{
      summary: unknown;
      suggestions: unknown;
    }>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === "string").map((item) => item.trim())
      : [];

    return { summary, suggestions };
  } catch {
    return null;
  }
}
