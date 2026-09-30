import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { deleteSale, updateSale } from "@/server/services/sale.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.salesCreate);
    const { id } = await params;
    return NextResponse.json(await updateSale(id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update customer bill." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.salesCreate);
    const { id } = await params;
    return NextResponse.json(await deleteSale(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete customer bill." }, { status: 400 });
  }
}