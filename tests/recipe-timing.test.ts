// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as cache from "next/cache";
import * as server from "next/server";
import { prisma } from "@/lib/prisma";
import { updateRecipe } from "@/lib/actions";
import { makeRecipe } from "./fixtures/recipe";

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  vi.spyOn(cache, "revalidatePath").mockImplementation(() => {});
  vi.spyOn(server, "after").mockImplementation(() => {});
  vi.spyOn(prisma.recipe, "findUnique").mockResolvedValue(makeRecipe());
  vi.spyOn(prisma.recipe, "update").mockResolvedValue(makeRecipe());
  vi.spyOn(prisma, "$executeRaw").mockResolvedValue(1);
  vi.spyOn(prisma, "$transaction").mockImplementation((run) => run(prisma));
});

interface TimingCase {
  readonly input: Parameters<typeof updateRecipe>[1];
  readonly totalTime: number | null | undefined;
}

// Explicit null clears a stored component; omission preserves the other component.
const cases: readonly TimingCase[] = [
  { input: { prepTime: null }, totalTime: 20 },
  { input: { cookTime: null }, totalTime: 10 },
  { input: { prepTime: null, cookTime: null }, totalTime: null },
  { input: { prepTime: null, totalTime: 45 }, totalTime: 45 },
  { input: { notes: "Keep the custom total" }, totalTime: undefined },
];

test.each(cases)("timing update $input writes total $totalTime", async ({ input, totalTime }) => {
  const result = await updateRecipe("recipe", input);

  expect(result.success).toBe(true);
  expect(prisma.recipe.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ totalTime }) }),
  );
});
