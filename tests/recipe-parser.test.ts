// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { parseIngredientLine } from "@/lib/imports/ingredient-line";
import type { modelRecipeSchema } from "@/lib/imports/recipe-schema";
import { extractStructuredRecipe } from "@/lib/imports/structured-recipe";

type ModelReply = z.input<typeof modelRecipeSchema>;

const objectSchema = z.object({
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()),
});

/** The parts of the sent JSON schema that strict mode checks. */
const sentSchema = objectSchema.extend({
  properties: z.looseObject({
    ingredients: z.object({ items: objectSchema }),
    instructions: z.object({ items: objectSchema }),
  }),
});

const requestSchema = z.object({
  temperature: z.number().optional(),
  messages: z.array(z.object({ role: z.string(), content: z.unknown() })),
  response_format: z.object({
    json_schema: z.object({ name: z.string(), strict: z.boolean(), schema: sentSchema }),
  }),
});

function mockModelReply(reply: ModelReply) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      id: "test",
      created: 1,
      model: "routed-model",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(reply) },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );

  vi.stubGlobal("fetch", fetchMock);

  return () => requestSchema.parse(JSON.parse(z.string().parse(fetchMock.mock.calls[0][1]?.body)));
}

const emptyReply = {
  description: null,
  prepTime: null,
  cookTime: null,
  totalTime: null,
  servings: null,
  cuisine: null,
  course: null,
  difficulty: null,
};

describe("parseIngredientLine", () => {
  test.each([
    ["1 1/2 cups all-purpose flour, sifted", "1 1/2", "cups", "all-purpose flour", "sifted"],
    ["2 large eggs", "2", undefined, "large eggs", undefined],
    ["200g dark chocolate (70%)", "200", "g", "dark chocolate", "70%"],
    ["½ tsp. salt", "½", "tsp", "salt", undefined],
    ["2-3 cloves garlic, minced", "2-3", "cloves", "garlic", "minced"],
    ["1 (14 oz) can diced tomatoes", "1", "(14 oz) can", "diced tomatoes", undefined],
    ["1 fl. oz. lime juice", "1", "fl. oz", "lime juice", undefined],
    ["Salt and pepper, to taste", undefined, undefined, "Salt and pepper", "to taste"],
    [
      "12-ounce bag chocolate chips",
      undefined,
      undefined,
      "12-ounce bag chocolate chips",
      undefined,
    ],
  ])("%s", (line, quantity, unit, name, notes) => {
    expect(parseIngredientLine(line)).toEqual({ quantity, unit, name, notes });
  });
});

describe("extractStructuredRecipe", () => {
  test("cleans schema.org text and keeps fields the model path would return", () => {
    const recipe = extractStructuredRecipe(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Recipe",
        name: "Mac &amp; Cheese",
        description: "<p>Grandma&amp;#39;s classic.</p>",
        recipeIngredient: ["8 oz elbow macaroni", "2 cups shredded cheddar", " ", { bad: true }],
        recipeInstructions: [
          { "@type": "HowToStep", name: "Boil the pasta." },
          { "@type": "HowToStep", text: "Stir in the <strong>cheese</strong>." },
        ],
        prepTime: "PT0M",
        cookTime: "PT20M",
        totalTime: "P0DT1H",
        recipeYield: ["4", "4 servings"],
        recipeCuisine: ["American"],
        recipeCategory: "Side Dish",
      })}</script>`,
    );

    expect(recipe).toMatchObject({
      title: "Mac & Cheese",
      description: "Grandma's classic.",
      ingredients: [
        { quantity: "8", unit: "oz", name: "elbow macaroni" },
        { quantity: "2", unit: "cups", name: "shredded cheddar" },
      ],
      instructions: [{ text: "Boil the pasta." }, { text: "Stir in the cheese." }],
      prepTime: undefined,
      cookTime: 20,
      totalTime: 60,
      servings: "4 servings",
      cuisine: "American",
      course: "SIDE",
    });
  });

  test("ignores malformed fields instead of rejecting the recipe", () => {
    const recipe = extractStructuredRecipe(
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Recipe",
        name: "Toast",
        recipeIngredient: ["1 slice bread"],
        recipeInstructions: "Toast the bread.",
        cookTime: "about five minutes",
        recipeYield: { nope: 1 },
      })}</script>`,
    );

    expect(recipe).toMatchObject({ title: "Toast", cookTime: undefined, servings: undefined });
  });
});

