import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("save, reopen and alphabetically browse matching recipes", async ({
  app,
  browser,
  screen,
}) => {
  const marker = `audit${Date.now()}`;

  async function saveRecipe(prefix: string) {
    await app.open("/recipes/new");
    await screen.getByRole("button", { name: /Manual Write/ }).click();
    await screen.getByLabel("Recipe Title *").fill(`${prefix} ${marker}`);
    await screen.getByLabel("Ingredient 1 name", { exact: true }).fill("cardamom");
    await screen.getByLabel("Step 1 text").fill("Toast gently.");
    await screen.getByRole("button", { name: "Save recipe", exact: true }).click();
    await expect(
      screen.getByRole("heading", { name: `${prefix} ${marker}`, exact: true }),
    ).toBeVisible();
    await expect(screen.getByText("Toast gently.", { exact: true })).toBeVisible();
  }

  await saveRecipe("Zebra");
  await saveRecipe("Apple");
  await app.open(`/recipes?q=${marker}&sort=title`);
  const titles = browser.locator("h3");
  await expect(titles).toHaveText([`Apple ${marker}`, `Zebra ${marker}`]);
  await screen.getByRole("heading", { name: `Apple ${marker}`, exact: true }).click();
  await expect(screen.getByText("Toast gently.", { exact: true })).toBeVisible();
  await expect(screen.getByText("cardamom", { exact: true })).toBeVisible();
});

test("cleared preparation time stays cleared after editing and reopening", async ({
  app,
  browser,
  screen,
}) => {
  const title = `Timing audit${Date.now()}`;
  await app.open("/recipes/new");
  await screen.getByRole("button", { name: /Manual Write/ }).click();
  await screen.getByLabel("Recipe Title *").fill(title);
  await screen.getByLabel("Ingredient 1 name", { exact: true }).fill("cardamom");
  await screen.getByLabel("Step 1 text").fill("Toast gently.");
  await screen.getByLabel("Prep Time (min)").fill("10");
  await screen.getByLabel("Cook Time (min)").fill("20");
  await screen.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(screen.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const detail = await browser.url();
  await app.open(`${new URL(detail).pathname}/edit`);
  await screen.getByLabel("Prep Time (min)").fill("");
  await screen.getByRole("button", { name: "Update Recipe", exact: true }).click();
  await expect(screen.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(browser.locator("dl > div").filter({ hasText: "Total" })).toContainText("20 min");
  await app.open(`${new URL(detail).pathname}/edit`);
  await expect(screen.getByLabel("Prep Time (min)")).toHaveValue("");
  await expect(screen.getByLabel("Cook Time (min)")).toHaveValue("20");
});
