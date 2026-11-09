import { useCallback, useState } from "react";
import clsx from "clsx";
import { FileText, Pencil } from "lucide-react";
import { useAuthenticatedAssetUrl } from "~/hooks/use-authenticated-asset";
import { pushToast } from "~/hooks/use-toast";
import { openAuthenticatedAsset } from "~/utils/backend";
import type { DocumentSummary } from "~/components/document-card";

export interface DocumentBikeChip {
  id: number;
  name: string;
  /** Series colour of the bike; omitted for bikes of other users. */
  color?: string;
}

const CAPTION = "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]";
const TH = clsx(CAPTION, "px-4 py-2.5 text-left text-base-content/70 dark:text-navy-300");
const TD = "px-4 py-3.5 align-top";

/** "PDF" or "BILD", read off the stored file name. */
function fileKind(filePath: string): string {
  return /\.pdf$/i.test(filePath) ? "PDF" : "Bild";
}

/**
 * The archive table on the Dokumente page — preview thumbnail, title,
 * assigned bikes, owner and date in one row per document.
 */
export function DocumentTable({
  documents,
  bikesByDocument,
  currentUserId,
  formatDate,
  onEdit,
}: {
  documents: DocumentSummary[];
  bikesByDocument: Record<number, DocumentBikeChip[]>;
  currentUserId: number;
  formatDate: (dateString: string) => string;
  onEdit: (doc: DocumentSummary) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-base-300 dark:border-navy-700">
          <tr>
            <th scope="col" className={clsx(TH, "hidden md:table-cell")}>Nr.</th>
            <th scope="col" className={TH}>Dokument</th>
            <th scope="col" className={clsx(TH, "hidden sm:table-cell")}>Zugeordnet</th>
            <th scope="col" className={clsx(TH, "hidden lg:table-cell")}>Besitzer</th>
            <th scope="col" className={clsx(TH, "hidden text-right md:table-cell")}>Datum</th>
            <th scope="col" className="px-4 py-2.5">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-200 dark:divide-navy-700">
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              bikes={bikesByDocument[doc.id] ?? []}
              isOwner={doc.ownerId === currentUserId}
              formatDate={formatDate}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BikeChips({ bikes }: { bikes: DocumentBikeChip[] }) {
  if (bikes.length === 0) {
    return <span className="text-[13px] text-base-content/70 dark:text-navy-400">— keinem Motorrad</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {bikes.map((bike) => (
        <span
          key={bike.id}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-base-300 px-2 py-0.5 text-[13px] font-semibold text-base-content dark:border-navy-700 dark:text-white"
        >
          <span
            aria-hidden="true"
            className={clsx("h-2 w-2 shrink-0", !bike.color && "bg-base-content/30 dark:bg-navy-500")}
            style={bike.color ? { backgroundColor: bike.color } : undefined}
          />
          {bike.name}
        </span>
      ))}
    </span>
  );
}

function DocumentRow({
  document,
  bikes,
  isOwner,
  formatDate,
  onEdit,
}: {
  document: DocumentSummary;
  bikes: DocumentBikeChip[];
  isOwner: boolean;
  formatDate: (dateString: string) => string;
  onEdit: (doc: DocumentSummary) => void;
}) {
  // Previews are auth-gated like the documents, so they come from a blob URL.
  const { url: previewUrl } = useAuthenticatedAssetUrl(document.previewPath);
  const [previewFailed, setPreviewFailed] = useState(false);
  const hasPreview = Boolean(previewUrl) && !previewFailed;
  const ownerLabel = document.ownerName || document.uploadedBy || "Unbekannt";
  const canEdit = isOwner || !document.isPrivate;

  const handleOpen = useCallback(() => {
    openAuthenticatedAsset(document.filePath).catch((error: unknown) => {
      pushToast({
        title: "Dokument konnte nicht geöffnet werden",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    });
  }, [document.filePath]);

  return (
    <tr className="transition-colors hover:bg-base-200/40 dark:hover:bg-navy-700/30">
      <td className={clsx(TD, "hidden font-mono text-xs font-semibold tabular-nums text-base-content/70 md:table-cell dark:text-navy-400")}>
        {String(document.id).padStart(4, "0")}
      </td>
      <td className={TD}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleOpen}
            aria-label={`Dokument ${document.title} öffnen`}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-base-300 bg-base-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-[84px] sm:w-[84px] dark:border-navy-700 dark:bg-navy-900"
          >
            {hasPreview ? (
              <img
                src={previewUrl!}
                alt=""
                className="h-full w-full object-contain"
                loading="lazy"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <FileText className="h-7 w-7 text-base-content/35 dark:text-navy-500" strokeWidth={1.25} aria-hidden="true" />
            )}
          </button>
          <div className="flex min-w-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={handleOpen}
              className="text-left font-semibold text-base-content hover:text-primary hover:underline dark:text-white"
            >
              {document.title}
            </button>
            <span className={clsx(CAPTION, "text-base-content/70 dark:text-navy-400")}>
              {document.isPrivate ? "Privat" : "Öffentlich"} · {fileKind(document.filePath)}
            </span>
            {/* Narrow widths fold the hidden columns into the title cell. */}
            <span className={clsx(CAPTION, "tabular-nums text-base-content/70 md:hidden dark:text-navy-400")} suppressHydrationWarning>
              {formatDate(document.createdAt)} · {ownerLabel}
            </span>
            <div className="mt-1.5 sm:hidden">
              <BikeChips bikes={bikes} />
            </div>
          </div>
        </div>
      </td>
      <td className={clsx(TD, "hidden sm:table-cell")}>
        <BikeChips bikes={bikes} />
      </td>
      <td className={clsx(TD, "hidden text-base-content lg:table-cell dark:text-gray-200")}>{ownerLabel}</td>
      <td
        className={clsx(TD, "hidden whitespace-nowrap text-right font-mono text-[13px] tabular-nums text-base-content md:table-cell dark:text-gray-200")}
        suppressHydrationWarning
      >
        {formatDate(document.createdAt)}
      </td>
      <td className={clsx(TD, "whitespace-nowrap text-right")}>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpen}
            className={clsx(CAPTION, "hidden text-primary hover:underline sm:inline dark:text-primary-light")}
          >
            Öffnen
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(document)}
              aria-label={isOwner ? `${document.title} bearbeiten` : `${document.title} zuordnen`}
              title={isOwner ? "Bearbeiten" : "Zuordnen"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-base-300 text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}
