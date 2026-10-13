import { test, expect } from "@playwright/test";
import { z } from "zod";

const recipeListResponseSchema = z.object({
  data: z.array(z.object({ title: z.string() }).passthrough()),
});

const recipeDetailResponseSchema = z.object({
  data: z.object({
    cookCount: z.number(),
    isFavorite: z.boolean(),
    searchText: z.string(),
  }),
});

test("a saved recipe survives retries and supports search, favorites, cooking and shopping @isolated", async ({
  page,
}) => {
  test.setTimeout(90000);
  const title = `Lifecycle ${Date.now()}`;
  const ingredient = `cardamom${Date.now()}`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/recipes/new");
  await page.getByRole("button", { name: /Manual Write/ }).click();
  await page.getByLabel("Recipe Title").fill(title);
  await page.getByLabel("Ingredient 1 name", { exact: true }).fill(ingredient);
  await page.getByLabel("Step 1 text").fill("Toast gently.");

  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().includes("/recipes/new"),
  );

  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  const saveResponse = await responsePromise;
  await expect(page).toHaveURL(/\/recipe\//, { timeout: 20000 });
  const detailUrl = page.url();
  const slug = new URL(detailUrl).pathname.split("/").pop();

  if (!slug) {
    throw new Error("Recipe detail URL did not include a slug");
  }

  const request = saveResponse.request();
  const requestBody = request.postData();

  if (!requestBody) {
    throw new Error("Recipe creation request did not include a request body");
  }

  const retry = await page.request.post(request.url(), {
    headers: request.headers(),
    data: requestBody,
  });

  expect(retry.ok()).toBe(true);

  const all = recipeListResponseSchema.parse(
    await (await page.request.get("/api/recipes?limit=100")).json(),
  );

  expect(all.data.filter((recipe) => recipe.title === title)).toHaveLength(1);
  await page.getByRole("button", { name: "Favorite", exact: true }).click();
  await expect(page.getByRole("button", { name: "Favorited", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /I Made This/ }).click();
  await expect(page.getByRole("button", { name: /I Made This.*1/ })).toBeVisible();
  await page.getByRole("button", { name: "Add to Shopping List", exact: true }).click();
  await page.getByRole("button", { name: "Shopping list", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: `Check ${ingredient}` })).toBeVisible();
  await page.getByRole("checkbox", { name: `Check ${ingredient}` }).check();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Shopping list", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: `Check ${ingredient}` })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto(`/recipes?q=${ingredient}`);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
    timeout: 15000,
  });

  const persisted = recipeDetailResponseSchema.parse(
    await (await page.request.get(`/api/recipes/${slug}`)).json(),
  );

  expect(persisted.data.cookCount).toBe(1);
  expect(persisted.data.isFavorite).toBe(true);
  expect(persisted.data.searchText).toContain(ingredient);
  expect(errors).toEqual([]);
});
