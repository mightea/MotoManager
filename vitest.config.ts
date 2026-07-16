import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, configDefaults } from "vitest/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(currentDir, "app"),
      "@": resolve(currentDir, "app"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup-test-env.ts",
    coverage: {
      provider: "v8",
      // text: local console; json-summary: badge %; lcov/json: CI PR report.
      reporter: ["text", "json-summary", "json", "lcov"],
      reportOnFailure: true,
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["app/**/*.d.ts"],
    },
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
