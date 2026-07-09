import { useState } from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { PartForm, type PartFormPrefill } from "./part-form";
import {
  fetchBmwbikePart,
  mapCompatibility,
  parseBmwbikeSlug,
  type BmwbikePart,
} from "~/utils/bmwbike";
import type { ModelSeries, StorageLocation } from "~/types/parts";

interface BmwbikeImportDialogProps {
  isOpen: boolean;
  modelSeries: ModelSeries[];
  storageLocations: StorageLocation[];
  onClose: () => void;
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

/** Two-step import: paste a BMWBike part URL, fetch + map its metadata
 *  client-side, then hand everything editable to the normal PartForm. */
export function BmwbikeImportDialog({
  isOpen,
  modelSeries,
  storageLocations,
  onClose,
}: BmwbikeImportDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [part, setPart] = useState<BmwbikePart | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [prefill, setPrefill] = useState<PartFormPrefill | null>(null);

  const reset = () => {
    setUrl("");
    setError(null);
    setPart(null);
    setUnmatched([]);
    setPrefill(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLoad = async () => {
    const slug = parseBmwbikeSlug(url);
    if (!slug) {
      setError("Das sieht nicht nach einer BMWBike-Teile-URL aus (bmwbike.com/de/part/…).");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await fetchBmwbikePart(slug);
      const mapping = mapCompatibility(loaded.compatNames, modelSeries);
      setPart(loaded);
      setUnmatched(mapping.unmatched);
      setPrefill({
        partNumber: loaded.partNumber,
        name: loaded.name,
        description: loaded.description ?? undefined,
        seriesIds: mapping.seriesIds,
        stockPrice: loaded.price ?? undefined,
        stockCurrency: loaded.currency ?? undefined,
        imageUrl: loaded.imageUrl ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "BMWBike-Teil konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Von BMWBike importieren">
      {!part ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="bmwbike-url"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
            >
              BMWBike-URL
            </label>
            <input
              type="url"
              id="bmwbike-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleLoad();
                }
              }}
              placeholder="https://bmwbike.com/de/part/…"
              className={inputClass}
            />
            <p className="text-xs text-base-content/60">
              Übernommen werden Teilenummer, Bezeichnung, Bild, Kompatibilität und der Preis als
              Vorschlag für den ersten Bestand.
            </p>
          </div>
          {error && <p className="text-sm font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleLoad}
              disabled={isLoading}
              leftIcon={
                isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageSearch className="h-4 w-4" />
                )
              }
            >
              Laden
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-sm border border-base-300 p-3 dark:border-navy-700">
            {part.imageUrl && (
              <img
                src={part.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-sm border border-base-300 bg-white object-contain dark:border-navy-700"
              />
            )}
            <div className="min-w-0 text-xs text-base-content/70">
              <p className="truncate text-sm font-semibold text-base-content dark:text-white">
                {part.name}
              </p>
              <p className="font-mono">{part.partNumber}</p>
              {unmatched.length > 0 && (
                <p className="mt-1">
                  {unmatched.length}{" "}
                  {unmatched.length === 1 ? "Eintrag" : "Einträge"} ohne Katalog-Entsprechung
                  übersprungen (z.B. USA-Modelle).
                </p>
              )}
            </div>
          </div>
          <PartForm
            modelSeries={modelSeries}
            storageLocations={storageLocations}
            prefill={prefill ?? undefined}
            onClose={handleClose}
          />
        </div>
      )}
    </Modal>
  );
}
