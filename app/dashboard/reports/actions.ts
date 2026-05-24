"use server";

import { revalidatePath } from "next/cache";
import { createReport, deleteReport } from "@/lib/local-db";

export async function createReportAction(formData: FormData) {
  await createReport({
    title: readRequired(formData, "title"),
    reportType: readRequired(formData, "reportType"),
    author: readRequired(formData, "author"),
    linkId: readOptional(formData, "linkId"),
  });

  revalidatePath("/dashboard/reports");
}

export async function deleteReportAction(formData: FormData) {
  const id = readRequired(formData, "id");

  await deleteReport(id);
  revalidatePath("/dashboard/reports");
}

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Champ requis: ${key}`);
  }

  return value.trim();
}

function readOptional(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}
