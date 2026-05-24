import { getLinks } from "@/lib/local-db";

export async function GET() {
  const links = await getLinks();
  const csv = toCsv([
    [
      "id",
      "site_a",
      "site_b",
      "frequency_ghz",
      "tx_power_dbm",
      "antenna_gain_dbi",
      "cable_loss_db",
      "distance_km",
      "fspl_db",
      "rsl_dbm",
      "availability_pct",
      "status",
    ],
    ...links.map((link) => [
      link.id,
      link.siteAName,
      link.siteBName,
      link.frequencyGhz,
      link.txPowerDbm,
      link.antennaGainDbi,
      link.cableLossDb,
      link.distanceKm,
      link.fsplDb,
      link.rslDbm,
      link.availabilityPct,
      link.status,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="camrail-liaisons.csv"',
    },
  });
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
