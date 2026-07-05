import { data, Link, useActionData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronRight, MapPin, Plus, Printer } from "lucide-react";
import type { Route } from "./+types/storage-locations";
import { requireUser } from "~/services/auth";
import {
  createStorageLocation,
  fetchPartStocks,
  fetchStorageLocations,
} from "~/services/parts";
import { getLocations } from "~/services/settings";
import type { Location } from "~/types/db";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPlace } from "~/utils/parts";
import { Card } from "~/components/card";
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
  const [storageLocations, stocks, places] = await Promise.all([
    fetchStorageLocations(token),
    fetchPartStocks(token),
    getLocations(token, user.id).catch(() => [] as Location[]),
  ]);
  return data({ storageLocations, stocks, places: places as Location[] });
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
  const { storageLocations, stocks, places } = loaderData;
  const actionData = useActionData<typeof clientAction>();

  const [isAddOpen, setIsAddOpen] = useState(false);

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
            className="flex items-center justify-between gap-3 border-b border-base-200 px-3 py-2.5 transition-colors hover:bg-base-200/50 dark:border-navy-700 dark:hover:bg-navy-700/30"
            style={{ paddingLeft: `${12 + depth * 24}px` }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Archive className="h-4 w-4 shrink-0 text-base-content/45" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-base-content dark:text-white">
                {location.name}
              </span>
              {place && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {place}
                </span>
              )}
              {stats && (
                <span className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
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
    <div className="container mx-auto max-w-5xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      {/* Screen content */}
      <div className="space-y-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wide text-base-content dark:text-white">
              Lagerorte
            </h1>
            <p className="mt-1 text-sm text-base-content/65">
              Regale, Kisten und Fächer — QR-Etiketten drucken, aufkleben und per Scan direkt den
              Inhalt sehen. Bearbeiten und Löschen findest du auf der Seite des Lagerorts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {storageLocations.length > 0 && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
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
              <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
            </button>
          </div>
        </div>

        {actionData && "error" in actionData && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
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
                <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
              </button>
            }
          />
        ) : (
          <Card className="overflow-hidden">{renderTree(null, 0)}</Card>
        )}

        <p className="text-xs text-base-content/50">
          Teile ohne Lagerort findest du auf der{" "}
          <Link to="/parts" className="underline">
            Teile-Seite
          </Link>
          .
        </p>
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
