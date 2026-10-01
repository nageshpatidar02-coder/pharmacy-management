import "server-only";
import { runMongoTransaction } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { saleSchema } from "@/lib/validations/sale";
function unitsPerPack(packSize: string | null | undefined) { const match = packSize?.match(/\d+/); return match ? Math.max(1, Number(match[0])) : 1; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function floorMoney(value: number) { return Math.floor((value + Number.EPSILON) * 100) / 100; }
function enforceNoLoss(item: { quantity: number; sellingPrice: number; discount: number }, batch: { purchasePrice: number }, medicine: { itemType: string; packSize: string | null }) {
  const packMultiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
  const purchasePricePerUnit = batch.purchasePrice / packMultiplier;
  if (item.sellingPrice + 0.000001 < purchasePricePerUnit) {
    throw new Error(`Selling price cannot be less than purchase price (₹${roundMoney(purchasePricePerUnit).toFixed(2)}).`);
  }
  const maxDiscount = floorMoney(Math.max(0, item.quantity * (item.sellingPrice - purchasePricePerUnit)));
  if (item.discount > maxDiscount + 0.001) {
    throw new Error(`Discount cannot exceed profit margin. Maximum allowed discount is ₹${maxDiscount.toFixed(2)}.`);
  }
}

export async function createSale(input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = saleSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const customer = data.customerId ? await tx.customer.findFirst({ where: { id: data.customerId, pharmacyId } }) : null;
    if (data.customerId && !customer) throw new Error("Customer not found.");
    const medicines = await tx.medicine.findMany({ where: { id: { in: data.items.map((item) => item.medicineId) }, active: true } });
    const batches = await tx.batch.findMany({ where: { id: { in: data.items.map((item) => item.batchId) }, pharmacyId } });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    let subtotal = 0; let discount = 0; let costAmount = 0;
    const rows: Array<{ item: typeof data.items[number]; batch: { id: string; quantity: number; freeQuantity: number; purchasePrice: number }; lineTotal: number; nextQuantity: number; nextFreeQuantity: number }> = [];
    for (const item of data.items) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      const batch = batchById.get(item.batchId);
      if (!medicine || !batch || batch.medicineId !== item.medicineId) throw new Error("Medicine or batch is invalid.");
      enforceNoLoss(item, batch, medicine);
      const availableStock = batch.quantity + batch.freeQuantity;
      if (availableStock < item.quantity) throw new Error(`Insufficient stock for ${medicine.name}.`);
      const regularUsed = Math.min(batch.quantity, item.quantity);
      const freeUsed = item.quantity - regularUsed;
      const lineTotal = Math.max(item.quantity * item.sellingPrice - item.discount, 0);
      subtotal += item.quantity * item.sellingPrice;
      discount += item.discount;
      const packMultiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      costAmount += item.quantity * (batch.purchasePrice / packMultiplier);
      rows.push({ item, batch, lineTotal, nextQuantity: batch.quantity - regularUsed, nextFreeQuantity: batch.freeQuantity - freeUsed });
      batchById.set(batch.id, { ...batch, quantity: batch.quantity - regularUsed, freeQuantity: batch.freeQuantity - freeUsed });
    }
    const grandTotal = roundMoney(Math.max(subtotal - discount, 0));
    if (data.paidAmount > grandTotal) throw new Error("Paid amount cannot exceed bill total.");
    const sale = await tx.sale.create({ data: { pharmacyId, customerId: data.customerId || null, invoiceNumber: data.invoiceNumber, subtotal, discount, grandTotal, paidAmount: data.paidAmount, balanceAmount: grandTotal - data.paidAmount, costAmount, paymentMethod: data.paidAmount > 0 ? data.paymentMethod : "CREDIT" } });
    for (const row of rows) { const previousTotal = row.batch.quantity + row.batch.freeQuantity; const nextTotal = row.nextQuantity + row.nextFreeQuantity; await tx.batch.update({ where: { id: row.batch.id }, data: { quantity: row.nextQuantity, freeQuantity: row.nextFreeQuantity } }); await tx.saleItem.create({ data: { saleId: sale.id, medicineId: row.item.medicineId, batchId: row.batch.id, quantity: row.item.quantity, sellingPrice: row.item.sellingPrice, costPrice: row.batch.purchasePrice, discount: row.item.discount, lineTotal: row.lineTotal } }); await tx.stockLedger.create({ data: { pharmacyId, medicineId: row.item.medicineId, batchId: row.batch.id, previousQuantity: previousTotal, quantityChange: -row.item.quantity, newQuantity: nextTotal, reason: "SALE", reference: sale.id } }); }
    if (customer) { await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: customer.outstandingBalance + sale.balanceAmount } }); if (data.paidAmount > 0) await tx.customerPayment.create({ data: { pharmacyId, customerId: customer.id, saleId: sale.id, amount: data.paidAmount, method: data.paymentMethod } }); }
    return sale;
  });
}

