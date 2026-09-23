import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { InvoiceHeader, type InvoiceSettings } from "@/components/invoices/InvoiceHeader";
import { InvoiceActions } from "@/components/purchases/invoice-actions";
import { PaymentForm } from "@/components/sales/payment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.salesView);
  const { id } = await params;
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { customer: true, items: { include: { medicine: { include: { category: true, manufacturer: true } } } }, payments: true },
  });
  if (!sale) notFound();

  const [batches, settings] = await Promise.all([
    prisma.batch.findMany({ where: { id: { in: sale.items.map((item) => item.batchId) } } }),
    prisma.pharmacySettings.findUnique({ where: { key: "singleton" } }),
  ]);
  const invoiceSettings: InvoiceSettings = {
    pharmacyName: settings?.pharmacyName ?? "Pharmacy",
    address: settings?.address ?? null,
    mobile: settings?.mobile ?? null,
    email: settings?.email ?? null,
    gstin: settings?.gstin ?? null,
    drugLicenseNo: settings?.drugLicenseNo ?? null,
    logoUrl: settings?.logoUrl ?? null,
    invoicePrefix: settings?.invoicePrefix ?? "INV",
  };
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));

  return (
    <AppShell user={user}>
      <div className="invoice-sheet mx-auto max-w-6xl space-y-6">
        <InvoiceHeader settings={invoiceSettings} />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customer invoice</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bill {sale.invoiceNumber}</h1>
            <p className="mt-2 text-muted-foreground">{sale.invoiceDate.toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden"><InvoiceActions /><Link href="/sales" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">Back</Link></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer bill</CardTitle>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span>Customer: <strong className="text-foreground">{sale.customer?.name ?? "Walk-in Customer"}</strong></span>
              <span>Mobile: <strong className="text-foreground">{sale.customer?.mobile ?? "-"}</strong></span>
              <span>Payment: <strong className="text-foreground">{sale.paymentMethod}</strong></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="pb-3">Medicine details</th><th className="pb-3">Type</th><th className="pb-3">Batch</th><th className="pb-3">Qty</th><th className="pb-3">MRP</th><th className="pb-3">Rate</th><th className="pb-3 text-right">Total</th></tr></thead>
                <tbody>
                  {sale.items.map((item) => {
                    const batch = batchById.get(item.batchId);
                    return <tr key={item.id} className="border-b align-top last:border-0">
                      <td className="py-3 font-medium">{item.medicine.name}<span className="block text-xs text-muted-foreground">{item.medicine.genericName ?? item.medicine.composition ?? "No composition"}</span><span className="block text-xs text-muted-foreground">{item.medicine.manufacturer?.name ?? "Manufacturer not specified"} {item.medicine.strength ? `· ${item.medicine.strength}` : ""}</span></td>
                      <td className="py-3">{item.medicine.itemType}</td>
                      <td className="py-3">{batch?.batchNumber ?? "-"}</td>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3">{(batch?.mrp ?? item.sellingPrice).toFixed(2)}</td>
                      <td className="py-3">{item.sellingPrice.toFixed(2)}</td>
                      <td className="py-3 text-right">{item.lineTotal.toFixed(2)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="ml-auto mt-6 max-w-sm space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{sale.subtotal.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Discount</span><strong>{sale.discount.toFixed(2)}</strong></div>
              <div className="flex justify-between border-t pt-2 text-lg"><span>Grand total</span><strong>{sale.grandTotal.toFixed(2)}</strong></div>
              <div className="flex justify-between text-emerald-700"><span>Paid</span><strong>{sale.paidAmount.toFixed(2)}</strong></div>
              <div className="flex justify-between font-semibold text-amber-700"><span>Due</span><strong>{sale.balanceAmount.toFixed(2)}</strong></div>
            </div>
          </CardContent>
        </Card>
        {sale.balanceAmount > 0 ? <div className="print:hidden"><PaymentForm saleId={sale.id} balance={sale.balanceAmount} /></div> : null}
      </div>
    </AppShell>
  );
}