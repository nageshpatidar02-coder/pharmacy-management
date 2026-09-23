import { MongoClient, ObjectId } from "mongodb";

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const client = new MongoClient(databaseUrl);
  await client.connect();

  try {
    const database = client.db();
    const medicineIds = await database.collection("Medicine").distinct("_id");
    const result = await database.collection("SaleItem").deleteMany({
      medicineId: { $nin: medicineIds.filter((id): id is ObjectId => id instanceof ObjectId) },
    });
    console.log(`Removed ${result.deletedCount} orphan sale item(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Orphan sale item cleanup failed.");
  process.exitCode = 1;
});
