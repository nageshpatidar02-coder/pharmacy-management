import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { categorySchema } from "@/lib/validations/medicine";
import { prisma } from "@/server/db/prisma";

export async function GET() { await requirePermission(PERMISSIONS.medicineView); return NextResponse.json(await prisma.category.findMany({ orderBy: { name: "asc" } })); }
export async function POST(request: Request) { try { await requirePermission(PERMISSIONS.medicineCreate); const data = categorySchema.parse(await request.json()); return NextResponse.json(await prisma.category.create({ data }), { status: 201 }); } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to create category." }, { status: 400 }); } }
