import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { calculateDistanceKm, calculateLinkBudget } from "@/lib/rf";

export const localDbPath = path.join(process.cwd(), "db", "camrail.sqlite");

const schemaPath = path.join(process.cwd(), "db", "schema.sql");

export type SiteStatus = "Operational" | "Maintenance" | "Alert" | "Planned";
export type LinkStatus = "Active" | "Alert" | "Planned" | "Maintenance";

export type Site = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  towerHeightM: number;
  towerType: string;
  status: SiteStatus;
  region: string;
};

export type Equipment = {
  id: string;
  brand: string;
  model: string;
  category: string;
  frequencyRange: string | null;
  powerDbm: number | null;
  gainDbi: number | null;
  stock: number;
  status: string;
};

export type NetworkLink = {
  id: string;
  siteAId: string;
  siteAName: string;
  siteBId: string;
  siteBName: string;
  frequencyGhz: number;
  txPowerDbm: number;
  antennaGainDbi: number;
  cableLossDb: number;
  status: LinkStatus;
  distanceKm: number;
  fsplDb: number;
  rslDbm: number;
  availabilityPct: number;
};

export type Report = {
  id: string;
  title: string;
  reportType: string;
  filePath: string | null;
  sizeLabel: string;
  author: string;
  linkId: string | null;
  createdAt: string;
};

export type Simulation = {
  id: string;
  linkId: string;
  fsplDb: number;
  rslDbm: number;
  fadeMarginDb: number;
  fresnelClearancePct: number;
  availabilityPct: number;
  notes: string | null;
  createdAt: string;
};

export type DashboardOverview = {
  totalSites: number;
  activeLinks: number;
  averagePathLossDb: number;
  averageAvailabilityPct: number;
  sites: Site[];
  recentLinks: NetworkLink[];
  availabilityByRegion: Array<{
    region: string;
    availability: number;
  }>;
};

export type SiteInput = {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  towerHeightM: number;
  towerType: string;
  status: SiteStatus;
  region: string;
};

export type EquipmentInput = {
  id?: string;
  brand: string;
  model: string;
  category: string;
  frequencyRange?: string | null;
  powerDbm?: number | null;
  gainDbi?: number | null;
  stock: number;
  status: string;
};

export type LinkInput = {
  id?: string;
  siteAId: string;
  siteBId: string;
  frequencyGhz: number;
  txPowerDbm: number;
  antennaGainDbi: number;
  cableLossDb: number;
  status: LinkStatus;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string | null;
};

export type InterferenceFinding = {
  id: string;
  severity: "critical" | "warning" | "ok";
  title: string;
  description: string;
  linkAId: string;
  linkBId: string | null;
  frequencyGapGhz: number | null;
};

export type InterferenceOverview = {
  criticalCount: number;
  warningCount: number;
  optimizedPct: number;
  findings: InterferenceFinding[];
};

type CountRow = {
  count: number;
};

type AverageRow = {
  average: number | null;
};

function openDatabase() {
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });

  const db = new DatabaseSync(localDbPath);
  db.exec("PRAGMA foreign_keys = ON;");

  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, "utf8"));
  }

  return db;
}

function all<T>(sql: string, params: unknown[] = []) {
  const db = openDatabase();
  try {
    return db.prepare(sql).all(...params).map(toPlainObject) as T[];
  } finally {
    db.close();
  }
}

function get<T>(sql: string, params: unknown[] = []) {
  const db = openDatabase();
  try {
    const row = db.prepare(sql).get(...params);
    return row ? (toPlainObject(row) as T) : undefined;
  } finally {
    db.close();
  }
}

