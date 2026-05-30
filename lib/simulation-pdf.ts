import type { NetworkLink, Site } from "@/lib/local-db";
import type { RouteOption, RoutePortion } from "@/lib/network-routing";
import type { FullAnalysis, SignalSystem, TerrainObstacle } from "@/lib/terrain";

type PlannerMarkerSnapshot = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  note: string;
  siteId?: string;
  createdAt: string;
};

type RoadRouteSnapshot = {
  id: string;
  routeId: string;
  source: "osrm" | "fallback";
  distanceKm: number;
  durationMin: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
};

type SimulationPdfInput = {
  selectedLink: NetworkLink | null;
  sites: Site[];
  startSite: Site | undefined;
  endSite: Site | undefined;
  viaSites: Site[];
  system: SignalSystem;
  heightA: number;
  heightB: number;
  selectedRoute: RouteOption | undefined;
  routeAlternatives: RouteOption[];
  routePortions: RoutePortion[];
  activePortionIndex: number;
  roadRoutes: RoadRouteSnapshot[];
  markers: PlannerMarkerSnapshot[];
  analysis: FullAnalysis | null;
  plannerSuggestions: string[];
  aiSummary: string | null;
  aiSuggestions: string[];
  aiError: string | null;
};

type PdfDoc = import("jspdf").jsPDF;

type SectionTone = "primary" | "dark" | "warning" | "success" | "muted";

type RoutePathPoint = {
  latitude: number;
  longitude: number;
};

const page = {
  width: 210,
  height: 297,
  margin: 14,
};

const palette = {
  primary: "#e30613",
  primaryDark: "#99000c",
  ink: "#101828",
  muted: "#667085",
  line: "#d0d5dd",
  soft: "#f2f4f7",
  softRed: "#fff1f2",
  amber: "#f59e0b",
  blue: "#0ea5e9",
  green: "#16a34a",
};

const systemLabel: Record<SignalSystem, string> = {
  fh: "FH - faisceau hertzien",
  vhf: "VHF - radiodiffusion",
};

export async function exportSimulationPdf(input: SimulationPdfInput) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const cursor = { y: page.margin };
  const generatedAt = new Date();
  const siteById = new Map(input.sites.map((site) => [site.id, site]));
  const routePath = getReportRoutePath(input, siteById);
  const mapCapture = await buildRouteMapCapture(input, routePath);

  pdf.setProperties({
    title: `Simulation ${buildReportTitle(input)}`,
    subject: "Rapport de simulation radio CAMRAIL Connect",
    author: "CAMRAIL Connect",
    creator: "CAMRAIL Connect",
  });

  addCoverHeader(pdf, cursor, input, generatedAt);
  addMapSection(pdf, cursor, input, mapCapture);
  addKpiStrip(pdf, cursor, input);
  addConfigurationSection(pdf, cursor, input);
  addAiSection(pdf, cursor, input);
  addRouteSection(pdf, cursor, input, siteById);
  addPortionsSection(pdf, cursor, input);
  addRadioAnalysisSection(pdf, cursor, input);
  addHeightsAndRelaySection(pdf, cursor, input);
  addObstaclesSection(pdf, cursor, input.analysis?.obstacles ?? []);
  addMarkersSection(pdf, cursor, input);
  addTerrainProfileSection(pdf, cursor, input);
  addTechnicalAppendix(pdf, cursor, input, routePath);
  addPageNumbers(pdf);

  pdf.save(`${sanitizeFilename(buildReportTitle(input))}-${formatDateForFilename(generatedAt)}.pdf`);
}

