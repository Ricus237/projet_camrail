import { getEquipment, getLinks, getSites } from "@/lib/local-db";
import { LinksClient } from "./links-client";

export const dynamic = "force-dynamic";

type LinksPageProps = {
  searchParams?: Promise<{
    focus?: string | string[];
    search?: string | string[];
  }>;
};

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const params = searchParams ? await searchParams : {};
  const [sites, equipment, links] = await Promise.all([
    getSites(),
    getEquipment(),
    getLinks(),
  ]);
  const focusId = typeof params.focus === "string" ? params.focus : undefined;
  const initialQuery = typeof params.search === "string" ? params.search : "";

  return (
    <LinksClient
      sites={sites}
      equipment={equipment}
      initialLinks={links}
      initialFocusId={focusId}
      initialQuery={initialQuery}
    />
  );
}
