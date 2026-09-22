import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { receivePurchasePayment } from "@/server/services/purchase.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.purchaseCreate);
  try { const { id } = await params; return NextResponse.json(await receivePurchasePayment(id, await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to receive supplier payment." }, { status: 400 }); }
}
