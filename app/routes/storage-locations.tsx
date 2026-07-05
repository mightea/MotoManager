import { data, Link, useActionData, useNavigation, useSubmit, Form } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronRight, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import type { Route } from "./+types/storage-locations";
import { requireUser } from "~/services/auth";
import {
  createStorageLocation,
  deleteStorageLocation,
  fetchPartStocks,
  fetchStorageLocations,
  updateStorageLocation,
} from "~/services/parts";
import type { StorageLocation } from "~/types/parts";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { Button } from "~/components/button";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { StorageLocationLabel } from "~/components/storage-location-label";
import { storageLocationPath } from "~/utils/parts";
import { toast } from "~/hooks/use-toast";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Lagerorte - Moto Manager" },
    { name: "description", content: "Lagerorte verwalten und QR-Etiketten drucken." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const [storageLocations, stocks] = await Promise.all([
    fetchStorageLocations(token),
    fetchPartStocks(token),
  ]);
  return data({ storageLocations, stocks });
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

    if (intent === "createLocation") {
      await createStorageLocation(token, { name, parentId });
    } else {
      const locationId = Number(formData.get("locationId"));
      if (!locationId) return data({ error: "Lagerort-ID fehlt." }, { status: 400 });
      // The backend's merge semantics can't clear a parent, so only send it
      // when one is chosen; cycles are rejected server-side.
      await updateStorageLocation(token, locationId, {
        name,
        ...(parentId != null ? { parentId } : {}),
      });
    }
    return data({ success: true, intent });
  }

  if (intent === "deleteLocation") {
    const locationId = Number(formData.get("locationId"));
    if (!locationId) return data({ error: "Lagerort-ID fehlt." }, { status: 400 });
    const deleted = await deleteStorageLocation(token, locationId);
    if (!deleted) {
      return data({ error: "Lagerort konnte nicht gelöscht werden." }, { status: 404 });
    }
    return data({ success: true, intent });
  }

  return null;
}

interface LocationFormProps {
  locations: StorageLocation[];
  initialValues?: StorageLocation | null;
  onClose: () => void;
}

function StorageLocationForm({ locations, initialValues, onClose }: LocationFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  // A location cannot become its own descendant — offer only non-subtree parents.
  const invalidParents = useMemo(() => {
    if (!initialValues) return new Set<number>();
    const invalid = new Set<number>([initialValues.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const location of locations) {
        if (
          location.parentId != null &&
          invalid.has(location.parentId) &&
          !invalid.has(location.id)
        ) {
          invalid.add(location.id);
          changed = true;
        }
      }
    }
    return invalid;
  }, [initialValues, locations]);

  const inputClass =
    "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";

  return (
    <Form method="post" className="space-y-5">
      <input
        type="hidden"
        name="intent"
        value={initialValues ? "updateLocation" : "createLocation"}
      />
      {initialValues && <input type="hidden" name="locationId" value={initialValues.id} />}

      <div className="space-y-1.5">
        <label
          htmlFor="location-name"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
        >
          Name
        </label>
        <input
          type="text"
          name="name"
          id="location-name"
          required
          placeholder="z.B. Regal A, Kiste 3, Garage"
          defaultValue={initialValues?.name}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="location-parent"
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
        >
          Übergeordneter Lagerort
        </label>
        <select
          name="parentId"
          id="location-parent"
          defaultValue={initialValues?.parentId ?? ""}
          className={inputClass}
        >
          <option value="">Kein (oberste Ebene)</option>
          {locations
            .filter((location) => !invalidParents.has(location.id))
            .map((location) => (
              <option key={location.id} value={location.id}>
                {storageLocationPath(location, locations)}
              </option>
            ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Speichern
        </Button>
      </div>
    </Form>
  );
}

export default function StorageLocationsPage({ loaderData }: Route.ComponentProps) {
  const { storageLocations, stocks } = loaderData;
  const actionData = useActionData<typeof clientAction>();
  const submit = useSubmit();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<StorageLocation | null>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      const message: Record<string, string> = {
        createLocation: "Lagerort erstellt",
        updateLocation: "Lagerort aktualisiert",
        deleteLocation: "Lagerort gelöscht",
      };
      if (message[intent]) toast.success(message[intent]);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddOpen(false);
      setEditingLocation(null);
      setDeletingLocation(null);
      /* eslint-enable react-hooks/set-state-in-effect */
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

  const renderTree = (parentId: number | null, depth: number): React.ReactNode => {
    const children = childrenByParent.get(parentId) ?? [];
    return children.map((location) => {
      const stats = statsByLocation.get(location.id);
      return (
        <div key={location.id}>
          <div
            className="flex items-center justify-between gap-3 border-b border-base-200 px-3 py-2.5 transition-colors hover:bg-base-200/50 dark:border-navy-700 dark:hover:bg-navy-700/30"
            style={{ paddingLeft: `${12 + depth * 24}px` }}
          >
            <Link
              to={`/storage-locations/${location.id}`}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <Archive className="h-4 w-4 shrink-0 text-base-content/45" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-base-content dark:text-white">
                {location.name}
              </span>
              {stats && (
                <span className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                  {stats.partIds.size} {stats.partIds.size === 1 ? "Teil" : "Teile"} ·{" "}
                  {stats.quantity} Stk.
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-base-content/30" aria-hidden="true" />
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingLocation(location)}
                aria-label={`${location.name} bearbeiten`}
                className="grid h-8 w-8 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content dark:hover:bg-navy-700"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingLocation(location)}
                aria-label={`${location.name} löschen`}
                className="grid h-8 w-8 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-error dark:hover:bg-navy-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
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
              Inhalt sehen.
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
          Teile ohne Lagerort findest du auf der <Link to="/parts" className="underline">Teile-Seite</Link>.
          Beim Löschen eines Lagerorts rücken Unterorte eine Ebene nach oben; Bestände bleiben
          erhalten und verlieren nur die Zuordnung.
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
            />
          ))}
        </div>
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Lagerort hinzufügen"
        description="Regal, Kiste oder Fach anlegen — optional verschachtelt."
      >
        <StorageLocationForm locations={storageLocations} onClose={() => setIsAddOpen(false)} />
      </Modal>

      <Modal
        isOpen={editingLocation != null}
        onClose={() => setEditingLocation(null)}
        title="Lagerort bearbeiten"
        description="Name oder Zuordnung anpassen."
      >
        {editingLocation && (
          <StorageLocationForm
            locations={storageLocations}
            initialValues={editingLocation}
            onClose={() => setEditingLocation(null)}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={deletingLocation != null}
        title="Lagerort löschen"
        description={`"${deletingLocation?.name}" wirklich löschen? Unterorte rücken nach oben, zugeordnete Bestände verlieren ihren Lagerort.`}
        onConfirm={() => {
          if (!deletingLocation) return;
          const formData = new FormData();
          formData.append("intent", "deleteLocation");
          formData.append("locationId", String(deletingLocation.id));
          submit(formData, { method: "post" });
        }}
        onCancel={() => setDeletingLocation(null)}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
