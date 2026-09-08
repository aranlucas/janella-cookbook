import { test, expect } from "@playwright/test";
import { extractStructuredRecipe } from "../lib/imports/structured-recipe";
import { isPublicAddress, fetchRecipeSource } from "../lib/imports/fetch-source";

test("structured recipes preserve section order and times without an AI dependency", () => {
  const result = extractStructuredRecipe(
    `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": ["Recipe"], name: "Rice", recipeIngredient: ["1 cup rice", "2 cups water"], recipeInstructions: [{ "@type": "HowToSection", name: "Cook", itemListElement: [{ text: "Boil water." }, { text: "Add rice." }] }], prepTime: "PT5M", cookTime: "PT1H10M", recipeYield: 2 }] })}</script>`,
  );
  expect(result?.title).toBe("Rice");
  expect(result?.ingredients).toHaveLength(2);
  expect(result?.instructions).toEqual([
    { text: "Boil water.", group: "Cook" },
    { text: "Add rice.", group: "Cook" },
  ]);
  expect(result?.cookTime).toBe(70);
});
test("incomplete and malformed structured data does not become a saved recipe", () => {
  expect(
    extractStructuredRecipe('<script type="application/ld+json">{bad}</script>'),
  ).toBeUndefined();
  expect(
    extractStructuredRecipe(
      '<script type="application/ld+json">{"@type":"Recipe","name":"Food","recipeIngredient":[]}</script>',
    ),
  ).toBeUndefined();
});
test("source fetching rejects internal addresses, including IPv6 and mapped forms", async () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "2001:db8::1",
  ])
    expect(isPublicAddress(address), address).toBe(false);
  expect(isPublicAddress("8.8.8.8")).toBe(true);
  expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  await expect(fetchRecipeSource("http://127.0.0.1/")).rejects.toThrow("public website");
  await expect(fetchRecipeSource("file:///etc/passwd")).rejects.toThrow("HTTP");
});
