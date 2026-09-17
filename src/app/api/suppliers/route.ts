import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createSupplier, listSuppliers } from "@/server/services/supplier.service";

export async function GET(request: Request) {
  await requirePermission(PERMISSIONS.suppliersView);
  const search = new URL(request.url).searchParams.get("search") ?? "";
  return NextResponse.json(await listSuppliers(search));
}

export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  try { return NextResponse.json(await createSupplier(await request.json()), { status: 201 }); } catch (error) { console.error("Supplier create failed", { error, userId: user.id }); return NextResponse.json({ error: "Unable to create supplier." }, { status: 400 }); }
}
