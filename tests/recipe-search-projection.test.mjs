// @vitest-environment node

import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

let row;
let tags;
let jobs;
let requests;
let failProjection;
let failNestedWrite;
let beforeTransaction;
const clone = (value) => structuredClone(value);
const vector = (value) => Array(768).fill(value);

// Only the database, Next response lifecycle, and hosted inference are replaced.
// The public actions, validation, text derivation, slugging and provider error
// handling run unchanged, with entirely synthetic recipes and no network access.
function database(getRow, setRow, transactional = false) {
  function matches(where, candidate) {
    if (!candidate) return false;
    if (where.AND) return where.AND.every((condition) => matches(condition, candidate));
    if (where.OR) return where.OR.some((condition) => matches(condition, candidate));
    return Object.entries(where).every(([key, value]) => {
      if (value?.contains !== undefined)
        return String(candidate[key] ?? "")
          .toLowerCase()
          .includes(value.contains.toLowerCase());
      if (value instanceof Date) return candidate[key]?.getTime() === value.getTime();
      return candidate[key] === value;
    });
  }
  async function update({ data }) {
    const next = { ...getRow() };
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (key === "ingredients" || key === "instructions") {
        if (failNestedWrite) throw new Error("synthetic nested write failure");
        next[key] = clone(value.create).sort((a, b) => a.sortOrder - b.sortOrder);
      } else if (key === "tags") {
        next.tags = value.set
          ? value.set.map(({ id }) => clone(tags.get(id)))
          : value.connectOrCreate.map(({ create }) => {
              const tag = [...tags.values()].find((item) => item.slug === create.slug) ?? {
                id: create.slug,
                ...create,
              };
              tags.set(tag.id, tag);
              return clone(tag);
            });
      } else next[key] = clone(value);
    }
    next.updatedAt = new Date((getRow()?.updatedAt?.getTime() ?? 0) + 1000);
    setRow(next);
    return clone(next);
  }
  return {
    recipe: {
      async findUnique({ where }) {
        return matches(where, getRow()) ? clone(getRow()) : null;
      },
      async findMany({ where }) {
        return matches(where, getRow()) ? [clone(getRow())] : [];
      },
      async count({ where }) {
        return Number(matches(where, getRow()));
      },
      async create(args) {
        assert.equal(getRow(), null, "save retries must not create a second recipe");
        setRow({
          id: "synthetic-recipe",
          difficulty: "MEDIUM",
          searchText: null,
          embedding: null,
          images: [],
        });
        return update(args);
      },
      update,
      async updateMany({ where, data }) {
        if (!matches(where, getRow())) return { count: 0 };
        await update({ data });
        return { count: 1 };
      },
    },
    tag: {
      async upsert({ create }) {
        const tag = [...tags.values()].find((item) => item.slug === create.slug) ?? {
          id: create.slug,
          ...create,
        };
        tags.set(tag.id, tag);
        return clone(tag);
      },
    },
    ...Object.fromEntries(
      ["ingredient", "instruction"].map((name) => [
        name,
        {
          async deleteMany() {
            getRow()[`${name}s`] = [];
          },
          async findMany() {
            return clone(getRow()[`${name}s`]);
          },
        },
      ]),
    ),
    async $executeRaw(strings, ...values) {
      const sql = strings.join("?").replace(/\s+/g, " ");
      if (sql.includes("embedding = NULL")) {
        assert.equal(transactional, true, "projection invalidation must be transactional");
        assert.match(sql, /SET "searchText" = \?, embedding = NULL WHERE id = \?/);
        if (failProjection) throw new Error("synthetic projection failure");
        assert.equal(getRow().id, values[1]);
        setRow({ ...getRow(), searchText: values[0], embedding: null });
        return 1;
      }
      assert.match(sql, /SET embedding = \?::vector WHERE id = \? AND "searchText" = \?/);
      const [embedding, id, searchText] = values;
      if (getRow()?.id !== id || getRow().searchText !== searchText) return 0;
      setRow({ ...getRow(), embedding: JSON.parse(embedding) });
      return 1;
    },
  };
}

const prisma = database(
  () => row,
  (value) => (row = value),
);
prisma.$transaction = async (callback) => {
  await beforeTransaction?.();
  let pending = clone(row);
  const pendingTags = clone(tags);
  try {
    const result = await callback(
      database(
        () => pending,
        (value) => (pending = value),
        true,
      ),
    );
    row = pending;
    return result;
  } catch (error) {
    tags = pendingTags;
    throw error;
  }
};
vi.doMock("../lib/prisma.ts", () => ({ prisma }));
vi.doMock("next/cache", () => ({ revalidatePath() {} }));
vi.doMock("next/server", () => ({ after: (job) => jobs.push(job) }));
vi.doMock("@huggingface/inference", () => ({
  InferenceClient: class {
    featureExtraction({ inputs }) {
      return new Promise((resolve, reject) => requests.push({ inputs, resolve, reject }));
    }
  },
}));
// Search's Prisma import supplies SQL fragments only; no real client is loaded.
vi.doMock("@prisma/client", () => ({ Prisma: { raw: (value) => value } }));

