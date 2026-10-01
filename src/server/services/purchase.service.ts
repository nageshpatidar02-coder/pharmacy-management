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
      const batch = await tx.batch.findFirst({ where: { pharmacyId, medicineId: item.medicineId, batchNumber: item.batchNumber, purchasePrice: item.purchaseRate } });
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
      await tx.medicine.update({ where: { id: medicine.id }, data: { purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: medicine.id, batchId: savedBatch.id, previousQuantity: batch?.quantity ?? 0, quantityChange: stockQuantity + stockFreeQuantity, newQuantity: nextQuantity + nextFree, reason: "PURCHASE", reference: purchase.id, userId: persistedUserId } });
    }

    if (totals.paidAmount > 0) await tx.supplierPayment.create({ data: { pharmacyId, supplierId: supplier.id, purchaseId: purchase.id, amount: totals.paidAmount, method: data.paymentMethod, reference: data.paymentReference || null } });
    await tx.auditLog.create({ data: { pharmacyId, action: "purchase.created", entity: "Purchase", entityId: purchase.id, userId: persistedUserId, metadata: { grandTotal: totals.grandTotal } } });
    return purchase;
  });
}

export async function updatePurchase(purchaseId: string, input: unknown) {
  const { pharmacyId, user } = await requirePharmacy();
  const data = purchaseSchema.parse(input);
  const totals = calculatePurchaseTotals(data);
  return runMongoTransaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, pharmacyId }, include: { items: true, payments: true } });
    if (!purchase) throw new Error("Purchase bill not found.");
    if (data.paidAmount !== purchase.paidAmount) throw new Error("Recorded payments cannot be changed while editing a bill.");
    if (data.paidAmount > totals.grandTotal) throw new Error("Bill total cannot be less than payments already made.");
    if (purchase.payments.length > 0 && data.supplierId !== purchase.supplierId) throw new Error("Supplier cannot be changed after a payment has been recorded.");

    const supplier = await tx.supplier.findFirst({ where: { id: data.supplierId, pharmacyId } });
    if (!supplier || supplier.status !== "ACTIVE") throw new Error("Supplier is not active.");
    const duplicate = await tx.purchase.findFirst({ where: { supplierId: data.supplierId, invoiceNumber: data.invoiceNumber, id: { not: purchase.id } } });
    if (duplicate) throw new Error("Invoice number is already in use for this supplier.");

    const oldMedicineIds = [...new Set(purchase.items.map((item) => item.medicineId))];
    const newMedicineIds = [...new Set(data.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({ where: { id: { in: [...new Set([...oldMedicineIds, ...newMedicineIds])] } } });
    if (newMedicineIds.some((id) => !medicines.some((medicine) => medicine.id === id && medicine.active))) throw new Error("One or more medicines are invalid or inactive.");
    const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));

    const removals = new Map<string, { medicineId: string; quantity: number }>();
    for (const item of purchase.items) {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine) throw new Error("A medicine from this bill is no longer available.");
      const multiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      const quantity = (item.quantity + item.freeQuantity) * multiplier;
      const existing = removals.get(item.batchId);
      removals.set(item.batchId, { medicineId: item.medicineId, quantity: (existing?.quantity ?? 0) + quantity });
    }
    for (const [batchId, removal] of removals) {
      const batch = await tx.batch.findFirst({ where: { id: batchId, pharmacyId } });
      if (!batch) throw new Error("A batch from this purchase is no longer available.");
      const previousQuantity = batch.quantity + batch.freeQuantity;
      if (previousQuantity < removal.quantity) throw new Error(`Cannot edit this purchase: batch ${batch.batchNumber} has less stock than this bill added.`);
      const removeRegular = Math.min(batch.quantity, removal.quantity);
      const removeFree = removal.quantity - removeRegular;
      await tx.batch.update({ where: { id: batchId }, data: { quantity: batch.quantity - removeRegular, freeQuantity: batch.freeQuantity - removeFree } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: removal.medicineId, batchId, previousQuantity, quantityChange: -removal.quantity, newQuantity: previousQuantity - removal.quantity, reason: "PURCHASE_EDIT_REVERSAL", reference: purchase.id, userId: user.id === "temporary-admin" ? undefined : user.id } });
    }

    await tx.purchase.update({ where: { id: purchase.id }, data: { supplierId: data.supplierId, invoiceNumber: data.invoiceNumber, invoiceDate: data.invoiceDate, dueDate: data.dueDate, subtotal: totals.subtotal, discount: totals.discount, taxableAmount: totals.taxableAmount, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, roundOff: totals.roundOff, grandTotal: totals.grandTotal, balanceAmount: totals.balanceAmount } });
    await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });

    for (const [index, item] of data.items.entries()) {
      const medicine = medicineById.get(item.medicineId)!;
      const packMultiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      const stockQuantity = item.quantity * packMultiplier;
      const stockFreeQuantity = item.freeQuantity * packMultiplier;
      const batch = await tx.batch.findFirst({ where: { pharmacyId, medicineId: item.medicineId, batchNumber: item.batchNumber, purchasePrice: item.purchaseRate } });
      const nextQuantity = (batch?.quantity ?? 0) + stockQuantity;
      const nextFree = (batch?.freeQuantity ?? 0) + stockFreeQuantity;
      const savedBatch = batch
        ? await tx.batch.update({ where: { id: batch.id }, data: { expiryDate: item.expiryDate, purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, quantity: nextQuantity, freeQuantity: nextFree } })
        : await tx.batch.create({ data: { pharmacyId, medicineId: medicine.id, batchNumber: item.batchNumber, manufacturingDate: new Date(), expiryDate: item.expiryDate, purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, quantity: stockQuantity, freeQuantity: stockFreeQuantity } });
      await tx.purchaseItem.create({ data: { purchaseId: purchase.id, medicineId: medicine.id, batchId: savedBatch.id, expiryDate: item.expiryDate, quantity: item.quantity, freeQuantity: item.freeQuantity, purchaseRate: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice, discount: totals.lines[index].discount, gstPercentage: item.gstPercentage, lineTotal: totals.lines[index].lineTotal } });
      await tx.medicine.update({ where: { id: medicine.id }, data: { purchasePrice: item.purchaseRate, mrp: item.mrp, sellingPrice: item.sellingPrice } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: medicine.id, batchId: savedBatch.id, previousQuantity: batch ? batch.quantity + batch.freeQuantity : 0, quantityChange: stockQuantity + stockFreeQuantity, newQuantity: nextQuantity + nextFree, reason: "PURCHASE_EDIT", reference: purchase.id, userId: user.id === "temporary-admin" ? undefined : user.id } });
    }

    const oldSupplier = purchase.supplierId ? await tx.supplier.findFirst({ where: { id: purchase.supplierId, pharmacyId } }) : null;
    if (purchase.supplierId === data.supplierId && oldSupplier) {
      await tx.supplier.update({ where: { id: supplier.id }, data: { outstandingBalance: oldSupplier.outstandingBalance - purchase.balanceAmount + totals.balanceAmount } });
    } else {
      if (oldSupplier) await tx.supplier.update({ where: { id: oldSupplier.id }, data: { outstandingBalance: { decrement: purchase.balanceAmount } } });
      await tx.supplier.update({ where: { id: supplier.id }, data: { outstandingBalance: { increment: totals.balanceAmount } } });
    }
    const persistedUserId = user.id === "temporary-admin" ? undefined : user.id;
    await tx.auditLog.create({ data: { pharmacyId, action: "purchase.updated", entity: "Purchase", entityId: purchase.id, userId: persistedUserId, metadata: { grandTotal: totals.grandTotal } } });
    return tx.purchase.findUnique({ where: { id: purchase.id } });
  });
}

