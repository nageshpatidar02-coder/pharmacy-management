import { NextResponse } from "next/server";

import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { createMedicine, listMedicines } from "@/server/services/medicine.service";

export async function GET(request: Request) {
	await requirePermission(PERMISSIONS.medicineView);

	try {
		const params = new URL(request.url).searchParams;
		const search = params.get("search")?.trim() ?? "";
		const requestedPage = Number(params.get("page") ?? 1);
		const requestedLimit = Number(params.get("limit") ?? 100);
		const page = Number.isFinite(requestedPage) ? Math.max(Math.floor(requestedPage), 1) : 1;
		const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100) : 100;
		const result = await listMedicines(search, page, limit);
		return NextResponse.json({ data: result.data, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
	} catch (error) {
		console.error("GET /api/medicines failed", error);
		return NextResponse.json({ error: "Unable to load medicines from the database.", details: error instanceof Error ? error.message : "Unknown database error." }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const user = await requirePermission(PERMISSIONS.medicineCreate);
		const medicine = await createMedicine(await request.json(), user.id);
		return NextResponse.json({ medicine, createdBy: user.id }, { status: 201 });
	} catch (error) {
		console.error(error);
		const message = error instanceof Error ? error.message : "Unable to create medicine.";
		return NextResponse.json({ error: message }, { status: message.includes("already in use") ? 409 : 400 });
	}
}
