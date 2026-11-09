import { data, Link, useActionData } from "react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Archive, Box, ChevronRight, House, Pencil, Plus, Printer, TriangleAlert } from "lucide-react";
import type { Route } from "./+types/storage-locations";
import { requireUser } from "~/services/auth";
import {
  createStorageLocation,
  fetchParts,
  fetchPartStocks,
  fetchStorageLocations,
  updateStorageLocation,
} from "~/services/parts";
import { getLocations } from "~/services/settings";
import type { Location } from "~/types/db";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPath, storageLocationPlace } from "~/utils/parts";
import { Card } from "~/components/card";
import { StorageContents } from "~/components/parts/storage-contents";
import { PageHeader } from "~/components/page-header";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { StorageLocationForm } from "~/components/storage-location-form";
import { StorageLocationLabel } from "~/components/storage-location-label";
import { toast } from "~/hooks/use-toast";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Lagerorte - Moto Manager" },
    { name: "description", content: "Lagerorte verwalten und QR-Etiketten drucken." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  const [storageLocations, stocks, places, parts] = await Promise.all([
    fetchStorageLocations(token),
    fetchPartStocks(token),
    getLocations(token, user.id).catch(() => [] as Location[]),
    fetchParts(token),
  ]);
  return data({ storageLocations, stocks, places: places as Location[], parts });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "createLocation" || intent === "updateLocation") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return data({ error: "Bitte einen Namen angeben." }, { status: 400 });
    }
    const parentRaw = String(formData.get("parentId") ?? "");
    const parentId = parentRaw === "" ? null : Number(parentRaw);
    const placeRaw = String(formData.get("placeId") ?? "");

    if (intent === "createLocation") {
      const locationId = parentId == null && placeRaw !== "" ? Number(placeRaw) : null;
      await createStorageLocation(token, { name, parentId, locationId });
      return data({ success: true, intent });
    }

    // Edit in place from the split view — same semantics as the location's
    // own page: "" parent moves to root level; at root level an empty place
    // clears the anchor (nested locations inherit the root's place).
    const id = Number(formData.get("locationId"));
    if (!Number.isFinite(id) || id <= 0) {
      return data({ error: "Lagerort-ID fehlt." }, { status: 400 });
    }
    const locationLink =
      parentId == null ? (placeRaw === "" ? null : Number(placeRaw)) : undefined;
    await updateStorageLocation(token, id, {
      name,
      parentId,
      ...(locationLink !== undefined ? { locationId: locationLink } : {}),
    });
    return data({ success: true, intent });
  }

  return null;
}

const SUCCESS_TOASTS: Record<string, string> = {
  createLocation: "Lagerort erstellt",
  updateLocation: "Lagerort aktualisiert",
};

const outlineButton =
  "inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white";

