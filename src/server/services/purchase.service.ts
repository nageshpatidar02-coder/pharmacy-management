import "server-only";

import { prisma, runMongoTransaction } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { purchaseSchema, type PurchaseInput } from "@/lib/validations/purchase";

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
  const lineDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
  const discountBase = Math.max(subtotal - lineDiscount, 0);
  const billDiscount = input.discountType === "PERCENTAGE" ? discountBase * Math.min(input.discountValue, 100) / 100 : Math.min(input.discountValue, discountBase);
  const discount = lineDiscount + billDiscount;
  const taxableAmount = lines.reduce((sum, line) => sum + line.taxable, 0);
  const totalTax = lines.reduce((sum, line) => sum + line.tax, 0);
  const cgst = input.igst > 0 ? 0 : totalTax / 2;
  const sgst = input.igst > 0 ? 0 : totalTax / 2;
  const igst = input.igst > 0 ? input.igst : 0;
  const beforeRound = Math.max(taxableAmount - billDiscount, 0) + cgst + sgst + igst;
  const grandTotal = Math.round(beforeRound);
  return { lines, subtotal: roundMoney(subtotal), discount: roundMoney(discount), taxableAmount: roundMoney(Math.max(taxableAmount - billDiscount, 0)), cgst: roundMoney(cgst), sgst: roundMoney(sgst), igst: roundMoney(igst), roundOff: roundMoney(grandTotal - beforeRound), grandTotal: roundMoney(grandTotal), paidAmount: roundMoney(Math.min(input.paidAmount, grandTotal)), balanceAmount: roundMoney(Math.max(grandTotal - input.paidAmount, 0)) };
}

function unitsPerPack(packSize: string | null | undefined) {
  const match = packSize?.match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

export async function listPurchases(filters: { search?: string; supplierId?: string; from?: Date; to?: Date; page?: number; pageSize?: number } = {}) {
  const { pharmacyId } = await requirePharmacy();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const where = {
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.search ? { OR: [{ invoiceNumber: { contains: filters.search, mode: "insensitive" as const } }, { supplier: { businessName: { contains: filters.search, mode: "insensitive" as const } } }, { supplier: { contactPerson: { contains: filters.search, mode: "insensitive" as const } } }, { supplier: { mobile: { contains: filters.search, mode: "insensitive" as const } } }, { supplier: { gstin: { contains: filters.search, mode: "insensitive" as const } } }, { supplier: { city: { contains: filters.search, mode: "insensitive" as const } } }, { items: { some: { medicine: { name: { contains: filters.search, mode: "insensitive" as const } } } } }] } : {}),
    ...(filters.from || filters.to ? { invoiceDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.purchase.findMany({ where: { pharmacyId, ...where }, include: { supplier: true, items: true }, orderBy: { invoiceDate: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.purchase.count({ where: { pharmacyId, ...where } }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createPurchase(userId: string, input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = purchaseSchema.parse(input);
  const totals = calculatePurchaseTotals(data);
  if (data.paidAmount > totals.grandTotal) throw new Error("Paid amount cannot exceed the purchase total.");
  const persistedUserId = userId === "temporary-admin" ? undefined : userId;
  return runMongoTransaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id: data.supplierId, pharmacyId } });
    if (!supplier || supplier.status !== "ACTIVE") throw new Error("Supplier is not active.");
    const medicineIds = [...new Set(data.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({ where: { id: { in: medicineIds }, active: true } });
    if (medicines.length !== medicineIds.length) throw new Error("One or more medicines are invalid or inactive.");
    const purchase = await tx.purchase.create({ data: { pharmacyId, supplierId: data.supplierId, invoiceNumber: data.invoiceNumber, invoiceDate: data.invoiceDate, dueDate: data.dueDate, subtotal: totals.subtotal, discount: totals.discount, taxableAmount: totals.taxableAmount, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, roundOff: totals.roundOff, grandTotal: totals.grandTotal, paidAmount: totals.paidAmount, balanceAmount: totals.balanceAmount } });
    
    for (const [index, item] of data.items.entries()) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId)!;
      const packMultiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      const stockQuantity = item.quantity * packMultiplier;
      const stockFreeQuantity = item.freeQuantity * packMultiplier;
      const batch = await tx.batch.findFirst({ where: { pharmacyId, medicineId: item.medicineId, batchNumber: item.batchNumber } });
      const nextQuantity = (batch?.quantity ?? 0) + stockQuantity;
      const nextFree = (batch?.freeQuantity ?? 0) + stockFreeQuantity;
      
      const savedBatch = batch 
        ? await tx.batch.update({ 
            where: { id: batch.id }, 
            data: { 
              expiryDate: item.expiryDate, 
              purchasePrice: item.purchaseRate, 
              mrp: item.mrp, 
              sellingPrice: item.sellingPrice, 
              quantity: nextQuantity, 
              freeQuantity: nextFree 
            } 
          }) 
        : await tx.batch.create({ 
            data: { 
              pharmacyId,
              medicineId: medicine.id, 
              batchNumber: item.batchNumber, 
              manufacturingDate: new Date(),
              expiryDate: item.expiryDate, 
              purchasePrice: item.purchaseRate, 
              mrp: item.mrp, 
              sellingPrice: item.sellingPrice, 
              quantity: stockQuantity, 
              freeQuantity: stockFreeQuantity 
            } 
          });

      await tx.purchaseItem.create({ data: { purchaseId: purchase.id, medicineId: medicine.id, batchId: savedBatch.id, expiryDate: item.expiryDate, quantity: item.quantity, freeQuantity: item.freeQuantity, purchaseRate: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, discount: totals.lines[index].discount, gstPercentage: item.gstPercentage, lineTotal: totals.lines[index].lineTotal } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: medicine.id, batchId: savedBatch.id, previousQuantity: batch?.quantity ?? 0, quantityChange: stockQuantity + stockFreeQuantity, newQuantity: nextQuantity + nextFree, reason: "PURCHASE", reference: purchase.id, userId: persistedUserId } });
    }

    if (totals.paidAmount > 0) await tx.supplierPayment.create({ data: { pharmacyId, supplierId: supplier.id, purchaseId: purchase.id, amount: totals.paidAmount, method: data.paymentMethod, reference: data.paymentReference || null } });
    await tx.auditLog.create({ data: { pharmacyId, action: "purchase.created", entity: "Purchase", entityId: purchase.id, userId: persistedUserId, metadata: { grandTotal: totals.grandTotal } } });
    return purchase;
  });
}

export async function receivePurchasePayment(purchaseId: string, input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const payment = input as { amount?: number; method?: string; reference?: string };
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payment amount.");
  if (!["CASH", "UPI", "CARD", "BANK", "CREDIT"].includes(payment.method ?? "")) throw new Error("Select a valid payment method.");
  return runMongoTransaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, pharmacyId } });
    if (!purchase?.supplierId) throw new Error("Purchase bill or supplier not found.");
    if (amount > purchase.balanceAmount) throw new Error("Payment cannot exceed the remaining supplier due.");
    const updated = await tx.purchase.update({ where: { id: purchase.id }, data: { paidAmount: purchase.paidAmount + amount, balanceAmount: purchase.balanceAmount - amount } });
    await tx.supplierPayment.create({ data: { pharmacyId, supplierId: purchase.supplierId, purchaseId: purchase.id, amount, method: payment.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT", reference: payment.reference?.trim() || null } });
    return updated;
  });
}