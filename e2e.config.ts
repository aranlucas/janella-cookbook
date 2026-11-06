import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  tests: "tests/journeys/**/*.e2e.ts",
  targets: [
    {
      name: "chromium",
      engine: web(),
      app: {
        url: "http://localhost:3000",
        command: {
          executable: "node",
          args: ["node_modules/next/dist/bin/next", "start"],
          inheritEnv: ["DATABASE_URL"],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporters: ["list", "junit"],
} satisfies E2EConfig;
