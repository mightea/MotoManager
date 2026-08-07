import { Outlet, data, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { Header } from "~/components/header";
import { Toaster } from "~/components/toast";
import { requireUser } from "~/services/auth";
import { useUmami } from "~/components/umami-provider";
import { useEffect, useRef } from "react";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user } = await requireUser(request);
  return data({ user });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
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