function addCoverHeader(
  pdf: PdfDoc,
  cursor: { y: number },
  input: SimulationPdfInput,
  generatedAt: Date,
) {
  pdf.setFillColor(palette.primary);
  pdf.rect(0, 0, page.width, 34, "F");
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("Rapport de simulation radio", page.margin, 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("CAMRAIL Connect - export terrain, routage, mesures et recommandations", page.margin, 25);

  pdf.setFillColor("#ffffff");
  pdf.roundedRect(148, 8, 48, 17, 2, 2, "F");
  pdf.setTextColor(palette.primary);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(systemLabel[input.system], 152, 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(formatDateTime(generatedAt), 152, 21);

  cursor.y = 44;

  const title = buildReportTitle(input);
  pdf.setTextColor(palette.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  addWrappedText(pdf, title, page.margin, cursor.y, page.width - page.margin * 2, 7);

  cursor.y += 13;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(palette.muted);
  const viaText = input.viaSites.length
    ? `Passage impose via ${input.viaSites.map((site) => site.name).join(" -> ")}.`
    : "Aucun site intermediaire impose.";
  addWrappedText(
    pdf,
    `${input.startSite?.name ?? "Depart non defini"} -> ${input.endSite?.name ?? "Arrivee non definie"} | ${formatFrequency(input)} | ${viaText}`,
    page.margin,
    cursor.y,
    page.width - page.margin * 2,
    5,
  );
  cursor.y += 12;
}

function addMapSection(
  pdf: PdfDoc,
  cursor: { y: number },
  input: SimulationPdfInput,
  mapCapture: { dataUrl: string; source: string; warning: string | null },
) {
  addSectionTitle(pdf, cursor, "Capture du trajet", "primary");
  ensureSpace(pdf, cursor, 86);
  pdf.setFillColor("#ffffff");
  pdf.roundedRect(page.margin, cursor.y, page.width - page.margin * 2, 78, 3, 3, "F");
  pdf.setDrawColor(palette.line);
  pdf.roundedRect(page.margin, cursor.y, page.width - page.margin * 2, 78, 3, 3, "S");
  pdf.addImage(mapCapture.dataUrl, "PNG", page.margin + 2, cursor.y + 2, page.width - page.margin * 2 - 4, 64);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(mapCapture.warning ? palette.amber : palette.muted);
  const markerCount = input.markers.length;
  const caption = mapCapture.warning
    ? `${mapCapture.warning} Tous les reperes restent listes dans le rapport.`
    : `${mapCapture.source}. Trace, sites, alternatives principales et ${markerCount} repere(s) integres.`;
  addWrappedText(pdf, caption, page.margin + 4, cursor.y + 71, page.width - page.margin * 2 - 8, 4);
  cursor.y += 86;
}

function addKpiStrip(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  const analysis = input.analysis;
  const route = input.selectedRoute;
  const kpis = [
    {
      label: "Visibilite",
      value: analysis ? (analysis.los.clear ? "LOS OK" : "Bloquee") : "Non calculee",
      detail: analysis ? `${formatNumber(analysis.los.clearanceMin, 1)} m de marge min` : "Analyse terrain absente",
      tone: analysis?.los.clear ? "success" : analysis ? "warning" : "muted",
    },
    {
      label: "Fresnel 60%",
      value: analysis ? `${formatNumber(analysis.minFresnelClearanceM, 1)} m` : "-",
      detail: analysis ? "Marge minimale du profil" : "Profil indisponible",
      tone: analysis && analysis.minFresnelClearanceM >= 0 ? "success" : "warning",
    },
    {
      label: "Route active",
      value: route ? `${formatNumber(route.totalDistanceKm, 1)} km` : "-",
      detail: route ? `RSL min ${formatNumber(route.weakestRslDbm, 1)} dBm` : "Aucune route",
      tone: route?.quality === "critical" ? "warning" : "primary",
    },
    {
      label: "Couverture",
      value: analysis ? `${formatNumber(analysis.coverage.estimatedPct, 2)} %` : "-",
      detail: analysis ? `Objectif ${analysis.coverage.targetPct} %` : "FH/VHF",
      tone: analysis?.coverage.status === "ok" ? "success" : analysis ? "warning" : "muted",
    },
  ] satisfies Array<{ label: string; value: string; detail: string; tone: SectionTone }>;

  ensureSpace(pdf, cursor, 32);
  const gap = 4;
  const width = (page.width - page.margin * 2 - gap * 3) / 4;

  kpis.forEach((kpi, index) => {
    const x = page.margin + index * (width + gap);
    drawMetricCard(pdf, x, cursor.y, width, 25, kpi.label, kpi.value, kpi.detail, kpi.tone);
  });

  cursor.y += 34;
}

function addConfigurationSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Configuration active", "dark");
  const rows = [
    ["Liaison", input.selectedLink?.id ?? "Simulation libre"],
    ["Depart", input.startSite ? `${input.startSite.name} (${formatCoordinatePair(input.startSite)})` : "-"],
    ["Arrivee", input.endSite ? `${input.endSite.name} (${formatCoordinatePair(input.endSite)})` : "-"],
    ["Systeme", systemLabel[input.system]],
    ["Frequence", formatFrequency(input)],
    ["Puissance TX", input.selectedLink ? `${formatNumber(input.selectedLink.txPowerDbm, 1)} dBm` : "-"],
    ["Gain antenne", input.selectedLink ? `${formatNumber(input.selectedLink.antennaGainDbi, 1)} dBi` : "-"],
    ["Pertes cable", input.selectedLink ? `${formatNumber(input.selectedLink.cableLossDb, 1)} dB` : "-"],
    ["Hauteur antenne depart", `${formatNumber(input.heightA, 1)} m`],
    ["Hauteur antenne arrivee", `${formatNumber(input.heightB, 1)} m`],
    ["Portions demandees", String(input.routePortions.length || 1)],
    ["Repere(s)", String(input.markers.length)],
  ];
  drawKeyValueGrid(pdf, cursor, rows);
}

function addAiSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Assistant IA et recommandations", "primary");

  if (input.aiSummary) {
    drawCallout(pdf, cursor, "Resume IA", input.aiSummary, "primary");
  } else if (input.aiError) {
    drawCallout(pdf, cursor, "Resume IA indisponible", input.aiError, "warning");
  } else {
    drawCallout(
      pdf,
      cursor,
      "Resume IA",
      "Aucune synthese IA n'a ete retournee pour cette simulation. Les recommandations locales restent incluses ci-dessous.",
      "muted",
    );
  }

  const combinedSuggestions = uniqueStrings([...input.aiSuggestions, ...input.plannerSuggestions]);
  if (combinedSuggestions.length) {
    addBulletList(pdf, cursor, "Actions et ameliorations proposees", combinedSuggestions);
  }

  if (input.analysis?.coverage.actions.length) {
    addBulletList(pdf, cursor, "Actions couverture FH/VHF", input.analysis.coverage.actions);
  }
}

function addRouteSection(
  pdf: PdfDoc,
  cursor: { y: number },
  input: SimulationPdfInput,
  siteById: Map<string, Site>,
) {
  addSectionTitle(pdf, cursor, "Routage reseau et alternatives", "dark");

  if (!input.selectedRoute) {
    drawCallout(pdf, cursor, "Aucune route active", "Le systeme n'a pas de route selectionnee pour cette simulation.", "muted");
    return;
  }

  drawCallout(pdf, cursor, input.selectedRoute.name, input.selectedRoute.summary, "primary");

  const rows = input.routeAlternatives.map((route) => [
    route.name,
    route.sitePath.map((siteId) => siteById.get(siteId)?.name ?? siteId).join(" -> "),
    `${formatNumber(route.totalDistanceKm, 2)} km`,
    `${formatNumber(route.weakestRslDbm, 1)} dBm`,
    `${formatNumber(route.estimatedAvailabilityPct, 3)} %`,
    route.quality,
  ]);

  drawTable(pdf, cursor, {
    headers: ["Option", "Chemin", "Distance", "RSL min", "Dispo", "Qualite"],
    rows,
    widths: [28, 58, 24, 24, 25, 23],
  });

  const selectedRoadRoutes = input.selectedRoute
    ? input.roadRoutes.filter((roadRoute) => roadRoute.routeId === input.selectedRoute?.id)
    : [];

  if (selectedRoadRoutes.length) {
    const roadRows = selectedRoadRoutes.map((roadRoute) => [
      roadRoute.id,
      roadRoute.source === "osrm" ? "Routage routier OSRM" : "Trace directe secours",
      `${formatNumber(roadRoute.distanceKm, 2)} km`,
      roadRoute.durationMin > 0 ? `${formatNumber(roadRoute.durationMin, 1)} min` : "-",
      `${roadRoute.coordinates.length} point(s)`,
    ]);
    drawTable(pdf, cursor, {
      headers: ["Trace", "Source", "Distance", "Duree", "Points"],
      rows: roadRows,
      widths: [36, 54, 30, 28, 34],
    });
  }
}

function addPortionsSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Portions de la liaison", "dark");

  if (!input.routePortions.length) {
    drawCallout(pdf, cursor, "Portion unique", "Aucune subdivision supplementaire n'a ete demandee.", "muted");
    return;
  }

  const rows = input.routePortions.map((portion, index) => [
    index === input.activePortionIndex ? `P${portion.index} active` : `P${portion.index}`,
    `${formatNumber(portion.fromKm, 2)} -> ${formatNumber(portion.toKm, 2)} km`,
    `${formatNumber(portion.distanceKm, 2)} km`,
    `${formatNumber(portion.weakestRslDbm, 1)} dBm`,
    `${formatNumber(portion.estimatedAvailabilityPct, 3)} %`,
    portion.recommendation,
  ]);

  drawTable(pdf, cursor, {
    headers: ["Portion", "Intervalle", "Distance", "RSL min", "Dispo", "Recommandation"],
    rows,
    widths: [22, 33, 24, 24, 25, 54],
  });
}

function addRadioAnalysisSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Analyse radio, relief et Fresnel", "primary");

  if (!input.analysis) {
    drawCallout(pdf, cursor, "Analyse absente", "Le profil terrain n'etait pas disponible au moment de l'export.", "warning");
    return;
  }

  const analysis = input.analysis;
  const worstPoint = getWorstFresnelPoint(analysis);

  drawKeyValueGrid(pdf, cursor, [
    ["Distance analysee", `${formatNumber(analysis.distanceKm, 3)} km`],
    ["Source elevation", analysis.terrainSource],
    ["LOS", analysis.los.clear ? "Claire" : "Bloquee"],
    ["Marge LOS min", `${formatNumber(analysis.los.clearanceMin, 2)} m`],
    ["Fresnel min", `${formatNumber(analysis.minFresnelClearanceM, 2)} m`],
    ["Azimut A -> B", `${formatNumber(analysis.azimuthDeg, 2)} deg`],
    ["Azimut retour", `${formatNumber(analysis.reverseAzimuthDeg, 2)} deg`],
    ["Couverture estimee", `${formatNumber(analysis.coverage.estimatedPct, 2)} % / objectif ${analysis.coverage.targetPct} %`],
  ]);

  drawCallout(
    pdf,
    cursor,
    "Lecture du profil",
    "Orange = relief mesure/estime. Rouge = ligne de visee antenne a antenne. Bleu pointille = limite Fresnel 60%. Pour une liaison stable, le relief et les obstacles doivent rester sous cette limite avec une marge positive.",
    "muted",
  );

  if (worstPoint) {
    drawCallout(
      pdf,
      cursor,
      "Point le plus critique",
      `${formatNumber(worstPoint.distance, 2)} km: relief ${formatNumber(worstPoint.terrain, 1)} m, ligne de visee ${formatNumber(worstPoint.losHeight, 1)} m, Fresnel 60% ${formatNumber(worstPoint.fresnelLower, 1)} m, clearance ${formatNumber(worstPoint.clearance, 1)} m.`,
      worstPoint.clearance >= 0 ? "success" : "warning",
    );
  }

  if (analysis.diagnostics.length) {
    addBulletList(pdf, cursor, "Diagnostics calcules", analysis.diagnostics);
  }
}

