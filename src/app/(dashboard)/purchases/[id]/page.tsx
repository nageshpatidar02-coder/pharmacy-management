import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { InvoiceHeader, type InvoiceSettings } from "@/components/invoices/InvoiceHeader";
import { InvoiceActions } from "@/components/purchases/invoice-actions";
import { PurchasePaymentForm } from "@/components/purchases/payment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.purchaseView);
  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: { supplier: true, items: true, payments: true } });
  if (!purchase) notFound();

  const [medicines, batches, settings] = await Promise.all([
    prisma.medicine.findMany({ where: { id: { in: purchase.items.map((item) => item.medicineId) } }, select: { id: true, name: true, sku: true } }),
    prisma.batch.findMany({ where: { id: { in: purchase.items.map((item) => item.batchId) } }, select: { id: true, batchNumber: true } }),
    prisma.pharmacySettings.findUnique({ where: { key: "singleton" } }),
  ]);
  const invoiceSettings: InvoiceSettings = { pharmacyName: settings?.pharmacyName ?? "Pharmacy", address: settings?.address ?? null, mobile: settings?.mobile ?? null, email: settings?.email ?? null, gstin: settings?.gstin ?? null, drugLicenseNo: settings?.drugLicenseNo ?? null, logoUrl: settings?.logoUrl ?? null, invoicePrefix: settings?.invoicePrefix ?? "INV" };
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));

  return <AppShell user={user}><div className="invoice-sheet mx-auto max-w-6xl space-y-6"><InvoiceHeader settings={invoiceSettings} /><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchase invoice</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Invoice {purchase.invoiceNumber}</h1><p className="mt-2 text-muted-foreground">{purchase.supplier?.businessName ?? "Supplier unavailable"} - {purchase.invoiceDate.toLocaleDateString()}</p></div><div className="flex items-center gap-2"><InvoiceActions /><Link href="/purchases" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted print:hidden">Back</Link></div></div><Card><CardHeader><CardTitle>Wholesaler purchase bill</CardTitle><p className="text-sm text-muted-foreground">Wholesaler: {purchase.supplier?.businessName ?? "Unavailable"} - Invoice: {purchase.invoiceNumber}{purchase.dueDate ? ` - Due: ${purchase.dueDate.toLocaleDateString()}` : ""}</p></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3">Medicine</th><th className="pb-3">Batch</th><th className="pb-3">Expiry</th><th className="pb-3">Qty</th><th className="pb-3">Purchase rate</th><th className="pb-3">MRP</th><th className="pb-3">Selling price</th><th className="pb-3">Total</th></tr></thead><tbody>{purchase.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3 font-medium">{medicineById.get(item.medicineId)?.name ?? item.medicineId}<span className="block text-xs text-muted-foreground">{medicineById.get(item.medicineId)?.sku ?? ""}</span></td><td className="py-3">{batchById.get(item.batchId)?.batchNumber ?? item.batchId}</td><td className="py-3">{item.expiryDate.toLocaleDateString()}</td><td className="py-3">{item.quantity} + {item.freeQuantity}</td><td className="py-3">{item.purchaseRate.toFixed(2)}</td><td className="py-3">{item.mrp.toFixed(2)}</td><td className="py-3">{item.sellingPrice.toFixed(2)}</td><td className="py-3">{item.lineTotal.toFixed(2)}</td></tr>)}</tbody></table></div><div className="ml-auto mt-6 max-w-sm space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{purchase.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Discount</span><span>{purchase.discount.toFixed(2)}</span></div><div className="flex justify-between text-base font-semibold"><span>Grand total</span><span>{purchase.grandTotal.toFixed(2)}</span></div><div className="flex justify-between text-emerald-700"><span>Paid to wholesaler</span><span>{purchase.paidAmount.toFixed(2)}</span></div><div className="flex justify-between font-semibold text-amber-700"><span>Supplier balance</span><span>{purchase.balanceAmount.toFixed(2)}</span></div></div><div className="mt-6 border-t pt-4 print:hidden"><p className="mb-3 text-sm font-semibold">Pay remaining supplier due</p><PurchasePaymentForm purchaseId={purchase.id} balance={purchase.balanceAmount} /></div></CardContent></Card></div></AppShell>;
}
