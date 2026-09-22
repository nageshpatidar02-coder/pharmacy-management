import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createSale } from "@/server/services/sale.service";
import { prisma } from "@/server/db/prisma";
export async function GET() { await requirePermission(PERMISSIONS.salesView); return NextResponse.json(await prisma.sale.findMany({ include: { customer: true, items: true }, orderBy: { invoiceDate: "desc" } })); }
export async function POST(request: Request) { try { await requirePermission(PERMISSIONS.salesCreate); return NextResponse.json(await createSale(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create bill." }, { status: 400 }); } }
