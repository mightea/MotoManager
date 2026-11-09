import { Fragment, useMemo, useState } from "react";
import { Form, useSubmit } from "react-router";
import clsx from "clsx";
import { CheckSquare, Combine, Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/button";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { LocationEditDialog } from "~/components/location-edit-dialog";
import { Modal } from "~/components/modal";
import { haversineMeters, normalizeLocationName } from "~/utils/geo";
import type { Location, LocationType } from "~/types/db";
import { MICRO_LABEL, SettingsSection } from "./section";

/** One survivor plus the same-named entries that fold into it. */
type DuplicateGroup = {
  canonical: Location;
  duplicates: Location[];
};

/**
 * Pick the entry that survives a merge: prefer one that carries coordinates (so
 * the merge keeps them), then the oldest (lowest id) for a stable choice.
 */
function chooseCanonical(items: Location[]): Location {
  const withCoords = items.filter((l) => l.latitude !== null && l.longitude !== null);
  const pool = withCoords.length > 0 ? withCoords : items;
  return pool.reduce((best, l) => (l.id < best.id ? l : best));
}

/** Two coordinate-bearing locations closer than this count as the same place. */
const PROXIMITY_MERGE_RADIUS_M = 50;

/** "47.3769, 8.5417" for a coordinate-bearing location, else null. */
function formatCoords(l: Location): string | null {
  if (l.latitude === null || l.longitude === null) return null;
  return `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`;
}

const hasCoords = (l: Location) => l.latitude !== null && l.longitude !== null;

/**
 * Cluster a section's locations into duplicate groups. Two entries are linked
 * when they share a normalized name OR sit within PROXIMITY_MERGE_RADIUS_M of
 * each other; links are transitive (union-find), so a chain A~B~C collapses
 * into one group. Only clusters with 2+ members are returned. O(n²) is fine —
 * per-user, per-section location counts are small.
 */
function findDuplicateGroups(items: Location[]): DuplicateGroup[] {
  const n = items.length;
  if (n < 2) return [];

  const names = items.map((l) => normalizeLocationName(l.name));
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = items[i];
      const b = items[j];
      const sameName = names[i] !== "" && names[i] === names[j];
      const nearby =
        a.latitude !== null &&
        a.longitude !== null &&
        b.latitude !== null &&
        b.longitude !== null &&
        haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude) <=
          PROXIMITY_MERGE_RADIUS_M;
      if (sameName || nearby) union(i, j);
    }
  }

  const clusters = new Map<number, Location[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const arr = clusters.get(root);
    if (arr) arr.push(items[i]);
    else clusters.set(root, [items[i]]);
  }

  const groups: DuplicateGroup[] = [];
  for (const arr of clusters.values()) {
    if (arr.length < 2) continue;
    const canonical = chooseCanonical(arr);
    groups.push({
      canonical,
      duplicates: arr.filter((l) => l.id !== canonical.id),
    });
  }
  return groups;
}

type LocationKind = {
  type: LocationType;
  label: string;
  /** Singular, for "… hinzufügen" and the missing-coordinates warning. */
  addLabel: string;
  description: string;
};

const LOCATION_KINDS: LocationKind[] = [
  {
    type: "storage",
    label: "Garagen & Lager",
    addLabel: "Garage hinzufügen",
    description: "Wo deine Fahrzeuge untergebracht sind",
  },
  {
    type: "maintenanceShop",
    label: "Werkstätten",
    addLabel: "Werkstatt hinzufügen",
    description: "Betriebe, bei denen du Wartung durchführen lässt",
  },
  {
    type: "fuelStation",
    label: "Tankstellen",
    addLabel: "Tankstelle hinzufügen",
    description: "Tankstellen, die du regelmässig anfährst",
  },
  {
    type: "inspection",
    label: "Prüfstellen",
    addLabel: "Prüfstelle hinzufügen",
    description: "MFK- und Inspektionsstellen",
  },
  {
    type: "other",
    label: "Sonstige",
    addLabel: "Sonstigen Ort hinzufügen",
    description: "Alles, was sonst nicht passt",
  },
];

/** Names shown inline in the summary row before "+N weitere". */
const PREVIEW_NAMES = 3;
/** Names listed in the missing-coordinates warning before "…". */
const WARN_NAMES = 5;

