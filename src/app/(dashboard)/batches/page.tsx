import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchForm } from "@/components/inventory/batch-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listBatches } from "@/server/services/medicine.service";
import { prisma } from "@/server/db/prisma";

export default async function BatchesPage() {
  const user = await requirePermission(PERMISSIONS.inventoryView);
  const [batches, medicines] = await Promise.all([listBatches(), prisma.medicine.findMany({ where: { active: true }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" } })]);
  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Inventory</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Batches</h1></div><BatchForm medicines={medicines} /><Card><CardHeader><CardTitle>All medicine batches</CardTitle></CardHeader><CardContent>{batches.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No batches recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Medicine</th><th className="pb-3">Batch</th><th className="pb-3">Manufactured</th><th className="pb-3">Expiry</th><th className="pb-3">Qty</th><th className="pb-3">MRP</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id} className="border-b last:border-0"><td className="py-3 font-medium">{batch.medicine.name}</td><td className="py-3">{batch.batchNumber}</td><td className="py-3">{batch.manufacturingDate.toLocaleDateString()}</td><td className="py-3">{batch.expiryDate.toLocaleDateString()}</td><td className="py-3">{batch.quantity + batch.freeQuantity}</td><td className="py-3">{batch.mrp.toFixed(2)}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></AppShell>;
}
