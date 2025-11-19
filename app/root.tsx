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
import { getTheme } from "~/utils/theme.server";
import clsx from "clsx";

import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  return data({ theme });
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <html lang="en" className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
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
        <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-darkblue-800 rounded-md mt-4">
          <code className="text-sm text-gray-700 dark:text-gray-200">{stack}</code>
        </pre>
      )}
    </main>
  );
}