import { NextResponse, type NextRequest } from "next/server";
import { runFullAnalysis, type SignalSystem } from "@/lib/terrain";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      latA: number;
      lonA: number;
      heightA: number;
      latB: number;
      lonB: number;
      heightB: number;
      frequencyGhz: number;
      system: SignalSystem;
    }>;
    const { latA, lonA, heightA, latB, lonB, heightB, frequencyGhz } = body;
    const system = body.system === "vhf" ? "vhf" : "fh";

    if (
      !isFiniteNumber(latA) ||
      !isFiniteNumber(lonA) ||
      !isFiniteNumber(heightA) ||
      !isFiniteNumber(latB) ||
      !isFiniteNumber(lonB) ||
      !isFiniteNumber(heightB) ||
      !isFiniteNumber(frequencyGhz) ||
      !isValidCoordinate(latA, lonA) ||
      !isValidCoordinate(latB, lonB) ||
      heightA < 0 ||
      heightB < 0 ||
      frequencyGhz <= 0
    ) {
      return NextResponse.json({ error: "Parametres terrain invalides." }, { status: 400 });
    }

    const analysis = await runFullAnalysis(
      latA,
      lonA,
      heightA,
      latB,
      lonB,
      heightB,
      frequencyGhz,
      system,
    );

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne." },
      { status: 500 },
    );
  }
}

function isValidCoordinate(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
