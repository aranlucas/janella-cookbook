import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["tests/components/**/*.test.tsx", "tests/**/*.test.mjs", "tests/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
