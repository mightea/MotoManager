import { useMemo, useState } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { getBackendUrl } from "~/config";
import { appConnectLink } from "~/utils/app-connect";
import { useQrDataUrl } from "~/components/storage-location-label";
import { MICRO_LABEL, SettingsSection } from "~/components/settings/section";

/**
 * Settings section for connecting the iOS app: a QR code to scan with the
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
    <SettingsSection id="app" title="iPhone-App verbinden">
      <div className="flex flex-wrap items-center gap-5 p-4">
        <div className="shrink-0 rounded-sm border border-base-300 bg-white p-1.5 dark:border-navy-600">
          {qr ? (
            <img src={qr} alt="QR-Code zum Verbinden der App" className="h-[120px] w-[120px]" />
          ) : (
            <div className="h-[120px] w-[120px]" aria-hidden="true" />
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <p className="text-sm text-base-content/70 dark:text-navy-300">
            Code mit der iPhone-Kamera scannen oder den Link auf dem iPhone öffnen. Server und
            Benutzername werden eingetragen — das Passwort gibst du selbst ein.
          </p>
          <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className={`leading-5 ${MICRO_LABEL}`}>Server</dt>
            <dd className="truncate font-mono text-sm text-base-content dark:text-white">{server}</dd>
            <dt className={`leading-5 ${MICRO_LABEL}`}>Benutzer</dt>
            <dd className="truncate font-mono text-sm text-base-content dark:text-white">{username}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <a
              href={link ?? undefined}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-primary px-3.5 font-display text-[13px] uppercase tracking-[0.12em] text-primary-content hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              In der App öffnen
            </a>
            <button
              type="button"
              onClick={copy}
              disabled={!link}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 font-display text-[13px] uppercase tracking-[0.12em] text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Kopiert" : "Link kopieren"}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
