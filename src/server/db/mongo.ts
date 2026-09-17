import "server-only";

import { Db, MongoClient } from "mongodb";

type MongoGlobal = typeof globalThis & {
  mongoClient?: MongoClient;
  mongoDb?: Db;
  mongoConnection?: Promise<Db>;
};

const globalForMongo = globalThis as MongoGlobal;

export async function getMongoDatabase(): Promise<Db> {
  // Already connected database available
  if (globalForMongo.mongoDb) {
    return globalForMongo.mongoDb;
  }

  // Connection already in progress
  if (globalForMongo.mongoConnection) {
    return globalForMongo.mongoConnection;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  // Create/reuse MongoDB client
  const client =
    globalForMongo.mongoClient ??
    new MongoClient(databaseUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

  globalForMongo.mongoClient = client;

  // Store the connection promise so concurrent requests
  // don't create multiple database connections.
  globalForMongo.mongoConnection = (async () => {
    await client.connect();

    const db = client.db();

    globalForMongo.mongoDb = db;

    return db;
  })();

  try {
    return await globalForMongo.mongoConnection;
  } catch (error) {
    // Reset cached connection state after failure
    globalForMongo.mongoConnection = undefined;
    globalForMongo.mongoDb = undefined;

    try {
      await client.close();
    } catch {
      // Ignore close errors after a failed connection
    }

    globalForMongo.mongoClient = undefined;

    throw error;
  }
}