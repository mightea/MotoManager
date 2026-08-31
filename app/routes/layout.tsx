import { Outlet, data, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { Toaster } from "~/components/toast";
import { endImpersonation, requireUser } from "~/services/auth";
import { useUmami } from "~/components/umami-provider";
import { useEffect, useRef, useState } from "react";
import { UserCog } from "lucide-react";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, impersonatedBy } = await requireUser(request);
  return data({ user, impersonatedBy });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user, impersonatedBy } = loaderData;
  const [isEndingImpersonation, setIsEndingImpersonation] = useState(false);

  const handleEndImpersonation = async () => {
    setIsEndingImpersonation(true);
    await endImpersonation();
    // Full reload: flushes every cache and loader state built as the other user.
    window.location.assign("/settings/admin");
  };
  const { identifyUser } = useUmami();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Umami scopes identify() to the current session, so this has to run on every
  // page load for a user's sessions to roll up under one profile. The provider
  // queues the call if the tracker script hasn't finished loading yet.
  //
  // `username` is the visitor ID because that is what reads well in the umami
  // dashboard, but it is editable in the admin user form — so `userId` rides
  // along as the immutable key to re-stitch history after a rename.
  useEffect(() => {
    if (user?.username) {
      identifyUser(user.username, {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user?.id, user?.username, user?.name, user?.email, user?.role, identifyUser]);

  // On client-side navigation, move focus to <main> so screen-reader and keyboard
  // users are informed the route changed (and start from the new content). Skip
  // the initial render so we don't steal focus on first load.
  //
  // `preventScroll: true` is essential: <main> sits below the sticky header, so a
  // plain focus() scrolls it to the viewport top — under the header — clipping the
  // page's top content (worst on reload).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased dark:bg-navy-950 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-base-100 focus:px-4 focus:py-2 focus:text-base-content focus:shadow-lg focus:ring-2 focus:ring-primary"
      >
        Zum Inhalt springen
      </a>
      {impersonatedBy && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
          <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Support-Modus: Du siehst die App als{" "}
            <strong>{user?.name || user?.username}</strong>
          </span>
          <button
            type="button"
            onClick={handleEndImpersonation}
            disabled={isEndingImpersonation}
            className="rounded-sm border border-amber-900/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide hover:bg-amber-400 disabled:opacity-60"
          >
            {isEndingImpersonation ? "Beende…" : "Beenden"}
          </button>
        </div>
      )}
      <Header user={user} />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="app-shell-safe flex-1 relative z-0 pt-6 outline-none"
      >
        {/* No `key={pathname}` here: re-keying force-remounted the entire route
            subtree on every navigation (re-initializing Leaflet, re-decoding
            images, causing layout shift) just to replay a CSS fade. Reconciliation
            is kept; the fade plays on initial mount. */}
        <div className="motion-safe:animate-fade-in">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
