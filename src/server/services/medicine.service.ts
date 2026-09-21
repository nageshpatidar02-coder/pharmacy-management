import "server-only";

import { ObjectId } from "mongodb";

import { prisma } from "@/server/db/prisma";
import { medicineSchema, categorySchema, manufacturerSchema, batchSchema } from "@/lib/validations/medicine";

export async function listMedicines(search = "") {
  return prisma.medicine.findMany({ where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { genericName: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }, { barcode: { contains: search, mode: "insensitive" } }] } : undefined, include: { category: true, manufacturer: true, batches: { select: { quantity: true, freeQuantity: true, expiryDate: true } } }, orderBy: { name: "asc" } });
}

function ensureObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid medicine ID.");
}

function medicineData(input: unknown) {
  const data = medicineSchema.parse(input);
  return { ...data, categoryId: data.categoryId || null, manufacturerId: data.manufacturerId || null, barcode: data.barcode || null };
}

async function validateReferences(data: ReturnType<typeof medicineData>) {
  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
    if (!category) throw new Error("Selected category is invalid or inactive.");
  }
  if (data.manufacturerId) {
    const manufacturer = await prisma.manufacturer.findFirst({ where: { id: data.manufacturerId, active: true }, select: { id: true } });
    if (!manufacturer) throw new Error("Selected manufacturer is invalid or inactive.");
  }
}

export async function createMedicine(input: unknown) {
  const data = medicineData(input);
  await validateReferences(data);
  const duplicateSku = await prisma.medicine.findFirst({ where: { sku: data.sku }, select: { id: true } });
  if (duplicateSku) throw new Error("SKU is already in use.");
  if (data.barcode) {
    const duplicateBarcode = await prisma.medicine.findFirst({ where: { barcode: data.barcode }, select: { id: true } });
    if (duplicateBarcode) throw new Error("Barcode is already in use.");
  }
  return prisma.medicine.create({ data });
}

export async function updateMedicine(id: string, input: unknown, userId?: string) {
  ensureObjectId(id);
  const data = medicineData(input);
  await validateReferences(data);
  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new Error("Medicine not found.");

  const duplicateSku = await prisma.medicine.findFirst({ where: { sku: data.sku, NOT: { id } }, select: { id: true } });
  if (duplicateSku) throw new Error("SKU is already in use.");
  if (data.barcode) {
    const duplicateBarcode = await prisma.medicine.findFirst({ where: { barcode: data.barcode, NOT: { id } }, select: { id: true } });
    if (duplicateBarcode) throw new Error("Barcode is already in use.");
  }

  const updated = await prisma.medicine.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { action: "medicine.updated", entity: "Medicine", entityId: id, userId: userId === "temporary-admin" ? undefined : userId, metadata: { before: { name: existing.name, sku: existing.sku, mrp: existing.mrp, sellingPrice: existing.sellingPrice, gstPercentage: existing.gstPercentage, active: existing.active }, after: { name: updated.name, sku: updated.sku, mrp: updated.mrp, sellingPrice: updated.sellingPrice, gstPercentage: updated.gstPercentage, active: updated.active } } } });
  return updated;
}
export async function listCategories() { return prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }); }
export async function listManufacturers() { return prisma.manufacturer.findMany({ where: { active: true }, orderBy: { name: "asc" } }); }
export async function listBatches() { return prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } }); }
export { categorySchema, manufacturerSchema, batchSchema };
