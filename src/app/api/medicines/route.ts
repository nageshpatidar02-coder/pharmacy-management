import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createMedicine, listMedicines } from "@/server/services/medicine.service";

export async function GET(request: Request) { await requirePermission(PERMISSIONS.medicineView); return NextResponse.json(await listMedicines(new URL(request.url).searchParams.get("search") ?? "")); }
export async function POST(request: Request) { try { const user = await requirePermission(PERMISSIONS.medicineCreate); const medicine = await createMedicine(await request.json()); return NextResponse.json({ medicine, createdBy: user.id }, { status: 201 }); } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to create medicine." }, { status: 400 }); } }
