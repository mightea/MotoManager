import { useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

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
    { headers: mergeHeaders(headers ?? {}) }
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
      "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten."
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
      { status: 400 }
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

  const errorMessage = useMemo(() => {
    if (actionData && !actionData.success && actionData.message) {
      return actionData.message;
    }
    return null;
  }, [actionData]);

  return (
    <div className="w-full max-w-sm">
      <Card className="shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-headline">
            Willkommen zurück
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Melde dich mit deinen Zugangsdaten an, um deine Garage zu verwalten.
          </p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
              <Label htmlFor="identifier">E-Mail oder Benutzername</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {errorMessage && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Anmeldung läuft..." : "Anmelden"}
            </Button>
          </Form>
          {showRegister && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Noch kein Konto?{" "}
              <Link className="text-primary underline" to="/auth/register">
                Jetzt registrieren
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
