import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  type ActionFunctionArgs,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ThemeProvider, useTheme } from "./contexts/ThemeProvider";
import { getTheme } from "./services/theme.server";
import { urlMotorcycle } from "./utils/urlUtils";
import { motorcycles, type NewMotorcycle } from "./db/schema";
import db from "./db";
import { SettingsProvider } from "./contexts/SettingsProvider";

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  const locations = await db.query.locations.findMany();

  const data = {
    theme,
    locations,
  };

  return data;
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
];

function MainApp() {
  const { theme } = useTheme();
  return (
    <html lang="de" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-body antialiased text-foreground">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { theme, locations } = loaderData;

  return (
    <ThemeProvider initialTheme={theme}>
      <SettingsProvider initialLocations={locations}>
        <MainApp />
      </SettingsProvider>
    </ThemeProvider>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);

  const motorcycle = await db
    .insert(motorcycles)
    .values(data as unknown as NewMotorcycle)
    .returning();
  return redirect(urlMotorcycle({ ...motorcycle[0] }));
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
