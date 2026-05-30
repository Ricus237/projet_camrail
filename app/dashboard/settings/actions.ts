"use server";

import { revalidatePath } from "next/cache";
import { setSetting, updatePasswordMarker, updateUserProfile } from "@/lib/local-db";

export async function updateProfileAction(formData: FormData) {
  await updateUserProfile({
    name: readRequired(formData, "name"),
    email: readRequired(formData, "email"),
    role: readRequired(formData, "role"),
    location: readRequired(formData, "location"),
  });

  revalidatePath("/dashboard/settings");
}

export async function toggleTwoFactorAction(formData: FormData) {
  await setSetting("twoFactorEnabled", readRequired(formData, "enabled"));
  revalidatePath("/dashboard/settings");
}

export async function updatePasswordAction() {
  await updatePasswordMarker();
  await setSetting("passwordUpdatedAt", new Date().toISOString());
  revalidatePath("/dashboard/settings");
}

export async function saveNotificationsAction(formData: FormData) {
  await setSetting("emailAlertsEnabled", formData.get("emailAlertsEnabled") === "on" ? "true" : "false");
  await setSetting("spectrumAlertsEnabled", formData.get("spectrumAlertsEnabled") === "on" ? "true" : "false");
  revalidatePath("/dashboard/settings");
}

export async function saveSystemPreferencesAction(formData: FormData) {
  await setSetting("defaultRegion", readRequired(formData, "defaultRegion"));
  await setSetting("distanceUnit", readRequired(formData, "distanceUnit"));
  const googleMapsApiKey = formData.get("googleMapsApiKey");
  await setSetting("googleMapsApiKey", typeof googleMapsApiKey === "string" ? googleMapsApiKey.trim() : "");
  revalidatePath("/dashboard/settings");
}

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Champ requis: ${key}`);
  }

  return value.trim();
}
