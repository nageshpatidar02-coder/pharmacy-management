import "server-only";

import { prisma } from "@/server/db/prisma";
import { supplierSchema } from "@/lib/validations/supplier";

export async function listSuppliers(search = "") {
  return prisma.supplier.findMany({ where: search ? { businessName: { contains: search, mode: "insensitive" } } : undefined, include: { _count: { select: { purchases: true } } }, orderBy: { businessName: "asc" } });
}

export async function createSupplier(input: unknown) {
  const data = supplierSchema.parse(input);
  return prisma.supplier.create({ data: { ...data, contactPerson: data.contactPerson || null, mobile: data.mobile || null, email: data.email || null, address: data.address || null, gstin: data.gstin || null, paymentTerms: data.paymentTerms || null, outstandingBalance: data.openingBalance } });
}

export async function updateSupplier(id: string, input: unknown) {
  const data = supplierSchema.parse(input);
  return prisma.supplier.update({ where: { id }, data: { ...data, contactPerson: data.contactPerson || null, mobile: data.mobile || null, email: data.email || null, address: data.address || null, gstin: data.gstin || null, paymentTerms: data.paymentTerms || null } });
}
