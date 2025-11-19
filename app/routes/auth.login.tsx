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
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "300px", margin: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1>MotoManager Login</h1>
      </div>

      <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        
        <div>
          <label htmlFor="identifier" style={{ display: "block", marginBottom: "5px" }}>E-Mail / Username</label>
          <input
            id="identifier"
            name="identifier"
            autoComplete="username"
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        
        <div>
          <label htmlFor="password" style={{ display: "block", marginBottom: "5px" }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        {errorMessage && (
          <div style={{ color: "red", marginBottom: "10px" }}>
            {errorMessage}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: "10px", cursor: "pointer" }}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </Form>

      {showRegister && (
        <p style={{ marginTop: "20px", textAlign: "center" }}>
           No account? No registration link available (removed per request).
        </p>
      )}
    </div>
  );
}
