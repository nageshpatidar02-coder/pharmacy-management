import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicineForm } from "@/components/medicines/medicine-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listCategories, listManufacturers } from "@/server/services/medicine.service";

export default async function NewMedicinePage() { const user = await requirePermission(PERMISSIONS.medicineCreate); const [categories, manufacturers] = await Promise.all([listCategories(), listManufacturers()]); return <AppShell user={user}><div className="mx-auto max-w-5xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Medicine master</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Add medicine</h1></div><Card><CardHeader><CardTitle>Medicine details</CardTitle></CardHeader><CardContent><MedicineForm categories={categories} manufacturers={manufacturers} /></CardContent></Card></div></AppShell>; }
