import { NextResponse } from "next/server";

import { sanitizeSensitiveError } from "@/lib/errors/sanitize-sensitive";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    if (process.env.NODE_ENV === "production") {
      console.info("Cloud MongoDB connection verified by Prisma health check.");
    }
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Health check database failure", sanitizeSensitiveError(error));
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
