import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  data,
  type ActionFunctionArgs,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ThemeProvider, useTheme } from "./contexts/ThemeProvider";
import { getTheme } from "./services/theme.server";
import { urlMotorcycle } from "./utils/urlUtils";
import {
  type NewMotorcycle,
  locations as locationsTable,
  type User,
} from "./db/schema";
import db, { getDb } from "./db";
import { SettingsProvider } from "./contexts/SettingsProvider";
import { AuthProvider } from "./contexts/AuthProvider";
import {
  getCurrentSession,
  isPublicPath,
  mergeHeaders,
  requireUser,
} from "./services/auth.server";
import { eq } from "drizzle-orm";
import { createMotorcycle } from "~/db/providers/motorcycles.server";
import { ensureDefaultCurrency } from "~/db/providers/settings.server";

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  const url = new URL(request.url);

  const { user, headers: sessionHeaders } = await getCurrentSession(request);
  const publicPath = isPublicPath(url.pathname);

  await ensureDefaultCurrency(db);

  if (!user && !publicPath) {
    const redirectTo = encodeURIComponent(
      `${url.pathname}${url.search}${url.hash}`,
    );
    const response = redirect(`/auth/login?redirectTo=${redirectTo}`);
    const mergedHeaders = mergeHeaders(sessionHeaders ?? {});
    mergedHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    throw response;
  }

  const [locationResult, currencyResult] = user
    ? await Promise.all([
        db.query.locations.findMany({
          where: eq(locationsTable.userId, user.id),
        }),
        db.query.currencySettings.findMany(),
      ])
    : [[], []];

  const payload = {
    theme,
    locations: locationResult,
    currencies: currencyResult,
    user: user ?? null,
  } as {
    theme: Awaited<ReturnType<typeof getTheme>>;
    locations: typeof locationResult;
    currencies: typeof currencyResult;
    user: User | null;
  };

  const merged = mergeHeaders(sessionHeaders ?? {});

  return data(payload, {
    headers: merged,
  });
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
  const { theme, locations, currencies, user } = loaderData;

  return (
    <ThemeProvider initialTheme={theme}>
      <AuthProvider initialUser={user}>
        <SettingsProvider
          initialLocations={locations}
          initialCurrencies={currencies}
        >
          <MainApp />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();

  const parseString = (value: FormDataEntryValue | null | undefined) =>
    typeof value === "string" ? value : "";

  const parseNumber = (
    value: FormDataEntryValue | null | undefined,
    fallback?: number,
  ) => {
    const parsed = Number.parseFloat(parseString(value));
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseInteger = (
    value: FormDataEntryValue | null | undefined,
    fallback?: number,
  ) => {
    const parsed = Number.parseInt(parseString(value), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseBoolean = (value: FormDataEntryValue | null | undefined) =>
    parseString(value) === "true";

  const modelYear = parseInteger(formData.get("modelYear"));

  const newMotorcycle: NewMotorcycle = {
    make: parseString(formData.get("make")),
    model: parseString(formData.get("model")),
    ...(modelYear !== undefined ? { modelYear } : {}),
    userId: user.id,
    vin: parseString(formData.get("vin")),
    vehicleIdNr: parseString(formData.get("vehicleIdNr")) || undefined,
    numberPlate: parseString(formData.get("numberPlate")) || undefined,
    isVeteran: parseBoolean(formData.get("isVeteran")),
    isArchived: parseBoolean(formData.get("isArchived")),
    firstRegistration: parseString(formData.get("firstRegistration")),
    initialOdo: parseInteger(formData.get("initialOdo")) ?? 0,
    purchaseDate: parseString(formData.get("purchaseDate")),
    purchasePrice: parseNumber(formData.get("purchasePrice")) ?? 0,
  };

  const dbClient = await getDb();
  const inserted = await createMotorcycle(dbClient, newMotorcycle);
  const motorcycle = inserted.at(0);
  if (!motorcycle) {
    throw new Error("Motorrad konnte nicht erstellt werden.");
  }

  const response = redirect(urlMotorcycle({ ...motorcycle }));
  const merged = mergeHeaders(headers ?? {});
  merged.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
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
