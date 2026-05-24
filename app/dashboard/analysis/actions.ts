"use server";

import { revalidatePath } from "next/cache";
import { createReport, setSetting } from "@/lib/local-db";

export async function scanSpectrumAction() {
  await setSetting("lastSpectrumScanAt", new Date().toISOString());
  await createReport({
    title: "Analyse spectrale locale",
    reportType: "SPECTRUM",
    author: "CAMRAIL Connect",
  });

  revalidatePath("/dashboard/analysis");
  revalidatePath("/dashboard/reports");
}
