import { getDashboardOverview } from "@/lib/local-db";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  return <DashboardClient overview={overview} />;
}
