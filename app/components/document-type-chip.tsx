import clsx from "clsx";
import { documentTypeLabel } from "~/utils/document-types";

/**
 * The document type as a mono upper-case chip (e.g. SCHALTPLAN). Renders "—"
 * when the document has no type, unless `hideWhenEmpty` is set.
 */
export function DocumentTypeChip({
  docType,
  hideWhenEmpty = false,
  className,
}: {
  docType: string | null | undefined;
  hideWhenEmpty?: boolean;
  className?: string;
}) {
  const label = documentTypeLabel(docType);
  if (!label) {
    if (hideWhenEmpty) return null;
    return (
      <span className={clsx("text-[13px] text-base-content/70 dark:text-navy-400", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Kein Typ</span>
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-sm border border-base-300 bg-base-200/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/80 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200",
        className,
      )}
    >
      {label}
    </span>
  );
}
