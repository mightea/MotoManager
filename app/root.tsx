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
import { getTheme } from "~/utils/theme.server";
import { useEffect } from "react";
import clsx from "clsx";

import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  return data({ theme });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const theme = data?.theme;

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
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { theme } = useLoaderData<typeof loader>();
  
  return (
    <ThemeProvider specifiedTheme={theme}>
      <AppWithTheme>
        <LoadingIndicator />
        <Outlet />
      </AppWithTheme>
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
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-foreground dark:text-gray-50">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-navy-800 rounded-md mt-4">
          <code className="text-sm text-gray-700 dark:text-gray-200">{stack}</code>
        </pre>
      )}
    </main>
  );
}
