import { Form, useNavigation, useSubmit } from "react-router";
import { Button } from "./button";
import type { Part } from "~/types/parts";

interface PartConsumptionFormProps {
  part: Part;
  onClose: () => void;
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

/** Manual consumption ("Verbrauch erfassen") — a correction not tied to a
 *  repair. Quantity is capped at the current on-hand; the server enforces the
 *  same rule. Repair-linked consumption is recorded from the maintenance form. */
export function PartConsumptionForm({ part, onClose }: PartConsumptionFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "createConsumption";

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(new FormData(event.currentTarget), { method: "post" });
  };

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value="createConsumption" />
      <input type="hidden" name="partId" value={part.id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="consumption-quantity" className={labelClass}>
            Menge (max. {part.onHand})
          </label>
          <input
            type="number"
            name="quantity"
            id="consumption-quantity"
            required
            min={1}
            max={part.onHand}
            step={1}
            defaultValue={1}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="consumption-date" className={labelClass}>
            Datum
          </label>
          <input
            type="date"
            name="date"
            id="consumption-date"
            defaultValue={today}
            className={`${inputClass} dark:[color-scheme:dark]`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="consumption-notes" className={labelClass}>
          Notiz (Optional)
        </label>
        <input
          type="text"
          name="notes"
          id="consumption-notes"
          placeholder="z.B. defekt / verloren"
          className={inputClass}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Speichern
        </Button>
      </div>
    </Form>
  );
}
