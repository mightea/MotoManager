import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TYPES,
  NO_DOCUMENT_TYPE,
  documentTypeFilterOptions,
  documentTypeKey,
  documentTypeLabel,
  matchesDocumentTypeFilter,
} from "~/utils/document-types";

describe("document types", () => {
  it("maps every key to its label", () => {
    expect(DOCUMENT_TYPES.map((t) => t.key)).toEqual([
      "werkstatthandbuch",
      "reparaturanleitung",
      "schaltplan",
      "checkliste",
      "teilekatalog",
      "bedienungsanleitung",
      "fahrzeugausweis",
      "rechnung",
      "sonstiges",
    ]);
    expect(documentTypeLabel("schaltplan")).toBe("Schaltplan");
    expect(documentTypeLabel("werkstatthandbuch")).toBe("Werkstatthandbuch");
  });

  it("treats missing, empty and unknown types as unset", () => {
    expect(documentTypeKey(undefined)).toBeNull();
    expect(documentTypeKey(null)).toBeNull();
    expect(documentTypeKey("")).toBeNull();
    expect(documentTypeKey("kochbuch")).toBeNull();
    expect(documentTypeLabel(undefined)).toBeNull();
  });

  it("offers no filter when no document has a type (older API)", () => {
    expect(documentTypeFilterOptions([{}, { docType: null }])).toEqual([]);
    expect(documentTypeFilterOptions([])).toEqual([]);
  });

  it("offers present types in canonical order plus 'Ohne Typ'", () => {
    const options = documentTypeFilterOptions([
      { docType: "checkliste" },
      { docType: "werkstatthandbuch" },
      { docType: "checkliste" },
      { docType: null },
    ]);
    expect(options).toEqual([
      { value: "werkstatthandbuch", label: "Werkstatthandbuch" },
      { value: "checkliste", label: "Checkliste" },
      { value: NO_DOCUMENT_TYPE, label: "Ohne Typ" },
    ]);
    expect(documentTypeFilterOptions([{ docType: "rechnung" }])).toEqual([
      { value: "rechnung", label: "Rechnung" },
    ]);
  });

  it("filters by type", () => {
    expect(matchesDocumentTypeFilter("schaltplan", null)).toBe(true);
    expect(matchesDocumentTypeFilter(undefined, null)).toBe(true);
    expect(matchesDocumentTypeFilter("schaltplan", "schaltplan")).toBe(true);
    expect(matchesDocumentTypeFilter("checkliste", "schaltplan")).toBe(false);
    expect(matchesDocumentTypeFilter(null, NO_DOCUMENT_TYPE)).toBe(true);
    expect(matchesDocumentTypeFilter("schaltplan", NO_DOCUMENT_TYPE)).toBe(false);
  });
});
