import { Outlet, data, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { Toaster } from "~/components/toast";
import { requireUser } from "~/services/auth";
import { useUmami } from "~/components/umami-provider";
import { useEffect } from "react";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user } = await requireUser(request);
  return data({ user });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const { identifyUser } = useUmami();
  const location = useLocation();

  useEffect(() => {
    if (user?.username) {
      identifyUser({ username: user.username });
    }
  }, [user?.username, identifyUser]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased dark:bg-navy-950 flex flex-col">
      <Header user={user} />
      <main className="flex-1 relative z-0 pt-6">
        {/* Re-keying on pathname triggers the fade-in on every route transition. */}
        <div key={location.pathname} className="motion-safe:animate-fade-in">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
