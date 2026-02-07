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

/**
 * Lazy-initialized Prisma client singleton.
 * Uses a Proxy so importing this module won't throw if DATABASE_URL is missing.
 * The error only surfaces when a database operation is actually attempted,
 * allowing static pages (about, privacy, terms) to render without a DB.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    // @ts-expect-error - Proxy dynamically accesses PrismaClient properties
    const value = client[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
