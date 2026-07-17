import { useState } from "react";
import { Form, useNavigation } from "react-router";
import clsx from "clsx";
import { Button } from "./button";
import type { MaintenanceRecord, MaintenanceType, Location, LocationType, CurrencySetting, BrakeType, TirePosition, FluidType, DriveType } from "~/types/db";
import { fluidTypeLabels, tirePositionLabels } from "~/utils/maintenance";
import type { Part } from "~/types/parts";
import {
    Wrench,
    Battery,
    Disc,
    Droplet,
    Link,
    ClipboardCheck,
    Hammer,
    CircleDashed,
    ClipboardList,
    MapPin,
    Fuel
} from "lucide-react";
import { useUmami } from "./umami-provider";
import { getSessionToken } from "~/services/auth";
import { getNearbyLocations } from "~/services/settings";
import { createReverseGeocoder } from "~/utils/reverse-geocode";

/** The motorcycle's per-wheel brake config, used to filter brake options. */
export interface BrakeConfig {
    hasSidecar: boolean;
    front: BrakeType | null;
    rear: BrakeType | null;
    sidecar: BrakeType | null;
}

interface MaintenanceFormProps {
    motorcycleId: number;
    initialData?: MaintenanceRecord | null;
    currencyCode?: string | null;
    defaultOdo?: number | null;
    userLocations?: Location[];
    currencies?: CurrencySetting[];
    /** Parts with positive on-hand, offered as "Verwendete Teile" on create. */
    availableParts?: Part[];
    /** Per-wheel brake config; drives which brake jobs/positions are offered. */
    brakeConfig?: BrakeConfig;
    /** Drivetrain; filters chain- vs shaft-drive options. null = show all. */
    driveType?: DriveType | null;
    onCancel: () => void;
    onDelete?: () => void;
    existingBundledItems?: string[];
}

/**
 * Brake positions offered for a config: front/rear always exist; sidecar only
 * when it's a rig with a configured sidecar brake. Each carries the wheel's
 * disc/drum type (null when unconfigured → generic disc wording).
 */
function brakePositions(cfg?: BrakeConfig): { value: TirePosition; brakeType: BrakeType | null }[] {
    const positions: { value: TirePosition; brakeType: BrakeType | null }[] = [
        { value: "front", brakeType: cfg?.front ?? null },
        { value: "rear", brakeType: cfg?.rear ?? null },
    ];
    if (cfg?.hasSidecar && cfg?.sidecar) {
        positions.push({ value: "sidecar", brakeType: cfg.sidecar });
    }
    return positions;
}

/** Fluids that only exist on a shaft drive (hidden for chain-drive bikes). */
const SHAFT_ONLY_FLUIDS: FluidType[] = ["finaldriveoil", "finaldrivegearboxoil"];

/** A chain-drive bike has no Kardanöl / Hinterachsgetriebeöl. */
function isFluidHiddenByDrive(fluidType: string, driveType?: DriveType | null): boolean {
    return driveType === "chain" && SHAFT_ONLY_FLUIDS.includes(fluidType as FluidType);
}

/** A shaft-drive bike has no chain to service. */
function isChainHiddenByDrive(driveType?: DriveType | null): boolean {
    return driveType === "shaft";
}

const EMPTY_CURRENCIES: CurrencySetting[] = [];
const EMPTY_BUNDLED_ITEMS: string[] = [];
const EMPTY_LOCATIONS: Location[] = [];
const EMPTY_PARTS: Part[] = [];

interface UsedPartEntry {
    partId: number;
    quantity: number;
}

interface LocationPickerFieldProps {
    userLocations: Location[];
    locationType: LocationType;
    initialLocationId: number | null;
    label: string;
    selectPlaceholder: string;
    newPlaceholder: string;
    /**
     * Enables the "near me" geolocation flow: picks up the current position,
     * queries nearby locations of `locationType`, and either selects the nearest
     * match or falls back to creating a new one (name reverse-geocoded,
     * coordinates captured in hidden inputs). Used for fuel stations.
     */
    enableNearMe?: boolean;
    /** Button label for the near-me action (e.g. "Tankstelle in der Nähe"). */
    nearMeLabel?: string;
}

