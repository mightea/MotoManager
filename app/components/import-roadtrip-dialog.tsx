import { useState, useRef } from "react";
import { Modal } from "./modal";
import { isDuplicate, type RoadTripFuelEntry, parseRoadTripCsv } from "~/utils/roadtrip-import";
import type { MaintenanceRecord } from "~/types/db";
import { Upload, Check, AlertTriangle, Fuel, Calendar, Hash } from "lucide-react";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import clsx from "clsx";

interface ImportRoadTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedEntries: RoadTripFuelEntry[]) => void;
  existingMaintenance?: MaintenanceRecord[];
}

export function ImportRoadTripDialog({
  isOpen,
  onClose,
  onImport,
  existingMaintenance = [],
}: ImportRoadTripDialogProps) {
  const [entries, setEntries] = useState<(RoadTripFuelEntry & { selected: boolean; duplicate: boolean })[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseRoadTripCsv(content);
      
      const enriched = parsed.map(entry => ({
        ...entry,
        duplicate: isDuplicate(entry, existingMaintenance),
        selected: !isDuplicate(entry, existingMaintenance)
      }));
      
      setEntries(enriched);
    };
    reader.readAsText(file);
  };

  const toggleSelect = (index: number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, selected: !e.selected } : e));
  };

  const toggleAll = (selected: boolean) => {
    setEntries(prev => prev.map(e => ({ ...e, selected: selected && !e.duplicate })));
  };

  const handleConfirm = () => {
    const selected = entries
      .filter(e => e.selected)
      .map(({ selected: _s, duplicate: _d, ...rest }) => rest);
    onImport(selected);
    onClose();
  };

  const selectedCount = entries.filter(e => e.selected).length;
  const duplicateCount = entries.filter(e => e.duplicate).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RoadTrip Daten importieren"
      description="Lade eine .csv Datei aus der RoadTrip App hoch, um Tankstopps zu importieren."
    >
      <div className="space-y-6">
        {entries.length === 0 ? (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 transition-colors hover:bg-gray-100 dark:border-navy-600 dark:bg-navy-900/50 dark:hover:bg-navy-900"
          >
            <Upload className="mb-4 h-12 w-12 text-secondary dark:text-navy-400" />
            <span className="text-sm font-medium text-foreground dark:text-white">
              CSV Datei auswählen
            </span>
            <span className="mt-1 text-xs text-secondary dark:text-navy-400">
              Klicke hier oder ziehe die Datei in das Feld
            </span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv" 
              className="hidden" 
            />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-secondary dark:text-navy-300">
                {entries.length} Einträge gefunden ({duplicateCount} Duplikate)
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Alle (ohne Duplikate)
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  Keine
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-navy-700">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs font-semibold uppercase text-secondary dark:bg-navy-900 dark:text-navy-400">
                  <tr>
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3">Datum / KM</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-right">Preis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                  {entries.map((entry, idx) => (
                    <tr 
                      key={entry.externalId || `${entry.date}-${entry.odo}-${entry.locationName || ""}`} 
                      className={clsx(
                        "transition-colors",
                        entry.duplicate ? "bg-amber-50/30 dark:bg-amber-900/10" : "hover:bg-gray-50/50 dark:hover:bg-navy-800/50"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          disabled={entry.duplicate}
                          onChange={() => toggleSelect(idx)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-foreground dark:text-white">
                          <Calendar className="h-3 w-3 text-secondary" />
                          {(() => {
                            const d = new Date(entry.date);
                            return isNaN(d.getTime()) ? "Ungültiges Datum" : d.toLocaleDateString('de-CH');
                          })()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary dark:text-navy-400">
                          <Hash className="h-3 w-3" />
                          {formatNumber(entry.odo)} km
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-foreground dark:text-white font-medium">
                          <Fuel className="h-3 w-3 text-secondary" />
                          {entry.fuelAmount} L
                        </div>
                        <div className="text-xs text-secondary dark:text-navy-400">
                          {entry.fuelType}
                        </div>
                        {entry.duplicate && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Mögliches Duplikat
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div className="text-foreground dark:text-white font-semibold">
                          {formatCurrency(entry.cost, entry.currency ?? "CHF")}
                        </div>
                        <div className="text-[10px] text-secondary dark:text-navy-500">
                          {entry.pricePerUnit.toFixed(3)} / L
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                    setEntries([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                Zurücksetzen
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleConfirm}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-dark disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {selectedCount} Einträge importieren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
