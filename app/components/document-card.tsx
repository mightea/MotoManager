import { useCallback } from "react";
import clsx from "clsx";
import { Calendar, FileText, Globe, Lock, Pencil, User as UserIcon } from "lucide-react";
import { getBackendAssetUrl } from "~/utils/backend";
import { useIsOffline } from "~/utils/offline";
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

export function DocumentCard({
  document,
  formatDate,
  isOwner,
  onEdit,
  assignedMotorcycleNames = [],
}: DocumentCardProps) {
  const isOffline = useIsOffline();
  const ownerLabel = document.ownerName || document.uploadedBy || "Unbekannt";
  const previewUrl = getBackendAssetUrl(document.previewPath);

  const handleOpen = useCallback(() => {
    const token = getSessionToken();
    const url = new URL(`/data/documents/${document.filePath.split("/").pop()}`, window.location.origin);
    if (token) {
      url.searchParams.set("token", token);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }, [document.filePath]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-navy-700 dark:bg-navy-800">
      <button
        type="button"
        onClick={handleOpen}
        className="relative block h-44 w-full overflow-hidden bg-gray-50 transition-transform duration-200 hover:scale-[1.01] dark:bg-navy-900"
        aria-label={`Dokument ${document.title} öffnen`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={document.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <img
              src="/images/pdf-placeholder.svg"
              alt="PDF"
              className="h-20 w-20 opacity-50"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
            <FileText className="hidden h-16 w-16 text-gray-300 dark:text-navy-600" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Datei öffnen
        </div>

        <div className="absolute right-2 top-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-md",
              document.isPrivate
                ? "bg-amber-100/90 text-amber-700 dark:bg-amber-900/90 dark:text-amber-100"
                : "bg-emerald-100/90 text-emerald-700 dark:bg-emerald-900/90 dark:text-emerald-100"
            )}
          >
            {document.isPrivate ? (
              <>
                <Lock className="h-3 w-3" /> Privat
              </>
            ) : (
              <>
                <Globe className="h-3 w-3" /> Öffentlich
              </>
            )}
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-base font-semibold text-foreground dark:text-white" title={document.title}>
          {document.title}
        </h3>

        <div className="mt-3 flex flex-col gap-3 text-[0.75rem] text-secondary dark:text-navy-400">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-secondary/70 dark:text-navy-500">Besitzer</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5" />
              <span>{ownerLabel}</span>
            </div>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-secondary/70 dark:text-navy-500">Hochgeladen</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{formatDate(document.createdAt)}</span>
            </div>
          </div>
          {assignedMotorcycleNames.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-secondary/70 dark:text-navy-500">Zugeordnet</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {assignedMotorcycleNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[0.68rem] font-semibold text-secondary dark:bg-navy-700/60 dark:text-navy-100"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {(isOwner || !document.isPrivate) && (
          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={() => onEdit(document)}
              disabled={isOffline}
              className={clsx(
                "relative inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                isOffline
                  ? "border-gray-100 bg-gray-50 text-secondary/40 cursor-not-allowed dark:border-navy-700/50 dark:bg-navy-900/50 dark:text-navy-500"
                  : "border-gray-200 text-secondary hover:border-primary hover:text-primary dark:border-navy-600 dark:text-navy-200 dark:hover:border-primary-light dark:hover:text-primary-light"
              )}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {isOwner ? "Bearbeiten" : "Zuordnen"}
              {isOffline && (
                <span className="absolute -top-2 -right-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
                  Offline
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