const { createRecipe, updateRecipe } = await import("../lib/actions.ts");
const { generateSearchText } = await import("../lib/embeddings.ts");
const { keywordSearch } = await import("../lib/search.ts");

let previousEnvironment;

beforeEach(() => {
  jobs = [];
  requests = [];
  failProjection = false;
  failNestedWrite = false;
  beforeTransaction = undefined;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("Unexpected network request in an offline test");
  });
  previousEnvironment = {
    ENABLE_HOSTED_EMBEDDINGS: process.env.ENABLE_HOSTED_EMBEDDINGS,
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  };
  process.env.ENABLE_HOSTED_EMBEDDINGS = "true";
  process.env.HUGGINGFACE_API_KEY = "synthetic-provider-key";
  row = {
    id: "synthetic-recipe",
    title: "Synthetic soup",
    slug: "synthetic-soup",
    description: "A test recipe",
    cuisine: "Test cuisine",
    course: "DINNER",
    prepTime: 20,
    cookTime: 40,
    totalTime: 60,
    difficulty: "MEDIUM",
    sourceType: "MANUAL",
    tags: [{ id: "original", slug: "original", name: "Original" }],
    ingredients: [{ name: "Test carrot", sortOrder: 0 }],
    instructions: [{ text: "Test simmer", sortOrder: 0 }],
    images: [],
    embedding: vector(1),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
  row.searchText = generateSearchText(row);
  tags = new Map(row.tags.map((tag) => [tag.id, clone(tag)]));
});

