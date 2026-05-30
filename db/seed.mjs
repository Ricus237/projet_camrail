import { readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "camrail.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");

if (process.argv.includes("--reset") && existsSync(dbPath)) {
  unlinkSync(dbPath);
}

mkdirSync(__dirname, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(schemaPath, "utf8"));

const count = db.prepare("SELECT COUNT(*) AS count FROM sites").get().count;
if (count > 0 && !process.argv.includes("--force")) {
  console.log(`Database already seeded at ${dbPath}`);
  db.close();
  process.exit(0);
}

function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function linkBudget({ distance, frequencyGhz, txPowerDbm, antennaGainDbi, cableLossDb }) {
  const safeDistance = Math.max(distance, 0.001);
  const fsplDb =
    92.45 + 20 * Math.log10(safeDistance) + 20 * Math.log10(frequencyGhz);
  const rslDbm = txPowerDbm + antennaGainDbi * 2 - cableLossDb * 2 - fsplDb;
  return {
    fsplDb: round(fsplDb, 1),
    rslDbm: round(rslDbm, 1),
  };
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const users = [
  ["USR-LOCAL-001", " Tsague", ".tsague@local.camrail", "RF Planning Engineer", "Douala, Cameroun", null],
];

const sites = [
  ["SITE-DLA-001", "Douala Port", 4.0511, 9.7085, 45, "Pylone autostable", "Operational", "Littoral"],
  ["SITE-YAO-002", "Yaounde Mvan", 3.8480, 11.5192, 60, "Pylone haubane", "Operational", "Centre"],
  ["SITE-BAF-003", "Bafoussam Ville", 5.4777, 10.4176, 30, "Roof-top", "Maintenance", "Ouest"],
  ["SITE-GAR-004", "Aeroport Garoua", 9.3328, 13.3915, 40, "Pylone autostable", "Alert", "Nord"],
  ["SITE-KRI-005", "Port Kribi", 2.9376, 9.9077, 55, "Pylone autostable", "Planned", "Sud"],
  ["SITE-BUE-006", "Buea Mile 17", 4.1590, 9.2420, 35, "Pylone haubane", "Operational", "Sud-Ouest"],
];

const equipment = [
  ["EQ-NEC-01", "NEC", "iPASOLINK VR", "Radio ODU/IDU", "6-42 GHz", 27, null, 12, "available"],
  ["EQ-HUA-05", "Huawei", "OptiX RTN 950", "Radio IDU", "6-80 GHz", 24, null, 8, "available"],
  ["EQ-ERI-02", "Ericsson", "MINI-LINK 6352", "E-Band Radio", "70/80 GHz", 18, null, 5, "available"],
  ["ANT-AND-01", "Andrew", "ValuLine 2ft", "Antenne parabolique", null, null, 36, 15, "available"],
  ["ANT-COM-03", "CommScope", "High Performance 4ft", "Antenne parabolique", null, null, 42, 6, "available"],
];

const linkSeeds = [
  ["L-DLA-YAO-01", "SITE-DLA-001", "SITE-YAO-002", 15, 20, 42, 2, "Active", 99.997],
  ["L-BAF-YAO-02", "SITE-BAF-003", "SITE-YAO-002", 11, 23, 42, 2, "Active", 99.995],
  ["L-KRI-DLA-03", "SITE-KRI-005", "SITE-DLA-001", 13, 20, 36, 2, "Planned", 99.992],
  ["L-BUE-DLA-01", "SITE-BUE-006", "SITE-DLA-001", 23, 18, 36, 2, "Active", 99.998],
  ["L-GAR-BAF-04", "SITE-GAR-004", "SITE-BAF-003", 7, 24, 42, 2, "Alert", 99.981],
];

const siteById = new Map(
  sites.map(([id, name, latitude, longitude]) => [id, { id, name, latitude, longitude }]),
);

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, name, email, role, location, password_hash)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertSite = db.prepare(`
  INSERT OR REPLACE INTO sites
    (id, name, latitude, longitude, tower_height_m, tower_type, status, region)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertEquipment = db.prepare(`
  INSERT OR REPLACE INTO equipment
    (id, brand, model, category, frequency_range, power_dbm, gain_dbi, stock, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertLink = db.prepare(`
  INSERT OR REPLACE INTO links
    (id, site_a_id, site_b_id, frequency_ghz, tx_power_dbm, antenna_gain_dbi, cable_loss_db, status, distance_km, fspl_db, rsl_dbm, availability_pct)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSimulation = db.prepare(`
  INSERT OR REPLACE INTO simulations
    (id, link_id, fspl_db, rsl_dbm, fade_margin_db, fresnel_clearance_pct, availability_pct, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReport = db.prepare(`
  INSERT OR REPLACE INTO reports
    (id, title, report_type, file_path, size_label, author, link_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec("BEGIN");
try {
  for (const row of users) insertUser.run(...row);
  for (const row of sites) insertSite.run(...row);
  for (const row of equipment) insertEquipment.run(...row);

  for (const row of linkSeeds) {
    const [id, siteAId, siteBId, frequencyGhz, txPowerDbm, antennaGainDbi, cableLossDb, status, availabilityPct] = row;
    const distance = distanceKm(siteById.get(siteAId), siteById.get(siteBId));
    const budget = linkBudget({ distance, frequencyGhz, txPowerDbm, antennaGainDbi, cableLossDb });

    insertLink.run(
      id,
      siteAId,
      siteBId,
      frequencyGhz,
      txPowerDbm,
      antennaGainDbi,
      cableLossDb,
      status,
      round(distance, 1),
      budget.fsplDb,
      budget.rslDbm,
      availabilityPct,
    );

    insertSimulation.run(
      `SIM-${id}`,
      id,
      budget.fsplDb,
      budget.rslDbm,
      round(Math.max(0, budget.rslDbm + 80), 1),
      status === "Alert" ? 82 : 100,
      availabilityPct,
      status === "Alert" ? "Fresnel clearance below target threshold." : "Initial local planning baseline.",
    );
  }

  insertReport.run("REP-2026-001", "Rapport de bilan Douala-Yaounde", "PDF", null, "1.2 MB", " Tsague", "L-DLA-YAO-01", "2026-05-01T08:00:00.000Z");
  insertReport.run("REP-2026-002", "Analyse interference Littoral", "PDF", null, "2.4 MB", " Tsague", "L-KRI-DLA-03", "2026-04-28T09:30:00.000Z");
  insertReport.run("REP-2026-003", "Inventaire des sites Ouest", "CSV", null, "450 KB", "System", null, "2026-04-15T14:15:00.000Z");

  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

db.close();
console.log(`Seeded local SQLite database at ${dbPath}`);
