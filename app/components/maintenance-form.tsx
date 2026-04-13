import { useState } from "react";
import { Form } from "react-router";
import clsx from "clsx";
import type { MaintenanceRecord, MaintenanceType, Location, CurrencySetting, MaintenanceLocation } from "~/types/db";
import {
    Wrench,
    Battery,
    Disc,
    Droplet,
    Link,
    ClipboardCheck,
    Hammer,
    Layers,
    CircleDashed,
    ClipboardList,
    MapPin,
    Fuel,
    Map
} from "lucide-react";
import { MapPicker } from "./map-picker";
import { MapView } from "./map-view";

interface MaintenanceFormProps {
    motorcycleId: number;
    initialData?: MaintenanceRecord | null;
    currencyCode?: string | null;
    defaultOdo?: number | null;
    userLocations?: Location[];
    maintenanceLocations?: MaintenanceLocation[];
    locationNames?: string[];
    currencies?: CurrencySetting[];
    onSubmit: () => void;
    onCancel: () => void;
    onDelete?: () => void;
    existingBundledItems?: string[];
}

const maintenanceTypes: { value: MaintenanceType; label: string; icon: any }[] = [
    { value: "tire", label: "Reifenwechsel", icon: CircleDashed },
    { value: "service", label: "Service", icon: ClipboardList },
    { value: "repair", label: "Reparatur", icon: Hammer },
    { value: "inspection", label: "MFK", icon: ClipboardCheck },
    { value: "fuel", label: "Tanken", icon: Fuel },
    { value: "fluid", label: "Flüssigkeit", icon: Droplet },
    { value: "chain", label: "Kette", icon: Link },
    { value: "brakepad", label: "Bremsbeläge", icon: Layers },
    { value: "brakerotor", label: "Bremsscheibe", icon: Disc },
    { value: "battery", label: "Batterie", icon: Battery },
    { value: "location", label: "Standort", icon: MapPin },
    { value: "general", label: "Allgemein", icon: Wrench },
];



