import { describe, expect, it } from "vitest";
import { isFalsy, isNullish, isTruthy } from "./falsyUtils";

describe("falsyUtils", () => {
  describe("isFalsy", () => {
    it("identifies JavaScript falsy primitives", () => {
      expect(isFalsy(false)).toBe(true);
      expect(isFalsy(0)).toBe(true);
      expect(isFalsy("")).toBe(true);
      expect(isFalsy(null)).toBe(true);
      expect(isFalsy(undefined)).toBe(true);
    });

    it("rejects truthy values", () => {
      expect(isFalsy("0")).toBe(false);
      expect(isFalsy(1)).toBe(false);
      expect(isFalsy({})).toBe(false);
      expect(isFalsy([])).toBe(false);
    });
  });

  describe("isTruthy", () => {
    it("returns the inverse of isFalsy", () => {
      expect(isTruthy("hello")).toBe(true);
      expect(isTruthy(123)).toBe(true);
      expect(isTruthy(true)).toBe(true);

      expect(isTruthy(0)).toBe(false);
      expect(isTruthy(null)).toBe(false);
    });
  });

  describe("isNullish", () => {
    it("matches only nullish values", () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
      expect(isNullish(0)).toBe(false);
      expect(isNullish("")).toBe(false);
    });
  });
});
