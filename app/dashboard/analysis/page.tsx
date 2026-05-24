import { getInterferenceOverview, getSetting } from "@/lib/local-db";
import { AnalysisClient } from "./analysis-client";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [overview, lastScanAt] = await Promise.all([
    getInterferenceOverview(),
    getSetting("lastSpectrumScanAt"),
  ]);

  return <AnalysisClient overview={overview} lastScanAt={lastScanAt} />;
}
