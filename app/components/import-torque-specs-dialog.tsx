import { useState } from "react";
import { useSubmit } from "react-router";
import { Modal } from "./modal";
import { Button } from "./button";
import type { CatalogTorqueSpec, TorqueSpecification } from "~/types/db";
import { AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { groupCatalogByCategory, torqueDuplicateKey } from "~/utils/catalog-torque-specs";

export type TorqueImportSource = "catalog" | "own";

interface ImportTorqueSpecsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetMotorcycleId: number;
  otherMotorcycles: { id: number; make: string; model: string; fabricationDate: string | null }[];
  otherSpecs: TorqueSpecification[];
  existingSpecs: TorqueSpecification[];
  /** Catalog values for the bike's node; empty/absent hides the catalog source. */
  catalogSpecs?: CatalogTorqueSpec[];
  /** Source shown first (the parent remounts the dialog per opening). */
  initialSource?: TorqueImportSource;
}

const NO_CATALOG_SPECS: CatalogTorqueSpec[] = [];

const LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/60 dark:text-navy-400";

function formatTorque(spec: Pick<TorqueSpecification, "torque" | "torqueEnd">): string {
  return `${spec.torque}${spec.torqueEnd ? `–${spec.torqueEnd}` : ""} Nm`;
}

export function ImportTorqueSpecsDialog({
  isOpen,
  onClose,
  targetMotorcycleId,
  otherMotorcycles,
  otherSpecs,
  existingSpecs,
  catalogSpecs = NO_CATALOG_SPECS,
  initialSource,
}: ImportTorqueSpecsDialogProps) {
  const submit = useSubmit();
  const hasCatalog = catalogSpecs.length > 0;
  const hasOwn = otherMotorcycles.length > 0;
  const [source, setSource] = useState<TorqueImportSource>(
    initialSource ?? (hasCatalog ? "catalog" : "own"),
  );
  const activeSource: TorqueImportSource = source === "catalog" && !hasCatalog ? "own" : source;
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<number | null>(null);
  const [selectedSpecIds, setSelectedSpecIds] = useState<Set<number>>(new Set());
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<number>>(new Set());

  const sourceSpecs = !selectedMotorcycleId
    ? []
    : otherSpecs.filter((s) => s.motorcycleId === selectedMotorcycleId);

  const existingMap = new Map<string, boolean>();
  existingSpecs.forEach((s) => {
    existingMap.set(`${s.category}:${s.name}`.toLowerCase(), true);
  });

  // Catalog import skips exact duplicates server-side; mirror that here.
  const existingKeys = new Set(existingSpecs.map(torqueDuplicateKey));
  const catalogGroups = groupCatalogByCategory(catalogSpecs);
  const importableCatalogIds = catalogSpecs
    .filter((spec) => !existingKeys.has(torqueDuplicateKey(spec)))
    .map((spec) => spec.id);

  const toggle = (set: Set<number>, id: number) => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  };

  const handleSelectAll = () => {
    if (selectedSpecIds.size === sourceSpecs.length) {
      setSelectedSpecIds(new Set());
    } else {
      setSelectedSpecIds(new Set(sourceSpecs.map((s) => s.id)));
    }
  };

  const allCatalogSelected =
    importableCatalogIds.length > 0 && importableCatalogIds.every((id) => selectedCatalogIds.has(id));

  const reset = () => {
    setSelectedMotorcycleId(null);
    setSelectedSpecIds(new Set());
    setSelectedCatalogIds(new Set());
  };

  const selectedCount = activeSource === "catalog" ? selectedCatalogIds.size : selectedSpecIds.size;

  const handleSubmit = () => {
    if (selectedCount === 0) return;

    const formData = new FormData();
    formData.append("motorcycleId", targetMotorcycleId.toString());
    if (activeSource === "catalog") {
      formData.append("intent", "importCatalogTorqueSpecs");
      selectedCatalogIds.forEach((id) => formData.append("catalogSpecIds", id.toString()));
    } else {
      formData.append("intent", "importTorqueSpecs");
      selectedSpecIds.forEach((id) => formData.append("sourceSpecIds", id.toString()));
    }

    submit(formData, { method: "post" });
    onClose();
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Werte importieren"
      description={
        hasCatalog
          ? "Übernimm Anzugsmomente aus dem Modellkatalog oder von einem anderen Fahrzeug."
          : "Übernimm Anzugsmomente von einem anderen Fahrzeug."
      }
    >
      <div className="space-y-4">
        {hasCatalog && hasOwn && (
          <div role="tablist" aria-label="Quelle" className="grid grid-cols-2 gap-1 rounded-sm border border-base-300 p-1 dark:border-navy-700">
            {(
              [
                ["catalog", "Modellkatalog"],
                ["own", "Eigene Motorräder"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={activeSource === value}
                onClick={() => setSource(value)}
                className={clsx(
                  "rounded-sm px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
                  activeSource === value
                    ? "bg-primary text-primary-content"
                    : "text-base-content/70 hover:bg-base-200 dark:text-navy-300 dark:hover:bg-navy-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {activeSource === "catalog" ? (
          <div className="space-y-3">
            <p className="text-xs text-base-content/70 dark:text-navy-300">
              Von anderen Nutzern dieses Servers geteilt — vor dem Anziehen prüfen. Bereits
              vorhandene Werte werden übersprungen.
            </p>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-navy-700">
              <span className="text-sm font-medium text-secondary dark:text-navy-300">
                {catalogSpecs.length} {catalogSpecs.length === 1 ? "Wert" : "Werte"} im Katalog
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedCatalogIds(allCatalogSelected ? new Set() : new Set(importableCatalogIds))
                }
                disabled={importableCatalogIds.length === 0}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {allCatalogSelected ? "Alle abwählen" : "Alle auswählen"}
              </button>
            </div>

            <div className="-mx-2 max-h-[400px] space-y-3 overflow-y-auto px-2">
              {catalogGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <div className={clsx(LABEL, "px-1")}>{group.category}</div>
                  {group.specs.map((spec) => {
                    const isDuplicate = existingKeys.has(torqueDuplicateKey(spec));
                    const isSelected = selectedCatalogIds.has(spec.id);
                    return (
                      <label
                        key={spec.id}
                        className={clsx(
                          "flex items-start gap-3 rounded-lg border p-3 transition-all",
                          isDuplicate ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                          isSelected
                            ? "border-primary/50 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
                            : "border-transparent hover:bg-gray-50 dark:hover:bg-navy-800",
                        )}
                      >
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDuplicate}
                            onChange={() => setSelectedCatalogIds(toggle(selectedCatalogIds, spec.id))}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate font-medium text-foreground dark:text-white">
                              {spec.name}
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground dark:text-white">
                              {formatTorque(spec)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-secondary dark:text-navy-400">
                            <span className="truncate">
                              {spec.seriesName} · von {spec.contributorUsername}
                            </span>
                            <span className="shrink-0">{spec.toolSize}</span>
                          </div>
                          {isDuplicate && (
                            <div className="text-[11px] font-bold text-base-content/60 dark:text-navy-300">
                              Bereits vorhanden
                            </div>
                          )}
                          {!isDuplicate && spec.unverified && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span className="font-bold">Unverifiziert</span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Select Motorcycle */}
            <div className="space-y-1.5">
              <label htmlFor="source-motorcycle" className={LABEL}>
                Quelle wählen
              </label>
              <select
                id="source-motorcycle"
                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                value={selectedMotorcycleId ?? ""}
                onChange={(e) => {
                  setSelectedMotorcycleId(Number(e.target.value) || null);
                  setSelectedSpecIds(new Set());
                }}
              >
                <option value="">-- Fahrzeug wählen --</option>
                {otherMotorcycles.map((moto) => (
                  <option key={moto.id} value={moto.id}>
                    {moto.make} {moto.model} {moto.fabricationDate ? `(${moto.fabricationDate})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: List Specs */}
            {selectedMotorcycleId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-navy-700">
                  <span className="text-sm font-medium text-secondary dark:text-navy-300">
                    {sourceSpecs.length} Einträge gefunden
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {selectedSpecIds.size === sourceSpecs.length ? "Alle abwählen" : "Alle auswählen"}
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-1 -mx-2 px-2">
                  {sourceSpecs.length === 0 ? (
                    <p className="text-center text-sm text-secondary py-4">Keine Einträge vorhanden.</p>
                  ) : (
                    sourceSpecs.map((spec) => {
                      const key = `${spec.category}:${spec.name}`.toLowerCase();
                      const isOverwrite = existingMap.has(key);
                      const isSelected = selectedSpecIds.has(spec.id);

                      return (
                        <label
                          key={spec.id}
                          className={clsx(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
                            isSelected
                              ? "border-primary/50 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
                              : "border-transparent hover:bg-gray-50 dark:hover:bg-navy-800"
                          )}
                        >
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setSelectedSpecIds(toggle(selectedSpecIds, spec.id))}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-foreground dark:text-white truncate">{spec.name}</span>
                              <span className="text-sm font-semibold text-foreground dark:text-white whitespace-nowrap shrink-0">
                                {spec.torque} Nm
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-secondary dark:text-navy-400">
                              <span>{spec.category}</span>
                              <span className="shrink-0">{spec.toolSize}</span>
                            </div>
                            {isOverwrite && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span className="font-bold">Wird überschrieben</span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={selectedCount === 0}>
            Importieren ({selectedCount})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
