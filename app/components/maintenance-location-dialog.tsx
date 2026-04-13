import { useState } from "react";
import { Modal } from "./modal";
import { MapPin, X } from "lucide-react";
import { MapPicker } from "./map-picker";
import { MapView } from "./map-view";

interface MaintenanceLocationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, lat: number | null, lng: number | null) => void;
}

/**
 * Dialog for adding a new maintenance location.
 * 
 * @param {MaintenanceLocationDialogProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
export function MaintenanceLocationDialog({ isOpen, onClose, onSave }: MaintenanceLocationDialogProps) {
    const [name, setName] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name, lat, lng);
            setName("");
            setLat(null);
            setLng(null);
            onClose();
        }
    };

    const handleGetLocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLat(position.coords.latitude);
                setLng(position.coords.longitude);
                setIsLocating(false);
            },
            (error) => {
                console.error(error);
                setIsLocating(false);
            }
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Neuen Standort hinzufügen"
            description="Erfassen Sie einen neuen Betrieb oder Ort für Servicearbeiten."
        >
            <div className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="modalLocationName" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                        Name des Standorts
                    </label>
                    <input
                        type="text"
                        id="modalLocationName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z.B. Garage, Shell, STVA"
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                    />
                </div>

                <div className="space-y-1.5">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Koordinaten (optional)</span>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm text-secondary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-400">
                            {lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Kein genauer Standort erfasst"}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={isLocating}
                                className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-secondary-dark disabled:opacity-50"
                            >
                                <MapPin className="h-4 w-4" />
                                {isLocating ? "Ortet..." : "Ort abrufen"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMapPickerOpen(true)}
                                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark"
                            >
                                Auf Karte wählen
                            </button>
                        </div>
                    </div>
                </div>

                {lat && lng && (
                    <div className="relative">
                        <MapView 
                            latitude={lat} 
                            longitude={lng} 
                            title="Vorschau Standort" 
                        />
                        <button
                            type="button"
                            onClick={() => { setLat(null); setLng(null); }}
                            className="absolute top-2 right-2 rounded-full bg-white/80 p-1 text-red-500 shadow-sm hover:bg-white dark:bg-navy-800/80 dark:hover:bg-navy-800"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark disabled:opacity-50"
                    >
                        Speichern
                    </button>
                </div>
            </div>

            <MapPicker
                isOpen={isMapPickerOpen}
                onClose={() => setIsMapPickerOpen(false)}
                onSelect={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                }}
                initialLat={lat}
                initialLng={lng}
            />
        </Modal>
    );
}
