import { NextResponse } from "next/server";

import { sanitizeSensitiveError } from "@/lib/errors/sanitize-sensitive";
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
    console.error("API login failed", sanitizeSensitiveError(error));
    return NextResponse.json({ ok: false, error: "Database is unavailable. Check the MongoDB configuration and restart PharmaDesk." }, { status: 503 });
  }
}
