import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import {
  CircleCheck,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  ScanText,
  TriangleAlert,
} from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { getSessionToken } from "~/services/auth";
import {
  createPart,
  createPartStock,
  fetchBoxxerpartsProduct,
  importPartImageFromUrl,
  lookupBmwbikePart,
  parsePartsInvoice,
} from "~/services/parts";
import { fetchBmwbikePart, findBmwbikeSlugByPartNumber, mapCompatibility } from "~/utils/bmwbike";
import { inferBoxxerpartsFitment, type FitmentMatch } from "~/utils/boxxerparts";
import { storageLocationPath } from "~/utils/parts";
import { toast } from "~/hooks/use-toast";
import type {
  ImportSupplierKey,
  ModelSeries,
  ParsedInvoice,
  StorageLocation,
} from "~/types/parts";

interface InvoiceImportDialogProps {
  isOpen: boolean;
  modelSeries: ModelSeries[];
  storageLocations: StorageLocation[];
  onClose: () => void;
}

/** Catalog data for a line that would create a new part, normalized across
 *  the supplier catalogs (BMWBike API, boxxerparts.de via backend proxy). */
interface CatalogPart {
  name: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string | null;
}

type Enrichment =
  | { status: "loading" }
  | { status: "found"; source: ImportSupplierKey | "bmwbike"; part: CatalogPart }
  | { status: "none" };

interface FitmentChoice {
  id: number;
  selected: boolean;
}

