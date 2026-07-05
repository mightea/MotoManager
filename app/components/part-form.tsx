import { Form, useNavigation, useSubmit } from "react-router";
import { useState } from "react";
import { Trash2, Globe, Lock } from "lucide-react";
import clsx from "clsx";
import { Button } from "./button";
import { modelSeriesDisplayName, type ModelSeries, type Part } from "~/types/parts";

interface PartFormProps {
  initialValues?: Part | null;
  modelSeries: ModelSeries[];
  onClose: () => void;
  onDelete?: (part: Part) => void;
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

/** Create/edit a catalog part: part number + name identity, manufacturer,
 *  fitment (series multi-select) and the public-sharing toggle. */
export function PartForm({ initialValues, modelSeries, onClose, onDelete }: PartFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const pendingIntent = navigation.formData?.get("intent");
  const isSubmitting =
    navigation.state === "submitting" &&
    (pendingIntent === "createPart" || pendingIntent === "updatePart");

  const [isPublic, setIsPublic] = useState(initialValues?.isPublic ?? false);
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<Set<number>>(
    new Set(initialValues?.seriesIds ?? []),
  );
  const [seriesFilter, setSeriesFilter] = useState("");

  const toggleSeries = (id: number) => {
    setSelectedSeriesIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredSeries = seriesFilter.trim()
    ? modelSeries.filter((series) =>
        modelSeriesDisplayName(series).toLowerCase().includes(seriesFilter.trim().toLowerCase()),
      )
    : modelSeries;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("isPublic", isPublic ? "true" : "false");
    for (const id of selectedSeriesIds) {
      formData.append("seriesIds", String(id));
    }
    submit(formData, { method: "post" });
  };

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value={initialValues ? "updatePart" : "createPart"} />
      {initialValues && <input type="hidden" name="partId" value={initialValues.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="partNumber" className={labelClass}>
            Teilenummer
          </label>
          <input
            type="text"
            name="partNumber"
            id="partNumber"
            required
            placeholder="z.B. 11 42 7 673 541"
            defaultValue={initialValues?.partNumber}
            className={clsx(inputClass, "font-mono")}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="name" className={labelClass}>
            Bezeichnung
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            placeholder="z.B. Ölfilter"
            defaultValue={initialValues?.name}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="manufacturer" className={labelClass}>
          Hersteller
        </label>
        <input
          type="text"
          name="manufacturer"
          id="manufacturer"
          placeholder="BMW"
          defaultValue={initialValues?.manufacturer ?? "BMW"}
          list="manufacturer-suggestions"
          className={inputClass}
        />
        <datalist id="manufacturer-suggestions">
          {["BMW", "Mahle", "Bosch", "NGK", "Sachs", "Brembo"].map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1.5">
        <span className={labelClass}>Passende Baureihen</span>
        <input
          type="text"
          value={seriesFilter}
          onChange={(event) => setSeriesFilter(event.target.value)}
          placeholder="Baureihe suchen …"
          className={inputClass}
        />
        <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-sm border border-base-300 p-2 dark:border-navy-700">
          {filteredSeries.length === 0 ? (
            <p className="px-1 py-2 text-xs text-base-content/60">Keine Baureihe gefunden.</p>
          ) : (
            filteredSeries.map((series) => (
              <label
                key={series.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-base-200 dark:hover:bg-navy-800"
              >
                <input
                  type="checkbox"
                  checked={selectedSeriesIds.has(series.id)}
                  onChange={() => toggleSeries(series.id)}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <span className="text-base-content dark:text-white">
                  {modelSeriesDisplayName(series)}
                </span>
                {series.userId != null && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-base-content/45">
                    Eigene
                  </span>
                )}
              </label>
            ))
          )}
        </div>
        <p className="text-xs text-base-content/60">
          {selectedSeriesIds.size === 0
            ? "Ohne Baureihe wird das Teil keinem Motorrad zugeordnet."
            : `${selectedSeriesIds.size} Baureihe${selectedSeriesIds.size === 1 ? "" : "n"} ausgewählt.`}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>
          Beschreibung (Optional)
        </label>
        <textarea
          name="description"
          id="description"
          rows={2}
          placeholder="z.B. passt auch für Ölkühler-Variante"
          defaultValue={initialValues?.description ?? ""}
          className={inputClass}
        />
      </div>

      <label
        aria-label="Öffentlich teilen"
        className="flex cursor-pointer items-start gap-3 rounded-sm border border-base-300 p-3 transition-colors hover:border-base-content/30 dark:border-navy-700"
      >
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="checkbox checkbox-sm checkbox-primary mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-base-content dark:text-white">
            {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            Öffentlich teilen
          </span>
          <span className="mt-0.5 block text-xs text-base-content/60">
            Andere Nutzer sehen Teiledaten und Verfügbarkeit — nie Preise, Kaufdaten oder Lagerorte.
          </span>
        </span>
      </label>

      <div className="flex items-center justify-between pt-4">
        <div>
          {initialValues && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(initialValues)}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Speichern
          </Button>
        </div>
      </div>
    </Form>
  );
}
