import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { deletePurchase, updatePurchase } from "@/server/services/purchase.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.purchaseCreate);
    const { id } = await params;
    return NextResponse.json(await updatePurchase(id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update purchase bill." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.purchaseCreate);
    const { id } = await params;
    return NextResponse.json(await deletePurchase(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete purchase bill." }, { status: 400 });
  }
}