import { data, Link, redirect, useActionData, useSubmit } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronRight, MapPin, Package, Pencil, Printer, Trash2 } from "lucide-react";
import type { Route } from "./+types/storage-locations.detail";
import { requireUser } from "~/services/auth";
import {
  deleteStorageLocation,
  fetchParts,
  fetchPartStocks,
  fetchStorageLocations,
  updateStorageLocation,
} from "~/services/parts";
import { getLocations } from "~/services/settings";
import type { Location } from "~/types/db";
import type { Part, PartStock, StorageLocation } from "~/types/parts";
import { getBackendAssetUrl } from "~/utils/backend";
import { storageLocationPath, storageLocationPlace } from "~/utils/parts";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { StorageLocationForm } from "~/components/storage-location-form";
import { StorageLocationLabel } from "~/components/storage-location-label";
import { toast } from "~/hooks/use-toast";

export function meta({ data }: Route.MetaArgs) {
  const name = data?.location?.name;
  return [
    { title: name ? `Lagerort: ${name} - Moto Manager` : "Lagerort - Moto Manager" },
    { name: "description", content: "Inhalt dieses Lagerorts." },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  const locationId = Number(params.id);
  if (!Number.isFinite(locationId)) {
    throw new Response("Ungültige Lagerort-ID", { status: 400 });
  }

  const [storageLocations, parts, stocks, places] = await Promise.all([
    fetchStorageLocations(token),
    fetchParts(token),
    fetchPartStocks(token),
    getLocations(token, user.id).catch(() => [] as Location[]),
  ]);

  const location = storageLocations.find((candidate) => candidate.id === locationId);
  if (!location) {
    throw new Response("Lagerort nicht gefunden.", { status: 404 });
  }

  return data({ location, storageLocations, parts, stocks, places: places as Location[] });
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const locationId = Number(params.id);
  if (!Number.isFinite(locationId)) {
    throw new Response("Ungültige Lagerort-ID", { status: 400 });
  }
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "updateLocation") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return data({ error: "Bitte einen Namen angeben." }, { status: 400 });
    }
    const parentRaw = String(formData.get("parentId") ?? "");
    const parentId = parentRaw === "" ? null : Number(parentRaw);
    const placeRaw = String(formData.get("placeId") ?? "");
    // Both fields use explicit null = clear: "" parent moves to root level;
    // at root level an empty place selection clears the anchor (a nested
    // location never sends one — the root of the tree owns the place).
    const locationLink =
      parentId == null ? (placeRaw === "" ? null : Number(placeRaw)) : undefined;

    await updateStorageLocation(token, locationId, {
      name,
      parentId,
      ...(locationLink !== undefined ? { locationId: locationLink } : {}),
    });
    return data({ success: true, intent });
  }

  if (intent === "deleteLocation") {
    const deleted = await deleteStorageLocation(token, locationId);
    if (!deleted) {
      return data({ error: "Lagerort konnte nicht gelöscht werden." }, { status: 404 });
    }
    // The page we're on no longer exists — back to the overview.
    throw redirect("/storage-locations");
  }

  return null;
}

/** Distinct parts stocked at one location, with the summed quantity there. */
function partsAt(
  locationId: number,
  parts: Part[],
  stocks: PartStock[],
): { part: Part; quantity: number }[] {
  const quantityByPart = new Map<number, number>();
  for (const stock of stocks) {
    if (stock.storageLocationId !== locationId) continue;
    quantityByPart.set(stock.partId, (quantityByPart.get(stock.partId) ?? 0) + stock.quantity);
  }
  return [...quantityByPart.entries()]
    .map(([partId, quantity]) => {
      const part = parts.find((candidate) => candidate.id === partId);
      return part ? { part, quantity } : null;
    })
    .filter((entry): entry is { part: Part; quantity: number } => entry != null)
    .sort((a, b) => a.part.name.localeCompare(b.part.name));
}

