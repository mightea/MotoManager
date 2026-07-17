import { Form, useNavigation } from "react-router";
import { Button } from "./button";
import type { MotorcycleDetail } from "~/types/db";

import { Trash2 } from "lucide-react";

interface MotorcycleDetailFormProps {
  motorcycleId: number;
  initialValues?: MotorcycleDetail | null;
  onClose: () => void;
  onDelete?: (detail: MotorcycleDetail) => void;
}

export function MotorcycleDetailForm({
  motorcycleId,
  initialValues,
  onClose,
  onDelete,
}: MotorcycleDetailFormProps) {
  const navigation = useNavigation();
  const pendingIntent = navigation.formData?.get("intent");
  const isSubmitting =
    navigation.state === "submitting" &&
    (pendingIntent === "createDetail" || pendingIntent === "updateDetail");

  return (
    <Form method="post" className="space-y-5">
      <input type="hidden" name="intent" value={initialValues ? "updateDetail" : "createDetail"} />
      <input type="hidden" name="motorcycleId" value={motorcycleId} />
      {initialValues && <input type="hidden" name="detailId" value={initialValues.id} />}

      <div className="space-y-1.5">
        <label htmlFor="title" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Titel
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          placeholder="z.B. Zündkerzen"
          defaultValue={initialValues?.title}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="value" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
          Wert
        </label>
        <input
          type="text"
          name="value"
          id="value"
          required
          placeholder="z.B. NGK BP7ES"
          defaultValue={initialValues?.value}
          className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
        />
      </div>

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
