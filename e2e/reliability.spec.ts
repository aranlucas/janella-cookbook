import { test, expect } from "@playwright/test";

test("chat accepts step metadata and keeps the answer and composer usable @isolated", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body:
        [
          { type: "start", messageId: "fixture" },
          { type: "start-step" },
          { type: "text-start", id: "text" },
          { type: "text-delta", id: "text", delta: "Toast the spices gently." },
          { type: "text-end", id: "text" },
          { type: "finish-step" },
          { type: "finish", finishReason: "stop" },
        ]
          .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
          .join("") + "data: [DONE]\n\n",
    }),
  );
  await page.goto("/chat");
  const composer = page.getByRole("textbox");
  await composer.fill("How should I cook the spices?");
  await composer.press("Enter");
  await expect(page.getByText("Toast the spices gently.", { exact: true })).toBeVisible();
  await composer.fill("What next?");
  await expect(composer).toHaveValue("What next?");
});

test("chat shares granted location only while enabled @isolated", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: 'data: {"type":"start","messageId":"empty"}\n\ndata: {"type":"finish","finishReason":"stop"}\n\ndata: [DONE]\n\n',
    }),
  );
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 37.5, longitude: -122.2 });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Enable location", exact: true }).click();
  await expect(page.getByRole("button", { name: "Disable location", exact: true })).toBeVisible();
  const composer = page.getByRole("textbox");
  await composer.fill("Nearby shops?");
  const sent = page.waitForRequest("**/api/chat");
  await composer.press("Enter");
  expect((await sent).postDataJSON()).toMatchObject({
    location: { latitude: 37.5, longitude: -122.2 },
  });
  await expect(composer).toBeEnabled();
  await page.getByRole("button", { name: "Disable location", exact: true }).click();
  await composer.fill("What next?");
  const withoutLocation = page.waitForRequest("**/api/chat");
  await composer.press("Enter");
  expect((await withoutLocation).postDataJSON()).not.toHaveProperty("location");
});
