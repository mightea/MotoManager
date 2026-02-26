import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { ThemeProvider, useTheme } from "~/components/theme-provider";
import { LoadingIndicator } from "~/components/loading-indicator";
import { useIsOffline } from "~/utils/offline-status.client";
import { getTheme } from "~/utils/theme.server";
import { useEffect } from "react";
import clsx from "clsx";

import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  return data({ theme });
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
      };

      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker);
        return () => {
          window.removeEventListener("load", registerServiceWorker);
        };
      }
    }
  }, []);

  return (
    <html lang="en" className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased text-foreground dark:bg-navy-950 dark:text-gray-50">
        <LoadingIndicator />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  // We need to access the loader data here, but Layout doesn't receive it directly as props in React Router 7 same way.
  // However, we can use useLoaderData() inside a component.
  // But Layout wraps everything.
  // The issue is that `Layout` is used by `root.tsx`'s default export which is `App`.
  // Wait, in RR7, root.tsx exports Layout.
  
  // We can't use useLoaderData inside Layout if it's the root layout wrapper for the whole document structure
  // unless we move the html/body inside a component that is a child of ThemeProvider.
  // But ThemeProvider needs to wrap the content.
  
  return (
      <AppWrapper>{children}</AppWrapper>
  );
}

function AppWrapper({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  return (
    <ThemeProvider specifiedTheme={data?.theme ?? null}>
      <AppContent>{children}</AppContent>
    </ThemeProvider>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const isOffline = useIsOffline();
  let message = "Oops!";
  let details = "An unexpected error occurred.";
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
    
    if (isOffline && (details.includes("offline") || details.includes("cache"))) {
      message = "Offline-Modus";
      details = "Diese Seite wurde noch nicht zwischengespeichert und ist daher offline nicht verfügbar. Bitte besuche diese Seite einmal online, um sie später auch offline ansehen zu können.";
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-foreground dark:text-gray-50 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-gray-200 dark:border-navy-700 shadow-xl max-w-lg">
        <h1 className="text-4xl font-bold mb-4 text-primary">{message}</h1>
        <p className="text-lg text-secondary dark:text-navy-300">{details}</p>
        
        <div className="mt-8">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark active:scale-95"
          >
            Zurück zur Übersicht
          </a>
        </div>
      </div>

      {stack && process.env.NODE_ENV === "development" && (
        <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-navy-800 rounded-md mt-12 text-left max-w-4xl mx-auto">
          <code className="text-xs text-gray-700 dark:text-gray-200">{stack}</code>
        </pre>
      )}
    </main>
  );
}