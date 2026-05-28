import { useCallback, useState } from "react";
import clsx from "clsx";
import { Calendar, FileText, Globe, Lock, Pencil, User as UserIcon } from "lucide-react";
import { getBackendAssetUrl } from "~/utils/backend";
import { getSessionToken } from "~/services/auth";

export type DocumentSummary = {
  id: number;
  title: string;
  filePath: string;
  previewPath: string | null;
  uploadedBy: string | null;
  ownerId: number | null;
  ownerName: string | null;
  isPrivate: boolean;
  createdAt: string;
};

type DocumentCardProps = {
  document: DocumentSummary;
  formatDate: (dateString: string) => string;
  isOwner: boolean;
  onEdit: (doc: DocumentSummary) => void;
  assignedMotorcycleNames?: string[];
};

const EMPTY_MOTORCYCLE_NAMES: string[] = [];

/**
 * Document card — modeled on a service-manual file divider:
 * top: stripe + ID, hero: preview image with privacy stamp,
 * body: monospace metadata tags, footer: subtle action button.
 */
export function DocumentCard({
  document,
  formatDate,
  isOwner,
  onEdit,
  assignedMotorcycleNames = EMPTY_MOTORCYCLE_NAMES,
}: DocumentCardProps) {
  const ownerLabel = document.ownerName || document.uploadedBy || "Unbekannt";
  const previewUrl = getBackendAssetUrl(document.previewPath);
  const [previewFailed, setPreviewFailed] = useState(false);
  const hasPreview = Boolean(previewUrl) && !previewFailed;

  const handleOpen = useCallback(() => {
    const token = getSessionToken();
    const backendUrl = getBackendAssetUrl(document.filePath);
    if (!backendUrl) return;

    const url = new URL(backendUrl);
    if (token) {
      url.searchParams.set("token", token);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }, [document.filePath]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-base-content/25 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)] dark:border-navy-700 dark:bg-navy-800">
      {/* File-tab header */}
      <div className="flex items-center justify-between border-b border-base-200 px-3 pb-1.5 pt-2 dark:border-navy-700">
        <div className="flex items-center gap-2">
          <span className="motorsport-stripe block h-2 w-7" aria-hidden="true" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50 tabular-nums">
            DOC · {String(document.id).padStart(4, "0")}
          </span>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
            document.isPrivate
              ? "bg-[var(--color-workshop-soft)] text-[var(--color-workshop-ink)]"
              : "bg-success/15 text-success",
          )}
        >
          {document.isPrivate ? (
            <>
              <Lock className="h-2.5 w-2.5" /> Privat
            </>
          ) : (
            <>
              <Globe className="h-2.5 w-2.5" /> Öffentlich
            </>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handleOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-base-200 dark:bg-navy-900"
        aria-label={`Dokument ${document.title} öffnen`}
      >
        {hasPreview ? (
          <img
            src={previewUrl!}
            alt={document.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          // Fallback: previewPath missing, asset URL unresolved, or the
          // image failed to load — surface a workshop-paper placeholder
          // with a centered file glyph and the document title so the card
          // still communicates its identity at a glance.
          <div className="paper flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
            <FileText className="h-10 w-10 text-base-content/35" strokeWidth={1.25} aria-hidden="true" />
            <span className="line-clamp-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
              {document.title}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 font-subdisplay text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Datei öffnen
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <h3
          className="font-subdisplay text-sm text-base-content dark:text-white line-clamp-1"
          title={document.title}
        >
          {document.title}
        </h3>

        <dl className="grid gap-2 text-xs text-base-content/65 dark:text-navy-400">
          <div className="flex items-center justify-between gap-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45">Besitzer</dt>
            <dd className="inline-flex items-center gap-1 text-base-content dark:text-gray-200 truncate">
              <UserIcon className="h-3 w-3 opacity-60" aria-hidden="true" />
              <span className="truncate">{ownerLabel}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45">Datum</dt>
            <dd className="inline-flex items-center gap-1 font-numeric text-[11px] text-base-content dark:text-gray-200" suppressHydrationWarning>
              <Calendar className="h-3 w-3 opacity-60" aria-hidden="true" />
              {formatDate(document.createdAt)}
            </dd>
          </div>
          {assignedMotorcycleNames.length > 0 && (
            <div>
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45 mb-1">Zugeordnet</dt>
              <dd className="flex flex-wrap gap-1">
                {assignedMotorcycleNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-sm border border-base-300 bg-base-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/65 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200"
                  >
                    {name}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {(isOwner || !document.isPrivate) && (
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => onEdit(document)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-base-content/15 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              {isOwner ? "Bearbeiten" : "Zuordnen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
