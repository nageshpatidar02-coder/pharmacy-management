import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  const supplier = await prisma.supplier.findUnique({ where: { id: (await params).id } });
  if (!supplier) notFound();
  return <AppShell user={user}><div className="mx-auto max-w-5xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchasing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit wholesaler</h1></div><Card><CardHeader><CardTitle>{supplier.businessName}</CardTitle></CardHeader><CardContent><SupplierForm initial={supplier} /></CardContent></Card></div></AppShell>;
}