function addHeightsAndRelaySection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Hauteurs, orientation et relais", "dark");

  if (!input.analysis) {
    drawCallout(pdf, cursor, "Aucun calcul de hauteur", "L'analyse terrain doit etre lancee pour obtenir les hauteurs optimales.", "muted");
    return;
  }

  const rec = input.analysis.antennaRec;
  drawKeyValueGrid(pdf, cursor, [
    ["Hauteur optimale depart", `${formatNumber(rec.siteAHeightM, 1)} m (+${formatNumber(rec.addedAHeightM, 1)} m)`],
    ["Hauteur optimale arrivee", `${formatNumber(rec.siteBHeightM, 1)} m (+${formatNumber(rec.addedBHeightM, 1)} m)`],
    ["Faisabilite", rec.feasible ? "Faisable" : "A valider avec relais ou autre chemin"],
    ["Raison", rec.reason],
  ]);

  if (input.analysis.relayPoint) {
    const relay = input.analysis.relayPoint;
    drawCallout(
      pdf,
      cursor,
      "Point relais propose",
      `${formatCoordinatePair(relay)} | elevation ${formatNumber(relay.elevation, 1)} m | pylone ${formatNumber(relay.relayHeightM, 1)} m | A ${formatNumber(relay.distanceFromA, 2)} km / B ${formatNumber(relay.distanceFromB, 2)} km | azimuts ${formatNumber(relay.azimuthFromA, 1)} deg puis ${formatNumber(relay.azimuthToB, 1)} deg. ${relay.reason}`,
      relay.assured ? "success" : "warning",
    );
  } else {
    drawCallout(pdf, cursor, "Relais", "Aucun point relais obligatoire sur le profil courant.", "success");
  }

  if (input.analysis.planningSuggestion) {
    const planning = input.analysis.planningSuggestion;
    drawCallout(
      pdf,
      cursor,
      "Site candidat planification",
      `${formatCoordinatePair(planning)} | elevation ${formatNumber(planning.elevation, 1)} m | hauteur recommandee ${formatNumber(planning.recommendedHeightM, 1)} m. ${planning.reason}`,
      "primary",
    );
  }
}

function addObstaclesSection(pdf: PdfDoc, cursor: { y: number }, obstacles: TerrainObstacle[]) {
  addSectionTitle(pdf, cursor, "Zones d'ombre et obstacles", "warning");

  if (!obstacles.length) {
    drawCallout(pdf, cursor, "Aucun obstacle critique", "Aucun relief, obstacle urbain, vegetation ou eau critique n'a ete detecte sur ce profil.", "success");
    return;
  }

  const rows = obstacles.map((obstacle) => [
    obstacle.type,
    `${formatNumber(obstacle.distanceKm, 2)} km`,
    `${formatNumber(obstacle.elevation, 1)} m`,
    obstacle.severity,
    obstacle.description,
    obstacle.solution,
  ]);

  drawTable(pdf, cursor, {
    headers: ["Type", "Position", "Elev.", "Sev.", "Contexte", "Solution"],
    rows,
    widths: [20, 22, 20, 18, 50, 52],
  });
}

function addMarkersSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Reperes terrain", "primary");

  if (!input.markers.length) {
    drawCallout(pdf, cursor, "Aucun repere", "Aucun point manuel n'a ete ajoute sur la carte.", "muted");
    return;
  }

  const rows = input.markers.map((marker, index) => [
    String(index + 1),
    marker.label,
    formatNumber(marker.latitude, 6),
    formatNumber(marker.longitude, 6),
    marker.note || "-",
    formatDateTime(new Date(marker.createdAt)),
  ]);

  drawTable(pdf, cursor, {
    headers: ["#", "Libelle", "Latitude", "Longitude", "Note", "Ajoute le"],
    rows,
    widths: [9, 35, 25, 25, 58, 30],
  });
}

function addTerrainProfileSection(pdf: PdfDoc, cursor: { y: number }, input: SimulationPdfInput) {
  addSectionTitle(pdf, cursor, "Annexe profil terrain complet", "dark");

  if (!input.analysis?.fresnelProfile.length) {
    drawCallout(pdf, cursor, "Profil non disponible", "Aucun point de profil n'est disponible dans cette simulation.", "muted");
    return;
  }

  const rows = input.analysis.fresnelProfile.map((point) => [
    `${formatNumber(point.distance, 3)} km`,
    `${formatNumber(point.terrain, 1)} m`,
    `${formatNumber(point.losHeight, 1)} m`,
    `${formatNumber(point.fresnelLower, 1)} m`,
    `${formatNumber(point.fresnelUpper, 1)} m`,
    `${formatNumber(point.clearance, 1)} m`,
    point.blocked ? "Oui" : "Non",
  ]);

  drawTable(pdf, cursor, {
    headers: ["Distance", "Relief", "Ligne visee", "Fresnel 60%", "Envelope", "Clearance", "Bloque"],
    rows,
    widths: [24, 24, 28, 28, 26, 26, 26],
    fontSize: 7,
  });
}

