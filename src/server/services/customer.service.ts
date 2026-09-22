import "server-only";
import { prisma } from "@/server/db/prisma";
import { customerSchema } from "@/lib/validations/customer";
export async function listCustomers() { return prisma.customer.findMany({ orderBy: { name: "asc" } }); }
export async function createCustomer(input: unknown) { const data = customerSchema.parse(input); return prisma.customer.create({ data: { ...data, mobile: data.mobile || null, email: data.email || null, address: data.address || null, outstandingBalance: data.openingBalance } }); }
export async function updateCustomer(id: string, input: unknown) { const data = customerSchema.parse(input); return prisma.customer.update({ where: { id }, data: { name: data.name, mobile: data.mobile || null, email: data.email || null, address: data.address || null } }); }
