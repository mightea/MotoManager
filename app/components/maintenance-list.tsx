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
  Edit2,
  MapPin,
  Tag,
  Maximize2,
  Calendar,
  Coins,
  Package,
  Info,
  Hash,
  Fuel,
  Activity,
  Plus,
  X,
  Check,
  CheckSquare,
  Trash2,
  FlaskConical,
} from "lucide-react";
import { FormattedText } from "~/components/formatted-text";
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
import { Button } from "./button";
import { CardAction } from "./card";

import { MapView } from "./map-view";

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  currencyCode?: string | null;
  userLocations?: Location[];
  /** Preformatted "2× Ölfilter, 1× Dichtung" per maintenance record id. */
  usedPartsByRecordId?: Record<number, string>;
  onEdit: (record: MaintenanceRecord) => void;
  onAdd?: () => void;
  /** Card title rendered in the list's own header row (filters sit beside it). */
  title?: string;
  /**
   * When provided, enables the bulk-select UI. The parent receives every
   * underlying record id (parent + bundled children) for the selected groups
   * and is responsible for confirming and performing the deletion.
   */
  onBulkDelete?: (recordIds: number[]) => void;
}

interface GroupedMaintenanceRecord {
  id: string; // composite key
  date: string;
  odo: number;
  type: MaintenanceType;
  count: number;
  cost: number;
  currency: string | null;
  /** Normalized-currency twin of `cost`, used only when the group also carries
   *  parts: partsCost is always normalized, so the two can only be added up on
   *  that basis without silently mixing currencies. */
  normalizedCost: number;
  partsCost: number;
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
        normalizedCost: 0,
        partsCost: 0,
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
      group.normalizedCost += record.normalizedCost ?? record.cost ?? 0;
      if (!group.currency && record.currency) {
        group.currency = record.currency;
      }
    }
    // Parts ride on child records too (a bundled item can consume its own
    // parts), so this is deliberately outside the parent-only guard.
    group.partsCost += record.partsCost || 0;

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
  // A single fill's summary already states litres, L/100 km and trip — repeating
  // them on the right says the same thing twice, so show its cost instead.
  if (group.type === "fuel" && group.originalRecords.length > 1) {
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

  // With parts in play the total has to be shown on the normalized basis —
  // partsCost is normalized and group.cost is in the record's own currency, so
  // adding them raw would silently mix currencies.
  if (group.partsCost > 0) {
    return formatCurrency(group.normalizedCost + group.partsCost, currencyCode || "CHF");
  }

  if (group.cost > 0) {
    return formatCurrency(group.cost, group.currency || currencyCode || "CHF");
  }

  return null;
}

/** Rows shown before "ältere Einträge anzeigen"; each click adds a step. */
const INITIAL_VISIBLE_GROUPS = 10;
const VISIBLE_GROUPS_STEP = 30;

/**
 * Odometer plausibility: a reading below the one of an earlier day usually
 * means a typo. Keyed by group id; compares against the closest earlier-dated
 * group with a reading.
 */
function findOdoRegressions(groups: GroupedMaintenanceRecord[]): Map<string, number> {
  const flags = new Map<string, number>();
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!(group.odo > 0)) continue;
    const day = new Date(group.date).setHours(0, 0, 0, 0);
    const older = groups
      .slice(i + 1)
      .find((g) => g.odo > 0 && new Date(g.date).setHours(0, 0, 0, 0) < day);
    if (older && older.odo > group.odo) flags.set(group.id, older.odo);
  }
  return flags;
}

