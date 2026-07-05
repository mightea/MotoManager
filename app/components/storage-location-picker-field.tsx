import { useState } from "react";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPath } from "~/utils/parts";

interface StorageLocationPickerFieldProps {
  storageLocations: StorageLocation[];
  initialLocationId?: number | null;
}

const fieldClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const toggleClass =
  "shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800";

/**
 * Lagerort picker following the maintenance form's location pattern: a select
 * with a "Neu" button that swaps it for a free-text input creating the
 * location on save. Posts `storageLocationId` (select mode) or
 * `newStorageLocation` (new mode).
 */
export function StorageLocationPickerField({
  storageLocations,
  initialLocationId,
}: StorageLocationPickerFieldProps) {
  const hasOptions = storageLocations.length > 0;
  const [isNewLocation, setIsNewLocation] = useState(!hasOptions);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={isNewLocation ? "newStorageLocation" : "storageLocationId"}
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
      >
        Lagerort
      </label>
      <div className="space-y-2">
        {!isNewLocation && hasOptions ? (
          <div className="flex gap-2">
            <select
              name="storageLocationId"
              id="storageLocationId"
              defaultValue={initialLocationId ?? ""}
              className={fieldClass}
            >
              <option value="">Kein Lagerort</option>
              {storageLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {storageLocationPath(location, storageLocations)}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setIsNewLocation(true)} className={toggleClass}>
              Neu
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              name="newStorageLocation"
              id="newStorageLocation"
              placeholder="Neuer Lagerort (z.B. Regal A · Kiste 3)"
              className={fieldClass}
            />
            {hasOptions && (
              <button
                type="button"
                onClick={() => setIsNewLocation(false)}
                className={toggleClass}
              >
                Abbrechen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