describe("AI recipe parsing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FREELLM_API_KEY", "test-cookbook-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("sends a strict-mode-compatible schema and cleans the reply", async () => {
    const request = mockModelReply({
      ...emptyReply,
      title: "  Tomato Soup ",
      description: "x".repeat(2500),
      prepTime: 10,
      cookTime: 25.4,
      ingredients: [
        { quantity: "2", unit: "lb", name: "tomatoes", notes: null, group: null },
        { quantity: null, unit: null, name: "  ", notes: null, group: null },
      ],
      instructions: [
        { text: "Roast the tomatoes.", group: null },
        { text: "", group: null },
        { text: "Blend.", group: "Finish" },
      ],
    });

    const { parseRecipeFromText } = await import("@/lib/recipe-parser");

    const result = await parseRecipeFromText("Tomato soup: roast 2 lb tomatoes and blend them.");

    const { temperature, response_format } = request();

    expect(temperature).toBeUndefined();
    expect(response_format.json_schema).toMatchObject({ name: "Recipe", strict: true });

    const { schema } = response_format.json_schema;

    // Strict mode rejects any object whose properties are not all required.
    for (const object of [
      schema,
      schema.properties.ingredients.items,
      schema.properties.instructions.items,
    ]) {
      expect(object.required.toSorted()).toEqual(Object.keys(object.properties).toSorted());
    }

    const recipe = result._unsafeUnwrap();

    expect(recipe.title).toBe("Tomato Soup");
    expect(recipe.description?.length).toBeLessThanOrEqual(2000);
    expect(recipe.ingredients).toEqual([
      {
        quantity: "2",
        unit: "lb",
        name: "tomatoes",
        notes: undefined,
        group: undefined,
        sortOrder: 0,
      },
    ]);
    expect(recipe.instructions).toEqual([
      { text: "Roast the tomatoes.", group: undefined, sortOrder: 0 },
      { text: "Blend.", group: "Finish", sortOrder: 1 },
    ]);
    expect(recipe).toMatchObject({ prepTime: 10, cookTime: 25, totalTime: 35 });
  });

  test("reports a page without a recipe instead of a model failure", async () => {
    mockModelReply({ ...emptyReply, title: "About us", ingredients: [], instructions: [] });
    const { parseRecipeFromHtml } = await import("@/lib/recipe-parser");

    await expect(
      parseRecipeFromHtml(
        "<html><body><p>About our company.</p></body></html>",
        "https://example.com/about",
      ),
    ).rejects.toThrow("Could not find any ingredients in the page");
  });

  test("sends readable page text, not scripts and markup", async () => {
    const request = mockModelReply({
      ...emptyReply,
      title: "Lemonade",
      ingredients: [{ quantity: "4", unit: null, name: "lemons", notes: null, group: null }],
      instructions: [{ text: "Squeeze and stir.", group: null }],
    });

    const { parseRecipeFromHtml } = await import("@/lib/recipe-parser");

    const recipe = await parseRecipeFromHtml(
      `<html><head><title>Lemonade | Site</title>
      <meta property="og:image" content="/lemonade.jpg"><script>var tracking = "SECRET_SCRIPT";</script>
      <style>.x{color:red}</style></head><body><nav>Home Recipes Shop</nav>
      <article><h1>Lemonade</h1><ul><li>4 lemons</li><li>1 cup sugar</li></ul>
      <p>Squeeze the lemons and stir with sugar and water until dissolved, then chill well before serving.</p>
      <p>${"Lemonade is a summer classic. ".repeat(5)}</p></article>
      <div class="comments">Great recipe!</div></body></html>`,
      "https://example.com/lemonade",
    );

    const prompt = JSON.stringify(request().messages);

    expect(prompt).toContain("Page title: Lemonade | Site");
    expect(prompt).toContain(String.raw`4 lemons\n1 cup sugar`);
    expect(prompt).not.toContain("SECRET_SCRIPT");
    expect(prompt).not.toContain("color:red");
    expect(prompt).not.toContain("Home Recipes Shop");
    expect(prompt).not.toContain("Great recipe!");
    expect(recipe.imageUrl).toBe("https://example.com/lemonade.jpg");
  });

  test("gives the model the video description alongside the transcript", async () => {
    const request = mockModelReply({
      ...emptyReply,
      title: "Fluffy Pancakes",
      ingredients: [{ quantity: "2", unit: null, name: "eggs", notes: null, group: null }],
      instructions: [{ text: "Whisk and fry.", group: null }],
    });

    const { parseRecipeFromTranscript } = await import("@/lib/recipe-parser");

    const recipe = await parseRecipeFromTranscript(
      "https://www.youtube.com/watch?v=abcdefghijk",
      {
        text: "Today we are making pancakes. Whisk everything together and fry until golden on both sides.",
        title: "Fluffy Pancakes",
        source: "transcript",
        description: "Ingredients: 1 1/2 cups flour, 2 eggs, 1 cup milk",
      },
      "https://img.youtube.com/vi/abcdefghijk/maxresdefault.jpg",
    );

    const prompt = JSON.stringify(request().messages);

    expect(prompt).toContain(String.raw`Video description:\nIngredients: 1 1/2 cups flour`);
    expect(prompt).toContain(String.raw`Transcript:\nToday we are making pancakes`);
    expect(recipe.imageUrl).toContain("abcdefghijk");
  });
});
