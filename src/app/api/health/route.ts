import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return NextResponse.json({ ok: true, service: "medical-management-api", database: "mongodb" });
  } catch (error) {
    console.error("Health check database failure", error);
    return NextResponse.json({ ok: false, service: "medical-management-api", database: "unavailable" }, { status: 503 });
  }
}
