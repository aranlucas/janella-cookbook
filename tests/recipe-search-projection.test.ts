// @vitest-environment node

import { afterEach, describe, expect, test, vi } from "vitest";
import { ResultAsync } from "neverthrow";
import { ExternalApiError } from "@/lib/errors";
import { generateSearchText } from "@/lib/embeddings";
import {
  createRecipeSearchProjection,
  type RecipeSearchProjectionInput,
} from "@/lib/search-projection";

interface TestRecipe extends RecipeSearchProjectionInput {
  readonly embedding: readonly number[] | null;
}

interface DeferredEmbedding {
  readonly input: string;
  readonly resolve: (embedding: readonly number[]) => void;
  readonly reject: (error: Error) => void;
}

interface ProjectionHarness {
  readonly getRecipe: () => TestRecipe;
  readonly service: ReturnType<typeof createRecipeSearchProjection<null>>;
  readonly jobs: Array<() => Promise<void>>;
  readonly requests: DeferredEmbedding[];
  setRecipe(recipe: TestRecipe): void;
}

function vector(value: number): number[] {
  return Array.from({ length: 768 }, () => value);
}

function makeRecipe(overrides: Partial<TestRecipe> = {}): TestRecipe {
  const recipe = {
    id: "synthetic-recipe",
    title: "Synthetic soup",
    description: "A test recipe",
    cuisine: "Test cuisine",
    course: "DINNER",
    tags: [{ name: "Original" }],
    ingredients: [{ name: "Test carrot" }],
    instructions: [{ text: "Test simmer" }],
    totalTime: 60,
    difficulty: "MEDIUM",
    searchText: "",
    embedding: vector(1),
    ...overrides,
  } satisfies TestRecipe;

  return { ...recipe, searchText: generateSearchText(recipe) };
}

function createHarness(initial: TestRecipe = makeRecipe()): ProjectionHarness {
  let current = initial;
  const jobs: Array<() => Promise<void>> = [];
  const requests: DeferredEmbedding[] = [];

  const service = createRecipeSearchProjection<null>({
    generateSearchText,
    generateEmbedding: (input) =>
      ResultAsync.fromPromise(
        new Promise<number[]>((resolve, reject) => {
          requests.push({
            input,
            resolve: (embedding) => resolve([...embedding]),
            reject,
          });
        }),
        (error) =>
          new ExternalApiError(
            "Hugging Face",
            error instanceof Error ? error.message : "Synthetic provider error",
          ),
      ),
    invalidate: (_transaction, recipeId, searchText) => {
      if (current.id === recipeId) {
        current = { ...current, searchText, embedding: null };
      }

      return Promise.resolve(1);
    },
    persistEmbedding: (recipeId, embedding, searchText) => {
      if (current.id === recipeId && current.searchText === searchText) {
        current = { ...current, embedding: [...embedding] };
      }

      return Promise.resolve(1);
    },
  });

  return {
    getRecipe: () => current,
    service,
    jobs,
    requests,
    setRecipe: (recipe) => {
      current = recipe;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recipe search projection", () => {
  test("meaningful recipe edits persist canonical text and clear the old vector", async () => {
    const harness = createHarness();
    const updatedRecipe = { ...harness.getRecipe(), tags: [{ name: "Replacement" }] };
    harness.setRecipe(updatedRecipe);
    const projection = await harness.service.update(null, updatedRecipe);

    expect(projection.searchTextChanged).toBe(true);
    expect(projection.recipe.searchText).toBe(generateSearchText(updatedRecipe));
    expect(harness.getRecipe()).toMatchObject({
      searchText: generateSearchText(updatedRecipe),
      embedding: null,
    });
  });

  test("edits with unchanged semantic text preserve the current vector", async () => {
    const original = makeRecipe({ totalTime: 60 });
    const harness = createHarness(original);
    const updatedRecipe = { ...original, notes: "Private note" };
    const projection = await harness.service.update(null, updatedRecipe);

    expect(projection.searchTextChanged).toBe(false);
    expect(harness.getRecipe().embedding).toEqual(original.embedding);
    expect(harness.requests).toHaveLength(0);
  });

  test("embedding jobs persist only when the recipe still has the requested text", async () => {
    const harness = createHarness();
    const firstRecipe = { ...harness.getRecipe(), title: "First edit" };
    harness.setRecipe(firstRecipe);

    const firstProjection = await harness.service.update(null, firstRecipe);
    harness.setRecipe({ ...firstProjection.recipe, embedding: null });

    const firstJob = harness.service.embeddingJob(
      firstRecipe.id,
      firstProjection.recipe.searchText,
    );

    harness.jobs.push(firstJob);

    const firstWork = harness.jobs[0]();

    const newestRecipe = { ...harness.getRecipe(), title: "Newest edit" };
    harness.setRecipe(newestRecipe);

    const newestProjection = await harness.service.update(null, newestRecipe);
    harness.setRecipe({ ...newestProjection.recipe, embedding: null });

    const newestJob = harness.service.embeddingJob(
      newestRecipe.id,
      newestProjection.recipe.searchText,
    );

    harness.jobs.push(newestJob);

    const newestWork = harness.jobs[1]();

    harness.requests[1].resolve(vector(2));
    await newestWork;
    harness.requests[0].resolve(vector(1));
    await firstWork;

    expect(harness.getRecipe().embedding).toEqual(vector(2));
    expect(harness.getRecipe().searchText).toBe(generateSearchText(harness.getRecipe()));
  });

  test("provider failures leave keyword search text available without a vector", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = createHarness();
    const updatedRecipe = { ...harness.getRecipe(), cuisine: "Replacement cuisine" };
    harness.setRecipe(updatedRecipe);
    const projection = await harness.service.update(null, updatedRecipe);
    harness.setRecipe({ ...projection.recipe, embedding: null });
    const work = harness.service.embeddingJob(updatedRecipe.id, projection.recipe.searchText)();

    harness.requests[0].reject(new Error("synthetic provider outage"));
    await work;

    expect(harness.getRecipe().searchText).toBe(generateSearchText(harness.getRecipe()));
    expect(harness.getRecipe().embedding).toBeNull();
  });

  test("ordered instructions and persisted tags define the searchable projection", () => {
    const recipe = makeRecipe({
      tags: [{ name: "Existing" }],
      instructions: [{ text: "Second" }, { text: "First" }],
    });

    expect(generateSearchText(recipe)).toContain("Existing Test carrot Second First");
  });
});
