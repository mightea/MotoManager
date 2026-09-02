import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, Bot, Check, Globe, ShieldCheck, User, X } from "lucide-react";
import { getCurrentSession, requireUser } from "~/services/auth";
import { getOauthConsent, submitOauthConsent } from "~/services/settings";
import { ApiError } from "~/utils/backend";
import { SCOPE_LABELS } from "~/utils/mcp";
import { Button } from "~/components/button";
import type { ApiTokenScope, OauthConsentClient } from "~/types/db";
import type { PublicUser } from "~/types/auth";
import type { Route } from "./+types/oauth.consent";

export function meta() {
  return [
    { title: "Zugriff erlauben - Moto Manager" },
    { name: "description", content: "Einer Anwendung Zugriff auf deine Garage gewähren." },
  ];
}

/** The authorization request as forwarded by the backend's `/oauth/authorize`. */
type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  requestedScope: ApiTokenScope;
  state: string | null;
  codeChallenge: string;
  resource: string | null;
};

type LoaderData =
  | { ok: true; user: PublicUser; request: AuthorizationRequest; client: OauthConsentClient }
  | { ok: false; error: string };

const INVALID_REQUEST =
  "Ungültige Autorisierungsanfrage. Bitte starte die Verbindung in der Anwendung erneut.";

function parseRequest(search: URLSearchParams): AuthorizationRequest | null {
  const clientId = search.get("client_id")?.trim() ?? "";
  const redirectUri = search.get("redirect_uri")?.trim() ?? "";
  const codeChallenge = search.get("code_challenge")?.trim() ?? "";
  const method = search.get("code_challenge_method")?.trim() ?? "";
  if (!clientId || !redirectUri || !codeChallenge || method !== "S256") return null;

  const scope = search.get("scope") ?? "";
  const requestedScope: ApiTokenScope = scope.split(/[\s+]+/).includes("write") ? "write" : "read";
  const state = search.get("state");
  const resource = search.get("resource");
  return {
    clientId,
    redirectUri,
    requestedScope,
    state: state && state.length > 0 ? state : null,
    codeChallenge,
    resource: resource && resource.length > 0 ? resource : null,
  };
}

export async function clientLoader({ request }: Route.ClientLoaderArgs): Promise<LoaderData> {
  const { user, token } = await requireUser(request);
  const url = new URL(request.url);
  const authRequest = parseRequest(url.searchParams);
  if (!authRequest) {
    return { ok: false, error: INVALID_REQUEST };
  }

  try {
    const info = await getOauthConsent(token, authRequest.clientId, authRequest.redirectUri);
    return { ok: true, user, request: authRequest, client: info.client };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 404) {
        return {
          ok: false,
          error: "Unbekannte Anwendung oder nicht registrierte Weiterleitungs-URL.",
        };
      }
      if (e.status === 400) {
        return { ok: false, error: INVALID_REQUEST };
      }
      if (e.message) return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: "Die Anfrage konnte nicht geprüft werden. Bitte versuche es später erneut.",
    };
  }
}

function describeSubmitError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "Im Support-Modus (Impersonation) nicht möglich.";
    if (e.status === 404) return "Unbekannte Anwendung oder nicht registrierte Weiterleitungs-URL.";
    if (e.status === 400) return INVALID_REQUEST;
    if (e.message) return e.message;
  }
  return e instanceof Error && e.message
    ? e.message
    : "Die Entscheidung konnte nicht übermittelt werden.";
}

