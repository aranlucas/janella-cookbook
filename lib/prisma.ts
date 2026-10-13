import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { isTransientDatabaseError, thrownValueSchema } from "./errors";

type PrismaGlobal = typeof globalThis & {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  prismaBeforeExitHookRegistered: boolean | undefined;
};

interface RetryOptions {
  readonly retries?: number;
  readonly baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// SAFETY: this module owns these three process-wide properties for Prisma's hot-reload singleton.
const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const poolMax = parseInt(process.env.DATABASE_POOL_MAX ?? "5", 10);

  const pool = new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    // Railway cold start can take 5-10s, so give it a bit more headroom than the default
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected pg pool error:", err);
  });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: drain the pool when the process exits
if (!globalForPrisma.prismaBeforeExitHookRegistered) {
  process.once("beforeExit", () => {
    globalForPrisma.pool?.end().catch(() => {
      console.error("Failed to close database pool");
    });
  });
  globalForPrisma.prismaBeforeExitHookRegistered = true;
}

/**
 * Easiest Prisma retry: small helper that retries a query when the DB is
 * temporarily unavailable (Railway cold start → 57P03 / P1001 / P2039).
 *
 * This is intentionally tiny — no extra deps, no Proxy/$extends magic.
 * Use it only on the queries that can hit a cold DB (server components /
 * API routes). It retries with exponential backoff and then re-throws a
 * normalized DatabaseUnavailableError (503) via toAppError() upstream.
 *
 *   import { prisma, withDatabaseRetry } from "@/lib/prisma";
 *   const data = await withDatabaseRetry(() => prisma.recipe.groupBy({ ... }));
 *
 * If you want *all* queries to auto-retry, just wrap the client once:
 *   export const prisma = createPrismaClient().$extends({ query: { $allModels: { $allOperations({ args, query }) { return withDatabaseRetry(() => query(args)); } } } });
 * but per-query is clearer and avoids hiding slow cold starts.
 */
export function withDatabaseRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 4; // ~0.4s, 0.8s, 1.6s, 3.2s = ~6s total, covers Railway wake-up
  const baseDelayMs = opts.baseDelayMs ?? 400;

  async function attempt(attemptNumber: number): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const thrownValue = thrownValueSchema.parse(error);
      const isTransient = isTransientDatabaseError(thrownValue);
      const isLastAttempt = attemptNumber === retries;

      if (!isTransient || isLastAttempt) {
        throw error;
      }

      const delay = baseDelayMs * 2 ** attemptNumber + Math.random() * 150;
      console.warn(
        `Transient DB error (attempt ${attemptNumber + 1}/${retries + 1}), retrying in ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : String(error),
      );
      await sleep(delay);

      return attempt(attemptNumber + 1);
    }
  }

  return attempt(0);
}
