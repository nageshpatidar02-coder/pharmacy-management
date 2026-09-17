import { NextResponse } from "next/server";

import { createTemporarySession, isTemporaryAdminCredentials } from "@/server/auth/temporary-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 400 });
    }

    if (body.username.trim() !== "admin" || body.password.length < 1) {
      return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
    }

    if (!isTemporaryAdminCredentials(body.username.trim(), body.password)) {
      return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
    }

    await createTemporarySession();
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("API login failed", {
      message: error instanceof Error ? error.message : "Unknown login error",
    });
    return NextResponse.json({ ok: false, error: "Login service is temporarily unavailable." }, { status: 503 });
  }
}
