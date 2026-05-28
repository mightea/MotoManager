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
  ChevronDown,
  Edit2,
  MapPin,
  Tag,
  Maximize2,
  Calendar,
  Coins,
  Info,
  Hash,
  Fuel,
  Activity,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import type { MaintenanceRecord, MaintenanceType, Location, FluidType, BatteryType } from "~/types/db";
import clsx from "clsx";
import { formatNumber, formatCurrency } from "~/utils/numberUtils";
import { parseDotCode } from "~/utils/maintenance-intervals";
import {
  maintenanceTypeLabels,
  fluidTypeLabels,
  tirePositionLabels,
  batteryTypeLabels,
  summarizeMaintenanceRecord
  } from "~/utils/maintenance";
import { EmptyState } from "./empty-state";

import { MapView } from "./map-view";

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  currencyCode?: string | null;
  userLocations?: Location[];
  onEdit: (record: MaintenanceRecord) => void;
  onAdd?: () => void;
}

interface GroupedMaintenanceRecord {
  id: string; // composite key
  date: string;
  odo: number;
  type: MaintenanceType;
  count: number;
  cost: number;
  currency: string | null;
  summaries: string[];
  originalRecords: MaintenanceRecord[];
}

const getIconForType = (type: MaintenanceType) => {
  switch (type) {
    case "tire": return CircleDashed;
    case "battery": return Battery;
    case "brakepad": return Layers;
    case "brakerotor": return Disc;
    case "chain": return Link;
    case "fluid": return Droplet;
    case "repair": return Hammer;
    case "service": return ClipboardList;
    case "inspection": return ClipboardCheck;
    case "location": return MapPin;
    case "fuel": return Fuel;
    case "general": default: return Wrench;
  }
};

// Category tinting — design system maps each maintenance type to a
// semantic colour so the icon tile and accent text identify the work
// at a glance. Falls back to neutral surface for "general".
type CategoryTone = {
  /** Tailwind classes for the icon tile background. */
  bg: string;
  /** Tailwind classes for the icon glyph + the colored title accent. */
  fg: string;
};

const TYPE_TONE: Record<MaintenanceType, CategoryTone> = {
  service:    { bg: "bg-primary/10",      fg: "text-primary" },
  inspection: { bg: "bg-info/10",         fg: "text-info" },
  brakepad:   { bg: "bg-error/10",        fg: "text-error" },
  brakerotor: { bg: "bg-error/10",        fg: "text-error" },
  battery:    { bg: "bg-warning/10",      fg: "text-warning" },
  fluid:      { bg: "bg-info/10",         fg: "text-info" },
  repair:     { bg: "bg-warning/10",      fg: "text-warning" },
  fuel:       { bg: "bg-success/10",      fg: "text-success" },
  tire:       { bg: "bg-slate-500/10",    fg: "text-slate-600 dark:text-slate-300" },
  chain:      { bg: "bg-slate-500/10",    fg: "text-slate-600 dark:text-slate-300" },
  location:   { bg: "bg-info/10",         fg: "text-info" },
  general:    { bg: "bg-base-200",        fg: "text-base-content/60" },
};

