import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { manufacturerSchema } from "@/lib/validations/medicine";
import { prisma } from "@/server/db/prisma";

export async function GET() { await requirePermission(PERMISSIONS.medicineView); return NextResponse.json(await prisma.manufacturer.findMany({ orderBy: { name: "asc" } })); }
export async function POST(request: Request) { try { await requirePermission(PERMISSIONS.medicineCreate); const data = manufacturerSchema.parse(await request.json()); return NextResponse.json(await prisma.manufacturer.create({ data }), { status: 201 }); } catch (error) { console.error(error); const code = (error as { code?: string }).code; return NextResponse.json({ error: code === "P2002" ? "A manufacturer with this name already exists." : error instanceof Error ? error.message : "Unable to create manufacturer." }, { status: code === "P2002" ? 409 : 400 }); } }
