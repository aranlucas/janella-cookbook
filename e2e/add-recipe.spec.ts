import { test, expect } from "@playwright/test";

test.describe("Add Recipe page", () => {
  test("renders the add recipe page with tabs", async ({ page }) => {
    await page.goto("/recipes/new");

    await expect(
      page.getByRole("heading", { name: "Add a Recipe" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Import from a website, paste text, or create from scratch.",
      ),
    ).toBeVisible();
  });

  test("displays all four import method tabs", async ({ page }) => {
    await page.goto("/recipes/new");

    await expect(page.getByRole("tab", { name: "From URL" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "YouTube" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Paste Text" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Manual" })).toBeVisible();
  });

  test("URL tab is selected by default", async ({ page }) => {
    await page.goto("/recipes/new");

    const urlTab = page.getByRole("tab", { name: "From URL" });
    await expect(urlTab).toHaveAttribute("data-state", "active");
  });

  test("switching to Manual tab shows the form", async ({ page }) => {
    await page.goto("/recipes/new");

    await page.getByRole("tab", { name: "Manual" }).click();

    // Manual form should have a title field
    await expect(page.getByLabel(/title/i)).toBeVisible();
  });

  test("breadcrumbs show correct path", async ({ page }) => {
    await page.goto("/recipes/new");

    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Recipes" })).toBeVisible();
    await expect(page.getByText("New Recipe")).toBeVisible();
  });
});
