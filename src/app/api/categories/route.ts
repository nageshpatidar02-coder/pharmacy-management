import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { categorySchema } from "@/lib/validations/medicine";
import { prisma } from "@/server/db/prisma";

export async function GET() { await requirePermission(PERMISSIONS.medicineView); return NextResponse.json(await prisma.category.findMany({ orderBy: { name: "asc" } })); }
export async function POST(request: Request) { try { await requirePermission(PERMISSIONS.medicineCreate); const data = categorySchema.parse(await request.json()); return NextResponse.json(await prisma.category.create({ data }), { status: 201 }); } catch (error) { console.error(error); const code = (error as { code?: string }).code; return NextResponse.json({ error: code === "P2002" ? "A category with this name already exists." : error instanceof Error ? error.message : "Unable to create category." }, { status: code === "P2002" ? 409 : 400 }); } }
