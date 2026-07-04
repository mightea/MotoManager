import { Mail, User, Lock, ArrowRight, Fingerprint } from "lucide-react";
import {
  Form,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useNavigate,
} from "react-router";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Route } from "./+types/auth.login";
import {
  createSession,
  createUser,
  getCurrentSession,
  getUserCount,
  verifyLogin,
} from "~/services/auth";
import { authenticateWithPasskey } from "~/utils/webauthn";
import { getVersion } from "~/config";
import { useUmami } from "~/components/umami-provider";

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
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";

  const { user } = await getCurrentSession();

  if (user) {
    throw redirect(redirectTo);
  }

  return data({
    redirectTo,
    isFirstUser: false,
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

    const userCount = await getUserCount();
    if (userCount > 0) {
      return data(
        { success: false, message: "Registrierungen sind deaktiviert.", form: "register" },
        { status: 400 },
      );
    }

    if (Object.keys(errors).length > 0) {
      return data({ success: false, errors, form: "register" }, { status: 400 });
    }

    try {
      const _newUser = await createUser({
        email,
        username,
        name,
        password,
      });

      // After registration, we need to login to get the token
      const loginResult = await verifyLogin(username, password);

      if (!loginResult) {
        return redirect("/auth/login");
      }

      await createSession(loginResult.token);

      const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/";
      return redirect(redirectTo);
    } catch (error) {
      console.error(`[Login Page] Registration failed:`, error);
      const message =
        error instanceof Error
          ? error.message
          : "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
      return data({ success: false, message, form: "register" }, { status: 400 });
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

  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/";
  return redirect(redirectTo);
}

export default function Login() {
  const { trackEvent } = useUmami();
  const loaderData = useLoaderData<typeof clientLoader>();
  const redirectTo = loaderData?.redirectTo || "/";
  const isFirstUser = loaderData?.isFirstUser || false;
  const version = loaderData?.version || "0.0.0";
  
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const submittingIntent = navigation.formData?.get("intent");
  const isLoginSubmitting = navigation.state === "submitting" && submittingIntent !== "register";
  const isRegisterSubmitting = navigation.state === "submitting" && submittingIntent === "register";
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");

  const loginError =
    actionData && !actionData.success && actionData.form === "login" && "message" in actionData
      ? (actionData as any).message
      : null;
  const registerError =
    actionData && !actionData.success && actionData.form === "register" && "message" in actionData
      ? (actionData as any).message
      : null;

  const fieldErrors =
    actionData && !actionData.success && "errors" in actionData ? (actionData as any).errors : null;

  const handlePasskeyLogin = async () => {
    try {
      setPasskeyError(null);
      trackEvent("passkey_login_attempt");
      await authenticateWithPasskey(identifier || undefined);
      // If successful, the server has set the cookie. We just need to navigate.
      trackEvent("passkey_login_success");
      navigate(redirectTo);
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-200 p-4 dark:bg-navy-950">
      {/* Atmospheric backdrop — soft Motorsport colored light pools, subtle
          paper-like carbon weave. The motorsport flag at the top is the
          structural anchor, drawn from the design system. */}
      <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl dark:bg-accent/15" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/8 blur-3xl dark:bg-secondary/20" />
        {/* Subtle paper grain */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0, transparent 2px, currentColor 2px, currentColor 3px)",
          }}
        />
      </div>

      {/* Motorsport flag — structural top edge */}
      <div className="motorsport-stripe fixed inset-x-0 top-0 z-50 h-[3px] shadow-sm" aria-hidden="true" />

      <div className="z-10 w-full max-w-[460px] animate-fade-in px-4">
        <div className="overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:border-navy-700 dark:bg-navy-900">
          {/* Service-manual cover — monogram + service code */}
          <div className="relative border-b border-base-300 px-8 pb-6 pt-8 dark:border-navy-700">
            <span aria-hidden="true" className="motorsport-stripe absolute inset-x-0 top-0 h-[3px]" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
                  Login · Garage
                </p>
                <h1 className="mt-2 font-display text-4xl uppercase leading-[0.95] tracking-wide text-base-content dark:text-white">
                  Moto<span className="text-primary">Manager</span>
                </h1>
                <p className="mt-2 font-sans text-sm text-base-content/65 dark:text-navy-300">
                  Werkstattbuch &amp; Flottenmanagement
                </p>
              </div>
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-sm border border-base-content/15 bg-base-100 dark:bg-navy-800">
                <span className="font-display text-3xl leading-none">MM</span>
                <span aria-hidden="true" className="absolute -bottom-px -right-px h-1.5 w-1.5 bg-primary" />
              </div>
            </div>
          </div>

          <div className="p-8 pt-6">
            {isFirstUser ? (
              <div className="space-y-6">
                <div className="relative rounded-sm border border-dashed border-primary/40 bg-primary/5 p-4 dark:border-primary/40 dark:bg-primary/10">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Administrator-Setup
                  </p>
                  <h2 className="mt-1 font-subdisplay text-lg text-base-content dark:text-gray-100">
                    Erstes Konto
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-base-content/65 dark:text-navy-300">
                    Erstelle das Administrationskonto, um deine Garage zu eröffnen.
                  </p>
                </div>

                <Form method="post" className="space-y-4" noValidate>
                  <input type="hidden" name="intent" value="register" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <div className="space-y-4">
                    <div className="group relative">
                      <label
                        htmlFor="name"
                        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                      >
                        Vollständiger Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                        <input
                          id="name"
                          name="name"
                          autoComplete="name"
                          placeholder="Max Mustermann"
                          className={clsx(
                            "block w-full rounded-sm border border-base-300 bg-base-100 py-3 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                            fieldErrors?.name &&
                              "border-error focus:border-error focus:ring-error/30 dark:border-error",
                          )}
                        />
                      </div>
                      {fieldErrors?.name && (
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="email"
                        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                      >
                        E-Mail Adresse
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="email@beispiel.ch"
                          className={clsx(
                            "block w-full rounded-sm border border-base-300 bg-base-100 py-3 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                            fieldErrors?.email &&
                              "border-error focus:border-error focus:ring-error/30 dark:border-error",
                          )}
                        />
                      </div>
                      {fieldErrors?.email && (
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="username"
                        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                      >
                        Benutzername
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-secondary/40 transition-colors group-focus-within:text-primary">
                          @
                        </div>
                        <input
                          id="username"
                          name="username"
                          autoComplete="username"
                          placeholder="benutzername"
                          className={clsx(
                            "block w-full rounded-sm border border-base-300 bg-base-100 py-3 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                            fieldErrors?.username &&
                              "border-error focus:border-error focus:ring-error/30 dark:border-error",
                          )}
                        />
                      </div>
                      {fieldErrors?.username && (
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                          {fieldErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="group relative">
                        <label
                          htmlFor="new-password"
                          className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                        >
                          Passwort
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                          <input
                            id="new-password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            className={clsx(
                              "block w-full rounded-sm border border-base-300 bg-base-100 py-3 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                              fieldErrors?.password &&
                                "border-error focus:border-error focus:ring-error/30 dark:border-error",
                            )}
                          />
                        </div>
                        {fieldErrors?.password && (
                          <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                            {fieldErrors.password}
                          </p>
                        )}
                      </div>
                      <div className="group relative">
                        <label
                          htmlFor="confirm-password"
                          className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                        >
                          Bestätigen
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                          <input
                            id="confirm-password"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className={clsx(
                              "block w-full rounded-sm border border-base-300 bg-base-100 py-3 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                              fieldErrors?.confirmPassword &&
                                "border-error focus:border-error focus:ring-error/30 dark:border-error",
                            )}
                          />
                        </div>
                        {fieldErrors?.confirmPassword && (
                          <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                            {fieldErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {registerError && (
                    <div className="relative flex animate-fade-in items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-error/70 pt-0.5">ERR</span>
                      {registerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    onClick={() => trackEvent("register_submit")}
                    disabled={isRegisterSubmitting}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm bg-primary px-4 py-4 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                  >
                    <span className="relative z-10">
                      {isRegisterSubmitting ? "Wird erstellt..." : "System initialisieren"}
                    </span>
                    {!isRegisterSubmitting && (
                      <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </Form>
              </div>
            ) : (
              <div className="space-y-6">
                <Form method="post" className="space-y-5" noValidate>
                  <input type="hidden" name="intent" value="login" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <div className="space-y-4">
                    <div className="group relative">
                      <label
                        htmlFor="identifier"
                        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                      >
                        E-Mail oder Benutzername
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                        <input
                          id="identifier"
                          name="identifier"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="E-Mail / @username"
                          className={clsx(
                            "block w-full rounded-sm border border-base-300 bg-base-100 py-3.5 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                            fieldErrors?.identifier &&
                              "border-error focus:border-error focus:ring-error/30 dark:border-error",
                          )}
                        />
                      </div>
                      {fieldErrors?.identifier && (
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                          {fieldErrors.identifier}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="password"
                        className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
                      >
                        Passwort
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/40 transition-colors group-focus-within:text-primary" />
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className={clsx(
                            "block w-full rounded-sm border border-base-300 bg-base-100 py-3.5 pl-11 pr-4 text-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-800 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:ring-primary-light/30",
                            fieldErrors?.password &&
                              "border-error focus:border-error focus:ring-error/30 dark:border-error",
                          )}
                        />
                      </div>
                      {fieldErrors?.password && (
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-error">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>
                  </div>

                  {loginError && (
                    <div className="relative flex animate-fade-in items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-error/70 pt-0.5">ERR</span>
                      {loginError}
                    </div>
                  )}

                  {passkeyError && (
                    <div className="relative flex animate-fade-in items-start gap-3 rounded-sm border border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 px-4 py-3 text-sm text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]">
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-[var(--color-workshop)]" />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-workshop)] pt-0.5">WARN</span>
                      {passkeyError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      onClick={() => trackEvent("login_submit")}
                      disabled={isLoginSubmitting}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm bg-primary px-4 py-4 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                    >
                      <span className="relative z-10">
                        {isLoginSubmitting ? "Authentifizierung..." : "Login"}
                      </span>
                      {!isLoginSubmitting && (
                        <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>

                    <button
                      type="button"
                      onClick={handlePasskeyLogin}
                      className="flex w-full items-center justify-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/75 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800/60 dark:text-navy-300 dark:hover:border-navy-500 dark:hover:text-white"
                    >
                      <Fingerprint className="h-4 w-4" />
                      <span>Passkey-Login</span>
                    </button>
                  </div>
                </Form>
              </div>
            )}
          </div>

          <div className="border-t border-base-300 bg-base-200/50 px-6 py-4 text-center dark:border-navy-700 dark:bg-navy-950/40">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50 dark:text-navy-400">
              © {new Date().getFullYear()} · MotoManager · v{version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
