import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";

const pharmacyIdArgument = process.argv.find((argument) => argument.startsWith("--pharmacyId="))?.slice("--pharmacyId=".length).trim();
if (!pharmacyIdArgument || !ObjectId.isValid(pharmacyIdArgument)) throw new Error("Provide --pharmacyId=<existing pharmacy ObjectId>.");

const envDatabaseUrl = process.env.DATABASE_URL?.trim();
const fileDatabaseUrl = readFileSync(".env", "utf8").match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
const databaseUrl = envDatabaseUrl || fileDatabaseUrl;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const client = new MongoClient(databaseUrl);

async function main() {
  try {
    await client.connect();
    const database = client.db();
    const result = await database.collection("Supplier").updateMany(
      { $or: [{ pharmacyId: null }, { pharmacyId: { $exists: false } }] },
      { $set: { pharmacyId: new ObjectId(pharmacyIdArgument) } },
    );
    console.log(`Assigned ${result.modifiedCount} legacy supplier(s) to pharmacy ${pharmacyIdArgument}.`);
  } finally {
    await client.close();
  }
}

void main();