function PartRow({ part, quantity, note }: { part: Part; quantity: number; note?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-base-200 px-3 py-2.5 last:border-b-0 dark:border-navy-700">
      {part.image ? (
        <img
          src={`${getBackendAssetUrl(part.image)}?width=96`}
          alt=""
          loading="lazy"
          className="h-11 w-11 shrink-0 rounded-sm border border-base-300 object-cover dark:border-navy-700"
        />
      ) : (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-base-200 text-base-content/35 dark:bg-navy-800">
          <Package className="h-4 w-4" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-base-content dark:text-white">
          {part.name}
        </p>
        <p className="truncate font-mono text-[11px] text-base-content/55 dark:text-navy-400">
          {part.partNumber}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-numeric text-lg font-semibold leading-none text-primary">{quantity}</p>
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
          Stk. hier
        </p>
      </div>
    </div>
  );
}

export default function StorageLocationDetailPage({ loaderData }: Route.ComponentProps) {
  const { location, storageLocations, parts, stocks, places } = loaderData;
  const actionData = useActionData<typeof clientAction>();
  const submit = useSubmit();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      toast.success("Lagerort aktualisiert");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditOpen(false);
    }
  }, [actionData]);

  const place = storageLocationPlace(location, storageLocations, places);

  // Breadcrumb: ancestors from the root down to this location.
  const ancestors = useMemo(() => {
    const chain: StorageLocation[] = [];
    let current: StorageLocation | undefined = location;
    for (let depth = 0; depth < 10 && current?.parentId != null; depth++) {
      current = storageLocations.find((candidate) => candidate.id === current!.parentId);
      if (!current) break;
      chain.unshift(current);
    }
    return chain;
  }, [location, storageLocations]);

  const children = storageLocations
    .filter((candidate) => candidate.parentId === location.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Every location in this subtree (excluding the location itself).
  const descendants = useMemo(() => {
    const result: StorageLocation[] = [];
    const queue = [...children];
    while (queue.length > 0) {
      const next = queue.shift()!;
      result.push(next);
      queue.push(...storageLocations.filter((candidate) => candidate.parentId === next.id));
    }
    return result;
  }, [children, storageLocations]);

  const directParts = partsAt(location.id, parts, stocks);
  const descendantSections = descendants
    .map((descendant) => ({
      location: descendant,
      entries: partsAt(descendant.id, parts, stocks),
    }))
    .filter((section) => section.entries.length > 0);

  const isEmpty = directParts.length === 0 && descendantSections.length === 0;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      <div className="space-y-6 print:hidden">
        {/* Breadcrumb + heading */}
        <div>
          <nav
            aria-label="Lagerort-Pfad"
            className="flex flex-wrap items-center gap-1 text-xs text-base-content/55"
          >
            <Link to="/storage-locations" className="hover:text-base-content hover:underline">
              Lagerorte
            </Link>
            {ancestors.map((ancestor) => (
              <span key={ancestor.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                <Link
                  to={`/storage-locations/${ancestor.id}`}
                  className="hover:text-base-content hover:underline"
                >
                  {ancestor.name}
                </Link>
              </span>
            ))}
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-base-content/80">{location.name}</span>
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-base-content dark:text-white">
                <Archive className="h-6 w-6 text-base-content/50" aria-hidden="true" />
                {location.name}
              </h1>
              {place && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-base-200 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {place.name}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-error/50 hover:text-error dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Löschen
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Etikett drucken
              </button>
            </div>
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

        {/* On-screen label preview (QR points right here) */}
        <div className="max-w-sm">
          <StorageLocationLabel
            location={location}
            allLocations={storageLocations}
            placeName={place?.name}
          />
        </div>

        {/* Sub-locations */}
        {children.length > 0 && (
          <section className="space-y-2">
            <h2 className="label-tag">
              <span>Unterorte</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <Link
                  key={child.id}
                  to={`/storage-locations/${child.id}`}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 text-sm font-semibold text-base-content/80 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200"
                >
                  <Archive className="h-3.5 w-3.5 text-base-content/45" aria-hidden="true" />
                  {child.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Contents */}
        <section className="space-y-2">
          <h2 className="label-tag">
            <span>Inhalt</span>
          </h2>
          {isEmpty ? (
            <EmptyState
              size="sm"
              icon={Package}
              title="Leer"
              description="In diesem Lagerort ist aktuell kein Bestand erfasst."
            />
          ) : (
            <div className="space-y-4">
              {directParts.length > 0 && (
                <Card className="overflow-hidden">
                  {directParts.map(({ part, quantity }) => (
                    <PartRow key={part.id} part={part} quantity={quantity} />
                  ))}
                </Card>
              )}
              {descendantSections.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
                    In Unterorten
                  </h3>
                  <Card className="overflow-hidden">
                    {descendantSections.flatMap(({ location: subLocation, entries }) =>
                      entries.map(({ part, quantity }) => (
                        <PartRow
                          key={`${subLocation.id}-${part.id}`}
                          part={part}
                          quantity={quantity}
                          note={storageLocationPath(subLocation, storageLocations)}
                        />
                      )),
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}
        </section>

        <p className="text-xs text-base-content/50">
          Bestände verwaltest du pro Teil auf der{" "}
          <Link to="/parts" className="underline">
            Teile-Seite
          </Link>
          .
        </p>
      </div>

      {/* Print: just this location's label */}
      <div className="hidden print:block">
        <div className="max-w-[9cm]">
          <StorageLocationLabel
            location={location}
            allLocations={storageLocations}
            placeName={place?.name}
          />
        </div>
      </div>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Lagerort bearbeiten"
        description="Name, Zuordnung oder Standort anpassen."
      >
        <StorageLocationForm
          locations={storageLocations}
          places={places}
          initialValues={location}
          onClose={() => setIsEditOpen(false)}
        />
      </Modal>

      <DeleteConfirmationDialog
        isOpen={confirmingDelete}
        title="Lagerort löschen"
        description={`"${location.name}" wirklich löschen? Unterorte rücken eine Ebene nach oben, zugeordnete Bestände verlieren ihren Lagerort. Bereits gedruckte QR-Etiketten für diesen Ort werden ungültig.`}
        onConfirm={() => {
          const formData = new FormData();
          formData.append("intent", "deleteLocation");
          submit(formData, { method: "post" });
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
