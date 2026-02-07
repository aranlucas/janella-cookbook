import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders the hero section with branding and search", async ({
    page,
  }) => {
    await page.goto("/");

    const main = page.locator("main");

    // Core branding
    await expect(page.locator("h1")).toContainText("Kitchen");
    await expect(main.getByText("The Cookbook Collection")).toBeVisible();
    await expect(main.getByText("Good food,")).toBeVisible();

    // Search bar is present
    await expect(
      page.getByPlaceholder("Search by ingredient, craving, or season..."),
    ).toBeVisible();
  });

  test("displays quick tags that link to recipes", async ({ page }) => {
    await page.goto("/");

    const tags = ["Breakfast", "Pasta", "Dessert", "Vegan", "Quick & Easy"];
    for (const tag of tags) {
      const link = page.getByRole("link", { name: new RegExp(tag) });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute(
        "href",
        `/recipes?q=${encodeURIComponent(tag)}`,
      );
    }
  });

  test("displays the Recent Recipes section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Recent Recipes")).toBeVisible();
    await expect(page.getByText("Fresh from the kitchen")).toBeVisible();
  });

  test("header has navigation links", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Desktop nav links
    await expect(header.getByRole("link", { name: "Recipes" })).toHaveAttribute(
      "href",
      "/recipes",
    );
  });

  test("footer has navigation links and copyright", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("heading", { name: /Janella's/ }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "All Recipes" }),
    ).toHaveAttribute("href", "/recipes");
    await expect(
      footer.getByRole("link", { name: "By Category" }),
    ).toHaveAttribute("href", "/categories");
    await expect(
      footer.getByRole("link", { name: "Favorites" }),
    ).toHaveAttribute("href", "/favorites");
    await expect(
      footer.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");

    // Copyright with current year
    const year = new Date().getFullYear().toString();
    await expect(footer.getByText(new RegExp(`© ${year}`))).toBeVisible();
  });

  test("search from home navigates to search page", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by ingredient, craving, or season...",
    );
    await searchInput.fill("pasta");
    await searchInput.press("Enter");

    await page.waitForURL("**/search?q=pasta");
    await expect(page).toHaveURL(/\/search\?q=pasta/);
  });
});
