import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { ThemeProvider, useTheme } from "~/components/theme-provider";
import { UmamiProvider } from "~/components/umami-provider";
import { LoadingIndicator } from "~/components/loading-indicator";
import { Button } from "~/components/button";
import { getTheme } from "~/utils/theme.client";
import { Theme } from "~/utils/theme";
import { getCurrentSession } from "~/services/auth";
import { initSync } from "~/utils/sync";
import { getPublicBackendUrl, isRegistrationEnabled, getVersion, getUmamiWebsiteId, getUmamiScriptUrl } from "~/config";
import { useEffect } from "react";
import clsx from "clsx";

import "./app.css";

export async function loader() {
  return {
    ENV: {
      BACKEND_URL: getPublicBackendUrl(),
      INTERNAL_BACKEND_URL: process.env.INTERNAL_BACKEND_URL,
      ENABLE_REGISTRATION: isRegistrationEnabled(),
      APP_VERSION: getVersion(),
      UMAMI_WEBSITE_ID: getUmamiWebsiteId(),
      UMAMI_SCRIPT_URL: getUmamiScriptUrl(),
    },
  };
}

export async function clientLoader({ serverLoaderData }: any) {
  if (typeof window !== "undefined" && serverLoaderData?.ENV) {
    (window as any).ENV = serverLoaderData.ENV;
  }
  const theme = getTheme();
  await getCurrentSession();
  return { ...serverLoaderData, theme };
}

export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<any>();
  const theme = data?.theme || Theme.LIGHT;

  return (
    <html lang="de" className={clsx(theme)}>
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
        {data?.ENV && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
            }}
          />
        )}
        {data?.ENV?.UMAMI_SCRIPT_URL && data?.ENV?.UMAMI_WEBSITE_ID && (
          <script
            async
            defer
            src={data.ENV.UMAMI_SCRIPT_URL}
            data-website-id={data.ENV.UMAMI_WEBSITE_ID}
            data-auto-track="false"
          />
        )}
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
  const revalidator = useRevalidator();

  useEffect(() => {
    initSync();

    const handleRevalidate = () => {
      revalidator.revalidate();
    };

    window.addEventListener("moto-revalidate", handleRevalidate);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(() => {
          // SW registered
        }).catch(() => {
          // SW registration failed
        });
      });
    }

    return () => {
      window.removeEventListener("moto-revalidate", handleRevalidate);
    };
  }, [revalidator]);

  return (
    <ThemeProvider specifiedTheme={theme}>
      <UmamiProvider>
        <AppWithTheme>
          <LoadingIndicator />
          <Outlet />
        </AppWithTheme>
      </UmamiProvider>
    </ThemeProvider>
  );
}

function AppWithTheme({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.className = clsx(theme);
    }
  }, [theme]);

  return <>{children}</>;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "Ein unerwarteter Fehler ist aufgetreten.";
  let stack: string | undefined;

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Fehler";
    details =
      error.status === 404
        ? "Die angeforderte Seite konnte nicht gefunden werden."
        : error.statusText || details;
  } else if (error instanceof Error) {
    if (error.message.includes("fetch") || isOffline) {
      message = "Offline";
      details = "Diese Seite ist momentan nicht verfügbar, da du offline bist und die Daten nicht im Cache gespeichert sind.";
    } else {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="pt-24 p-4 container mx-auto text-foreground dark:text-gray-50 flex flex-col items-center text-center">
      <div className="bg-white dark:bg-navy-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-navy-800 max-w-lg w-full">
        <h1 className="text-4xl font-black text-primary mb-4">{message}</h1>
        <p className="text-secondary dark:text-navy-300 mb-8">{details}</p>
        <Button onClick={() => window.location.reload()}>
          Erneut versuchen
        </Button>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-navy-800 rounded-xl mt-8 text-left">
            <code className="text-xs text-gray-700 dark:text-gray-200">{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