function run(sql: string, params: unknown[] = []) {
  const db = openDatabase();
  try {
    return db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

function toPlainObject(row: unknown) {
  return { ...(row as Record<string, unknown>) };
}

export async function getSites() {
  return all<Site>(`
    SELECT
      id,
      name,
      latitude,
      longitude,
      tower_height_m AS towerHeightM,
      tower_type AS towerType,
      status,
      region
    FROM sites
    ORDER BY name ASC
  `);
}

export async function createSite(input: SiteInput) {
  const id = input.id?.trim() || createSiteId(input.name);

  run(
    `
      INSERT INTO sites
        (id, name, latitude, longitude, tower_height_m, tower_type, status, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.name,
      input.latitude,
      input.longitude,
      input.towerHeightM,
      input.towerType,
      input.status,
      input.region,
    ],
  );

  return id;
}

export async function updateSite(id: string, input: SiteInput) {
  run(
    `
      UPDATE sites
      SET
        name = ?,
        latitude = ?,
        longitude = ?,
        tower_height_m = ?,
        tower_type = ?,
        status = ?,
        region = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.name,
      input.latitude,
      input.longitude,
      input.towerHeightM,
      input.towerType,
      input.status,
      input.region,
      id,
    ],
  );
}

export async function deleteSite(id: string) {
  run("DELETE FROM sites WHERE id = ?", [id]);
}

export async function getEquipment() {
  return all<Equipment>(`
    SELECT
      id,
      brand,
      model,
      category,
      frequency_range AS frequencyRange,
      power_dbm AS powerDbm,
      gain_dbi AS gainDbi,
      stock,
      status
    FROM equipment
    ORDER BY brand ASC, model ASC
  `);
}

export async function createEquipment(input: EquipmentInput) {
  const id = input.id?.trim() || createRecordId("EQ", `${input.brand}-${input.model}`);

  run(
    `
      INSERT INTO equipment
        (id, brand, model, category, frequency_range, power_dbm, gain_dbi, stock, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.brand,
      input.model,
      input.category,
      input.frequencyRange ?? null,
      input.powerDbm ?? null,
      input.gainDbi ?? null,
      input.stock,
      input.status,
    ],
  );

  return id;
}

export async function updateEquipment(id: string, input: EquipmentInput) {
  run(
    `
      UPDATE equipment
      SET
        brand = ?,
        model = ?,
        category = ?,
        frequency_range = ?,
        power_dbm = ?,
        gain_dbi = ?,
        stock = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.brand,
      input.model,
      input.category,
      input.frequencyRange ?? null,
      input.powerDbm ?? null,
      input.gainDbi ?? null,
      input.stock,
      input.status,
      id,
    ],
  );
}

export async function deleteEquipment(id: string) {
  run("DELETE FROM equipment WHERE id = ?", [id]);
}

function createSiteId(name: string) {
  return createRecordId("SITE", name);
}

export async function getLinks(limit?: number) {
  const params = typeof limit === "number" ? [limit] : [];
  const limitClause = typeof limit === "number" ? "LIMIT ?" : "";

  return all<NetworkLink>(
    `
      SELECT
        links.id,
        links.site_a_id AS siteAId,
        site_a.name AS siteAName,
        links.site_b_id AS siteBId,
        site_b.name AS siteBName,
        links.frequency_ghz AS frequencyGhz,
        links.tx_power_dbm AS txPowerDbm,
        links.antenna_gain_dbi AS antennaGainDbi,
        links.cable_loss_db AS cableLossDb,
        links.status,
        links.distance_km AS distanceKm,
        links.fspl_db AS fsplDb,
        links.rsl_dbm AS rslDbm,
        links.availability_pct AS availabilityPct
      FROM links
      INNER JOIN sites AS site_a ON site_a.id = links.site_a_id
      INNER JOIN sites AS site_b ON site_b.id = links.site_b_id
      ORDER BY links.created_at DESC
      ${limitClause}
    `,
    params,
  );
}

