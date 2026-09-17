import "server-only";

import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    "Missing DATABASE_URL environment variable. Set it in Vercel or your local .env file before starting the app.",
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function runMongoTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => operation(tx as PrismaClient));
}