export function MaintenanceList({ records, currencyCode, userLocations, usedPartsByRecordId, onEdit, onAdd, onBulkDelete, title = "Historie" }: MaintenanceListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "maintenance" | "fuel">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_GROUPS);

  const bulkSelectEnabled = typeof onBulkDelete === "function";

  const changeFilter = (next: "all" | "maintenance" | "fuel") => {
    setFilter(next);
    setVisibleCount(INITIAL_VISIBLE_GROUPS);
  };

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
  // Flags come from the unfiltered history so a fuel-only view still compares
  // against the latest service reading (group ids are filter-independent).
  const odoRegressions = findOdoRegressions(
    filter === "all" ? groupedRecords : groupMaintenanceRecords(records, userLocations),
  );

  // Render incrementally: long histories mount only the first chunk, the
  // rest is revealed via "Mehr anzeigen". Selection ("Alle auswählen") and
  // bulk delete still operate on ALL filtered groups, not just visible ones.
  const visibleGroups = groupedRecords.slice(0, visibleCount);
  const hiddenCount = groupedRecords.length - visibleGroups.length;

  // Group by year
  const recordsByYear = new Map<number, typeof groupedRecords>();
  visibleGroups.forEach(group => {
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

  const toggleSelectGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedGroupIds(new Set());
  };

  // Select-all targets every filtered group (including not-yet-rendered ones)
  // so the count label, the toggle, and handleBulkDelete agree.
  const allSelected = selectedGroupIds.size === groupedRecords.length && groupedRecords.length > 0;

  const toggleSelectAll = () => {
    setSelectedGroupIds(allSelected ? new Set() : new Set(groupedRecords.map((g) => g.id)));
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setExpandedGroupId(null);
  };

  const handleBulkDelete = () => {
    if (!onBulkDelete) return;
    const ids: number[] = [];
    for (const group of groupedRecords) {
      if (!selectedGroupIds.has(group.id)) continue;
      for (const record of group.originalRecords) {
        ids.push(record.id);
      }
    }
    if (ids.length === 0) return;
    onBulkDelete(ids);
    exitSelectionMode();
  };

  const selectedCount = selectedGroupIds.size;

  return (
    <div>
      <div
        className={clsx(
          "z-20 flex flex-col gap-2.5 border-b px-4 py-3 md:sticky md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3",
          selectionMode
            ? "border-primary/30 bg-primary/10 dark:bg-primary/15"
            : "border-base-200 bg-base-100 dark:border-navy-700 dark:bg-navy-800",
        )}
        style={{ top: "var(--app-header-h, 4rem)" }}
      >
        {selectionMode ? (
          <>
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary dark:text-primary-light">
              <CheckSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span aria-live="polite" className="truncate">
                {selectedCount} ausgewählt
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleSelectAll}
                leftIcon={<CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                <span className="hidden sm:inline">{allSelected ? "Auswahl aufheben" : "Alle auswählen"}</span>
                <span className="sm:hidden">{allSelected ? "Keine" : "Alle"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={exitSelectionMode}
                leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedCount === 0}
                leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Löschen
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2 md:justify-start">
              <h2 className="font-subdisplay text-[15px] uppercase tracking-[0.06em] text-base-content dark:text-white">
                {title}
              </h2>
              <span className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                <span>
                  <span className="hidden md:inline">· </span>
                  {groupedRecords.length} {groupedRecords.length === 1 ? "Eintrag" : "Einträge"}
                </span>
                {bulkSelectEnabled && groupedRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={enterSelectionMode}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-base-300 text-base-content/70 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 md:hidden"
                    aria-label="Mehrere Einträge auswählen"
                  >
                    <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-1.5">
              <div className="grid grid-cols-3 gap-1.5 md:flex">
                <FilterChip label="Alle" active={filter === "all"} onClick={() => changeFilter("all")} />
                <FilterChip label="Wartung" active={filter === "maintenance"} onClick={() => changeFilter("maintenance")} />
                <FilterChip label="Tanken" active={filter === "fuel"} onClick={() => changeFilter("fuel")} />
              </div>
              {bulkSelectEnabled && groupedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={enterSelectionMode}
                  className="hidden h-8 items-center gap-1 rounded-sm border border-base-300 px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 dark:hover:bg-navy-700 md:inline-flex"
                  aria-label="Mehrere Einträge auswählen"
                >
                  <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Auswählen
                </button>
              )}
              {onAdd && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onAdd}
                  className="h-10 md:h-8"
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Neuer Eintrag
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {groupedRecords.length === 0 ? (
        <div className="px-4 py-4">{records.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Wrench}
            title="Noch keine Einträge"
            description="Erfasse die erste Wartung, Inspektion oder Tankfüllung für dieses Motorrad."
            action={
              onAdd ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onAdd}
                  leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Eintrag erstellen
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            size="sm"
            title="Keine Einträge im aktuellen Filter"
            action={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => changeFilter("all")}
                leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                className="text-primary hover:bg-primary/10 hover:text-primary dark:text-primary-light"
              >
                Filter aufheben
              </Button>
            }
          />
        )}</div>
      ) : (
        <>
        {sortedYears.map((year) => (
          <div key={year}>
            <div className="flex items-center gap-3 px-4 pb-1 pt-3.5">
              <span className="h-px flex-1 bg-base-300 dark:bg-navy-700" aria-hidden="true" />
              <span className="font-numeric text-[13px] font-bold text-secondary tabular-nums dark:text-navy-200">
                {year}
              </span>
              <span className="h-px flex-1 bg-base-300 dark:bg-navy-700" aria-hidden="true" />
            </div>

            <ul>
              {recordsByYear.get(year)!.map((group) => {
                const Icon = getIconForType(group.type);
                const isExpanded = !selectionMode && expandedGroupId === group.id;
                const isSelected = selectedGroupIds.has(group.id);
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

                // The meta line names the type unless the title already is
                // the type (the fallback path) — avoids "MFK / MFK".
                const metaParts = [
                  group.summaries.length > 0 ? typeLabel : null,
                  metric,
                ].filter(Boolean);
                const odoRegression = odoRegressions.get(group.id);

                return (
                  <li
                    key={group.id}
                    className={clsx(
                      "border-t border-base-200 transition-colors dark:border-navy-700",
                      isSelected
                        ? "bg-primary/10 dark:bg-primary/15"
                        : "hover:bg-base-200/50 dark:hover:bg-navy-700/30",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => (selectionMode ? toggleSelectGroup(group.id) : toggleExpand(group.id))}
                      aria-expanded={selectionMode ? undefined : isExpanded}
                      aria-pressed={selectionMode ? isSelected : undefined}
                      aria-controls={selectionMode ? undefined : `maintenance-details-${group.id}`}
                      className="group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 md:items-center md:gap-3.5"
                    >
                      {selectionMode && (
                        <div
                          className={clsx(
                            "mt-2 grid h-5 w-5 shrink-0 place-items-center rounded-sm border transition-colors md:mt-0",
                            isSelected
                              ? "border-primary bg-primary text-primary-content"
                              : "border-base-300 bg-base-100 dark:border-navy-600 dark:bg-navy-900",
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </div>
                      )}
                      <div
                        aria-hidden="true"
                        className={clsx("grid h-[34px] w-[34px] shrink-0 place-items-center rounded-sm md:h-9 md:w-9", tone.bg, tone.fg)}
                      >
                        <Icon className="h-[17px] w-[17px] md:h-[18px] md:w-[18px]" />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        {/* Phone: date ↔ odo on one line, title below.
                            Wide: date + title inline, odo in its own column. */}
                        <div className="flex items-baseline justify-between gap-2 md:justify-start md:flex-wrap md:gap-x-2.5 md:gap-y-1">
                          <span suppressHydrationWarning className="font-numeric text-sm font-bold text-base-content tabular-nums dark:text-white">
                            {dateFormatter.format(new Date(group.date))}
                          </span>
                          <span className="whitespace-nowrap font-numeric text-sm font-bold text-base-content dark:text-white md:hidden">
                            {formatNumber(group.odo)} <span className="text-[11px] text-base-content/70">km</span>
                          </span>
                          <span className="hidden min-w-0 break-words text-[15px] font-semibold text-base-content dark:text-white md:inline">
                            {group.count > 1 && <CountBadge count={group.count} />}
                            {summary}
                          </span>
                        </div>
                        <span className="min-w-0 break-words text-sm font-semibold text-base-content dark:text-white md:hidden">
                          {group.count > 1 && <CountBadge count={group.count} />}
                          {summary}
                        </span>
                        {metaParts.length > 0 && (
                          <span className="font-mono text-[12px] uppercase text-base-content/70 dark:text-navy-300">
                            {metaParts.join(" · ")}
                          </span>
                        )}
                        {odoRegression !== undefined && (
                          <span className="mt-1 self-start bg-[var(--color-workshop)]/20 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]">
                            km-Stand {formatNumber(group.odo)} &lt; vorheriger {formatNumber(odoRegression)} — prüfen
                          </span>
                        )}
                      </div>

                      <span className="hidden shrink-0 text-right md:inline">
                        <span className="font-numeric text-base font-bold text-base-content dark:text-white">{formatNumber(group.odo)}</span>{" "}
                        <span className="font-mono text-[11px] font-semibold uppercase text-base-content/70">km</span>
                      </span>
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
                        <div className="mx-4 mb-3 space-y-3 border-t border-base-200 pt-3 dark:border-navy-600">
                          {group.originalRecords.filter(r => !r.parentId).map((record) => {
                            const isService = record.type === "service";
                            const isTechnical = ["tire", "battery", "fluid", "chain", "brakepad", "brakerotor"].includes(record.type);
                            const childRecords = group.originalRecords.filter(r => r.parentId === record.id);

                            const metadataItems = [
                              // Parts consumed by this entry (from the parts inventory)
                              { label: "Verwendete Teile", value: usedPartsByRecordId?.[record.id] ?? null, icon: Wrench },

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
                              { label: "Prüfstelle", value: record.type === "inspection" ? (record.locationId ? userLocations?.find(l => l.id === record.locationId)?.name : null) : null, icon: MapPin },

                              // Location fields
                              { label: "Standort", value: record.type === "location" ? (record.locationId ? userLocations?.find(l => l.id === record.locationId)?.name : null) : null, icon: MapPin },
                              { label: "Betrieb / Ort", value: (record.type === "fuel" || isService) ? (record.locationId ? userLocations?.find(l => l.id === record.locationId)?.name : null) : null, icon: MapPin },
                              { label: "Menge", value: record.type === "fuel" ? (record.fuelAmount ? `${record.fuelAmount} L` : null) : null, icon: Maximize2 },
                              { label: "Füllung", value: record.type === "fuel" ? (record.fullTank === false ? "Teilfüllung" : "Voll getankt") : null, icon: Fuel },
                              { label: "Verbrauch", value: record.type === "fuel" ? (record.fuelConsumption ? `${record.fuelConsumption.toFixed(2)} L/100km` : null) : null, icon: Activity },
                              { label: "Trip", value: record.type === "fuel" ? (record.tripDistance ? `${record.tripDistance} km` : null) : null, icon: Hash },
                              { label: "Preis/Liter", value: record.type === "fuel" ? (record.pricePerUnit ? formatCurrency(record.pricePerUnit, record.currency || currencyCode || "CHF") : null) : null, icon: Coins },
                              { label: "Additiv", value: record.type === "fuel" && record.fuelAdditiveAdded ? "Ja" : null, icon: FlaskConical },
                              { label: "Bleiersatz", value: record.type === "fuel" && record.leadSubstituteAdded ? "Ja" : null, icon: Droplet },

                              { 
                                label: "Kosten", 
                                value: record.cost && record.cost > 0 ? (
                                  record.currency && currencyCode && record.currency !== currencyCode ? (
                                    <span className="flex flex-col items-end">
                                      <span>{formatCurrency(record.cost, record.currency)}</span>
                                      {record.normalizedCost !== null && (
                                        <span className="text-[11px] text-secondary/70">({formatCurrency(record.normalizedCost, currencyCode)})</span>
                                      )}
                                    </span>
                                  ) : formatCurrency(record.cost, record.currency || currencyCode || "CHF")
                                ) : null,
                                icon: Coins
                              },
                              // Parts are costed separately from the amount the
                              // user typed, so they get their own row plus a
                              // combined total — but only when both exist,
                              // otherwise "Kosten" already says everything.
                              {
                                label: "Teile",
                                value: record.partsCost != null && record.partsCost > 0
                                  ? formatCurrency(record.partsCost, currencyCode || "CHF")
                                  : null,
                                icon: Package,
                              },
                              {
                                label: "Gesamt",
                                value: record.partsCost != null && record.partsCost > 0 && record.cost && record.cost > 0
                                  ? formatCurrency(
                                      (record.normalizedCost ?? record.cost) + record.partsCost,
                                      currencyCode || "CHF",
                                    )
                                  : null,
                                icon: Coins,
                              },
                            ].filter(item => item.value !== null && item.value !== undefined && String(item.value).trim() !== "");

                            return (
                              <div key={record.id} className="rounded-sm border border-base-200 bg-base-200/60 p-3 dark:border-navy-700 dark:bg-navy-900/40">
                                <div className="flex items-center justify-between border-b border-base-300/70 pb-2 mb-3 dark:border-navy-700">
                                  <h4 className="font-subdisplay text-sm text-foreground dark:text-white">
                                    {maintenanceTypeLabels[record.type] || record.type}
                                  </h4>
                                  <CardAction
                                    onClick={() => onEdit(record)}
                                    aria-label="Eintrag bearbeiten"
                                  >
                                    <Edit2 className="h-3 w-3" aria-hidden="true" />
                                    Bearbeiten
                                  </CardAction>
                                </div>

                                <div className="space-y-4">
                                  {/* Description is prose: full-width, wrapping block
                                      instead of a right-aligned key/value cell. */}
                                  {record.description && (
                                    <div className="space-y-1 border-b border-base-300/40 pb-2 dark:border-navy-700/40">
                                      <div className="flex items-center gap-2">
                                        <Info className="icon-muted h-3 w-3 shrink-0" aria-hidden="true" />
                                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400">
                                          Beschreibung
                                        </span>
                                      </div>
                                      <p className="whitespace-pre-wrap break-words text-[13px] font-medium text-foreground dark:text-gray-100">
                                        <FormattedText description={record.description} markup={record.descriptionMarkup} />
                                      </p>
                                    </div>
                                  )}

                                  {metadataItems.length > 0 && (
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                      {metadataItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                          <div key={item.label} className="flex items-center justify-between gap-4 border-b border-base-300/40 py-1.5 dark:border-navy-700/40">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <ItemIcon className="icon-muted h-3 w-3 shrink-0" aria-hidden="true" />
                                              <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400 truncate">
                                                {item.label}
                                              </dt>
                                            </div>
                                            <dd suppressHydrationWarning className="min-w-0 break-words font-numeric text-[13px] font-semibold text-foreground dark:text-gray-100 text-right">
                                              {item.value}
                                            </dd>
                                          </div>
                                        );
                                      })}
                                    </dl>
                                  )}

                                  {childRecords.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-base-300/70 dark:border-navy-700">
                                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-500">
                                        Eingeschlossene Arbeiten
                                      </span>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {childRecords.map(child => (
                                          <div key={child.id} className="flex items-center justify-between rounded-sm border border-base-200 bg-base-100 px-3 py-2 text-xs dark:border-navy-700 dark:bg-navy-900/40">
                                            <div className="flex min-w-0 items-center gap-2">
                                              <Wrench className="h-3 w-3 shrink-0 text-base-content/55 dark:text-navy-500" aria-hidden="true" />
                                              <span className="min-w-0 break-words font-medium text-foreground dark:text-gray-200">
                                                {summarizeMaintenanceRecord(child, userLocations)}
                                              </span>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(child);
                                              }}
                                              aria-label="Eintrag bearbeiten"
                                              className="text-base-content/55 transition-colors hover:text-primary dark:text-navy-400 dark:hover:text-primary-light"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {isExpanded && (() => {
                                    const loc = record.locationId
                                      ? userLocations?.find(l => l.id === record.locationId)
                                      : null;
                                    if (!loc?.latitude || !loc?.longitude) return null;
                                    return (
                                      <div className="mt-2">
                                        <MapView
                                          latitude={loc.latitude}
                                          longitude={loc.longitude}
                                          title={loc.name}
                                        />
                                      </div>
                                    );
                                  })()}

                                  {!record.description && metadataItems.length === 0 && childRecords.length === 0 && (
                                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-400">
                                      Keine weiteren Details
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
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + VISIBLE_GROUPS_STEP)}
            className="block w-full border-t border-base-200 px-4 py-3 text-left font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:border-navy-700 dark:text-primary-light"
          >
            {hiddenCount} ältere {hiddenCount === 1 ? "Eintrag" : "Einträge"} anzeigen →
          </button>
        )}
        </>
      )}
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="mr-1.5 inline-flex items-center justify-center rounded-sm bg-base-content/10 px-1.5 py-[1px] align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:bg-navy-700 dark:text-navy-300">
      {count}×
    </span>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-sm border px-3 font-mono text-[12px] uppercase tracking-[0.08em] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:h-8",
        active
          ? "border-primary bg-primary/10 font-bold text-primary dark:bg-primary/20 dark:text-primary-light"
          : "border-base-300 bg-base-100 font-semibold text-base-content/70 hover:bg-base-200 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700",
      )}
    >
      {label}
    </button>
  );
}
