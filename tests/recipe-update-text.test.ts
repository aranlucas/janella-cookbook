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

function setupUpdate() {
  vi.spyOn(prisma.recipe, "findUnique").mockResolvedValue(makeRecipe({ cuisine: "Thai" }));

  const update = vi.spyOn(prisma.recipe, "update").mockResolvedValue(makeRecipe());

  vi.spyOn(prisma, "$executeRaw").mockResolvedValue(1);
  vi.spyOn(prisma, "$transaction").mockImplementation((run) => run(prisma));

  return update;
}

// The edit form submits "" for an emptied field. Saving it must clear the value
// like createRecipe does; a stored "" cuisine became a nameless /categories card
// linking to an unfiltered /recipes?category= page.
test("an emptied cuisine is stored as null, not an empty category", async () => {
  const update = setupUpdate();

  const result = await updateRecipe("recipe", { cuisine: "  ", notes: "" });

  expect(result.success).toBe(true);
  expect(update.mock.calls[0]?.[0].data).toMatchObject({ cuisine: null, notes: null });
});

test("submitted text is trimmed and omitted fields are preserved", async () => {
  const update = setupUpdate();

  await updateRecipe("recipe", { cuisine: " Thai " });

  const data = update.mock.calls[0]?.[0].data;

  expect(data?.cuisine).toBe("Thai");
  expect(data?.description).toBeUndefined();
  expect(data?.notes).toBeUndefined();
});
