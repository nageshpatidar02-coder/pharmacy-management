import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SupplierActions } from "@/components/suppliers/supplier-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.suppliersView);
  const { id } = await params;
  const supplier = await prisma.supplier.findFirst({
    where: { id, pharmacyId: user.pharmacyId },
    include: {
      purchases: { where: { pharmacyId: user.pharmacyId }, orderBy: { invoiceDate: "desc" }, take: 20, include: { items: { include: { medicine: true } } } },
      payments: { where: { pharmacyId: user.pharmacyId }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!supplier) notFound();

  const outstandingBalance = supplier.purchases.reduce((total, purchase) => total + purchase.balanceAmount, 0);
  const medicines = Array.from(new Map(supplier.purchases.flatMap((purchase) => purchase.items.map((item) => [item.medicine.id, item.medicine] as const))).values());

  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Wholesaler details</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{supplier.businessName}</h1><p className="mt-2 text-muted-foreground">{supplier.contactPerson ?? "No contact person"} · {supplier.mobile ?? "No mobile"} · {supplier.email ?? "No email"}</p><p className="text-sm text-muted-foreground">{supplier.address ?? "Address not added"} {supplier.city || supplier.state ? `· ${[supplier.city, supplier.state].filter(Boolean).join(", ")}` : ""}</p></div><div className="flex items-center gap-3"><Link href="/suppliers" className="text-sm font-semibold text-primary">Back</Link><SupplierActions id={supplier.id} name={supplier.businessName} /></div></div><Card><CardContent className="grid gap-4 pt-6 sm:grid-cols-4"><div><p className="text-sm text-muted-foreground">This pharmacy outstanding</p><p className="text-2xl font-semibold">{outstandingBalance.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Credit limit</p><p className="text-2xl font-semibold">{supplier.creditLimit.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Drug license</p><p className="text-2xl font-semibold">{supplier.dlNumber ?? "-"}</p></div><div><p className="text-sm text-muted-foreground">GSTIN</p><p className="text-2xl font-semibold">{supplier.gstin ?? "-"}</p></div></CardContent></Card><Card><CardHeader><CardTitle>Medicines supplied to this pharmacy</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{medicines.length === 0 ? <p className="text-sm text-muted-foreground">No purchase items found.</p> : medicines.map((medicine) => <div key={medicine.id} className="rounded-lg border p-3"><p className="font-semibold">{medicine.name}</p><p className="text-sm text-muted-foreground">{medicine.genericName ?? medicine.composition ?? "Composition not added"}</p></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Recent purchases for this pharmacy</CardTitle></CardHeader><CardContent>{supplier.purchases.length === 0 ? <p className="text-sm text-muted-foreground">No purchases found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Invoice</th><th className="pb-3">Date</th><th className="pb-3">Total</th><th className="pb-3">Balance</th></tr></thead><tbody>{supplier.purchases.map((purchase) => <tr key={purchase.id} className="border-b last:border-0"><td className="py-3"><Link href={`/purchases/${purchase.id}`} className="font-medium text-primary hover:underline">{purchase.invoiceNumber}</Link></td><td className="py-3">{purchase.invoiceDate.toLocaleDateString()}</td><td className="py-3">{purchase.grandTotal.toFixed(2)}</td><td className="py-3">{purchase.balanceAmount.toFixed(2)}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></AppShell>;
}
