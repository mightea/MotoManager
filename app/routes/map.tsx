import { useMemo, useState } from "react";
import { data, Link, useActionData, useLoaderData, useRevalidator } from "react-router";
import {
  Bike,
  CalendarDays,
  Download,
  Globe2,
  Map as MapIcon,
  MapPinOff,
  Wrench,
} from "lucide-react";
import clsx from "clsx";
import type { Route } from "./+types/map";
import { getSessionToken, requireUser } from "~/services/auth";
import { getMapData, resolveCountryCode } from "~/services/map";
import { createLocation, deleteLocation, updateLocation } from "~/services/settings";
import { createDetailedReverseGeocoder } from "~/utils/reverse-geocode";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import {
  ALL_FILTER,
  buildGeoJson,
  buildHeatPoints,
  countryFlag,
  countryName,
  filterCalendar,
  filterLegs,
  filterLocations,
  filterTours,
  formatDate,
  formatDateShort,
  geoJsonFileName,
  LOCATION_TYPE_LABELS,
  locationFuelUnderFilter,
  locationsNeedingCountry,
  motorcycleColorMap,
  round1,
  summarizeYear,
  type HeatWeight,
  type MapFilter,
} from "~/utils/map-analysis";
import { FleetMap, DEFAULT_LAYERS, type MapLayerVisibility } from "~/components/fleet-map";
import { TourCard } from "~/components/tour-card";
import { RidingCalendar } from "~/components/riding-calendar";
import { LocationEditDialog } from "~/components/location-edit-dialog";
import { EmptyState } from "~/components/empty-state";
import { Button } from "~/components/button";
import { useTheme } from "~/components/theme-provider";
import { Td, Th } from "~/components/data-table";
import { toast } from "~/hooks/use-toast";
import type { Location, LocationType } from "~/types/db";
import type { MapLocation, MapPayload, UngeocodedLocation } from "~/types/map";

export function meta() {
  return [
    { title: "Karte - Moto Manager" },
    { name: "description", content: "Alle Standorte, Tankstopps, Etappen und Touren deiner Flotte auf einer Karte." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  const payload = await getMapData(token);
  return data({ payload, userId: user.id });
}

const VALID_LOCATION_TYPES: LocationType[] = ["storage", "maintenanceShop", "fuelStation", "inspection", "other"];

function parseLocationType(raw: FormDataEntryValue | null, fallback: LocationType): LocationType {
  return VALID_LOCATION_TYPES.includes(raw as LocationType) ? (raw as LocationType) : fallback;
}

function parseCoord(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** The location edit dialog posts here with the same intents the settings page understands. */
export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user, token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "createLocation") {
    const name = formData.get("name") as string;
    if (!name) return { error: "Name ist erforderlich." };
    const type = parseLocationType(formData.get("type"), "fuelStation");
    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));
    const countryCode = await resolveCountryCode(latitude, longitude);
    await createLocation(token, { name, type, userId: user.id, latitude, longitude, countryCode });
    return { success: "Standort erstellt." };
  }

  if (intent === "updateLocation") {
    const id = Number(formData.get("id"));
    const name = formData.get("name") as string;
    if (!id || !name) return { error: "Ungültige Daten." };
    const type = parseLocationType(formData.get("type"), "fuelStation");
    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));
    const countryCode = await resolveCountryCode(latitude, longitude);
    await updateLocation(token, id, user.id, { name, type, latitude, longitude, countryCode });
    return { success: "Standort aktualisiert." };
  }

  if (intent === "deleteLocation") {
    const id = Number(formData.get("id"));
    if (!id) return { error: "Ungültige ID." };
    await deleteLocation(token, id, user.id);
    return { success: "Standort gelöscht." };
  }

  return { error: "Unbekannte Aktion." };
}

const HEAT_WEIGHT_LABELS: Record<HeatWeight, string> = { stops: "Stopps", liters: "Liter" };

