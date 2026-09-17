import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { getInventorySummary } from "@/server/services/inventory.service";

export async function GET() { await requirePermission(PERMISSIONS.inventoryView); return NextResponse.json(await getInventorySummary()); }
