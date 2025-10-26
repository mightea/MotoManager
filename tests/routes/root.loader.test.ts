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

const dbStub = {
  query: {
    locations: { findMany: vi.fn() },
    currencySettings: { findMany: vi.fn() },
  },
};

vi.mock("~/db", () => {
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

const ensureDefaultCurrencyMock = vi.fn().mockResolvedValue(undefined);

vi.mock("~/db/providers/settings.server", () => ({
  ensureDefaultCurrency: ensureDefaultCurrencyMock,
}));

describe("root loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks that CHF exists as a currency during startup", async () => {
    const { getCurrentSession, isPublicPath } = await import(
      "~/services/auth.server"
    );
    vi.mocked(getCurrentSession).mockResolvedValue({
      user: null,
      headers: undefined,
    });
    vi.mocked(isPublicPath).mockReturnValue(true);

    const { loader } = await import("~/root");

    const request = new Request("http://localhost/auth/login");
    await loader({ request } as any);

    expect(ensureDefaultCurrencyMock).toHaveBeenCalledWith(dbStub);
  });
});
