import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
import { deploymentURL } from "./e2e/support/deployment-auth";

export default defineConfig(config, {
  // Live deployments can share a real database. Writes and provider calls stay
  // covered by the isolated suite, while these checks exercise the deployed UI.
  testIgnore: ["**/live-imports.spec.ts", "**/import-parsing.spec.ts"],
  grepInvert: /@isolated/,
  globalSetup: "./e2e/support/deployment-setup.ts",
  webServer: undefined,
  workers: 4,
  retries: 1,
  reporter: [["line"], ["html", { outputFolder: "playwright-deployment-report", open: "never" }]],
  use: {
    baseURL: deploymentURL(process.env.PLAYWRIGHT_BASE_URL),
    storageState: "playwright/.cache/deployment.json",
    // Traces capture authentication cookies and must not be uploaded from CI.
    trace: "off",
  },
});
