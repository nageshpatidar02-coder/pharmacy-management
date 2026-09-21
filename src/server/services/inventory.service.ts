import "server-only";

import { prisma, runMongoTransaction } from "@/server/db/prisma";
import { stockAdjustmentSchema } from "@/lib/validations/medicine";

export async function getInventorySummary() {
  const [batches, settings] = await Promise.all([prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } }), prisma.pharmacySettings.findUnique({ where: { key: "singleton" } })]);
  const threshold = settings?.expiryWarningDays ?? 90;
  const now = new Date(); const warningDate = new Date(now.getTime() + threshold * 86400000);
  return { batches, threshold, totalStock: batches.reduce((sum, batch) => sum + batch.quantity + batch.freeQuantity, 0), stockValue: batches.reduce((sum, batch) => sum + batch.quantity * batch.purchasePrice, 0), lowStock: batches.filter((batch) => batch.quantity + batch.freeQuantity <= batch.medicine.minimumStock), expired: batches.filter((batch) => batch.expiryDate < now), nearExpiry: batches.filter((batch) => batch.expiryDate >= now && batch.expiryDate <= warningDate) };
}

export async function adjustStock(input: unknown, userId: string) {
  const data = stockAdjustmentSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id: data.batchId } });
    if (!batch) throw new Error("Batch not found");
    const newQuantity = batch.quantity + data.quantityChange;
    if (newQuantity < 0) throw new Error("Stock cannot become negative");
    const updated = await tx.batch.update({ where: { id: batch.id }, data: { quantity: newQuantity } });
    await tx.stockLedger.create({ data: { medicineId: batch.medicineId, batchId: batch.id, previousQuantity: batch.quantity, quantityChange: data.quantityChange, newQuantity, reason: data.reason, reference: data.reference || null, userId: userId === "temporary-admin" ? undefined : userId } });
    return updated;
  });
}
