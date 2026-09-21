import { NextResponse } from "next/server";

import { createSession } from "@/server/auth/auth";
import { authenticateUser } from "@/server/services/auth.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ ok: false, error: "Enter your email and password." }, { status: 400 });
    }

    const user = await authenticateUser(body.email.trim(), body.password);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("API login failed", {
      message: error instanceof Error ? error.message : "Unknown login error",
    });
    return NextResponse.json({ ok: false, error: "Database is unavailable. Check DATABASE_URL and restart the development server." }, { status: 503 });
  }
}
