import { getBackendUrl } from "~/config";
import type { ApiToken, ApiTokenScope, McpAuditOutcome } from "~/types/db";

/** Placeholder used in the setup snippet before a real token exists. */
export const TOKEN_PLACEHOLDER = "<TOKEN>";

/** The MCP endpoint AI clients connect to. */
export function getMcpUrl(): string {
  return `${getBackendUrl()}/mcp`;
}

/**
 * The `claude mcp add` one-liner for Claude Code. Values are wrapped in double
 * quotes and any embedded `"`/`\` escaped so a pasted command survives a shell
 * with an unexpected URL or token verbatim.
 */
export function buildClaudeMcpAddCommand(mcpUrl: string, token: string = TOKEN_PLACEHOLDER): string {
  return `claude mcp add --transport http motomanager ${shellQuote(mcpUrl)} --header ${shellQuote(
    `Authorization: Bearer ${token}`,
  )}`;
}

function shellQuote(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

export const SCOPE_LABELS: Record<ApiTokenScope, string> = {
  read: "Lesen",
  write: "Lesen & Schreiben",
};

/** Expiry choices offered in the create dialog; `null` = never expires. */
export const EXPIRY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Unbegrenzt" },
  { value: 30, label: "30 Tage" },
  { value: 90, label: "90 Tage" },
  { value: 365, label: "365 Tage" },
];

const dateFormatter = new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | null): string {
  if (!value) return "–";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "–" : dateFormatter.format(d);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "–";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "–" : dateTimeFormatter.format(d);
}

/**
 * Coarse German relative time ("vor 5 Min.", "vor 3 Std.", "vor 2 Tagen").
 * Older than a month falls back to the absolute date. `null` → "Nie".
 */
export function formatRelativeTime(value: string | null, now: number = Date.now()): string {
  if (!value) return "Nie";
  const t = new Date(value).getTime();
  if (isNaN(t)) return "–";
  const diffSec = Math.max(0, Math.round((now - t) / 1000));
  if (diffSec < 60) return "gerade eben";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d < 31) return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
  return formatDate(value);
}

/** "Läuft ab am …" / "Abgelaufen am …" / "Unbegrenzt". */
export function describeExpiry(apiToken: Pick<ApiToken, "expiresAt">, now: number = Date.now()): string {
  if (!apiToken.expiresAt) return "Unbegrenzt";
  const t = new Date(apiToken.expiresAt).getTime();
  if (isNaN(t)) return "Unbegrenzt";
  return `${t < now ? "Abgelaufen am" : "Läuft ab am"} ${formatDate(apiToken.expiresAt)}`;
}

export function isExpired(apiToken: Pick<ApiToken, "expiresAt">, now: number = Date.now()): boolean {
  if (!apiToken.expiresAt) return false;
  const t = new Date(apiToken.expiresAt).getTime();
  return !isNaN(t) && t < now;
}

export const OUTCOME_LABELS: Record<McpAuditOutcome, string> = {
  ok: "OK",
  denied: "Verweigert",
  error: "Fehler",
};

/** Pretty-print JSON tool arguments for the audit expander; non-JSON is passed through. */
export function formatAuditArguments(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function truncate(value: string | null, max = 80): string {
  if (!value) return "–";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
