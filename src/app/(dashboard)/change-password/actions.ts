"use server";

import { revalidatePath } from "next/cache";

import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";

export type ChangePasswordState = { error?: string; success?: string };

export async function changePasswordAction(_previousState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser();
  if (!("passwordHash" in user)) return { error: "Password changes are unavailable in temporary preview mode." };
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the password fields." };
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) return { error: "Current password is incorrect." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await destroySession();
  await createSession(user.id);
  revalidatePath("/change-password");
  return { success: "Password changed successfully." };
}
