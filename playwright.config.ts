import { defineConfig } from "@playwright/test";
import path from "node:path";

const defaultDbRelativePath = "db.sqlite.test";
const resolvedDbPath = path.resolve(process.cwd(), process.env.PLAYWRIGHT_DB_PATH ?? defaultDbRelativePath);
const testDatabaseUrl = `file:${resolvedDbPath}`;

// Ensure the DB env vars are always set for both the web server and the tests themselves.
process.env.PLAYWRIGHT_DB_PATH = resolvedDbPath;
process.env.DB_FILE_NAME = process.env.DB_FILE_NAME ?? testDatabaseUrl;

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: path.resolve(process.cwd(), "tests/e2e"),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      DB_FILE_NAME: testDatabaseUrl,
      NODE_ENV: "test",
    },
  },
});
