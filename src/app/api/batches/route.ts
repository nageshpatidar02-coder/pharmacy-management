import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { batchSchema } from "@/lib/validations/medicine";
import { prisma } from "@/server/db/prisma";

export async function GET() { await requirePermission(PERMISSIONS.inventoryView); return NextResponse.json(await prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } })); }
export async function POST(request: Request) { try { const user = await requirePermission(PERMISSIONS.inventoryAdjust); const data = batchSchema.parse(await request.json()); const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } }); if (!medicine) return NextResponse.json({ error: "Medicine not found." }, { status: 404 }); const batch = await prisma.batch.create({ data }); if (data.quantity > 0) await prisma.stockLedger.create({ data: { medicineId: data.medicineId, batchId: batch.id, previousQuantity: 0, quantityChange: data.quantity, newQuantity: data.quantity, reason: "Initial batch stock", userId: user.id } }); return NextResponse.json(batch, { status: 201 }); } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to create batch." }, { status: 400 }); } }