function LocationPickerField({
    userLocations,
    locationType,
    initialLocationId,
    label,
    selectPlaceholder,
    newPlaceholder,
    enableNearMe = false,
    nearMeLabel = "In der Nähe",
}: LocationPickerFieldProps) {
    const options = userLocations.filter(l => l.type === locationType);
    const hasOptions = options.length > 0;
    const [isNewLocation, setIsNewLocation] = useState(!hasOptions);
    const [locationId, setLocationId] = useState<string>(
        initialLocationId != null ? String(initialLocationId) : "",
    );
    const [newName, setNewName] = useState("");
    // Coordinates captured from the near-me flow; only submitted when creating a
    // brand-new station so the backend can persist them.
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [nearInfo, setNearInfo] = useState<string | null>(null);

    const handleNearMe = () => {
        if (!navigator.geolocation) {
            setGeoError("Geolokalisierung wird nicht unterstützt.");
            return;
        }
        setIsLocating(true);
        setGeoError(null);
        setNearInfo(null);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                try {
                    const token = getSessionToken();
                    if (!token) {
                        setGeoError("Nicht angemeldet.");
                        return;
                    }
                    const nearby = await getNearbyLocations(token, {
                        lat: latitude,
                        lon: longitude,
                        radius: 250,
                        type: locationType,
                    });
                    if (nearby.length > 0) {
                        // Response is nearest-first — take the closest match.
                        const nearest = nearby[0];
                        setIsNewLocation(false);
                        setLocationId(String(nearest.id));
                        setCoords(null);
                        setNearInfo(`Erkannt: ${nearest.name}`);
                    } else {
                        // Nothing known nearby → new-station mode, name reverse-
                        // geocoded and coordinates captured for submission.
                        setCoords({ latitude, longitude });
                        setLocationId("");
                        setIsNewLocation(true);
                        const reverseGeocode = createReverseGeocoder();
                        const name = await reverseGeocode(latitude, longitude);
                        if (name) setNewName(name);
                        setNearInfo("Keine bekannte in der Nähe – neuer Eintrag wird erstellt.");
                    }
                } catch {
                    setGeoError("In der Nähe konnte nichts geladen werden.");
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                setGeoError(error.message || "Standort konnte nicht ermittelt werden.");
                setIsLocating(false);
            },
        );
    };

    return (
        <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor="locationId" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
                    {label}
                </label>
                {enableNearMe && (
                    <button
                        type="button"
                        onClick={handleNearMe}
                        disabled={isLocating}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-navy-600 dark:hover:bg-navy-800"
                    >
                        <MapPin className="h-3.5 w-3.5" />
                        {isLocating ? "Ortet..." : nearMeLabel}
                    </button>
                )}
            </div>
            <div className="space-y-2">
                {!isNewLocation && hasOptions ? (
                    <div className="flex gap-2">
                        <select
                            name="locationId"
                            id="locationId"
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                        >
                            <option value="" disabled>{selectPlaceholder}</option>
                            {options.map(loc => (
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
                            placeholder={newPlaceholder}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                        />
                        {hasOptions && (
                            <button
                                type="button"
                                onClick={() => { setIsNewLocation(false); setCoords(null); }}
                                className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-800"
                            >
                                Abbrechen
                            </button>
                        )}
                    </div>
                )}
                {isNewLocation && coords && (
                    <>
                        <input type="hidden" name="newLocationLatitude" value={coords.latitude} />
                        <input type="hidden" name="newLocationLongitude" value={coords.longitude} />
                    </>
                )}
                {nearInfo && (
                    <p className="text-xs text-secondary/80 dark:text-navy-400">{nearInfo}</p>
                )}
                {geoError && (
                    <p className="text-xs text-error">{geoError}</p>
                )}
            </div>
        </div>
    );
}

// UI-only "brake" groups the brakepad/brakerotor record types behind a
// position + component picker; the real type is resolved on submit.
type FormType = MaintenanceType | "brake";

const maintenanceTypes: { value: FormType; label: string; icon: any }[] = [
    { value: "tire", label: "Reifenwechsel", icon: CircleDashed },
    { value: "service", label: "Service", icon: ClipboardList },
    { value: "repair", label: "Reparatur", icon: Hammer },
    { value: "inspection", label: "MFK", icon: ClipboardCheck },
    { value: "fuel", label: "Tanken", icon: Fuel },
    { value: "fluid", label: "Flüssigkeit", icon: Droplet },
    { value: "chain", label: "Kette", icon: Link },
    { value: "brake", label: "Bremse", icon: Disc },
    { value: "battery", label: "Batterie", icon: Battery },
    { value: "location", label: "Standort", icon: MapPin },
    { value: "general", label: "Allgemein", icon: Wrench },
];



export function MaintenanceForm({
    motorcycleId,
    initialData,
    currencyCode,
    defaultOdo,
    userLocations = EMPTY_LOCATIONS,
    currencies = EMPTY_CURRENCIES,
    availableParts = EMPTY_PARTS,
    brakeConfig,
    driveType,
    onCancel,
    onDelete,
    existingBundledItems = EMPTY_BUNDLED_ITEMS
}: MaintenanceFormProps) {
    const { trackEvent } = useUmami();
    const navigation = useNavigation();
    const pendingIntent = navigation.formData?.get("intent");
    const isSubmitting =
        navigation.state === "submitting" &&
        (pendingIntent === "createMaintenance" || pendingIntent === "updateMaintenance");
    // A stored brakepad/brakerotor record maps back to the UI-only "brake" type.
    const initialIsBrake = initialData?.type === "brakepad" || initialData?.type === "brakerotor";
    const [type, setType] = useState<FormType>(
        initialIsBrake ? "brake" : (initialData?.type || "fuel"),
    );

    const positions = brakePositions(brakeConfig);
    const [brakeComponent, setBrakeComponent] = useState<"brakepad" | "brakerotor">(
        initialData?.type === "brakerotor" ? "brakerotor" : "brakepad",
    );
    const [brakePosition, setBrakePosition] = useState<TirePosition>(
        (initialIsBrake && (initialData?.tirePosition as TirePosition)) || positions[0].value,
    );
    const activeBrakeType =
        positions.find((p) => p.value === brakePosition)?.brakeType ?? null;
    // Drum brakes have no separate disc/rotor, so only the friction part
    // ("Bremsbeläge") is offered; disc (and unconfigured) also offer the disc.
    const brakeComponentOptions: { value: "brakepad" | "brakerotor"; label: string }[] =
        activeBrakeType === "drum"
            ? [{ value: "brakepad", label: "Bremsbeläge" }]
            : [
                { value: "brakepad", label: "Bremsbeläge" },
                { value: "brakerotor", label: "Bremsscheibe" },
            ];
    // Fall back to the friction part when the selected component isn't offered
    // for this position (e.g. switching to a drum wheel while "Bremsscheibe" was
    // selected), so we never submit a rotor for a drum brake.
    const effectiveBrakeComponent = brakeComponentOptions.some((o) => o.value === brakeComponent)
        ? brakeComponent
        : brakeComponentOptions[0].value;
    // The record type actually submitted: brakepad/brakerotor for a brake entry.
    const submittedType: MaintenanceType = type === "brake" ? effectiveBrakeComponent : type;

    // Drivetrain filtering. An option the edited record already uses stays
    // visible, so editing a legacy entry never hides its current value.
    const visibleTypes = maintenanceTypes.filter(
        (t) => t.value !== "chain" || !isChainHiddenByDrive(driveType) || initialData?.type === "chain",
    );
    const visibleFluidTypes = (Object.keys(fluidTypeLabels) as FluidType[]).filter(
        (ft) => !isFluidHiddenByDrive(ft, driveType) || initialData?.fluidType === ft,
    );

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

    const today = new Date().toISOString().split('T')[0];

    // Parts consumed by this entry (create-only; existing consumptions are
    // managed on the Teile page). Serialized as a JSON hidden field.
    const [usedParts, setUsedParts] = useState<UsedPartEntry[]>([]);
    const showUsedParts =
        !initialData && availableParts.length > 0 && type !== "fuel" && type !== "location";
    const unusedParts = availableParts.filter(
        (part) => !usedParts.some((entry) => entry.partId === part.id),
    );

    const setUsedPartQuantity = (partId: number, quantity: number) => {
        setUsedParts((current) =>
            current.map((entry) => (entry.partId === partId ? { ...entry, quantity } : entry)),
        );
    };

    // The dialog stays open while the action runs; the route closes it on success.
    const handleFormSubmit = () => {
        trackEvent("maintenance_submit", {
            type,
            action: initialData ? "update" : "create"
        });
    };

    return (
        <>
        <Form method="post" className="space-y-6" onSubmit={handleFormSubmit}>
            <input type="hidden" name="intent" value={initialData ? "updateMaintenance" : "createMaintenance"} />
            {initialData && <input type="hidden" name="maintenanceId" value={initialData.id} />}
                        <input type="hidden" name="motorcycleId" value={motorcycleId} />
             
                         {/* Type Selection — the select is UI-only; the record
                             type actually submitted is `submittedType` (brake →
                             brakepad/brakerotor). */}
                         <input type="hidden" name="type" value={submittedType} />
                         <div className="space-y-1.5">
                             <label htmlFor="type" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Typ</label>
                             <select
                                 id="type"                    value={type}
                    onChange={(e) => setType(e.target.value as FormType)}
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                >
                    {visibleTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {/* Common Fields */}
                <div className="space-y-1.5">
                    <label htmlFor="date" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Datum</label>
                    <input
                        suppressHydrationWarning
                        type="date"
                        name="date"
                        id="date"
                        required
                        defaultValue={initialData?.date || today}
                        className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="odo" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Kilometerstand</label>
                    <input
                        type="number"
                        name="odo"
                        id="odo"
                        required
                        defaultValue={initialData?.odo ?? defaultOdo ?? ""}
                        className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                    />
                </div>

                {type !== "location" && type !== "fuel" && (
                    <div className="space-y-1.5">
                        <label htmlFor="cost" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Kosten</label>
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
                        <label htmlFor="cost" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Gesamtkosten</label>
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

                {/* Brake position + component — options derived from the bike's
                    per-wheel brake config. */}
                {type === "brake" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="brakePosition" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Position</label>
                            <select
                                name="tirePosition"
                                id="brakePosition"
                                value={brakePosition}
                                onChange={(e) => setBrakePosition(e.target.value as TirePosition)}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                            >
                                {positions.map((p) => (
                                    <option key={p.value} value={p.value}>{tirePositionLabels[p.value]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="brakeComponent" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Bauteil</label>
                            <select
                                id="brakeComponent"
                                value={effectiveBrakeComponent}
                                onChange={(e) => setBrakeComponent(e.target.value as "brakepad" | "brakerotor")}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                            >
                                {brakeComponentOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {/* Brand/Model - Show for technical types */}
                {(["tire", "battery", "fluid", "chain", "brake"].includes(type)) && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="brand" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Marke / Hersteller</label>
                            <input
                                type="text"
                                name="brand"
                                id="brand"
                                placeholder={type === "tire" ? "z.B. Michelin" : "Hersteller..."}
                                defaultValue={initialData?.brand || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="model" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Modell / Typ</label>
                            <input
                                type="text"
                                name="model"
                                id="model"
                                placeholder={type === "tire" ? "z.B. Road 6" : "Modellbezeichnung..."}
                                defaultValue={initialData?.model || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {type === "service" && (
                    <>
                        <LocationPickerField
                            userLocations={userLocations}
                            locationType="maintenanceShop"
                            initialLocationId={initialData?.locationId ?? null}
                            label="Werkstatt / Ort"
                            selectPlaceholder="Wähle eine Werkstatt..."
                            newPlaceholder="Neuer Betrieb (z.B. Werkstatt Müller)"
                        />
                        <div className="space-y-3 sm:col-span-2">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400 block">
                                Ausgeführte Arbeiten (werden als separate Einträge erfasst)
                            </span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    ...(Object.keys(fluidTypeLabels) as FluidType[])
                                        .filter((ft) => !isFluidHiddenByDrive(ft, driveType) || existingBundledItems.includes(ft))
                                        .map((value) => ({ value, label: fluidTypeLabels[value] })),
                                    ...(!isChainHiddenByDrive(driveType) || existingBundledItems.includes("chain")
                                        ? [{ value: "chain", label: "Kette reinigen/fetten" }]
                                        : []),
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
                    </>
                )}

                {/* Conditional Fields based on Type */}

                {/* Location Specifics */}
                {type === "location" && (
                    <LocationPickerField
                        userLocations={userLocations}
                        locationType="storage"
                        initialLocationId={initialData?.locationId ?? null}
                        label="Standort"
                        selectPlaceholder="Wähle einen Standort..."
                        newPlaceholder="Neuer Standort (z.B. Garage)"
                    />
                )}

                {/* Tire Specifics */}
                {type === "tire" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="tirePosition" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Position</label>
                            <select
                                name="tirePosition"
                                id="tirePosition"
                                defaultValue={initialData?.tirePosition || "rear"}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="front">Vorne</option>
                                <option value="rear">Hinten</option>
                                <option value="sidecar">Beiwagen</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="tireSize" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Grösse</label>
                            <input
                                type="text"
                                name="tireSize"
                                id="tireSize"
                                placeholder="z.B. 180/55 ZR 17"
                                defaultValue={initialData?.tireSize || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="dotCode" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">DOT Code</label>
                            <input
                                type="text"
                                name="dotCode"
                                id="dotCode"
                                placeholder="z.B. 4223"
                                defaultValue={initialData?.dotCode || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {/* Fluid Specifics */}
                {type === "fluid" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="fluidType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Art</label>
                            <select
                                name="fluidType"
                                id="fluidType"
                                defaultValue={initialData?.fluidType || "engineoil"}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                {visibleFluidTypes.map((value) => (
                                    <option key={value} value={value}>{fluidTypeLabels[value]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="oilType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Öl-Typ</label>
                            <select
                                name="oilType"
                                id="oilType"
                                defaultValue={initialData?.oilType || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="">Keine Angabe</option>
                                <option value="synthetic">Synthetisch</option>
                                <option value="semi-synthetic">Teilsynthetisch</option>
                                <option value="mineral">Mineralisch</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="viscosity" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Viskosität</label>
                            <input
                                type="text"
                                name="viscosity"
                                id="viscosity"
                                placeholder="z.B. 10W-40"
                                defaultValue={initialData?.viscosity || ""}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                    </>
                )}

                {/* Battery Specifics */}
                {type === "battery" && (
                    <div className="space-y-1.5">
                        <label htmlFor="batteryType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Batterietyp</label>
                        <select
                            name="batteryType"
                            id="batteryType"
                            defaultValue={initialData?.batteryType || "lead-acid"}
                            className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
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
                    <LocationPickerField
                        userLocations={userLocations}
                        locationType="inspection"
                        initialLocationId={initialData?.locationId ?? null}
                        label="Prüfstelle"
                        selectPlaceholder="Wähle eine Prüfstelle..."
                        newPlaceholder="Neue Prüfstelle (z.B. STVA Zürich)"
                    />
                )}

                {/* Fuel Specifics */}
                {type === "fuel" && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor="fuelType" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Kraftstoffart</label>
                            <select
                                name="fuelType"
                                id="fuelType"
                                defaultValue={initialData?.fuelType || "95E10"}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            >
                                <option value="95E10">Bleifrei 95</option>
                                <option value="98E5">Super Plus</option>
                                <option value="Diesel">Diesel</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="fuelAmount" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Menge (Liter)</label>
                            <input
                                type="number"
                                name="fuelAmount"
                                id="fuelAmount"
                                step="0.01"
                                placeholder="0.00"
                                value={fuelAmount}
                                onChange={(e) => handleFuelAmountChange(e.target.value)}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="pricePerUnit" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Preis pro Liter</label>
                            <input
                                type="number"
                                name="pricePerUnit"
                                id="pricePerUnit"
                                step="0.001"
                                placeholder="0.000"
                                value={pricePerUnit}
                                onChange={(e) => handlePricePerUnitChange(e.target.value)}
                                className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                            />
                        </div>
                        <LocationPickerField
                            userLocations={userLocations}
                            locationType="fuelStation"
                            initialLocationId={initialData?.locationId ?? null}
                            label="Tankstelle"
                            selectPlaceholder="Wähle eine Tankstelle..."
                            newPlaceholder="Neue Tankstelle (z.B. Shell Zürich)"
                            enableNearMe
                            nearMeLabel="Tankstelle in der Nähe"
                        />
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="fuelAdditiveAdded"
                                    id="fuelAdditiveAdded"
                                    value="true"
                                    defaultChecked={Boolean(initialData?.fuelAdditiveAdded)}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary" />
                                <label htmlFor="fuelAdditiveAdded" className="text-sm font-medium text-foreground dark:text-white">
                                    Additiv zugegeben
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="leadSubstituteAdded"
                                    id="leadSubstituteAdded"
                                    value="true"
                                    defaultChecked={Boolean(initialData?.leadSubstituteAdded)}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary" />
                                <label htmlFor="leadSubstituteAdded" className="text-sm font-medium text-foreground dark:text-white">
                                    Bleiersatz zugegeben
                                </label>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="description" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">Beschreibung</label>
                <textarea
                    name="description"
                    id="description"
                    rows={4}
                    placeholder="Optionale Notizen..."
                    defaultValue={initialData?.description || ""}
                    className="block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
                />
            </div>

            {showUsedParts && (
                <div className="space-y-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
                        Verwendete Teile
                    </span>
                    <input type="hidden" name="usedParts" value={JSON.stringify(usedParts)} />
                    {usedParts.map((entry) => {
                        const part = availableParts.find((candidate) => candidate.id === entry.partId);
                        if (!part) return null;
                        return (
                            <div key={entry.partId} className="flex items-center gap-2">
                                <div className="min-w-0 flex-1 rounded-sm border border-base-300 bg-base-100 p-3 text-sm dark:border-navy-700 dark:bg-navy-900">
                                    <p className="truncate text-base-content dark:text-white">{part.name}</p>
                                    <p className="truncate font-mono text-[10px] text-base-content/55">
                                        {part.partNumber} · {part.onHand} auf Lager
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    max={part.onHand}
                                    step={1}
                                    value={entry.quantity}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        if (Number.isInteger(value) && value >= 1) {
                                            setUsedPartQuantity(entry.partId, Math.min(value, part.onHand));
                                        }
                                    }}
                                    aria-label={`Menge für ${part.name}`}
                                    className="w-20 rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setUsedParts((current) =>
                                            current.filter((candidate) => candidate.partId !== entry.partId),
                                        )
                                    }
                                    aria-label={`${part.name} entfernen`}
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-base-content/15 text-base-content/55 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                    {unusedParts.length > 0 && (
                        <select
                            value=""
                            onChange={(event) => {
                                const partId = Number(event.target.value);
                                if (Number.isFinite(partId) && partId > 0) {
                                    setUsedParts((current) => [...current, { partId, quantity: 1 }]);
                                }
                            }}
                            aria-label="Teil hinzufügen"
                            className="block w-full rounded-sm border border-dashed border-base-300 bg-base-100 p-3 text-sm text-base-content/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300"
                        >
                            <option value="">+ Teil aus dem Bestand hinzufügen …</option>
                            {unusedParts.map((part) => (
                                <option key={part.id} value={part.id}>
                                    {part.name} ({part.partNumber}) — {part.onHand} auf Lager
                                </option>
                            ))}
                        </select>
                    )}
                    <p className="text-xs text-base-content/55">
                        Verbrauchte Teile werden vom Bestand abgezogen und mit diesem Eintrag verknüpft.
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between pt-2">
                {initialData && onDelete ? (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onDelete}
                        disabled={isSubmitting}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        Löschen
                    </Button>
                ) : (
                    <div></div>
                )}
                <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                        Abbrechen
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        {initialData ? "Aktualisieren" : "Erstellen"}
                    </Button>
                </div>
            </div>
        </Form>
    </>
    );
}