function addTechnicalAppendix(
  pdf: PdfDoc,
  cursor: { y: number },
  input: SimulationPdfInput,
  routePath: RoutePathPoint[],
) {
  addSectionTitle(pdf, cursor, "Annexe technique", "dark");
  const roadSummary = input.roadRoutes.map((route) => ({
    id: route.id,
    routeId: route.routeId,
    source: route.source,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    points: route.coordinates.length,
  }));
  const payload = {
    linkId: input.selectedLink?.id ?? null,
    system: input.system,
    heights: { startM: input.heightA, endM: input.heightB },
    selectedRoute: input.selectedRoute
      ? {
          id: input.selectedRoute.id,
          name: input.selectedRoute.name,
          sitePath: input.selectedRoute.sitePath,
          totalDistanceKm: input.selectedRoute.totalDistanceKm,
          weakestRslDbm: input.selectedRoute.weakestRslDbm,
          estimatedAvailabilityPct: input.selectedRoute.estimatedAvailabilityPct,
          quality: input.selectedRoute.quality,
        }
      : null,
    routeAlternatives: input.routeAlternatives.length,
    routePathPointsInMap: routePath.length,
    roadRoutes: roadSummary,
    markerCount: input.markers.length,
    analysis: input.analysis
      ? {
          distanceKm: input.analysis.distanceKm,
          terrainSource: input.analysis.terrainSource,
          losClear: input.analysis.los.clear,
          losClearanceMinM: input.analysis.los.clearanceMin,
          minFresnelClearanceM: input.analysis.minFresnelClearanceM,
          azimuthDeg: input.analysis.azimuthDeg,
          reverseAzimuthDeg: input.analysis.reverseAzimuthDeg,
          coverage: input.analysis.coverage,
          profilePoints: input.analysis.profile.length,
        }
      : null,
  };

  drawCodeBlock(pdf, cursor, JSON.stringify(payload, null, 2));
}

