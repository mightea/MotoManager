import { Form, useSubmit } from "react-router";
import { useState } from "react";
import { Button } from "./button";
import type { TorqueSpecification } from "~/db/schema";

type VariationType = "none" | "plus_minus" | "range";

interface TorqueSpecFormProps {
  motorcycleId: number;
  initialValues?: TorqueSpecification | null;
  onClose: () => void;
  onSubmit?: () => void;
}

export function TorqueSpecForm({
  motorcycleId,
  initialValues,
  onClose,
  onSubmit,
}: TorqueSpecFormProps) {
  const submit = useSubmit();

  const getInitialVariationType = (): VariationType => {
    if (initialValues?.torqueEnd) return "range";
    if (initialValues?.variation) return "plus_minus";
    return "none";
  };

  const [variationType, setVariationType] = useState<VariationType>(getInitialVariationType());

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
        <label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
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
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
        <datalist id="category-suggestions">
          <option value="Motor" />
          <option value="Fahrwerk" />
          <option value="Bremsen" />
          <option value="Antrieb" />
          <option value="Elektrik" />
          <option value="Karosserie" />
        </datalist>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
          Bezeichnung
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          placeholder="z.B. Ölablassschraube"
          defaultValue={initialValues?.name}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="toolSize" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
          Werkzeuggröße (Optional)
        </label>
        <input
          type="text"
          name="toolSize"
          id="toolSize"
          placeholder="z.B. 17mm, T40, H6"
          defaultValue={initialValues?.toolSize ?? ""}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="torque" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
          Wert
        </label>
        <div className="flex gap-2">
          <select
            value={variationType}
            onChange={(e) => setVariationType(e.target.value as VariationType)}
            className="rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white"
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
              className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
            />

            {variationType === "plus_minus" && (
              <>
                <span className="font-bold text-secondary">±</span>
                <input
                  type="number"
                  name="variation"
                  id="variation"
                  required
                  step="0.1"
                  placeholder="Tol."
                  defaultValue={initialValues?.variation ?? ""}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                />
              </>
            )}
            {variationType === "range" && (
              <>
                <span className="font-bold text-secondary">-</span>
                <input
                  type="number"
                  name="torqueEnd"
                  id="torqueEnd"
                  required
                  step="0.1"
                  placeholder="Max"
                  defaultValue={initialValues?.torqueEnd ?? ""}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
          Beschreibung (Optional)
        </label>
        <textarea
          name="description"
          id="description"
          rows={2}
          defaultValue={initialValues?.description ?? ""}
          className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit">
          Speichern
        </Button>
      </div>
    </Form>
  );
}