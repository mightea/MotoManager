import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { CircleCheck, FileText, Loader2, Package, TriangleAlert } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { getSessionToken } from "~/services/auth";
import {
  createPart,
  createPartStock,
  importPartImageFromUrl,
  parsePartsInvoice,
} from "~/services/parts";
import {
  fetchBmwbikePart,
  findBmwbikeSlugByPartNumber,
  mapCompatibility,
  type BmwbikePart,
} from "~/utils/bmwbike";
import { storageLocationPath } from "~/utils/parts";
import { toast } from "~/hooks/use-toast";
import type { ModelSeries, ParsedInvoice, StorageLocation } from "~/types/parts";

interface InvoiceImportDialogProps {
  isOpen: boolean;
  modelSeries: ModelSeries[];
  storageLocations: StorageLocation[];
  onClose: () => void;
}

/** BMWBike catalog enrichment for a line that would create a new part. */
type Enrichment =
  | { status: "loading" }
  | { status: "found"; part: BmwbikePart; seriesIds: number[] }
  | { status: "none" };

interface ReviewRow {
  key: number;
  include: boolean;
  partNumber: string;
  /** Editable name — prefilled from BMWBike when found, else the invoice. */
  name: string;
  invoiceName: string;
  quantity: number;
  /** Total price for the stock entry (invoice Betrag), as input text. */
  priceTotal: string;
  /** Per-row Lagerort (select value; "" = none) — one order often gets
   *  sorted into several boxes. */
  locationId: string;
  matchedPartId: number | null;
  matchedPartName: string | null;
  warnings: string[];
  enrichment: Enrichment | null;
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-2 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

/** Import parts + stock from a supplier-invoice PDF. The backend parses the
 *  PDF (local LLM with deterministic fallback); new parts are enriched from
 *  the BMWBike catalog. NOTHING is written until "Importieren" is confirmed —
 *  this dialog is review-first by design. */
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
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setParseError("Nur PDF-Dateien werden unterstützt.");
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
          // Rows of an already-imported invoice start unchecked so a stray
          // re-upload can't silently double the stock.
          include: !result.alreadyImported,
          partNumber: item.partNumber,
          name: item.name,
          invoiceName: item.name,
          quantity: item.quantity,
          priceTotal: item.lineTotal != null ? item.lineTotal.toFixed(2) : "",
          locationId: "",
          matchedPartId: item.matchedPartId,
          matchedPartName: item.matchedPartName,
          warnings: item.warnings,
          enrichment: item.matchedPartId == null ? { status: "loading" } : null,
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

  // Enrich new-part rows from the BMWBike catalog (name, image, fitment).
  // Failures degrade to a plain create from invoice data.
  useEffect(() => {
    if (!parsed) return;
    let active = true;
    const pending = rows.filter((row) => row.enrichment?.status === "loading");
    for (const row of pending) {
      (async () => {
        let enrichment: Enrichment = { status: "none" };
        let bmwbikeName: string | null = null;
        try {
          const slug = await findBmwbikeSlugByPartNumber(row.partNumber);
          if (slug) {
            const part = await fetchBmwbikePart(slug);
            const mapping = mapCompatibility(part.compatNames, modelSeries);
            enrichment = { status: "found", part, seriesIds: mapping.seriesIds };
            bmwbikeName = part.name;
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
                  // Catalog names are complete where invoice names truncate
                  // ("Schalter Warnblinke") — prefill, keep editable.
                  name: bmwbikeName ?? candidate.name,
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

  const includedRows = rows.filter((row) => row.include);
  const isEnriching = rows.some(
    (row) => row.include && row.enrichment?.status === "loading",
  );
  const invoiceNote = parsed?.invoice.invoiceNumber
    ? `${parsed.invoice.supplier ?? "Import"} · Rechnung ${parsed.invoice.invoiceNumber}`
    : `${parsed?.invoice.supplier ?? "Import"} · PDF-Import`;

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
            manufacturer: "BMW",
            description: enriched?.part.description ?? undefined,
            seriesIds: enriched?.seriesIds ?? [],
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
          `${row.partNumber}: ${e instanceof Error ? e.message : "Import fehlgeschlagen"}`,
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
      title="Rechnung importieren"
      description="Bestellte Teile und Bestand aus einer Lieferanten-Rechnung (PDF) übernehmen."
      size="lg"
    >
      {!parsed ? (
        /* ------------------------------ Upload step ----------------------------- */
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            aria-label="Rechnungs-PDF auswählen"
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
                  Rechnung wird gelesen — Positionen, Teilenummern und Preise …
                </span>
              </>
            ) : (
              <>
                <FileText
                  className={`h-8 w-8 ${isDragging ? "text-primary" : "text-base-content/30"}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-base-content dark:text-white">
                  {isDragging ? "PDF hier ablegen" : "PDF auswählen oder hierhin ziehen"}
                </span>
                <span className="max-w-[36ch] text-xs text-base-content/55">
                  Rechnungen von Mark Huggett GmbH (bmwbike.com) werden am besten erkannt;
                  andere Formate werden per KI ausgelesen.
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
              {parsed.invoice.supplier ?? "Rechnung"}
            </span>
            {parsed.invoice.invoiceNumber && (
              <span className="font-mono">Rechnung {parsed.invoice.invoiceNumber}</span>
            )}
            {parsed.source === "fallback" && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-base-content/45">
                Layout-Parser
              </span>
            )}
          </div>

          {parsed.alreadyImported && (
            <div className="flex items-start gap-2 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-content dark:text-warning">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Zu dieser Rechnungsnummer existiert bereits Bestand — Positionen sind
                deshalb abgewählt. Nur importieren, was wirklich fehlt.
              </span>
            </div>
          )}

          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex items-start gap-3 rounded-sm border border-base-300 p-3 dark:border-navy-700"
              >
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(event) => updateRow(row.key, { include: event.target.checked })}
                  aria-label={`${row.partNumber} importieren`}
                  className="checkbox checkbox-sm checkbox-primary mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-semibold text-base-content/75 dark:text-navy-200">
                      {row.partNumber}
                    </span>
                    {row.matchedPartId != null ? (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary dark:bg-primary/15 dark:text-primary-light">
                        <Package className="h-2.5 w-2.5" aria-hidden="true" />
                        Bestand zu «{row.matchedPartName}»
                      </span>
                    ) : (
                      <span className="stamp !py-0.5 !text-[9px]">Neues Teil</span>
                    )}
                    {row.enrichment?.status === "loading" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-base-content/45">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                        BMWBike…
                      </span>
                    )}
                    {row.enrichment?.status === "found" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-success">
                        <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
                        BMWBike: Bild + Kompatibilität
                      </span>
                    )}
                    {row.enrichment?.status === "none" && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-base-content/45">
                        Nicht im BMWBike-Katalog
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
                        aria-label={`Bezeichnung für ${row.partNumber}`}
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <p className="truncate text-sm text-base-content/70">{row.invoiceName}</p>
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
                      aria-label={`Menge für ${row.partNumber}`}
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
                      aria-label={`Preis gesamt für ${row.partNumber}`}
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
                      aria-label={`Lagerort für ${row.partNumber}`}
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
