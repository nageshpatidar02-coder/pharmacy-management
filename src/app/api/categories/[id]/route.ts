import { NextResponse } from "next/server";
import { categorySchema } from "@/lib/validations/medicine";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineCreate); const { id } = await params; return NextResponse.json(await prisma.category.update({ where: { id }, data: categorySchema.parse(await request.json()) })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update category." }, { status: 400 }); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { await requirePermission(PERMISSIONS.medicineDelete); const { id } = await params; return NextResponse.json(await prisma.category.update({ where: { id }, data: { active: false } })); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to deactivate category." }, { status: 400 }); } }