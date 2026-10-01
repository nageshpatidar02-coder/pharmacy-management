import "server-only";

import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required by the server runtime.");
  if (!/^mongodb(?:\+srv)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a MongoDB connection string for this Prisma schema.");
  }

  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV === "production") {
    console.info("Prisma client initialized for the configured MongoDB runtime.");
  }
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    return Reflect.get(getPrismaClient(), property);
  },
});

export async function runMongoTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return getPrismaClient().$transaction(async (tx) => operation(tx as PrismaClient), {
    maxWait: 10000,
    timeout: 20000,
  });
}