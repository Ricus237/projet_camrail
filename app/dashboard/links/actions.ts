"use server";

import { revalidatePath } from "next/cache";
import {
  createLink,
  deleteLink,
  saveSimulationReport,
  updateLink,
  type LinkStatus,
} from "@/lib/local-db";

const linkStatuses = new Set<LinkStatus>(["Active", "Alert", "Planned", "Maintenance"]);

export async function createLinkAction(formData: FormData) {
  await createLink(readLinkInput(formData));
  revalidateDashboard();
}

export async function updateLinkAction(formData: FormData) {
  const id = readRequired(formData, "id");

  await updateLink(id, readLinkInput(formData));
  revalidateDashboard();
}

export async function deleteLinkAction(formData: FormData) {
  const id = readRequired(formData, "id");

  await deleteLink(id);
  revalidateDashboard();
}

export async function saveSimulationAction(formData: FormData) {
  const linkId = readRequired(formData, "linkId");

  await saveSimulationReport(linkId);
  revalidateDashboard();
}

function readLinkInput(formData: FormData) {
  const status = readRequired(formData, "status") as LinkStatus;

  if (!linkStatuses.has(status)) {
    throw new Error("Statut de liaison invalide");
  }

  return {
    siteAId: readRequired(formData, "siteAId"),
    siteBId: readRequired(formData, "siteBId"),
    frequencyGhz: readNumber(formData, "frequencyGhz"),
    txPowerDbm: readNumber(formData, "txPowerDbm"),
    antennaGainDbi: readNumber(formData, "antennaGainDbi"),
    cableLossDb: readNumber(formData, "cableLossDb"),
    status,
  };
}

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Champ requis: ${key}`);
  }

  return value.trim();
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readRequired(formData, key));

  if (!Number.isFinite(value)) {
    throw new Error(`Nombre invalide: ${key}`);
  }

  return value;
}

function revalidateDashboard() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/analysis");
}
