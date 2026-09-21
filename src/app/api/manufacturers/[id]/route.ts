import { NextResponse } from "next/server";
import { manufacturerSchema } from "@/lib/validations/medicine";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineCreate); const { id } = await params; return NextResponse.json(await prisma.manufacturer.update({ where: { id }, data: manufacturerSchema.parse(await request.json()) })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update manufacturer." }, { status: 400 }); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineDelete); const { id } = await params; return NextResponse.json(await prisma.manufacturer.update({ where: { id }, data: { active: false } })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to deactivate manufacturer." }, { status: 400 }); } }