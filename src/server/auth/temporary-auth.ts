import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const TEMPORARY_SESSION_COOKIE = "medical_temporary_session";
const TEMPORARY_USERNAME = "admin";
const TEMPORARY_PASSWORD = "Admin@123";
const TEMPORARY_SESSION_HOURS = 8;

function sessionSecret() {
  return process.env.TEMP_AUTH_SECRET ?? "temporary-medical-preview-secret-change-later";
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createToken() {
  const expiresAt = Date.now() + TEMPORARY_SESSION_HOURS * 60 * 60 * 1000;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

function isValidToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(payload));
  const received = Buffer.from(parts[2]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  const expiresAt = Number(parts[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function isTemporaryAdminCredentials(username: string, password: string) {
  return username === TEMPORARY_USERNAME && password === TEMPORARY_PASSWORD;
}

export async function createTemporarySession() {
  const expiresAt = new Date(Date.now() + TEMPORARY_SESSION_HOURS * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set(TEMPORARY_SESSION_COOKIE, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function hasTemporarySession() {
  const cookieStore = await cookies();
  return isValidToken(cookieStore.get(TEMPORARY_SESSION_COOKIE)?.value);
}

export async function clearTemporarySession() {
  (await cookies()).delete(TEMPORARY_SESSION_COOKIE);
}

export const temporaryAdminUser = {
  id: "temporary-admin",
  name: "Admin",
  email: "admin@medical.local",
  status: "ACTIVE" as const,
  role: {
    name: "SUPER_ADMIN" as const,
    permissions: [],
  },
};
