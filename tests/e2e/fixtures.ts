import { test as base } from "@playwright/test";

export const test = base;
export const expect = test.expect;

test.beforeEach(async () => {
  // Database reset skipped in client-only mode
});

test.afterEach(async () => {
  // Database reset skipped in client-only mode
});
