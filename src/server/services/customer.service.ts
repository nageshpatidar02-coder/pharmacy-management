import "server-only";
import { prisma } from "@/server/db/prisma";
import { customerSchema } from "@/lib/validations/customer";
export async function listCustomers(search = "") {
  const term = search.trim();
  return prisma.customer.findMany({
    where: term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { mobile: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] } : undefined,
    orderBy: { name: "asc" },
  });
}
export async function createCustomer(input: unknown) { const data = customerSchema.parse(input); return prisma.customer.create({ data: { ...data, mobile: data.mobile || null, email: data.email || null, address: data.address || null, outstandingBalance: data.openingBalance } }); }
export async function updateCustomer(id: string, input: unknown) { const data = customerSchema.parse(input); return prisma.customer.update({ where: { id }, data: { name: data.name, mobile: data.mobile || null, email: data.email || null, address: data.address || null } }); }
export async function deleteCustomer(id: string) { return prisma.customer.update({ where: { id }, data: { status: "INACTIVE" } }); }
