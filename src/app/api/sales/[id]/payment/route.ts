import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { receiveSalePayment } from "@/server/services/sale.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.salesCreate);
    const { id } = await params;
    return NextResponse.json(await receiveSalePayment(id, await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to receive payment." }, { status: 400 });
  }
}
