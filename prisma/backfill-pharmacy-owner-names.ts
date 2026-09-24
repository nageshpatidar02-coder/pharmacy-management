import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";

const envDatabaseUrl = process.env.DATABASE_URL?.trim();
const fileDatabaseUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
const databaseUrl = envDatabaseUrl || fileDatabaseUrl;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = new MongoClient(databaseUrl);

async function main() {
  try {
    await client.connect();
    const database = client.db();
    const result = await database.collection("Pharmacy").updateMany(
      { $or: [{ ownerName: null }, { ownerName: { $exists: false } }] },
      { $set: { ownerName: "" } },
    );
    console.log(`Updated ${result.modifiedCount} pharmacy owner name(s).`);
  } finally {
    await client.close();
  }
}

void main();