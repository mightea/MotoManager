import { Bike } from "lucide-react";
import { Form, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";

// Basic validation patterns for login form fields.
// These can be replaced with shared constants if the project exposes them elsewhere.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// Merge an arbitrary HeadersInit into a Headers instance.
// This allows calling code to treat returned headers uniformly.
function mergeHeaders(init?: HeadersInit | null): Headers {
  const headers = new Headers();

  if (!init) {
    return headers;
  }

  const source = new Headers(init);
  source.forEach((value, key) => {
    headers.append(key, value);
  });

  return headers;
}

// Placeholder type for an authenticated user.
// Adjust this to match your application's actual user shape if needed.
type SessionUser = {
  id: string;
  email?: string;
  username?: string;
};

// Retrieve the current session associated with the incoming request.
// This is a minimal implementation that always reports "no active user".
// Replace with your real session lookup if available.
async function getCurrentSession(
  _request: Request,
): Promise<{ user: SessionUser | null; headers?: HeadersInit }> {
  return { user: null, headers: undefined };
}

// Return the number of users in the system.
// This stub assumes there are no users; adjust when wiring to real persistence.
async function getUserCount(): Promise<number> {
  return 0;
}

// Verify login credentials from the incoming request or form data.
// This stub always returns null (authentication failure); integrate with your
// real user store to perform proper verification.
async function verifyLogin(
  _request: Request,
): Promise<SessionUser | null> {
  return null;
}

// Create a new authenticated session for the given user and redirect to the
// provided URL. This minimal implementation simply returns a redirect
// response without persisting any real session information.
async function createSession(
  _user: SessionUser,
  redirectTo: string,
): Promise<Response> {
  return redirect(redirectTo);
}
export function meta() {
  return [
    { title: "Login - Moto Manager" },
    { name: "description", content: "Melde dich bei deiner Garage an." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";

  const { user, headers } = await getCurrentSession(request);

  if (user) {
    const response = redirect(redirectTo);
    mergeHeaders(headers ?? {}).forEach((value, key) => {
      response.headers.set(key, value);
    });
    throw response;
  }

  const userCount = await getUserCount();
  const isFirstUser = userCount === 0;

  return data(
    {
      redirectTo,
      isFirstUser,
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intentRaw = String(formData.get("intent") ?? "login");
  const intent = intentRaw === "register" ? "register" : "login";
  const redirectToRaw = String(formData.get("redirectTo") ?? "/");

  if (intent === "register") {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const errors: string[] = [];

    if (name.length < 2) {
      errors.push("Bitte gib deinen vollständigen Namen ein.");
    }

    if (!EMAIL_REGEX.test(email)) {
      errors.push("Bitte gib eine gültige E-Mail-Adresse ein.");
    }

    if (!USERNAME_REGEX.test(username)) {
      errors.push(
        "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten.",
      );
    }

    if (password.length < 8) {
      errors.push("Das Passwort muss mindestens 8 Zeichen lang sein.");
    }

    if (password !== confirmPassword) {
      errors.push("Die Passwörter stimmen nicht überein.");
    }

    const userCount = await getUserCount();
    if (userCount > 0) {
      errors.push("Registrierungen sind deaktiviert. Bitte einen Administrator kontaktieren.");
    }

    if (errors.length > 0) {
      return data(
        { success: false, message: errors.join(" "), form: "register" },
        { status: 400 },
      );
    }

    try {
      const newUser = await createUser({
        email,
        username,
        name,
        password,
      });

      const session = await createSession(newUser.id);

      const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/";
      const response = redirect(redirectTo);
      mergeHeaders(session.headers ?? {}).forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
      return data(
        { success: false, message, form: "register" },
        { status: 400 },
      );
    }
  }

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: string[] = [];

  if (identifier.length === 0) {
    errors.push("Bitte gib E-Mail oder Benutzername ein.");
  } else if (identifier.includes("@")) {
    if (!EMAIL_REGEX.test(identifier)) {
      errors.push("Bitte gib eine gültige E-Mail-Adresse ein.");
    }
  } else if (!USERNAME_REGEX.test(identifier)) {
    errors.push(
      "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten.",
    );
  }

  if (password.length === 0) {
    errors.push("Bitte gib dein Passwort ein.");
  }

  if (errors.length > 0) {
    return data(
      { success: false, message: errors.join(" "), form: "login" },
      { status: 400 },
    );
  }

  const user = await verifyLogin(identifier, password);

  if (!user) {
    return data(
      { success: false, message: "E-Mail oder Passwort ist falsch.", form: "login" },
      { status: 400 },
    );
  }

  const session = await createSession(user.id);

  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/";
  const response = redirect(redirectTo);
  mergeHeaders(session.headers ?? {}).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export default function Login() {
  const { redirectTo, isFirstUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submittingIntent = navigation.formData?.get("intent");
  const isLoginSubmitting = navigation.state === "submitting" && submittingIntent !== "register";
  const isRegisterSubmitting = navigation.state === "submitting" && submittingIntent === "register";

  const loginError =
    actionData && !actionData.success && actionData.form === "login"
      ? actionData.message
      : null;
  const registerError =
    actionData && !actionData.success && actionData.form === "register"
      ? actionData.message
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100 p-4 dark:from-navy-950 dark:via-navy-900 dark:to-navy-950">
      {/* Motorsport accent stripe */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-[#008AC9] via-[#2B115A] to-[#F11A22]" />

      <div className="w-full max-w-md animate-fade-in space-y-6 rounded-2xl border border-white/60 bg-white/80 p-8 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl dark:border-navy-700/60 dark:bg-navy-900/70 dark:ring-white/5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm dark:from-navy-700 dark:to-navy-800 dark:text-primary-light">
            <Bike className="h-7 w-7" />
          </span>

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-secondary dark:text-navy-400">
              MotoManager
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-gray-50">
              Garage Cockpit
            </h1>
          </div>
        </div>

        {isFirstUser ? (
          <div className="space-y-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 dark:border-primary/40 dark:bg-primary/10">
            <div>
              <h2 className="text-base font-semibold text-foreground dark:text-gray-100">
                Erstes Konto erstellen
              </h2>
              <p className="mt-1 text-xs text-secondary dark:text-navy-300">
                Noch kein Benutzer vorhanden. Lege jetzt das erste Administrationskonto an.
              </p>
            </div>

            <Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="register" />
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div>
                <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                  Benutzername
                </label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                    Passwort
                  </label>
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                    Passwort bestätigen
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                  />
                </div>
              </div>

              {registerError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                  {registerError}
                </div>
              )}

              <button
                type="submit"
                disabled={isRegisterSubmitting}
                className="w-full flex justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 dark:shadow-primary/10 dark:focus:ring-offset-navy-900"
              >
                {isRegisterSubmitting ? "Erstellen..." : "Konto erstellen"}
              </button>
            </Form>
          </div>
        ) : (
          <div className="space-y-5">
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="login" />
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div>
                <label htmlFor="identifier" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                  E-Mail / Username
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  required
                  className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1.5 block w-full rounded-xl border-gray-200 bg-white shadow-sm transition-shadow focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-gray-50"
                />
              </div>

              {loginError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="w-full flex justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 dark:shadow-primary/10 dark:focus:ring-offset-navy-900"
              >
                {isLoginSubmitting ? "Wird angemeldet..." : "Anmelden"}
              </button>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
