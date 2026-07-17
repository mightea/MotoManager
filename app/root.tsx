import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import { ThemeProvider, useTheme } from "~/components/theme-provider";
import { UmamiProvider } from "~/components/umami-provider";
import { ConfirmProvider } from "~/components/confirm-provider";
import { Button } from "~/components/button";
import {
  MotorcycleDetailSkeleton,
  HomeSkeleton,
  PageSkeleton,
} from "~/components/skeleton";
import { getTheme } from "~/utils/theme.client";
import { Theme } from "~/utils/theme";
import { getCurrentSession } from "~/services/auth";
import { useEffect } from "react";
import clsx from "clsx";

import "./app.css";

export async function clientLoader() {
  const theme = getTheme();
  await getCurrentSession();
  return { theme };
}

export function HydrateFallback() {
  // SPA mode only allows a HydrateFallback on the root route, so route-aware
  // skeletons are picked from the URL (client-only, window always exists) to
  // avoid a bare-spinner flash + layout shift on hard reloads / deep links.
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  let content: React.ReactNode;
  if (/^\/motorcycle\//.test(path)) {
    content = <MotorcycleDetailSkeleton />;
  } else if (path === "/") {
    content = <HomeSkeleton />;
  } else if (path === "/auth/login" || path === "/auth/logout") {
    content = (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  } else {
    content = <PageSkeleton />;
  }

  return <div className="min-h-screen bg-slate-50 dark:bg-navy-950">{content}</div>;
}

// Baseline Content-Security-Policy (production only — a strict connect-src would
// block Vite's dev-HMR websocket). This shrinks the XSS surface that makes the
// localStorage session token risky: `object-src 'none'` and `base-uri 'self'`
// block plugin/base-tag injection, `form-action 'self'` blocks form exfiltration,
// and the resource directives scope where styles/fonts/frames may load from.
//
// Limits of a *static* meta CSP for this cross-origin SPA (see SECURITY.md):
//   • the built index.html contains inline hydration scripts, so `script-src`
//     must keep `'unsafe-inline'` (nonces require a server/edge to set per-request);
//   • the backend + analytics + geocoder origins are runtime config, so
//     `script-src`/`connect-src` fall back to `https:` here.
// The complete, XSS-token-exfil-proof policy (nonces + pinned exact origins)
// belongs at the hosting/edge layer — SECURITY.md gives a ready-to-use header.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.openstreetmap.org",
].join("; ");

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof clientLoader>();
  const theme = data?.theme || Theme.LIGHT;

  return (
    <html
      lang="de"
      className={clsx(theme)}
      data-theme={theme === Theme.DARK ? "motomanager-dark" : "motomanager"}
    >
      <head>
        <meta charSet="utf-8" />
        {import.meta.env.PROD && (
          <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
        <script src="/config.js" />
      </head>
      <body className="bg-background font-sans antialiased text-foreground dark:bg-navy-950 dark:text-gray-50">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const loaderData = useLoaderData<typeof clientLoader>();
  const theme = loaderData?.theme || Theme.LIGHT;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-cleanup-done") === "1") return;

    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        indexedDB.deleteDatabase("MotoDatabase");
      } finally {
        localStorage.setItem("pwa-cleanup-done", "1");
      }
    })();
  }, []);

  return (
    <ThemeProvider specifiedTheme={theme}>
      <UmamiProvider>
        <ConfirmProvider>
          <AppWithTheme>
            <Outlet />
          </AppWithTheme>
        </ConfirmProvider>
      </UmamiProvider>
    </ThemeProvider>
  );
}

function AppWithTheme({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.className = clsx(theme);
      document.documentElement.dataset.theme =
        theme === Theme.DARK ? "motomanager-dark" : "motomanager";
    }
  }, [theme]);

  return <>{children}</>;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "Ein unerwarteter Fehler ist aufgetreten.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Fehler";
    details =
      error.status === 404
        ? "Die angeforderte Seite konnte nicht gefunden werden."
        : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-24 p-4 container mx-auto text-foreground dark:text-gray-50 flex flex-col items-center text-center">
      <div className="bg-white dark:bg-navy-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-navy-800 max-w-lg w-full">
        <h1 className="text-4xl font-black text-primary mb-4">{message}</h1>
        <p className="text-secondary dark:text-navy-300 mb-8">{details}</p>
        <Button onClick={() => window.location.reload()}>
          Erneut versuchen
        </Button>
        {import.meta.env.DEV && stack && (
          <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-navy-800 rounded-xl mt-8 text-left">
            <code className="text-xs text-gray-700 dark:text-gray-200">{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
