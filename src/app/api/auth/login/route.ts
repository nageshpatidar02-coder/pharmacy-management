import { NextResponse } from "next/server";

import { createSession } from "@/server/auth/auth";
import { authenticateUser } from "@/server/services/auth.service";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid email and password." }, { status: 400 });

    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.json({ ok: false, error: "Unable to sign in with those details." }, { status: 401 });

    await createSession(user.id);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("API login failed", error);
    return NextResponse.json({ ok: false, error: "Login service is temporarily unavailable." }, { status: 503 });
  }
}
