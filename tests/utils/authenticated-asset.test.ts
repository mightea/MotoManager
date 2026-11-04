import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/services/auth", () => ({
  getSessionToken: () => "secret-session-token",
  clearSessionToken: vi.fn(),
  consumeStashedAdminToken: vi.fn(),
}));

import { fetchAuthenticatedAsset, openAuthenticatedAsset } from "~/utils/backend";

function mockFetch(body: string, type: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(new Blob([body], { type }), { status: 200, headers: { "Content-Type": type } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockTab() {
  const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  return tab;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchAuthenticatedAsset", () => {
  it("sends the session token as a header, never in the URL", async () => {
    const fetchMock = mockFetch("x", "image/jpeg");
    await fetchAuthenticatedAsset("/previews/a.jpg");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("token");
    expect(url).not.toContain("secret-session-token");
    expect(init.headers).toEqual({ Authorization: "Bearer secret-session-token" });
  });
});

describe("openAuthenticatedAsset", () => {
  it("opens a PDF in the new tab from a blob URL", async () => {
    mockFetch("%PDF-1.4", "application/pdf");
    const tab = mockTab();
    await openAuthenticatedAsset("/documents/a.pdf");
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("blob:mock");
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("downloads active content instead of rendering it on the app origin", async () => {
    mockFetch("<script>alert(1)</script>", "text/html");
    const tab = mockTab();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await openAuthenticatedAsset("/documents/legacy.html");
    expect(tab.location.href).toBe("");
    expect(tab.close).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("closes the tab and rethrows when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const tab = mockTab();
    await expect(openAuthenticatedAsset("/documents/gone.pdf")).rejects.toThrow("404");
    expect(tab.close).toHaveBeenCalled();
  });
});
