import { describe, expect, it } from "vitest";
import type { PreviousOwner } from "~/types/db";
import { movePreviousOwner } from "~/utils/previous-owner-order";

const owners = [1, 2, 3].map((id) => ({ id })) as PreviousOwner[];

describe("movePreviousOwner", () => {
  it("moves an owner without relying on its purchase date", () => {
    expect(movePreviousOwner(owners, 3, 0).map((owner) => owner.id)).toEqual([3, 1, 2]);
  });

  it("does not mutate the source list", () => {
    movePreviousOwner(owners, 1, 2);
    expect(owners.map((owner) => owner.id)).toEqual([1, 2, 3]);
  });

  it("returns the source list for an invalid move", () => {
    expect(movePreviousOwner(owners, 99, 0)).toBe(owners);
    expect(movePreviousOwner(owners, 1, 3)).toBe(owners);
  });
});