export default function StorageLocationsPage({ loaderData }: Route.ComponentProps) {
  const { storageLocations, stocks, places, parts } = loaderData;
  const actionData = useActionData<typeof clientAction>();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<StorageLocation | null>(null);
  // Split view (lg+): the location whose contents the right panel shows;
  // "none" = stock without a Lagerort. Defaults to the first root.
  const [selected, setSelected] = useState<number | "none" | null>(null);
  // Print sheet: null = every label, an id = just that location's label.
  const [printTarget, setPrintTarget] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      const message = SUCCESS_TOASTS[intent];
      if (message) toast.success(message);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddOpen(false);
      setEditing(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [actionData]);

  // A single label is printed once the sheet has re-rendered with only it.
  useEffect(() => {
    if (printTarget == null) return;
    window.print();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrintTarget(null);
  }, [printTarget]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, StorageLocation[]>();
    for (const location of storageLocations) {
      const key = location.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), location]);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, "de"));
    return map;
  }, [storageLocations]);

  /** The location plus every nested location below it. */
  const subtreeIds = useCallback(
    (rootId: number): Set<number> => {
      const ids = new Set<number>([rootId]);
      let frontier = [rootId];
      for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
        frontier = frontier.flatMap((id) => (childrenByParent.get(id) ?? []).map((child) => child.id));
        for (const id of frontier) ids.add(id);
      }
      return ids;
    },
    [childrenByParent],
  );

  // Inventory per location including nested locations: distinct parts + pieces.
  const statsByLocation = useMemo(() => {
    const map = new Map<number, { parts: number; quantity: number }>();
    for (const location of storageLocations) {
      const ids = subtreeIds(location.id);
      const partIds = new Set<number>();
      let quantity = 0;
      for (const stock of stocks) {
        if (stock.storageLocationId == null || !ids.has(stock.storageLocationId) || stock.quantity <= 0) {
          continue;
        }
        partIds.add(stock.partId);
        quantity += stock.quantity;
      }
      map.set(location.id, { parts: partIds.size, quantity });
    }
    return map;
  }, [storageLocations, stocks, subtreeIds]);

  const unassignedPartIds = new Set(
    stocks
      .filter((stock) => stock.storageLocationId == null && stock.quantity > 0)
      .map((stock) => stock.partId),
  );
  const placedPartIds = new Set(
    stocks
      .filter((stock) => stock.storageLocationId != null && stock.quantity > 0)
      .map((stock) => stock.partId),
  );

  const rootLocations = useMemo(() => childrenByParent.get(null) ?? [], [childrenByParent]);
  const activeSelection = selected ?? rootLocations[0]?.id ?? null;

  // Roots grouped under their physical place (garage / workshop); roots
  // without one stay at the top level.
  const placeGroups = useMemo(() => {
    const groups = new Map<number, StorageLocation[]>();
    const loose: StorageLocation[] = [];
    for (const root of rootLocations) {
      const place = root.locationId != null ? places.find((p) => p.id === root.locationId) : null;
      if (!place) {
        loose.push(root);
        continue;
      }
      groups.set(place.id, [...(groups.get(place.id) ?? []), root]);
    }
    const placed = [...groups.entries()]
      .map(([placeId, roots]) => ({ place: places.find((p) => p.id === placeId)!, roots }))
      .sort((a, b) => a.place.name.localeCompare(b.place.name, "de"));
    return { placed, loose };
  }, [rootLocations, places]);

  // Contents of the selection, including nested locations: part -> quantity.
  const panelItems = useMemo(() => {
    if (activeSelection == null) return [];
    const locationIds: Set<number | null> =
      activeSelection === "none" ? new Set([null]) : subtreeIds(activeSelection);
    const quantities = new Map<number, number>();
    for (const stock of stocks) {
      if (!locationIds.has(stock.storageLocationId ?? null) || stock.quantity <= 0) continue;
      quantities.set(stock.partId, (quantities.get(stock.partId) ?? 0) + stock.quantity);
    }
    return [...quantities.entries()]
      .map(([partId, quantity]) => ({ part: parts.find((part) => part.id === partId), quantity }))
      .filter((item): item is { part: (typeof parts)[number]; quantity: number } => item.part != null)
      .sort((a, b) => a.part.name.localeCompare(b.part.name, "de"));
  }, [activeSelection, subtreeIds, stocks, parts]);

  const selectedLocation =
    typeof activeSelection === "number"
      ? storageLocations.find((location) => location.id === activeSelection) ?? null
      : null;

  const isSplitView = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const placeOf = (location: StorageLocation) =>
    storageLocationPlace(location, storageLocations, places)?.name ?? null;

  /** "Werkstatt › Regal A › Lagerort #4" — where the selection sits. */
  const panelEyebrow = (location: StorageLocation) => {
    const parent = storageLocations.find((candidate) => candidate.id === location.parentId);
    return [placeOf(location), parent ? storageLocationPath(parent, storageLocations) : null, `Lagerort #${location.id}`]
      .filter(Boolean)
      .join(" › ");
  };

  const rowClass = (isSelected: boolean) =>
    clsx(
      "flex min-h-11 items-center gap-2.5 border-t border-base-200 px-4 py-2 transition-colors hover:bg-base-200/50 dark:border-navy-700 dark:hover:bg-navy-700/30",
      isSelected && "lg:bg-primary/10 lg:shadow-[inset_3px_0_0_var(--color-primary)] dark:lg:bg-primary/15",
    );

  const renderTree = (parentId: number | null, depth: number, list?: StorageLocation[]): ReactNode =>
    (list ?? childrenByParent.get(parentId) ?? []).map((location) => {
      const stats = statsByLocation.get(location.id);
      return (
        <div key={location.id}>
          <Link
            to={`/storage-locations/${location.id}`}
            onClick={(event) => {
              // Wide screens select into the side panel; phones open the detail page.
              if (!isSplitView()) return;
              event.preventDefault();
              setSelected(location.id);
            }}
            aria-current={activeSelection === location.id ? "true" : undefined}
            className={rowClass(activeSelection === location.id)}
          >
            <span aria-hidden="true" className="shrink-0" style={{ width: `${depth * 18}px` }} />
            <Box className="h-4 w-4 shrink-0 text-base-content/60 dark:text-navy-400" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-semibold text-base-content dark:text-white">
              {location.name}
            </span>
            <span className="whitespace-nowrap font-mono text-xs text-base-content/70 dark:text-navy-300">
              {stats && stats.parts > 0
                ? `${stats.parts} ${stats.parts === 1 ? "Teil" : "Teile"} · ${stats.quantity} Stk.`
                : "leer"}
            </span>
          </Link>
          {renderTree(location.id, depth + 1)}
        </div>
      );
    });

  const printLocations =
    printTarget == null
      ? storageLocations
      : storageLocations.filter((location) => location.id === printTarget);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      {/* Screen content */}
      <div className="space-y-6 print:hidden">
        <PageHeader
          eyebrow={
            <>
              <Link to="/parts" className="hover:underline">
                Teile
              </Link>{" "}
              › Lager
            </>
          }
          title="Lagerorte"
          description={`${storageLocations.length} ${storageLocations.length === 1 ? "Lagerort" : "Lagerorte"} · ${placedPartIds.size} von ${parts.length} Teilen eingelagert — QR-Etikett aufkleben, scannen, Inhalt sehen.`}
          actions={
          <>
            {storageLocations.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Alle Etiketten drucken
              </button>
            )}
            <button
              onClick={() => setIsAddOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Lagerort</span>
            </button>
          </>
          }
        />

        {actionData && "error" in actionData && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
              ERR
            </span>
            <span>{actionData.error}</span>
          </div>
        )}

        {storageLocations.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Keine Lagerorte"
            description="Lege Regale, Kisten oder Fächer an, um Ersatzteile zu verorten und QR-Etiketten zu drucken."
            action={
              <button
                onClick={() => setIsAddOpen(true)}
                className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ersten Lagerort erstellen
              </button>
            }
          />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <nav aria-label="Lagerorte">
              <Card className="overflow-hidden">
                <h2 className="px-4 py-3 font-subdisplay text-[0.95rem] leading-tight text-base-content dark:text-white">
                  Struktur
                </h2>
                {placeGroups.placed.map(({ place, roots }) => (
                  <div key={`place-${place.id}`}>
                    <div className="flex min-h-11 items-center gap-2.5 border-t border-base-200 px-4 py-2 dark:border-navy-700">
                      <House className="h-4 w-4 shrink-0 text-base-content/60 dark:text-navy-400" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-bold text-base-content dark:text-white">
                        {place.name}
                      </span>
                      <span className="whitespace-nowrap font-mono text-xs text-base-content/70 dark:text-navy-300">
                        {roots.length} {roots.length === 1 ? "Lagerort" : "Lagerorte"}
                      </span>
                    </div>
                    {renderTree(null, 1, roots)}
                  </div>
                ))}
                {renderTree(null, 0, placeGroups.loose)}
                <button
                  type="button"
                  onClick={() => {
                    setSelected("none");
                    if (!isSplitView()) {
                      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth" }));
                    }
                  }}
                  aria-current={activeSelection === "none" ? "true" : undefined}
                  className={clsx(
                    "flex min-h-11 w-full items-center gap-2.5 border-t border-dashed px-4 py-2 text-left transition-colors",
                    unassignedPartIds.size > 0
                      ? "border-warning/40 bg-warning/5 text-warning hover:bg-warning/10 dark:bg-warning/10"
                      : "border-base-200 text-base-content/70 hover:bg-base-200/50 dark:border-navy-700 dark:text-navy-300",
                    activeSelection === "none" && "shadow-[inset_3px_0_0_var(--color-primary)]",
                  )}
                >
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 font-bold">Ohne Lagerort</span>
                  <span className="whitespace-nowrap font-mono text-xs">
                    {unassignedPartIds.size} {unassignedPartIds.size === 1 ? "Teil" : "Teile"} →
                  </span>
                </button>
              </Card>
            </nav>

            <div
              ref={panelRef}
              className={clsx("min-w-0 scroll-mt-20", activeSelection === "none" ? "block" : "hidden lg:block")}
            >
              {selectedLocation ? (
                <StorageContents
                  eyebrow={panelEyebrow(selectedLocation)}
                  title={selectedLocation.name}
                  items={panelItems}
                  emptyText="Hier liegt noch nichts."
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => setPrintTarget(selectedLocation.id)}
                        className={outlineButton}
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                        Etikett drucken
                      </button>
                      <button type="button" onClick={() => setEditing(selectedLocation)} className={outlineButton}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Bearbeiten
                      </button>
                      <Link to={`/storage-locations/${selectedLocation.id}`} className={outlineButton}>
                        Öffnen
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </>
                  }
                />
              ) : (
                <StorageContents
                  eyebrow="Bestand ohne Zuordnung"
                  title="Ohne Lagerort"
                  items={panelItems}
                  emptyText="Alle Teile sind einem Lagerort zugeordnet."
                  actions={
                    panelItems.length > 0 ? (
                      <Link to="/parts?lagerort=none" className={outlineButton}>
                        In der Teile-Liste
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print: label sheet — every location, or the one picked in the panel */}
      <div className="hidden print:block">
        <div className="grid grid-cols-2 gap-3">
          {printLocations.map((location) => (
            <StorageLocationLabel
              key={location.id}
              location={location}
              allLocations={storageLocations}
              placeName={storageLocationPlace(location, storageLocations, places)?.name}
            />
          ))}
        </div>
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Lagerort hinzufügen"
        description="Regal, Kiste oder Fach anlegen — optional verschachtelt oder mit Standort."
      >
        <StorageLocationForm
          locations={storageLocations}
          places={places}
          onClose={() => setIsAddOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={editing != null}
        onClose={() => setEditing(null)}
        title="Lagerort bearbeiten"
        description="Name, Zuordnung oder Standort anpassen."
      >
        {editing && (
          <StorageLocationForm
            key={editing.id}
            locations={storageLocations}
            places={places}
            initialValues={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
