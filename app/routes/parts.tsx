import { data, Link, useActionData, useSubmit } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Archive,
  Camera,
  Globe,
  Layers,
  Lock,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import type { Route } from "./+types/parts";
import { requireUser } from "~/services/auth";
import { ApiError } from "~/utils/backend";
import {
  createPart,
  createPartConsumption,
  createPartStock,
  createStorageLocation,
  deletePart,
  deletePartConsumption,
  deletePartImage,
  deletePartStock,
  fetchModelSeries,
  fetchPartConsumptions,
  fetchParts,
  fetchPartStocks,
  fetchPublicParts,
  fetchStorageLocations,
  updatePart,
  updatePartStock,
  uploadPartImage,
} from "~/services/parts";
import { getBackendAssetUrl } from "~/utils/backend";
import type { Part, PartStock, PublicPart } from "~/types/parts";
import { seriesNames, storageLocationPath } from "~/utils/parts";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { PartForm } from "~/components/part-form";
import { PartStockForm } from "~/components/part-stock-form";
import { PartConsumptionForm } from "~/components/part-consumption-form";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { toast } from "~/hooks/use-toast";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Teile - Moto Manager" },
    { name: "description", content: "Ersatzteil-Bestand, Verbrauch und öffentliche Teile." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);

  const [parts, modelSeries, storageLocations, publicParts, stocks, consumptions] =
    await Promise.all([
      fetchParts(token),
      fetchModelSeries(token),
      fetchStorageLocations(token),
      fetchPublicParts(token).catch(() => [] as PublicPart[]),
      fetchPartStocks(token),
      fetchPartConsumptions(token),
    ]);

  return data({ parts, modelSeries, storageLocations, publicParts, stocks, consumptions });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  const optionalString = (key: string): string | null => {
    const value = formData.get(key);
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  try {
    if (intent === "createPart" || intent === "updatePart") {
      const partNumber = optionalString("partNumber");
      const name = optionalString("name");
      if (!partNumber || !name) {
        return data({ error: "Bitte Teilenummer und Bezeichnung angeben." }, { status: 400 });
      }
      const values = {
        partNumber,
        name,
        manufacturer: optionalString("manufacturer") ?? "BMW",
        description: optionalString("description"),
        isPublic: formData.get("isPublic") === "true",
        seriesIds: formData.getAll("seriesIds").map(Number).filter(Number.isFinite),
      };
      if (intent === "createPart") {
        // Creating a part always records its first stock entry — validate the
        // stock fields BEFORE creating the part so a bad quantity can't leave
        // an empty part behind.
        const quantity = Number(formData.get("quantity"));
        if (!Number.isInteger(quantity) || quantity < 1) {
          return data({ error: "Bitte eine gültige Menge angeben." }, { status: 400 });
        }
        const priceRaw = optionalString("price");
        const price = priceRaw != null ? Number(priceRaw) : null;
        if (price != null && !Number.isFinite(price)) {
          return data({ error: "Preis ist ungültig." }, { status: 400 });
        }
        const selectedLocationRaw = optionalString("storageLocationId");
        let storageLocationId = selectedLocationRaw != null ? Number(selectedLocationRaw) : null;
        const newLocationName = optionalString("newStorageLocation");

        const created = await createPart(token, values);
        try {
          if (newLocationName) {
            const location = await createStorageLocation(token, {
              name: newLocationName,
              parentId: storageLocationId,
            });
            storageLocationId = location.id;
          }
          await createPartStock(token, {
            partId: created.id,
            quantity,
            price,
            currency: price != null ? optionalString("currency") : null,
            purchaseDate: optionalString("purchaseDate"),
            storageLocationId,
          });
        } catch (stockError) {
          if (stockError instanceof Response) throw stockError;
          // The part exists at this point; report the partial result instead
          // of pretending nothing happened.
          return data({
            success: true,
            intent,
            error:
              "Teil erstellt, aber der Bestand konnte nicht angelegt werden — bitte im Teil nachtragen.",
          });
        }
      } else {
        const partId = Number(formData.get("partId"));
        if (!partId) return data({ error: "Teil-ID fehlt." }, { status: 400 });
        await updatePart(token, partId, values);
      }
      return data({ success: true, intent });
    }

    if (intent === "deletePart") {
      const partId = Number(formData.get("partId"));
      if (!partId) return data({ error: "Teil-ID fehlt." }, { status: 400 });
      const deleted = await deletePart(token, partId);
      if (!deleted) return data({ error: "Teil konnte nicht gelöscht werden." }, { status: 404 });
      return data({ success: true, intent });
    }

    if (intent === "createStock" || intent === "updateStock") {
      const partId = Number(formData.get("partId"));
      const quantity = Number(formData.get("quantity"));
      if (!partId || !Number.isInteger(quantity) || quantity < 1) {
        return data({ error: "Bitte eine gültige Menge angeben." }, { status: 400 });
      }
      const priceRaw = optionalString("price");
      const price = priceRaw != null ? Number(priceRaw) : null;
      if (price != null && !Number.isFinite(price)) {
        return data({ error: "Preis ist ungültig." }, { status: 400 });
      }

      // An inline "Neuer Lagerort" wins; a selected location becomes its parent.
      const selectedLocationRaw = optionalString("storageLocationId");
      let storageLocationId = selectedLocationRaw != null ? Number(selectedLocationRaw) : null;
      const newLocationName = optionalString("newStorageLocation");
      if (newLocationName) {
        const created = await createStorageLocation(token, {
          name: newLocationName,
          parentId: storageLocationId,
        });
        storageLocationId = created.id;
      }

      const values = {
        quantity,
        price,
        currency: price != null ? optionalString("currency") : null,
        purchaseDate: optionalString("purchaseDate"),
        storageLocationId,
        notes: optionalString("notes"),
      };
      if (intent === "createStock") {
        await createPartStock(token, { partId, ...values });
      } else {
        const stockId = Number(formData.get("stockId"));
        if (!stockId) return data({ error: "Bestand-ID fehlt." }, { status: 400 });
        await updatePartStock(token, stockId, values);
      }
      return data({ success: true, intent });
    }

    if (intent === "deleteStock") {
      const stockId = Number(formData.get("stockId"));
      if (!stockId) return data({ error: "Bestand-ID fehlt." }, { status: 400 });
      const deleted = await deletePartStock(token, stockId);
      if (!deleted) return data({ error: "Bestand konnte nicht gelöscht werden." }, { status: 404 });
      return data({ success: true, intent });
    }

    if (intent === "createConsumption") {
      const partId = Number(formData.get("partId"));
      const quantity = Number(formData.get("quantity"));
      if (!partId || !Number.isInteger(quantity) || quantity < 1) {
        return data({ error: "Bitte eine gültige Menge angeben." }, { status: 400 });
      }
      await createPartConsumption(token, {
        partId,
        quantity,
        date: optionalString("date"),
        notes: optionalString("notes"),
      });
      return data({ success: true, intent });
    }

    if (intent === "uploadImage") {
      const partId = Number(formData.get("partId"));
      const image = formData.get("image");
      if (!partId || !(image instanceof File) || image.size === 0) {
        return data({ error: "Bitte ein Bild auswählen." }, { status: 400 });
      }
      if (!image.type.startsWith("image/")) {
        return data({ error: "Bitte eine Bilddatei auswählen." }, { status: 400 });
      }
      await uploadPartImage(token, partId, image);
      return data({ success: true, intent });
    }

    if (intent === "deleteImage") {
      const partId = Number(formData.get("partId"));
      if (!partId) return data({ error: "Teil-ID fehlt." }, { status: 400 });
      await deletePartImage(token, partId);
      return data({ success: true, intent });
    }

    if (intent === "deleteConsumption") {
      const consumptionId = Number(formData.get("consumptionId"));
      if (!consumptionId) return data({ error: "Verbrauch-ID fehlt." }, { status: 400 });
      const deleted = await deletePartConsumption(token, consumptionId);
      if (!deleted) {
        return data({ error: "Verbrauch konnte nicht gelöscht werden." }, { status: 404 });
      }
      return data({ success: true, intent });
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof ApiError) {
      // Translate the two known 400s; fall back to the server message.
      const message = error.message.includes("Not enough stock")
        ? "Nicht genug Bestand für diesen Verbrauch."
        : error.message.includes("already exists")
          ? "Ein Teil mit dieser Teilenummer und Bezeichnung existiert bereits."
          : error.message;
      return data({ error: message }, { status: error.status || 400 });
    }
    throw error;
  }

  return null;
}

