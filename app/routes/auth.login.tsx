import { Bike } from "lucide-react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/auth.login";
import {
  createSession,
  getCurrentSession,
  getUserCount,
  mergeHeaders,
  verifyLogin,
} from "~/services/auth.server";
import { isRegistrationEnabled } from "~/config.server";

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
  const registrationEnabled = isRegistrationEnabled();
  const showRegister = userCount === 0 || registrationEnabled;

  return data(
    {
      redirectTo,
      showRegister,
    },
    { headers: mergeHeaders(headers ?? {}) },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectToRaw = String(formData.get("redirectTo") ?? "/");

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
    return data({ success: false, message: errors.join(" ") }, { status: 400 });
  }

  const user = await verifyLogin(identifier, password);

  if (!user) {
    return data(
      { success: false, message: "E-Mail oder Passwort ist falsch." },
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
  const { redirectTo, showRegister } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errorMessage = actionData && !actionData.success && actionData.message ? actionData.message : null;

    return (

      <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-navy-950">

        <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-navy-900">

          <div className="flex flex-col items-center gap-3 text-center">

            <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-primary dark:bg-navy-700 dark:text-blue-400">

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

  

          <Form method="post" className="space-y-6">

            <input type="hidden" name="redirectTo" value={redirectTo} />

            

            <div>

              <label htmlFor="identifier" className="block text-sm font-medium text-foreground dark:text-gray-200">E-Mail / Username</label>

              <input

                id="identifier"

                name="identifier"

                autoComplete="username"

                required

                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"

              />

            </div>

            

            <div>

              <label htmlFor="password" className="block text-sm font-medium text-foreground dark:text-gray-200">Password</label>

              <input

                id="password"

                name="password"

                type="password"

                autoComplete="current-password"

                required

                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 sm:text-sm"

              />

            </div>

  

            {errorMessage && (

              <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">

                {errorMessage}

              </div>

            )}

  

            <button 

              type="submit" 

              disabled={isSubmitting}

              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-primary dark:hover:bg-primary-light dark:text-white"

            >

              {isSubmitting ? "Logging in..." : "Login"}

            </button>

          </Form>

  

          {showRegister && (

            <p className="mt-6 text-center text-sm text-secondary dark:text-gray-400">

               No account? No registration link available (removed per request).

            </p>

          )}

        </div>

      </div>

    );

  }

  