afterEach(() => {
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

for (const [name, input] of Object.entries({
  tags: { tags: ["Replacement"] },
  "empty tags": { tags: [] },
  cuisine: { cuisine: "Different cuisine" },
  course: { course: "LUNCH" },
  "total time": { totalTime: 10 },
  "derived time": { prepTime: 1, cookTime: 2 },
  difficulty: { difficulty: "HARD" },
  "empty description": { description: "" },
  ingredients: { ingredients: [{ name: "Test onion" }] },
  instructions: { instructions: [{ text: "Test roast" }] },
})) {
  test(`${name}-only edits invalidate the vector and enqueue the persisted projection`, async () => {
    const result = await updateRecipe(row.id, input);
    assert.equal(result.success, true);
    assert.equal(row.embedding, null);
    assert.equal(row.searchText, generateSearchText(row));
    assert.equal(result.data.searchText, row.searchText);
    assert.equal(jobs.length, 1);
    const work = jobs[0]();
    assert.equal(requests[0].inputs, row.searchText);
    requests[0].resolve(vector(2));
    await work;
    assert.deepEqual(row.embedding, vector(2));
  });
}

test("provider failure keeps current keyword text and excludes the stale vector", async () => {
  await updateRecipe(row.id, { tags: ["Replacement"] });
  const work = jobs[0]();
  requests[0].reject(new Error("synthetic provider outage"));
  await work;
  assert.equal(row.embedding, null);
  const found = await keywordSearch("Replacement");
  assert.equal(found.isOk(), true);
  assert.equal(found.value.total, 1);
  assert.equal(found.value.results[0].recipe.id, row.id);
});

for (const disabled of ["opt-out", "missing key"]) {
  test(`projection changes still invalidate when embeddings are disabled: ${disabled}`, async () => {
    if (disabled === "opt-out") process.env.ENABLE_HOSTED_EMBEDDINGS = "false";
    else delete process.env.HUGGINGFACE_API_KEY;
    assert.equal((await updateRecipe(row.id, { cuisine: "Replacement" })).success, true);
    assert.equal(row.embedding, null);
    assert.equal(row.searchText, generateSearchText(row));
    assert.equal(jobs.length, 0);
  });
}

test("out-of-order jobs cannot replace the newest recipe's vector", async () => {
  await updateRecipe(row.id, { title: "First edit" });
  const first = jobs[0]();
  await updateRecipe(row.id, { title: "Newest edit" });
  const second = jobs[1]();
  requests[1].resolve(vector(2));
  await second;
  requests[0].resolve(vector(1));
  await first;
  assert.deepEqual(row.embedding, vector(2));
  assert.equal(row.searchText, generateSearchText(row));
});

test("an old job finishing while the newest job is pending leaves the vector empty", async () => {
  await updateRecipe(row.id, { title: "First edit" });
  const first = jobs[0]();
  await updateRecipe(row.id, { title: "Newest edit" });
  requests[0].resolve(vector(1));
  await first;
  assert.equal(row.embedding, null);
});

test("unchanged canonical text preserves the vector without scheduling work", async () => {
  row.totalTime = 90; // Explicit total differs from prep + cook time.
  row.searchText = generateSearchText(row);
  const original = clone(row.embedding);
  const result = await updateRecipe(row.id, { title: row.title, notes: "Private test note" });
  assert.equal(result.success, true);
  assert.equal(row.totalTime, 90);
  assert.deepEqual(row.embedding, original);
  assert.equal(jobs.length, 0);
});

test("time changes within the same semantic bucket do not request a redundant vector", async () => {
  assert.equal((await updateRecipe(row.id, { totalTime: 80 })).success, true);
  assert.deepEqual(row.embedding, vector(1));
  assert.equal(jobs.length, 0);
});

test("the projection uses persisted tag names and ordered recipe steps", async () => {
  tags.set("existing", { id: "existing", slug: "existing", name: "Existing" });
  const result = await updateRecipe(row.id, {
    tags: ["existing"],
    instructions: [
      { text: "Second", sortOrder: 1 },
      { text: "First", sortOrder: 0 },
    ],
  });
  assert.equal(result.success, true);
  assert.match(row.searchText, /Existing.*First Second/);
  const work = jobs[0]();
  assert.equal(requests[0].inputs, row.searchText);
  requests[0].resolve(vector(2));
  await work;
  assert.deepEqual(row.embedding, vector(2));
});

test("a newer saved graph is used instead of the pre-transaction snapshot", async () => {
  beforeTransaction = () => {
    row.cuisine = "Concurrently saved cuisine";
    row.searchText = generateSearchText(row);
  };
  assert.equal((await updateRecipe(row.id, { tags: ["Replacement"] })).success, true);
  assert.match(row.searchText, /Concurrently saved cuisine/);
  assert.equal(row.searchText, generateSearchText(row));
});

for (const failure of ["projection", "nested write"]) {
  test(`${failure} failure rolls back the recipe and its vector and schedules nothing`, async () => {
    const original = clone(row);
    failProjection = failure === "projection";
    failNestedWrite = failure === "nested write";
    const result = await updateRecipe(row.id, {
      ingredients: [{ name: "Replacement" }],
      instructions: [{ text: "Replacement" }],
    });
    assert.equal(result.success, false);
    assert.deepEqual(row, original);
    assert.equal(jobs.length, 0);
  });
}

test("optimistic concurrency rejection preserves the entire recipe and vector", async () => {
  const original = clone(row);
  const result = await updateRecipe(row.id, { tags: ["Replacement"] }, "2025-01-01T00:00:00Z");
  assert.equal(result.success, false);
  assert.match(result.error, /changed while you were editing/);
  assert.deepEqual(row, original);
  assert.equal(jobs.length, 0);
});

test("create and idempotent reviewed-save retry use one canonical persisted projection", async () => {
  row = null;
  const input = {
    title: "Synthetic new recipe",
    description: "  Test description  ",
    cuisine: "  Test cuisine  ",
    sourceType: "MANUAL",
    prepTime: 1,
    cookTime: 2,
    ingredients: [{ name: "Test carrot" }],
    instructions: [{ text: "Test simmer" }],
  };
  const saveKey = "b3c0f8e4-9d79-4bd3-83db-cdc581290fe8";
  const first = await createRecipe(input, saveKey);
  assert.equal(first.success, true);
  assert.equal(row.totalTime, 3);
  assert.equal(row.difficulty, "MEDIUM");
  assert.equal(row.searchText, generateSearchText(row));
  assert.match(row.searchText, /intermediate/);
  const retry = await createRecipe(input, saveKey);
  assert.equal(retry.success, true);
  assert.equal(retry.data.id, first.data.id);
  assert.equal(jobs.length, 1);
  const work = jobs[0]();
  assert.equal(requests[0].inputs, row.searchText);
  requests[0].resolve(vector(2));
  await work;
  assert.deepEqual(row.embedding, vector(2));
});

for (const totalTime of [0, null]) {
  test(`clearing quick-recipe time to ${totalTime} removes obsolete timing hints`, async () => {
    row.totalTime = 10;
    row.searchText = generateSearchText(row);
    const result = await updateRecipe(row.id, { totalTime });
    assert.equal(result.success, true);
    assert.equal(row.totalTime, totalTime);
    assert.doesNotMatch(row.searchText, /quick/);
    assert.equal(row.embedding, null);
    assert.equal(jobs.length, 1);
  });
}

test("a failed create projection leaves no partially saved recipe", async () => {
  row = null;
  failProjection = true;
  const result = await createRecipe({
    title: "Synthetic new recipe",
    sourceType: "MANUAL",
    ingredients: [{ name: "Test carrot" }],
    instructions: [{ text: "Test simmer" }],
  });
  assert.equal(result.success, false);
  assert.equal(row, null);
  assert.equal(jobs.length, 0);
});
