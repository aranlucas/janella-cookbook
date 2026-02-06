import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("header logo navigates to home", async ({ page }) => {
    await page.goto("/recipes");

    const logoLink = page.locator('header a[href="/"]');
    await logoLink.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("footer links navigate correctly", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");

    // Navigate to About
    await footer.getByRole("link", { name: "About Janella" }).click();
    await expect(page).toHaveURL(/\/about/);
  });

  test("New Recipe button navigates to add recipe page", async ({ page }) => {
    await page.goto("/");

    // The "New Recipe" button (desktop variant)
    const newRecipeLink = page.getByRole("link", { name: /New Recipe/i });
    if (await newRecipeLink.isVisible()) {
      await newRecipeLink.click();
      await expect(page).toHaveURL(/\/recipes\/new/);
    }
  });

  test("quick tag on home navigates to recipes with query", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Pasta" }).click();
    await expect(page).toHaveURL(/\/recipes\?q=Pasta/);
  });

  test("all core pages return 200", async ({ request }) => {
    const routes = [
      "/",
      "/recipes",
      "/search",
      "/categories",
      "/favorites",
      "/recipes/new",
      "/about",
      "/privacy",
      "/terms",
    ];

    for (const route of routes) {
      const response = await request.get(route);
      expect(
        response.ok(),
        `Expected ${route} to return 200, got ${response.status()}`,
      ).toBe(true);
    }
  });
});
