import { getEquipment } from "@/lib/local-db";

export async function GET() {
  const equipment = await getEquipment();
  const csv = toCsv([
    ["id", "brand", "model", "category", "frequency_range", "power_dbm", "gain_dbi", "stock", "status"],
    ...equipment.map((item) => [
      item.id,
      item.brand,
      item.model,
      item.category,
      item.frequencyRange ?? "",
      item.powerDbm ?? "",
      item.gainDbi ?? "",
      item.stock,
      item.status,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="camrail-inventaire.csv"',
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