function addSectionTitle(pdf: PdfDoc, cursor: { y: number }, title: string, tone: SectionTone) {
  ensureSpace(pdf, cursor, 15);
  const color = toneColor(tone);
  pdf.setFillColor(color);
  pdf.roundedRect(page.margin, cursor.y, 3, 8, 1.5, 1.5, "F");
  pdf.setTextColor(palette.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(title, page.margin + 7, cursor.y + 6);
  cursor.y += 13;
}

function drawMetricCard(
  pdf: PdfDoc,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  detail: string,
  tone: SectionTone,
) {
  const color = toneColor(tone);
  pdf.setFillColor("#ffffff");
  pdf.roundedRect(x, y, width, height, 3, 3, "F");
  pdf.setDrawColor(color);
  pdf.roundedRect(x, y, width, height, 3, 3, "S");
  pdf.setFillColor(color);
  pdf.roundedRect(x, y, 3, height, 2, 2, "F");

  pdf.setTextColor(palette.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(label, x + 6, y + 6);
  pdf.setTextColor(palette.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  fitText(pdf, value, x + 6, y + 14, width - 9, 11);
  pdf.setTextColor(palette.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  addWrappedText(pdf, detail, x + 6, y + 20, width - 9, 3.4, 1);
}

function drawKeyValueGrid(pdf: PdfDoc, cursor: { y: number }, rows: string[][]) {
  const leftWidth = 48;
  const rightWidth = page.width - page.margin * 2 - leftWidth;
  const rowHeight = 9;

  rows.forEach(([key, value], index) => {
    ensureSpace(pdf, cursor, rowHeight + 2);
    const y = cursor.y;
    pdf.setFillColor(index % 2 === 0 ? "#ffffff" : palette.soft);
    pdf.rect(page.margin, y, page.width - page.margin * 2, rowHeight, "F");
    pdf.setDrawColor("#ffffff");
    pdf.rect(page.margin, y, page.width - page.margin * 2, rowHeight, "S");

    pdf.setTextColor(palette.muted);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    addWrappedText(pdf, key, page.margin + 3, y + 5.7, leftWidth - 5, 3.5, 1);

    pdf.setTextColor(palette.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    addWrappedText(pdf, value, page.margin + leftWidth + 2, y + 5.7, rightWidth - 5, 3.5, 1);
    cursor.y += rowHeight;
  });

  cursor.y += 5;
}

function drawCallout(
  pdf: PdfDoc,
  cursor: { y: number },
  title: string,
  text: string,
  tone: SectionTone,
) {
  const width = page.width - page.margin * 2;
  const lines = wrapText(pdf, text, width - 12, 8);
  const height = Math.max(18, 12 + lines.length * 4.2);
  ensureSpace(pdf, cursor, height + 4);

  pdf.setFillColor(toneBackground(tone));
  pdf.roundedRect(page.margin, cursor.y, width, height, 3, 3, "F");
  pdf.setDrawColor(toneColor(tone));
  pdf.roundedRect(page.margin, cursor.y, width, height, 3, 3, "S");
  pdf.setTextColor(toneColor(tone));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(title, page.margin + 5, cursor.y + 6);
  pdf.setTextColor(palette.ink);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  lines.forEach((line, index) => {
    pdf.text(line, page.margin + 5, cursor.y + 12 + index * 4.2);
  });

  cursor.y += height + 5;
}

function addBulletList(pdf: PdfDoc, cursor: { y: number }, title: string, items: string[]) {
  ensureSpace(pdf, cursor, 12);
  pdf.setTextColor(palette.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(title, page.margin, cursor.y);
  cursor.y += 5;

  items.forEach((item, index) => {
    const prefix = `${index + 1}.`;
    const lines = wrapText(pdf, item, page.width - page.margin * 2 - 9, 8);
    const height = Math.max(6, lines.length * 4.1 + 2);
    ensureSpace(pdf, cursor, height);
    pdf.setTextColor(palette.primary);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(prefix, page.margin, cursor.y + 3.7);
    pdf.setTextColor(palette.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    lines.forEach((line, lineIndex) => {
      pdf.text(line, page.margin + 8, cursor.y + 3.7 + lineIndex * 4.1);
    });
    cursor.y += height;
  });

  cursor.y += 4;
}

function drawTable(
  pdf: PdfDoc,
  cursor: { y: number },
  options: {
    headers: string[];
    rows: string[][];
    widths: number[];
    fontSize?: number;
  },
) {
  const fontSize = options.fontSize ?? 7.5;
  const lineHeight = fontSize * 0.43 + 1.8;
  const tableWidth = options.widths.reduce((sum, width) => sum + width, 0);
  const startX = page.margin;

  const drawHeader = () => {
    ensureSpace(pdf, cursor, 9);
    pdf.setFillColor(palette.ink);
    pdf.rect(startX, cursor.y, tableWidth, 8, "F");
    pdf.setTextColor("#ffffff");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontSize);
    let x = startX;
    options.headers.forEach((header, index) => {
      addWrappedText(pdf, header, x + 2, cursor.y + 5.2, options.widths[index] - 4, 3, 1);
      x += options.widths[index];
    });
    cursor.y += 8;
  };

  drawHeader();

  options.rows.forEach((row, rowIndex) => {
    const cellLines = row.map((cell, cellIndex) =>
      wrapText(pdf, cell, options.widths[cellIndex] - 4, fontSize),
    );
    const maxLines = Math.max(...cellLines.map((lines) => lines.length), 1);
    const rowHeight = Math.max(8, maxLines * lineHeight + 3);

    if (cursor.y + rowHeight > page.height - page.margin) {
      addPage(pdf, cursor);
      drawHeader();
    }

    pdf.setFillColor(rowIndex % 2 === 0 ? "#ffffff" : palette.soft);
    pdf.rect(startX, cursor.y, tableWidth, rowHeight, "F");
    pdf.setDrawColor("#ffffff");
    pdf.rect(startX, cursor.y, tableWidth, rowHeight, "S");
    pdf.setTextColor(palette.ink);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);

    let x = startX;
    cellLines.forEach((lines, cellIndex) => {
      lines.forEach((line, lineIndex) => {
        pdf.text(line, x + 2, cursor.y + 5 + lineIndex * lineHeight);
      });
      x += options.widths[cellIndex];
    });

    cursor.y += rowHeight;
  });

  cursor.y += 6;
}

function drawCodeBlock(pdf: PdfDoc, cursor: { y: number }, code: string) {
  const lines = code.split("\n");
  const width = page.width - page.margin * 2;
  const lineHeight = 3.6;

  lines.forEach((line, index) => {
    const wrapped = wrapText(pdf, line, width - 6, 6.5);
    wrapped.forEach((wrappedLine, wrappedIndex) => {
      ensureSpace(pdf, cursor, lineHeight + (index === 0 && wrappedIndex === 0 ? 8 : 0));
      pdf.setFillColor(index % 2 === 0 ? "#ffffff" : palette.soft);
      pdf.rect(page.margin, cursor.y, width, lineHeight + 1.5, "F");
      pdf.setTextColor(palette.ink);
      pdf.setFont("courier", "normal");
      pdf.setFontSize(6.5);
      pdf.text(wrappedLine, page.margin + 3, cursor.y + 3.3);
      cursor.y += lineHeight;
    });
  });

  cursor.y += 5;
}

async function buildRouteMapCapture(
  input: SimulationPdfInput,
  routePath: RoutePathPoint[],
): Promise<{ dataUrl: string; source: string; warning: string | null }> {
  const googleKey = readGoogleMapsKey();

  if (googleKey && routePath.length > 1) {
    const googleUrl = buildGoogleStaticMapUrl(input, routePath, googleKey);
    const dataUrl = await loadImageAsDataUrl(googleUrl);

    if (dataUrl) {
      return {
        dataUrl,
        source: "Capture Google Maps Static hybride",
        warning: null,
      };
    }
  }

  return {
    dataUrl: buildFallbackRouteMap(input, routePath),
    source: "Capture cartographique schematique",
    warning: googleKey
      ? "La capture Google Maps n'a pas pu etre chargee dans le navigateur."
      : "Cle Google Maps absente: capture schematique generee a la place de l'imagerie Google.",
  };
}

function buildGoogleStaticMapUrl(
  input: SimulationPdfInput,
  routePath: RoutePathPoint[],
  googleKey: string,
) {
  const params = new URLSearchParams({
    size: "640x360",
    scale: "2",
    maptype: "hybrid",
    format: "png",
    key: googleKey,
  });
  const sampledPath = samplePath(routePath, 90);
  params.append("path", `color:0xe30613ff|weight:5|enc:${encodePolyline(sampledPath)}`);

  if (input.startSite) {
    params.append("markers", `color:green|label:D|${formatLatLng(input.startSite)}`);
  }

  if (input.endSite) {
    params.append("markers", `color:blue|label:A|${formatLatLng(input.endSite)}`);
  }

  input.viaSites.forEach((site, index) => {
    const label = markerLabel(index);
    params.append("markers", `color:yellow|label:${label}|${formatLatLng(site)}`);
  });

  input.markers.forEach((marker, index) => {
    const label = markerLabel(index);
    params.append("markers", `color:orange|label:${label}|${formatLatLng(marker)}`);
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

async function loadImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      return null;
    }

    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image map illisible"));
    reader.readAsDataURL(blob);
  });
}

function buildFallbackRouteMap(input: SimulationPdfInput, routePath: RoutePathPoint[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  const points = routePath.length > 1 ? routePath : fallbackPoints(input);
  const bounds = getBounds([...points, ...input.markers]);
  const project = (point: RoutePathPoint) => {
    const padding = 72;
    const lonRange = Math.max(0.000001, bounds.maxLon - bounds.minLon);
    const latRange = Math.max(0.000001, bounds.maxLat - bounds.minLat);
    const x = padding + ((point.longitude - bounds.minLon) / lonRange) * (canvas.width - padding * 2);
    const y = padding + ((bounds.maxLat - point.latitude) / latRange) * (canvas.height - padding * 2);
    return { x, y };
  };

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#eef6ff");
  gradient.addColorStop(1, "#f8fafc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 2;
  for (let x = 90; x < canvas.width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 120, canvas.height);
    ctx.stroke();
  }

  ctx.strokeStyle = "#f0c46a";
  ctx.lineWidth = 10;
  for (let index = 0; index < 7; index += 1) {
    const y = 120 + index * 92;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(320, y - 90, 650, y + 110, canvas.width, y - 30);
    ctx.stroke();
  }

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  for (let index = 0; index < 7; index += 1) {
    const y = 120 + index * 92;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(320, y - 90, 650, y + 110, canvas.width, y - 30);
    ctx.stroke();
  }

  if (points.length > 1) {
    ctx.strokeStyle = "rgba(227, 6, 19, 0.28)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    points.forEach((point, index) => {
      const projected = project(point);
      if (index === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#e30613";
    ctx.lineWidth = 8;
    ctx.beginPath();
    points.forEach((point, index) => {
      const projected = project(point);
      if (index === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    });
    ctx.stroke();
  }

  if (input.startSite) {
    drawMapMarker(ctx, project(input.startSite), "#16a34a", "D", input.startSite.name);
  }

  if (input.endSite) {
    drawMapMarker(ctx, project(input.endSite), "#2563eb", "A", input.endSite.name);
  }

  input.viaSites.forEach((site, index) => {
    drawMapMarker(ctx, project(site), "#f59e0b", markerLabel(index), site.name);
  });

  input.markers.forEach((marker, index) => {
    drawMapMarker(ctx, project(marker), "#fb923c", markerLabel(index), marker.label);
  });

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(28, canvas.height - 68, 620, 42);
  ctx.fillStyle = "#344054";
  ctx.font = "24px Arial";
  ctx.fillText("Capture schematique: renseigner la cle Google Maps pour l'imagerie satellite/hybride.", 46, canvas.height - 42);

  return canvas.toDataURL("image/png");
}

function drawMapMarker(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  color: string,
  label: string,
  text: string,
) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.slice(0, 1), point.x, point.y + 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  const textWidth = Math.min(320, ctx.measureText(text).width + 22);
  ctx.fillRect(point.x + 22, point.y - 23, textWidth, 32);
  ctx.fillStyle = "#101828";
  ctx.font = "20px Arial";
  ctx.fillText(text.slice(0, 32), point.x + 32, point.y - 2);
}

function getReportRoutePath(input: SimulationPdfInput, siteById: Map<string, Site>): RoutePathPoint[] {
  if (input.selectedRoute) {
    const selectedRoad = input.roadRoutes.find((roadRoute) => roadRoute.routeId === input.selectedRoute?.id);

    if (selectedRoad?.coordinates.length && selectedRoad.coordinates.length > 1) {
      return selectedRoad.coordinates;
    }

    const sitePath = input.selectedRoute.sitePath
      .map((siteId) => siteById.get(siteId))
      .filter((site): site is Site => Boolean(site))
      .map((site) => ({ latitude: site.latitude, longitude: site.longitude }));

    if (sitePath.length > 1) {
      return sitePath;
    }
  }

  if (input.analysis?.profile.length && input.analysis.profile.length > 1) {
    return input.analysis.profile.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));
  }

  return fallbackPoints(input);
}

function fallbackPoints(input: SimulationPdfInput) {
  return [input.startSite, input.endSite]
    .filter((site): site is Site => Boolean(site))
    .map((site) => ({ latitude: site.latitude, longitude: site.longitude }));
}

function getBounds(points: RoutePathPoint[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  if (!latitudes.length || !longitudes.length) {
    return { minLat: 3.7, maxLat: 4.2, minLon: 9.4, maxLon: 10.0 };
  }

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const latPadding = Math.max(0.01, (maxLat - minLat) * 0.15);
  const lonPadding = Math.max(0.01, (maxLon - minLon) * 0.15);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLon: minLon - lonPadding,
    maxLon: maxLon + lonPadding,
  };
}

function readGoogleMapsKey() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const value = window.localStorage.getItem("camrail_google_maps_api_key")?.trim() ?? "";
    return value === "googleMapsApiKey" ? "" : value;
  } catch {
    return "";
  }
}

function encodePolyline(points: RoutePathPoint[]) {
  let previousLat = 0;
  let previousLng = 0;
  let encoded = "";

  points.forEach((point) => {
    const lat = Math.round(point.latitude * 1e5);
    const lng = Math.round(point.longitude * 1e5);
    encoded += encodeSignedNumber(lat - previousLat);
    encoded += encodeSignedNumber(lng - previousLng);
    previousLat = lat;
    previousLng = lng;
  });

  return encoded;
}

function encodeSignedNumber(value: number) {
  let shifted = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";

  while (shifted >= 0x20) {
    encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
    shifted >>= 5;
  }

  encoded += String.fromCharCode(shifted + 63);
  return encoded;
}

function samplePath(points: RoutePathPoint[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const result: RoutePathPoint[] = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index * (points.length - 1)) / (maxPoints - 1));
    result.push(points[sourceIndex]);
  }
  return result;
}

