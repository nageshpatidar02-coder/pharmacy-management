import "server-only";

import { prisma, runMongoTransaction } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { stockAdjustmentSchema } from "@/lib/validations/medicine";

export async function getInventorySummary(search = "") {
  const { pharmacyId } = await requirePharmacy();
  const term = search.trim();
  const medicineSelect = { id: true, name: true, genericName: true, itemType: true, unit: true, packSize: true, minimumStock: true, active: true } as const;
  const [matchingMedicines, settings] = await Promise.all([
    term
      ? prisma.medicine.findMany({
          where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { genericName: { contains: term, mode: "insensitive" } }] },
          select: medicineSelect,
        })
      : Promise.resolve(null),
    prisma.pharmacySettings.findUnique({ where: { pharmacyId } }),
  ]);
  const batches = await prisma.batch.findMany({
    where: {
      pharmacyId,
      ...(term
        ? {
            OR: [
              { batchNumber: { contains: term, mode: "insensitive" as const } },
              { medicineId: { in: (matchingMedicines ?? []).map((medicine) => medicine.id) } },
            ],
          }
        : {}),
    },
    orderBy: { expiryDate: "asc" },
  });
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: batches.map((batch) => batch.medicineId) } },
    select: medicineSelect,
  });
  const medicinesById = new Map(medicines.map((medicine) => [medicine.id, medicine]));
  const validBatches = batches.flatMap((batch) => {
    const medicine = medicinesById.get(batch.medicineId);
    return medicine ? [{ ...batch, medicine }] : [];
  });
  const threshold = settings?.expiryWarningDays ?? 90;
  const now = new Date(); const warningDate = new Date(now.getTime() + threshold * 86400000);
  return { batches: validBatches, threshold, totalStock: validBatches.reduce((sum, batch) => sum + batch.quantity + batch.freeQuantity, 0), stockValue: validBatches.reduce((sum, batch) => sum + batch.quantity * batch.purchasePrice, 0), lowStock: validBatches.filter((batch) => batch.quantity + batch.freeQuantity <= batch.medicine.minimumStock), expired: validBatches.filter((batch) => batch.expiryDate < now), nearExpiry: validBatches.filter((batch) => batch.expiryDate >= now && batch.expiryDate <= warningDate) };
}

export async function adjustStock(input: unknown, userId: string) {
  const { pharmacyId } = await requirePharmacy();
  const data = stockAdjustmentSchema.parse(input);
  return runMongoTransaction(async (tx) => {
    const batch = await tx.batch.findFirst({ where: { id: data.batchId, pharmacyId } });
    if (!batch) throw new Error("Batch not found");
    const newQuantity = batch.quantity + data.quantityChange;
    if (newQuantity < 0) throw new Error("Stock cannot become negative");
    const updated = await tx.batch.update({ where: { id: batch.id }, data: { quantity: newQuantity } });
    await tx.stockLedger.create({ data: { pharmacyId, medicineId: batch.medicineId, batchId: batch.id, previousQuantity: batch.quantity, quantityChange: data.quantityChange, newQuantity, reason: data.reason, reference: data.reference || null, userId } });
    return updated;
  });
}
