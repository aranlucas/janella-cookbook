import { test, expect } from "@playwright/test";

test.describe("Categories page", () => {
  test("renders the categories page with heading", async ({ page }) => {
    await page.goto("/categories");

    await expect(
      page.getByRole("heading", { level: 1, name: "Categories", exact: true }),
    ).toBeVisible();
  });

  test("displays category cards or empty state", async ({ page }) => {
    await page.goto("/categories");

    const categoryCards = page.locator('a[href^="/recipes?category="]');
    const emptyState = page.getByText(/No categories/i);

    await expect(categoryCards.first().or(page.getByText(/No categories/i))).toBeVisible();
    const hasCategories = (await categoryCards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasCategories || hasEmpty).toBe(true);
  });

  test("clicking a category navigates to filtered recipes", async ({ page }) => {
    await page.goto("/categories");

    const firstCategory = page.locator('a[href^="/recipes?category="]').first();
    await expect(firstCategory.or(page.getByText(/No categories/i))).toBeVisible();
    const hasCategories = (await firstCategory.count()) > 0;

    if (!hasCategories) {
      test.skip();

      return;
    }

    const href = await firstCategory.getAttribute("href");

    if (!href) {
      throw new Error("Category card is missing its destination");
    }

    const cardCount = (await firstCategory.textContent())?.match(/(\d+) recipes?/)?.[1];

    if (!cardCount) {
      throw new Error("Category card is missing its recipe count");
    }

    await firstCategory.click();
    await page.waitForURL(`**${href}`);
    await expect(page).toHaveURL(/\/recipes\?category=/);
    // The destination lists the same recipes the card counted, not text matches.
    await expect(
      page.getByText(
        new RegExp(`^(${cardCount} recipes?|Showing \\d+–\\d+ of ${cardCount} recipes)$`),
      ),
    ).toBeVisible();
  });

  test("category cards show recipe counts", async ({ page }) => {
    await page.goto("/categories");

    const categoryCards = page.locator('a[href^="/recipes?category="]');
    await expect(categoryCards.first().or(page.getByText(/No categories/i))).toBeVisible();
    const hasCategories = (await categoryCards.count()) > 0;

    if (!hasCategories) {
      test.skip();

      return;
    }

    const firstCard = categoryCards.first();
    await expect(firstCard.getByText(/\d+ recipes?/)).toBeVisible();
  });
});
