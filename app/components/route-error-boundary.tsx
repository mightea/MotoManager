import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "~/components/button";

/**
 * Route-scoped error boundary. Exported as a route's `ErrorBoundary` so a failed
 * loader/action renders *inside* the app layout (header + nav stay put) instead of
 * bubbling to the root boundary and replacing the whole app shell. The raw stack
 * is shown only in development.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  let heading = "Fehler";
  let details = "Ein unerwarteter Fehler ist aufgetreten.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      heading = "404";
      details = "Die angeforderte Seite konnte nicht gefunden werden.";
    } else {
      details = error.statusText || details;
    }
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="container mx-auto flex flex-col items-center px-4 py-16 text-center">
      <div className="w-full max-w-lg rounded-sm border border-base-300 bg-base-100 p-8 dark:bg-navy-800">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
          Fehler
        </p>
        <h1 className="mt-1 font-display text-2xl uppercase tracking-wide text-base-content">
          {heading}
        </h1>
        <p className="mt-3 text-sm text-base-content/70">{details}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => window.location.reload()}>Erneut versuchen</Button>
        </div>
        {import.meta.env.DEV && error instanceof Error && error.stack && (
          <pre className="mt-6 w-full overflow-x-auto rounded-sm bg-base-200 p-4 text-left dark:bg-navy-900">
            <code className="text-xs text-base-content/70">{error.stack}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
