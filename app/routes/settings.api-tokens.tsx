import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSubmit,
} from "react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Plus,
  ScrollText,
  TerminalSquare,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { requireUser } from "~/services/auth";
import {
  createApiToken,
  getApiTokens,
  getMcpAuditLog,
  revokeApiToken,
} from "~/services/settings";
import { ApiError } from "~/utils/backend";
import {
  buildClaudeMcpAddCommand,
  describeExpiry,
  EXPIRY_OPTIONS,
  formatAuditArguments,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getMcpUrl,
  isExpired,
  OUTCOME_LABELS,
  SCOPE_LABELS,
  truncate,
} from "~/utils/mcp";
import { Button } from "~/components/button";
import { Modal } from "~/components/modal";
import { useConfirm } from "~/components/confirm-provider";
import type { ApiToken, ApiTokenScope, McpAuditEntry, McpAuditOutcome } from "~/types/db";
import type { Route } from "./+types/settings.api-tokens";

export function meta() {
  return [
    { title: "KI-Zugriff (MCP) - Moto Manager" },
    { name: "description", content: "API-Tokens für KI-Assistenten verwalten." },
  ];
}

const AUDIT_LIMIT = 50;

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  // The audit log is secondary — if it fails the token list must still render.
  const [apiTokens, auditEntries] = await Promise.all([
    getApiTokens(token),
    getMcpAuditLog(token, AUDIT_LIMIT).catch((): McpAuditEntry[] => []),
  ]);
  return { apiTokens, auditEntries };
}

function describeApiError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "Im Support-Modus (Impersonation) nicht möglich.";
    if (e.status === 409) return "Maximal 20 aktive Tokens — bitte zuerst einen widerrufen.";
    if (e.status === 404) return "Token nicht gefunden.";
    if (e.message) return e.message;
  }
  return e instanceof Error && e.message ? e.message : fallback;
}

type ActionResult =
  | { error: string }
  | { success: string }
  | { token: string; apiToken: ApiToken };

export async function clientAction({ request }: Route.ClientActionArgs): Promise<ActionResult | null> {
  const { token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "createToken") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name ist erforderlich." };
    if (name.length > 64) return { error: "Name darf höchstens 64 Zeichen lang sein." };
    const scopeRaw = formData.get("scope");
    const scope: ApiTokenScope = scopeRaw === "write" ? "write" : "read";
    const expiresRaw = String(formData.get("expiresInDays") ?? "");
    const expiresInDays = expiresRaw === "" ? undefined : Number(expiresRaw);
    if (expiresInDays !== undefined && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365)) {
      return { error: "Ablauf muss zwischen 1 und 365 Tagen liegen." };
    }
    try {
      const created = await createApiToken(token, { name, scope, expiresInDays });
      return { token: created.token, apiToken: created.apiToken };
    } catch (e) {
      return { error: describeApiError(e, "Token konnte nicht erstellt werden.") };
    }
  }

  if (intent === "revokeToken") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    try {
      await revokeApiToken(token, id);
      return { success: "Token widerrufen." };
    } catch (e) {
      return { error: describeApiError(e, "Token konnte nicht widerrufen werden.") };
    }
  }

  return null;
}

type CreatedSecret = { token: string; apiToken: ApiToken };

