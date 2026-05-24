"use server";

import { revalidatePath } from "next/cache";
import { createEquipment, deleteEquipment, updateEquipment } from "@/lib/local-db";

export async function createEquipmentAction(formData: FormData) {
  await createEquipment(readEquipmentInput(formData));
  revalidateInventory();
}

export async function updateEquipmentAction(formData: FormData) {
  const id = readRequired(formData, "id");

  await updateEquipment(id, readEquipmentInput(formData));
  revalidateInventory();
}

export async function deleteEquipmentAction(formData: FormData) {
  const id = readRequired(formData, "id");

  await deleteEquipment(id);
  revalidateInventory();
}

function readEquipmentInput(formData: FormData) {
  return {
    brand: readRequired(formData, "brand"),
    model: readRequired(formData, "model"),
    category: readRequired(formData, "category"),
    frequencyRange: readOptional(formData, "frequencyRange"),
    powerDbm: readOptionalNumber(formData, "powerDbm"),
    gainDbi: readOptionalNumber(formData, "gainDbi"),
    stock: Math.max(0, Math.round(readNumber(formData, "stock"))),
    status: readRequired(formData, "status"),
  };
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

function readOptionalNumber(formData: FormData, key: string) {
  const value = readOptional(formData, key);

  if (value === null) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Nombre invalide: ${key}`);
  }

  return number;
}

function readNumber(formData: FormData, key: string) {
  const number = Number(readRequired(formData, key));

  if (!Number.isFinite(number)) {
    throw new Error(`Nombre invalide: ${key}`);
  }

  return number;
}

function revalidateInventory() {
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/links");
}