export async function updateSale(saleId: string, input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = saleSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, pharmacyId }, include: { items: true, payments: true } });
    if (!sale) throw new Error("Customer bill not found.");
    const duplicate = await tx.sale.findFirst({ where: { invoiceNumber: data.invoiceNumber, id: { not: sale.id } } });
    if (duplicate) throw new Error("Invoice number is already in use.");
    if (sale.payments.length > 0 && (data.customerId || null) !== sale.customerId) throw new Error("Customer cannot be changed after a payment has been recorded.");
    if (data.paidAmount !== sale.paidAmount) throw new Error("Recorded payments cannot be changed while editing a bill.");

    const oldCustomer = sale.customerId ? await tx.customer.findFirst({ where: { id: sale.customerId, pharmacyId } }) : null;
    const customer = data.customerId ? await tx.customer.findFirst({ where: { id: data.customerId, pharmacyId } }) : null;
    if (data.customerId && !customer) throw new Error("Customer not found.");

    const medicineIds = [...new Set(data.items.map((item) => item.medicineId))];
    const oldMedicineIds = [...new Set(sale.items.map((item) => item.medicineId))];
    const medicineLookupIds = [...new Set([...medicineIds, ...oldMedicineIds])];
    const medicines = await tx.medicine.findMany({ where: { id: { in: medicineLookupIds } } });
    if (medicineLookupIds.some((id) => !medicines.some((medicine) => medicine.id === id)) || medicineIds.some((id) => !medicines.some((medicine) => medicine.id === id && (medicine.active || oldMedicineIds.includes(id)))) ) throw new Error("One or more medicines are invalid or inactive.");
    const batchIds = [...new Set([...sale.items.map((item) => item.batchId), ...data.items.map((item) => item.batchId)])];
    const batches = await tx.batch.findMany({ where: { id: { in: batchIds }, pharmacyId } });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    const restoredByBatch = new Map<string, number>();
    for (const item of sale.items) restoredByBatch.set(item.batchId, (restoredByBatch.get(item.batchId) ?? 0) + item.quantity);
    for (const [batchId, quantity] of restoredByBatch) {
      const batch = batchById.get(batchId);
      if (!batch) throw new Error("A batch from this bill is no longer available.");
      const previousQuantity = batch.quantity + batch.freeQuantity;
      const nextQuantity = batch.quantity + quantity;
      await tx.batch.update({ where: { id: batchId }, data: { quantity: nextQuantity } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: batch.medicineId, batchId, previousQuantity, quantityChange: quantity, newQuantity: nextQuantity + batch.freeQuantity, reason: "SALE_EDIT_REVERSAL", reference: sale.id } });
    }

    const currentBatches = await tx.batch.findMany({ where: { id: { in: batchIds }, pharmacyId } });
    const currentBatchById = new Map(currentBatches.map((batch) => [batch.id, batch]));
    let subtotal = 0;
    let discount = 0;
    let costAmount = 0;
    const rows: Array<{ item: typeof data.items[number]; batch: (typeof currentBatches)[number]; lineTotal: number; nextQuantity: number; nextFreeQuantity: number }> = [];
    for (const item of data.items) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      const batch = currentBatchById.get(item.batchId);
      if (!medicine || !batch || batch.medicineId !== item.medicineId) throw new Error("Medicine or batch is invalid.");
      enforceNoLoss(item, batch, medicine);
      const availableStock = batch.quantity + batch.freeQuantity;
      if (availableStock < item.quantity) throw new Error(`Insufficient stock for ${medicine.name}.`);
      const regularUsed = Math.min(batch.quantity, item.quantity);
      const freeUsed = item.quantity - regularUsed;
      const lineTotal = Math.max(item.quantity * item.sellingPrice - item.discount, 0);
      subtotal += item.quantity * item.sellingPrice;
      discount += item.discount;
      const packMultiplier = medicine.itemType === "TABLET" || medicine.itemType === "CAPSULE" ? unitsPerPack(medicine.packSize) : 1;
      costAmount += item.quantity * (batch.purchasePrice / packMultiplier);
      rows.push({ item, batch, lineTotal, nextQuantity: batch.quantity - regularUsed, nextFreeQuantity: batch.freeQuantity - freeUsed });
      currentBatchById.set(batch.id, { ...batch, quantity: batch.quantity - regularUsed, freeQuantity: batch.freeQuantity - freeUsed });
    }
    const grandTotal = roundMoney(Math.max(subtotal - discount, 0));
    if (sale.paidAmount > grandTotal) throw new Error("Bill total cannot be less than payments already received.");

    await tx.sale.update({ where: { id: sale.id }, data: { customerId: data.customerId || null, invoiceNumber: data.invoiceNumber, subtotal, discount, grandTotal, balanceAmount: grandTotal - sale.paidAmount, costAmount, paymentMethod: data.paymentMethod } });
    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    for (const row of rows) {
      const previousTotal = row.batch.quantity + row.batch.freeQuantity;
      const nextTotal = row.nextQuantity + row.nextFreeQuantity;
      await tx.batch.update({ where: { id: row.batch.id }, data: { quantity: row.nextQuantity, freeQuantity: row.nextFreeQuantity } });
      await tx.saleItem.create({ data: { saleId: sale.id, medicineId: row.item.medicineId, batchId: row.batch.id, quantity: row.item.quantity, sellingPrice: row.item.sellingPrice, costPrice: row.batch.purchasePrice, discount: row.item.discount, lineTotal: row.lineTotal } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: row.item.medicineId, batchId: row.batch.id, previousQuantity: previousTotal, quantityChange: -row.item.quantity, newQuantity: nextTotal, reason: "SALE_EDIT", reference: sale.id } });
    }

    const newBalance = grandTotal - sale.paidAmount;
    if (sale.customerId === (data.customerId || null)) {
      if (customer && oldCustomer) await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: oldCustomer.outstandingBalance - sale.balanceAmount + newBalance } });
    } else {
      if (oldCustomer) await tx.customer.update({ where: { id: oldCustomer.id }, data: { outstandingBalance: { decrement: sale.balanceAmount } } });
      if (customer) await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: { increment: newBalance } } });
    }
    return tx.sale.findUnique({ where: { id: sale.id } });
  });
}

