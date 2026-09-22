import "server-only";

import { ObjectId } from "mongodb";

import { prisma, runMongoTransaction } from "@/server/db/prisma";
import { medicineSchema, categorySchema, manufacturerSchema, batchSchema } from "@/lib/validations/medicine";

export async function listMedicines(search = "") {
  const itemTypes = ["TABLET", "CAPSULE", "SYRUP", "INJECTION", "DROPS", "OINTMENT", "EQUIPMENT", "OTHER"] as const;
  const normalized = search.trim().toUpperCase();
  const typeFilter = itemTypes.includes(normalized as (typeof itemTypes)[number]) ? [{ itemType: { equals: normalized as (typeof itemTypes)[number] } }] : [];
  return prisma.medicine.findMany({ where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { genericName: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }, { barcode: { contains: search, mode: "insensitive" } }, ...typeFilter, { category: { name: { contains: search, mode: "insensitive" } } }, { manufacturer: { name: { contains: search, mode: "insensitive" } } }] } : undefined, include: { category: true, manufacturer: true, batches: { select: { quantity: true, freeQuantity: true, expiryDate: true } } }, orderBy: { name: "asc" } });
}

function ensureObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid medicine ID.");
}

function medicineData(input: unknown) {
  const data = medicineSchema.parse(input);
  return { ...data, categoryId: data.categoryId || null, manufacturerId: data.manufacturerId || null, barcode: data.barcode || null };
}

type MedicineData = ReturnType<typeof medicineData>;
type PersistedMedicineData = Omit<MedicineData, "initialQuantity" | "quantity" | "batchNumber" | "expiryDate">;

async function validateReferences(data: Pick<MedicineData, "categoryId" | "manufacturerId">) {
  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
    if (!category) throw new Error("Selected category is invalid or inactive.");
  }
  if (data.manufacturerId) {
    const manufacturer = await prisma.manufacturer.findFirst({ where: { id: data.manufacturerId, active: true }, select: { id: true } });
    if (!manufacturer) throw new Error("Selected manufacturer is invalid or inactive.");
  }
}

function persistedMedicineData(data: MedicineData): PersistedMedicineData {
  const { initialQuantity: _initialQuantity, quantity: _quantity, batchNumber: _batchNumber, expiryDate: _expiryDate, ...persisted } = data;
  return persisted;
}

export async function createMedicine(input: unknown, userId?: string) {
  const data = medicineData(input);
  await validateReferences(data);
  const duplicateSku = await prisma.medicine.findFirst({ where: { sku: data.sku }, select: { id: true } });
  if (duplicateSku) throw new Error("SKU is already in use.");
  if (data.barcode) {
    const duplicateBarcode = await prisma.medicine.findFirst({ where: { barcode: data.barcode }, select: { id: true } });
    if (duplicateBarcode) throw new Error("Barcode is already in use.");
  }
  const { initialQuantity, quantity: legacyQuantity, batchNumber, expiryDate } = data;
  const medicineFields = persistedMedicineData(data);
  const openingQuantity = initialQuantity ?? legacyQuantity ?? 0;
  if (openingQuantity > 0 && (!batchNumber || !expiryDate)) throw new Error("Batch number and expiry date are required when opening stock is entered.");
  return runMongoTransaction(async (tx) => {
    const medicine = await tx.medicine.create({ data: medicineFields });
    if (openingQuantity > 0) {
      const expiry = new Date(expiryDate!);
      if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) throw new Error("Opening batch expiry must be a future date.");
      const batch = await tx.batch.create({ data: { medicineId: medicine.id, batchNumber: batchNumber!, manufacturingDate: new Date(), expiryDate: expiry, purchasePrice: medicine.purchasePrice, mrp: medicine.mrp, sellingPrice: medicine.sellingPrice, quantity: openingQuantity, freeQuantity: 0 } });
      await tx.stockLedger.create({ data: { medicineId: medicine.id, batchId: batch.id, previousQuantity: 0, quantityChange: openingQuantity, newQuantity: openingQuantity, reason: "OPENING_STOCK", reference: "MEDICINE_CREATE", userId: userId === "temporary-admin" ? undefined : userId } });
    }
    return medicine;
  });
}

