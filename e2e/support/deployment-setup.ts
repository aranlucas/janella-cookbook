import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { z } from "zod";
import { deploymentSession, deploymentURL } from "./deployment-auth";

export default async function setup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const url = deploymentURL(baseURL);

  const storageStatePath = z.string().safeParse(storageState);

  if (!storageStatePath.success) {
    throw new TypeError("Deployment storage path is required.");
  }

  const state = await deploymentSession(url, process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
  await mkdir(dirname(storageStatePath.data), { recursive: true });
  await writeFile(storageStatePath.data, JSON.stringify(state), { mode: 0o600 });
}