function getWorstFresnelPoint(analysis: FullAnalysis) {
  if (!analysis.fresnelProfile.length) {
    return null;
  }

  return analysis.fresnelProfile.reduce((worst, point) =>
    point.clearance < worst.clearance ? point : worst,
  );
}

function ensureSpace(pdf: PdfDoc, cursor: { y: number }, needed: number) {
  if (cursor.y + needed > page.height - page.margin) {
    addPage(pdf, cursor);
  }
}

function addPage(pdf: PdfDoc, cursor: { y: number }) {
  pdf.addPage();
  cursor.y = page.margin;
}

function addPageNumbers(pdf: PdfDoc) {
  const pageCount = pdf.getNumberOfPages();

  for (let index = 1; index <= pageCount; index += 1) {
    pdf.setPage(index);
    pdf.setDrawColor(palette.line);
    pdf.line(page.margin, page.height - 10, page.width - page.margin, page.height - 10);
    pdf.setTextColor(palette.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`CAMRAIL Connect - page ${index}/${pageCount}`, page.margin, page.height - 5);
  }
}

function wrapText(pdf: PdfDoc, text: string, maxWidth: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  const rawLines = String(text).split("\n");
  const lines: string[] = [];

  rawLines.forEach((rawLine) => {
    const split = pdf.splitTextToSize(rawLine || " ", maxWidth) as string[];
    lines.push(...split);
  });

  return lines;
}