export function MaintenanceForm({ 
    motorcycleId, 
    initialData, 
    currencyCode, 
    defaultOdo, 
    userLocations, 
    maintenanceLocations = [],
    locationNames = [], 
    currencies = [], 
    onSubmit, 
    onCancel, 
    onDelete,
    existingBundledItems = []
}: MaintenanceFormProps) {
    const [type, setType] = useState<MaintenanceType>(initialData?.type || "fuel");
    const [isNewLocation, setIsNewLocation] = useState(false);
    
    const [isNewMaintenanceLocation, setIsNewMaintenanceLocation] = useState(false);
    
    const [lat, setLat] = useState<number | null>(initialData?.latitude || null);
    const [lng, setLng] = useState<number | null>(initialData?.longitude || null);
    const [isLocating, setIsLocating] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [bundledItems, setBundledItems] = useState<string[]>(existingBundledItems);

    const [fuelAmount, setFuelAmount] = useState<string>(initialData?.fuelAmount?.toString() || "");
    const [pricePerUnit, setPricePerUnit] = useState<string>(initialData?.pricePerUnit?.toString() || "");
    const [totalCost, setTotalCost] = useState<string>(initialData?.cost?.toString() || "");

    const handleFuelAmountChange = (val: string) => {
        setFuelAmount(val);
        const amount = parseFloat(val);
        const price = parseFloat(pricePerUnit);
        if (!isNaN(amount) && !isNaN(price)) {
            setTotalCost((amount * price).toFixed(2));
        }
    };

    const handlePricePerUnitChange = (val: string) => {
        setPricePerUnit(val);
        const amount = parseFloat(fuelAmount);
        const price = parseFloat(val);
        if (!isNaN(amount) && !isNaN(price)) {
            setTotalCost((amount * price).toFixed(2));
        }
    };

    const handleTotalCostChange = (val: string) => {
        setTotalCost(val);
        const cost = parseFloat(val);
        const amount = parseFloat(fuelAmount);
        if (!isNaN(cost) && !isNaN(amount) && amount !== 0) {
            setPricePerUnit((cost / amount).toFixed(3));
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

    const handleMapSelect = (newLat: number, newLng: number) => {
        setLat(newLat);
        setLng(newLng);
    };

    // Fallback if no currencies provided


    const today = new Date().toISOString().split('T')[0];

    const LocationFields = () => (
        <>
            <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="locationName" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">
                    Betrieb / Ort (z.B. Garage, Shell)
                </label>
                <div className="flex gap-2">
                    {!isNewMaintenanceLocation && maintenanceLocations.length > 0 ? (
                        <div className="flex-1 flex gap-2">
                            <select
                                name="locationName"
                                id="locationName"
                                defaultValue={initialData?.locationName || ""}
                                onChange={(e) => {
                                    const loc = maintenanceLocations.find(l => l.name === e.target.value);
                                    if (loc) {
                                        setLat(loc.latitude);
                                        setLng(loc.longitude);
                                    }
                                }}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="" disabled>Wähle einen Betrieb...</option>
                                {maintenanceLocations.map(loc => (
                                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsNewMaintenanceLocation(true)}
                                className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                            >
                                Neu
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                name="locationName"
                                id="locationName"
                                list="location-names"
                                placeholder="Name des Standorts..."
                                defaultValue={initialData?.locationName || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                            <datalist id="location-names">
                                {locationNames.map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                            {maintenanceLocations.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsNewMaintenanceLocation(false)}
                                    className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                                >
                                    Abbrechen
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
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
                            <Map className="h-4 w-4" />
                            Auf Karte wählen
                        </button>
                    </div>
                </div>
                <input type="hidden" name="latitude" value={lat || ""} />
                <input type="hidden" name="longitude" value={lng || ""} />
            </div>

            {lat && lng && (
                <div className="sm:col-span-2">
                    <MapView 
                        latitude={lat} 
                        longitude={lng} 
                        title="Vorschau Standort" 
                    />
                </div>
            )}
        </>
    );

    return (
        <>
        <Form method="post" className="space-y-6" onSubmit={onSubmit}>
            <input type="hidden" name="intent" value={initialData ? "updateMaintenance" : "createMaintenance"} />
            {initialData && <input type="hidden" name="maintenanceId" value={initialData.id} />}
                        <input type="hidden" name="motorcycleId" value={motorcycleId} />
             
                         {/* Type Selection */}
                         <div className="space-y-1.5">
                             <label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Typ</label>
                             <select
                                 name="type"
                                 id="type"                    value={type}
                    onChange={(e) => setType(e.target.value as MaintenanceType)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                >
                    {maintenanceTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {/* Common Fields */}
                <div className="space-y-1.5">
                    <label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Datum</label>
                    <input
                        suppressHydrationWarning
                        type="date"
                        name="date"
                        id="date"
                        required
                        defaultValue={initialData?.date || today}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="odo" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kilometerstand</label>
                    <input
                        type="number"
                        name="odo"
                        id="odo"
                        required
                        defaultValue={initialData?.odo ?? defaultOdo ?? ""}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                    />
                </div>

                {type !== "location" && type !== "fuel" && (
                    <div className="space-y-1.5">
                        <label htmlFor="cost" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kosten</label>
                        <div className="flex rounded-xl shadow-sm">
                            <input
                                type="number"
                                name="cost"
                                id="cost"
                                step="0.05"
                                placeholder="0.00"
                                defaultValue={initialData?.cost || ""}
                                className="block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                            <select
                                name="currency"
                                className="rounded-r-xl border-l-0 border-gray-200 bg-gray-100 p-3 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                                defaultValue={initialData?.currency || currencyCode || "CHF"}
                            >
                                {Array.isArray(currencies) && currencies.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {type === "fuel" && (
                    <div className="space-y-1.5">
                        <label htmlFor="cost" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Gesamtkosten</label>
                        <div className="flex rounded-xl shadow-sm">
                            <input
                                type="number"
                                name="cost"
                                id="cost"
                                step="0.05"
                                placeholder="0.00"
                                value={totalCost}
                                onChange={(e) => handleTotalCostChange(e.target.value)}
                                className="block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                            <select
                                name="currency"
                                className="rounded-r-xl border-l-0 border-gray-200 bg-gray-100 p-3 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                                defaultValue={initialData?.currency || currencyCode || "CHF"}
                            >
                                {Array.isArray(currencies) && currencies.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Beschreibung</label>
                    <input
                        type="text"
                        name="description"
                        id="description"
                        placeholder="Optionale Notizen..."
                        defaultValue={initialData?.description || ""}
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                    />
                </div>

                {/* Brand/Model - Show for technical types */}
                {(["tire", "battery", "fluid", "chain", "brakepad", "brakerotor"].includes(type)) && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="brand" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Marke / Hersteller</label>
                            <input
                                type="text"
                                name="brand"
                                id="brand"
                                placeholder={type === "tire" ? "z.B. Michelin" : "Hersteller..."}
                                defaultValue={initialData?.brand || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="model" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Modell / Typ</label>
                            <input
                                type="text"
                                name="model"
                                id="model"
                                placeholder={type === "tire" ? "z.B. Road 6" : "Modellbezeichnung..."}
                                defaultValue={initialData?.model || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {type === "service" && (
                    <>
                        <div className="space-y-3 sm:col-span-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300 block">
                                Ausgeführte Arbeiten (werden als separate Einträge erfasst)
                            </span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    { value: "engineoil", label: "Motoröl" },
                                    { value: "gearboxoil", label: "Getriebeöl" },
                                    { value: "finaldriveoil", label: "Kardanöl" },
                                    { value: "forkoil", label: "Gabelöl" },
                                    { value: "brakefluid", label: "Bremsflüssigkeit" },
                                    { value: "coolant", label: "Kühlflüssigkeit" },
                                    { value: "chain", label: "Kette reinigen/fetten" },
                                ].map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={clsx(
                                            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                                            bundledItems.includes(opt.value)
                                                ? "border-primary bg-primary/5 dark:border-primary-light/50 dark:bg-primary-light/5"
                                                : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-navy-600 dark:bg-navy-900 dark:hover:bg-navy-800"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={bundledItems.includes(opt.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setBundledItems([...bundledItems, opt.value]);
                                                } else {
                                                    setBundledItems(bundledItems.filter((i) => i !== opt.value));
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-700 dark:ring-offset-navy-900"
                                        />
                                        <span className="text-xs font-semibold text-foreground dark:text-gray-200">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {bundledItems.map((item) => (
                                <input key={item} type="hidden" name="bundledItems[]" value={item} />
                            ))}
                        </div>
                        <LocationFields />
                    </>
                )}

                {/* Conditional Fields based on Type */}

                {/* Location Specifics */}
                {type === "location" && (
                    <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="locationId" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Standort</label>
                        <div className="space-y-2">
                            {!isNewLocation && userLocations && userLocations.length > 0 ? (
                                <div className="flex gap-2">
                                    <select
                                        name="locationId"
                                        id="locationId"
                                        defaultValue={initialData?.locationId || ""}
                                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                                    >
                                        <option value="" disabled>Wähle einen Standort...</option>
                                        {userLocations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewLocation(true)}
                                        className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                                    >
                                        Neu
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        name="newLocationName"
                                        id="newLocationName"
                                        placeholder="Neuer Standort Name (z.B. Garage)"
                                        className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                                    />
                                    {(userLocations && userLocations.length > 0) && (
                                        <button
                                            type="button"
                                            onClick={() => setIsNewLocation(false)}
                                            className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                                        >
                                            Abbrechen
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tire Specifics */}
                {type === "tire" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="tirePosition" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Position</label>
                            <select
                                name="tirePosition"
                                id="tirePosition"
                                defaultValue={initialData?.tirePosition || "rear"}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="front">Vorne</option>
                                <option value="rear">Hinten</option>
                                <option value="sidecar">Beiwagen</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="tireSize" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Grösse</label>
                            <input
                                type="text"
                                name="tireSize"
                                id="tireSize"
                                placeholder="z.B. 180/55 ZR 17"
                                defaultValue={initialData?.tireSize || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="dotCode" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">DOT Code</label>
                            <input
                                type="text"
                                name="dotCode"
                                id="dotCode"
                                placeholder="z.B. 4223"
                                defaultValue={initialData?.dotCode || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {/* Fluid Specifics */}
                {type === "fluid" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="fluidType" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Art</label>
                            <select
                                name="fluidType"
                                id="fluidType"
                                defaultValue={initialData?.fluidType || "engineoil"}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="engineoil">Motoröl</option>
                                <option value="gearboxoil">Getriebeöl</option>
                                <option value="finaldriveoil">Kardanöl</option>
                                <option value="forkoil">Gabelöl</option>
                                <option value="brakefluid">Bremsflüssigkeit</option>
                                <option value="coolant">Kühlflüssigkeit</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="oilType" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Öl-Typ</label>
                            <select
                                name="oilType"
                                id="oilType"
                                defaultValue={initialData?.oilType || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="">Keine Angabe</option>
                                <option value="synthetic">Synthetisch</option>
                                <option value="semi-synthetic">Teilsynthetisch</option>
                                <option value="mineral">Mineralisch</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="viscosity" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Viskosität</label>
                            <input
                                type="text"
                                name="viscosity"
                                id="viscosity"
                                placeholder="z.B. 10W-40"
                                defaultValue={initialData?.viscosity || ""}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {/* Battery Specifics */}
                {type === "battery" && (
                    <div className="space-y-1.5">
                        <label htmlFor="batteryType" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Batterietyp</label>
                        <select
                            name="batteryType"
                            id="batteryType"
                            defaultValue={initialData?.batteryType || "lead-acid"}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                        >
                            <option value="lead-acid">Blei-Säure</option>
                            <option value="gel">Gel</option>
                            <option value="agm">AGM</option>
                            <option value="lithium-ion">Lithium-Ionen</option>
                            <option value="other">Andere</option>
                        </select>
                    </div>
                )}

                {/* Inspection Specifics */}
                {type === "inspection" && (
                    <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="inspectionLocation" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Prüfstelle</label>
                        <input
                            type="text"
                            name="inspectionLocation"
                            id="inspectionLocation"
                            placeholder="z.B. STVA Zürich"
                            defaultValue={initialData?.inspectionLocation || ""}
                            className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                        />
                    </div>
                )}

                {/* Fuel Specifics */}
                {type === "fuel" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="fuelType" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kraftstoffart</label>
                            <select
                                name="fuelType"
                                id="fuelType"
                                defaultValue={initialData?.fuelType || "95E10"}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="95E10">Bleifrei 95</option>
                                <option value="98E5">Super Plus</option>
                                <option value="Diesel">Diesel</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="fuelAmount" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Menge (Liter)</label>
                            <input
                                type="number"
                                name="fuelAmount"
                                id="fuelAmount"
                                step="0.01"
                                placeholder="0.00"
                                value={fuelAmount}
                                onChange={(e) => handleFuelAmountChange(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="pricePerUnit" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Preis pro Liter</label>
                            <input
                                type="number"
                                name="pricePerUnit"
                                id="pricePerUnit"
                                step="0.001"
                                placeholder="0.000"
                                value={pricePerUnit}
                                onChange={(e) => handlePricePerUnitChange(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <LocationFields />
                    </>
                )}
            </div>

            <div className="flex items-center justify-between pt-2">
                {initialData && onDelete ? (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        Löschen
                    </button>
                ) : (
                    <div></div>
                )}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98]"
                    >
                        {initialData ? "Aktualisieren" : "Erstellen"}
                    </button>
                </div>
            </div>
        </Form>

        <MapPicker
            isOpen={isMapPickerOpen}
            onClose={() => setIsMapPickerOpen(false)}
            onSelect={handleMapSelect}
            initialLat={lat}
            initialLng={lng}
        />
    </>
    );
}
