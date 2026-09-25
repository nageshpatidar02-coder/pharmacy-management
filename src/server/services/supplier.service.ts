import "server-only";

import { prisma } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { supplierSchema } from "@/lib/validations/supplier";

export async function listSuppliers(search = "") {
  const { pharmacyId } = await requirePharmacy();
  const term = search.trim();
  return prisma.supplier.findMany({ where: { pharmacyId, ...(term ? { OR: [{ businessName: { contains: term, mode: "insensitive" } }, { contactPerson: { contains: term, mode: "insensitive" } }, { mobile: { contains: term, mode: "insensitive" } }, { gstin: { contains: term, mode: "insensitive" } }] } : {}) }, include: { _count: { select: { purchases: true } } }, orderBy: { businessName: "asc" } });
}

function nullableSupplierData(data: ReturnType<typeof supplierSchema.parse>) {
  return { ...data, contactPerson: data.contactPerson || null, mobile: data.mobile || null, email: data.email || null, address: data.address || null, gstin: data.gstin || null, dlNumber: data.dlNumber || null, paymentTerms: data.paymentTerms || null, city: data.city || null, state: data.state || null };
}

export async function createSupplier(input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = supplierSchema.parse(input);
  return prisma.supplier.create({ data: { pharmacyId, ...nullableSupplierData(data), outstandingBalance: data.openingBalance } });
}

export async function updateSupplier(id: string, input: unknown) {
  const { pharmacyId } = await requirePharmacy();
  const data = supplierSchema.parse(input);
  const supplier = await prisma.supplier.findFirst({ where: { id, pharmacyId }, select: { id: true } });
  if (!supplier) throw new Error("Supplier not found.");
  return prisma.supplier.update({ where: { id: supplier.id }, data: nullableSupplierData(data) });
}

export async function deleteSupplier(id: string) {
  const { pharmacyId } = await requirePharmacy();
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id, pharmacyId }, select: { id: true } });
    if (!supplier) throw new Error("Supplier not found.");
    const purchases = await tx.purchase.findMany({ where: { pharmacyId, supplierId: id }, select: { id: true } });
    const purchaseIds = purchases.map((purchase) => purchase.id);
    if (purchaseIds.length) {
      await tx.supplierPayment.deleteMany({ where: { pharmacyId, supplierId: id } });
      await tx.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
      await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
    }
    await tx.supplier.delete({ where: { id: supplier.id } });
    return { id };
  });
}