const LAYER_LABELS: { key: keyof MapLayerVisibility; label: string }[] = [
  { key: "fuelHeat", label: "Tankstopps" },
  { key: "legs", label: "Etappen" },
  { key: "workshops", label: "Werkstätten" },
  { key: "inspections", label: "Prüfstellen" },
  { key: "storage", label: "Garagen" },
  { key: "other", label: "Sonstige" },
];

function toEditableLocation(
  loc: MapLocation | UngeocodedLocation,
  userId: number,
): Location {
  const geo = "latitude" in loc ? loc : null;
  return {
    id: loc.id,
    name: loc.name,
    type: loc.type,
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    countryCode: geo?.countryCode ?? null,
    userId,
    createdAt: "",
    updatedAt: null,
  };
}

export default function MapPage() {
  const { payload, userId } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<typeof clientAction>();
  const hasGeocoded = payload.locations.length > 0;

  if (!hasGeocoded && payload.ungeocoded.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-3 pb-24">
        <EmptyState
          icon={MapIcon}
          title="Noch keine Standorte"
          description="Sobald Tankstopps, Werkstätten oder Garagen mit Koordinaten erfasst sind, erscheinen sie hier auf der Karte."
          action={
            <Link
              to="/settings"
              className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
            >
              Standorte verwalten
              <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
            </Link>
          }
        />
      </div>
    );
  }

  return <MapDashboard payload={payload} userId={userId} actionData={actionData} />;
}

