import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { deleteCustomer, updateCustomer } from "@/server/services/customer.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.customersView);
    const { id } = await params;
    return NextResponse.json(await updateCustomer(id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update customer." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requirePermission(PERMISSIONS.customersView); return NextResponse.json(await deleteCustomer((await params).id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete customer." }, { status: 400 }); }
}