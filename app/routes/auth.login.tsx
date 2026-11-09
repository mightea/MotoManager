import { Fingerprint, Eye, EyeOff } from "lucide-react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useNavigate,
} from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { Route } from "./+types/auth.login";
import {
  createSession,
  registerFirstUser,
  getCurrentSession,
  getUserCount,
  verifyLogin,
} from "~/services/auth";
import { authenticateWithPasskey } from "~/utils/webauthn";
import { getVersion } from "~/config";
import { ServerPicker } from "~/components/server-picker";
import { useUmami } from "~/components/umami-provider";
import { safeRedirectPath } from "~/utils/navigation";

const LABEL =
  "mb-1.5 block font-mono text-xs font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400";
const INPUT =
  "block h-11 w-full rounded-sm border border-base-300 bg-base-100 px-3 text-base text-base-content transition-colors placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-500 dark:focus:border-primary-light dark:focus:ring-primary-light/30";
const INPUT_ERROR = "border-error focus:border-error focus:ring-error/30 dark:border-error";
const PRIMARY_BUTTON =
  "flex h-12 w-full items-center justify-center rounded-sm bg-primary font-display text-[15px] uppercase tracking-[0.14em] text-primary-content shadow-[0_6px_18px_-10px_rgba(30,91,255,0.7)] transition-[filter,transform] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60";

