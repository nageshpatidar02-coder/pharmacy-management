import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createPurchase, listPurchases } from "@/server/services/purchase.service";

export async function GET(request: Request) {
  await requirePermission(PERMISSIONS.purchaseView);
  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  return NextResponse.json(await listPurchases({ search: params.get("search") ?? undefined, supplierId: params.get("supplierId") ?? undefined, from: from ? new Date(`${from}T00:00:00.000Z`) : undefined, to: to ? new Date(`${to}T23:59:59.999Z`) : undefined, page: Number(params.get("page") ?? 1), pageSize: Number(params.get("pageSize") ?? 20) }));
}

export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  try { return NextResponse.json(await createPurchase(user.id, await request.json()), { status: 201 }); } catch (error) { console.error("Purchase create failed", { error, userId: user.id }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete purchase." }, { status: 400 }); }
}