export async function deleteSale(saleId: string) {
  const { pharmacyId } = await requirePharmacy();
  return runMongoTransaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, pharmacyId }, include: { items: true } });
    if (!sale) throw new Error("Customer bill not found.");
    const batches = await tx.batch.findMany({ where: { id: { in: sale.items.map((item) => item.batchId) }, pharmacyId } });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const restoredByBatch = new Map<string, number>();
    for (const item of sale.items) restoredByBatch.set(item.batchId, (restoredByBatch.get(item.batchId) ?? 0) + item.quantity);
    for (const [batchId, quantity] of restoredByBatch) {
      const batch = batchById.get(batchId);
      if (!batch) throw new Error("A batch from this bill is no longer available.");
      const previousQuantity = batch.quantity + batch.freeQuantity;
      const nextQuantity = batch.quantity + quantity;
      await tx.batch.update({ where: { id: batchId }, data: { quantity: nextQuantity } });
      await tx.stockLedger.create({ data: { pharmacyId, medicineId: batch.medicineId, batchId, previousQuantity, quantityChange: quantity, newQuantity: nextQuantity + batch.freeQuantity, reason: "SALE_VOID", reference: sale.id } });
    }
    if (sale.customerId) await tx.customer.update({ where: { id: sale.customerId }, data: { outstandingBalance: { decrement: sale.balanceAmount } } });
    await tx.customerPayment.updateMany({ where: { saleId: sale.id }, data: { saleId: null } });
    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    return tx.sale.delete({ where: { id: sale.id } });
  });
}

export async function receiveSalePayment(saleId: string, input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const payment = input as { amount?: number; method?: string; reference?: string };
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payment amount.");
  if (!["CASH", "UPI", "CARD", "BANK", "CREDIT"].includes(payment.method ?? "")) throw new Error("Select a valid payment method.");
  return runMongoTransaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, pharmacyId } });
    if (!sale || !sale.customerId) throw new Error("Customer bill not found.");
    if (amount > sale.balanceAmount) throw new Error("Payment cannot exceed the remaining due.");
    const updatedSale = await tx.sale.update({ where: { id: sale.id }, data: { paidAmount: sale.paidAmount + amount, balanceAmount: sale.balanceAmount - amount, paymentMethod: payment.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT" } });
    await tx.customer.update({ where: { id: sale.customerId }, data: { outstandingBalance: { decrement: amount } } });
    await tx.customerPayment.create({ data: { pharmacyId, customerId: sale.customerId, saleId: sale.id, amount, method: payment.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT", reference: payment.reference?.trim() || null } });
    return updatedSale;
  });
}
