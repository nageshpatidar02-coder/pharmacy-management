import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { updateMedicine } from "@/server/services/medicine.service";
import { prisma } from "@/server/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { await requirePermission(PERMISSIONS.medicineView); const { id } = await params; const medicine = await prisma.medicine.findUnique({ where: { id }, include: { category: true, manufacturer: true, batches: true } }); return medicine ? NextResponse.json(medicine) : NextResponse.json({ error: "Medicine not found." }, { status: 404 }); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineUpdate); const { id } = await params; return NextResponse.json(await updateMedicine(id, await request.json())); } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to update medicine." }, { status: 400 }); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineDelete); const { id } = await params; return NextResponse.json(await prisma.medicine.update({ where: { id }, data: { active: false } })); } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to deactivate medicine." }, { status: 400 }); } }
