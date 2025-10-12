import { beforeEach, describe, expect, it, vi } from "vitest";

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
    const sessionHeaders = new Headers({ "x-session": "abc" });
    requireUser.mockResolvedValue({
      user: { id: 10, username: "demo", name: "Demo" },
      headers: sessionHeaders,
    });

    const { getDb, default: dbModule } = await import("~/db");
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
    getDb.mockResolvedValue(dbStub);
    Object.assign(dbModule.query, dbStub.query);

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
    expect(response.init?.status).toBe(200);
    expect(response.data).toEqual({ success: true });
  });
});
