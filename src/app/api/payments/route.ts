import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) { await requirePermission(PERMISSIONS.purchaseView); const supplierId = new URL(request.url).searchParams.get("supplierId"); return NextResponse.json(await prisma.supplierPayment.findMany({ where: supplierId ? { supplierId } : undefined, include: { supplier: true, purchase: true }, orderBy: { createdAt: "desc" } })); }
