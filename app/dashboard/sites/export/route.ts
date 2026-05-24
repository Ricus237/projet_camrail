import { getSites } from "@/lib/local-db";

export async function GET() {
  const sites = await getSites();
  const csv = toCsv([
    ["id", "name", "latitude", "longitude", "tower_height_m", "tower_type", "status", "region"],
    ...sites.map((site) => [
      site.id,
      site.name,
      site.latitude,
      site.longitude,
      site.towerHeightM,
      site.towerType,
      site.status,
      site.region,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="camrail-sites.csv"',
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
