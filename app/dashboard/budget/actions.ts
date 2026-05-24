"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReport, getLink, recalculateLinks } from "@/lib/local-db";

export async function recalculateBudgetAction() {
  await recalculateLinks();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/links");
}

export async function exportBudgetAction(formData: FormData) {
  const linkId = readRequired(formData, "linkId");
  const link = await getLink(linkId);

  if (!link) {
    throw new Error("Liaison introuvable");
  }

  const reportId = await createReport({
    title: `Bilan de liaison ${link.siteAName} - ${link.siteBName}`,
    reportType: "BUDGET",
    author: "CAMRAIL Connect",
    linkId,
  });

  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/reports/${reportId}/download`);
}

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Champ requis: ${key}`);
  }

  return value.trim();
}
