"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";

import { createSession, hashPassword } from "@/server/auth/auth";
import { prisma, runMongoTransaction } from "@/server/db/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth-reset";

export type ResetPasswordState = { error?: string };

export async function resetPasswordAction(_previousState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid reset request." };
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) return { error: "This reset link is invalid or expired." };

  await runMongoTransaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
    await tx.session.deleteMany({ where: { userId: resetToken.userId } });
  });
  await createSession(resetToken.userId);
  redirect("/");
}
