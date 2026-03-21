import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncPendingItems, initSync } from "~/utils/sync";
import { db } from "~/utils/db.client";
import { fetchFromBackend } from "~/utils/backend";

// Mock the dependencies
vi.mock("~/utils/db.client", () => ({
  db: {
    issues: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    maintenance: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
    torqueSpecs: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
    },
  },
}));

vi.mock("~/utils/backend", () => ({
  fetchFromBackend: vi.fn(),
}));

vi.mock("~/services/auth", () => ({
  getSessionToken: vi.fn().mockReturnValue("fake-token"),
}));

vi.mock("~/services/sync-store.client", () => ({
  syncStore: {
    update: vi.fn(),
  },
}));

describe("Sync Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate being online
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
  });

  describe("syncPendingItems", () => {
    it("should not run multiple syncs in parallel", async () => {
      const pendingSpec = { id: -1, motorcycleId: 1, name: "Test", isPending: 1 };
      
      let callCount = 0;
      (db.torqueSpecs.toArray as any).mockImplementation(async () => {
        if (callCount === 0) {
          callCount++;
          return [pendingSpec];
        }
        return [];
      });

      (db.issues.toArray as any).mockResolvedValue([]);
      (db.maintenance.toArray as any).mockResolvedValue([]);

      (fetchFromBackend as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ torqueSpec: { id: 100, name: "Test" } }), 50))
      );

      const sync1 = syncPendingItems();
      const sync2 = syncPendingItems();

      await Promise.all([sync1, sync2]);

      expect(fetchFromBackend).toHaveBeenCalledTimes(1);
    });

    it("should remove temporary item before adding server item", async () => {
      const pendingSpec = { id: -1, motorcycleId: 1, name: "Test", isPending: 1 };
      (db.torqueSpecs.toArray as any).mockResolvedValue([pendingSpec]);
      (db.issues.toArray as any).mockResolvedValue([]);
      (db.maintenance.toArray as any).mockResolvedValue([]);
      
      (fetchFromBackend as any).mockResolvedValue({ 
        torqueSpec: { id: 100, name: "Test" } 
      });

      await syncPendingItems();

      expect(db.torqueSpecs.delete).toHaveBeenCalledWith(-1);
      expect(db.torqueSpecs.put).toHaveBeenCalledWith({ id: 100, name: "Test" });
    });
  });

  describe("initSync", () => {
    it("should be idempotent when calling initSync multiple times", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      // First call
      initSync();
      const initialListeners = addEventListenerSpy.mock.calls.filter(c => c[0] === "online").length;
      
      // Second call
      initSync();
      
      // Should not have added more "online" listeners or intervals
      expect(addEventListenerSpy.mock.calls.filter(c => c[0] === "online").length).toBe(initialListeners);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });
});