export async function getLink(id: string) {
  return get<NetworkLink>(
    `
      SELECT
        links.id,
        links.site_a_id AS siteAId,
        site_a.name AS siteAName,
        links.site_b_id AS siteBId,
        site_b.name AS siteBName,
        links.frequency_ghz AS frequencyGhz,
        links.tx_power_dbm AS txPowerDbm,
        links.antenna_gain_dbi AS antennaGainDbi,
        links.cable_loss_db AS cableLossDb,
        links.status,
        links.distance_km AS distanceKm,
        links.fspl_db AS fsplDb,
        links.rsl_dbm AS rslDbm,
        links.availability_pct AS availabilityPct
      FROM links
      INNER JOIN sites AS site_a ON site_a.id = links.site_a_id
      INNER JOIN sites AS site_b ON site_b.id = links.site_b_id
      WHERE links.id = ?
    `,
    [id],
  );
}

export async function createLink(input: LinkInput) {
  const budget = await buildLinkBudget(input);
  const id = input.id?.trim() || createRecordId("L", `${budget.siteA.name}-${budget.siteB.name}`);

  run(
    `
      INSERT INTO links
        (id, site_a_id, site_b_id, frequency_ghz, tx_power_dbm, antenna_gain_dbi, cable_loss_db, status, distance_km, fspl_db, rsl_dbm, availability_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.siteAId,
      input.siteBId,
      input.frequencyGhz,
      input.txPowerDbm,
      input.antennaGainDbi,
      input.cableLossDb,
      input.status,
      budget.distanceKm,
      budget.fsplDb,
      budget.rslDbm,
      calculateAvailability(input.status, budget.fadeMarginDb),
    ],
  );

  return id;
}

export async function updateLink(id: string, input: LinkInput) {
  const budget = await buildLinkBudget(input);

  run(
    `
      UPDATE links
      SET
        site_a_id = ?,
        site_b_id = ?,
        frequency_ghz = ?,
        tx_power_dbm = ?,
        antenna_gain_dbi = ?,
        cable_loss_db = ?,
        status = ?,
        distance_km = ?,
        fspl_db = ?,
        rsl_dbm = ?,
        availability_pct = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      input.siteAId,
      input.siteBId,
      input.frequencyGhz,
      input.txPowerDbm,
      input.antennaGainDbi,
      input.cableLossDb,
      input.status,
      budget.distanceKm,
      budget.fsplDb,
      budget.rslDbm,
      calculateAvailability(input.status, budget.fadeMarginDb),
      id,
    ],
  );
}

export async function deleteLink(id: string) {
  run("DELETE FROM links WHERE id = ?", [id]);
}

export async function recalculateLinks() {
  const links = await getLinks();

  for (const link of links) {
    await updateLink(link.id, {
      id: link.id,
      siteAId: link.siteAId,
      siteBId: link.siteBId,
      frequencyGhz: link.frequencyGhz,
      txPowerDbm: link.txPowerDbm,
      antennaGainDbi: link.antennaGainDbi,
      cableLossDb: link.cableLossDb,
      status: link.status,
    });
  }
}

export async function saveSimulationReport(linkId: string) {
  const link = await getLink(linkId);

  if (!link) {
    throw new Error("Link not found");
  }

  await createSimulationFromLink(linkId, "Simulation enregistree depuis le dashboard local.");

  return createReport({
    title: `Simulation ${link.siteAName} - ${link.siteBName}`,
    reportType: "SIMULATION",
    author: "CAMRAIL Connect",
    linkId,
  });
}

export async function createSimulationFromLink(linkId: string, notes?: string) {
  const link = await getLink(linkId);

  if (!link) {
    throw new Error("Link not found");
  }

  const id = createRecordId("SIM", link.id);
  const fadeMarginDb = Math.round(Math.max(0, link.rslDbm + 80) * 10) / 10;
  const fresnelClearancePct =
    link.status === "Alert" ? 82 : link.status === "Maintenance" ? 90 : 100;

  run(
    `
      INSERT INTO simulations
        (id, link_id, fspl_db, rsl_dbm, fade_margin_db, fresnel_clearance_pct, availability_pct, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      link.id,
      link.fsplDb,
      link.rslDbm,
      fadeMarginDb,
      fresnelClearancePct,
      link.availabilityPct,
      notes ?? null,
    ],
  );

  return id;
}

export async function getLatestSimulation(linkId: string) {
  return get<Simulation>(
    `
      SELECT
        id,
        link_id AS linkId,
        fspl_db AS fsplDb,
        rsl_dbm AS rslDbm,
        fade_margin_db AS fadeMarginDb,
        fresnel_clearance_pct AS fresnelClearancePct,
        availability_pct AS availabilityPct,
        notes,
        created_at AS createdAt
      FROM simulations
      WHERE link_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [linkId],
  );
}

