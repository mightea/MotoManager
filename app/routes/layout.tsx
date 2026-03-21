import { Outlet, data, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { requireUser } from "~/services/auth";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user } = await requireUser(request);
  return data({ user });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const location = useLocation();
  const isMotorcycleDetail = location.pathname.startsWith("/motorcycle/");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans antialiased dark:bg-navy-950">
      <Header user={user} />
      <main
        className={clsx(
          "flex-1 relative z-0",
          // On mobile detail pages header is non-fixed (in document flow) → no top padding
          // On desktop or non-detail pages header is fixed → need pt-24
          isMotorcycleDetail ? "pt-0 md:pt-24" : "pt-24"
        )}
      >
        {isOffline && (
          <div className="bg-orange-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 animate-in slide-in-from-top duration-500 relative z-50 shadow-md border-b border-orange-700/20">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
              <WifiOff className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">Offline-Modus: Du kannst Daten ansehen und Wartungen erfassen, aber einige Funktionen sind eingeschränkt.</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
