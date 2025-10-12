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
      locations: { findMany: vi.fn() },
      currencySettings: { findMany: vi.fn() },
    },
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

describe("root action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits motorcycle form and delegates to provider", async () => {
    const { requireUser } = await import("~/services/auth.server");
    const sessionHeaders = new Headers({ "x-session": "keep-me" });
    requireUser.mockResolvedValue({
      user: { id: 5, username: "tester", name: "Test User" },
      headers: sessionHeaders,
    });

    const { getDb } = await import("~/db");
    const dbStub = { query: {} } as any;
    getDb.mockResolvedValue(dbStub);

    const { createMotorcycle } = await import(
      "~/db/providers/motorcycles.server"
    );
    const createMotorcycleMock = vi.mocked(createMotorcycle);

    const insertedRecord = {
      id: 42,
      make: "Honda",
      model: "Fireblade",
      vin: "VIN123",
      userId: 5,
    };
    createMotorcycleMock.mockResolvedValue([insertedRecord] as any);

    const { action } = await import("~/root");

    const form = new URLSearchParams({
      make: "Honda",
      model: "Fireblade",
      modelYear: "2020",
      vin: "VIN123",
      vehicleIdNr: "VID9",
      numberPlate: "ZH12345",
      isVeteran: "false",
      isArchived: "false",
      firstRegistration: "2020-01-01",
      initialOdo: "1000",
      purchaseDate: "2020-02-01",
      purchasePrice: "15000",
    });

    const request = new Request("http://localhost", {
      method: "POST",
      body: form,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const response = await action({ request } as any);

    expect(createMotorcycleMock).toHaveBeenCalledWith(
      dbStub,
      expect.objectContaining({
        make: "Honda",
        model: "Fireblade",
        userId: 5,
        initialOdo: 1000,
        numberPlate: "ZH12345",
      }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("x-session")).toBe("keep-me");
    expect(response.headers.get("Location")).toBe(
      "/motorcycle/honda-fireblade/42",
    );
  });
});
