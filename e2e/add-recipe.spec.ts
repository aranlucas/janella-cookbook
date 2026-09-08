import { test, expect } from "@playwright/test";

test.describe("Recipe intake", () => {
  test("offers all sources and preserves manual drafts across source changes and reloads", async ({
    page,
  }) => {
    await page.goto("/recipes/new");
    await expect(page.getByRole("heading", { name: "Add a Recipe" })).toBeVisible();
    for (const name of [/Link Website/, /Photo Recipe/, /Text Paste/, /Manual Write/])
      await expect(page.getByRole("button", { name })).toBeVisible();
    await page.getByRole("button", { name: /Manual Write/ }).click();
    await page.getByLabel("Recipe Title").fill("My saved draft");
    await page.getByRole("button", { name: /Link Website/ }).click();
    await page.getByRole("button", { name: /Manual Write/ }).click();
    await expect(page.getByLabel("Recipe Title")).toHaveValue("My saved draft");
    await page.reload();
    await page.getByRole("button", { name: /Manual Write/ }).click();
    await expect(page.getByLabel("Recipe Title")).toHaveValue("My saved draft");
  });
  test("saves a manual recipe without optional times and reopens persisted content", async ({
    page,
  }) => {
    const title = `QA Recipe ${Date.now()}`;
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /Manual Write/ }).click();
    await page.getByLabel("Recipe Title").fill(title);
    await page.getByLabel("Ingredient 1 name", { exact: true }).fill("cardamom");
    await page.getByLabel("Ingredient 1 quantity").fill("2");
    await page.getByLabel("Step 1 text").fill("Toast the cardamom gently.");
    await page.getByRole("button", { name: "Save recipe", exact: true }).click();
    await expect(page).toHaveURL(/\/recipe\//, { timeout: 20000 });
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Toast the cardamom gently.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit recipe", exact: true }).click();
    await expect(page.getByLabel("Recipe Title")).toHaveValue(title);
    await page.getByLabel("Ingredient 1 name", { exact: true }).fill("saffron");
    await page.getByRole("button", { name: "Update Recipe", exact: true }).click();
    await expect(page).not.toHaveURL(/\/edit$/);
    await expect(page.getByText("saffron", { exact: true })).toBeVisible();
  });
  test("rejects unsupported photo files without losing the source selection", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /Photo Recipe/ }).click();
    await page.getByLabel("Recipe photo", { exact: true }).setInputFiles({
      name: "recipe.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("invalid"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "JPEG, PNG or WebP" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review recipe", exact: true })).toBeDisabled();
  });
  test("empty manual submission displays actionable errors", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /Manual Write/ }).click();
    await page.getByRole("button", { name: "Save recipe", exact: true }).click();
    await expect(page.getByText("Recipe title is required", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "highlighted fields" })).toBeVisible();
  });
});

test("intake remains usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recipes/new");
  for (const name of [/Link Website/, /Photo Recipe/, /Text Paste/, /Manual Write/]) {
    await page.getByRole("button", { name }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  }
  await page.getByRole("button", { name: /Photo Recipe/ }).click();
  await page.screenshot({ path: "docs/design/assets/intake-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /Link Website/ }).click();
  await page.screenshot({ path: "docs/design/assets/intake-desktop.png", fullPage: true });
});