export async function getReports() {
  return all<Report>(`
    SELECT
      id,
      title,
      report_type AS reportType,
      file_path AS filePath,
      size_label AS sizeLabel,
      author,
      link_id AS linkId,
      created_at AS createdAt
    FROM reports
    ORDER BY created_at DESC
  `);
}

export async function getReport(id: string) {
  return get<Report>(
    `
      SELECT
        id,
        title,
        report_type AS reportType,
        file_path AS filePath,
        size_label AS sizeLabel,
        author,
        link_id AS linkId,
        created_at AS createdAt
      FROM reports
      WHERE id = ?
    `,
    [id],
  );
}

export async function createReport(input: {
  title: string;
  reportType: string;
  author: string;
  linkId?: string | null;
}) {
  const id = createRecordId("REP", input.title);

  run(
    `
      INSERT INTO reports
        (id, title, report_type, file_path, size_label, author, link_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [
      id,
      input.title,
      input.reportType,
      null,
      input.reportType === "CSV" ? "12 KB" : "1.0 MB",
      input.author,
      input.linkId ?? null,
    ],
  );

  return id;
}

export async function deleteReport(id: string) {
  run("DELETE FROM reports WHERE id = ?", [id]);
}

export async function getUserProfile() {
  return get<UserProfile>(`
    SELECT
      id,
      name,
      email,
      role,
      location
    FROM users
    ORDER BY created_at ASC
    LIMIT 1
  `);
}

export async function updateUserProfile(input: {
  name: string;
  email: string;
  role: string;
  location: string;
}) {
  const existing = await getUserProfile();
  const id = existing?.id ?? "USR-LOCAL-001";

  run(
    `
      INSERT INTO users (id, name, email, role, location)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        location = excluded.location,
        updated_at = CURRENT_TIMESTAMP
    `,
    [id, input.name, input.email, input.role, input.location],
  );
}

export async function updatePasswordMarker() {
  const existing = await getUserProfile();
  const id = existing?.id ?? "USR-LOCAL-001";
  const marker = `local-updated-${new Date().toISOString()}`;

  run(
    `
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [marker, id],
  );
}

export async function getSetting(key: string) {
  return get<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [key])
    ?.value;
}

export async function setSetting(key: string, value: string) {
  run(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
    [key, value],
  );
}