function addWrappedText(
  pdf: PdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number,
) {
  const lines = wrapText(pdf, text, maxWidth, pdf.getFontSize()).slice(0, maxLines);
  lines.forEach((line, index) => {
    pdf.text(line, x, y + index * lineHeight);
  });
}

function fitText(
  pdf: PdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
) {
  let size = initialSize;
  pdf.setFontSize(size);

  while (pdf.getTextWidth(text) > maxWidth && size > 6) {
    size -= 0.5;
    pdf.setFontSize(size);
  }

  pdf.text(text, x, y);
}

function toneColor(tone: SectionTone) {
  if (tone === "primary") return palette.primary;
  if (tone === "warning") return palette.amber;
  if (tone === "success") return palette.green;
  if (tone === "muted") return palette.muted;
  return palette.ink;
}

function toneBackground(tone: SectionTone) {
  if (tone === "primary") return palette.softRed;
  if (tone === "warning") return "#fffbeb";
  if (tone === "success") return "#ecfdf3";
  if (tone === "muted") return palette.soft;
  return "#f8fafc";
}

function uniqueStrings(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function buildReportTitle(input: SimulationPdfInput) {
  const start = input.startSite?.name ?? input.selectedLink?.siteAName ?? "Depart";
  const end = input.endSite?.name ?? input.selectedLink?.siteBName ?? "Arrivee";
  return `${start} - ${end}`;
}

function formatFrequency(input: SimulationPdfInput) {
  return input.system === "vhf"
    ? "150 MHz VHF"
    : `${formatNumber(input.selectedLink?.frequencyGhz ?? 15, 3)} GHz FH`;
}

function formatCoordinatePair(point: { latitude: number; longitude: number }) {
  return `${formatNumber(point.latitude, 6)}, ${formatNumber(point.longitude, 6)}`;
}

function formatLatLng(point: { latitude: number; longitude: number }) {
  return `${formatNumber(point.latitude, 6)},${formatNumber(point.longitude, 6)}`;
}

function formatNumber(value: number, decimals: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(decimals);
}

function formatDateTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .toLowerCase();
}

function markerLabel(index: number) {
  const labels = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return labels[index % labels.length];
}
