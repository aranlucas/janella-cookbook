import { test, expect } from "@playwright/test";

test("a saved recipe survives retries and supports search, favorites, cooking and shopping", async ({
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
  const request = saveResponse.request();
  const retry = await page.request.post(request.url(), {
    headers: request.headers(),
    data: request.postData()!,
  });
  expect(retry.ok()).toBe(true);
  const all = (await (await page.request.get("/api/recipes?limit=100")).json()) as {
    data: { title: string }[];
  };
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
  const persisted = (await (await page.request.get(`/api/recipes/${slug}`)).json()) as {
    data: { cookCount: number; isFavorite: boolean; searchText: string };
  };
  expect(persisted.data.cookCount).toBe(1);
  expect(persisted.data.isFavorite).toBe(true);
  expect(persisted.data.searchText).toContain(ingredient);
  expect(errors).toEqual([]);
});
