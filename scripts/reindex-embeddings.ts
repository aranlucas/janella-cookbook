// Prisma's native migration/seed commands cannot generate provider vectors or guard concurrent recipe edits; reuse the application's index writer.
import { parseArgs } from "node:util";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { reindexRecipeEmbeddings } from "../lib/reindex-embeddings";

const { values } = parseArgs({
  options: {
    write: { type: "boolean", default: false },
    limit: { type: "string", default: "100" },
  },
});

const limit = z.coerce.number().int().min(1).max(10000).parse(values.limit);

try {
  const result = await reindexRecipeEmbeddings(limit, values.write);
  console.warn(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