const countFmt = new Intl.NumberFormat("de-CH");

type DialogState = { mode: "edit"; location: Location } | { mode: "create"; type: LocationType } | null;

/**
 * "Standorte": one summary row per location type (what it's for, a few names,
 * missing-coordinate warning, count, add button). A row expands in place into
 * the full, editable list with multi-select, bulk retype/delete and duplicate
 * merge.
 */
export function LocationsSection({
  locations,
  isSubmitting,
  lastActionSucceeded,
}: {
  locations: Location[];
  isSubmitting: boolean;
  /** Changes identity after every successful action; closes dialogs/selection. */
  lastActionSucceeded: unknown;
}) {
  const submit = useSubmit();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [expanded, setExpanded] = useState<Set<LocationType>>(new Set());
  const [selectionSection, setSelectionSection] = useState<LocationType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkType, setBulkType] = useState<LocationType>("fuelStation");
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [mergePreview, setMergePreview] = useState<
    { kind: LocationKind; groups: DuplicateGroup[] } | null
  >(null);

  const grouped = useMemo(() => {
    const groups: Record<LocationType, Location[]> = {
      storage: [],
      maintenanceShop: [],
      fuelStation: [],
      inspection: [],
      other: [],
    };
    for (const loc of locations) {
      (groups[loc.type] ?? groups.other).push(loc);
    }
    return groups;
  }, [locations]);

  const exitSelectionMode = () => {
    setSelectionSection(null);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (type: LocationType) => {
    setSelectionSection(type);
    setSelectedIds(new Set());
    // Default bulk-target to a different type so the action isn't a no-op.
    setBulkType(type === "fuelStation" ? "maintenanceShop" : "fuelStation");
  };

  const toggleExpanded = (type: LocationType) => {
    const closing = expanded.has(type);
    if (closing && selectionSection === type) exitSelectionMode();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (closing) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmMerge = () => {
    if (!mergePreview) return;
    const groups = mergePreview.groups.map((g) => ({
      canonicalId: g.canonical.id,
      duplicateIds: g.duplicates.map((d) => d.id),
    }));
    const fd = new FormData();
    fd.set("intent", "mergeDuplicateLocations");
    fd.set("groups", JSON.stringify(groups));
    submit(fd, { method: "post" });
    setMergePreview(null);
  };

  // Exit selection mode and close the create/edit dialog on a successful action.
  // Adjusting state during render (not in an effect) when the result changes.
  const [seenAction, setSeenAction] = useState(lastActionSucceeded);
  if (seenAction !== lastActionSucceeded) {
    setSeenAction(lastActionSucceeded);
    if (lastActionSucceeded) {
      setDialogState(null);
      setSelectionSection(null);
      setSelectedIds(new Set());
    }
  }

  return (
    <SettingsSection
      id="standorte"
      title="Standorte"
      description="Garagen, Werkstätten, Tankstellen und Prüfstellen — gruppiert nach Typ."
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={`px-3 py-2 text-left sm:px-4 ${MICRO_LABEL}`}>
              Typ
            </th>
            <th scope="col" className={`px-3 py-2 text-left sm:px-4 ${MICRO_LABEL}`}>
              Wofür
            </th>
            <th scope="col" className={`px-3 py-2 text-right sm:px-4 ${MICRO_LABEL}`}>
              Anzahl
            </th>
            <th scope="col" className="px-3 py-2 sm:px-4">
              <span className="sr-only">Aktion</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {LOCATION_KINDS.map((kind) => {
            const items = grouped[kind.type];
            const isOpen = expanded.has(kind.type);
            const isSelecting = selectionSection === kind.type;
            const allSelected = items.length > 0 && selectedIds.size === items.length;
            const missing = items.filter((l) => !hasCoords(l));
            const duplicateGroups = isOpen ? findDuplicateGroups(items) : [];
            const duplicateCount = duplicateGroups.reduce((n, g) => n + g.duplicates.length, 0);
            const panelId = `standorte-${kind.type}`;
            const preview = items.slice(0, PREVIEW_NAMES).map((l) => l.name);
            const more = items.length - preview.length;

            return (
              <Fragment key={kind.type}>
                <tr className="border-t border-base-200 dark:border-navy-700">
                  <td className="px-3 py-2.5 align-top text-sm font-semibold text-base-content sm:px-4 sm:text-[15px] dark:text-white">
                    {kind.label}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-base-content/70 sm:px-4 dark:text-navy-300">
                    <span className="block">{kind.description}</span>
                    {items.length > 0 && (
                      <span className="block text-base-content dark:text-white">
                        {preview.join(" · ")}
                        {more > 0 && (
                          <span className="text-base-content/70 dark:text-navy-400">
                            {" "}
                            · +{countFmt.format(more)} weitere
                          </span>
                        )}
                        {" · "}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(kind.type)}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:underline dark:text-primary-light"
                        >
                          {isOpen ? "Ausblenden ↑" : "Anzeigen →"}
                        </button>
                      </span>
                    )}
                    {missing.length > 0 && (
                      <span className="mt-1 block font-mono text-xs text-warning">
                        ⚠ {countFmt.format(missing.length)} ohne Koordinaten (
                        {missing
                          .slice(0, WARN_NAMES)
                          .map((l) => l.name)
                          .join(", ")}
                        {missing.length > WARN_NAMES ? " …" : ""})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right align-top font-numeric font-bold text-base-content sm:px-4 dark:text-white">
                    {items.length > 0 ? countFmt.format(items.length) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right align-top sm:px-4">
                    <button
                      type="button"
                      onClick={() => setDialogState({ mode: "create", type: kind.type })}
                      aria-label={kind.addLabel}
                      title={kind.addLabel}
                      className="inline-grid h-8 w-8 place-items-center rounded-sm border border-base-300 bg-base-100 text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800 dark:text-primary-light"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>

                {isOpen && items.length > 0 && (
                  <tr id={panelId}>
                    <td colSpan={4} className="bg-base-200/40 px-3 pb-3 pt-1 sm:px-4 dark:bg-navy-900/50">
                      <div className="flex flex-wrap items-center gap-2 py-2">
                        <span className={MICRO_LABEL}>
                          {kind.label} · {countFmt.format(items.length)}
                        </span>
                        {!isSelecting && (
                          <div className="ml-auto flex gap-1">
                            {duplicateGroups.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMergePreview({ kind, groups: duplicateGroups })}
                                title={`${duplicateCount} Duplikat${duplicateCount === 1 ? "" : "e"} zusammenführen`}
                              >
                                <Combine className="h-3.5 w-3.5" aria-hidden="true" />
                                {duplicateCount} Duplikat{duplicateCount === 1 ? "" : "e"}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => enterSelectionMode(kind.type)}
                            >
                              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                              Auswählen
                            </Button>
                          </div>
                        )}
                      </div>

                      {isSelecting && (
                        <Form
                          method="post"
                          className="mb-2 flex flex-wrap items-center gap-2 rounded-sm border border-primary/40 bg-primary/5 p-2.5"
                          onSubmit={(e) => {
                            if (selectedIds.size === 0) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="intent" value="bulkUpdateLocationType" />
                          <input type="hidden" name="type" value={bulkType} />
                          {[...selectedIds].map((id) => (
                            <input key={id} type="hidden" name="ids" value={id} />
                          ))}
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] tabular-nums text-base-content">
                            {selectedIds.size} / {items.length} ausgewählt
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedIds(allSelected ? new Set() : new Set(items.map((l) => l.id)))
                            }
                          >
                            {allSelected ? "Auswahl aufheben" : "Alle auswählen"}
                          </Button>
                          <label className="flex items-center gap-2 text-sm text-base-content/70 dark:text-navy-300">
                            → neuer Typ:
                            <select
                              value={bulkType}
                              onChange={(e) => setBulkType(e.target.value as LocationType)}
                              className="h-8 rounded-sm border border-base-300 bg-base-100 px-2 text-sm text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white"
                            >
                              {LOCATION_KINDS.filter((k) => k.type !== kind.type).map((k) => (
                                <option key={k.type} value={k.type}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="ml-auto flex flex-wrap gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={exitSelectionMode}>
                              Abbrechen
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={selectedIds.size === 0 || isSubmitting}
                              onClick={() => setBulkDeleteConfirmOpen(true)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Löschen
                            </Button>
                            <Button type="submit" size="sm" disabled={selectedIds.size === 0 || isSubmitting}>
                              Typ zuweisen
                            </Button>
                          </div>
                        </Form>
                      )}

                      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-base-200 bg-base-200 sm:grid-cols-2 dark:border-navy-700 dark:bg-navy-700">
                        {items.map((location) => {
                          const isSelected = selectedIds.has(location.id);
                          return (
                            <li key={location.id} className="bg-base-100 dark:bg-navy-800">
                              <button
                                type="button"
                                onClick={
                                  isSelecting
                                    ? () => toggleSelected(location.id)
                                    : () => setDialogState({ mode: "edit", location })
                                }
                                aria-pressed={isSelecting ? isSelected : undefined}
                                aria-label={
                                  isSelecting ? `${location.name} auswählen` : `${location.name} bearbeiten`
                                }
                                className={clsx(
                                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                                  isSelected
                                    ? "bg-primary/5"
                                    : "hover:bg-base-200/60 dark:hover:bg-navy-900",
                                )}
                              >
                                {isSelecting && (
                                  <span
                                    aria-hidden="true"
                                    className={clsx(
                                      "grid h-4 w-4 shrink-0 place-items-center rounded-sm border",
                                      isSelected
                                        ? "border-primary bg-primary"
                                        : "border-base-content/40 bg-base-100 dark:bg-navy-900",
                                    )}
                                  >
                                    {isSelected && <span className="block h-2 w-2 rounded-[1px] bg-white" />}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-base-content dark:text-white">
                                  {location.name}
                                </span>
                                {location.countryCode && (
                                  <span className="shrink-0 font-mono text-[11px] font-semibold text-base-content/70 dark:text-navy-400">
                                    {location.countryCode}
                                  </span>
                                )}
                                {!hasCoords(location) && (
                                  <span
                                    className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-warning"
                                    title="Ohne Koordinaten"
                                  >
                                    ⚠ Ohne GPS
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <LocationEditDialog
        isOpen={dialogState !== null}
        onClose={() => setDialogState(null)}
        location={dialogState?.mode === "edit" ? dialogState.location : null}
        defaultType={dialogState?.mode === "create" ? dialogState.type : undefined}
      />

      <DeleteConfirmationDialog
        isOpen={bulkDeleteConfirmOpen}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={() => {
          if (selectedIds.size === 0) {
            setBulkDeleteConfirmOpen(false);
            return;
          }
          const fd = new FormData();
          fd.set("intent", "deleteLocationsBulk");
          for (const id of selectedIds) fd.append("ids", String(id));
          submit(fd, { method: "post" });
          setBulkDeleteConfirmOpen(false);
        }}
        title={`${selectedIds.size} ${selectedIds.size === 1 ? "Standort" : "Standorte"} löschen`}
        description="Möchtest du die ausgewählten Standorte wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        confirmDisabled={selectedIds.size === 0}
      />

      <Modal
        isOpen={mergePreview !== null}
        onClose={() => setMergePreview(null)}
        title="Duplikate zusammenführen"
        code="MERGE"
        description={
          mergePreview
            ? `${mergePreview.kind.label}: ${mergePreview.groups.reduce(
                (n, g) => n + g.duplicates.length,
                0,
              )} Eintrag/Einträge werden zusammengeführt. Verknüpfte Wartungs- und Standort-Einträge bleiben erhalten.`
            : undefined
        }
      >
        {mergePreview && (
          <div className="space-y-4">
            <ul className="space-y-3">
              {mergePreview.groups.map((g) => (
                <li
                  key={g.canonical.id}
                  className="rounded-sm border border-base-300/70 bg-base-100 p-3 dark:border-navy-700 dark:bg-navy-900"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-base-content dark:text-white">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-success">
                      Behalten
                    </span>
                    <span className="truncate">{g.canonical.name}</span>
                    {formatCoords(g.canonical) && (
                      <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-base-content/70">
                        {formatCoords(g.canonical)}
                      </span>
                    )}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {g.duplicates.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2 text-xs text-base-content/70 dark:text-navy-400"
                      >
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                          Zusammenführen
                        </span>
                        <span className="truncate">{d.name}</span>
                        {formatCoords(d) && (
                          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-base-content/70">
                            {formatCoords(d)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setMergePreview(null)}>
                Abbrechen
              </Button>
              <Button onClick={confirmMerge} disabled={isSubmitting}>
                <Combine className="h-4 w-4" aria-hidden="true" />
                Zusammenführen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SettingsSection>
  );
}
