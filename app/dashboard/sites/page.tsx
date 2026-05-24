import { getLinks, getSites } from "@/lib/local-db";
import { SitesClient } from "./sites-client";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const [sites, links] = await Promise.all([getSites(), getLinks()]);

  return <SitesClient initialSites={sites} links={links} />;
}
