"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { recordAudit } from "@/server/services/audit.service";
import { prisma } from "@/server/db/prisma";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";

export type SettingsState = { error?: string; success?: string };

export async function updateSettingsAction(_previousState: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requirePermission(PERMISSIONS.settingsManage);
  const pharmacyId = user.pharmacyId;
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the settings fields and try again." };

  const data: SettingsInput = parsed.data;
  const settings = await prisma.pharmacySettings.upsert({ where: { pharmacyId }, create: { pharmacyId, ...data }, update: data });
  await recordAudit({ action: "settings.updated", entity: "PharmacySettings", entityId: settings.id, userId: user.id });
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/sales", "layout");
  revalidatePath("/purchases", "layout");
  return { success: "Pharmacy settings saved." };
}
