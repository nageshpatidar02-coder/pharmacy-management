import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { getMongoDatabase } from "@/server/db/mongo";

export const SESSION_COOKIE = "medical_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const now = new Date();

  const database = await getMongoDatabase();
  await database.collection("Session").insertOne({
    _id: new ObjectId(),
    tokenHash: hashToken(token),
    userId: new ObjectId(userId),
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);

  if (!token) {
    return;
  }

  try {
    const database = await getMongoDatabase();
    await database.collection("Session").deleteOne({ tokenHash: hashToken(token) });
  } catch {
    // Ignore stale or missing sessions so logout and invalid-session cleanup remain safe.
  }

}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let session;
  try {
    session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  } catch {
    return null;
  }

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permissionKey: string) {
  const user = await requireUser();
  const isSuperAdmin = user.role.name === "SUPER_ADMIN";
  const hasPermission = user.role.permissions.some(({ permission }) => permission.key === permissionKey);
  if (!isSuperAdmin && !hasPermission) redirect("/forbidden");
  return user;
}
 
export function permissionKeys(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return [];
  if (user.role.name === "SUPER_ADMIN") return ["*"];
  return user.role.permissions.map(({ permission }) => permission.key);
}
