import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaleForm } from "@/components/sales/sale-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { listCustomers } from "@/server/services/customer.service";
import { prisma } from "@/server/db/prisma";
import Link from "next/link";

export default async function SalesPage() {
  const user = await requirePermission(PERMISSIONS.salesView);
  const [customers, medicines, sales] = await Promise.all([
    listCustomers(),
    prisma.medicine.findMany({ where: { active: true }, select: { id: true, name: true, sellingPrice: true, packSize: true, batches: { where: { quantity: { gt: 0 }, expiryDate: { gt: new Date() } }, select: { id: true, batchNumber: true, quantity: true, sellingPrice: true, mrp: true, expiryDate: true } } }, orderBy: { name: "asc" } }),
    prisma.sale.findMany({ include: { customer: true }, orderBy: { invoiceDate: "desc" }, take: 100 }),
  ]);

  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customers</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Customer bills</h1><p className="mt-2 text-muted-foreground">Create bills, collect payments and track profit.</p></div><Card><CardHeader><CardTitle>New customer bill</CardTitle></CardHeader><CardContent><SaleForm customers={customers} medicines={medicines} /></CardContent></Card><Card><CardHeader><CardTitle>Recent bills</CardTitle></CardHeader><CardContent>{sales.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No bills created yet.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Invoice</th><th className="pb-3">Customer</th><th className="pb-3">Date</th><th className="pb-3">Total</th><th className="pb-3">Paid</th><th className="pb-3">Profit</th><th className="pb-3">Action</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id} className="border-b last:border-0"><td className="py-3 font-medium">{sale.invoiceNumber}</td><td className="py-3">{sale.customer?.name ?? "Walk-in"}</td><td className="py-3">{sale.invoiceDate.toLocaleDateString()}</td><td className="py-3">{sale.grandTotal.toFixed(2)}</td><td className="py-3">{sale.paidAmount.toFixed(2)}</td><td className="py-3">{(sale.grandTotal - sale.costAmount).toFixed(2)}</td><td className="py-3"><Link href={`/sales/${sale.id}`} className="font-semibold text-primary hover:underline">View bill</Link></td></tr>)}</tbody></table></div>}</CardContent></Card></div></AppShell>;
}
