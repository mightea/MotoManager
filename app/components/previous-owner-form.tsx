import { useState } from "react";
import { Form } from "react-router";
import clsx from "clsx";
import type { PreviousOwner } from "~/types/db";
import { previousOwnerSchema } from "~/validations";

interface PreviousOwnerFormProps {
  initialValues?: PreviousOwner | null;
  motorcycleId: number;
  intent: "createPreviousOwner" | "updatePreviousOwner";
  onSubmit?: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  errors?: Record<string, string>;
}

export function PreviousOwnerForm({
  initialValues,
  motorcycleId,
  intent,
  onSubmit,
  onCancel,
  onDelete,
  errors: serverErrors,
}: PreviousOwnerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = { ...serverErrors, ...localErrors };

  return (
    <Form
      method="post"
      className="space-y-4"
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        const validationResult = previousOwnerSchema.safeParse(data);

        if (!validationResult.success) {
          e.preventDefault();
          const errors = validationResult.error.flatten().fieldErrors;
          const formattedErrors: Record<string, string> = {};
          for (const key in errors) {
            const fieldErrors = errors[key as keyof typeof errors];
            if (fieldErrors && fieldErrors.length > 0) {
              formattedErrors[key] = fieldErrors[0];
            }
          }
          setLocalErrors(formattedErrors);
          return;
        }

        setLocalErrors({});
        setIsSubmitting(true);
        onSubmit?.();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="motorcycleId" value={motorcycleId} />
      {initialValues?.id && <input type="hidden" name="ownerId" value={initialValues.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium text-foreground dark:text-gray-200">
            Vorname
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={initialValues?.name}
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none dark:bg-navy-900 dark:text-white",
              errors?.name
                ? "border-red-500 focus:border-red-500"
                : "border-gray-200 dark:border-navy-600 focus:border-primary"
            )}
          />
          {errors?.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="surname" className="text-sm font-medium text-foreground dark:text-gray-200">
            Nachname
          </label>
          <input
            type="text"
            id="surname"
            name="surname"
            defaultValue={initialValues?.surname}
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none dark:bg-navy-900 dark:text-white",
              errors?.surname
                ? "border-red-500 focus:border-red-500"
                : "border-gray-200 dark:border-navy-600 focus:border-primary"
            )}
          />
          {errors?.surname && <p className="text-xs text-red-500">{errors.surname}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="purchaseDate" className="text-sm font-medium text-foreground dark:text-gray-200">
          Kaufdatum (Jahr oder volles Datum)
        </label>
        <input
          type="text"
          id="purchaseDate"
          name="purchaseDate"
          defaultValue={initialValues?.purchaseDate}
          placeholder="z.B. 2020 oder 01.05.2020"
          className={clsx(
            "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none dark:bg-navy-900 dark:text-white",
            errors?.purchaseDate
              ? "border-red-500 focus:border-red-500"
              : "border-gray-200 dark:border-navy-600 focus:border-primary"
          )}
        />
        {errors?.purchaseDate && <p className="text-xs text-red-500">{errors.purchaseDate}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-medium text-foreground dark:text-gray-200">
          Adresse (optional)
        </label>
        <input
          type="text"
          id="address"
          name="address"
          defaultValue={initialValues?.address ?? ""}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <label htmlFor="postcode" className="text-sm font-medium text-foreground dark:text-gray-200">
            PLZ
          </label>
          <input
            type="text"
            id="postcode"
            name="postcode"
            defaultValue={initialValues?.postcode ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="city" className="text-sm font-medium text-foreground dark:text-gray-200">
            Ort
          </label>
          <input
            type="text"
            id="city"
            name="city"
            defaultValue={initialValues?.city ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="country" className="text-sm font-medium text-foreground dark:text-gray-200">
          Land
        </label>
        <input
          type="text"
          id="country"
          name="country"
          defaultValue={initialValues?.country ?? ""}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="phoneNumber" className="text-sm font-medium text-foreground dark:text-gray-200">
            Telefon
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            defaultValue={initialValues?.phoneNumber ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-foreground dark:text-gray-200">
            E-Mail
          </label>
          <input
            type="email"
            id="email"
            name="email"
            defaultValue={initialValues?.email ?? ""}
            className={clsx(
              "w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none dark:bg-navy-900 dark:text-white",
              errors?.email
                ? "border-red-500 focus:border-red-500"
                : "border-gray-200 dark:border-navy-600 focus:border-primary"
            )}
          />
          {errors?.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="comments" className="text-sm font-medium text-foreground dark:text-gray-200">
          Bemerkungen
        </label>
        <textarea
          id="comments"
          name="comments"
          defaultValue={initialValues?.comments ?? ""}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white"
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
        {onDelete && initialValues && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 sm:w-auto"
          >
            Löschen
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-gray-50 dark:border-navy-600 dark:text-navy-200 dark:hover:bg-navy-700 sm:w-auto"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Speichern..." : "Speichern"}
        </button>
      </div>
    </Form>
  );
}
