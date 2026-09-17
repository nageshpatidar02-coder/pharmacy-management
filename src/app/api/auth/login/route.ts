import { NextResponse } from "next/server";

import { createSession } from "@/server/auth/auth";
import { authenticateUser } from "@/server/services/auth.service";
import { loginSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 400 });
    }

    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("API login failed", {
      message: error instanceof Error ? error.message : "Unknown login error",
    });
    return NextResponse.json({ ok: false, error: "Login service is temporarily unavailable." }, { status: 503 });
  }
}
