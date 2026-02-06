import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("renders about page content", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByText("About the")).toBeVisible();
    await expect(page.getByText("Philosophy")).toBeVisible();
    await expect(
      page.getByText("Fresh ingredients are the heart of every dish."),
    ).toBeVisible();
  });
});

test.describe("Privacy page", () => {
  test("renders privacy policy", async ({ page }) => {
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
  });
});

test.describe("Terms page", () => {
  test("renders terms of service", async ({ page }) => {
    await page.goto("/terms");

    // The page should load without error
    await expect(page.locator("main")).toBeVisible();
  });
});
