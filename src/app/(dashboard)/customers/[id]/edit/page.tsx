import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerForm } from "@/components/customers/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.customersView);
  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, pharmacyId: user.pharmacyId }, select: { id: true, name: true, mobile: true, email: true, address: true } });
  if (!customer) notFound();
  return <AppShell user={user}><div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customers</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit customer</h1></div><Card><CardHeader><CardTitle>{customer.name}</CardTitle></CardHeader><CardContent><CustomerForm customer={customer} /></CardContent></Card></div></AppShell>;
}