import { test, expect } from "@playwright/test";

test.describe("Categories page", () => {
  test("renders the categories page with heading", async ({ page }) => {
    await page.goto("/categories");

    await expect(
      page.getByRole("heading", { name: "Categories" }),
    ).toBeVisible();
  });

  test("displays category cards or empty state", async ({ page }) => {
    await page.goto("/categories");

    const categoryCards = page.locator('a[href^="/recipes?category="]');
    const emptyState = page.getByText(/No categories/i);

    const hasCategories = (await categoryCards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasCategories || hasEmpty).toBe(true);
  });

  test("clicking a category navigates to filtered recipes", async ({
    page,
  }) => {
    await page.goto("/categories");

    const firstCategory = page.locator('a[href^="/recipes?category="]').first();
    const hasCategories = (await firstCategory.count()) > 0;

    if (!hasCategories) {
      test.skip();
      return;
    }

    const href = await firstCategory.getAttribute("href");
    await firstCategory.click();
    await page.waitForURL(`**${href}`);
    await expect(page).toHaveURL(/\/recipes\?category=/);
  });

  test("category cards show recipe counts", async ({ page }) => {
    await page.goto("/categories");

    const categoryCards = page.locator('a[href^="/recipes?category="]');
    const hasCategories = (await categoryCards.count()) > 0;

    if (!hasCategories) {
      test.skip();
      return;
    }

    // Each card should display "N recipes"
    const firstCard = categoryCards.first();
    await expect(firstCard.getByText(/\d+ recipes?/)).toBeVisible();
  });
});
