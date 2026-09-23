import { MongoClient } from "mongodb";

const legacyItemTypeMap = {
  Medicine: "TABLET",
  Surgical: "EQUIPMENT",
  Consumable: "OTHER",
  Supplement: "OTHER",
  Device: "EQUIPMENT",
} as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const client = new MongoClient(databaseUrl);
  await client.connect();

  try {
    const collection = client.db().collection("Medicine");
    let repaired = 0;

    for (const [legacyValue, itemType] of Object.entries(legacyItemTypeMap)) {
      const result = await collection.updateMany({ itemType: legacyValue }, { $set: { itemType } });
      repaired += result.modifiedCount;
      console.log(`Mapped ${result.modifiedCount} ${legacyValue} record(s) to ${itemType}.`);
    }

    console.log(`Medicine enum cleanup complete. Repaired ${repaired} record(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Medicine enum cleanup failed.");
  process.exitCode = 1;
});
