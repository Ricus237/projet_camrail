import { getLatestSimulation, getLink, getReport } from "@/lib/local-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return new Response("Rapport introuvable", { status: 404 });
  }

  const link = report.linkId ? await getLink(report.linkId) : undefined;
  const simulation = report.linkId ? await getLatestSimulation(report.linkId) : undefined;
  const body = [
    "CAMRAIL Connect",
    "Rapport local",
    "",
    `ID: ${report.id}`,
    `Titre: ${report.title}`,
    `Type: ${report.reportType}`,
    `Auteur: ${report.author}`,
    `Date: ${new Date(report.createdAt).toLocaleString("fr-FR")}`,
    "",
    link
      ? [
          "Liaison",
          `- ${link.siteAName} -> ${link.siteBName}`,
          `- Frequence: ${link.frequencyGhz} GHz`,
          `- Distance: ${link.distanceKm.toFixed(2)} km`,
          `- FSPL: ${link.fsplDb.toFixed(1)} dB`,
          `- RSL: ${link.rslDbm.toFixed(1)} dBm`,
          `- Disponibilite: ${link.availabilityPct.toFixed(3)}%`,
          `- Statut: ${link.status}`,
        ].join("\n")
      : "Ce rapport n'est pas rattache a une liaison precise.",
    "",
    simulation
      ? [
          "Derniere simulation",
          `- ID: ${simulation.id}`,
          `- Marge de fading: ${simulation.fadeMarginDb.toFixed(1)} dB`,
          `- Degagement Fresnel: ${simulation.fresnelClearancePct.toFixed(0)}%`,
          `- Notes: ${simulation.notes ?? "N/A"}`,
        ].join("\n")
      : "Aucune simulation locale supplementaire associee.",
    "",
    "Toutes les donnees ci-dessus proviennent de la base SQLite locale du projet.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.id}.txt"`,
    },
  });
}
