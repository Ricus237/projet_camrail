import { getEquipment } from "@/lib/local-db";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const equipment = await getEquipment();

  return <InventoryClient initialEquipment={equipment} />;
}
