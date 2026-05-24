import { getLinks, getReports } from "@/lib/local-db";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [reports, links] = await Promise.all([getReports(), getLinks()]);

  return <ReportsClient initialReports={reports} links={links} />;
}
