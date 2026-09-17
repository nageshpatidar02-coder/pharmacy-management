import { AppShell } from "@/components/layout/app-shell";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";

export default async function NewSupplierPage() { const user = await requirePermission(PERMISSIONS.purchaseCreate); return <AppShell user={user}><div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchasing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Add supplier</h1></div><Card><CardHeader><CardTitle>Supplier details</CardTitle></CardHeader><CardContent><SupplierForm /></CardContent></Card></div></AppShell>; }
