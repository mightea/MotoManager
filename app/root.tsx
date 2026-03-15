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
import { ThemeProvider, useTheme } from "~/components/theme-provider";
import { LoadingIndicator } from "~/components/loading-indicator";
import { Modal } from "~/components/modal";
import { Button } from "~/components/button";
import { getTheme } from "~/utils/theme.client";
import { getNewChangelog, markChangelogSeen } from "~/services/changelog.client";
import { useEffect, useState } from "react";
import clsx from "clsx";

import "./app.css";

export async function clientLoader() {
  const theme = getTheme();
  const changelog = await getNewChangelog();
  return data({ theme, changelog });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof clientLoader>();
  const theme = data?.theme;

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
  const { theme, changelog } = useLoaderData<typeof clientLoader>();
  const [isChangelogOpen, setIsChangelogOpen] = useState(!!changelog);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('SW registered: ', registration);
        }).catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  const handleCloseChangelog = () => {
    setIsChangelogOpen(false);
    if (changelog) {
      markChangelogSeen(changelog.version);
    }
  };

  return (
    <ThemeProvider specifiedTheme={theme}>
      <AppWithTheme>
        <LoadingIndicator />
        <Outlet />
        {changelog && (
          <Modal
            isOpen={isChangelogOpen}
            onClose={handleCloseChangelog}
            title={`Was ist neu in v${changelog.version}`}
          >
            <div className="space-y-4">
              <ChangelogRenderer content={changelog.content} />
              <div className="pt-4 flex justify-end">
                <Button onClick={handleCloseChangelog}>
                  Verstanden
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AppWithTheme>
    </ThemeProvider>
  );
}

function ChangelogRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 ml-2 text-secondary dark:text-navy-300">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`changelog-title-${index}`} className="text-lg font-semibold mt-4 mb-2 first:mt-0">
          {trimmed.replace("### ", "")}
        </h3>
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      // Basic link parsing [text](url) -> <a>
      const parts = trimmed.substring(2).split(/(\[.*?\]\(.*?\))/g);
      const content = parts.map((part, pIndex) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          return (
            <a
              key={`changelog-link-${index}-${pIndex}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return part;
      });

      currentList.push(
        <li key={`changelog-item-${index}`} className="leading-relaxed">
          {content}
        </li>
      );
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`changelog-p-${index}`} className="text-secondary dark:text-navy-300">
          {trimmed}
        </p>
      );
    }
  });

  flushList();

  return <div className="changelog-content">{elements}</div>;
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
