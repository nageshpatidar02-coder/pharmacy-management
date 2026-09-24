import "server-only";
import { runMongoTransaction } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { saleSchema } from "@/lib/validations/sale";
function unitsPerPack(packSize: string | null | undefined) { const match = packSize?.match(/\d+/); return match ? Math.max(1, Number(match[0])) : 1; }
export async function createSale(input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = saleSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const customer = data.customerId ? await tx.customer.findFirst({ where: { id: data.customerId, pharmacyId } }) : null;
    if (data.customerId && !customer) throw new Error("Customer not found.");
    const medicines = await tx.medicine.findMany({ where: { id: { in: data.items.map((item) => item.medicineId) }, active: true } });
    const batches = await tx.batch.findMany({ where: { id: { in: data.items.map((item) => item.batchId) }, pharmacyId } });
    let subtotal = 0; let discount = 0; let costAmount = 0;
    const rows: Array<{ item: typeof data.items[number]; batch: { id: string; quantity: number; freeQuantity: number; purchasePrice: number }; lineTotal: number; nextQuantity: number; nextFreeQuantity: number }> = [];
    for (const item of data.items) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      const batch = batches.find((entry) => entry.id === item.batchId);
      if (!medicine || !batch || batch.medicineId !== item.medicineId) throw new Error("Medicine or batch is invalid.");
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
    }
    const grandTotal = Math.round(Math.max(subtotal - discount, 0));
    if (data.paidAmount > grandTotal) throw new Error("Paid amount cannot exceed bill total.");
    const sale = await tx.sale.create({ data: { pharmacyId, customerId: data.customerId || null, invoiceNumber: data.invoiceNumber, subtotal, discount, grandTotal, paidAmount: data.paidAmount, balanceAmount: grandTotal - data.paidAmount, costAmount, paymentMethod: data.paymentMethod } });
    for (const row of rows) { const previousTotal = row.batch.quantity + row.batch.freeQuantity; const nextTotal = row.nextQuantity + row.nextFreeQuantity; await tx.batch.update({ where: { id: row.batch.id }, data: { quantity: row.nextQuantity, freeQuantity: row.nextFreeQuantity } }); await tx.saleItem.create({ data: { saleId: sale.id, medicineId: row.item.medicineId, batchId: row.batch.id, quantity: row.item.quantity, sellingPrice: row.item.sellingPrice, costPrice: row.batch.purchasePrice, discount: row.item.discount, lineTotal: row.lineTotal } }); await tx.stockLedger.create({ data: { pharmacyId, medicineId: row.item.medicineId, batchId: row.batch.id, previousQuantity: previousTotal, quantityChange: -row.item.quantity, newQuantity: nextTotal, reason: "SALE", reference: sale.id } }); }
    if (customer) { await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: customer.outstandingBalance + sale.balanceAmount } }); if (data.paidAmount > 0) await tx.customerPayment.create({ data: { pharmacyId, customerId: customer.id, saleId: sale.id, amount: data.paidAmount, method: data.paymentMethod } }); }
    return sale;
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
    const updatedSale = await tx.sale.update({ where: { id: sale.id }, data: { paidAmount: sale.paidAmount + amount, balanceAmount: sale.balanceAmount - amount } });
    await tx.customer.update({ where: { id: sale.customerId }, data: { outstandingBalance: { decrement: amount } } });
    await tx.customerPayment.create({ data: { pharmacyId, customerId: sale.customerId, saleId: sale.id, amount, method: payment.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT", reference: payment.reference?.trim() || null } });
    return updatedSale;
  });
}
