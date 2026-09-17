import "server-only";

import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoDb?: Db;
};

export async function getMongoDatabase() {
  if (!globalForMongo.mongoClient) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error("Missing DATABASE_URL environment variable.");
    globalForMongo.mongoClient = new MongoClient(databaseUrl);
    await globalForMongo.mongoClient.connect();
    globalForMongo.mongoDb = globalForMongo.mongoClient.db();
  }

  return globalForMongo.mongoDb!;
}
