import { data, Link, useActionData } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Archive, ChevronRight, Inbox, MapPin, Package, Plus, Printer } from "lucide-react";
import type { Route } from "./+types/storage-locations";
import { requireUser } from "~/services/auth";
import {
  createStorageLocation,
  fetchParts,
  fetchPartStocks,
  fetchStorageLocations,
} from "~/services/parts";
import { getLocations } from "~/services/settings";
import type { Location } from "~/types/db";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPath, storageLocationPlace } from "~/utils/parts";
import { getBackendAssetUrl } from "~/utils/backend";
import { Card } from "~/components/card";
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

  if (intent === "createLocation") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return data({ error: "Bitte einen Namen angeben." }, { status: 400 });
    }
    const parentRaw = String(formData.get("parentId") ?? "");
    const parentId = parentRaw === "" ? null : Number(parentRaw);
    const placeRaw = String(formData.get("placeId") ?? "");
    const locationId = parentId == null && placeRaw !== "" ? Number(placeRaw) : null;

    await createStorageLocation(token, { name, parentId, locationId });
    return data({ success: true, intent });
  }

  return null;
}

export default function StorageLocationsPage({ loaderData }: Route.ComponentProps) {
  const { storageLocations, stocks, places, parts } = loaderData;
  const actionData = useActionData<typeof clientAction>();

  const [isAddOpen, setIsAddOpen] = useState(false);
  // Split view (lg+): the location whose contents the right panel shows;
  // "none" = stock without a Lagerort. Defaults to the first root.
  const [selected, setSelected] = useState<number | "none" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      toast.success("Lagerort erstellt");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddOpen(false);
    }
  }, [actionData]);

  // Direct inventory per location: distinct parts and summed quantity.
  const statsByLocation = useMemo(() => {
    const map = new Map<number, { partIds: Set<number>; quantity: number }>();
    for (const stock of stocks) {
      if (stock.storageLocationId == null) continue;
      const entry = map.get(stock.storageLocationId) ?? { partIds: new Set(), quantity: 0 };
      entry.partIds.add(stock.partId);
      entry.quantity += stock.quantity;
      map.set(stock.storageLocationId, entry);
    }
    return map;
  }, [stocks]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, StorageLocation[]>();
    for (const location of storageLocations) {
      const key = location.parentId ?? null;
      map.set(key, [...(map.get(key) ?? []), location]);
    }
    return map;
  }, [storageLocations]);

  const unassigned = stocks.filter((stock) => stock.storageLocationId == null && stock.quantity > 0);

  const rootLocations = childrenByParent.get(null) ?? [];
  const activeSelection = selected ?? rootLocations[0]?.id ?? null;

  // Contents of the selection, including nested locations: part -> quantity.
  const panelItems = useMemo(() => {
    let locationIds: Set<number | null>;
    if (activeSelection === "none") {
      locationIds = new Set([null]);
    } else if (activeSelection == null) {
      return [];
    } else {
      locationIds = new Set<number | null>([activeSelection]);
      let frontier = [activeSelection];
      for (let depth = 0; depth < 6 && frontier.length > 0; depth++) {
        frontier = frontier.flatMap((id) => (childrenByParent.get(id) ?? []).map((child) => child.id));
        for (const id of frontier) locationIds.add(id);
      }
    }
    const quantities = new Map<number, number>();
    for (const stock of stocks) {
      if (!locationIds.has(stock.storageLocationId ?? null) || stock.quantity <= 0) continue;
      quantities.set(stock.partId, (quantities.get(stock.partId) ?? 0) + stock.quantity);
    }
    return [...quantities.entries()]
      .map(([partId, quantity]) => ({ part: parts.find((part) => part.id === partId), quantity }))
      .filter((item): item is { part: (typeof parts)[number]; quantity: number } => item.part != null)
      .sort((a, b) => a.part.name.localeCompare(b.part.name, "de"));
  }, [activeSelection, childrenByParent, stocks, parts]);

  const selectedLocation =
    typeof activeSelection === "number"
      ? storageLocations.find((location) => location.id === activeSelection) ?? null
      : null;

  const isSplitView = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const placeName = (location: StorageLocation) =>
    location.locationId != null
      ? places.find((place) => place.id === location.locationId)?.name ?? null
      : null;

  const renderTree = (parentId: number | null, depth: number): React.ReactNode => {
    const children = childrenByParent.get(parentId) ?? [];
    return children.map((location) => {
      const stats = statsByLocation.get(location.id);
      const place = depth === 0 ? placeName(location) : null;
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
            className={clsx(
              "flex items-center justify-between gap-3 border-b border-base-200 px-3 py-2.5 transition-colors hover:bg-base-200/50 dark:border-navy-700 dark:hover:bg-navy-700/30",
              activeSelection === location.id &&
                "lg:bg-primary/8 lg:shadow-[inset_3px_0_0_var(--color-primary)] dark:lg:bg-primary/15",
            )}
            style={{ paddingLeft: `${12 + depth * 24}px` }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Archive className="h-4 w-4 shrink-0 text-base-content/45" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-base-content dark:text-white">
                {location.name}
              </span>
              {place && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {place}
                </span>
              )}
              {stats && (
                <span className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                  {stats.partIds.size} {stats.partIds.size === 1 ? "Teil" : "Teile"} ·{" "}
                  {stats.quantity} Stk.
                </span>
              )}
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-base-content/30"
              aria-hidden="true"
            />
          </Link>
          {renderTree(location.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      {/* Screen content */}
      <div className="space-y-6 print:hidden">
        <PageHeader
          eyebrow="Lager"
          title="Lagerorte"
          description={`${storageLocations.length} ${storageLocations.length === 1 ? "Lagerort" : "Lagerorte"} · Etiketten drucken, aufkleben und per Scan den Inhalt sehen`}
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
              <span>Lagerort hinzufügen</span>
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
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="overflow-hidden">
              {renderTree(null, 0)}
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
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30",
                  activeSelection === "none" &&
                    "bg-primary/8 shadow-[inset_3px_0_0_var(--color-primary)] dark:bg-primary/15",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Inbox className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <span className="text-sm font-semibold text-base-content dark:text-white">Ohne Lagerort</span>
                  <span
                    className={clsx(
                      "rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                      unassigned.length > 0
                        ? "bg-warning/15 text-warning"
                        : "bg-base-200 text-base-content/60 dark:bg-navy-800 dark:text-navy-300",
                    )}
                  >
                    {new Set(unassigned.map((stock) => stock.partId)).size} Teile
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-base-content/30" aria-hidden="true" />
              </button>
            </Card>

            <div
              ref={panelRef}
              className={clsx("scroll-mt-20", activeSelection === "none" ? "block" : "hidden lg:block")}
            >
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-200 px-4 py-3 dark:border-navy-700">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                      {selectedLocation
                        ? storageLocationPath(selectedLocation, storageLocations)
                        : "Bestand ohne Zuordnung"}
                    </p>
                    <h2 className="font-subdisplay text-lg text-base-content dark:text-white">
                      {selectedLocation ? selectedLocation.name : "Ohne Lagerort"}
                    </h2>
                    <p className="text-xs text-base-content/70 dark:text-navy-400">
                      {panelItems.length} {panelItems.length === 1 ? "Teil" : "Teile"} ·{" "}
                      {panelItems.reduce((sum, item) => sum + item.quantity, 0)} Stk.
                      {selectedLocation && " inkl. Unterfächer"}
                    </p>
                  </div>
                  {selectedLocation && (
                    <Link
                      to={`/storage-locations/${selectedLocation.id}`}
                      className="inline-flex items-center gap-1 rounded-sm border border-base-content/15 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300"
                    >
                      Öffnen · Etikett
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
                {panelItems.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-base-content/60 dark:text-navy-400">
                    {selectedLocation ? "Hier liegt noch nichts." : "Alle Teile sind einem Lagerort zugeordnet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-base-200 dark:divide-navy-700">
                    {panelItems.map(({ part, quantity }) => (
                      <li key={part.id}>
                        <Link
                          to={`/parts/${part.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30"
                        >
                          {part.image ? (
                            <img
                              src={`${getBackendAssetUrl(part.image)}?width=80`}
                              alt=""
                              loading="lazy"
                              className="h-10 w-10 shrink-0 rounded-sm border border-base-300 object-cover dark:border-navy-700"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-base-300 text-base-content/30 dark:border-navy-700"
                            >
                              <Package className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-semibold text-base-content dark:text-white">
                              {part.name}
                            </span>
                            <span className="block font-mono text-[11px] text-base-content/60 dark:text-navy-400">
                              {part.partNumber}
                            </span>
                          </span>
                          <span className="font-numeric text-lg font-semibold text-primary">{quantity}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Print: label sheet with every location */}
      <div className="hidden print:block">
        <div className="grid grid-cols-2 gap-3">
          {storageLocations.map((location) => (
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
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
