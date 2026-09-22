import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createMedicine, listMedicines } from "@/server/services/medicine.service";

export async function GET(request: Request) { await requirePermission(PERMISSIONS.medicineView); return NextResponse.json(await listMedicines(new URL(request.url).searchParams.get("search") ?? "")); }
export async function POST(request: Request) { try { const user = await requirePermission(PERMISSIONS.medicineCreate); const medicine = await createMedicine(await request.json(), user.id); return NextResponse.json({ medicine, createdBy: user.id }, { status: 201 }); } catch (error) { console.error(error); const message = error instanceof Error ? error.message : "Unable to create medicine."; return NextResponse.json({ error: message }, { status: message.includes("already in use") ? 409 : 400 }); } }
