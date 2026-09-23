import { MongoClient, ObjectId } from "mongodb";

function objectIds(values: unknown[]): ObjectId[] {
  return values.filter((value): value is ObjectId => value instanceof ObjectId);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const client = new MongoClient(databaseUrl);
  await client.connect();

  try {
    const database = client.db();
    const medicines = objectIds(await database.collection("Medicine").distinct("_id"));
    const batches = objectIds(await database.collection("Batch").distinct("_id"));

    const orphanBatchResult = await database.collection("Batch").deleteMany({ medicineId: { $nin: medicines } });
    const orphanLedgerResult = await database.collection("StockLedger").deleteMany({
      $or: [{ medicineId: { $nin: medicines } }, { batchId: { $nin: batches } }],
    });
    const orphanPurchaseResult = await database.collection("PurchaseItem").deleteMany({
      $or: [{ medicineId: { $nin: medicines } }, { batchId: { $nin: batches } }],
    });
    const orphanSaleResult = await database.collection("SaleItem").deleteMany({
      $or: [{ medicineId: { $nin: medicines } }, { batchId: { $nin: batches } }],
    });

    console.log(`Removed ${orphanBatchResult.deletedCount} orphan batch(es).`);
    console.log(`Removed ${orphanLedgerResult.deletedCount} orphan stock ledger row(s).`);
    console.log(`Removed ${orphanPurchaseResult.deletedCount} orphan purchase item(s).`);
    console.log(`Removed ${orphanSaleResult.deletedCount} orphan sale item(s).`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Inventory cleanup failed.");
  process.exitCode = 1;
});
