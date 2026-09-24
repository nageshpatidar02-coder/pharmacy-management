import "server-only";

import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/auth";
import { registrationSchema } from "@/lib/validations/auth";

export async function registerPharmacy(input: unknown) {
  const data = registrationSchema.parse(input);
  const email = data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("An account with this email already exists.");

  const passwordHash = await hashPassword(data.password);
  const role = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (!role) throw new Error("The administrator role is not configured.");

  return prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: {
        name: data.pharmacyName,
        ownerName: data.ownerName,
        email,
        phone: data.phone,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        gstin: data.gstin || null,
        drugLicenseNumber: data.drugLicenseNumber || null,
      },
    });
    const user = await tx.user.create({
      data: {
        pharmacyId: pharmacy.id,
        name: data.ownerName,
        email,
        passwordHash,
        roleId: role.id,
      },
    });
    await tx.pharmacySettings.create({
      data: {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        address: pharmacy.address,
        mobile: pharmacy.phone,
        email: pharmacy.email,
        gstin: pharmacy.gstin,
        drugLicenseNo: pharmacy.drugLicenseNumber,
      },
    });
    return user;
  });
}
