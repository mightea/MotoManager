import { useState, useMemo } from "react";
import { useSubmit } from "react-router";
import { Modal } from "./modal";
import { Button } from "./button";
import type { TorqueSpecification } from "~/db/schema";
import { AlertTriangle, Check, Search } from "lucide-react";
import clsx from "clsx";

interface ImportTorqueSpecsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetMotorcycleId: number;
  otherMotorcycles: { id: number; make: string; model: string; modelYear: number | null }[];
  otherSpecs: TorqueSpecification[];
  existingSpecs: TorqueSpecification[];
}

export function ImportTorqueSpecsDialog({
  isOpen,
  onClose,
  targetMotorcycleId,
  otherMotorcycles,
  otherSpecs,
  existingSpecs,
}: ImportTorqueSpecsDialogProps) {
  const submit = useSubmit();
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<number | null>(null);
  const [selectedSpecIds, setSelectedSpecIds] = useState<Set<number>>(new Set());

  const sourceSpecs = useMemo(() => {
    if (!selectedMotorcycleId) return [];
    return otherSpecs.filter((s) => s.motorcycleId === selectedMotorcycleId);
  }, [selectedMotorcycleId, otherSpecs]);

  const existingMap = useMemo(() => {
    const map = new Map<string, boolean>();
    existingSpecs.forEach((s) => {
      map.set(`${s.category}:${s.name}`.toLowerCase(), true);
    });
    return map;
  }, [existingSpecs]);

  const handleToggle = (specId: number) => {
    const newSet = new Set(selectedSpecIds);
    if (newSet.has(specId)) {
      newSet.delete(specId);
    } else {
      newSet.add(specId);
    }
    setSelectedSpecIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedSpecIds.size === sourceSpecs.length) {
      setSelectedSpecIds(new Set());
    } else {
      setSelectedSpecIds(new Set(sourceSpecs.map((s) => s.id)));
    }
  };

  const handleSubmit = () => {
    if (selectedSpecIds.size === 0) return;

    const formData = new FormData();
    formData.append("intent", "importTorqueSpecs");
    formData.append("motorcycleId", targetMotorcycleId.toString());
    selectedSpecIds.forEach((id) => {
      formData.append("sourceSpecIds", id.toString());
    });

    submit(formData, { method: "post" });
    onClose();
    // Reset state
    setSelectedMotorcycleId(null);
    setSelectedSpecIds(new Set());
  };

  const selectedMotorcycle = otherMotorcycles.find(m => m.id === selectedMotorcycleId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Werte importieren"
      description="Übernehme Anzugsmomente von einem anderen Fahrzeug."
    >
      <div className="space-y-4">
        {/* Step 1: Select Motorcycle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
            Quelle wählen
          </label>
          <select
            className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white"
            value={selectedMotorcycleId ?? ""}
            onChange={(e) => {
                setSelectedMotorcycleId(Number(e.target.value) || null);
                setSelectedSpecIds(new Set());
            }}
          >
            <option value="">-- Fahrzeug wählen --</option>
            {otherMotorcycles.map((moto) => (
              <option key={moto.id} value={moto.id}>
                {moto.make} {moto.model} {moto.modelYear ? `(${moto.modelYear})` : ""}
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
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(spec.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900"
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground dark:text-white">{spec.name}</span>
                            <span className="text-sm font-semibold text-foreground dark:text-white">
                                {spec.torque} Nm
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-secondary dark:text-navy-400">
                            <span>{spec.category}</span>
                            <span>{spec.toolSize}</span>
                        </div>
                        {isOverwrite && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Wird überschrieben</span>
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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedSpecIds.size === 0}
          >
            Importieren ({selectedSpecIds.size})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
