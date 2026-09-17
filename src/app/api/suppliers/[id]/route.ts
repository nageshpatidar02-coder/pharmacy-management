import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { updateSupplier } from "@/server/services/supplier.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  try { const { id } = await params; return NextResponse.json(await updateSupplier(id, await request.json())); } catch (error) { console.error("Supplier update failed", { error, userId: user.id }); return NextResponse.json({ error: "Unable to update supplier." }, { status: 400 }); }
}
