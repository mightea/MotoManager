import { Bike, Mail, User, Lock, ArrowRight, Fingerprint } from "lucide-react";
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

const EMAIL_REGEX = /.+@.+\..+/i;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export function meta() {
  return [
    { title: "Login - Moto Manager" },
    { name: "description", content: "Melde dich bei deiner Garage an." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";
  return data({
    redirectTo,
    isFirstUser: false,
    version: getVersion(),
  });
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

  console.log(`[Login Page] Action triggered with intent: ${intent}`);

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
      console.log(`[Login Page] Attempting registration for username: ${username}, email: ${email}`);
      const _newUser = await createUser({
        email,
        username,
        name,
        password,
      });
      console.log(`[Login Page] User created successfully: ${username}`);

      // After registration, we need to login to get the token
      const loginResult = await verifyLogin(username, password);
      console.log(`[Login Page] Auto-login after registration result:`, loginResult ? "Success" : "Failed");

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

  console.log(`[Login Page] Attempting login for identifier: ${identifier}`);
  const loginResult = await verifyLogin(identifier, password);
  console.log(`[Login Page] Login result for ${identifier}:`, loginResult ? "Success" : "Failed");

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
      await authenticateWithPasskey(identifier || undefined);
      // If successful, the server has set the cookie. We just need to navigate.
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-navy-950">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-red-500/5 blur-3xl dark:bg-red-500/10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      {/* Motorsport accent stripe */}
      <div className="fixed inset-x-0 top-0 z-50 h-1.5 flex shadow-sm">
        <div className="flex-1 bg-[#008AC9]" />
        <div className="flex-1 bg-[#2B115A]" />
        <div className="flex-1 bg-[#F11A22]" />
      </div>

      <div className="z-10 w-full max-w-[440px] animate-fade-in px-4">
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl transition-all dark:border-navy-700/50 dark:bg-navy-900/80 dark:ring-white/5">
          {/* Header Section */}
          <div className="bg-gradient-to-b from-white/50 to-transparent p-8 pb-4 dark:from-white/5">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/20 blur-xl dark:bg-primary/40" />
                <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white text-primary shadow-xl ring-1 ring-black/5 dark:bg-navy-800 dark:text-primary-light dark:ring-white/10">
                  <Bike className="h-8 w-8" />
                </span>
              </div>

              <div>
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-secondary/60 dark:text-navy-400">
                  MotoManager
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground dark:text-gray-50">
                  Garagenverwaltung
                </h1>
              </div>
            </div>
          </div>

          <div className="p-8 pt-4">
            {isFirstUser ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 dark:border-primary/40 dark:bg-primary/10">
                  <h2 className="text-base font-bold text-foreground dark:text-gray-100">
                    Administrator Setup
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-secondary dark:text-navy-300">
                    Willkommen! Erstelle das erste Administrationskonto, um deine Garage zu
                    verwalten.
                  </p>
                </div>

                <Form method="post" className="space-y-4" noValidate>
                  <input type="hidden" name="intent" value="register" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <div className="space-y-4">
                    <div className="group relative">
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                            "block w-full rounded-2xl border-gray-100 bg-white/50 py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                            fieldErrors?.name &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                          )}
                        />
                      </div>
                      {fieldErrors?.name && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                            "block w-full rounded-2xl border-gray-100 bg-white/50 py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                            fieldErrors?.email &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                          )}
                        />
                      </div>
                      {fieldErrors?.email && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="username"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                            "block w-full rounded-2xl border-gray-100 bg-white/50 py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                            fieldErrors?.username &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                          )}
                        />
                      </div>
                      {fieldErrors?.username && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                          {fieldErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="group relative">
                        <label
                          htmlFor="new-password"
                          className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                              "block w-full rounded-2xl border-gray-100 bg-white/50 py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                              fieldErrors?.password &&
                                "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                            )}
                          />
                        </div>
                        {fieldErrors?.password && (
                          <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                            {fieldErrors.password}
                          </p>
                        )}
                      </div>
                      <div className="group relative">
                        <label
                          htmlFor="confirm-password"
                          className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                              "block w-full rounded-2xl border-gray-100 bg-white/50 py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                              fieldErrors?.confirmPassword &&
                                "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                            )}
                          />
                        </div>
                        {fieldErrors?.confirmPassword && (
                          <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                            {fieldErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {registerError && (
                    <div className="flex animate-fade-in items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {registerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRegisterSubmitting}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-4 py-4 text-sm font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60 dark:shadow-primary/5"
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
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                            "block w-full rounded-2xl border-gray-100 bg-white/50 py-3.5 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                            fieldErrors?.identifier &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                          )}
                        />
                      </div>
                      {fieldErrors?.identifier && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                          {fieldErrors.identifier}
                        </p>
                      )}
                    </div>

                    <div className="group relative">
                      <label
                        htmlFor="password"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-secondary/70 dark:text-navy-400"
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
                            "block w-full rounded-2xl border-gray-100 bg-white/50 py-3.5 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-navy-700 dark:bg-navy-800/50 dark:text-gray-50 dark:placeholder:text-navy-600 dark:focus:border-primary-light dark:focus:bg-navy-800 dark:focus:ring-primary-light/10",
                            fieldErrors?.password &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500/50",
                          )}
                        />
                      </div>
                      {fieldErrors?.password && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>
                  </div>

                  {loginError && (
                    <div className="flex animate-fade-in items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {loginError}
                    </div>
                  )}

                  {passkeyError && (
                    <div className="flex animate-fade-in items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {passkeyError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isLoginSubmitting}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary px-4 py-4 text-sm font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60 dark:shadow-primary/5"
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
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3 text-sm font-bold text-secondary transition-all hover:bg-white hover:text-primary hover:shadow-md dark:border-navy-700 dark:bg-navy-800/50 dark:text-navy-300 dark:hover:bg-navy-800 dark:hover:text-primary-light"
                    >
                      <Fingerprint className="h-4 w-4" />
                      <span>Passkey-Login</span>
                    </button>
                  </div>
                </Form>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-6 text-center dark:border-navy-700/50 dark:bg-navy-950/30">
            <p className="text-[10px] font-medium text-secondary/50 dark:text-navy-500">
              © {new Date().getFullYear()} MotoManager • Garagenverwaltung • v{version}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
