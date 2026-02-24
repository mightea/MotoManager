import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedData } from "~/utils/offline-cache.client";

describe("getCachedData", () => {
  const mockCacheName = "moto-manager-data-v1";
  const mockRequest = new Request("https://example.com/api/data?foo=bar");
  const mockData = { id: 1, name: "Test" };
  const mockResponse = new Response(JSON.stringify(mockData), {
    headers: { "Content-Type": "application/json" },
  });

  // Mock Cache Object
  const mockCache = {
    match: vi.fn(),
    put: vi.fn(),
  };

  // Mock caches Global
  const mockCaches = {
    open: vi.fn().mockResolvedValue(mockCache),
  };

  beforeEach(() => {
    vi.stubGlobal("caches", mockCaches);
    vi.stubGlobal("navigator", { onLine: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should fetch fresh data and update cache when online", async () => {
    const serverLoader = vi.fn().mockResolvedValue(mockData);
    
    const result = await getCachedData(mockRequest, serverLoader);

    expect(serverLoader).toHaveBeenCalledTimes(1);
    expect(mockCaches.open).toHaveBeenCalledWith(mockCacheName);
    expect(mockCache.put).toHaveBeenCalledWith(
      "/api/data?foo=bar",
      expect.any(Response)
    );
    expect(result).toEqual(mockData);

    // Verify the cached response content
    const putCall = mockCache.put.mock.calls[0];
    const responseInCache = putCall[1] as Response;
    const cachedJson = await responseInCache.json();
    expect(cachedJson).toEqual(mockData);
  });

  it("should return cached data if server loader fails when online", async () => {
    const serverLoader = vi.fn().mockRejectedValue(new Error("Server error"));
    mockCache.match.mockResolvedValue(mockResponse.clone());

    const result = await getCachedData(mockRequest, serverLoader);

    expect(serverLoader).toHaveBeenCalledTimes(1);
    expect(mockCache.match).toHaveBeenCalledWith("/api/data?foo=bar");
    expect(result).toEqual(mockData);
  });

  it("should return cached data directly when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const serverLoader = vi.fn();
    mockCache.match.mockResolvedValue(mockResponse.clone());

    const result = await getCachedData(mockRequest, serverLoader);

    expect(serverLoader).not.toHaveBeenCalled();
    expect(mockCache.match).toHaveBeenCalledWith("/api/data?foo=bar");
    expect(result).toEqual(mockData);
  });

  it("should fall back to server loader if offline and not in cache", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const serverLoader = vi.fn().mockResolvedValue(mockData);
    mockCache.match.mockResolvedValue(null);

    const result = await getCachedData(mockRequest, serverLoader);

    expect(serverLoader).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
  });

  it("should not cache if server loader returns null/undefined", async () => {
    const serverLoader = vi.fn().mockResolvedValue(null);
    
    const result = await getCachedData(mockRequest, serverLoader);

    expect(result).toBeNull();
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  it("should handle request with search parameters correctly in cache key", async () => {
    const requestWithSearch = new Request("https://example.com/list?sort=date&filter=active");
    const serverLoader = vi.fn().mockResolvedValue(mockData);
    
    await getCachedData(requestWithSearch, serverLoader);

    expect(mockCache.put).toHaveBeenCalledWith(
      "/list?sort=date&filter=active",
      expect.any(Response)
    );
  });
});
