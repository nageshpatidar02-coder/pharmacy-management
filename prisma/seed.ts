import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { RoleName } from "@prisma/client";
import { faker } from "@faker-js/faker";

// Permission Definitions
const permissionDefinitions = [
  ["dashboard.view", "View the dashboard"],
  ["medicine.view", "View medicines"],
  ["medicine.create", "Create medicines"],
  ["medicine.update", "Update medicines"],
  ["medicine.delete", "Delete medicines"],
  ["sales.view", "View sales"],
  ["sales.create", "Create sales"],
  ["purchase.view", "View purchases"],
  ["purchase.create", "Create purchases"],
  ["inventory.view", "View inventory"],
  ["inventory.adjust", "Adjust inventory"],
  ["customers.view", "View customers"],
  ["suppliers.view", "View suppliers"],
  ["reports.view", "View reports"],
  ["settings.manage", "Manage pharmacy settings"],
  ["users.manage", "Manage users"],
] as const;

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissionDefinitions.map(([key]) => key),
  ADMIN: permissionDefinitions.map(([key]) => key).filter((key) => key !== "users.manage"),
  PHARMACIST: ["dashboard.view", "medicine.view", "inventory.view", "inventory.adjust", "sales.view", "sales.create", "customers.view"],
  CASHIER: ["dashboard.view", "sales.view", "sales.create", "customers.view"],
  STAFF: ["dashboard.view", "medicine.view", "inventory.view"],
};

// Item Type Configurations for Realistic Pharmacy Data
const itemTypeConfigs = [
  {
    itemType: "TABLET",
    dosageForms: ["Tablet", "Chewable Tablet", "Dispersible Tablet"],
    packSizes: ["10 Tablets", "15 Tablets", "1 Strip (10 Tabs)", "100 Tablets Bottle"],
    units: ["strip", "box", "bottle"],
    priceRange: { min: 20, max: 800 }
  },
  {
    itemType: "CAPSULE",
    dosageForms: ["Capsule", "Softgel Capsule"],
    packSizes: ["10 Capsules", "15 Capsules", "1 Strip (10 Caps)"],
    units: ["strip", "box"],
    priceRange: { min: 50, max: 1200 }
  },
  {
    itemType: "SYRUP",
    dosageForms: ["Syrup", "Suspension", "Liquid"],
    packSizes: ["60 ml", "100 ml", "200 ml Bottle"],
    units: ["bottle", "pack"],
    priceRange: { min: 40, max: 450 }
  },
  {
    itemType: "INJECTION",
    dosageForms: ["Injection", "Vial", "Ampoule"],
    packSizes: ["1 Ampoule", "1 Vial (2 ml)", "1 Vial (5 ml)", "Pre-filled Syringe"],
    units: ["vial", "ampoule", "box"],
    priceRange: { min: 80, max: 3500 }
  },
  {
    itemType: "DROPS",
    dosageForms: ["Eye Drops", "Ear Drops", "Nasal Drops", "Oral Drops"],
    packSizes: ["5 ml Bottle", "10 ml Bottle", "15 ml Bottle"],
    units: ["bottle", "pack"],
    priceRange: { min: 30, max: 350 }
  },
  {
    itemType: "OINTMENT",
    dosageForms: ["Ointment", "Cream", "Gel", "Lotion"],
    packSizes: ["15g Tube", "30g Tube", "50g Tube", "100g Jar"],
    units: ["tube", "pack", "jar"],
    priceRange: { min: 45, max: 650 }
  },
  {
    itemType: "EQUIPMENT",
    dosageForms: ["Device", "Surgical", "Diagnostic"],
    packSizes: ["1 Unit", "Box of 10", "Pack of 50"],
    units: ["piece", "box", "unit"],
    priceRange: { min: 150, max: 4500 }
  },
  {
    itemType: "OTHER",
    dosageForms: ["Powder", "Sachet", "Supplement", "Bandage", "Consumable"],
    packSizes: ["1 Pack", "1 Sachet", "Box of 100"],
    units: ["pack", "box", "sachet", "piece"],
    priceRange: { min: 10, max: 1500 }
  }
];

