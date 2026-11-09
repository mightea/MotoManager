import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchFromBackend: vi.fn() }));

vi.mock("~/utils/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/utils/backend")>();
  return { ...actual, fetchFromBackend: mocks.fetchFromBackend };
});

import { ApiError } from "~/utils/backend";
import { fetchPartIssues } from "~/services/parts";

afterEach(() => {
  mocks.fetchFromBackend.mockReset();
});

describe("fetchPartIssues", () => {
  it("returns the linked issues", async () => {
    const issue = { id: 3, title: "Bremse", isDone: false };
    mocks.fetchFromBackend.mockResolvedValue({ issues: [issue] });
    await expect(fetchPartIssues("t", 9)).resolves.toEqual([issue]);
    expect(mocks.fetchFromBackend).toHaveBeenCalledWith("/parts/9/issues", {}, "t");
  });

  it("returns null when the backend predates the endpoint", async () => {
    mocks.fetchFromBackend.mockRejectedValue(new ApiError("Not Found", 404));
    await expect(fetchPartIssues("t", 9)).resolves.toBeNull();
  });

  it("rethrows other failures", async () => {
    mocks.fetchFromBackend.mockRejectedValue(new ApiError("boom", 500));
    await expect(fetchPartIssues("t", 9)).rejects.toThrow("boom");
  });
});
