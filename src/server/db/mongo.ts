import "server-only";

import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
  mongoDb?: Db;
  mongoConnection?: Promise<Db>;
};

export async function getMongoDatabase() {
  if (globalForMongo.mongoDb) return globalForMongo.mongoDb;
  if (globalForMongo.mongoConnection) return globalForMongo.mongoConnection;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("Missing DATABASE_URL environment variable.");

  globalForMongo.mongoConnection = (async () => {
    const client = globalForMongo.mongoClient ?? new MongoClient(databaseUrl);
    globalForMongo.mongoClient = client;
    await client.connect();
    globalForMongo.mongoDb = client.db();
    return globalForMongo.mongoDb;
  })();

  try {
    return await globalForMongo.mongoConnection;
  } catch (error) {
    globalForMongo.mongoConnection = undefined;
    globalForMongo.mongoClient = undefined;
    throw error;
  }
}
