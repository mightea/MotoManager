import { useSyncExternalStore } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { syncStore } from "~/services/sync-store.client";

export function HeaderSyncIndicator() {
  const { status, count } = useSyncExternalStore(
    syncStore.subscribe,
    syncStore.getSnapshot,
    () => ({ status: "idle" as const, count: 0 })
  );

  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all animate-in fade-in zoom-in duration-300",
        status === "syncing" && "bg-info/15 text-info",
        status === "success" && "bg-success/15 text-success",
        status === "error" && "bg-error/15 text-error"
      )}
    >
      {status === "syncing" && <RefreshCw className="h-3 w-3 animate-spin" />}
      {status === "success" && <CheckCircle2 className="h-3 w-3" />}
      <span className="hidden sm:inline">
        {status === "syncing"
          ? "Synchronisiere..."
          : status === "success"
            ? `${count} Einträge synchronisiert`
            : "Sync Fehler"}
      </span>
    </div>
  );
}
