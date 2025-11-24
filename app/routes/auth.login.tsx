import { Bike } from "lucide-react";
import { Form, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/auth.login";
import {
  createSession,
  createUser,
  getCurrentSession,
  getUserCount,
  mergeHeaders,
  verifyLogin,
} from "~/services/auth.server";

const EMAIL_REGEX = /.+@.+\..+/i;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-navy-950">
      <div className="w-full max-w-xl space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-navy-900">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-primary dark:bg-navy-700 dark:text-primary-light">
            <Bike className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary dark:text-gray-400">
              MotoManager
            </p>
            <h1 className="text-2xl font-semibold text-foreground dark:text-gray-50">
              Garage Cockpit
            </h1>
          </div>
        </div>

        {isFirstUser ? (
          <div className="space-y-4 rounded-xl border border-dashed border-primary/40 p-4 dark:border-primary/60">
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
                  <label htmlFor="name" className="block text-sm font-medium text-foreground dark:text-gray-200">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-gray-200">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-foreground dark:text-gray-200">
                    Benutzername
                  </label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-foreground dark:text-gray-200">
                      Passwort
                    </label>
                    <input
                      id="new-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground dark:text-gray-200">
                      Passwort bestätigen
                    </label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                    />
                  </div>
                </div>

                {registerError && (
                  <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                    {registerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegisterSubmitting}
                  className="w-full flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 dark:bg-primary dark:hover:bg-primary-light"
                >
                  {isRegisterSubmitting ? "Erstellen..." : "Konto erstellen"}
                </button>
              </Form>
          </div>
        ) : (
          <div className="space-y-6 rounded-xl border border-gray-100 p-4 dark:border-navy-700">
            <h2 className="text-base font-semibold text-foreground dark:text-gray-100">Anmelden</h2>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="login" />
              <input type="hidden" name="redirectTo" value={redirectTo} />

              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-foreground dark:text-gray-200">
                  E-Mail / Username
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground dark:text-gray-200">
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"
                />
              </div>

              {loginError && (
                <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="w-full flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 dark:bg-primary dark:hover:bg-primary-light"
              >
                {isLoginSubmitting ? "Wird angemeldet..." : "Login"}
              </button>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
