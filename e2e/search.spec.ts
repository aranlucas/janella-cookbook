import { test, expect } from "@playwright/test";

test.describe("Search page", () => {
  test("shows empty state when no query is provided", async ({ page }) => {
    await page.goto("/search");

    await expect(
      page.getByRole("heading", { name: "Search Recipes" }),
    ).toBeVisible();
    await expect(page.getByText("Start searching")).toBeVisible();
    await expect(page.getByText("Try natural language queries")).toBeVisible();
  });

  test("search bar has autofocus on search page", async ({ page }) => {
    await page.goto("/search");

    const searchInput = page.getByPlaceholder("Search for recipes...");
    await expect(searchInput).toBeVisible();
  });

  test("searching displays results text", async ({ page }) => {
    await page.goto("/search?q=dinner");

    await expect(page.getByText('Showing results for "dinner"')).toBeVisible();
  });

  test("typing a query and submitting navigates with query param", async ({
    page,
  }) => {
    await page.goto("/search");

    const searchInput = page.getByPlaceholder("Search for recipes...");
    await searchInput.fill("breakfast");
    await searchInput.press("Enter");

    await page.waitForURL("**/search?q=breakfast");
    await expect(
      page.getByText('Showing results for "breakfast"'),
    ).toBeVisible();
  });
});
