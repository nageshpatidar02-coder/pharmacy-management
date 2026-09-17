import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissionDefinitions = [
  ["dashboard.view", "View the dashboard"], ["medicine.view", "View medicines"], ["medicine.create", "Create medicines"], ["medicine.update", "Update medicines"], ["medicine.delete", "Delete medicines"], ["sales.view", "View sales"], ["sales.create", "Create sales"], ["purchase.view", "View purchases"], ["purchase.create", "Create purchases"], ["inventory.view", "View inventory"], ["inventory.adjust", "Adjust inventory"], ["customers.view", "View customers"], ["suppliers.view", "View suppliers"], ["reports.view", "View reports"], ["settings.manage", "Manage pharmacy settings"], ["users.manage", "Manage users"],
] as const;

const rolePermissions: Record<RoleName, string[]> = {
  SUPER_ADMIN: permissionDefinitions.map(([key]) => key),
  ADMIN: permissionDefinitions.map(([key]) => key).filter((key) => key !== "users.manage"),
  PHARMACIST: ["dashboard.view", "medicine.view", "inventory.view", "inventory.adjust", "sales.view", "sales.create", "customers.view"],
  CASHIER: ["dashboard.view", "sales.view", "sales.create", "customers.view"],
  STAFF: ["dashboard.view", "medicine.view", "inventory.view"],
};

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) are required to seed the admin user.");

  const permissions = [];
  for (const [key, description] of permissionDefinitions) {
    const existing = await prisma.permission.findUnique({ where: { key } });
    permissions.push(existing ?? await prisma.permission.create({ data: { key, description } }));
  }
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.findUnique({ where: { name } }) ?? await prisma.role.create({ data: { name } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: rolePermissions[name].map((key) => ({ roleId: role.id, permissionId: permissionByKey.get(key)!.id })) });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { name: "System Administrator", roleId: adminRole.id, status: "ACTIVE" } });
  } else {
    await prisma.user.create({ data: { email, name: "System Administrator", passwordHash: await bcrypt.hash(password, 12), roleId: adminRole.id } });
  }
  const settings = await prisma.pharmacySettings.findUnique({ where: { key: "singleton" } });
  if (!settings) await prisma.pharmacySettings.create({ data: { key: "singleton", pharmacyName: "" } });
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Seed failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
