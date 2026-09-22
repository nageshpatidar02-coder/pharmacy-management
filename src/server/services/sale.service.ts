import "server-only";
import { runMongoTransaction } from "@/server/db/prisma";
import { saleSchema } from "@/lib/validations/sale";
export async function createSale(input: unknown) {
  const data = saleSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const customer = data.customerId ? await tx.customer.findUnique({ where: { id: data.customerId } }) : null;
    if (data.customerId && !customer) throw new Error("Customer not found.");
    const medicines = await tx.medicine.findMany({ where: { id: { in: data.items.map((item) => item.medicineId) }, active: true } });
    let subtotal = 0; let discount = 0; let costAmount = 0;
    const rows: Array<{ item: typeof data.items[number]; batch: { id: string; quantity: number; purchasePrice: number }; lineTotal: number }> = [];
    for (const item of data.items) {
      const medicine = medicines.find((entry) => entry.id === item.medicineId);
      const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
      if (!medicine || !batch || batch.medicineId !== item.medicineId) throw new Error("Medicine or batch is invalid.");
      if (batch.quantity < item.quantity) throw new Error(`Insufficient stock for ${medicine.name}.`);
      const lineTotal = Math.max(item.quantity * item.sellingPrice - item.discount, 0); subtotal += item.quantity * item.sellingPrice; discount += item.discount; costAmount += item.quantity * batch.purchasePrice; rows.push({ item, batch, lineTotal });
    }
    const grandTotal = Math.round(Math.max(subtotal - discount, 0));
    if (data.paidAmount > grandTotal) throw new Error("Paid amount cannot exceed bill total.");
    const sale = await tx.sale.create({ data: { customerId: data.customerId || null, invoiceNumber: data.invoiceNumber, subtotal, discount, grandTotal, paidAmount: data.paidAmount, balanceAmount: grandTotal - data.paidAmount, costAmount } });
    for (const row of rows) { await tx.batch.update({ where: { id: row.batch.id }, data: { quantity: row.batch.quantity - row.item.quantity } }); await tx.saleItem.create({ data: { saleId: sale.id, medicineId: row.item.medicineId, batchId: row.batch.id, quantity: row.item.quantity, sellingPrice: row.item.sellingPrice, costPrice: row.batch.purchasePrice, discount: row.item.discount, lineTotal: row.lineTotal } }); await tx.stockLedger.create({ data: { medicineId: row.item.medicineId, batchId: row.batch.id, previousQuantity: row.batch.quantity, quantityChange: -row.item.quantity, newQuantity: row.batch.quantity - row.item.quantity, reason: "SALE", reference: sale.id } }); }
    if (customer) { await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: customer.outstandingBalance + sale.balanceAmount } }); if (data.paidAmount > 0) await tx.customerPayment.create({ data: { customerId: customer.id, saleId: sale.id, amount: data.paidAmount, method: data.paymentMethod } }); }
    return sale;
  });
}

export async function receiveSalePayment(saleId: string, input: unknown) {
  const payment = input as { amount?: number; method?: string; reference?: string };
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid payment amount.");
  if (!["CASH", "UPI", "CARD", "BANK", "CREDIT"].includes(payment.method ?? "")) throw new Error("Select a valid payment method.");
  return runMongoTransaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale || !sale.customerId) throw new Error("Customer bill not found.");
    if (amount > sale.balanceAmount) throw new Error("Payment cannot exceed the remaining due.");
    const updatedSale = await tx.sale.update({ where: { id: sale.id }, data: { paidAmount: sale.paidAmount + amount, balanceAmount: sale.balanceAmount - amount } });
    await tx.customer.update({ where: { id: sale.customerId }, data: { outstandingBalance: { decrement: amount } } });
    await tx.customerPayment.create({ data: { customerId: sale.customerId, saleId: sale.id, amount, method: payment.method as "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT", reference: payment.reference?.trim() || null } });
    return updatedSale;
  });
}
