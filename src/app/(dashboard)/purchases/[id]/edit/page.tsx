import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { requirePermission, PERMISSIONS } from "@/server/auth/permissions";
import { attachPharmacyPrices } from "@/server/services/medicine.service";
import { prisma } from "@/server/db/prisma";

export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.purchaseCreate);
  const { id } = await params;
  const purchase = await prisma.purchase.findFirst({ where: { id, pharmacyId: user.pharmacyId }, include: { supplier: true, items: true, payments: true } });
  if (!purchase) notFound();

  const medicineIds = [...new Set(purchase.items.map((item) => item.medicineId))];
  const [suppliers, medicineCatalog, batches] = await Promise.all([
    prisma.supplier.findMany({ where: { pharmacyId: user.pharmacyId, status: "ACTIVE" }, select: { id: true, businessName: true }, orderBy: { businessName: "asc" } }),
    prisma.medicine.findMany({ where: { OR: [{ active: true }, { id: { in: medicineIds } }] }, select: { id: true, name: true, barcode: true, itemType: true, gstPercentage: true }, orderBy: { name: "asc" } }),
    prisma.batch.findMany({ where: { id: { in: purchase.items.map((item) => item.batchId) }, pharmacyId: user.pharmacyId }, select: { id: true, batchNumber: true } }),
  ]);
  const medicines = await attachPharmacyPrices(user.pharmacyId, medicineCatalog);
  if (purchase.supplier && !suppliers.some((supplier) => supplier.id === purchase.supplierId)) suppliers.push({ id: purchase.supplier.id, businessName: purchase.supplier.businessName });
  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const lineDiscount = purchase.items.reduce((sum, item) => sum + item.discount, 0);
  const payments = [...purchase.payments].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  return <AppShell user={user}><div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Purchasing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit purchase {purchase.invoiceNumber}</h1><p className="mt-2 text-muted-foreground">Recorded payments remain unchanged.</p></div><PurchaseForm suppliers={suppliers} medicines={medicines} initialData={{ id: purchase.id, supplierId: purchase.supplierId ?? "", invoiceNumber: purchase.invoiceNumber, invoiceDate: purchase.invoiceDate.toISOString().slice(0, 10), dueDate: purchase.dueDate?.toISOString().slice(0, 10) ?? "", paidAmount: purchase.paidAmount, paymentMethod: payments[0]?.method ?? "CREDIT", paymentCount: payments.length, discountValue: Math.max(0, purchase.discount - lineDiscount), igst: purchase.igst, items: purchase.items.map((item) => ({ medicineId: item.medicineId, medicineName: medicineById.get(item.medicineId)?.name, itemType: medicineById.get(item.medicineId)?.itemType, batchNumber: batchById.get(item.batchId)?.batchNumber ?? "", expiryDate: item.expiryDate.toISOString().slice(0, 7), quantity: item.quantity, freeQuantity: item.freeQuantity, purchaseRate: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, discount: item.discount, gstPercentage: item.gstPercentage })) }} /></div></AppShell>;
}