"use server";

import { revalidatePath } from "next/cache";
import { createSite, deleteSite, updateSite, type SiteInput, type SiteStatus } from "@/lib/local-db";

const statuses = new Set<SiteStatus>(["Operational", "Maintenance", "Alert", "Planned"]);

export async function createSiteAction(formData: FormData) {
  await createSite(parseSiteForm(formData));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sites");
}

export async function updateSiteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Site id is required");
  }

  await updateSite(id, parseSiteForm(formData));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sites");
}

export async function deleteSiteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Site id is required");
  }

  await deleteSite(id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sites");
}

function parseSiteForm(formData: FormData): SiteInput {
  const status = String(formData.get("status") ?? "Operational") as SiteStatus;

  if (!statuses.has(status)) {
    throw new Error("Invalid site status");
  }

  return {
    id: optionalString(formData.get("id")),
    name: requiredString(formData.get("name"), "name"),
    latitude: requiredNumber(formData.get("latitude"), "latitude"),
    longitude: requiredNumber(formData.get("longitude"), "longitude"),
    towerHeightM: requiredNumber(formData.get("towerHeightM"), "tower height"),
    towerType: requiredString(formData.get("towerType"), "tower type"),
    status,
    region: requiredString(formData.get("region"), "region"),
  };
}

function requiredString(value: FormDataEntryValue | null, label: string) {
  const result = String(value ?? "").trim();

  if (!result) {
    throw new Error(`${label} is required`);
  }

  return result;
}

function optionalString(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || undefined;
}

function requiredNumber(value: FormDataEntryValue | null, label: string) {
  const result = Number(value);

  if (!Number.isFinite(result)) {
    throw new Error(`${label} must be a number`);
  }

  return result;
}
