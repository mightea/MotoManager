import { Form, useNavigation, useSubmit } from "react-router";
import { Trash2 } from "lucide-react";
import { Button } from "./button";
import { StorageLocationPickerField } from "./storage-location-picker-field";
import { AVAILABLE_CURRENCY_PRESETS, DEFAULT_CURRENCY_CODE } from "~/constants";
import type { Part, PartStock, StorageLocation } from "~/types/parts";

interface PartStockFormProps {
  part: Part;
  storageLocations: StorageLocation[];
  initialValues?: PartStock | null;
  onClose: () => void;
  onDelete?: (stock: PartStock) => void;
}

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

/** Create/edit a stock (purchase) entry: quantity, price, purchase date,
 *  storage location (existing or inline-created) and notes. */
export function PartStockForm({
  part,
  storageLocations,
  initialValues,
  onClose,
  onDelete,
}: PartStockFormProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const pendingIntent = navigation.formData?.get("intent");
  const isSubmitting =
    navigation.state === "submitting" &&
    (pendingIntent === "createStock" || pendingIntent === "updateStock");

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(new FormData(event.currentTarget), { method: "post" });
  };

  return (
    <Form method="post" className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="intent" value={initialValues ? "updateStock" : "createStock"} />
      <input type="hidden" name="partId" value={part.id} />
      {initialValues && <input type="hidden" name="stockId" value={initialValues.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="quantity" className={labelClass}>
            Menge
          </label>
          <input
            type="number"
            name="quantity"
            id="quantity"
            required
            min={1}
            step={1}
            defaultValue={initialValues?.quantity ?? 1}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="purchaseDate" className={labelClass}>
            Kaufdatum
          </label>
          <input
            type="date"
            name="purchaseDate"
            id="purchaseDate"
            defaultValue={initialValues?.purchaseDate ?? today}
            className={`${inputClass} dark:[color-scheme:dark]`}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="price" className={labelClass}>
            Preis gesamt (Optional)
          </label>
          <input
            type="number"
            name="price"
            id="price"
            min={0}
            step="0.01"
            placeholder="0.00"
            defaultValue={initialValues?.price ?? ""}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="currency" className={labelClass}>
            Währung
          </label>
          <select
            name="currency"
            id="currency"
            defaultValue={initialValues?.currency ?? DEFAULT_CURRENCY_CODE}
            className={inputClass}
          >
            {AVAILABLE_CURRENCY_PRESETS.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <StorageLocationPickerField
        storageLocations={storageLocations}
        initialLocationId={initialValues?.storageLocationId}
      />

      <div className="space-y-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notizen (Optional)
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={2}
          placeholder="z.B. Kauf bei Motorradteile Meyer"
          defaultValue={initialValues?.notes ?? ""}
          className={inputClass}
        />
      </div>

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
