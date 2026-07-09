import { data, Link, redirect, useActionData, useSubmit } from "react-router";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Camera,
  ChevronRight,
  Globe,
  Lock,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  Recycle,
  Trash2,
  Wrench,
} from "lucide-react";
import type { Route } from "./+types/parts.detail";
import { requireUser } from "~/services/auth";
import { ApiError } from "~/utils/backend";
import {
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
  fetchStorageLocations,
  updatePart,
  updatePartStock,
  uploadPartImage,
} from "~/services/parts";
import { getBackendAssetUrl } from "~/utils/backend";
import type {
  ModelSeries,
  PartConsumption,
  PartStock,
  StorageLocation,
} from "~/types/parts";
import { storageLocationPath } from "~/utils/parts";
import { DEFAULT_CURRENCY_CODE, findCurrencyPreset } from "~/constants";
import { seriesPath } from "~/utils/series";
import { Card, CardAction, CardBody, CardHeading } from "~/components/card";
import { Modal } from "~/components/modal";
import { PartForm } from "~/components/part-form";
import { PartStockForm } from "~/components/part-stock-form";
import { PartConsumptionForm } from "~/components/part-consumption-form";
import { PartLabel } from "~/components/part-label";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { toast } from "~/hooks/use-toast";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.part) {
    return [{ title: "Teil - Moto Manager" }];
  }
  return [
    { title: `${data.part.name} - Moto Manager` },
    { name: "description", content: `Ersatzteil ${data.part.partNumber} verwalten.` },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const partId = Number(params.id);
  if (!Number.isFinite(partId)) {
    throw new Response("Invalid part ID", { status: 400 });
  }

  const [parts, modelSeries, storageLocations, stocks, consumptions] = await Promise.all([
    fetchParts(token),
    fetchModelSeries(token).catch(() => [] as ModelSeries[]),
    fetchStorageLocations(token).catch(() => [] as StorageLocation[]),
    fetchPartStocks(token).catch(() => [] as PartStock[]),
    fetchPartConsumptions(token).catch(() => [] as PartConsumption[]),
  ]);
  const part = parts.find((candidate) => candidate.id === partId);
  if (!part) {
    throw new Response("Teil nicht gefunden.", { status: 404 });
  }

  return data({ part, modelSeries, storageLocations, stocks, consumptions });
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const partId = Number(params.id);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  const optionalString = (key: string): string | null => {
    const value = formData.get(key);
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  try {
    if (intent === "updatePart") {
      const partNumber = optionalString("partNumber");
      const name = optionalString("name");
      if (!partNumber || !name) {
        return data({ error: "Bitte Teilenummer und Bezeichnung angeben." }, { status: 400 });
      }
      await updatePart(token, partId, {
        partNumber,
        name,
        manufacturer: optionalString("manufacturer") ?? "BMW",
        description: optionalString("description"),
        isPublic: formData.get("isPublic") === "true",
        seriesIds: formData.getAll("seriesIds").map(Number).filter(Number.isFinite),
      });
      return data({ success: true, intent });
    }

    if (intent === "deletePart") {
      const deleted = await deletePart(token, partId);
      if (!deleted) return data({ error: "Teil konnte nicht gelöscht werden." }, { status: 404 });
      return redirect("/parts");
    }

    if (intent === "createStock" || intent === "updateStock") {
      const quantity = Number(formData.get("quantity"));
      if (!Number.isInteger(quantity) || quantity < 1) {
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
        isUsed: formData.get("isUsed") === "true",
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
      const quantity = Number(formData.get("quantity"));
      if (!Number.isInteger(quantity) || quantity < 1) {
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

    if (intent === "deleteConsumption") {
      const consumptionId = Number(formData.get("consumptionId"));
      if (!consumptionId) return data({ error: "Verbrauch-ID fehlt." }, { status: 400 });
      const deleted = await deletePartConsumption(token, consumptionId);
      if (!deleted) {
        return data({ error: "Verbrauch konnte nicht gelöscht werden." }, { status: 404 });
      }
      return data({ success: true, intent });
    }

    if (intent === "uploadImage") {
      const image = formData.get("image");
      if (!(image instanceof File) || image.size === 0) {
        return data({ error: "Bitte ein Bild auswählen." }, { status: 400 });
      }
      if (!image.type.startsWith("image/")) {
        return data({ error: "Bitte eine Bilddatei auswählen." }, { status: 400 });
      }
      await uploadPartImage(token, partId, image);
      return data({ success: true, intent });
    }

    if (intent === "deleteImage") {
      await deletePartImage(token, partId);
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

  return data({ error: "Unbekannte Aktion." }, { status: 400 });
}

const SUCCESS_TOASTS: Record<string, string> = {
  updatePart: "Teil aktualisiert",
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

export default function PartDetailPage({ loaderData }: Route.ComponentProps) {
  const { part, modelSeries, storageLocations, stocks, consumptions } = loaderData;
  const actionData = useActionData<{ success?: boolean; intent?: string; error?: string }>();
  const submit = useSubmit();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<PartStock | null>(null);
  const [isAddConsumptionOpen, setIsAddConsumptionOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const partStocks = stocks.filter((stock) => stock.partId === part.id);
  const partConsumptions = consumptions.filter(
    (consumption) => consumption.partId === part.id,
  );

  // Lager-Bilanz for the hero ledger: purchased − consumed = on hand.
  const totalPurchased = partStocks.reduce((sum, stock) => sum + stock.quantity, 0);
  const totalConsumed = partConsumptions.reduce((sum, entry) => sum + entry.quantity, 0);
  // Purchase value across all stock entries, normalized to CHF. Entries keep
  // their full price after consumption (consumption is not tied to entries),
  // so this is what was SPENT on the part, hence "Einkaufswert".
  const totalStockValue = partStocks.reduce((sum, stock) => {
    if (stock.normalizedPrice != null) return sum + stock.normalizedPrice;
    if (stock.price == null) return sum;
    const factor =
      findCurrencyPreset(stock.currency ?? DEFAULT_CURRENCY_CODE)?.conversionFactor ?? 1;
    return sum + stock.price * factor;
  }, 0);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      const message = SUCCESS_TOASTS[intent];
      if (message) toast.success(message);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddStockOpen(false);
      setEditingStock(null);
      setIsAddConsumptionOpen(false);
      if (intent === "updatePart") setIsEditing(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [actionData]);

  const submitSimple = (fields: Record<string, string>) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }
    submit(formData, { method: "post" });
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      <div className="space-y-6 print:hidden">
        {/* Breadcrumb + page actions. The part's identity lives in the
            Katalogblatt hero below, so this row stays a quiet toolbar. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Teile-Pfad"
            className="flex flex-wrap items-center gap-1 text-xs text-base-content/55"
          >
            <Link to="/parts" className="hover:text-base-content hover:underline">
              Teile
            </Link>
            <span className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-base-content/80">{part.name}</span>
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Bearbeiten
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-error/50 hover:text-error dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Löschen
              </button>
          </div>
        </div>

        {actionData && "error" in actionData && actionData.error && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
              ERR
            </span>
            <span>{actionData.error}</span>
          </div>
        )}

        {isEditing ? (
          /* ------------------------------- Edit mode ------------------------------ */
          <section className="space-y-2">
            <h2 className="label-tag">
              <span>Teil bearbeiten</span>
            </h2>
            <Card className="px-5 py-5">
              <PartForm
                initialValues={part}
                modelSeries={modelSeries}
                storageLocations={storageLocations}
                onClose={() => setIsEditing(false)}
              />
            </Card>
          </section>
        ) : (
          /* ------------------------------- View mode ------------------------------ */
          <>
        {/* Katalogblatt — image plate, identity, description and the stock
            ledger on one sheet, like a figure in a parts catalog. */}
        <section aria-label="Teilübersicht">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Teilebild auswählen"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("intent", "uploadImage");
              formData.append("image", file);
              submit(formData, { method: "post", encType: "multipart/form-data" });
              event.target.value = "";
            }}
          />
          <Card topStripe="flag">
            <div className="flex flex-col md:flex-row">
              {/* Abbildung — catalog plate on workshop paper */}
              <figure className="flex flex-col border-b border-base-200 md:w-[38%] md:shrink-0 md:border-b-0 md:border-r dark:border-navy-700">
                {part.image ? (
                  <a
                    href={getBackendAssetUrl(part.image) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    title="Bild in voller Grösse öffnen"
                    className="paper corner-ticks group grid flex-1 place-items-center p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  >
                    <img
                      src={`${getBackendAssetUrl(part.image)}?width=800`}
                      alt={`Bild von ${part.name}`}
                      className="max-h-60 w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.02] md:max-h-72"
                    />
                  </a>
                ) : (
                  <div className="paper corner-ticks grid flex-1 place-items-center px-6 py-10">
                    <div className="flex max-w-[24ch] flex-col items-center gap-3 text-center">
                      <Package className="h-8 w-8 text-base-content/25" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-base-content/55">
                        Noch kein Bild — ein Foto hilft beim Wiederfinden im Regal.
                      </p>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/20 bg-base-100 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/40 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-800 dark:text-navy-200"
                      >
                        <Camera className="h-3 w-3" aria-hidden="true" />
                        Foto hochladen
                      </button>
                    </div>
                  </div>
                )}
                <figcaption className="flex min-h-9 items-center justify-between gap-2 border-t border-base-200 py-1 pl-3 pr-1.5 dark:border-navy-700">
                  <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                    Abb. · {part.partNumber}
                  </span>
                  {part.image && (
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Bild ersetzen"
                        className="grid h-7 w-7 place-items-center rounded-sm text-base-content/45 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitSimple({ intent: "deleteImage" })}
                        aria-label="Bild entfernen"
                        className="grid h-7 w-7 place-items-center rounded-sm text-base-content/45 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </figcaption>
              </figure>

              {/* Identität, Beschreibung, Lager-Bilanz */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 px-5 pb-5 pt-4">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="font-mono text-xs font-semibold tracking-[0.06em] text-base-content/75 dark:text-navy-200">
                      {part.partNumber}
                    </span>
                    <span aria-hidden="true" className="h-3 w-px bg-base-content/20" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55">
                      {part.manufacturer}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]",
                        part.isPublic
                          ? "bg-success/15 text-success"
                          : "bg-base-200 text-base-content/55 dark:bg-navy-800 dark:text-navy-300",
                      )}
                    >
                      {part.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {part.isPublic ? "Öffentlich" : "Privat"}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-3xl uppercase leading-[1.05] tracking-wide text-base-content dark:text-white md:text-4xl">
                    {part.name}
                  </h1>
                  {part.description ? (
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-base-content/75">
                      {part.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-base-content/45">
                      Keine Beschreibung — über Bearbeiten ergänzen.
                    </p>
                  )}
                </div>

                {/* Lager-Bilanz: Zugekauft − Verbraucht = Auf Lager, plus der
                    Einkaufswert über alle Bestandseinträge. */}
                <dl className="flex flex-wrap divide-x divide-base-200 border-t border-base-200 dark:divide-navy-700 dark:border-navy-700">
                  <div className="flex-1 px-4 py-3">
                    <dd className="font-numeric text-xl font-semibold leading-none text-base-content/70">
                      {totalPurchased}
                    </dd>
                    <dt className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Zugekauft
                    </dt>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <dd className="font-numeric text-xl font-semibold leading-none text-base-content/70">
                      {totalConsumed > 0 ? `−${totalConsumed}` : "0"}
                    </dd>
                    <dt className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Verbraucht
                    </dt>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <dd
                      className={clsx(
                        "font-numeric text-xl font-semibold leading-none",
                        part.onHand > 0 ? "text-primary dark:text-primary-light" : "text-base-content/35",
                      )}
                    >
                      {part.onHand}
                    </dd>
                    <dt className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Auf Lager
                    </dt>
                  </div>
                  <div className="flex-1 px-4 py-3">
                    <dd className="whitespace-nowrap font-numeric text-xl font-semibold leading-none text-base-content/70">
                      {totalStockValue > 0 ? totalStockValue.toFixed(2) : "—"}
                    </dd>
                    <dt className="mt-1 whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Einkaufswert CHF
                    </dt>
                  </div>
                </dl>
              </div>
            </div>
          </Card>
        </section>

        {/* Bestand — directly under the Katalogblatt; the working list. */}
        <Card>
          <CardHeading
            code="01"
            title="Bestand"
            meta={
              partStocks.length === 1 ? "1 Eintrag" : `${partStocks.length} Einträge`
            }
            trailing={
              <CardAction onClick={() => setIsAddStockOpen(true)} aria-label="Bestand hinzufügen">
                <Plus className="h-3 w-3" aria-hidden="true" />
                Hinzufügen
              </CardAction>
            }
          />
          {partStocks.length === 0 ? (
            <CardBody>
              <p className="text-sm text-base-content/55">
                Noch kein Bestand erfasst — über Hinzufügen den ersten Zukauf eintragen.
              </p>
            </CardBody>
          ) : (
            <div className="divide-y divide-base-200 dark:divide-navy-700">
              {partStocks.map((stock) => {
                const location = storageLocations.find(
                  (candidate) => candidate.id === stock.storageLocationId,
                );
                return (
                  <div
                    key={stock.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-200/40 dark:hover:bg-navy-700/30"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-primary/10 font-numeric text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-light"
                    >
                      {stock.quantity}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-base-content dark:text-white">
                        <span className="sr-only">{stock.quantity} Stück, </span>
                        {stock.price != null
                          ? `${stock.currency ?? "CHF"} ${(stock.price / stock.quantity).toFixed(2)} / Stück`
                          : "ohne Preis"}
                        {stock.price != null && stock.quantity > 1 && (
                          <span className="text-base-content/50">
                            {` · ${stock.currency ?? "CHF"} ${stock.price.toFixed(2)} gesamt`}
                          </span>
                        )}
                        <span className="text-base-content/50"> · {formatDate(stock.purchaseDate)}</span>
                        {stock.isUsed && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-warning/15 px-1.5 py-0.5 align-middle font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-warning">
                            <Recycle className="h-2.5 w-2.5" />
                            Gebraucht
                          </span>
                        )}
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
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Verbrauch */}
        <Card>
          <CardHeading
            code="02"
            title="Verbrauch"
            meta={
              partConsumptions.length === 1
                ? "1 Eintrag"
                : `${partConsumptions.length} Einträge`
            }
            trailing={
              <button
                type="button"
                onClick={() => setIsAddConsumptionOpen(true)}
                disabled={part.onHand < 1}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25"
              >
                <Minus className="h-3 w-3" aria-hidden="true" />
                Erfassen
              </button>
            }
          />
          {partConsumptions.length === 0 ? (
            <CardBody>
              <p className="text-sm text-base-content/55">
                Noch kein Verbrauch erfasst. Teile lassen sich auch direkt beim Erfassen einer
                Wartung verbuchen.
              </p>
            </CardBody>
          ) : (
            <div className="divide-y divide-base-200 dark:divide-navy-700">
              {partConsumptions.map((consumption) => (
                <div
                  key={consumption.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
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
        </Card>

        {/* Reference row: Kompatibilität + Etikett — quiet lookup info. */}
        <div className="grid items-start gap-6 md:grid-cols-2">
          <Card>
            <CardHeading code="03" title="Kompatibilität" />
            <CardBody className="space-y-2">
              {part.seriesIds.length === 0 ? (
                <p className="text-sm text-base-content/55">
                  Keine Baureihe zugeordnet — über Bearbeiten lassen sich Familie, Serie oder
                  Modell verknüpfen.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {part.seriesIds.map((seriesId) => {
                    const node = modelSeries.find((candidate) => candidate.id === seriesId);
                    if (!node) return null;
                    return (
                      <span
                        key={seriesId}
                        title={seriesPath(node, modelSeries)}
                        className="rounded-sm bg-base-200 px-2 py-1 text-[10px] font-semibold text-base-content/70 dark:bg-navy-800 dark:text-navy-200"
                      >
                        {node.name}
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-base-content/50">
                Gilt jeweils inklusive aller Untereinträge des Modellkatalogs.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeading
              code="04"
              title="Etikett"
              trailing={
                <CardAction onClick={() => window.print()} aria-label="Etikett drucken">
                  <Printer className="h-3 w-3" aria-hidden="true" />
                  Drucken
                </CardAction>
              }
            />
            <CardBody>
              <div className="max-w-sm">
                <PartLabel part={part} modelSeries={modelSeries} />
              </div>
            </CardBody>
          </Card>
        </div>
          </>
        )}
      </div>

      {/* Print: just this part's label */}
      <div className="hidden print:block">
        <div className="max-w-[9cm]">
          <PartLabel part={part} modelSeries={modelSeries} />
        </div>
      </div>

      {/* Add / edit stock */}
      <Modal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        title="Bestand hinzufügen"
        description={`Zukauf für ${part.name} erfassen.`}
      >
        <PartStockForm
          part={part}
          storageLocations={storageLocations}
          onClose={() => setIsAddStockOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={editingStock != null}
        onClose={() => setEditingStock(null)}
        title="Bestand bearbeiten"
        description={`Eintrag für ${part.name} anpassen.`}
      >
        {editingStock && (
          <PartStockForm
            part={part}
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
        isOpen={isAddConsumptionOpen}
        onClose={() => setIsAddConsumptionOpen(false)}
        title="Verbrauch erfassen"
        description={`${part.name} — ${part.onHand} auf Lager.`}
      >
        <PartConsumptionForm part={part} onClose={() => setIsAddConsumptionOpen(false)} />
      </Modal>

      <DeleteConfirmationDialog
        isOpen={confirmingDelete}
        title="Teil löschen"
        description={`Möchtest du das Teil "${part.name}" wirklich löschen? Bestand und Verbrauch werden ebenfalls entfernt.`}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("intent", "deletePart");
          submit(formData, { method: "post" });
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
