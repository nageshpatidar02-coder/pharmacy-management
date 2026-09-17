import "server-only";

import { prisma } from "@/server/db/prisma";
import { medicineSchema, categorySchema, manufacturerSchema, batchSchema } from "@/lib/validations/medicine";

export async function listMedicines(search = "") {
  return prisma.medicine.findMany({ where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { genericName: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] } : undefined, include: { category: true, manufacturer: true, batches: { select: { quantity: true, freeQuantity: true, expiryDate: true } } }, orderBy: { name: "asc" } });
}

export async function createMedicine(input: unknown) { const data = medicineSchema.parse(input); return prisma.medicine.create({ data: { ...data, categoryId: data.categoryId || null, manufacturerId: data.manufacturerId || null, barcode: data.barcode || null } }); }
export async function updateMedicine(id: string, input: unknown) { const data = medicineSchema.parse(input); return prisma.medicine.update({ where: { id }, data: { ...data, categoryId: data.categoryId || null, manufacturerId: data.manufacturerId || null, barcode: data.barcode || null } }); }
export async function listCategories() { return prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }); }
export async function listManufacturers() { return prisma.manufacturer.findMany({ where: { active: true }, orderBy: { name: "asc" } }); }
export async function listBatches() { return prisma.batch.findMany({ include: { medicine: true }, orderBy: { expiryDate: "asc" } }); }
export { categorySchema, manufacturerSchema, batchSchema };
