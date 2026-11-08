import { useMemo, useState } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { getBackendUrl } from "~/config";
import { appConnectLink } from "~/utils/app-connect";
import { useQrDataUrl } from "~/components/storage-location-label";

/**
 * Settings card for connecting the iOS app: a QR code to scan with the
 * iPhone camera (from a desktop) and a button to open the app directly (on
 * the phone). Both prefill server and username on the app's login screen.
 */
export function AppConnectCard({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  // Runtime config and origin live on window; the settings route only renders
  // in the browser (clientLoader), the guard just keeps a prerender safe.
  const { link, server } = useMemo(() => {
    if (typeof window === "undefined") return { link: null, server: "" };
    const backend = getBackendUrl();
    return {
      link: appConnectLink(backend, username, window.location.origin),
      server: new URL(backend, window.location.origin).toString().replace(/\/+$/, ""),
    };
  }, [username]);

  const qr = useQrDataUrl(link);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is still visible to copy by hand.
    }
  };

  return (
    <section className="relative rounded-sm border border-base-300/70 bg-base-100 p-6 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl uppercase tracking-wide text-base-content dark:text-white">
            iPhone-App verbinden
          </h2>
          <p className="text-sm text-secondary dark:text-navy-300">
            Scanne den Code mit der iPhone-Kamera oder öffne den Link auf dem iPhone. Server und
            Benutzername werden in der App eingetragen – nur das Passwort gibst du selbst ein.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="mx-auto shrink-0 rounded-sm border border-base-300 bg-white p-2 sm:mx-0 dark:border-navy-600">
          {qr ? (
            <img src={qr} alt="QR-Code zum Verbinden der App" className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] leading-5 text-base-content/60 dark:text-navy-400">
              Server
            </dt>
            <dd className="truncate text-base-content dark:text-white">{server}</dd>
            <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] leading-5 text-base-content/60 dark:text-navy-400">
              Benutzer
            </dt>
            <dd className="truncate text-base-content dark:text-white">{username}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <a
              href={link ?? undefined}
              className="relative inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 font-display text-sm uppercase tracking-wider text-primary-content hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Smartphone className="h-4 w-4" />
              In der App öffnen
            </a>
            <button
              type="button"
              onClick={copy}
              disabled={!link}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-4 py-2 font-display text-sm uppercase tracking-wider text-base-content hover:bg-base-200 disabled:opacity-50 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert" : "Link kopieren"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
