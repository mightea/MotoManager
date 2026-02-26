import { WifiOff } from "lucide-react";
import { useIsOffline } from "~/utils/offline-status";

/**
 * A banner displayed at the top of the page when the browser is offline.
 */
export function OfflineBanner() {
  const isOffline = useIsOffline();

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 py-2 text-white shadow-md">
      <div className="container mx-auto flex items-center justify-center gap-3 px-4 text-sm font-bold uppercase tracking-wider">
        <WifiOff className="h-4 w-4" />
        <span>Offline-Modus — Read-Only</span>
      </div>
    </div>
  );
}