function groupMaintenanceRecords(records: MaintenanceRecord[], userLocations?: Location[]): GroupedMaintenanceRecord[] {
  const groups = new Map<string, GroupedMaintenanceRecord>();
  const recordsById = new Map<number, MaintenanceRecord>(records.map(r => [r.id, r]));

  for (const record of records) {
    let effectiveRecord = record;
    if (record.parentId) {
      const parent = recordsById.get(record.parentId);
      if (parent) {
        effectiveRecord = parent;
      }
    }

    const key = `${effectiveRecord.date}-${effectiveRecord.odo}-${effectiveRecord.type}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        date: effectiveRecord.date,
        odo: effectiveRecord.odo,
        type: effectiveRecord.type,
        count: 0,
        cost: 0,
        currency: effectiveRecord.currency || null,
        summaries: [],
        originalRecords: [],
      });
    }

    const group = groups.get(key)!;
    
    // Only count and add cost if it's not a child record (to avoid double counting)
    // Or if it IS a child record, we might want to sum it up if it has its own cost?
    // Usually bundled items have null cost.
    if (!record.parentId) {
      group.count += 1;
      group.cost += record.cost || 0;
      if (!group.currency && record.currency) {
        group.currency = record.currency;
      }
    }

    const summary = summarizeMaintenanceRecord(record, userLocations);

    if (summary) {
      if (!group.summaries.includes(summary)) {
        group.summaries.push(summary);
      }
    }

    group.originalRecords.push(record);
  }

  // Sort originalRecords within each group: parent first, then children
  groups.forEach(group => {
    group.originalRecords.sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      return a.id - b.id;
    });
  });

  return Array.from(groups.values()).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function getCollapsedMetric(group: GroupedMaintenanceRecord, currencyCode?: string | null): string | null {
  if (group.type === "fuel") {
    const totalLiters = group.originalRecords.reduce((sum, r) => sum + (r.fuelAmount || 0), 0);
    const consumptionValues = group.originalRecords
      .map(r => r.fuelConsumption)
      .filter((v): v is number => v !== null && v !== undefined);
    if (totalLiters > 0 && consumptionValues.length > 0) {
      const avg = consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length;
      return `${totalLiters.toFixed(1)} L · ${avg.toFixed(1)} L/100`;
    }
    if (totalLiters > 0) return `${totalLiters.toFixed(1)} L`;
    return null;
  }

  if (group.type === "tire") {
    const positions = group.originalRecords
      .map(r => r.tirePosition ? tirePositionLabels[r.tirePosition] : null)
      .filter((v): v is string => v !== null);
    const unique = [...new Set(positions)];
    if (unique.length > 0) return unique.join(" & ");
    return null;
  }

  if (group.cost > 0) {
    return formatCurrency(group.cost, group.currency || currencyCode || "CHF");
  }

  return null;
}

export function MaintenanceList({ records, currencyCode, userLocations, onEdit, onAdd }: MaintenanceListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "maintenance" | "fuel">("all");

  const dateFormatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
  });

  let filteredRecords = records;
  if (filter === "maintenance") {
    filteredRecords = records.filter(r => r.type !== "fuel");
  } else if (filter === "fuel") {
    filteredRecords = records.filter(r => r.type === "fuel");
  }

  const groupedRecords = groupMaintenanceRecords(filteredRecords, userLocations);

  // Group by year
  const recordsByYear = new Map<number, typeof groupedRecords>();
  groupedRecords.forEach(group => {
    const year = new Date(group.date).getFullYear();
    if (!recordsByYear.has(year)) {
      recordsByYear.set(year, []);
    }
    recordsByYear.get(year)!.push(group);
  });

  const sortedYears = Array.from(recordsByYear.keys()).sort((a, b) => b - a);

  const toggleExpand = (id: string) => {
    setExpandedGroupId(expandedGroupId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div
        className="sticky z-20 -mx-4 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 pb-3 pt-3 dark:border-navy-700 dark:bg-navy-800"
        style={{ top: "var(--app-header-h, 4rem)" }}
      >
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            label="Alle"
            icon={Layers}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label="Wartung"
            icon={Wrench}
            active={filter === "maintenance"}
            onClick={() => setFilter("maintenance")}
          />
          <FilterChip
            label="Tanken"
            icon={Fuel}
            active={filter === "fuel"}
            onClick={() => setFilter("fuel")}
          />
        </div>
        <div className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-secondary/50 dark:text-navy-500">
          {groupedRecords.length} {groupedRecords.length === 1 ? 'Eintrag' : 'Einträge'}
        </div>
      </div>

      {groupedRecords.length === 0 ? (
        records.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Wrench}
            title="Noch keine Einträge"
            description="Erfasse die erste Wartung, Inspektion oder Tankfüllung für dieses Motorrad."
            action={
              onAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-content shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Eintrag erstellen
                </button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            size="sm"
            title="Keine Einträge im aktuellen Filter"
            action={
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-primary-light"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Filter aufheben
              </button>
            }
          />
        )
      ) : (
        sortedYears.map((year) => (
          <div key={year} className="space-y-2">
            <div
              className="sticky z-10 -mx-4 flex items-center gap-4 bg-white px-4 py-2 dark:bg-navy-800"
              style={{ top: "calc(var(--app-header-h, 4rem) + 3.25rem)" }}
            >
              <div className="h-px flex-1 bg-gray-100 dark:bg-navy-700"></div>
              <span className="text-sm font-bold text-secondary dark:text-navy-500">{year}</span>
              <div className="h-px flex-1 bg-gray-100 dark:bg-navy-700"></div>
            </div>

            <ul className="space-y-2">
              {recordsByYear.get(year)!.map((group) => {
                const Icon = getIconForType(group.type);
                const isExpanded = expandedGroupId === group.id;
                const tone = TYPE_TONE[group.type] ?? TYPE_TONE.general;
                const typeLabel = maintenanceTypeLabels[group.type] || group.type;

                // Determine display summary
                let summary = "";

                if (group.summaries.length > 0) {
                  summary = group.summaries.join(", ");
                } else {
                  summary = typeLabel;
                }

                const metric = getCollapsedMetric(group, currencyCode);

                return (
                  <li key={group.id} className="rounded-xl transition-colors hover:bg-gray-50/50 dark:hover:bg-navy-700/30">
                    <button
                      type="button"
                      onClick={() => toggleExpand(group.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`maintenance-details-${group.id}`}
                      className="group flex w-full cursor-pointer items-start gap-3 py-2.5 pl-0 text-left"
                    >
                      <div className={clsx(
                        "mt-0.5 grid h-11 w-11 place-items-center rounded-xl shrink-0 transition-transform group-hover:scale-105",
                        tone.bg,
                        tone.fg,
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        {/* Row 1: date left, odo + chevron right */}
                        <div className="flex items-center justify-between gap-2">
                          <h3 suppressHydrationWarning className="text-sm font-semibold text-foreground dark:text-white">
                            {dateFormatter.format(new Date(group.date))}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-foreground dark:text-white tabular-nums">
                              {formatNumber(group.odo)} km
                            </span>
                            <ChevronDown className={clsx("h-4 w-4 text-secondary transition-transform dark:text-navy-400", isExpanded && "rotate-180")} />
                          </div>
                        </div>

                        {/* Row 2: Context — summary left (category-coloured), metric · type right */}
                        <div className="flex items-center justify-between gap-3 mt-0.5">
                          <p className="min-w-0 text-xs line-clamp-1">
                            {group.count > 1 && (
                              <span className="mr-1.5 inline-flex items-center justify-center rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary dark:bg-navy-600 dark:text-navy-200 align-middle">
                                {group.count}x
                              </span>
                            )}
                            <span className={clsx("font-semibold", tone.fg)}>
                              {summary}
                            </span>
                          </p>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-secondary/70 dark:text-navy-500">
                            {metric ? <>{metric} <span className="text-secondary/40 dark:text-navy-600">·</span> {typeLabel}</> : typeLabel}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    <div
                      id={`maintenance-details-${group.id}`}
                      className={clsx(
                        "grid transition-all duration-300 ease-in-out",
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mx-2 mb-2 space-y-3 border-t border-gray-100 pt-3 dark:border-navy-600">
                          {group.originalRecords.filter(r => !r.parentId).map((record) => {
                            const isService = record.type === "service";
                            const isTechnical = ["tire", "battery", "fluid", "chain", "brakepad", "brakerotor"].includes(record.type);
                            const childRecords = group.originalRecords.filter(r => r.parentId === record.id);

                            const metadataItems = [
                              { label: "Beschreibung", value: record.description, icon: Info },
                              
                              // Brand/Model - Show for technical types only
                              { label: "Marke", value: isTechnical ? record.brand : null, icon: Tag },
                              { label: "Modell", value: isTechnical ? record.model : null, icon: Hash },

                              // Tire fields - show if it's a tire record
                              { label: "Position", value: record.type === "tire" ? (record.tirePosition ? tirePositionLabels[record.tirePosition] || record.tirePosition : null) : null, icon: MapPin },
                              { label: "Grösse", value: record.type === "tire" ? record.tireSize : null, icon: Maximize2 },
                              { 
                                label: "DOT / Alter", 
                                icon: Calendar,
                                value: record.type === "tire" ? (() => {
                                  if (!record.dotCode) return null;
                                  const dotMatch = record.dotCode.match(/(\d{2})(\d{2})$/);
                                  const formattedDot = dotMatch ? `${dotMatch[1]}/${dotMatch[2]}` : record.dotCode;
                                  const dotDate = parseDotCode(record.dotCode);
                                  if (!dotDate) return formattedDot;
                                  const ageInYears = (new Date().getTime() - dotDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                                  return `${formattedDot} (${ageInYears.toFixed(1)} Jahre)`;
                                })() : null
                              },

                              // Fluid fields
                              { label: "Art", value: record.type === "fluid" ? (record.fluidType ? fluidTypeLabels[record.fluidType as FluidType] || record.fluidType : null) : null, icon: Droplet },
                              { label: "Viskosität", value: (record.type === "fluid" || isService) ? record.viscosity : null, icon: Wrench },
                              { label: "Öl-Typ", value: record.type === "fluid" ? (record.oilType ? (record.oilType === "synthetic" ? "Synthetisch" : record.oilType === "semi-synthetic" ? "Teilsynthetisch" : "Mineralisch") : null) : null, icon: Activity },

                              // Battery fields
                              { label: "Batterietyp", value: record.type === "battery" ? (record.batteryType ? batteryTypeLabels[record.batteryType as BatteryType] || record.batteryType : null) : null, icon: Battery },

                              // Inspection fields
                              { label: "Prüfstelle", value: record.type === "inspection" ? record.inspectionLocation : null, icon: MapPin },

                              // Location fields
                              { label: "Standort", value: record.type === "location" ? (record.locationId ? userLocations?.find(l => l.id === record.locationId)?.name : null) : null, icon: MapPin },
                              { label: "Betrieb / Ort", value: (record.type === "fuel" || isService) ? record.locationName : null, icon: MapPin },
                              { label: "Menge", value: record.type === "fuel" ? (record.fuelAmount ? `${record.fuelAmount} L` : null) : null, icon: Maximize2 },
                              { label: "Verbrauch", value: record.type === "fuel" ? (record.fuelConsumption ? `${record.fuelConsumption.toFixed(2)} L/100km` : null) : null, icon: Activity },
                              { label: "Trip", value: record.type === "fuel" ? (record.tripDistance ? `${record.tripDistance} km` : null) : null, icon: Hash },
                              { label: "Preis/Liter", value: record.type === "fuel" ? (record.pricePerUnit ? formatCurrency(record.pricePerUnit, record.currency || currencyCode || "CHF") : null) : null, icon: Coins },

                              { 
                                label: "Kosten", 
                                value: record.cost && record.cost > 0 ? (
                                  record.currency && currencyCode && record.currency !== currencyCode ? (
                                    <span className="flex flex-col items-end">
                                      <span>{formatCurrency(record.cost, record.currency)}</span>
                                      {record.normalizedCost !== null && (
                                        <span className="text-[10px] text-secondary/70">({formatCurrency(record.normalizedCost, currencyCode)})</span>
                                      )}
                                    </span>
                                  ) : formatCurrency(record.cost, record.currency || currencyCode || "CHF")
                                ) : null, 
                                icon: Coins 
                              },
                            ].filter(item => item.value !== null && item.value !== undefined && String(item.value).trim() !== "");

                            return (
                              <div key={record.id} className="rounded-xl bg-gray-50 p-3 dark:bg-navy-800">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 dark:border-navy-700">
                                  <h4 className="text-sm font-semibold text-foreground dark:text-white">
                                    {maintenanceTypeLabels[record.type] || record.type}
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(record);
                                    }}
                                    className="rounded-lg p-2 text-secondary hover:bg-gray-200 hover:text-primary dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-primary-light"
                                    title="Bearbeiten"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="space-y-4">
                                  {metadataItems.length > 0 && (
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm">
                                      {metadataItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-gray-50 py-1 dark:border-navy-700/50">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <ItemIcon className="h-3.5 w-3.5 text-secondary/60 dark:text-navy-500 shrink-0" />
                                              <dt className="text-xs font-medium text-secondary dark:text-navy-400 truncate">
                                                {item.label}
                                              </dt>
                                            </div>
                                            <dd suppressHydrationWarning className="text-xs font-semibold text-foreground dark:text-gray-200 text-right shrink-0">
                                              {item.value}
                                            </dd>
                                          </div>
                                        );
                                      })}
                                    </dl>
                                  )}

                                  {childRecords.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-navy-700">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary dark:text-navy-500">
                                        Eingeschlossene Arbeiten
                                      </span>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {childRecords.map(child => (
                                          <div key={child.id} className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2 text-xs dark:bg-navy-900/50">
                                            <div className="flex items-center gap-2">
                                              <Wrench className="h-3 w-3 text-secondary/60 dark:text-navy-500" />
                                              <span className="font-medium text-foreground dark:text-gray-200">
                                                {summarizeMaintenanceRecord(child, userLocations)}
                                              </span>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(child);
                                              }}
                                              className="text-secondary hover:text-primary dark:text-navy-400 dark:hover:text-primary-light"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {isExpanded && record.latitude && record.longitude && (
                                    <div className="mt-2">
                                      <MapView
                                        latitude={record.latitude}
                                        longitude={record.longitude}
                                        title={record.locationName || "Tankstelle"}
                                      />
                                    </div>
                                  )}

                                  {metadataItems.length === 0 && childRecords.length === 0 && (
                                    <p className="text-sm text-secondary dark:text-navy-400">
                                      Keine weiteren Details verfügbar.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function FilterChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Wrench;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30 dark:bg-primary/25 dark:text-primary-light"
          : "border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
