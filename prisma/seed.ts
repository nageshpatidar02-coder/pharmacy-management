import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { RoleName } from "@prisma/client";

const permissionDefinitions = [
  ["dashboard.view", "View the dashboard"], ["medicine.view", "View medicines"], ["medicine.create", "Create medicines"], ["medicine.update", "Update medicines"], ["medicine.delete", "Delete medicines"], ["sales.view", "View sales"], ["sales.create", "Create sales"], ["purchase.view", "View purchases"], ["purchase.create", "Create purchases"], ["inventory.view", "View inventory"], ["inventory.adjust", "Adjust inventory"], ["customers.view", "View customers"], ["suppliers.view", "View suppliers"], ["reports.view", "View reports"], ["settings.manage", "Manage pharmacy settings"], ["users.manage", "Manage users"],
] as const;

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissionDefinitions.map(([key]) => key),
  ADMIN: permissionDefinitions.map(([key]) => key).filter((key) => key !== "users.manage"),
  PHARMACIST: ["dashboard.view", "medicine.view", "inventory.view", "inventory.adjust", "sales.view", "sales.create", "customers.view"],
  CASHIER: ["dashboard.view", "sales.view", "sales.create", "customers.view"],
  STAFF: ["dashboard.view", "medicine.view", "inventory.view"],
};

async function main() {
  const emailArgument = process.argv.find((argument) => argument.startsWith("--email="));
  const passwordArgument = process.argv.find((argument) => argument.startsWith("--password="));
  const email = emailArgument?.slice("--email=".length).trim().toLowerCase();
  const password = passwordArgument?.slice("--password=".length);
  if (!email || !password || password.length < 12) {
    throw new Error("Provide --email=<admin email> and --password=<password of at least 12 characters> when running the seed command.");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the admin user.");

  const client = new MongoClient(databaseUrl);
  await client.connect();
  const database = client.db();

  const permissionCollection = database.collection("Permission");
  const roleCollection = database.collection("Role");
  const rolePermissionCollection = database.collection("RolePermission");
  const userCollection = database.collection("User");
  const settingsCollection = database.collection("PharmacySettings");

  const permissions: Array<{ _id: ObjectId; key: string }> = [];
  for (const [key, description] of permissionDefinitions) {
    const existing = await permissionCollection.findOne<{ _id: ObjectId; key: string }>({ key });
    if (existing) {
      permissions.push(existing);
    } else {
      const permission = { _id: new ObjectId(), key, description, createdAt: new Date() };
      await permissionCollection.insertOne(permission);
      permissions.push(permission);
    }
  }
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));
  for (const name of Object.values(RoleName)) {
    const role = await roleCollection.findOne<{ _id: ObjectId; name: string }>({ name });
    const roleDocument = role ?? { _id: new ObjectId(), name, createdAt: new Date(), updatedAt: new Date() };
    if (!role) await roleCollection.insertOne(roleDocument);
    await rolePermissionCollection.deleteMany({ roleId: roleDocument._id });
    await rolePermissionCollection.insertMany(rolePermissions[name].map((key) => ({
      _id: new ObjectId(),
      roleId: roleDocument._id,
      permissionId: permissionByKey.get(key)!._id,
    })));
  }

  const adminRole = await roleCollection.findOne<{ _id: ObjectId }>({ name: "SUPER_ADMIN" });
  if (!adminRole) throw new Error("SUPER_ADMIN role could not be created.");
  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmin = await userCollection.findOne({ email });
  if (existingAdmin) {
    await userCollection.updateOne({ _id: existingAdmin._id }, { $set: { name: "System Administrator", roleId: adminRole._id, status: "ACTIVE", passwordHash, updatedAt: new Date() } });
    console.log(`Admin password synchronized for ${email}; no duplicate was created.`);
  } else {
    await userCollection.insertOne({ _id: new ObjectId(), email, name: "System Administrator", passwordHash, roleId: adminRole._id, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() });
    console.log(`Admin created for ${email}.`);
  }
  const settings = await settingsCollection.findOne({ key: "singleton" });
  if (!settings) await settingsCollection.insertOne({ _id: new ObjectId(), key: "singleton", pharmacyName: "", invoicePrefix: "INV", currency: "INR", lowStockThreshold: 10, expiryWarningDays: 30, createdAt: new Date(), updatedAt: new Date() });

  await client.close();
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Seed failed"); process.exitCode = 1; });
