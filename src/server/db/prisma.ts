import "server-only";

import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Set it in Vercel before using the database.",
    );
  }

  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

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