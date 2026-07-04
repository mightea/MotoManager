import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchFromBackend, rethrowRedirect } from "~/utils/backend";

function mockFetchOnce(init: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
}) {
  const response = {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    json: async () => init.json ?? {},
  } as Response;
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage);
}

describe("fetchFromBackend", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the parsed JSON body on success", async () => {
    mockFetchOnce({ ok: true, status: 200, json: { hello: "world" } });
    await expect(fetchFromBackend("/x")).resolves.toEqual({ hello: "world" });
  });

  it("attaches the Bearer token when provided", async () => {
    const fetchFn = mockFetchOnce({ ok: true, json: {} });
    await fetchFromBackend("/x", {}, "tok123");
    const headers = (fetchFn.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("throws an ApiError carrying the status and the body's error message", async () => {
    mockFetchOnce({ ok: false, status: 400, json: { error: "Bad input" } });
    const err = (await fetchFromBackend("/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Bad input");
  });

  it("clears the token and throws a redirect Response on 401", async () => {
    localStorage.setItem("moto_auth_token", "tok123");
    mockFetchOnce({ ok: false, status: 401 });
    const err = (await fetchFromBackend("/x", {}, "tok123").catch((e) => e)) as Response;
    // fetchFromBackend signals session expiry by throwing a redirect Response.
    expect(err).toBeInstanceOf(Response);
    expect(err.status).toBe(302);
    expect(localStorage.getItem("moto_auth_token")).toBeNull();
  });

  it("wraps a network failure in an ApiError with status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const err = (await fetchFromBackend("/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });

  it("wraps a timeout in an ApiError with status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
    );
    const err = (await fetchFromBackend("/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });
});

describe("rethrowRedirect", () => {
  it("re-throws a redirect Response (so a swallowing catch still redirects)", () => {
    const redirectResponse = new Response(null, { status: 302 });
    let thrown: unknown;
    try {
      rethrowRedirect(redirectResponse);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBe(redirectResponse);
  });

  it("ignores ordinary errors so the caller can handle them normally", () => {
    expect(() => rethrowRedirect(new Error("boom"))).not.toThrow();
    expect(() => rethrowRedirect(new ApiError("boom", 500))).not.toThrow();
  });
});
