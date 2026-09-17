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

export function isReplicaSetTransactionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("transaction") &&
    (
      message.includes("replica set") ||
      message.includes("transactions are not supported") ||
      message.includes("requires your mongodb server to be run as a replica set") ||
      message.includes("transaction numbers are only allowed") ||
      message.includes("transaction is not supported")
    )
  );
}

/**
 * Runs an operation using a MongoDB transaction when supported.
 *
 * If MongoDB does not support transactions, the operation is
 * executed directly using the normal Prisma client.
 */
export async function runMongoTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      return operation(tx as PrismaClient);
    });
  } catch (error) {
    if (isReplicaSetTransactionError(error)) {
      return operation(prisma);
    }

    throw error;
  }
}