export async function getInterferenceOverview(): Promise<InterferenceOverview> {
  const links = await getLinks();
  const findings: InterferenceFinding[] = [];

  for (let i = 0; i < links.length; i += 1) {
    for (let j = i + 1; j < links.length; j += 1) {
      const first = links[i];
      const second = links[j];
      const gap = Math.abs(first.frequencyGhz - second.frequencyGhz);
      const sharesSite =
        first.siteAId === second.siteAId ||
        first.siteAId === second.siteBId ||
        first.siteBId === second.siteAId ||
        first.siteBId === second.siteBId;

      if (gap <= 0.25 || (gap <= 1 && sharesSite)) {
        const severity = gap <= 0.25 ? "critical" : "warning";

        findings.push({
          id: `${first.id}-${second.id}`,
          severity,
          title: severity === "critical" ? "Conflit co-canal probable" : "Canaux proches",
          description: `${first.id} et ${second.id} sont séparées de ${gap.toFixed(2)} GHz${sharesSite ? " et partagent un site." : "."}`,
          linkAId: first.id,
          linkBId: second.id,
          frequencyGapGhz: Math.round(gap * 100) / 100,
        });
      }
    }

    if (links[i].availabilityPct < 99.99) {
      findings.push({
        id: `${links[i].id}-availability`,
        severity: "warning",
        title: "Disponibilité sous objectif",
        description: `${links[i].id} affiche ${links[i].availabilityPct.toFixed(3)}% de disponibilité.`,
        linkAId: links[i].id,
        linkBId: null,
        frequencyGapGhz: null,
      });
    }
  }

  const criticalCount = findings.filter((item) => item.severity === "critical").length;
  const warningCount = findings.filter((item) => item.severity === "warning").length;
  const optimizedPct =
    links.length === 0
      ? 100
      : Math.max(0, Math.round(100 - ((criticalCount * 2 + warningCount) / links.length) * 10));

  return {
    criticalCount,
    warningCount,
    optimizedPct,
    findings:
      findings.length > 0
        ? findings
        : [
            {
              id: "clear-spectrum",
              severity: "ok",
              title: "Aucun conflit détecté",
              description: "Les liaisons locales ne présentent pas de conflit de fréquence immédiat.",
              linkAId: "",
              linkBId: null,
              frequencyGapGhz: null,
            },
          ],
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const totalSites = get<CountRow>("SELECT COUNT(*) AS count FROM sites")?.count ?? 0;
  const activeLinks =
    get<CountRow>("SELECT COUNT(*) AS count FROM links WHERE status = ?", ["Active"])
      ?.count ?? 0;
  const averagePathLossDb =
    get<AverageRow>("SELECT AVG(fspl_db) AS average FROM links")?.average ?? 0;
  const averageAvailabilityPct =
    get<AverageRow>("SELECT AVG(availability_pct) AS average FROM links")?.average ??
    0;

  const availabilityByRegion = all<{ region: string; availability: number }>(`
    SELECT
      sites.region AS region,
      ROUND(AVG(links.availability_pct), 3) AS availability
    FROM links
    INNER JOIN sites ON sites.id = links.site_a_id
    GROUP BY sites.region
    ORDER BY sites.region ASC
  `);

  return {
    totalSites,
    activeLinks,
    averagePathLossDb: Math.round(averagePathLossDb * 10) / 10,
    averageAvailabilityPct: Math.round(averageAvailabilityPct * 1000) / 1000,
    sites: await getSites(),
    recentLinks: await getLinks(8),
    availabilityByRegion,
  };
}

async function buildLinkBudget(input: LinkInput) {
  if (input.siteAId === input.siteBId) {
    throw new Error("A link requires two different sites");
  }

  const siteA = getSiteById(input.siteAId);
  const siteB = getSiteById(input.siteBId);

  if (!siteA || !siteB) {
    throw new Error("Link site not found");
  }

  const distanceKm = calculateDistanceKm(siteA, siteB);
  const budget = calculateLinkBudget({
    distanceKm,
    frequencyGhz: input.frequencyGhz,
    txPowerDbm: input.txPowerDbm,
    antennaGainDbi: input.antennaGainDbi,
    cableLossDb: input.cableLossDb,
  });

  return {
    siteA,
    siteB,
    distanceKm,
    ...budget,
  };
}

function getSiteById(id: string) {
  return get<Site>(
    `
      SELECT
        id,
        name,
        latitude,
        longitude,
        tower_height_m AS towerHeightM,
        tower_type AS towerType,
        status,
        region
      FROM sites
      WHERE id = ?
    `,
    [id],
  );
}

function calculateAvailability(status: LinkStatus, fadeMarginDb: number) {
  if (status === "Alert") {
    return 99.981;
  }

  if (status === "Maintenance") {
    return 99.95;
  }

  if (status === "Planned") {
    return 99.992;
  }

  return Math.min(99.999, Math.max(99.9, 99.97 + fadeMarginDb / 1000));
}

function createRecordId(prefix: string, name: string) {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18) || prefix;

  return `${prefix}-${slug}-${Date.now().toString(36).toUpperCase()}`;
}