const EMAIL_REGEX = /.+@.+\..+/i;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export function meta() {
  return [
    { title: "Login - Moto Manager" },
    { name: "description", content: "Melde dich bei deiner Garage an." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = safeRedirectPath(url.searchParams.get("redirectTo"));

  const { user, status } = await getCurrentSession();

  if (user) {
    throw redirect(redirectTo);
  }

  let userCount: number | null = null;
  try {
    userCount = await getUserCount();
  } catch {
    // Keep the login screen available for a later retry, but do not mistake an
    // outage for a fresh installation and offer administrator registration.
  }

  return data({
    redirectTo,
    isFirstUser: userCount === 0,
    backendAvailable: status !== "unavailable" && userCount !== null,
    version: getVersion(),
  });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
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

    const errors: Record<string, string> = {};

    if (name.length < 2) {
      errors.name = "Bitte gib deinen vollständigen Namen ein.";
    }

    if (!EMAIL_REGEX.test(email)) {
      errors.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
    }

    if (!USERNAME_REGEX.test(username)) {
      errors.username =
        "Der Benutzername muss 3-32 Zeichen lang sein und darf nur Buchstaben, Zahlen sowie ._- enthalten.";
    }

    if (password.length < 8) {
      errors.password = "Das Passwort muss mindestens 8 Zeichen lang sein.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Die Passwörter stimmen nicht überein.";
    }

    if (Object.keys(errors).length > 0) {
      return data({ success: false, errors, form: "register" }, { status: 400 });
    }

    try {
      // Re-check immediately before registration: the setup screen may have
      // been open while another client created the first account.
      const userCount = await getUserCount();
      if (userCount > 0) {
        return data(
          { success: false, message: "Registrierungen sind deaktiviert.", form: "register" },
          { status: 400 },
        );
      }

      const registration = await registerFirstUser({
        email,
        username,
        name,
        password,
      });
      await createSession(registration.token);

      const redirectTo = safeRedirectPath(redirectToRaw);
      return redirect(redirectTo);
    } catch (error) {
      console.error(`[Login Page] Registration failed:`, error);
      const message = error instanceof Error
        ? error.message
        : "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
      return data({ success: false, message, form: "register" }, { status: 503 });
    }
  }

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string> = {};

  if (identifier.length === 0) {
    errors.identifier = "Bitte gib E-Mail oder Benutzername ein.";
  } else if (identifier.includes("@")) {
    if (!EMAIL_REGEX.test(identifier)) {
      errors.identifier = "Bitte gib eine gültige E-Mail-Adresse ein.";
    }
  } else if (!USERNAME_REGEX.test(identifier)) {
    errors.identifier = "Der Benutzername muss 3-32 Zeichen lang sein.";
  }

  if (password.length === 0) {
    errors.password = "Bitte gib dein Passwort ein.";
  }

  if (Object.keys(errors).length > 0) {
    return data({ success: false, errors, form: "login" }, { status: 400 });
  }

  let loginResult;
  try {
    loginResult = await verifyLogin(identifier, password);
  } catch (error) {
    // Transport / server error (not bad credentials) — don't mislabel it.
    console.error(`[Login Page] Login request failed:`, error);
    return data(
      {
        success: false,
        message: "Anmeldung fehlgeschlagen. Bitte versuche es später erneut.",
        form: "login",
      },
      { status: 503 },
    );
  }

  if (!loginResult) {
    return data(
      { success: false, message: "E-Mail oder Passwort ist falsch.", form: "login" },
      { status: 400 },
    );
  }

  await createSession(loginResult.token);

  const redirectTo = safeRedirectPath(redirectToRaw);
  return redirect(redirectTo);
}

export default function Login() {
  const { trackEvent } = useUmami();
  const loaderData = useLoaderData<typeof clientLoader>();
  const redirectTo = loaderData?.redirectTo || "/";
  const isFirstUser = loaderData?.isFirstUser || false;
  const backendAvailable = loaderData?.backendAvailable ?? true;
  const version = loaderData?.version || "0.0.0";
  
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submittingIntent = navigation.formData?.get("intent");
  const isLoginSubmitting = navigation.state === "submitting" && submittingIntent !== "register";
  const isRegisterSubmitting = navigation.state === "submitting" && submittingIntent === "register";
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentYear] = useState(() => new Date().getFullYear());

  const loginError =
    actionData && !actionData.success && actionData.form === "login" && "message" in actionData
      ? actionData.message
      : null;
  const registerError =
    actionData && !actionData.success && actionData.form === "register" && "message" in actionData
      ? actionData.message
      : null;

  const fieldErrors =
    actionData && !actionData.success && "errors" in actionData ? actionData.errors : null;

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyError(null);
      trackEvent("passkey_login_attempt");
      await authenticateWithPasskey(identifier || undefined);
      // The passkey helper persisted the returned bearer token; continue to the
      // same validated application path as password login.
      trackEvent("passkey_login_success");
      navigate(safeRedirectPath(redirectTo));
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setPasskeyError(
          "Passkey-Login fehlgeschlagen. Bitte versuche es erneut oder nutze dein Passwort.",
        );
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        const activeElement = document.activeElement;
        const isInteractive =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "BUTTON" ||
          activeElement?.tagName === "SELECT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.tagName === "A";

        if (!isInteractive) {
          const form = document.querySelector("form");
          if (form && !isLoginSubmitting && !isRegisterSubmitting) {
            form.requestSubmit();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoginSubmitting, isRegisterSubmitting]);

  const fieldError = (message: string | undefined) =>
    message ? (
      <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-error">
        {message}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-base-200 dark:bg-navy-950">
      {/* Motorsport flag — structural top edge */}
      <div className="motorsport-stripe h-[3px] shrink-0" aria-hidden="true" />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[440px] animate-fade-in overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_rgba(15,23,42,0.03),0_16px_40px_-20px_rgba(15,23,42,0.2)] dark:border-navy-700 dark:bg-navy-900">
          <div className="motorsport-stripe h-[3px]" aria-hidden="true" />

          {/* Cover — service code, wordmark, monogram */}
          <div className="flex justify-between gap-4 border-b border-base-300 px-7 pb-5 pt-6 dark:border-navy-700">
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-400">
                {isFirstUser ? "Setup · Garage" : "Login · Garage"}
              </p>
              <h1 className="font-display text-[34px] uppercase leading-[1.1] tracking-wide text-base-content dark:text-white">
                Moto<span className="text-primary">Manager</span>
              </h1>
              <p className="text-sm text-base-content/70 dark:text-navy-300">
                Werkstattbuch &amp; Flottenmanagement
              </p>
            </div>
            <div
              aria-hidden="true"
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-base-content/20 bg-base-100 dark:bg-navy-800"
            >
              <span className="font-display text-xl leading-none">MM</span>
              <span className="absolute -bottom-px -right-px h-[7px] w-[7px] bg-primary" />
            </div>
          </div>

          <div className="px-7 pb-6 pt-5">
            {!backendAvailable && (
              <output className="mb-4 block rounded-sm border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-base-content dark:text-gray-100">
                <p className="font-semibold">Server momentan nicht erreichbar</p>
                <p className="mt-1 text-xs text-base-content/70 dark:text-navy-300">
                  Deine bestehende Sitzung bleibt gespeichert. Du kannst die Anmeldung erneut versuchen, sobald die Verbindung wiederhergestellt ist.
                </p>
              </output>
            )}
            {isFirstUser ? (
              <Form method="post" className="flex flex-col gap-4" noValidate>
                <input type="hidden" name="intent" value="register" />
                <input type="hidden" name="redirectTo" value={redirectTo} />

                <div className="relative rounded-sm border border-dashed border-primary/40 bg-primary/5 p-4 dark:bg-primary/10">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                    Administrator-Setup
                  </p>
                  <h2 className="mt-1 font-subdisplay text-lg text-base-content dark:text-gray-100">
                    Erstes Konto
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-base-content/70 dark:text-navy-300">
                    Erstelle das Administrationskonto, um deine Garage zu eröffnen.
                  </p>
                </div>

                <div>
                  <label htmlFor="name" className={LABEL}>
                    Vollständiger Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="Max Mustermann"
                    aria-invalid={fieldErrors?.name ? true : undefined}
                    className={clsx(INPUT, fieldErrors?.name && INPUT_ERROR)}
                  />
                  {fieldError(fieldErrors?.name)}
                </div>

                <div>
                  <label htmlFor="email" className={LABEL}>
                    E-Mail-Adresse
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@beispiel.ch"
                    aria-invalid={fieldErrors?.email ? true : undefined}
                    className={clsx(INPUT, fieldErrors?.email && INPUT_ERROR)}
                  />
                  {fieldError(fieldErrors?.email)}
                </div>

                <div>
                  <label htmlFor="username" className={LABEL}>
                    Benutzername
                  </label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    placeholder="benutzername"
                    aria-invalid={fieldErrors?.username ? true : undefined}
                    className={clsx(INPUT, fieldErrors?.username && INPUT_ERROR)}
                  />
                  {fieldError(fieldErrors?.username)}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-password" className={LABEL}>
                      Passwort
                    </label>
                    <input
                      id="new-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={fieldErrors?.password ? true : undefined}
                      className={clsx(INPUT, fieldErrors?.password && INPUT_ERROR)}
                    />
                    {fieldError(fieldErrors?.password)}
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className={LABEL}>
                      Bestätigen
                    </label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={fieldErrors?.confirmPassword ? true : undefined}
                      className={clsx(INPUT, fieldErrors?.confirmPassword && INPUT_ERROR)}
                    />
                    {fieldError(fieldErrors?.confirmPassword)}
                  </div>
                </div>

                {registerError && <Notice tone="error">{registerError}</Notice>}

                <button
                  type="submit"
                  onClick={() => trackEvent("register_submit")}
                  disabled={isRegisterSubmitting}
                  className={PRIMARY_BUTTON}
                >
                  {isRegisterSubmitting ? "Wird erstellt …" : "System initialisieren →"}
                </button>
              </Form>
            ) : (
              <Form method="post" className="flex flex-col gap-4" noValidate>
                <input type="hidden" name="intent" value="login" />
                <input type="hidden" name="redirectTo" value={redirectTo} />

                <div>
                  <label htmlFor="identifier" className={LABEL}>
                    E-Mail oder Benutzername
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="E-Mail / @username"
                    aria-invalid={fieldErrors?.identifier ? true : undefined}
                    className={clsx(INPUT, fieldErrors?.identifier && INPUT_ERROR)}
                  />
                  {fieldError(fieldErrors?.identifier)}
                </div>

                <div>
                  <label htmlFor="password" className={LABEL}>
                    Passwort
                  </label>
                  <div
                    className={clsx(
                      "flex rounded-sm border border-base-300 bg-base-100 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:focus-within:border-primary-light",
                      fieldErrors?.password && "border-error focus-within:border-error focus-within:ring-error/30 dark:border-error",
                    )}
                  >
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      aria-invalid={fieldErrors?.password ? true : undefined}
                      className="h-[42px] min-w-0 flex-1 rounded-sm bg-transparent px-3 text-base text-base-content focus:outline-none dark:text-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                      aria-pressed={showPassword}
                      className="grid h-[42px] w-11 shrink-0 place-items-center border-l border-base-200 text-base-content/70 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
                    </button>
                  </div>
                  {fieldError(fieldErrors?.password)}
                </div>

                {loginError && <Notice tone="error">{loginError}</Notice>}
                {passkeyError && <Notice tone="warn">{passkeyError}</Notice>}

                <button
                  type="submit"
                  onClick={() => trackEvent("login_submit")}
                  disabled={isLoginSubmitting}
                  className={PRIMARY_BUTTON}
                >
                  {isLoginSubmitting ? "Authentifizierung …" : "Login →"}
                </button>

                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-base-300 bg-base-100 font-display text-sm uppercase tracking-[0.14em] text-base-content transition-colors hover:border-base-content/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:text-white dark:hover:border-navy-500"
                >
                  <Fingerprint className="h-4 w-4" aria-hidden="true" />
                  Passkey-Login
                </button>

                <ServerPicker />
              </Form>
            )}
          </div>

          <div className="border-t border-base-300 bg-base-200 px-7 py-3 text-center dark:border-navy-700 dark:bg-navy-950/40">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-400">
              © {currentYear} · MotoManager · v{version}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "warn"; children: ReactNode }) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={clsx(
        "relative flex animate-fade-in items-start gap-3 rounded-sm border px-4 py-3 text-sm",
        isError
          ? "border-error/30 bg-error/5 text-error dark:border-error/40 dark:bg-error/10"
          : "border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-y-2 left-0 w-[3px] rounded-r-sm",
          isError ? "bg-error" : "bg-[var(--color-workshop)]",
        )}
      />
      <span className="pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {isError ? "ERR" : "WARN"}
      </span>
      <span>{children}</span>
    </div>
  );
}
