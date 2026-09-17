"use server";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (user && user.status === "ACTIVE") {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 1000 * 60 * 30) } });
      // Email delivery belongs here. The raw token is never returned to the browser.
    }
  }
  return { sent: true };
}