export async function updateMedicine(id: string, input: unknown, userId?: string) {
  ensureObjectId(id);
  const rawData = medicineData(input);
  const data = persistedMedicineData(rawData);
  await validateReferences(data);
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new Error("Medicine not found.");

  const duplicateSku = await prisma.medicine.findFirst({ where: { sku: data.sku, NOT: { id } }, select: { id: true } });
  if (duplicateSku) throw new Error("SKU is already in use.");
  if (data.barcode) {
    const duplicateBarcode = await prisma.medicine.findFirst({ where: { barcode: data.barcode, NOT: { id } }, select: { id: true } });
    if (duplicateBarcode) throw new Error("Barcode is already in use.");
  }

  const openingQuantity = rawData.initialQuantity ?? rawData.quantity ?? 0;
  if (openingQuantity > 0 && (!rawData.batchNumber || !rawData.expiryDate)) {
    throw new Error("Batch number and expiry date are required when opening stock is entered.");
  }

  return runMongoTransaction(async (tx) => {
    const updated = await tx.medicine.update({ where: { id }, data });
    if (rawData.batchNumber && rawData.expiryDate) {
      const expiry = new Date(rawData.expiryDate);
      if (Number.isNaN(expiry.getTime())) throw new Error("Enter a valid batch expiry date.");
      const currentBatch = await tx.batch.findFirst({
        where: { medicineId: id, batchNumber: rawData.batchNumber },
      });
      const expiryChanged = !currentBatch || currentBatch.expiryDate.getTime() !== expiry.getTime();
      if (expiryChanged && expiry <= new Date()) {
        throw new Error("Batch expiry must be a future date when it is changed.");
      }
      const nextQuantity = currentBatch ? Math.max(currentBatch.quantity, openingQuantity) : openingQuantity;
      const savedBatch = currentBatch
        ? await tx.batch.update({
            where: { id: currentBatch.id },
            data: {
              expiryDate: expiry,
              purchasePrice: updated.purchasePrice,
              mrp: updated.mrp,
              sellingPrice: updated.sellingPrice,
              quantity: nextQuantity,
            },
          })
        : await tx.batch.create({
            data: {
              medicineId: id,
              batchNumber: rawData.batchNumber,
              manufacturingDate: new Date(),
              expiryDate: expiry,
              purchasePrice: updated.purchasePrice,
              mrp: updated.mrp,
              sellingPrice: updated.sellingPrice,
              quantity: openingQuantity,
              freeQuantity: 0,
            },
          });
      if (!currentBatch && openingQuantity > 0) {
        await tx.stockLedger.create({
          data: {
            medicineId: id,
            batchId: savedBatch.id,
            previousQuantity: 0,
            quantityChange: openingQuantity,
            newQuantity: openingQuantity,
            reason: "OPENING_STOCK",
            reference: "MEDICINE_UPDATE",
            userId: userId === "temporary-admin" ? undefined : userId,
          },
        });
      }
    }
    await tx.auditLog.create({
      data: {
        action: "medicine.updated",
        entity: "Medicine",
        entityId: id,
        userId: userId === "temporary-admin" ? undefined : userId,
        metadata: {
          before: { name: existing.name, sku: existing.sku, mrp: existing.mrp, sellingPrice: existing.sellingPrice, gstPercentage: existing.gstPercentage, active: existing.active },
          after: { name: updated.name, sku: updated.sku, mrp: updated.mrp, sellingPrice: updated.sellingPrice, gstPercentage: updated.gstPercentage, active: updated.active },
        },
      },
    });
    return updated;
  });
}

export async function deleteMedicine(id: string) {
  ensureObjectId(id);
  return runMongoTransaction(async (tx) => {
    const medicine = await tx.medicine.findUnique({ where: { id }, select: { id: true } });
    if (!medicine) throw new Error("Medicine not found.");
    const batches = await tx.batch.findMany({ where: { medicineId: id }, select: { id: true } });
    const batchIds = batches.map((batch) => batch.id);
    if (batchIds.length) {
      await tx.stockLedger.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.saleItem.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.purchaseItem.deleteMany({ where: { batchId: { in: batchIds } } });
      await tx.batch.deleteMany({ where: { id: { in: batchIds } } });
    }
    await tx.stockLedger.deleteMany({ where: { medicineId: id } });
    await tx.saleItem.deleteMany({ where: { medicineId: id } });
    await tx.purchaseItem.deleteMany({ where: { medicineId: id } });
    await tx.medicine.delete({ where: { id } });
    return { id };
  });
}
export async function listCategories() { return prisma.category.findMany({ where:  { active: true }, orderBy: { name: "asc" } }); }
export async function listManufacturers() { return prisma.manufacturer.findMany({ where: { active: true }, orderBy: { name: "asc" } }); }
export async function listBatches() { return prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } }); }
export { categorySchema, manufacturerSchema, batchSchema };