function MapDashboard({
  payload,
  userId,
  actionData,
}: {
  payload: MapPayload;
  userId: number;
  actionData: { success?: string; error?: string } | undefined;
}) {
  const { theme } = useTheme();
  const revalidator = useRevalidator();
  const [filter, setFilter] = useState<MapFilter>(ALL_FILTER);
  const [layers, setLayers] = useState<MapLayerVisibility>(DEFAULT_LAYERS);
  const [heatWeight, setHeatWeight] = useState<HeatWeight>("stops");
  const [editing, setEditing] = useState<Location | null>(null);
  const [backfill, setBackfill] = useState<{ done: number; total: number } | null>(null);

  const mode = theme === "dark" ? "dark" : "light";
  const colors = useMemo(() => motorcycleColorMap(payload.motorcycles, mode), [payload.motorcycles, mode]);
  const locationsById = useMemo(() => new Map(payload.locations.map((l) => [l.id, l])), [payload.locations]);
  const legsById = useMemo(() => new Map(payload.legs.map((l) => [l.id, l])), [payload.legs]);
  const motorcyclesById = useMemo(() => new Map(payload.motorcycles.map((m) => [m.id, m])), [payload.motorcycles]);

  const filteredLocations = useMemo(() => filterLocations(payload.locations, filter), [payload.locations, filter]);
  const filteredLegs = useMemo(() => filterLegs(payload.legs, filter), [payload.legs, filter]);
  const filteredTours = useMemo(() => filterTours(payload.tours, filter), [payload.tours, filter]);
  const heatPoints = useMemo(
    () => buildHeatPoints(payload.locations, filter, heatWeight),
    [payload.locations, filter, heatWeight],
  );
  const fuelOf = useMemo(() => (loc: MapLocation) => locationFuelUnderFilter(loc, filter), [filter]);
  const homePoint = payload.home ? { latitude: payload.home.latitude, longitude: payload.home.longitude } : null;

  const yearRows = useMemo(
    () => payload.years.map((y) => summarizeYear(y, payload.tours, filter.motorcycleId)).reverse(),
    [payload.years, payload.tours, filter.motorcycleId],
  );
  const calendarYears = useMemo(() => {
    const years = payload.years.map((y) => y.year).filter((y) => filter.year === null || y === filter.year);
    return years.slice().sort((a, b) => b - a).slice(0, filter.year === null ? 3 : 1);
  }, [payload.years, filter.year]);

  const workshops = useMemo(
    () =>
      payload.locations
        .filter((l) => l.type === "maintenanceShop" || l.type === "inspection")
        .filter((l) => l.maintenanceVisits > 0 || l.type === "maintenanceShop")
        .sort((a, b) => b.maintenanceVisits - a.maintenanceVisits || b.maintenanceCost - a.maintenanceCost),
    [payload.locations],
  );

  const needingCountry = useMemo(() => locationsNeedingCountry(payload.locations), [payload.locations]);
  const fitKey = `${filter.motorcycleId ?? "all"}-${filter.year ?? "all"}`;

  const exportGeoJson = () => {
    const collection = buildGeoJson(payload, filter);
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = geoJsonFileName(filter);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const runCountryBackfill = async () => {
    const token = getSessionToken();
    if (!token || needingCountry.length === 0) return;
    const geocode = createDetailedReverseGeocoder();
    setBackfill({ done: 0, total: needingCountry.length });
    let resolved = 0;
    for (let i = 0; i < needingCountry.length; i++) {
      const loc = needingCountry[i];
      try {
        const result = await geocode(loc.latitude, loc.longitude);
        if (result?.countryCode) {
          await updateLocation(token, loc.id, userId, { countryCode: result.countryCode });
          resolved += 1;
        }
      } catch {
        // Keep going; one failed lookup shouldn't abort the whole run.
      }
      setBackfill({ done: i + 1, total: needingCountry.length });
    }
    setBackfill(null);
    toast.success("Länder ermittelt", `${resolved} von ${needingCountry.length} Standorten zugeordnet.`);
    revalidator.revalidate();
  };

  const openEditor = (id: number) => {
    const loc = locationsById.get(id) ?? payload.ungeocoded.find((u) => u.id === id);
    if (loc) setEditing(toEditableLocation(loc, userId));
  };

  const years = payload.years.map((y) => y.year);

  return (
    <div className="container mx-auto space-y-6 px-4 pt-3 pb-24 animate-fade-in md:p-6 md:space-y-8">
      {actionData?.error && (
        <div role="alert" className="rounded-sm border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {actionData.error}
        </div>
      )}

      {/* Controls */}
      <section className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Motorrad"
          value={filter.motorcycleId === null ? "all" : String(filter.motorcycleId)}
          onChange={(v) => setFilter((f) => ({ ...f, motorcycleId: v === "all" ? null : Number(v) }))}
          options={[
            { value: "all", label: "Alle Motorräder" },
            ...payload.motorcycles.map((m) => ({ value: String(m.id), label: `${m.make} ${m.model}` })),
          ]}
        />
        <FilterSelect
          label="Jahr"
          value={filter.year === null ? "all" : String(filter.year)}
          onChange={(v) => setFilter((f) => ({ ...f, year: v === "all" ? null : Number(v) }))}
          options={[{ value: "all", label: "Alle Jahre" }, ...years.slice().reverse().map((y) => ({ value: String(y), label: String(y) }))]}
        />
        <FilterSelect
          label="Gewichtung"
          value={heatWeight}
          onChange={(v) => setHeatWeight(v as HeatWeight)}
          options={(Object.keys(HEAT_WEIGHT_LABELS) as HeatWeight[]).map((k) => ({ value: k, label: HEAT_WEIGHT_LABELS[k] }))}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={exportGeoJson} leftIcon={<Download className="h-4 w-4" />}>
            GeoJSON
          </Button>
          {needingCountry.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runCountryBackfill}
              disabled={backfill !== null}
              leftIcon={<Globe2 className="h-4 w-4" />}
            >
              {backfill ? `Länder ${backfill.done}/${backfill.total}` : `Länder ermitteln (${needingCountry.length})`}
            </Button>
          )}
        </div>
      </section>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Ebenen</legend>
        {LAYER_LABELS.map(({ key, label }) => (
          <label
            key={key}
            className={clsx(
              "inline-flex cursor-pointer select-none items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
              layers[key]
                ? "border-primary/50 bg-primary/10 text-primary dark:text-primary"
                : "border-base-300 text-base-content/55 hover:border-base-content/30 dark:border-navy-700 dark:text-navy-400",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={layers[key]}
              onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {/* Map */}
      {payload.locations.length > 0 ? (
        <FleetMap
          locations={filteredLocations}
          legs={filteredLegs}
          heatPoints={heatPoints}
          home={payload.home}
          motorcycles={payload.motorcycles.filter((m) => filter.motorcycleId === null || m.id === filter.motorcycleId)}
          motorcycleColors={colors}
          layers={layers}
          fuelOf={fuelOf}
          onEditLocation={openEditor}
          fitKey={fitKey}
          className="h-[420px] overflow-hidden rounded-sm border border-base-300/70 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 sm:h-[560px]"
        />
      ) : (
        <EmptyState
          icon={MapPinOff}
          size="sm"
          title="Keine Standorte mit Koordinaten"
          description="Ergänze unten die Koordinaten deiner Standorte, damit die Karte etwas zeigen kann."
        />
      )}

      {/* Years */}
      {yearRows.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={CalendarDays} title="Jahre" />
          <div className="overflow-hidden rounded-sm border border-base-300/70 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-base-200 bg-base-200/50 dark:border-navy-700 dark:bg-navy-900/50">
                  <tr>
                    <Th>Jahr</Th>
                    <Th align="right">Distanz</Th>
                    <Th align="right">Getankt</Th>
                    <Th align="right" hide>Sprit</Th>
                    <Th align="right" hide>Stopps</Th>
                    <Th align="right">Fahrtage</Th>
                    <Th align="right">Touren</Th>
                    <Th hide>Länder</Th>
                    <Th hide>Weitester Punkt</Th>
                    <Th hide>Saison</Th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 dark:divide-navy-700">
                  {yearRows
                    .filter((y) => filter.year === null || y.year === filter.year)
                    .map((y) => {
                      const farthest = y.farthest ? locationsById.get(y.farthest.locationId) : undefined;
                      return (
                        <tr key={y.year} className="transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/40">
                          <Td strong>{y.year}</Td>
                          <Td align="right" strong>{formatNumber(y.distanceKm)} km</Td>
                          <Td align="right">{formatNumber(y.liters, 1)} l</Td>
                          <Td align="right" hide>{y.fuelCost === null ? "–" : formatCurrency(y.fuelCost)}</Td>
                          <Td align="right" hide>{y.fuelStops}</Td>
                          <Td align="right">{y.ridingDays}</Td>
                          <Td align="right">
                            {y.tours}
                            {y.dayTrips > 0 && (
                              <span className="ml-1 text-xs text-base-content/50 dark:text-navy-400">+{y.dayTrips} Tages</span>
                            )}
                          </Td>
                          <Td hide>
                            <span className="inline-flex flex-wrap gap-1">
                              {y.countries.map((c) => (
                                <span key={c} title={countryName(c)} className="font-mono text-xs">
                                  {countryFlag(c)} {c}
                                </span>
                              ))}
                            </span>
                          </Td>
                          <Td hide>
                            {farthest ? (
                              <span>
                                {farthest.name}{" "}
                                <span className="font-numeric tabular-nums text-base-content/55 dark:text-navy-400">
                                  {formatNumber(round1(y.farthest?.distanceKm ?? 0), 1)} km
                                </span>
                              </span>
                            ) : (
                              "–"
                            )}
                          </Td>
                          <Td hide>
                            {y.seasonStart && y.seasonEnd
                              ? `${formatDateShort(y.seasonStart)} – ${formatDateShort(y.seasonEnd)}`
                              : "–"}
                          </Td>
                          <td className="px-2 py-3 text-right">
                            <Link
                              to={`/map/${y.year}`}
                              className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
                            >
                              Rückblick
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {filter.motorcycleId !== null && (
              <p className="border-t border-base-200 px-4 py-2 text-xs text-base-content/55 dark:border-navy-700 dark:text-navy-400">
                Fahrtage, Länder, weitester Punkt und Saison gelten für die ganze Flotte.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Tours */}
      <section className="space-y-3">
        <SectionTitle icon={Bike} title={`Touren${filteredTours.length > 0 ? ` (${filteredTours.length})` : ""}`} />
        {filteredTours.length === 0 ? (
          <p className="text-sm text-base-content/60 dark:text-navy-400">
            Keine mehrtägigen Touren im gewählten Zeitraum. Eine Tour sind mehrere Tankstopps an aufeinanderfolgenden Tagen, mehr als 80 km von Zuhause entfernt.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTours
              .slice()
              .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
              .map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  legs={tour.legIds.map((id) => legsById.get(id)).filter((l) => l !== undefined)}
                  locationsById={locationsById}
                  motorcycle={motorcyclesById.get(tour.motorcycleId)}
                  color={colors.get(tour.motorcycleId) ?? "#2a78d6"}
                  home={homePoint}
                />
              ))}
          </div>
        )}
      </section>

      {/* Calendar */}
      {calendarYears.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={CalendarDays} title="Fahrkalender" />
          <div className="space-y-6 rounded-sm border border-base-300/70 bg-base-100 p-4 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800 sm:p-6">
            {calendarYears.map((year) => {
              const y = payload.years.find((e) => e.year === year);
              return (
                <RidingCalendar
                  key={year}
                  year={year}
                  days={filterCalendar(payload.calendar, year)}
                  seasonStart={y?.seasonStart ?? null}
                  seasonEnd={y?.seasonEnd ?? null}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Workshops */}
      {workshops.length > 0 && (
        <section className="space-y-3">
          <SectionTitle icon={Wrench} title="Werkstätten & Prüfstellen" />
          <div className="overflow-hidden rounded-sm border border-base-300/70 bg-base-100 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700 dark:bg-navy-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-base-200 bg-base-200/50 dark:border-navy-700 dark:bg-navy-900/50">
                  <tr>
                    <Th>Name</Th>
                    <Th hide>Typ</Th>
                    <Th align="right">Besuche</Th>
                    <Th align="right">Kosten</Th>
                    <Th align="right" hide>Zuletzt</Th>
                    <Th align="right" hide>Von Zuhause</Th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200 dark:divide-navy-700">
                  {workshops.map((w) => (
                    <tr key={w.id} className="transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/40">
                      <Td strong>{w.name}</Td>
                      <Td hide>{LOCATION_TYPE_LABELS[w.type]}</Td>
                      <Td align="right">{w.maintenanceVisits + w.parkedVisits}</Td>
                      <Td align="right" strong>{w.maintenanceCost > 0 ? formatCurrency(w.maintenanceCost) : "–"}</Td>
                      <Td align="right" hide>{formatDate(w.lastVisit)}</Td>
                      <Td align="right" hide>
                        {w.distanceFromHomeKm === null ? "–" : `${formatNumber(round1(w.distanceFromHomeKm), 1)} km`}
                      </Td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(w.id)}
                          className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline"
                        >
                          Bearbeiten
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Ungeocoded */}
      {(payload.ungeocoded.length > 0 || payload.unlocatedFuelCount > 0) && (
        <section className="space-y-3">
          <SectionTitle icon={MapPinOff} title="Orte ohne Koordinaten" />
          <div className="rounded-sm border border-dashed border-base-content/20 bg-base-100 p-4 dark:border-navy-600 dark:bg-navy-800">
            {payload.ungeocoded.length > 0 && (
              <ul className="divide-y divide-base-200 dark:divide-navy-700">
                {payload.ungeocoded.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-base-content dark:text-white">{u.name}</div>
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
                        {LOCATION_TYPE_LABELS[u.type]} · {u.visits} Besuch{u.visits === 1 ? "" : "e"}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditor(u.id)}>
                      Koordinaten setzen
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {payload.unlocatedFuelCount > 0 && (
              <p className={clsx("text-xs text-base-content/60 dark:text-navy-400", payload.ungeocoded.length > 0 && "mt-3 border-t border-base-200 pt-3 dark:border-navy-700")}>
                {payload.unlocatedFuelCount} Tankstopp{payload.unlocatedFuelCount === 1 ? "" : "s"} ohne Standort – sie fehlen auf der Karte und in den Etappen.
              </p>
            )}
          </div>
        </section>
      )}

      <LocationEditDialog isOpen={editing !== null} onClose={() => setEditing(null)} location={editing} />
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Bike; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <h2 className="font-subdisplay text-sm text-base-content dark:text-white">{title}</h2>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
