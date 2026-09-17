import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable. Set it in Vercel or your local .env file before starting the app.");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isReplicaSetTransactionError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("transaction") &&
    (
      message.includes("replica set") ||
      message.includes("mongodb") ||
      message.includes("transactions are not supported") ||
      message.includes("requires your mongodb server to be run as a replica set")
    )
  );
}

export async function runMongoTransaction<T>(operation: (tx: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => operation(tx as PrismaClient));
  } catch (error) {
    if (isReplicaSetTransactionError(error)) {
      return await operation(prisma);
    }

    throw error;
  }
}
