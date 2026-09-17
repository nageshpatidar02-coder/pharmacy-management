import "server-only";

import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/auth";

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(password, user.passwordHash))) return null;

  return prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
}
