import { useState } from "react";
import { Form } from "react-router";
import type { MaintenanceRecord, MaintenanceType, Location, CurrencySetting } from "~/db/schema";
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
    MapPin
} from "lucide-react";

interface MaintenanceFormProps {
    motorcycleId: number;
    initialData?: MaintenanceRecord | null;
    currencyCode?: string | null;
    defaultOdo?: number | null;
    userLocations?: Location[];
    currencies?: CurrencySetting[];
    onSubmit: () => void;
    onCancel: () => void;
    onDelete?: () => void;
}

const maintenanceTypes: { value: MaintenanceType; label: string; icon: any }[] = [
    { value: "tire", label: "Reifenwechsel", icon: CircleDashed },
    { value: "service", label: "Service", icon: ClipboardList },
    { value: "repair", label: "Reparatur", icon: Hammer },
    { value: "inspection", label: "MFK", icon: ClipboardCheck },
    { value: "fluid", label: "Flüssigkeit", icon: Droplet },
    { value: "chain", label: "Kette", icon: Link },
    { value: "brakepad", label: "Bremsbeläge", icon: Layers },
    { value: "brakerotor", label: "Bremsscheibe", icon: Disc },
    { value: "battery", label: "Batterie", icon: Battery },
    { value: "location", label: "Standort", icon: MapPin },
    { value: "general", label: "Allgemein", icon: Wrench },
];



export function MaintenanceForm({ motorcycleId, initialData, currencyCode, defaultOdo, userLocations, currencies = [], onSubmit, onCancel, onDelete }: MaintenanceFormProps) {
    const [type, setType] = useState<MaintenanceType>(initialData?.type || "service");
    const [isNewLocation, setIsNewLocation] = useState(false);

    // Fallback if no currencies provided


    const today = new Date().toISOString().split('T')[0];

    return (
        <Form method="post" className="space-y-6" onSubmit={onSubmit}>
            <input type="hidden" name="intent" value={initialData ? "updateMaintenance" : "createMaintenance"} />
            {initialData && <input type="hidden" name="maintenanceId" value={initialData.id} />}
            <input type="hidden" name="motorcycleId" value={motorcycleId} />

            {/* Type Selection */}
            <div className="space-y-1.5">
                <label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Wartungstyp</label>
                <select
                    name="type"
                    id="type"
                    value={type}
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

                {type !== "location" && (
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
                                {currencies?.map((c) => (
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

                {/* Conditional Fields based on Type */}

                {/* Location Specifics */}
                {type === "location" && (
                    <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Standort</label>
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

                {/* Generic Brand/Model */}
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
                                <option value="driveshaftoil">Kardanwellenöl</option>
                                <option value="forkoil">Gabelöl</option>
                                <option value="breakfluid">Bremsflüssigkeit</option>
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
    );
}
