import { test, expect } from "@playwright/test";

test.describe("Favorites page", () => {
  test("renders the favorites page with heading", async ({ page }) => {
    await page.goto("/favorites");

    await expect(
      page.getByRole("heading", { name: "Your Favorites" }),
    ).toBeVisible();
    await expect(
      page.getByText("A curated list of your most loved dishes."),
    ).toBeVisible();
  });

  test("displays favorite recipes or empty state", async ({ page }) => {
    await page.goto("/favorites");

    const recipeCards = page.locator('a[href^="/recipe/"]');
    const emptyState = page.getByText("No favorites yet");

    const hasRecipes = (await recipeCards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasRecipes || hasEmpty).toBe(true);
  });

  test("breadcrumbs show correct path", async ({ page }) => {
    await page.goto("/favorites");

    const breadcrumb = page.getByLabel("breadcrumb");
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(breadcrumb.getByText("Your Favorites")).toBeVisible();
  });
});
