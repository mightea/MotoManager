import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/auth.register";
import {
  createSession,
  createUser,
  getCurrentSession,
  getUserCount,
  mergeHeaders,
  adoptOrphanedRecords,
} from "~/services/auth.server";
import { isRegistrationEnabled } from "~/config.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

const EMAIL_REGEX = /.+@.+\..+/i;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getCurrentSession(request);
  const userCount = await getUserCount();
  const registrationEnabled = isRegistrationEnabled();

  if (userCount > 0 && !registrationEnabled) {
    const destination = user ? "/" : "/auth/login";
    const response = redirect(destination);
    mergeHeaders(headers ?? {}).forEach((value, key) => {
      response.headers.set(key, value);
    });
    throw response;
  }

  if (user) {
    const response = redirect("/");
    mergeHeaders(headers ?? {}).forEach((value, key) => {
      response.headers.set(key, value);
    });
    throw response;
  }

  const headerInit =
    headers && Object.keys(headers).length > 0
      ? mergeHeaders(headers)
      : undefined;

  return data({ registrationEnabled: registrationEnabled || userCount === 0 }, headerInit ? { headers: headerInit } : undefined);
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: string[] = [];

  if (name.length < 2) {
    errors.push("Der Name muss mindestens 2 Zeichen lang sein.");
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push("Bitte gib eine gültige E-Mail-Adresse ein.");
  }

  if (!USERNAME_REGEX.test(usernameRaw)) {
    errors.push(
      "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten."
    );
  }

  if (password.length < 8) {
    errors.push("Das Passwort muss mindestens 8 Zeichen enthalten.");
  }

  if (password !== confirmPassword) {
    errors.push("Die Passwörter stimmen nicht überein.");
  }

  if (errors.length > 0) {
    return data({ success: false, message: errors.join(" ") }, { status: 400 });
  }

  const userCount = await getUserCount();
  const registrationEnabled = isRegistrationEnabled();
  if (userCount > 0 && !registrationEnabled) {
    return data(
      {
        success: false,
        message:
          "Die Registrierung wurde durch einen Administrator deaktiviert.",
      },
      { status: 400 }
    );
  }

  let user;
  try {
    user = await createUser({
      email,
      username: usernameRaw,
      name,
      password,
      role: "admin",
    });
  } catch (error) {
    return data(
      {
        success: false,
        message:
          (error instanceof Error && error.message) ||
          "Der Benutzer konnte nicht angelegt werden.",
      },
      { status: 400 }
    );
  }
  await adoptOrphanedRecords(user.id);
  const session = await createSession(user.id);

  const response = redirect("/");
  mergeHeaders(session.headers ?? {}).forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-headline">
            MotoManager einrichten
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Lege deinen Administratorzugang an, um mit MotoManager zu starten.
          </p>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                id="username"
                name="username"
                required
                placeholder="z.B. motoman"
              />
              <p className="text-xs text-muted-foreground">
                3-32 Zeichen, nur Buchstaben, Zahlen, Punkt, Unterstrich oder Bindestrich.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
            </div>
            {actionData && !actionData.success && actionData.message && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionData.message}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Wird erstellt..." : "Konto anlegen"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Bereits eingerichtet?{" "}
              <Link className="text-primary underline" to="/auth/login">
                Zur Anmeldung
              </Link>
            </p>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
