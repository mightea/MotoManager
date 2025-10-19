import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UNSAFE_DataWithResponseInit } from "react-router";

const mergeHeadersMock = (...sources: Array<HeadersInit | undefined>) => {
  const merged = new Headers();
  sources.forEach((source) => {
    if (!source) return;
    new Headers(source).forEach((value, key) => merged.set(key, value));
  });
  return merged;
};

vi.mock("~/services/auth.server", () => {
  const requireUser = vi.fn();
  return {
    requireUser,
    mergeHeaders: mergeHeadersMock,
    getCurrentSession: vi.fn(),
    isPublicPath: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
    listUsers: vi.fn(),
    updateUserPassword: vi.fn(),
    updateUserRole: vi.fn(),
  };
});

vi.mock("~/db", () => {
  const dbStub = {
    query: {
      motorcycles: { findFirst: vi.fn() },
      locations: { findFirst: vi.fn() },
    },
    delete: vi.fn(),
    update: vi.fn(),
  };
  const getDb = vi.fn(async () => dbStub);
  return {
    default: dbStub,
    getDb,
  };
});

vi.mock("~/db/providers/motorcycles.server", () => ({
  createMotorcycle: vi.fn(),
  createIssue: vi.fn(),
  createMaintenanceRecord: vi.fn(),
  createLocationRecord: vi.fn(),
  createTorqueSpecification: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
  updateMaintenanceRecord: vi.fn(),
  deleteMaintenanceRecord: vi.fn(),
  updateTorqueSpecification: vi.fn(),
  deleteTorqueSpecification: vi.fn(),
  updateMotorcycle: vi.fn(),
  deleteMotorcycleCascade: vi.fn(),
}));

describe("motorcycle action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles issue-add submissions via provider", async () => {
    const { requireUser } = await import("~/services/auth.server");
    const requireUserMock = vi.mocked(requireUser);
    const sessionHeaders = { "x-session": "abc" } satisfies Record<
      string,
      string
    >;
    requireUserMock.mockResolvedValue({
      user: {
        id: 10,
        username: "demo",
        name: "Demo",
        email: "demo@example.com",
        passwordHash: "hash",
        role: "user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      headers: sessionHeaders,
    });

    const { getDb, default: dbModule } = await import("~/db");
    const getDbMock = vi.mocked(getDb);
    const dbStub = {
      query: {
        motorcycles: {
          findFirst: vi.fn().mockResolvedValue({
            id: 1,
            userId: 10,
          }),
        },
      },
    } as any;
    getDbMock.mockResolvedValue(dbStub);
    Object.assign((dbModule as any).query, dbStub.query);

    const { createIssue } = await import("~/db/providers/motorcycles.server");
    const createIssueMock = vi.mocked(createIssue);
    createIssueMock.mockResolvedValue(undefined);

    const { action } = await import("~/routes/motorcycle");

    const form = new URLSearchParams({
      intent: "issue-add",
      description: "Bremsen quietschen",
      priority: "high",
      status: "new",
      date: "2024-01-01",
      odo: "15000",
    });

    const request = new Request("http://localhost/motorcycle/1", {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const response = await action({
      request,
      params: { motorcycleId: "1" },
    } as any);

    expect(createIssueMock).toHaveBeenCalledWith(
      dbStub,
      expect.objectContaining({
        motorcycleId: 1,
        description: "Bremsen quietschen",
        priority: "high",
        status: "new",
        date: "2024-01-01",
        odo: 15000,
      }),
    );
    const dataResponse =
      response as unknown as UNSAFE_DataWithResponseInit<unknown>;
    expect(dataResponse.init?.status).toBe(200);
    expect(dataResponse.data).toEqual({ success: true });
  });
});
