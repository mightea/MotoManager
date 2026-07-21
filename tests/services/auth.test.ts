import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchFromBackend: vi.fn(),
  clearRequestCache: vi.fn(),
}));

vi.mock("~/utils/backend", () => ({
  fetchFromBackend: mocks.fetchFromBackend,
}));

vi.mock("~/utils/request-cache", () => ({
  cachedFetch: async (
    _key: string,
    _ttl: number,
    fetcher: () => Promise<unknown>,
  ) => fetcher(),
  clearRequestCache: mocks.clearRequestCache,
}));

import {
  createUser,
  getCurrentSession,
  registerFirstUser,
  setSessionToken,
} from "~/services/auth";

const backendUser = {
  id: 7,
  email: "rider@example.com",
  username: "rider",
  name: "Test Rider",
  role: "admin",
  createdAt: "2026-07-20T00:00:00Z",
  updatedAt: "2026-07-20T00:00:00Z",
  lastLoginAt: null,
};

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth session states", () => {
  beforeEach(() => {
    stubLocalStorage();
    localStorage.clear();
    mocks.fetchFromBackend.mockReset();
    mocks.clearRequestCache.mockReset();
  });

  it("reports anonymous when no stored token exists", async () => {
    await expect(getCurrentSession()).resolves.toEqual({
      user: null,
      token: null,
      status: "anonymous",
    });
  });

  it("preserves a token when the backend is temporarily unavailable", async () => {
    setSessionToken("still-valid");
    mocks.fetchFromBackend.mockRejectedValueOnce(new Error("offline"));

    await expect(getCurrentSession()).resolves.toEqual({
      user: null,
      token: "still-valid",
      status: "unavailable",
    });
    expect(localStorage.getItem("moto_auth_token")).toBe("still-valid");
  });

  it("clears an expired session signalled by the backend redirect", async () => {
    setSessionToken("expired");
    mocks.fetchFromBackend.mockRejectedValueOnce(new Response(null, { status: 302 }));

    await expect(getCurrentSession()).resolves.toEqual({
      user: null,
      token: null,
      status: "anonymous",
    });
    expect(localStorage.getItem("moto_auth_token")).toBeNull();
  });
});

describe("auth account endpoints", () => {
  beforeEach(() => {
    stubLocalStorage();
    localStorage.clear();
    mocks.fetchFromBackend.mockReset();
    mocks.clearRequestCache.mockReset();
  });

  it("uses public registration only for the initial account", async () => {
    mocks.fetchFromBackend.mockResolvedValueOnce({ user: backendUser, token: "new-token" });

    await expect(registerFirstUser({
      email: backendUser.email,
      username: backendUser.username,
      name: backendUser.name,
      password: "safe-password",
    })).resolves.toMatchObject({ token: "new-token" });

    expect(mocks.fetchFromBackend).toHaveBeenCalledWith("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: backendUser.email,
        username: backendUser.username,
        name: backendUser.name,
        password: "safe-password",
        confirmPassword: "safe-password",
      }),
    });
  });

  it("uses the authenticated admin endpoint for subsequent users", async () => {
    mocks.fetchFromBackend.mockResolvedValueOnce({ user: backendUser });
    const input = {
      email: backendUser.email,
      username: backendUser.username,
      name: backendUser.name,
      password: "safe-password",
    };

    await createUser(input, "admin-token");

    expect(mocks.fetchFromBackend).toHaveBeenCalledWith(
      "/admin/users",
      { method: "POST", body: JSON.stringify(input) },
      "admin-token",
    );
  });
});
