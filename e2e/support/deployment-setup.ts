import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { deploymentSession, deploymentURL } from "./deployment-auth";

export default async function setup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const url = deploymentURL(baseURL);
  if (typeof storageState !== "string") throw new Error("Deployment storage path is required.");
  const state = await deploymentSession(url, process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
  await mkdir(dirname(storageState), { recursive: true });
  await writeFile(storageState, JSON.stringify(state), { mode: 0o600 });
}
