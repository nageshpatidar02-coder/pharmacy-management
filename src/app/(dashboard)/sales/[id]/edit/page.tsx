import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SaleForm } from "@/components/sales/sale-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.salesCreate);
  const { id } = await params;
  const sale = await prisma.sale.findFirst({ where: { id, pharmacyId: user.pharmacyId }, include: { items: true, payments: true } });
  if (!sale) notFound();

  const batchIds = sale.items.map((item) => item.batchId);
  const [customers, medicines] = await Promise.all([
    prisma.customer.findMany({ where: { pharmacyId: user.pharmacyId }, select: { id: true, name: true, mobile: true }, orderBy: { name: "asc" } }),
    prisma.medicine.findMany({
      where: { OR: [{ active: true }, { id: { in: sale.items.map((item) => item.medicineId) } }] },
      select: {
        id: true,
        name: true,
        itemType: true,
        sellingPrice: true,
        packSize: true,
        unit: true,
        batches: {
          where: { OR: [{ quantity: { gt: 0 }, expiryDate: { gt: new Date() } }, { id: { in: batchIds } }], pharmacyId: user.pharmacyId },
          select: { id: true, batchNumber: true, quantity: true, sellingPrice: true, mrp: true, expiryDate: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return <AppShell user={user}><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Customer billing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit bill {sale.invoiceNumber}</h1><p className="mt-2 text-muted-foreground">Recorded payments remain unchanged.</p></div><SaleForm customers={customers} medicines={medicines} initialData={{ id: sale.id, customerId: sale.customerId, invoiceNumber: sale.invoiceNumber, paidAmount: sale.paidAmount, paymentMethod: sale.paymentMethod, paymentCount: sale.payments.length, items: sale.items.map(({ medicineId, batchId, quantity, sellingPrice, discount }) => ({ medicineId, batchId, quantity, sellingPrice, discount })) }} /></div></AppShell>;
}