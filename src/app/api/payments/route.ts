import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) { const user = await requirePermission(PERMISSIONS.purchaseView); const supplierId = new URL(request.url).searchParams.get("supplierId"); return NextResponse.json(await prisma.supplierPayment.findMany({ where: { pharmacyId: user.pharmacyId, ...(supplierId ? { supplierId } : {}) }, include: { supplier: true, purchase: true }, orderBy: { createdAt: "desc" } })); }
