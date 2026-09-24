import "server-only";
import { prisma } from "@/server/db/prisma";
import { requirePharmacy } from "@/server/auth/auth";
import { customerSchema } from "@/lib/validations/customer";
export async function listCustomers(search = "") {
  const { pharmacyId } = await requirePharmacy();
  const term = search.trim();
  return prisma.customer.findMany({
    where: { pharmacyId, ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { mobile: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" },
  });
}
export async function createCustomer(input: unknown) { const { pharmacyId } = await requirePharmacy(); const data = customerSchema.parse(input); return prisma.customer.create({ data: { pharmacyId, ...data, mobile: data.mobile || null, email: data.email || null, address: data.address || null, outstandingBalance: data.openingBalance } }); }
export async function updateCustomer(id: string, input: unknown) { const { pharmacyId } = await requirePharmacy(); const data = customerSchema.parse(input); const customer = await prisma.customer.findFirst({ where: { id, pharmacyId } }); if (!customer) throw new Error("Customer not found."); return prisma.customer.update({ where: { id: customer.id }, data: { name: data.name, mobile: data.mobile || null, email: data.email || null, address: data.address || null } }); }
export async function deleteCustomer(id: string) { const { pharmacyId } = await requirePharmacy(); const customer = await prisma.customer.findFirst({ where: { id, pharmacyId } }); if (!customer) throw new Error("Customer not found."); return prisma.customer.update({ where: { id: customer.id }, data: { status: "INACTIVE" } }); }
