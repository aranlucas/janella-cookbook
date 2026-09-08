import { test, expect } from "@playwright/test";
import sharp from "sharp";

test.describe("Live provider imports", () => {
  test.skip(
    process.env.LIVE_IMPORT_TESTS !== "1",
    "Opt-in provider calls; run against an isolated database.",
  );
  test.setTimeout(120000);
  test("text extracts into review, restores after refresh, then saves", async ({ page }) => {
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /Text Paste/ }).click();
    await page
      .getByLabel("Recipe text", { exact: true })
      .fill(
        "Lemon Rice Live QA\nIngredients:\n1 cup rice\n2 cups water\n1 tablespoon lemon juice\nInstructions:\n1. Bring water to a boil.\n2. Add rice and simmer for 18 minutes.\n3. Stir in lemon juice.\nServes 2.",
      );
    await page.getByRole("button", { name: "Review recipe", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Make it yours" })).toBeVisible({
      timeout: 75000,
    });
    await expect(page).toHaveURL(/\/recipes\/new/);
    await page
      .getByLabel("Recipe Title")
      .filter({ visible: true })
      .fill(`Reviewed Rice ${Date.now()}`);
    const title = await page.getByLabel("Recipe Title").filter({ visible: true }).inputValue();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Make it yours" })).toBeVisible();
    await expect(page.getByLabel("Recipe Title").filter({ visible: true })).toHaveValue(title);
    await page.getByRole("button", { name: "Save recipe", exact: true }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({
      timeout: 20000,
    });
  });
  test("a recipe image is read by the real vision provider", async ({ page }) => {
    const image = await sharp(
      Buffer.from(
        '<svg width="1000" height="650"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" font-size="32" fill="black"><text x="40" y="60">Lemon Rice Photo QA</text><text x="40" y="130">Ingredients</text><text x="40" y="185">1 cup rice</text><text x="40" y="235">2 cups water</text><text x="40" y="285">1 tablespoon lemon juice</text><text x="40" y="355">Instructions</text><text x="40" y="405">1. Boil water.</text><text x="40" y="455">2. Add rice. Simmer for 18 minutes.</text><text x="40" y="505">3. Stir in lemon juice. Serves 2.</text></g></svg>',
      ),
    )
      .png()
      .toBuffer();
    await page.goto("/recipes/new");
    await page.getByRole("button", { name: /Photo Recipe/ }).click();
    await page
      .getByLabel("Recipe photo", { exact: true })
      .setInputFiles({ name: "recipe.png", mimeType: "image/png", buffer: image });
    await page.getByRole("button", { name: "Review recipe", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Make it yours" })).toBeVisible({
      timeout: 75000,
    });
    await expect(page.getByLabel("Recipe Title").filter({ visible: true })).toHaveValue(
      /Lemon Rice/i,
    );
    await expect(
      page.getByLabel("Ingredient 1 name", { exact: true }).filter({ visible: true }),
    ).toHaveValue(/rice/i);
  });
});

test("a website import requires review and a repeated URL offers an explicit update", async ({
  page,
}) => {
  test.skip(process.env.LIVE_IMPORT_TESTS !== "1", "Opt-in external website request.");
  test.setTimeout(90000);
  const source = "https://www.bbcgoodfood.com/recipes/easiest-ever-pancakes-0";
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe link", { exact: true }).fill(source);
  await page.getByRole("button", { name: "Review recipe", exact: true }).click();
  const reviewUpdate = page.getByRole("button", { name: "Review an update" });
  await expect(page.getByRole("heading", { name: "Make it yours" }).or(reviewUpdate)).toBeVisible({
    timeout: 60000,
  });
  if (await reviewUpdate.isVisible()) await reviewUpdate.click();
  const title = `Website review ${Date.now()}`;
  await page.getByLabel("Recipe Title").fill(title);
  await page.getByRole("button", { name: /^(Save recipe|Update Recipe)$/ }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe link", { exact: true }).fill(source);
  await page.getByRole("button", { name: "Review recipe", exact: true }).click();
  await expect(
    page.getByText("Your saved recipe has not been changed.", { exact: false }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("link", { name: "Open existing recipe" }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
});
