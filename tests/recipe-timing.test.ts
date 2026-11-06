// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateRecipe } from "@/lib/actions";
import { makeRecipe } from "./fixtures/recipe";

// Next hooks require a live request; their frozen ESM namespaces cannot be spied on.
// oxlint-disable-next-line anti-slop/no-module-mocking -- framework request hooks have no injectable test boundary
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- suppress deferred work outside a Next request
vi.mock("next/server", () => ({ after: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

function setupTiming() {
  vi.spyOn(prisma.recipe, "findUnique").mockResolvedValue(makeRecipe());
  const update = vi.spyOn(prisma.recipe, "update").mockResolvedValue(makeRecipe());
  vi.spyOn(prisma, "$executeRaw").mockResolvedValue(1);
  vi.spyOn(prisma, "$transaction").mockImplementation((run) => run(prisma));

  return update;
}

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
  const update = setupTiming();
  const result = await updateRecipe("recipe", input);

  expect(result.success).toBe(true);
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0]?.[0].data.totalTime).toBe(totalTime);
});
