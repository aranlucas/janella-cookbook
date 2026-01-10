import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const isSQLite =
    connectionString.startsWith("file:") ||
    connectionString.includes(".db") ||
    connectionString.includes("sqlite");

  // Use PostgreSQL adapter only for PostgreSQL databases
  if (!isSQLite) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  // For SQLite, use default adapter (no custom adapter needed)
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Helper to check if we're using SQLite
export const isSQLite = () => {
  const connectionString = process.env.DATABASE_URL || "";
  return (
    connectionString.startsWith("file:") ||
    connectionString.includes(".db") ||
    connectionString.includes("sqlite")
  );
};
