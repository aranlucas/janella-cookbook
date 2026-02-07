import { test, expect } from "@playwright/test";

test.describe("Recipes page", () => {
  test("renders the all recipes page with title and search", async ({
    page,
  }) => {
    await page.goto("/recipes");

    await expect(
      page.getByRole("heading", { name: "All Recipes" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search within collection..."),
    ).toBeVisible();
  });

  test("displays recipe cards or empty state", async ({ page }) => {
    await page.goto("/recipes");

    // Either recipe cards exist or a "No recipes found" / "View All Recipes" message
    const recipeLinks = page.locator('a[href^="/recipe/"]');
    const emptyState = page.getByText("No recipes found");

    const hasRecipes = (await recipeLinks.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasRecipes || hasEmpty).toBe(true);
  });

  test("search within recipes redirects with query param", async ({ page }) => {
    await page.goto("/recipes");

    const searchInput = page.getByPlaceholder("Search within collection...");
    await searchInput.fill("chicken");
    await searchInput.press("Enter");

    await page.waitForURL("**/recipes?q=chicken");
    await expect(page).toHaveURL(/\/recipes\?q=chicken/);
  });
});

test.describe("Recipe detail page", () => {
  test("navigating to a recipe from the grid shows detail", async ({
    page,
  }) => {
    await page.goto("/recipes");

    const firstRecipeLink = page.locator('a[href^="/recipe/"]').first();
    const hasRecipes = (await firstRecipeLink.count()) > 0;

    if (!hasRecipes) {
      test.skip();
      return;
    }

    const href = await firstRecipeLink.getAttribute("href");
    await firstRecipeLink.click();
    await page.waitForURL(`**${href}`);

    // Recipe detail page elements
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ingredients" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Instructions" }),
    ).toBeVisible();
  });
});
