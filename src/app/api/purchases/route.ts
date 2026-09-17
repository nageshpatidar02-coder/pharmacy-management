import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createPurchase, listPurchases } from "@/server/services/purchase.service";

export async function GET() { await requirePermission(PERMISSIONS.purchaseView); return NextResponse.json(await listPurchases()); }

export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  try { return NextResponse.json(await createPurchase(user.id, await request.json()), { status: 201 }); } catch (error) { console.error("Purchase create failed", { error, userId: user.id }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete purchase." }, { status: 400 }); }
}
