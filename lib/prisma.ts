import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import Database from "better-sqlite3";
import { PrismaBetterSQLite } from "@prisma/adapter-better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteDb: Database.Database | undefined;
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

  // For SQLite, use better-sqlite3 with sqlite-vec extension
  const dbPath = connectionString.replace("file:", "");
  const db = new Database(dbPath);

  // Load sqlite-vec extension
  sqliteVec.load(db);

  // Create virtual vector table if it doesn't exist
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_recipes USING vec0(
        recipe_id TEXT PRIMARY KEY,
        embedding float[768]
      );
    `);
  } catch (e) {
    console.error("Failed to create vector table:", e);
  }

  // Store db reference globally for vector operations
  globalForPrisma.sqliteDb = db;

  const adapter = new PrismaBetterSQLite(db);

  return new PrismaClient({
    adapter,
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

// Export SQLite database instance for vector operations
export const getSQLiteDb = () => {
  if (!isSQLite()) {
    throw new Error("Not using SQLite database");
  }
  return globalForPrisma.sqliteDb;
};