export async function deletePurchase(purchaseId: string) {
  const { pharmacyId, user } = await requirePharmacy();
  return runMongoTransaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, pharmacyId }, include: { items: true } });
    if (!purchase) throw new Error("Purchase bill not found.");
    const medicineIds = [...new Set(purchase.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({ where: { id: { in: medicineIds } } });
    const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    const removals = new Map<string, { medicineId: string; quantity: number }>();
    for (const item of purchase.items) {
      const medicine = medicineById.get(item.medicineId);
      if (!medicine) throw new Error("A medicine from this bill is no longer available.");
      const multiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      const quantity = (item.quantity + item.freeQuantity) * multiplier;
      const existing = removals.get(item.batchId);
      removals.set(item.batchId, { medicineId: item.medicineId, quantity: (existing?.quantity ?? 0) + quantity });
    }
    for (const [batchId, removal] of removals) {
      const batch = await tx.batch.findFirst({ where: { id: batchId, pharmacyId } });
      if (!batch) throw new Error("A batch from this purchase is no longer available.");
      const previousQuantity = batch.quantity + batch.freeQuantity;
      if (previousQuantity < removal.quantity) throw new Error(`Cannot delete this purchase: batch ${batch.batchNumber} has less stock than this bill added.`);
      const removeRegular = Math.min(batch.quantity, removal.quantity);
      const removeFree = removal.quantity - removeRegular;
      await tx.batch.update({ where: { id: batchId }, data: { quantity: batch.quantity - removeRegular, freeQuantity: batch.freeQuantity - removeFree } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: removal.medicineId, batchId, previousQuantity, quantityChange: -removal.quantity, newQuantity: previousQuantity - removal.quantity, reason: "PURCHASE_VOID", reference: purchase.id, userId: user.id === "temporary-admin" ? undefined : user.id } });
    }
    if (purchase.supplierId) await tx.supplier.update({ where: { id: purchase.supplierId }, data: { outstandingBalance: { decrement: purchase.balanceAmount } } });
    await tx.supplierPayment.updateMany({ where: { purchaseId: purchase.id }, data: { purchaseId: null } });
    await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
    const deleted = await tx.purchase.delete({ where: { id: purchase.id } });
    const persistedUserId = user.id === "temporary-admin" ? undefined : user.id;
    await tx.auditLog.create({ data: { pharmacyId, action: "purchase.deleted", entity: "Purchase", entityId: purchase.id, userId: persistedUserId, metadata: { grandTotal: purchase.grandTotal } } });
    return deleted;
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