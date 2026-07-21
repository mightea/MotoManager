import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "~/utils/navigation";

describe("safeRedirectPath", () => {
  it("keeps internal paths including query strings and fragments", () => {
    expect(safeRedirectPath("/parts?filter=oil#stock")).toBe("/parts?filter=oil#stock");
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/parts\nLocation: https://example.com",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
