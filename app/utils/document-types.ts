/**
 * Document types — the API stores the key (`documents.docType`), the UI shows
 * the label. Keep this the single place that maps one to the other.
 */
export const DOCUMENT_TYPES = [
  { key: "werkstatthandbuch", label: "Werkstatthandbuch" },
  { key: "reparaturanleitung", label: "Reparaturanleitung" },
  { key: "schaltplan", label: "Schaltplan" },
  { key: "checkliste", label: "Checkliste" },
  { key: "teilekatalog", label: "Teilekatalog" },
  { key: "bedienungsanleitung", label: "Bedienungsanleitung" },
  { key: "fahrzeugausweis", label: "Fahrzeugausweis" },
  { key: "rechnung", label: "Rechnung" },
  { key: "sonstiges", label: "Sonstiges" },
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number]["key"];

const LABELS = new Map<string, string>(DOCUMENT_TYPES.map((t) => [t.key, t.label]));

/** Filter value for documents without a type. */
export const NO_DOCUMENT_TYPE = "none";

/**
 * The known type key of a document, or `null` when unset. An older API sends
 * no `docType` at all, and a key this client doesn't know counts as unset too.
 */
export function documentTypeKey(docType: string | null | undefined): DocumentTypeKey | null {
  return docType && LABELS.has(docType) ? (docType as DocumentTypeKey) : null;
}

/** Display label for a type key, or `null` when unset/unknown. */
export function documentTypeLabel(docType: string | null | undefined): string | null {
  const key = documentTypeKey(docType);
  return key ? (LABELS.get(key) ?? null) : null;
}

export interface DocumentTypeFilterOption {
  value: string;
  label: string;
}

/**
 * Options for the TYP filter: the types present in the data (in canonical
 * order), plus "Ohne Typ" when some documents have none. Empty when no
 * document carries a type, so the filter can be hidden (e.g. older API).
 */
export function documentTypeFilterOptions(
  docs: readonly { docType?: string | null }[],
): DocumentTypeFilterOption[] {
  const present = new Set<string>();
  let hasUntyped = false;
  for (const doc of docs) {
    const key = documentTypeKey(doc.docType);
    if (key) present.add(key);
    else hasUntyped = true;
  }
  if (present.size === 0) return [];
  const options: DocumentTypeFilterOption[] = DOCUMENT_TYPES.filter((t) => present.has(t.key)).map((t) => ({
    value: t.key,
    label: t.label,
  }));
  if (hasUntyped) options.push({ value: NO_DOCUMENT_TYPE, label: "Ohne Typ" });
  return options;
}

/** Whether a document passes the TYP filter (`null` = all types). */
export function matchesDocumentTypeFilter(docType: string | null | undefined, filter: string | null): boolean {
  if (filter === null) return true;
  const key = documentTypeKey(docType);
  return filter === NO_DOCUMENT_TYPE ? key === null : key === filter;
}