function generateMedicineDocument() {
  // Pick a random category configuration
  const config = faker.helpers.arrayElement(itemTypeConfigs);

  const mrp = parseFloat(
    faker.commerce.price({ min: config.priceRange.min, max: config.priceRange.max })
  );
  const purchasePrice = parseFloat((mrp * 0.65).toFixed(2)); // ~35% Margin
  const sellingPrice = parseFloat((mrp * 0.88).toFixed(2));  // ~12% Discount on MRP

  return {
    _id: new ObjectId(),
    name: `${faker.commerce.productName()} ${faker.helpers.arrayElement(["Plus", "Forte", "500", "DSR", "Gel", "Care"])}`,
    genericName: `${faker.lorem.word()} ${faker.helpers.arrayElement(["Sodium", "Hydrochloride", "Paracetamol", "Amoxicillin", "Ibuprofen"])}`,
    composition: `${faker.lorem.word()} + ${faker.lorem.word()}`,
    categoryId: null,
    manufacturerId: null,
    dosageForm: faker.helpers.arrayElement(config.dosageForms),
    itemType: config.itemType, // Strictly valid Enum
    strength: faker.helpers.arrayElement(["10 mg", "50 mg", "250 mg", "500 mg", "650 mg", "1 g", "1% w/w", "5 ml"]),
    packSize: faker.helpers.arrayElement(config.packSizes),
    unit: faker.helpers.arrayElement(config.units),
    hsnCode: faker.string.numeric({ length: 4 }),
    gstPercentage: faker.helpers.arrayElement([0, 5, 12, 18, 28]),
    prescriptionRequired: faker.datatype.boolean(),
    barcode: faker.string.numeric({ length: 13 }),
    sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    mrp: mrp,
    purchasePrice: purchasePrice,
    sellingPrice: sellingPrice,
    minimumStock: faker.number.int({ min: 5, max: 100 }),
    active: true,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
  };
}

async function main() {
  const emailArgument = process.argv.find((arg) => arg.startsWith("--email="));
  const passwordArgument = process.argv.find((arg) => arg.startsWith("--password="));
  const email = emailArgument?.slice("--email=".length).trim().toLowerCase();
  const password = passwordArgument?.slice("--password=".length);

  if (!email || !password || password.length < 12) {
    throw new Error("Provide --email=<admin email> and --password=<password min 12 chars>");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required in .env");

  const client = new MongoClient(databaseUrl);
  await client.connect();
  const database = client.db();

  console.log("Connected to MongoDB...");

  // Database Collections
  const permissionCollection = database.collection("Permission");
  const roleCollection = database.collection("Role");
  const rolePermissionCollection = database.collection("RolePermission");
  const userCollection = database.collection("User");
  const settingsCollection = database.collection("PharmacySettings");
  const medicineCollection = database.collection("Medicine");
  const saleItemCollection = database.collection("SaleItem");
  const purchaseItemCollection = database.collection("PurchaseItem");
  const stockLedgerCollection = database.collection("StockLedger");
  const batchCollection = database.collection("Batch");

  // 1. Seed Permissions
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

  // 2. Seed Roles & RolePermissions
  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
  for (const name of Object.values(RoleName)) {
    const role = await roleCollection.findOne<{ _id: ObjectId; name: string }>({ name });
    const roleDocument = role ?? { _id: new ObjectId(), name, createdAt: new Date(), updatedAt: new Date() };
    if (!role) await roleCollection.insertOne(roleDocument);

    await rolePermissionCollection.deleteMany({ roleId: roleDocument._id });
    await rolePermissionCollection.insertMany(
      rolePermissions[name].map((key) => ({
        _id: new ObjectId(),
        roleId: roleDocument._id,
        permissionId: permissionByKey.get(key)!._id,
      }))
    );
  }

  // 3. Seed Admin User
  const adminRole = await roleCollection.findOne<{ _id: ObjectId }>({ name: "SUPER_ADMIN" });
  if (!adminRole) throw new Error("SUPER_ADMIN role creation failed.");

  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmin = await userCollection.findOne({ email });
  if (existingAdmin) {
    await userCollection.updateOne(
      { _id: existingAdmin._id },
      { $set: { name: "System Administrator", roleId: adminRole._id, status: "ACTIVE", passwordHash, updatedAt: new Date() } }
    );
    console.log(`Admin synchronized for ${email}`);
  } else {
    await userCollection.insertOne({
      _id: new ObjectId(),
      email,
      name: "System Administrator",
      passwordHash,
      roleId: adminRole._id,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Admin created for ${email}`);
  }

  // 4. Seed Settings
  const settings = await settingsCollection.findOne({ key: "singleton" });
  if (!settings) {
    await settingsCollection.insertOne({
      _id: new ObjectId(),
      key: "singleton",
      pharmacyName: "HealthPlus Pharmacy",
      invoicePrefix: "INV",
      currency: "INR",
      lowStockThreshold: 10,
      expiryWarningDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 5. Clear old bad records and insert fresh 3500 items
  console.log("Clearing old medicine records...");
  await saleItemCollection.deleteMany({});
  await purchaseItemCollection.deleteMany({});
  await stockLedgerCollection.deleteMany({});
  await batchCollection.deleteMany({});
  await medicineCollection.deleteMany({});

  console.log("Seeding 3500 mixed medicine & equipment items...");
  const TOTAL_DOCUMENTS = 3500;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < TOTAL_DOCUMENTS; i += BATCH_SIZE) {
    const count = Math.min(BATCH_SIZE, TOTAL_DOCUMENTS - i);
    const batch = Array.from({ length: count }, generateMedicineDocument);
    await medicineCollection.insertMany(batch);
    console.log(`Inserted Batch ${Math.floor(i / BATCH_SIZE) + 1} (${count} items)...`);
  }

  console.log("\n=== SUCCESS: 3500 Mixed items seeded successfully! ===");
  await client.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
});