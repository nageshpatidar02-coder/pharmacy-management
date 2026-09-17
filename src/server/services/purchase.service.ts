import "server-only";

import { prisma } from "@/server/db/prisma";
import { purchaseSchema, type PurchaseInput } from "@/lib/validations/purchase";
import { recordAudit } from "@/server/services/audit.service";

function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }

export function calculatePurchaseTotals(input: PurchaseInput) {
  const lines = input.items.map((item) => {
    const gross = item.quantity * item.purchaseRate;
    const discount = Math.min(item.discount, gross);
    const taxable = gross - discount;
    const tax = taxable * item.gstPercentage / 100;
    return { gross, discount, taxable, tax, lineTotal: taxable + tax };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.gross, 0);
  const discount = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxableAmount = lines.reduce((sum, line) => sum + line.taxable, 0);
  const totalTax = lines.reduce((sum, line) => sum + line.tax, 0);
  const cgst = input.igst > 0 ? 0 : totalTax / 2;
  const sgst = input.igst > 0 ? 0 : totalTax / 2;
  const igst = input.igst > 0 ? input.igst : 0;
  const beforeRound = taxableAmount + cgst + sgst + igst;
  const grandTotal = Math.round(beforeRound);
  return { lines, subtotal: roundMoney(subtotal), discount: roundMoney(discount), taxableAmount: roundMoney(taxableAmount), cgst: roundMoney(cgst), sgst: roundMoney(sgst), igst: roundMoney(igst), roundOff: roundMoney(grandTotal - beforeRound), grandTotal: roundMoney(grandTotal), paidAmount: roundMoney(Math.min(input.paidAmount, grandTotal)), balanceAmount: roundMoney(Math.max(grandTotal - input.paidAmount, 0)) };
}

export async function listPurchases() { return prisma.purchase.findMany({ include: { supplier: true, items: true }, orderBy: { invoiceDate: "desc" } }); }

export async function createPurchase(userId: string, input: unknown) {
  const data = purchaseSchema.parse(input);
  const totals = calculatePurchaseTotals(data);
  if (data.paidAmount > totals.grandTotal) throw new Error("Paid amount cannot exceed the purchase total.");
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier || supplier.status !== "ACTIVE") throw new Error("Supplier is not active.");
    const medicineIds = [...new Set(data.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({ where: { id: { in: medicineIds }, active: true } });
    if (medicines.length !== medicineIds.length) throw new Error("One or more medicines are invalid or inactive.");
    const purchase = await tx.purchase.create({ data: { supplierId: data.supplierId, invoiceNumber: data.invoiceNumber, invoiceDate: data.invoiceDate, dueDate: data.dueDate, subtotal: totals.subtotal, discount: totals.discount, taxableAmount: totals.taxableAmount, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, roundOff: totals.roundOff, grandTotal: totals.grandTotal, paidAmount: totals.paidAmount, balanceAmount: totals.balanceAmount } });
    for (const [index, item] of data.items.entries()) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId)!;
      const batch = await tx.batch.findFirst({ where: { medicineId: item.medicineId, batchNumber: item.batchNumber } });
      const nextQuantity = (batch?.quantity ?? 0) + item.quantity;
      const nextFree = (batch?.freeQuantity ?? 0) + item.freeQuantity;
      const savedBatch = batch ? await tx.batch.update({ where: { id: batch.id }, data: { manufacturingDate: item.manufacturingDate, expiryDate: item.expiryDate, purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, quantity: nextQuantity, freeQuantity: nextFree } }) : await tx.batch.create({ data: { medicineId: medicine.id, batchNumber: item.batchNumber, manufacturingDate: item.manufacturingDate, expiryDate: item.expiryDate, purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, quantity: item.quantity, freeQuantity: item.freeQuantity } });
      await tx.purchaseItem.create({ data: { purchaseId: purchase.id, medicineId: medicine.id, batchId: savedBatch.id, expiryDate: item.expiryDate, quantity: item.quantity, freeQuantity: item.freeQuantity, purchaseRate: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, discount: totals.lines[index].discount, gstPercentage: item.gstPercentage, lineTotal: totals.lines[index].lineTotal } });
      await tx.stockLedger.create({ data: { medicineId: medicine.id, batchId: savedBatch.id, previousQuantity: batch?.quantity ?? 0, quantityChange: item.quantity + item.freeQuantity, newQuantity: nextQuantity + nextFree, reason: "PURCHASE", reference: purchase.id, userId } });
    }
    if (totals.paidAmount > 0) await tx.supplierPayment.create({ data: { supplierId: supplier.id, purchaseId: purchase.id, amount: totals.paidAmount, method: data.paymentMethod, reference: data.paymentReference || null } });
    await tx.supplier.update({ where: { id: supplier.id }, data: { outstandingBalance: supplier.outstandingBalance + totals.balanceAmount } });
    await tx.auditLog.create({ data: { action: "purchase.created", entity: "Purchase", entityId: purchase.id, userId, metadata: { grandTotal: totals.grandTotal } } });
    return purchase;
  });
}
