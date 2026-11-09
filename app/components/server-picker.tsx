import { useId, useState, type FormEvent } from "react";
import {
  getBackendUrl,
  getConfiguredBackendUrl,
  getServerOverride,
  setServerOverride,
} from "~/config";
import { clearSessionToken } from "~/services/auth";

/** "moto.example.ch" → "https://moto.example.ch"; null when not a usable URL. */
function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function isReachable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(6000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * "Server: … · Server ändern" on the login screen. The web app calls its API
 * directly from the browser, so another MotoManager server works as long as
 * it allows this web app's origin (the API's ORIGIN setting).
 */
export function ServerPicker() {
  const inputId = useId();
  const configured = getConfiguredBackendUrl();
  const [current] = useState(() => getBackendUrl());
  const [hasOverride] = useState(() => getServerOverride() != null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const switchTo = (url: string | null) => {
    setServerOverride(url);
    // A session token belongs to the server that issued it.
    clearSessionToken();
    window.location.reload();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const url = normalizeServerUrl(value);
    if (!url) {
      setError("Bitte eine gültige Adresse eingeben, z. B. https://moto.example.ch");
      return;
    }
    if (url === current) {
      setIsOpen(false);
      return;
    }
    setIsChecking(true);
    setError(null);
    const ok = await isReachable(url);
    setIsChecking(false);
    if (!ok) {
      setError(
        "Server nicht erreichbar. Adresse prüfen — und der Server muss diese Web-App zulassen (ORIGIN).",
      );
      return;
    }
    switchTo(url === configured ? null : url);
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] text-base-content/70 dark:text-navy-300">
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          Server:
          <span className="break-all font-mono text-xs text-base-content dark:text-white">{current}</span>
        </p>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={inputId}
          onClick={() => {
            setIsOpen((open) => !open);
            setError(null);
            setValue(current);
          }}
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Server ändern
        </button>
      </div>

      {hasOverride && !isOpen && (
        <p className="text-xs text-base-content/70 dark:text-navy-400">
          Eigener Server gewählt · Standard ist{" "}
          <button
            type="button"
            onClick={() => switchTo(null)}
            className="font-mono text-primary hover:underline"
          >
            {configured}
          </button>
        </p>
      )}

      {isOpen && (
        // A nested <form> would submit the login form, so this is a div with
        // its own submit handling.
        <div className="space-y-2 rounded-sm border border-base-300 bg-base-200/60 p-3 dark:border-navy-700 dark:bg-navy-900/40">
          <label
            htmlFor={inputId}
            className="block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70"
          >
            Server-Adresse
          </label>
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSubmit(event);
            }}
            placeholder="https://moto.example.ch"
            className="block h-10 w-full rounded-sm border border-base-300 bg-base-100 px-3 font-mono text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
          />
          {error && (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) => void handleSubmit(event)}
              disabled={isChecking}
              className="inline-flex h-9 items-center rounded-sm bg-primary px-3 font-display text-xs uppercase tracking-[0.12em] text-primary-content transition-colors hover:brightness-105 disabled:opacity-60"
            >
              {isChecking ? "Prüfe …" : "Verbinden"}
            </button>
            {hasOverride && (
              <button
                type="button"
                onClick={() => switchTo(null)}
                className="inline-flex h-9 items-center rounded-sm border border-base-300 bg-base-100 px-3 font-display text-xs uppercase tracking-[0.12em] text-base-content transition-colors hover:border-base-content/40 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
              >
                Standard-Server
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 hover:text-base-content"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
