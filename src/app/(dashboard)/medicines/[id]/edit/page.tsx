import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicineForm } from "@/components/medicines/medicine-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listCategories, listManufacturers } from "@/server/services/medicine.service";
import { prisma } from "@/server/db/prisma";

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
	const user = await requirePermission(PERMISSIONS.medicineUpdate);
	const { id } = await params;
	if (!ObjectId.isValid(id)) notFound();
	const [medicine, categories, manufacturers] = await Promise.all([
		prisma.medicine.findUnique({ where: { id } }),
		listCategories(),
		listManufacturers(),
	]);
	if (!medicine) notFound();
	return <AppShell user={user}><div className="mx-auto max-w-5xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Medicine master</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit medicine</h1></div><Card><CardHeader><CardTitle>{medicine.name}</CardTitle></CardHeader><CardContent><MedicineForm categories={categories} manufacturers={manufacturers} initial={medicine} /></CardContent></Card></div></AppShell>;
}
