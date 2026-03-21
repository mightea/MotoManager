import { type SyncStatus } from "~/utils/sync";

export type SyncState = {
  status: SyncStatus;
  count: number;
};

let currentState: SyncState = { status: "idle", count: 0 };
const listeners = new Set<(state: SyncState) => void>();

export const syncStore = {
  subscribe(listener: (state: SyncState) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return currentState;
  },
  update(status: SyncStatus, count: number = 0) {
    currentState = { status, count };
    listeners.forEach((l) => l(currentState));
  }
};