export default function OauthConsent({ loaderData }: Route.ComponentProps) {
  if (!loaderData.ok) {
    return (
      <PageShell>
        <ErrorBanner message={loaderData.error} />
        <section className={cardClass}>
          <p className="text-sm text-base-content/80 dark:text-navy-200">
            Es wurde kein Zugriff gewährt. Du kannst dieses Fenster schliessen oder zurück zur
            Garage gehen.
          </p>
          <div className="mt-5">
            <Link to="/" className="inline-flex">
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Zur Garage
              </Button>
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return <ConsentForm data={loaderData} />;
}

function ConsentForm({
  data,
}: {
  data: Extract<LoaderData, { ok: true }>;
}) {
  const { user, request, client } = data;
  const [scope, setScope] = useState<ApiTokenScope>(request.requestedScope);
  const [pending, setPending] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "allow" | "deny") => {
    setPending(decision);
    setError(null);
    try {
      // requireUser already validated the session; the token is re-read here
      // because the loader data must stay serialisable and secret-free.
      const { token } = await getCurrentSession();
      if (!token) {
        window.location.assign(
          `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }
      const { redirectUrl } = await submitOauthConsent(token, {
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        scope,
        state: request.state,
        codeChallenge: request.codeChallenge,
        codeChallengeMethod: "S256",
        resource: request.resource,
        decision,
      });
      // Full navigation: the redirect leaves our origin and hands the code
      // (or the denial) back to the requesting application.
      window.location.assign(redirectUrl);
    } catch (e) {
      setError(describeSubmitError(e));
      setPending(null);
    }
  };

  return (
    <PageShell>
      {error && <ErrorBanner message={error} />}

      <section className={cardClass}>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              {client.clientName}
            </h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              möchte auf deine Garage zugreifen.
            </p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-sm border border-base-300/70 px-3 py-2.5 dark:border-navy-700">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-secondary dark:text-navy-400" />
            <div className="min-w-0">
              <dt className={fieldLabelClass}>Weiterleitung an</dt>
              <dd className="truncate font-mono text-xs text-base-content dark:text-white">
                {client.redirectHost}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-sm border border-base-300/70 px-3 py-2.5 dark:border-navy-700">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-secondary dark:text-navy-400" />
            <div className="min-w-0">
              <dt className={fieldLabelClass}>Angemeldet als</dt>
              <dd className="truncate text-base-content dark:text-white">
                {user.name || user.username}
                {user.name && (
                  <span className="text-secondary dark:text-navy-400"> · {user.username}</span>
                )}
              </dd>
            </div>
          </div>
        </dl>

        <fieldset className="mt-6 space-y-3">
          <legend className={fieldLabelClass}>Berechtigung</legend>
          <ScopeOption
            value="read"
            selected={scope === "read"}
            disabled={pending !== null}
            onSelect={setScope}
            description="nur Abfragen — die Anwendung kann Daten lesen, aber nichts ändern."
          />
          <ScopeOption
            value="write"
            selected={scope === "write"}
            disabled={pending !== null}
            onSelect={setScope}
            description="zusätzlich Wartungen, Tankstopps, Probleme, Ausgaben und Teile anlegen. Nie löschen, nie Admin-Funktionen."
          />
        </fieldset>

        <p className="mt-5 flex items-start gap-2 text-xs text-secondary dark:text-navy-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span>
            Die Anwendung sieht ausschliesslich deine eigenen Daten. Du kannst den Zugriff
            jederzeit unter{" "}
            <Link to="/settings/api-tokens" className="font-medium text-primary hover:underline">
              Einstellungen → KI-Zugriff (MCP)
            </Link>{" "}
            widerrufen.
          </span>
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={pending !== null}
            isLoading={pending === "deny"}
            leftIcon={<X className="h-4 w-4" />}
            onClick={() => decide("deny")}
          >
            Ablehnen
          </Button>
          <Button
            type="button"
            variant="primary"
            stripe
            disabled={pending !== null}
            isLoading={pending === "allow"}
            leftIcon={<Check className="h-4 w-4" />}
            onClick={() => decide("allow")}
          >
            Zugriff erlauben
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

function ScopeOption({
  value,
  selected,
  disabled,
  onSelect,
  description,
}: {
  value: ApiTokenScope;
  selected: boolean;
  disabled: boolean;
  onSelect: (scope: ApiTokenScope) => void;
  description: string;
}) {
  const id = `scope-${value}`;
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        selected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-gray-100 bg-gray-50 hover:border-base-content/30 dark:border-navy-700 dark:bg-navy-900"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <input
        id={id}
        type="radio"
        name="scope"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
      />
      <span className="min-w-0 space-y-1">
        <ScopeBadge scope={value} />
        <span className="block text-sm text-base-content/80 dark:text-navy-200">{description}</span>
      </span>
    </label>
  );
}

function ScopeBadge({ scope }: { scope: ApiTokenScope }) {
  const cls =
    scope === "write"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10"
    >
      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
      <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
        ERR
      </span>
      <span>{message}</span>
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pt-4 sm:pt-28 pb-20">
      <div className="space-y-1">
        <span className="label-tag">
          <span>Integration</span>
        </span>
        <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-base-content dark:text-white">
          Zugriff erlauben
        </h1>
        <p className="text-secondary dark:text-navy-300">
          Eine Anwendung möchte sich über MCP mit deiner Garage verbinden.
        </p>
      </div>
      {children}
    </div>
  );
}

const cardClass =
  "relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800";

const fieldLabelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";
