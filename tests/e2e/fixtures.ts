import { test as base } from "@playwright/test";
import { resetTestDatabase } from "./utils/test-db";

export const test = base;
export const expect = test.expect;

test.beforeEach(async () => {
  await resetTestDatabase();
});

test.afterEach(async () => {
  await resetTestDatabase();
});