export default function ApiTokensSettings() {
  const { apiTokens, auditEntries } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const submit = useSubmit();
  const confirmDialog = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  // The action result that was current when the dialog was last opened or
  // closed. Anything newer belongs to the current dialog session, so the
  // one-time secret and form errors are derived from actionData instead of
  // being copied into state by an effect.
  const [seenAction, setSeenAction] = useState<ActionResult | null | undefined>(undefined);
  const freshAction = actionData !== seenAction ? actionData : null;

  const mcpUrl = getMcpUrl();
  const isSubmitting = navigation.state === "submitting";
  const isCreating = isSubmitting && navigation.formData?.get("intent") === "createToken";

  // A successful create keeps the modal open and swaps the form for the
  // one-time secret; a failed one surfaces its error inside the modal.
  const secret: CreatedSecret | null =
    createOpen && freshAction && "token" in freshAction
      ? { token: freshAction.token, apiToken: freshAction.apiToken }
      : null;
  const formError = createOpen && freshAction && "error" in freshAction ? freshAction.error : null;

  const openCreate = () => {
    setSeenAction(actionData);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setSeenAction(actionData);
    setCreateOpen(false);
    // The list already revalidates after the action; do it again on close so a
    // token created seconds ago is guaranteed to be visible with fresh data.
    revalidator.revalidate();
  };

  const pageError = !createOpen && freshAction && "error" in freshAction ? freshAction.error : null;
  const pageSuccess = actionData && "success" in actionData ? actionData.success : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pt-4 sm:pt-28 pb-20">
      <div className="flex items-center gap-4">
        <Link
          to="/settings"
          aria-label="Zurück zu den Einstellungen"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-secondary transition-colors hover:border-primary hover:text-primary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="space-y-1">
          <span className="label-tag">
            <span>Integration</span>
          </span>
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-base-content dark:text-white">
            KI-Zugriff (MCP)
          </h1>
          <p className="text-secondary dark:text-navy-300">
            Persönliche API-Tokens für KI-Assistenten wie Claude.
          </p>
        </div>
      </div>

      {pageError && (
        <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
          <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">ERR</span>
          <span>{pageError}</span>
        </div>
      )}
      {pageSuccess && (
        <div className="relative flex items-start gap-3 rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-success dark:border-success/40 dark:bg-success/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-success" />
          <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">OK</span>
          <span>{pageSuccess}</span>
        </div>
      )}

      {/* Intro */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Was ist das?
            </h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              Model Context Protocol — dein Garagen-Wissen für KI-Assistenten.
            </p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-base-content/80 dark:text-navy-200">
          <p>
            Tokens erlauben KI-Assistenten (z.&nbsp;B. Claude) Zugriff auf deine eigenen Daten:
            Motorräder, Wartungen, Tankstopps, Probleme, Ausgaben und Teile.
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <ScopeBadge scope="read" />
              <span>nur Abfragen — der Assistent kann Daten lesen, aber nichts ändern.</span>
            </li>
            <li className="flex items-start gap-2">
              <ScopeBadge scope="write" />
              <span>
                zusätzlich Wartungen, Tankstopps, Probleme, Ausgaben und Teile anlegen.
                Nie löschen, nie Admin-Funktionen.
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-5 space-y-1.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
            MCP-Endpunkt
          </span>
          <CopyField value={mcpUrl} label="MCP-URL" />
        </div>

        <details className="group mt-4 rounded-sm border border-base-300/70 dark:border-navy-700">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-base-content select-none dark:text-white">
            <TerminalSquare className="h-4 w-4 text-secondary dark:text-navy-400" />
            Einrichtung
            <ChevronDown className="ml-auto h-4 w-4 text-secondary transition-transform group-open:rotate-180 dark:text-navy-400" />
          </summary>
          <div className="space-y-4 border-t border-base-300/70 px-4 py-4 text-sm dark:border-navy-700">
            <div className="space-y-1.5">
              <p className="font-medium text-base-content dark:text-white">Claude Code</p>
              <p className="text-secondary dark:text-navy-300">
                Einmal im Terminal ausführen — <code className="font-mono">{"<TOKEN>"}</code> durch den
                erstellten Token ersetzen:
              </p>
              <CopyField value={buildClaudeMcpAddCommand(mcpUrl)} label="Claude-Code-Befehl" multiline />
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-base-content dark:text-white">Claude Desktop / claude.ai</p>
              <p className="text-secondary dark:text-navy-300">
                Benutzerdefinierte Connectors in Claude Desktop und auf claude.ai benötigen OAuth,
                das aktuell noch nicht unterstützt wird. Die Anbindung über die Claude-API
                (MCP-Connector mit <code className="font-mono">authorization_token</code>) funktioniert
                mit demselben Token.
              </p>
            </div>
          </div>
        </details>
      </section>

      {/* Token list */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
                API-Tokens
              </h2>
              <p className="text-sm text-secondary dark:text-navy-300">
                Aktive Tokens dieses Kontos. Widerrufene Tokens verschwinden sofort.
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Token erstellen
          </Button>
        </div>

        <div className="space-y-3">
          {apiTokens.map((t) => (
            <TokenRow
              key={t.id}
              apiToken={t}
              disabled={isSubmitting}
              onRevoke={async () => {
                const ok = await confirmDialog({
                  title: "Token widerrufen?",
                  description: `„${t.name}“ verliert sofort den Zugriff. Diese Aktion kann nicht rückgängig gemacht werden.`,
                  confirmLabel: "Widerrufen",
                });
                if (!ok) return;
                submit({ intent: "revokeToken", id: String(t.id) }, { method: "post" });
              }}
            />
          ))}
          {apiTokens.length === 0 && (
            <p className="py-4 text-center text-sm text-secondary dark:text-navy-400">
              Noch keine Tokens. Erstelle einen, um einen KI-Assistenten anzubinden.
            </p>
          )}
        </div>
      </section>

      {/* Audit */}
      <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
              Letzte Zugriffe
            </h2>
            <p className="text-sm text-secondary dark:text-navy-300">
              Die letzten {AUDIT_LIMIT} Werkzeugaufrufe über MCP.
            </p>
          </div>
        </div>

        {auditEntries.length === 0 ? (
          <p className="py-4 text-center text-sm text-secondary dark:text-navy-400">
            Noch keine Zugriffe protokolliert.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-secondary dark:bg-navy-900 dark:text-navy-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Zeit</th>
                  <th className="px-4 py-3 font-semibold">Token</th>
                  <th className="px-4 py-3 font-semibold">Werkzeug</th>
                  <th className="px-4 py-3 font-semibold">Ergebnis</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                {auditEntries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={createOpen}
        onClose={closeCreate}
        title={secret ? "Token erstellt" : "Token erstellen"}
        code={secret ? "SECRET" : "TOKEN"}
        description={
          secret
            ? "Kopiere den Token jetzt — er wird nie wieder angezeigt."
            : "Ein Token pro KI-Client. Der Name hilft dir beim späteren Widerrufen."
        }
      >
        {secret ? (
          <SecretView secret={secret} mcpUrl={mcpUrl} onDone={closeCreate} />
        ) : (
          <CreateTokenForm error={formError} isCreating={isCreating} onCancel={closeCreate} />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const SCOPE_OPTIONS: { value: ApiTokenScope; description: string }[] = [
  { value: "read", description: "Nur Abfragen — nichts wird verändert." },
  {
    value: "write",
    description: "Zusätzlich Wartungen, Tankstopps, Probleme, Ausgaben und Teile anlegen. Nie löschen.",
  },
];

const fieldLabelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

function CreateTokenForm({
  error,
  isCreating,
  onCancel,
}: {
  error: string | null;
  isCreating: boolean;
  onCancel: () => void;
}) {
  return (
    <Form method="post" className="space-y-5">
      <input type="hidden" name="intent" value="createToken" />

      {error && (
        <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="apiTokenName" className={fieldLabelClass}>
          Name
        </label>
        <input
          type="text"
          name="name"
          id="apiTokenName"
          required
          maxLength={64}
          autoComplete="off"
          placeholder="z.B. Claude Code auf dem MacBook"
          className={inputClass}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className={fieldLabelClass}>Berechtigung</legend>
        {SCOPE_OPTIONS.map((o) => (
          <div
            key={o.value}
            className="rounded-sm border border-base-300 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:border-navy-700"
          >
            <label htmlFor={`apiTokenScope-${o.value}`} className="flex cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="scope"
                id={`apiTokenScope-${o.value}`}
                value={o.value}
                defaultChecked={o.value === "read"}
                className="radio radio-primary radio-sm"
              />
              <span className="text-sm font-medium text-base-content dark:text-white">{SCOPE_LABELS[o.value]}</span>
            </label>
            <p className="mt-1 pl-8 text-xs text-secondary dark:text-navy-300">{o.description}</p>
          </div>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="apiTokenExpiry" className={fieldLabelClass}>
          Gültigkeit
        </label>
        <select name="expiresInDays" id="apiTokenExpiry" defaultValue="" className={inputClass}>
          {EXPIRY_OPTIONS.map((o) => (
            <option key={o.label} value={o.value ?? ""}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" isLoading={isCreating}>
          Token erstellen
        </Button>
      </div>
    </Form>
  );
}

function SecretView({
  secret,
  mcpUrl,
  onDone,
}: {
  secret: CreatedSecret;
  mcpUrl: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-base-content dark:text-white">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          <span className="font-semibold">Dieser Token wird nur einmal angezeigt.</span> Bewahre ihn
          sicher auf — er kann später nicht mehr abgerufen werden, nur widerrufen.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={fieldLabelClass}>Token · {secret.apiToken.name}</span>
          <ScopeBadge scope={secret.apiToken.scope} />
        </div>
        <CopyField value={secret.token} label="Token" />
      </div>

      <div className="space-y-1.5">
        <span className={fieldLabelClass}>Claude Code einrichten</span>
        <p className="text-xs text-secondary dark:text-navy-300">
          Fertiger Befehl mit eingesetztem Token — im Terminal ausführen:
        </p>
        <CopyField value={buildClaudeMcpAddCommand(mcpUrl, secret.token)} label="Claude-Code-Befehl" multiline />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={onDone}>
          Fertig
        </Button>
      </div>
    </div>
  );
}

/**
 * Read-only mono field with a copy button. Uses the async Clipboard API and
 * falls back to a hint (plus selecting the text) where it is unavailable, e.g.
 * on plain-http origins.
 */
function CopyField({ value, label, multiline = false }: { value: string; label: string; multiline?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API nicht verfügbar");
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-stretch gap-2">
        {multiline ? (
          <pre
            className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-base-300 bg-gray-50 p-3 font-mono text-xs text-base-content dark:border-navy-700 dark:bg-navy-900 dark:text-white"
            aria-label={label}
          >
            {value}
          </pre>
        ) : (
          <input
            type="text"
            readOnly
            value={value}
            aria-label={label}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-sm border border-base-300 bg-gray-50 p-3 font-mono text-xs text-base-content dark:border-navy-700 dark:bg-navy-900 dark:text-white"
          />
        )}
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="shrink-0 self-start"
          onClick={copy}
          aria-label={`${label} kopieren`}
        >
          {state === "copied" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          <span className="ml-2">{state === "copied" ? "Kopiert" : "Kopieren"}</span>
        </Button>
      </div>
      {state === "failed" && (
        <output className="block text-xs text-warning">
          Automatisches Kopieren nicht möglich — bitte den Text markieren und manuell kopieren.
        </output>
      )}
    </div>
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

function OutcomeBadge({ outcome }: { outcome: McpAuditOutcome }) {
  const cls =
    outcome === "ok"
      ? "bg-success/10 text-success"
      : outcome === "denied"
        ? "bg-warning/15 text-warning"
        : "bg-error/10 text-error";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {OUTCOME_LABELS[outcome] ?? outcome}
    </span>
  );
}

function TokenRow({
  apiToken,
  disabled,
  onRevoke,
}: {
  apiToken: ApiToken;
  disabled: boolean;
  onRevoke: () => void;
}) {
  const expired = isExpired(apiToken);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-navy-700 dark:bg-navy-900">
      <div className="flex min-w-0 items-start gap-3">
        <KeyRound className="mt-1 h-4 w-4 shrink-0 text-secondary dark:text-navy-400" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground dark:text-white">{apiToken.name}</p>
            <ScopeBadge scope={apiToken.scope} />
            {expired && (
              <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-0.5 text-[11px] font-medium text-error">
                Abgelaufen
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-base-content/70 dark:text-navy-300">
            {apiToken.tokenPrefix}…
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-secondary/60 dark:text-navy-500">
            Erstellt am {formatDate(apiToken.createdAt)} • Zuletzt verwendet:{" "}
            <span title={apiToken.lastUsedAt ? formatDateTime(apiToken.lastUsedAt) : undefined}>
              {formatRelativeTime(apiToken.lastUsedAt)}
            </span>{" "}
            • {describeExpiry(apiToken)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        aria-label={`Token „${apiToken.name}“ widerrufen`}
        disabled={disabled}
        onClick={onRevoke}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AuditRow({ entry }: { entry: McpAuditEntry }) {
  const args = formatAuditArguments(entry.arguments);
  return (
    <tr className="align-top hover:bg-gray-50 dark:hover:bg-navy-700/50">
      <td className="whitespace-nowrap px-4 py-3 text-foreground dark:text-white">
        {formatDateTime(entry.createdAt)}
      </td>
      <td className="px-4 py-3 text-secondary dark:text-navy-300">{entry.tokenName ?? "–"}</td>
      <td className="px-4 py-3 font-mono text-xs text-base-content dark:text-white">{entry.tool}</td>
      <td className="px-4 py-3">
        <OutcomeBadge outcome={entry.outcome} />
      </td>
      <td className="px-4 py-3 text-secondary dark:text-navy-300">
        <span title={entry.detail ?? undefined}>{truncate(entry.detail)}</span>
        {args && (
          <details className="mt-1">
            <summary className="cursor-pointer select-none text-xs text-primary hover:underline">
              Argumente
            </summary>
            <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-base-300 bg-gray-50 p-2 font-mono text-[11px] text-base-content dark:border-navy-700 dark:bg-navy-900 dark:text-white">
              {args}
            </pre>
          </details>
        )}
      </td>
    </tr>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
