import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createCustomer, listCustomers } from "@/server/services/customer.service";
export async function GET() { await requirePermission(PERMISSIONS.customersView); return NextResponse.json(await listCustomers()); }
export async function POST(request: Request) { try { await requirePermission(PERMISSIONS.salesCreate); return NextResponse.json(await createCustomer(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create customer." }, { status: 400 }); } }