const SUCCESS_TOASTS: Record<string, string> = {
  createPart: "Teil erstellt",
  updatePart: "Teil aktualisiert",
  deletePart: "Teil gelöscht",
  createStock: "Bestand hinzugefügt",
  updateStock: "Bestand aktualisiert",
  deleteStock: "Bestand gelöscht",
  createConsumption: "Verbrauch erfasst",
  deleteConsumption: "Verbrauch gelöscht — Bestand zurückgebucht",
  uploadImage: "Bild gespeichert",
  deleteImage: "Bild entfernt",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso.slice(0, 10));
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("de-CH");
}

export default function PartsPage({ loaderData }: Route.ComponentProps) {
  const { parts, modelSeries, storageLocations, publicParts, stocks, consumptions } = loaderData;
  const actionData = useActionData<typeof clientAction>();
  const submit = useSubmit();

  const [tab, setTab] = useState<"mine" | "public">("mine");
  const [search, setSearch] = useState("");
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<PartStock | null>(null);
  const [isAddConsumptionOpen, setIsAddConsumptionOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // The detail view derives from loader data so it refreshes after actions.
  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );
  const selectedStocks = useMemo(
    () => stocks.filter((stock) => stock.partId === selectedPartId),
    [stocks, selectedPartId],
  );
  const selectedConsumptions = useMemo(
    () => consumptions.filter((consumption) => consumption.partId === selectedPartId),
    [consumptions, selectedPartId],
  );

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      const message = SUCCESS_TOASTS[intent];
      if (message) toast.success(message);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddPartOpen(false);
      setEditingPart(null);
      setIsAddStockOpen(false);
      setEditingStock(null);
      setIsAddConsumptionOpen(false);
      if (intent === "deletePart") {
        setDeletingPart(null);
        setSelectedPartId(null);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [actionData]);

  const query = search.trim().toLowerCase();
  const filteredParts = query
    ? parts.filter(
        (part) =>
          part.name.toLowerCase().includes(query) ||
          part.partNumber.toLowerCase().includes(query),
      )
    : parts;
  const filteredPublicParts = query
    ? publicParts.filter(
        (part) =>
          part.name.toLowerCase().includes(query) ||
          part.partNumber.toLowerCase().includes(query),
      )
    : publicParts;

  const handleDeletePart = () => {
    if (!deletingPart) return;
    const formData = new FormData();
    formData.append("intent", "deletePart");
    formData.append("partId", String(deletingPart.id));
    submit(formData, { method: "post" });
  };

  const submitSimple = (fields: Record<string, string>) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.append(key, value);
    submit(formData, { method: "post" });
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-base-content dark:text-white">
            Teile
          </h1>
          <p className="mt-1 text-sm text-base-content/65">
            Ersatzteil-Katalog mit Bestand, Verbrauch und öffentlichen Teilen anderer Nutzer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/model-series"
            className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Modellkatalog
          </Link>
          <Link
            to="/storage-locations"
            className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Lagerorte
          </Link>
          <button
            onClick={() => setIsAddPartOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Teil hinzufügen</span>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-sm border border-base-content/15 bg-base-100 p-0.5 dark:border-navy-700 dark:bg-navy-800">
          {(
            [
              { value: "mine", label: `Meine Teile (${parts.length})` },
              { value: "public", label: `Öffentlich (${publicParts.length})` },
            ] as const
          ).map((segment) => (
            <button
              key={segment.value}
              type="button"
              onClick={() => setTab(segment.value)}
              className={clsx(
                "rounded-sm px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                tab === segment.value
                  ? "bg-primary text-primary-content"
                  : "text-base-content/60 hover:text-base-content dark:text-navy-300",
              )}
            >
              {segment.label}
            </button>
          ))}
        </div>

        <label className="relative block w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name oder Teilenummer …"
            className="block w-full rounded-sm border border-base-300 bg-base-100 py-2.5 pl-9 pr-3 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"
            aria-label="Teile durchsuchen"
          />
        </label>
      </div>

      {tab === "mine" ? (
        filteredParts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={parts.length === 0 ? "Keine Teile erfasst" : "Keine Treffer"}
            description={
              parts.length === 0
                ? "Lege dein erstes Ersatzteil an — Bestand und Verbrauch werden automatisch geführt."
                : "Kein Teil passt zur Suche."
            }
            action={
              parts.length === 0 ? (
                <button
                  onClick={() => setIsAddPartOpen(true)}
                  className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Erstes Teil erstellen
                  <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredParts.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedPartId(part.id)}
                className="text-left"
              >
                <Card className="h-full px-4 py-3.5 transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30">
                  <div className="flex items-start justify-between gap-3">
                    {part.image && (
                      <img
                        src={`${getBackendAssetUrl(part.image)}?width=96`}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-sm border border-base-300 object-cover dark:border-navy-700"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-base-content dark:text-white">
                          {part.name}
                        </h3>
                        {part.isPublic ? (
                          <Globe className="h-3 w-3 shrink-0 text-success" aria-label="Öffentlich" />
                        ) : (
                          <Lock className="h-3 w-3 shrink-0 text-base-content/35" aria-label="Privat" />
                        )}
                      </div>
                      <p className="truncate font-mono text-[11px] text-base-content/60 dark:text-navy-400">
                        {part.partNumber}
                      </p>
                      <p className="truncate text-[11px] text-base-content/50">
                        {[part.manufacturer, ...seriesNames(part.seriesIds, modelSeries).slice(0, 2)].join(
                          " · ",
                        )}
                        {part.seriesIds.length > 2 && ` +${part.seriesIds.length - 2}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={clsx(
                          "font-numeric text-2xl font-semibold leading-none",
                          part.onHand > 0
                            ? "text-primary"
                            : "text-base-content/35 dark:text-navy-500",
                        )}
                      >
                        {part.onHand}
                      </p>
                      <p className="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                        Bestand
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )
      ) : filteredPublicParts.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Keine öffentlichen Teile"
          description="Andere Nutzer haben noch keine passenden Teile geteilt."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPublicParts.map((part) => (
            <Card key={part.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                {part.image && (
                  <img
                    src={`${getBackendAssetUrl(part.image)}?width=96`}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-sm border border-base-300 object-cover dark:border-navy-700"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="truncate text-sm font-semibold text-base-content dark:text-white">
                    {part.name}
                  </h3>
                  <p className="truncate font-mono text-[11px] text-base-content/60 dark:text-navy-400">
                    {part.partNumber}
                  </p>
                  <p className="truncate text-[11px] text-base-content/50">
                    von {part.ownerName}
                    {part.seriesIds.length > 0 &&
                      ` · ${seriesNames(part.seriesIds, modelSeries).slice(0, 2).join(", ")}`}
                  </p>
                  {part.description && (
                    <p className="truncate text-[11px] text-base-content/50">{part.description}</p>
                  )}
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-sm px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
                    part.hasStock
                      ? "bg-success/15 text-success"
                      : "bg-base-200 text-base-content/50 dark:bg-navy-800 dark:text-navy-400",
                  )}
                >
                  {part.hasStock ? `Auf Lager (${part.totalQuantity})` : "Nicht auf Lager"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Part detail */}
      <Modal
        isOpen={selectedPart != null}
        onClose={() => setSelectedPartId(null)}
        title={selectedPart?.name ?? ""}
        description={selectedPart ? `${selectedPart.manufacturer} · ${selectedPart.partNumber}` : undefined}
        code="TEIL"
      >
        {selectedPart && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
                    selectedPart.isPublic
                      ? "bg-success/15 text-success"
                      : "bg-base-200 text-base-content/55 dark:bg-navy-800 dark:text-navy-300",
                  )}
                >
                  {selectedPart.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {selectedPart.isPublic ? "Öffentlich" : "Privat"}
                </span>
                {seriesNames(selectedPart.seriesIds, modelSeries).map((name) => (
                  <span
                    key={name}
                    className="rounded-sm bg-base-200 px-2 py-1 text-[10px] font-semibold text-base-content/70 dark:bg-navy-800 dark:text-navy-200"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p
                    className={clsx(
                      "font-numeric text-2xl font-semibold leading-none",
                      selectedPart.onHand > 0 ? "text-primary" : "text-base-content/35",
                    )}
                  >
                    {selectedPart.onHand}
                  </p>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Auf Lager
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPart(selectedPart)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/65 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Bearbeiten
                </button>
              </div>
            </div>

            {selectedPart.description && (
              <p className="text-sm text-base-content/70">{selectedPart.description}</p>
            )}

            {/* Bild */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="label-tag">
                  <span>Bild</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/65 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                  >
                    <Camera className="h-3 w-3" aria-hidden="true" />
                    {selectedPart.image ? "Ersetzen" : "Hochladen"}
                  </button>
                  {selectedPart.image && (
                    <button
                      type="button"
                      onClick={() =>
                        submitSimple({ intent: "deleteImage", partId: String(selectedPart.id) })
                      }
                      aria-label="Bild entfernen"
                      className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/65 transition-all hover:border-error/50 hover:text-error dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Teilebild auswählen"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !selectedPart) return;
                  const formData = new FormData();
                  formData.append("intent", "uploadImage");
                  formData.append("partId", String(selectedPart.id));
                  formData.append("image", file);
                  submit(formData, { method: "post", encType: "multipart/form-data" });
                  event.target.value = "";
                }}
              />
              {selectedPart.image ? (
                <a
                  href={getBackendAssetUrl(selectedPart.image) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  title="Bild in voller Grösse öffnen"
                >
                  <img
                    src={`${getBackendAssetUrl(selectedPart.image)}?width=640`}
                    alt={`Bild von ${selectedPart.name}`}
                    className="max-h-56 w-full rounded-sm border border-base-300 object-contain dark:border-navy-700"
                  />
                </a>
              ) : (
                <p className="text-sm text-base-content/55">
                  Noch kein Bild — ein Foto hilft beim Wiederfinden im Regal.
                </p>
              )}
            </section>

            {/* Bestand */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="label-tag">
                  <span>Bestand</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/65 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Hinzufügen
                </button>
              </div>
              {selectedStocks.length === 0 ? (
                <p className="text-sm text-base-content/55">Noch kein Bestand erfasst.</p>
              ) : (
                <div className="divide-y divide-base-200 rounded-sm border border-base-300 dark:divide-navy-700 dark:border-navy-700">
                  {selectedStocks.map((stock) => {
                    const location = storageLocations.find(
                      (candidate) => candidate.id === stock.storageLocationId,
                    );
                    return (
                      <div key={stock.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm text-base-content dark:text-white">
                            <span className="font-numeric font-semibold text-primary">
                              {stock.quantity}×
                            </span>{" "}
                            {stock.price != null
                              ? `${stock.currency ?? "CHF"} ${stock.price.toFixed(2)}`
                              : "ohne Preis"}
                            <span className="text-base-content/50"> · {formatDate(stock.purchaseDate)}</span>
                          </p>
                          <p className="truncate text-[11px] text-base-content/50">
                            {location ? storageLocationPath(location, storageLocations) : "Kein Lagerort"}
                            {stock.notes ? ` · ${stock.notes}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingStock(stock)}
                          aria-label="Bestand bearbeiten"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content dark:hover:bg-navy-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Verbrauch */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="label-tag">
                  <span>Verbrauch</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddConsumptionOpen(true)}
                  disabled={selectedPart.onHand < 1}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/65 transition-all hover:border-base-content/35 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                  <Minus className="h-3 w-3" aria-hidden="true" />
                  Erfassen
                </button>
              </div>
              {selectedConsumptions.length === 0 ? (
                <p className="text-sm text-base-content/55">
                  Noch kein Verbrauch erfasst. Teile lassen sich auch direkt beim Erfassen einer
                  Wartung verbuchen.
                </p>
              ) : (
                <div className="divide-y divide-base-200 rounded-sm border border-base-300 dark:divide-navy-700 dark:border-navy-700">
                  {selectedConsumptions.map((consumption) => (
                    <div
                      key={consumption.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-base-content dark:text-white">
                          <span className="font-numeric font-semibold text-error">
                            −{consumption.quantity}
                          </span>
                          <span className="text-base-content/50"> · {formatDate(consumption.date)}</span>
                          {consumption.maintenanceRecordId != null && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 align-middle font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-base-content/55 dark:bg-navy-800 dark:text-navy-300">
                              <Wrench className="h-2.5 w-2.5" />
                              Wartung
                            </span>
                          )}
                        </p>
                        {consumption.notes && (
                          <p className="truncate text-[11px] text-base-content/50">{consumption.notes}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          submitSimple({
                            intent: "deleteConsumption",
                            consumptionId: String(consumption.id),
                          })
                        }
                        className="shrink-0 rounded-sm border border-base-content/15 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-base-content/55 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300"
                      >
                        Zurückbuchen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>

      {/* Add / edit part */}
      <Modal
        isOpen={isAddPartOpen}
        onClose={() => setIsAddPartOpen(false)}
        title="Teil hinzufügen"
        description="Neues Ersatzteil anlegen — inklusive erstem Bestand."
      >
        <PartForm
          modelSeries={modelSeries}
          storageLocations={storageLocations}
          onClose={() => setIsAddPartOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={editingPart != null}
        onClose={() => setEditingPart(null)}
        title="Teil bearbeiten"
        description="Teiledaten und Baureihen anpassen."
      >
        {editingPart && (
          <PartForm
            initialValues={editingPart}
            modelSeries={modelSeries}
            onClose={() => setEditingPart(null)}
            onDelete={(part) => setDeletingPart(part)}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={deletingPart != null}
        title="Teil löschen"
        description={`Möchtest du das Teil "${deletingPart?.name}" wirklich löschen? Bestand und Verbrauch werden ebenfalls entfernt.`}
        onConfirm={handleDeletePart}
        onCancel={() => setDeletingPart(null)}
      />

      {/* Add / edit stock */}
      <Modal
        isOpen={isAddStockOpen && selectedPart != null}
        onClose={() => setIsAddStockOpen(false)}
        title="Bestand hinzufügen"
        description={selectedPart ? `Zukauf für ${selectedPart.name} erfassen.` : undefined}
      >
        {selectedPart && (
          <PartStockForm
            part={selectedPart}
            storageLocations={storageLocations}
            onClose={() => setIsAddStockOpen(false)}
          />
        )}
      </Modal>

      <Modal
        isOpen={editingStock != null && selectedPart != null}
        onClose={() => setEditingStock(null)}
        title="Bestand bearbeiten"
        description={selectedPart ? `Eintrag für ${selectedPart.name} anpassen.` : undefined}
      >
        {selectedPart && editingStock && (
          <PartStockForm
            part={selectedPart}
            storageLocations={storageLocations}
            initialValues={editingStock}
            onClose={() => setEditingStock(null)}
            onDelete={(stock) => {
              submitSimple({ intent: "deleteStock", stockId: String(stock.id) });
            }}
          />
        )}
      </Modal>

      {/* Manual consumption */}
      <Modal
        isOpen={isAddConsumptionOpen && selectedPart != null}
        onClose={() => setIsAddConsumptionOpen(false)}
        title="Verbrauch erfassen"
        description={
          selectedPart
            ? `${selectedPart.name} — ${selectedPart.onHand} auf Lager.`
            : undefined
        }
      >
        {selectedPart && (
          <PartConsumptionForm part={selectedPart} onClose={() => setIsAddConsumptionOpen(false)} />
        )}
      </Modal>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
