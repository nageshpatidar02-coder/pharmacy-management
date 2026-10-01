import "server-only";

import { PrismaClient } from "@prisma/client";

// Hardcoded Fallback URL agar env variables load nahi hote hain
const HARDCODED_DATABASE_URL =
  "mongodb+srv://nageshpatidar02_db_user:3LezzlUxHGRnJDzn@cluster0.urr2ueh.mongodb.net/medical_store?retryWrites=true&w=majority";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function getPrismaClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Pehle env variable check karein, agar empty/missing ho to hardcoded fallback URL use karein
  let databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    databaseUrl = HARDCODED_DATABASE_URL;
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(databaseUrl)) {
    databaseUrl = HARDCODED_DATABASE_URL;
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