import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Match the application's @/* and extensionless TypeScript imports in Node's
// offline action tests. Type syntax is handled by --experimental-transform-types.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache" || specifier === "next/server")
      return nextResolve(`${specifier}.js`, context);
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
    }
    return nextResolve(specifier, context);
  },
});
