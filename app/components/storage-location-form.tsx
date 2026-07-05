import { Form, useNavigation } from "react-router";
import { useMemo, useState } from "react";
import { Button } from "./button";
import type { Location } from "~/types/db";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPath } from "~/utils/parts";

interface StorageLocationFormProps {
  locations: StorageLocation[];
  /** Physical places from the locations entity; only garage/workshop types
   *  are offered as anchors for root-level storage locations. */
  places?: Location[];
  initialValues?: StorageLocation | null;
  onClose: () => void;
}

const EMPTY_PLACES: Location[] = [];

const inputClass =
  "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

const labelClass =
  "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

/** Create/edit a part storage location. Root-level entries can anchor to a
 *  workshop/garage place; nested entries inherit the place from their root. */
export function StorageLocationForm({
  locations,
  places = EMPTY_PLACES,
  initialValues,
  onClose,
}: StorageLocationFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [parentValue, setParentValue] = useState(
    initialValues?.parentId != null ? String(initialValues.parentId) : "",
  );

  // Parts live in the garage or workshop — only those place types qualify.
  const anchorPlaces = places.filter(
    (place) => place.type === "storage" || place.type === "maintenanceShop",
  );

  // A location cannot become its own descendant — offer only non-subtree parents.
  const invalidParents = useMemo(() => {
    if (!initialValues) return new Set<number>();
    const invalid = new Set<number>([initialValues.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const location of locations) {
        if (
          location.parentId != null &&
          invalid.has(location.parentId) &&
          !invalid.has(location.id)
        ) {
          invalid.add(location.id);
          changed = true;
        }
      }
    }
    return invalid;
  }, [initialValues, locations]);

  return (
    <Form method="post" className="space-y-5">
      {/* Edit posts to the location's own route, so no id field is needed. */}
      <input
        type="hidden"
        name="intent"
        value={initialValues ? "updateLocation" : "createLocation"}
      />

      <div className="space-y-1.5">
        <label htmlFor="location-name" className={labelClass}>
          Name
        </label>
        <input
          type="text"
          name="name"
          id="location-name"
          required
          placeholder="z.B. Regal A, Kiste 3, Garage"
          defaultValue={initialValues?.name}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="location-parent" className={labelClass}>
          Übergeordneter Lagerort
        </label>
        <select
          name="parentId"
          id="location-parent"
          value={parentValue}
          onChange={(event) => setParentValue(event.target.value)}
          className={inputClass}
        >
          <option value="">Kein (oberste Ebene)</option>
          {locations
            .filter((location) => !invalidParents.has(location.id))
            .map((location) => (
              <option key={location.id} value={location.id}>
                {storageLocationPath(location, locations)}
              </option>
            ))}
        </select>
      </div>

      {parentValue === "" && anchorPlaces.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="location-place" className={labelClass}>
            Standort (Werkstatt / Garage)
          </label>
          <select
            name="placeId"
            id="location-place"
            defaultValue={initialValues?.locationId ?? ""}
            className={inputClass}
          >
            <option value="">Kein Standort</option>
            {anchorPlaces.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-base-content/60">
            Verortet diesen Lagerort physisch — Unterorte erben den Standort automatisch.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
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
