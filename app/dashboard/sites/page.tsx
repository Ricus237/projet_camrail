import { getSites } from "@/lib/local-db";
import { SitesClient } from "./sites-client";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const sites = await getSites();

  return <SitesClient initialSites={sites} />;
}
