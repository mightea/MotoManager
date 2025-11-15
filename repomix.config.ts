import { defineConfig } from "repomix";

export default defineConfig({
  include: [
    "app/**/*",
    "public/**/*",
    "scripts/**/*",
    "tests/**/*",
    "types/**/*",
    "drizzle.config.ts",
    "react-router.config.ts",
    "vite.config.ts",
    "vitest.config.ts",
    "package.json",
    "pnpm-workspace.yaml",
    "README.md",
    "CHANGELOG.md",
  ],
  ignore: {
    customPatterns: [
      "node_modules/**",
      "build/**",
      "tmp/**",
      "coverage/**",
      "public/**/*.png",
      "public/**/*.jpg",
      "public/**/*.jpeg",
      "public/**/*.gif",
      "public/**/*.webp",
      "public/**/*.ico",
      "public/**/*.mp4",
      "db.sqlite*",
      "*.log",
      "*.lock",
    ],
  },
  output: {
    filePath: "tmp/repomix-output.md",
    style: "markdown",
    tokenCountTree: 50,
    directoryStructure: true,
  },
});
