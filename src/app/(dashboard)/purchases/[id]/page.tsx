import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.purchaseView);
  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: { supplier: true, items: true, payments: true } });
  if (!purchase) notFound();

  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchase detail</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Invoice {purchase.invoiceNumber}</h1><p className="mt-2 text-muted-foreground">{purchase.supplier.businessName} · {purchase.invoiceDate.toLocaleDateString()}</p></div><Link href="/purchases" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Back to purchases</Link></div><div className="grid gap-4 sm:grid-cols-4">{[["Grand total", purchase.grandTotal], ["Paid", purchase.paidAmount], ["Balance", purchase.balanceAmount], ["Status", purchase.status]].map(([label, value]) => <Card key={String(label)}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{typeof value === "number" ? value.toFixed(2) : value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Purchase items</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Medicine ID</th><th className="pb-3">Batch</th><th className="pb-3">Expiry</th><th className="pb-3">Quantity</th><th className="pb-3">Rate</th><th className="pb-3">GST</th><th className="pb-3">Total</th></tr></thead><tbody>{purchase.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3">{item.medicineId}</td><td className="py-3">{item.batchId}</td><td className="py-3">{item.expiryDate.toLocaleDateString()}</td><td className="py-3">{item.quantity} + {item.freeQuantity}</td><td className="py-3">{item.purchaseRate.toFixed(2)}</td><td className="py-3">{item.gstPercentage}%</td><td className="py-3">{item.lineTotal.toFixed(2)}</td></tr>)}</tbody></table></div></CardContent></Card><Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent>{purchase.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payment recorded.</p> : purchase.payments.map((payment) => <div key={payment.id} className="flex justify-between border-b py-3 text-sm last:border-0"><span>{payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</span><span>{payment.amount.toFixed(2)}</span></div>)}</CardContent></Card></div></AppShell>;
}