interface ReviewRow {
  key: number;
  include: boolean;
  partNumber: string;
  supplierArticleNo: string | null;
  /** Editable name — prefilled from the catalog when found, else the invoice. */
  name: string;
  invoiceName: string;
  /** Description printed on the document (order confirmations). */
  invoiceDescription: string | null;
  oemPartNumbers: string[];
  /** BMW number the new part gets linked to (editable; "" = no link) —
   *  first cited OEM number, preferring one BMWBike knows. */
  oemPartNumber: string;
  /** Metadata BMWBike contributed on top of the supplier catalog. */
  oemEnrichment: string[];
  /** Editable manufacturer for new parts. */
  manufacturer: string;
  quantity: number;
  /** Total price for the stock entry (invoice Betrag), as input text. */
  priceTotal: string;
  /** Per-row Lagerort (select value; "" = none) — one order often gets
   *  sorted into several boxes. */
  locationId: string;
  matchedPartId: number | null;
  matchedPartName: string | null;
  matchedVia: "partNumber" | "oemPartNumber" | null;
  warnings: string[];
  enrichment: Enrichment | null;
  /** Proposed fitment for a new part; each node can be switched off. */
  fitment: FitmentChoice[];
  /** Phrases the fitment rules fired on — shown so the proposal is explainable. */
  fitmentMatches: FitmentMatch[];
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-2 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

const CATALOG_LABEL: Record<ImportSupplierKey | "bmwbike", string> = {
  huggett: "BMWBike",
  bmwbike: "BMWBike",
  boxxerparts: "Boxxerparts",
};

function defaultManufacturer(supplierKey: ImportSupplierKey | null): string {
  // Boxxerparts sells mostly aftermarket parts under its own numbering; the
  // shop's "Hersteller" field names the bike make, not the maker, so it is
  // deliberately NOT used here.
  return supplierKey === "boxxerparts" ? "Boxxerparts" : "BMW";
}

/** Import parts + stock from a supplier document (invoice or order
 *  confirmation) as PDF, or as a raw scan/photo the backend OCRs. The backend
 *  parses the text (layout parser per supplier,
 *  local LLM with deterministic fallback for the rest); new parts are enriched
 *  from the supplier's catalog. NOTHING is written until "Importieren" is
 *  confirmed — this dialog is review-first by design. */
export function InvoiceImportDialog({
  isOpen,
  modelSeries,
  storageLocations,
  onClose,
}: InvoiceImportDialogProps) {
  const revalidator = useRevalidator();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [allLocationId, setAllLocationId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitErrors, setCommitErrors] = useState<string[]>([]);

  const reset = () => {
    setIsParsing(false);
    setParseError(null);
    setParsed(null);
    setRows([]);
    setPurchaseDate("");
    setAllLocationId("");
    setIsDragging(false);
    setIsCommitting(false);
    setCommitErrors([]);
  };

  const handleClose = () => {
    if (isCommitting) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isImage =
      ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      /\.(jpe?g|png|webp)$/.test(name);
    if (!isPdf && !isImage) {
      setParseError("Unterstützt werden PDF-Dateien sowie Scans/Fotos als JPEG, PNG oder WebP.");
      return;
    }
    const token = getSessionToken();
    if (!token) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await parsePartsInvoice(token, file);
      setParsed(result);
      setPurchaseDate(result.invoice.invoiceDate ?? "");
      setRows(
        result.items.map((item, index) => ({
          key: index,
          // Rows of an already-imported document start unchecked so a stray
          // re-upload can't silently double the stock; a line without a
          // recognized number can't be created at all.
          include: !result.alreadyImported && item.partNumber.trim() !== "",
          partNumber: item.partNumber,
          supplierArticleNo: item.supplierArticleNo ?? null,
          name: item.name,
          invoiceName: item.name,
          invoiceDescription: item.description ?? null,
          oemPartNumbers: item.oemPartNumbers ?? [],
          oemPartNumber: item.oemPartNumbers?.[0] ?? "",
          oemEnrichment: [],
          manufacturer: defaultManufacturer(result.invoice.supplierKey),
          quantity: item.quantity,
          priceTotal: item.lineTotal != null ? item.lineTotal.toFixed(2) : "",
          locationId: "",
          matchedPartId: item.matchedPartId,
          matchedPartName: item.matchedPartName,
          matchedVia: item.matchedVia ?? null,
          warnings: item.warnings,
          enrichment:
            item.matchedPartId == null && item.partNumber.trim() !== ""
              ? { status: "loading" }
              : null,
          fitment: [],
          fitmentMatches: [],
        })),
      );
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Rechnung konnte nicht gelesen werden.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Enrich new-part rows from the supplier catalog (name, image, description,
  // fitment). Failures degrade to a plain create from document data.
  useEffect(() => {
    if (!parsed) return;
    let active = true;
    const supplierKey = parsed.invoice.supplierKey;
    const token = getSessionToken();
    const pending = rows.filter((row) => row.enrichment?.status === "loading");
    for (const row of pending) {
      (async () => {
        let enrichment: Enrichment = { status: "none" };
        let catalogName: string | null = null;
        let fitment: FitmentChoice[] = [];
        let fitmentMatches: FitmentMatch[] = [];
        let oemPartNumber = row.oemPartNumber;
        const oemEnrichment: string[] = [];
        try {
          if (supplierKey === "boxxerparts") {
            const product = token
              ? await fetchBoxxerpartsProduct(token, row.supplierArticleNo ?? row.partNumber)
              : null;
            if (product) {
              enrichment = {
                status: "found",
                source: "boxxerparts",
                part: {
                  name: product.name,
                  description: product.description,
                  imageUrl: product.imageUrl,
                  productUrl: product.productUrl,
                },
              };
              catalogName = product.name;
            }
            // Fitment comes from the product prose — the document's own
            // description works as the source when the shop is unreachable.
            const suggestion = inferBoxxerpartsFitment(
              `${product?.name ?? row.invoiceName} ${product?.description ?? row.invoiceDescription ?? ""}`,
              modelSeries,
            );
            fitment = suggestion.seriesIds.map((id) => ({ id, selected: true }));
            fitmentMatches = suggestion.matches;

            // Aftermarket part citing its BMW original: link it and fill
            // what the shop lacks from BMWBike — fitment as a union with the
            // prose rules, image and description only when missing.
            const oemCandidates = [
              ...new Set([...row.oemPartNumbers, ...(product?.oemPartNumbers ?? [])]),
            ];
            for (const candidate of token ? oemCandidates : []) {
              // Sequential on purpose: the first number BMWBike knows wins.
              // eslint-disable-next-line no-await-in-loop
              const bmw = await lookupBmwbikePart(token as string, candidate).catch(() => null);
              if (!bmw) continue;
              oemPartNumber = candidate;
              const proposed = new Set(fitment.map((choice) => choice.id));
              const extraSeries = bmw.seriesIds.filter((id) => !proposed.has(id));
              if (extraSeries.length > 0) {
                fitment = [...fitment, ...extraSeries.map((id) => ({ id, selected: true }))];
                oemEnrichment.push(`${extraSeries.length} Baureihen`);
              }
              if (enrichment.status === "found") {
                if (!enrichment.part.imageUrl && bmw.imageUrl) {
                  enrichment.part.imageUrl = bmw.imageUrl;
                  oemEnrichment.push("Bild");
                }
                if (!enrichment.part.description && bmw.description) {
                  enrichment.part.description = bmw.description;
                  oemEnrichment.push("Beschreibung");
                }
              } else {
                enrichment = {
                  status: "found",
                  source: "bmwbike",
                  part: {
                    name: row.invoiceName,
                    description: row.invoiceDescription ?? bmw.description,
                    imageUrl: bmw.imageUrl,
                    productUrl: bmw.productUrl,
                  },
                };
                if (bmw.imageUrl) oemEnrichment.push("Bild");
              }
              break;
            }
            if (!oemPartNumber && oemCandidates.length > 0) oemPartNumber = oemCandidates[0];
          } else {
            const slug = await findBmwbikeSlugByPartNumber(row.partNumber);
            if (slug) {
              const part = await fetchBmwbikePart(slug);
              const mapping = mapCompatibility(part.compatNames, modelSeries);
              enrichment = {
                status: "found",
                source: "bmwbike",
                part: {
                  name: part.name,
                  description: part.description,
                  imageUrl: part.imageUrl,
                  productUrl: null,
                },
              };
              catalogName = part.name;
              fitment = mapping.seriesIds.map((id) => ({ id, selected: true }));
            }
          }
        } catch {
          enrichment = { status: "none" };
        }
        if (!active) return;
        setRows((current) =>
          current.map((candidate) =>
            candidate.key === row.key
              ? {
                  ...candidate,
                  enrichment,
                  fitment,
                  fitmentMatches,
                  oemPartNumber,
                  oemEnrichment,
                  // Catalog names are complete where invoice names truncate
                  // ("Schalter Warnblinke") — prefill, keep editable.
                  name: catalogName ?? candidate.name,
                }
              : candidate,
          ),
        );
      })();
    }
    return () => {
      active = false;
    };
    // Deliberately keyed on which rows are pending, not `rows` itself —
    // re-running per keystroke in the name inputs would refetch the catalog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, rows.filter((r) => r.enrichment?.status === "loading").length]);

  const updateRow = (key: number, patch: Partial<ReviewRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const toggleFitment = (key: number, id: number) => {
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              fitment: row.fitment.map((choice) =>
                choice.id === id ? { ...choice, selected: !choice.selected } : choice,
              ),
            }
          : row,
      ),
    );
  };

  const seriesName = (id: number) => modelSeries.find((node) => node.id === id)?.name ?? `#${id}`;

  const includedRows = rows.filter((row) => row.include);
  const isEnriching = rows.some(
    (row) => row.include && row.enrichment?.status === "loading",
  );
  const documentLabel = parsed?.invoice.documentKind === "order" ? "Bestellung" : "Rechnung";
  const invoiceNote = parsed?.invoice.invoiceNumber
    ? `${parsed.invoice.supplier ?? "Import"} · ${documentLabel} ${parsed.invoice.invoiceNumber}`
    : `${parsed?.invoice.supplier ?? "Import"} · ${parsed?.textSource === "ocr" ? "Scan-Import" : "PDF-Import"}`;

  const handleImport = async () => {
    const token = getSessionToken();
    if (!token || !parsed || includedRows.length === 0) return;
    setIsCommitting(true);
    setCommitErrors([]);
    const errors: string[] = [];
    let imported = 0;

    for (const row of includedRows) {
      try {
        let partId = row.matchedPartId;
        if (partId == null) {
          const enriched = row.enrichment?.status === "found" ? row.enrichment : null;
          // Rows are committed sequentially on purpose: the stock write below
          // needs this part's id, and a thrown Response (e.g. expired session)
          // must abort the remaining rows instead of firing them in parallel.
          // eslint-disable-next-line no-await-in-loop
          const created = await createPart(token, {
            partNumber: row.partNumber,
            name: row.name.trim() || row.invoiceName,
            manufacturer: row.manufacturer.trim() || undefined,
            description: enriched?.part.description ?? row.invoiceDescription ?? undefined,
            seriesIds: row.fitment.filter((choice) => choice.selected).map((choice) => choice.id),
            oemPartNumber: row.oemPartNumber.trim() || undefined,
          });
          partId = created.id;
          if (enriched?.part.imageUrl) {
            // Image is a nice-to-have; a failed download must not lose the row.
            try {
              // eslint-disable-next-line no-await-in-loop -- depends on the part created above
              await importPartImageFromUrl(token, partId, enriched.part.imageUrl);
            } catch {
              /* ignore */
            }
          }
        }
        const price = Number(row.priceTotal.replace(",", "."));
        // eslint-disable-next-line no-await-in-loop -- needs partId; keeps backend writes ordered
        await createPartStock(token, {
          partId,
          quantity: row.quantity,
          price: Number.isFinite(price) && row.priceTotal.trim() !== "" ? price : null,
          currency:
            Number.isFinite(price) && row.priceTotal.trim() !== ""
              ? parsed.invoice.currency
              : null,
          purchaseDate: purchaseDate || null,
          storageLocationId: row.locationId ? Number(row.locationId) : null,
          notes: invoiceNote,
        });
        imported += 1;
      } catch (e) {
        if (e instanceof Response) throw e;
        errors.push(
          `${row.partNumber || row.invoiceName}: ${e instanceof Error ? e.message : "Import fehlgeschlagen"}`,
        );
      }
    }

    setIsCommitting(false);
    revalidator.revalidate();
    if (errors.length > 0) {
      setCommitErrors(errors);
      if (imported > 0) {
        toast.success(
          imported === 1 ? "1 Position importiert" : `${imported} Positionen importiert`,
        );
      }
    } else {
      toast.success(
        imported === 1 ? "1 Position importiert" : `${imported} Positionen importiert`,
      );
      reset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rechnung / Bestellung importieren"
      description="Bestellte Teile und Bestand aus einer Lieferanten-Rechnung oder Auftragsbestätigung (PDF, Scan oder Foto) übernehmen."
      size="lg"
    >
      {!parsed ? (
        /* ------------------------------ Upload step ----------------------------- */
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Rechnung als PDF, Scan oder Foto auswählen"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isParsing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (isParsing) return;
              const file = event.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={`flex w-full flex-col items-center gap-3 rounded-sm border border-dashed px-6 py-10 text-center transition-colors disabled:cursor-wait ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-base-content/25 hover:border-primary/50 hover:bg-primary/5 dark:border-navy-600"
            }`}
          >
            {isParsing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <span className="text-sm text-base-content/70">
                  Dokument wird gelesen — Positionen, Teilenummern und Preise …
                </span>
              </>
            ) : (
              <>
                <FileText
                  className={`h-8 w-8 ${isDragging ? "text-primary" : "text-base-content/30"}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-base-content dark:text-white">
                  {isDragging
                    ? "Datei hier ablegen"
                    : "PDF, Scan oder Foto auswählen oder hierhin ziehen"}
                </span>
                <span className="max-w-[40ch] text-xs text-base-content/55">
                  Rechnungen von Mark Huggett GmbH (bmwbike.com) und Auftragsbestätigungen von
                  boxxerparts.de werden am besten erkannt; andere Formate werden per KI
                  ausgelesen. Papierrechnungen einfach scannen oder fotografieren — die
                  Schrift wird auf dem Server erkannt.
                </span>
              </>
            )}
          </button>
          {parseError && <p className="text-sm font-medium text-error">{parseError}</p>}
        </div>
      ) : (
        /* ------------------------------ Review step ----------------------------- */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/65">
            <span className="font-semibold text-base-content dark:text-white">
              {parsed.invoice.supplier ?? documentLabel}
            </span>
            {parsed.invoice.invoiceNumber && (
              <span className="font-mono">
                {documentLabel} {parsed.invoice.invoiceNumber}
              </span>
            )}
            {parsed.source !== "llm" && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-content/45">
                Layout-Parser
              </span>
            )}
            {parsed.textSource === "ocr" && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-content/45">
                Texterkennung
              </span>
            )}
          </div>

          {parsed.textSource === "ocr" && (
            <div className="flex items-start gap-2 rounded-sm border border-info/40 bg-info/10 px-3 py-2 text-xs text-base-content/80">
              <ScanText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Aus einem Scan gelesen — Teilenummern, Mengen und Preise bitte mit der
                Papierrechnung vergleichen. Bezeichnungen werden wo möglich aus dem Katalog
                übernommen.
              </span>
            </div>
          )}

          {parsed.alreadyImported && (
            <div className="flex items-start gap-2 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content dark:text-warning">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Zu dieser {documentLabel} existiert bereits Bestand — Positionen sind deshalb
                abgewählt. Nur importieren, was wirklich fehlt.
              </span>
            </div>
          )}

          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex items-start gap-3 rounded-sm border border-base-300 p-3 dark:border-navy-700"
              >
                <input
                  type="checkbox"
                  checked={row.include}
                  disabled={row.partNumber.trim() === ""}
                  onChange={(event) => updateRow(row.key, { include: event.target.checked })}
                  aria-label={`${row.partNumber || row.invoiceName} importieren`}
                  className="checkbox checkbox-sm checkbox-primary mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-semibold text-base-content/75 dark:text-navy-200">
                      {row.partNumber || "—"}
                    </span>
                    {row.matchedPartId != null ? (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary dark:bg-primary/15 dark:text-primary-light">
                        <Package className="h-2.5 w-2.5" aria-hidden="true" />
                        Bestand zu «{row.matchedPartName}»
                        {row.matchedVia === "oemPartNumber" && " · über BMW-Nr."}
                      </span>
                    ) : (
                      <span className="stamp !py-0.5 !text-[9px]">Neues Teil</span>
                    )}
                    {row.enrichment?.status === "loading" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-base-content/45">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                        {CATALOG_LABEL[parsed.invoice.supplierKey ?? "bmwbike"]}…
                      </span>
                    )}
                    {row.enrichment?.status === "found" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-success">
                        <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
                        {CATALOG_LABEL[row.enrichment.source]}:{" "}
                        {row.enrichment.source === "boxxerparts"
                          ? "Bild + Beschreibung"
                          : "Bild + Kompatibilität"}
                        {row.enrichment.part.productUrl && (
                          <a
                            href={row.enrichment.part.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Produktseite öffnen"
                            className="text-base-content/50 hover:text-primary"
                          >
                            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                          </a>
                        )}
                      </span>
                    )}
                    {row.enrichment?.status === "none" && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-base-content/45">
                        Nicht im {CATALOG_LABEL[parsed.invoice.supplierKey ?? "bmwbike"]}-Katalog
                      </span>
                    )}
                  </div>

                  {row.matchedPartId == null ? (
                    <div className="flex items-center gap-2">
                      {row.enrichment?.status === "found" && row.enrichment.part.imageUrl && (
                        <img
                          src={row.enrichment.part.imageUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-sm border border-base-300 bg-white object-contain dark:border-navy-700"
                        />
                      )}
                      <input
                        type="text"
                        value={row.name}
                        onChange={(event) => updateRow(row.key, { name: event.target.value })}
                        aria-label={`Bezeichnung für ${row.partNumber || row.invoiceName}`}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={row.manufacturer}
                        onChange={(event) =>
                          updateRow(row.key, { manufacturer: event.target.value })
                        }
                        aria-label={`Hersteller für ${row.partNumber || row.invoiceName}`}
                        placeholder="Hersteller"
                        className={`${inputClass} !w-32 shrink-0`}
                      />
                    </div>
                  ) : (
                    <p className="truncate text-sm text-base-content/70">{row.invoiceName}</p>
                  )}

                  {row.matchedPartId == null &&
                    (row.oemPartNumbers.length > 0 || row.oemPartNumber !== "") && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`oem-${row.key}`}
                          className={labelClass}
                          title={
                            row.oemPartNumbers.length > 0
                              ? `In der Beschreibung genannt: ${row.oemPartNumbers.join(", ")}`
                              : undefined
                          }
                        >
                          Verknüpfen mit BMW-Nr.
                        </label>
                        <input
                          id={`oem-${row.key}`}
                          type="text"
                          value={row.oemPartNumber}
                          onChange={(event) =>
                            updateRow(row.key, { oemPartNumber: event.target.value })
                          }
                          placeholder="keine"
                          className={`${inputClass} !w-40 !py-1 font-mono text-xs`}
                        />
                        {row.oemEnrichment.length > 0 && (
                          <span className="text-[11px] text-success">
                            + {row.oemEnrichment.join(", ")} von BMWBike
                          </span>
                        )}
                      </div>
                    )}

                  {row.matchedPartId == null && row.fitment.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={labelClass}>Passend für</span>
                      {row.fitment.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => toggleFitment(row.key, choice.id)}
                          aria-pressed={choice.selected}
                          title={row.fitmentMatches
                            .filter((match) => match.names.includes(seriesName(choice.id)))
                            .map((match) => `«${match.phrase}»`)
                            .join(", ")}
                          className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                            choice.selected
                              ? "border-primary/50 bg-primary/10 text-primary dark:text-primary-light"
                              : "border-base-300 text-base-content/40 line-through dark:border-navy-700"
                          }`}
                        >
                          {seriesName(choice.id)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={row.quantity}
                      onChange={(event) =>
                        updateRow(row.key, {
                          quantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                      aria-label={`Menge für ${row.partNumber || row.invoiceName}`}
                      className={`${inputClass} !w-16 shrink-0`}
                    />
                    <span className="text-xs text-base-content/45">×</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.priceTotal}
                      onChange={(event) =>
                        updateRow(row.key, { priceTotal: event.target.value })
                      }
                      aria-label={`Preis gesamt für ${row.partNumber || row.invoiceName}`}
                      placeholder="Preis gesamt"
                      className={`${inputClass} !w-28 shrink-0`}
                    />
                    <span className="text-xs text-base-content/45">
                      {parsed.invoice.currency}
                    </span>
                    <select
                      value={row.locationId}
                      onChange={(event) =>
                        updateRow(row.key, { locationId: event.target.value })
                      }
                      aria-label={`Lagerort für ${row.partNumber || row.invoiceName}`}
                      className={`${inputClass} !w-auto min-w-[11rem] flex-1`}
                    >
                      <option value="">Kein Lagerort</option>
                      {storageLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {storageLocationPath(location, storageLocations)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {row.warnings.map((warning) => (
                    <p key={warning} className="flex items-center gap-1 text-[11px] text-warning">
                      <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {warning}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invoice-purchase-date" className={labelClass}>
                Kaufdatum
              </label>
              <input
                type="date"
                id="invoice-purchase-date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invoice-location-all" className={labelClass}>
                Lagerort für alle setzen
              </label>
              <select
                id="invoice-location-all"
                value={allLocationId}
                onChange={(event) => {
                  const value = event.target.value;
                  setAllLocationId(value);
                  // Convenience setter — overwrites every row; rows stay
                  // individually adjustable afterwards.
                  setRows((current) => current.map((row) => ({ ...row, locationId: value })));
                }}
                className={inputClass}
              >
                <option value="">Kein Lagerort</option>
                {storageLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {storageLocationPath(location, storageLocations)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {commitErrors.length > 0 && (
            <div className="space-y-1 rounded-sm border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
              <p className="font-semibold">Nicht alle Positionen konnten importiert werden:</p>
              {commitErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isCommitting}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={isCommitting || isEnriching || includedRows.length === 0}
              isLoading={isCommitting}
            >
              {includedRows.length === 1
                ? "1 Position importieren"
                : `${includedRows.length} Positionen importieren`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
