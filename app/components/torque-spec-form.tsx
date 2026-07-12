import { Form, useNavigation, useSubmit } from "react-router";
import { useState } from "react";
import { Button } from "./button";
import type { TorqueSpecification } from "~/types/db";

import { AlertTriangle, Trash2 } from "lucide-react";

type VariationType = "none" | "plus_minus" | "range";

const EMPTY_CATEGORIES: string[] = [];

interface TorqueSpecFormProps {
  motorcycleId: number;
  initialValues?: TorqueSpecification | null;
  existingCategories?: string[];
  onClose: () => void;
  onSubmit?: () => void;
  onDelete?: (spec: TorqueSpecification) => void;
}

export function TorqueSpecForm({
  motorcycleId,
  initialValues,
  existingCategories = EMPTY_CATEGORIES,
  onClose,
  onSubmit,
  onDelete,
}: TorqueSpecFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const pendingIntent = navigation.formData?.get("intent");
  const isSubmitting =
    navigation.state === "submitting" &&
    (pendingIntent === "createTorqueSpec" || pendingIntent === "updateTorqueSpec");

  const defaultCategories = ["Motor", "Fahrwerk", "Bremsen", "Antrieb", "Elektrik", "Karosserie"];
  const combinedCategories = Array.from(new Set([...defaultCategories, ...existingCategories])).sort();

  const getInitialVariationType = (): VariationType => {
    if (initialValues?.torqueEnd) return "range";
    if (initialValues?.variation) return "plus_minus";
    return "none";
  };

  const [variationType, setVariationType] = useState<VariationType>(getInitialVariationType());
  const [unverified, setUnverified] = useState(initialValues?.unverified ?? false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // Controlled checkbox has no `name`, so inject it explicitly (FormData is built from the DOM).
    formData.set("unverified", unverified ? "true" : "false");
    submit(formData, { method: "post" });
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value={initialValues ? "updateTorqueSpec" : "createTorqueSpec"} />
      <input type="hidden" name="motorcycleId" value={motorcycleId} />
      {initialValues && <input type="hidden" name="torqueId" value={initialValues.id} />}

      <div className="space-y-1.5">
        <label htmlFor="category" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Kategorie
        </label>
        <input
          type="text"
          name="category"
          id="category"
          required
          placeholder="z.B. Motor, Fahrwerk, Bremsen"
          list="category-suggestions"
          defaultValue={initialValues?.category}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
        <datalist id="category-suggestions">
          {combinedCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Bezeichnung
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          placeholder="z.B. Ölablassschraube"
          defaultValue={initialValues?.name}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="toolSize" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Werkzeuggröße (Optional)
        </label>
        <input
          type="text"
          name="toolSize"
          id="toolSize"
          placeholder="z.B. 17mm, T40, H6"
          defaultValue={initialValues?.toolSize ?? ""}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="torque" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Wert
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={variationType}
            onChange={(e) => setVariationType(e.target.value as VariationType)}
            className="rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
          >
            <option value="none">Festwert</option>
            <option value="plus_minus">± Toleranz</option>
            <option value="range">Bereich (von-bis)</option>
          </select>
          <div className="flex flex-1 items-center gap-2">
            <input
              type="number"
              name="torque"
              id="torque"
              required
              step="0.1"
              placeholder="Wert (Nm)"
              defaultValue={initialValues?.torque}
              className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
            />

            {variationType === "plus_minus" && (
              <>
                <span className="font-bold text-secondary shrink-0">±</span>
                <input
                  type="number"
                  name="variation"
                  id="variation"
                  required
                  step="0.1"
                  placeholder="Tol."
                  defaultValue={initialValues?.variation ?? ""}
                  className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                />
              </>
            )}
            {variationType === "range" && (
              <>
                <span className="font-bold text-secondary shrink-0">-</span>
                <input
                  type="number"
                  name="torqueEnd"
                  id="torqueEnd"
                  required
                  step="0.1"
                  placeholder="Max"
                  defaultValue={initialValues?.torqueEnd ?? ""}
                  className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Beschreibung (Optional)
        </label>
        <textarea
          name="description"
          id="description"
          rows={2}
          defaultValue={initialValues?.description ?? ""}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <label
        aria-label="Unverifiziert"
        className="flex cursor-pointer items-start gap-3 rounded-sm border border-base-300 p-3 transition-colors hover:border-base-content/30 dark:border-navy-700"
      >
        <input
          type="checkbox"
          checked={unverified}
          onChange={(event) => setUnverified(event.target.checked)}
          className="checkbox checkbox-sm checkbox-warning mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-base-content dark:text-white">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            Unverifiziert
          </span>
          <span className="mt-0.5 block text-xs text-base-content/60">
            Wert aus unsicherer Quelle – im Zweifel vor Gebrauch prüfen.
          </span>
        </span>
      </label>

      <div className="flex justify-between items-center pt-4">
        <div>
          {initialValues && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onDelete(initialValues)}
              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </div>
        <div className="flex gap-3 justify-end">
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