import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { batchSchema } from "@/lib/validations/medicine";
import { prisma, runMongoTransaction } from "@/server/db/prisma";

export async function GET() { await requirePermission(PERMISSIONS.inventoryView); return NextResponse.json(await prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } })); }
export async function POST(request: Request) { try { const user = await requirePermission(PERMISSIONS.inventoryAdjust); const data = batchSchema.parse(await request.json()); if (data.expiryDate <= new Date()) return NextResponse.json({ error: "Expired batches cannot be added." }, { status: 400 }); const batch = await runMongoTransaction(async (tx) => { const medicine = await tx.medicine.findUnique({ where: { id: data.medicineId } }); if (!medicine || !medicine.active) throw new Error("Medicine not found or inactive."); const created = await tx.batch.create({ data }); if (data.quantity + data.freeQuantity > 0) await tx.stockLedger.create({ data: { medicineId: data.medicineId, batchId: created.id, previousQuantity: 0, quantityChange: data.quantity + data.freeQuantity, newQuantity: data.quantity + data.freeQuantity, reason: "Initial batch stock", userId: user.id } }); return created; }); return NextResponse.json(batch, { status: 201 }); } catch (error) { console.error("Batch create failed", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create batch." }, { status: 400 }); } }
