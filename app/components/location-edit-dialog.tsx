import { useEffect, useState } from "react";
import { Form, useSubmit } from "react-router";
import { MapPin, Trash2, X } from "lucide-react";
import { Modal } from "./modal";
import { MapPicker } from "./map-picker";
import { Button } from "./button";
import type { Location, LocationType } from "~/types/db";

interface LocationEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, the dialog is in edit mode. When null, it's a create form. */
  location: Location | null;
  /** Initial type for the create form (ignored in edit mode). */
  defaultType?: LocationType;
}

const TYPE_LABELS: Record<LocationType, string> = {
  storage: "Garage / Lager",
  maintenanceShop: "Werkstatt",
  fuelStation: "Tankstelle",
  inspection: "Prüfstelle",
  other: "Sonstige",
};

export function LocationEditDialog({ isOpen, onClose, location, defaultType }: LocationEditDialogProps) {
  const isEdit = location !== null;
  const submit = useSubmit();
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType>("fuelStation");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!location) return;
    if (!confirm(`Standort "${location.name}" wirklich löschen?`)) return;
    const fd = new FormData();
    fd.set("intent", "deleteLocation");
    fd.set("id", String(location.id));
    submit(fd, { method: "post" });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (location) {
      setName(location.name);
      setType(location.type);
      setLat(location.latitude);
      setLng(location.longitude);
    } else {
      setName("");
      setType(defaultType ?? "fuelStation");
      setLat(null);
      setLng(null);
    }
    setGeoError(null);
  }, [isOpen, location, defaultType]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolokalisierung wird nicht unterstützt.");
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        setGeoError(error.message || "Standort konnte nicht ermittelt werden.");
        setIsLocating(false);
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Standort bearbeiten" : "Neuer Standort"}
      description={isEdit ? "Name, Typ und Koordinaten anpassen." : "Erfasse einen neuen Standort mit Typ und optionalen Koordinaten."}
    >
      <Form method="post" className="space-y-6" onSubmit={onClose}>
        <input type="hidden" name="intent" value={isEdit ? "updateLocation" : "createLocation"} />
        {isEdit && location && <input type="hidden" name="id" value={location.id} />}
        <input type="hidden" name="latitude" value={lat ?? ""} />
        <input type="hidden" name="longitude" value={lng ?? ""} />

        <div className="space-y-1.5">
          <label htmlFor="locationName" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
            Name
          </label>
          <input
            type="text"
            id="locationName"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="locationType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
            Typ
          </label>
          <select
            id="locationType"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as LocationType)}
            className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
          >
            {(Object.entries(TYPE_LABELS) as [LocationType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
                Koordinaten
              </span>
              <p className="mt-0.5 text-xs text-secondary/80 dark:text-navy-400">
                Klicke auf die Karte, um die Position zu setzen.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleGetLocation}
              disabled={isLocating}
            >
              <MapPin className="mr-1.5 h-4 w-4" />
              {isLocating ? "Ortet..." : "Ort abrufen"}
            </Button>
          </div>

          {isOpen && (
            <div className="relative">
              <MapPicker
                latitude={lat}
                longitude={lng}
                onSelect={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
              />
              {lat !== null && lng !== null && (
                <button
                  type="button"
                  onClick={() => { setLat(null); setLng(null); }}
                  aria-label="Koordinaten entfernen"
                  className="absolute right-2 top-2 z-[400] rounded-full bg-white/90 p-1 text-red-500 shadow-sm hover:bg-white dark:bg-navy-800/90 dark:hover:bg-navy-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="rounded-sm border border-base-300 bg-base-200/40 p-3 font-mono text-xs tabular-nums text-base-content/80 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300">
            {lat !== null && lng !== null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Keine Koordinaten gesetzt"}
          </div>
          {geoError && (
            <p className="text-xs text-error">{geoError}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Löschen
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEdit ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
