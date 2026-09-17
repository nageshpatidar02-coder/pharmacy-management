import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { adjustStock } from "@/server/services/inventory.service";

export async function POST(request: Request) { try { const user = await requirePermission(PERMISSIONS.inventoryAdjust); return NextResponse.json(await adjustStock(await request.json(), user.id)); } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to adjust stock." }, { status: 400 }); } }
