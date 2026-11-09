import { data, Link, redirect, useActionData, useSubmit } from "react-router";
import { FormattedText } from "~/components/formatted-text";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  Camera,
  ChevronRight,
  Globe,
  Lock,
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
import { ApiError, fetchFromBackend } from "~/utils/backend";
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
  fetchPartIssues,
  fetchParts,
  fetchPartStocks,
  fetchStorageLocations,
  importPartImageFromUrl,
  linkPartToIssue,
  unlinkPartFromIssue,
  updatePart,
  updatePartStock,
  uploadPartImage,
} from "~/services/parts";
import { getBackendAssetUrl } from "~/utils/backend";
import { modelSeriesDisplayName } from "~/types/parts";
import type {
  ModelSeries,
  PartConsumption,
  PartIssueLink,
  PartStock,
  StorageLocation,
} from "~/types/parts";
import { storageLocationPath } from "~/utils/parts";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { maintenanceTypeLabels } from "~/utils/maintenance";
import type { CurrencySetting, Issue, MaintenanceType, Motorcycle } from "~/types/db";
import { getCurrencies } from "~/services/settings";
import { DEFAULT_CURRENCY_CODE, findCurrencyPreset } from "~/constants";
import { seriesMatchesBike, seriesPath } from "~/utils/series";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import { Card, CardAction, CardBody, CardHeading } from "~/components/card";
import { Modal } from "~/components/modal";
import { PartForm } from "~/components/part-form";
import { PartStockForm } from "~/components/part-stock-form";
import { PartConsumptionForm } from "~/components/part-consumption-form";
import { PartLabel } from "~/components/part-label";
import { PartIssueCallout, type IssueCandidate } from "~/components/part-issue-callout";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { toast } from "~/hooks/use-toast";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData || !loaderData.part) {
    return [{ title: "Teil - Moto Manager" }];
  }
  return [
    { title: `${loaderData.part.name} - Moto Manager` },
    { name: "description", content: `Ersatzteil ${loaderData.part.partNumber} verwalten.` },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const partId = Number(params.id);
  if (!Number.isFinite(partId)) {
    throw new Response("Invalid part ID", { status: 400 });
  }

  const [parts, modelSeries, storageLocations, stocks, consumptions, currencies] = await Promise.all([
    fetchParts(token),
    fetchModelSeries(token).catch(() => [] as ModelSeries[]),
    fetchStorageLocations(token).catch(() => [] as StorageLocation[]),
    fetchPartStocks(token).catch(() => [] as PartStock[]),
    fetchPartConsumptions(token).catch(() => [] as PartConsumption[]),
      // Live rates for stock entries without a stored CHF price.
    getCurrencies().catch(() => [] as CurrencySetting[]),
]);
  const part = parts.find((candidate) => candidate.id === partId);
  if (!part) {
    throw new Response("Teil nicht gefunden.", { status: 404 });
  }

  const { linkedIssues, issueCandidates } = await loadIssueLinks(token, part.id, part.seriesIds, modelSeries);

  return data({ part, modelSeries, storageLocations, stocks, consumptions, linkedIssues, issueCandidates, currencies });
}

/**
 * The part's linked defects plus the open issues it could be linked to.
 * `linkedIssues` is null when the backend predates the feature — the callout
 * is hidden then. Any other failure degrades to "nothing linked" rather than
 * blocking the page. Issues are only fetched for active bikes that report
 * open issues, so a typical fleet costs one or two extra requests.
 */
async function loadIssueLinks(
  token: string,
  partId: number,
  partSeriesIds: number[],
  modelSeries: ModelSeries[],
): Promise<{ linkedIssues: PartIssueLink[] | null; issueCandidates: IssueCandidate[] }> {
  let linkedIssues: PartIssueLink[] | null;
  try {
    linkedIssues = await fetchPartIssues(token, partId);
  } catch (error) {
    if (error instanceof Response) throw error;
    return { linkedIssues: null, issueCandidates: [] };
  }
  if (linkedIssues == null) return { linkedIssues: null, issueCandidates: [] };

  const motorcycles = await fetchFromBackend<{ motorcycles: Motorcycle[] }>("/motorcycles", {}, token)
    .then((response) => response.motorcycles ?? [])
    .catch((error) => {
      if (error instanceof Response) throw error;
      return [] as Motorcycle[];
    });
  const withOpenIssues = motorcycles.filter(
    (bike) => bike.status !== "sold" && (bike.openIssues ?? 1) > 0,
  );
  const perBike = await Promise.all(
    withOpenIssues.map((bike) =>
      fetchFromBackend<{ issues: Issue[] }>(`/motorcycles/${bike.id}/issues`, {}, token)
        .then((response) => ({ bike, issues: response.issues ?? [] }))
        .catch((error) => {
          if (error instanceof Response) throw error;
          return { bike, issues: [] as Issue[] };
        }),
    ),
  );

  const issueCandidates: IssueCandidate[] = perBike.flatMap(({ bike, issues }) => {
    const fits =
      bike.seriesId != null && seriesMatchesBike(partSeriesIds, bike.seriesId, modelSeries);
    return issues
      .filter((issue) => issue.status !== "done")
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        priority: issue.priority,
        date: issue.date,
        motorcycleId: bike.id,
        motorcycleLabel: `${bike.make} ${bike.model}`,
        fits,
      }));
  });

  return { linkedIssues, issueCandidates };
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
        // Always sent: "" clears stale formatting, an absent key would keep it.
        descriptionMarkup: optionalString("descriptionMarkup") ?? "",
        // Blank clears the link; the backend treats an absent key as "keep".
        oemPartNumber: optionalString("oemPartNumber") ?? "",
        isPublic: formData.get("isPublic") === "true",
        seriesIds: formData.getAll("seriesIds").map(Number).filter(Number.isFinite),
      });
      // BMWBike enrichment proposes an image only when the part has none.
      const importImageUrl = optionalString("importImageUrl");
      if (importImageUrl) {
        try {
          await importPartImageFromUrl(token, partId, importImageUrl);
        } catch (imageError) {
          if (imageError instanceof Response) throw imageError;
          return data({
            success: true,
            intent,
            error: "Teil aktualisiert, aber das Bild konnte nicht übernommen werden.",
          });
        }
      }
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
        notesMarkup: optionalString("notesMarkup") ?? "",
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

    if (intent === "linkIssue" || intent === "unlinkIssue") {
      const issueId = Number(formData.get("issueId"));
      if (!issueId) return data({ error: "Mangel-ID fehlt." }, { status: 400 });
      if (intent === "linkIssue") await linkPartToIssue(token, issueId, partId);
      else await unlinkPartFromIssue(token, issueId, partId);
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
  linkIssue: "Mit Mangel verknüpft",
  unlinkIssue: "Verknüpfung gelöst",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso.slice(0, 10));
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("de-CH");
}

export default function PartDetailPage({ loaderData }: Route.ComponentProps) {
  const { part, modelSeries, storageLocations, stocks, consumptions, linkedIssues, issueCandidates, currencies } =
    loaderData;
  const actionData = useActionData<{ success?: boolean; intent?: string; error?: string }>();
  const submit = useSubmit();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<PartStock | null>(null);
  const [isAddConsumptionOpen, setIsAddConsumptionOpen] = useState(false);
  // Prefilled note when booking against a linked defect ("Beim Mangel verbuchen").
  const [consumptionNote, setConsumptionNote] = useState<string | undefined>(undefined);
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
    const code = stock.currency ?? DEFAULT_CURRENCY_CODE;
    const factor =
      currencies.find((currency) => currency.code === code)?.conversionFactor ??
      findCurrencyPreset(code)?.conversionFactor ??
      1;
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
      setConsumptionNote(undefined);
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

  // Inline "Kein Lagerort — zuordnen": re-saves the stock entry unchanged
  // except for its location (the update action expects every field).
  const assignLocation = (stock: PartStock, storageLocationId: string) => {
    submitSimple({
      intent: "updateStock",
      stockId: String(stock.id),
      quantity: String(stock.quantity),
      price: stock.price != null ? String(stock.price) : "",
      currency: stock.currency ?? "",
      purchaseDate: stock.purchaseDate ?? "",
      storageLocationId,
      notes: stock.notes ?? "",
      notesMarkup: stock.notesMarkup ?? "",
      isUsed: stock.isUsed ? "true" : "false",
    });
  };

  const sortedLocations = [...storageLocations]
    .map((location) => ({ id: location.id, path: storageLocationPath(location, storageLocations) }))
    .sort((a, b) => a.path.localeCompare(b.path, "de"));

  const compatibility = part.seriesIds
    .map((seriesId) => modelSeries.find((candidate) => candidate.id === seriesId))
    .filter((node): node is ModelSeries => node != null);
  const COMPAT_VISIBLE = 5;

  const stockTone = part.onHand <= 0 ? "empty" : part.onHand === 1 ? "low" : "ok";
  const stats: {
    label: string;
    value: string;
    rail: string;
    valueClass: string;
  }[] = [
    {
      label: "Auf Lager",
      value: formatNumber(part.onHand),
      rail:
        stockTone === "empty"
          ? "bg-accent"
          : stockTone === "low"
            ? "bg-[var(--color-workshop)]"
            : "bg-primary",
      valueClass:
        stockTone === "empty"
          ? "text-error"
          : stockTone === "low"
            ? "text-warning"
            : "text-primary dark:text-primary-light",
    },
    {
      label: "Zugekauft",
      value: formatNumber(totalPurchased),
      rail: "bg-base-300 dark:bg-navy-600",
      valueClass: "text-base-content dark:text-white",
    },
    {
      label: "Verbraucht",
      value: formatNumber(totalConsumed),
      rail: "bg-base-300 dark:bg-navy-600",
      valueClass: "text-base-content dark:text-white",
    },
    {
      label: "Einkaufswert",
      value: totalStockValue > 0 ? formatCurrency(totalStockValue, "CHF") : "—",
      rail: "bg-secondary",
      valueClass: "text-secondary dark:text-white",
    },
  ];

  const outlineButton =
    "inline-flex h-10 items-center gap-2 rounded-sm border border-base-content/20 bg-base-100 px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/80 transition-all hover:border-base-content/40 hover:text-base-content dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200 dark:hover:text-white";

  return (
    <div className="container mx-auto max-w-7xl space-y-5 px-4 pt-0 pb-20 md:p-6 md:pb-12 print:m-0 print:max-w-none print:p-0">
      <div className="space-y-5 print:hidden">
        <nav
          aria-label="Teile-Pfad"
          className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-300"
        >
          <Link to="/parts" className="hover:text-base-content hover:underline dark:hover:text-white">
            Teile
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="min-w-0 truncate text-base-content dark:text-white">{part.name}</span>
        </nav>

        {actionData && "error" in actionData && actionData.error && (
          <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
            <span className="pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
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
        {/* Hero — figure, identity, actions, then the stock ledger tiles. */}
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
          <Card>
            <div className="flex flex-wrap items-start gap-6 p-5">
              <figure className="flex w-full flex-col gap-1.5 sm:w-[220px] sm:shrink-0">
                {part.image ? (
                  <a
                    href={getBackendAssetUrl(part.image) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    title="Bild in voller Grösse öffnen"
                    className="group grid h-40 place-items-center overflow-hidden rounded-sm border border-base-300 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700"
                  >
                    <img
                      src={`${getBackendAssetUrl(part.image)}?width=480`}
                      alt={`Bild von ${part.name}`}
                      className="h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                    />
                  </a>
                ) : (
                  <div className="paper grid h-40 place-items-center rounded-sm border border-dashed border-base-300 px-4 dark:border-navy-700">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Package className="h-6 w-6 text-base-content/30" aria-hidden="true" />
                      <p className="text-xs text-base-content/70">Noch kein Bild</p>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/20 bg-base-100 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/40 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-800 dark:text-navy-200"
                      >
                        <Camera className="h-3 w-3" aria-hidden="true" />
                        Foto hochladen
                      </button>
                    </div>
                  </div>
                )}
                <figcaption className="flex min-h-7 items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-300">
                    Abb. · {part.partNumber}
                  </span>
                  {part.image && (
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Bild ersetzen"
                        className="grid h-7 w-7 place-items-center rounded-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-navy-300 dark:hover:bg-navy-700"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => submitSimple({ intent: "deleteImage" })}
                        aria-label="Bild entfernen"
                        className="grid h-7 w-7 place-items-center rounded-sm text-base-content/60 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-navy-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </figcaption>
              </figure>

              <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
                  <span aria-hidden="true" className="h-px w-6 bg-base-content/40" />
                  <span className="normal-case tracking-[0.06em]">{part.partNumber}</span>
                  <span aria-hidden="true">·</span>
                  {part.manufacturer}
                  {part.oemPartNumber && (
                    <span title="Originale BMW-Teilenummer" className="normal-case tracking-[0.06em]">
                      · BMW-Nr. {part.oemPartNumber}
                    </span>
                  )}
                  <span
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px]",
                      part.isPublic
                        ? "border-success/40 text-success"
                        : "border-base-content/25 text-base-content/70 dark:border-navy-600 dark:text-navy-300",
                    )}
                  >
                    {part.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {part.isPublic ? "Öffentlich" : "Privat"}
                  </span>
                </span>
                <h1 className="font-display text-3xl uppercase leading-[1.05] tracking-wide text-base-content dark:text-white md:text-[2.5rem]">
                  {part.name}
                </h1>
                {part.description ? (
                  <p className="max-w-prose text-sm leading-relaxed text-base-content/75 dark:text-navy-200">
                    <FormattedText description={part.description} markup={part.descriptionMarkup} />
                  </p>
                ) : (
                  <p className="text-sm text-base-content/60 dark:text-navy-400">
                    Keine Beschreibung — über Bearbeiten ergänzen.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setIsEditing(true)} className={outlineButton}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className={clsx(outlineButton, "border-error/40 text-error hover:border-error hover:text-error dark:border-error/40 dark:text-error")}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Löschen
                </button>
              </div>
            </div>

            {/* Lager-Bilanz: Auf Lager = Zugekauft − Verbraucht, plus der
                Einkaufswert über alle Bestandseinträge (CHF-normalisiert;
                Einträge behalten ihren Preis nach dem Verbrauch). */}
            <dl className="grid grid-cols-2 border-t border-base-200 sm:grid-cols-4 dark:border-navy-700">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={clsx(
                    "relative flex flex-col-reverse px-5 py-3.5",
                    index % 2 === 0 && "border-r border-base-200 dark:border-navy-700",
                    index < 2 && "border-b border-base-200 sm:border-b-0 dark:border-navy-700",
                    index === 1 && "sm:border-r",
                  )}
                >
                  <span aria-hidden="true" className={clsx("absolute inset-y-2.5 left-0 w-[3px] rounded-r-sm", stat.rail)} />
                  <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
                    {stat.label}
                  </dt>
                  <dd className={clsx("whitespace-nowrap font-numeric text-2xl font-bold leading-tight", stat.valueClass)}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </section>

        {linkedIssues != null && (
          <PartIssueCallout
            linkedIssues={linkedIssues}
            candidates={issueCandidates}
            onHand={part.onHand}
            onBook={(issue) => {
              setConsumptionNote(`Mangel: ${issue.title}`);
              setIsAddConsumptionOpen(true);
            }}
            onLink={(issueId) => submitSimple({ intent: "linkIssue", issueId: String(issueId) })}
            onUnlink={(issueId) => submitSimple({ intent: "unlinkIssue", issueId: String(issueId) })}
          />
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {/* Bestand — the working list of purchases. */}
            <Card>
              <CardHeading
                code="01"
                title="Bestand"
                meta={partStocks.length === 1 ? "1 Eintrag" : `${partStocks.length} Einträge`}
                trailing={
                  <CardAction onClick={() => setIsAddStockOpen(true)} aria-label="Zukauf erfassen">
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Zukauf
                  </CardAction>
                }
              />
              {partStocks.length === 0 ? (
                <CardBody>
                  <p className="text-sm text-base-content/70 dark:text-navy-300">
                    Noch kein Bestand erfasst — über Zukauf den ersten Eintrag erfassen.
                  </p>
                </CardBody>
              ) : (
                <div className="divide-y divide-base-200 dark:divide-navy-700">
                  {partStocks.map((stock) => {
                    const location = storageLocations.find(
                      (candidate) => candidate.id === stock.storageLocationId,
                    );
                    const currency = stock.currency ?? "CHF";
                    return (
                      <div key={stock.id} className="space-y-3 px-4 py-3.5">
                        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3.5">
                          <span
                            aria-hidden="true"
                            className="grid h-10 place-items-center rounded-sm bg-primary/10 font-numeric text-[15px] font-bold text-primary dark:bg-primary/15 dark:text-primary-light"
                          >
                            {stock.quantity}×
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-base-content dark:text-white">
                              <span className="sr-only">{stock.quantity} Stück, </span>
                              {stock.price != null
                                ? `${formatCurrency(stock.price / stock.quantity, currency)} / Stück`
                                : "ohne Preis"}
                              {stock.price != null && stock.quantity > 1 && (
                                <span className="font-normal text-base-content/70 dark:text-navy-300">
                                  {` · ${formatCurrency(stock.price, currency)} gesamt`}
                                </span>
                              )}
                              {stock.isUsed && (
                                <span className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-warning/15 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
                                  <Recycle className="h-2.5 w-2.5" />
                                  Gebraucht
                                </span>
                              )}
                            </p>
                            <p className="font-mono text-xs text-base-content/70 dark:text-navy-300">
                              {formatDate(stock.purchaseDate)}
                              {location && ` · ${storageLocationPath(location, storageLocations)}`}
                            </p>
                            {stock.notes && (
                              <p className="truncate text-xs text-base-content/70 dark:text-navy-300">
                                <FormattedText description={stock.notes} markup={stock.notesMarkup} />
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingStock(stock)}
                            aria-label="Zukauf bearbeiten"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-base-300 text-base-content/70 transition-colors hover:border-base-content/40 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                        {!location && stock.quantity > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-sm border border-warning/30 border-l-[3px] border-l-[var(--color-workshop)] bg-warning/5 px-3 py-2.5 dark:bg-warning/10">
                            <span className="text-sm font-semibold text-warning">Kein Lagerort — zuordnen</span>
                            <label className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                              Lagerort
                              <select
                                value=""
                                onChange={(event) => {
                                  const value = event.target.value;
                                  if (value === "__new") setEditingStock(stock);
                                  else if (value) assignLocation(stock, value);
                                }}
                                className="h-8 max-w-[14rem] rounded-sm border border-warning/30 bg-base-100 py-0 pl-2 pr-7 font-sans text-sm normal-case tracking-normal text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-navy-900 dark:text-white"
                              >
                                <option value="">Wählen …</option>
                                {sortedLocations.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.path}
                                  </option>
                                ))}
                                <option value="__new">+ Neuer Lagerort …</option>
                              </select>
                            </label>
                          </div>
                        )}
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
                    onClick={() => {
                      setConsumptionNote(undefined);
                      setIsAddConsumptionOpen(true);
                    }}
                    disabled={part.onHand < 1}
                    title={part.onHand < 1 ? "Kein Bestand zum Verbuchen" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary/10 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Erfassen
                  </button>
                }
              />
              {partConsumptions.length === 0 ? (
                <CardBody>
                  <p className="text-sm text-base-content/70 dark:text-navy-300">
                    Noch kein Verbrauch erfasst. Teile lassen sich auch direkt beim Erfassen einer
                    Wartung verbuchen.
                  </p>
                </CardBody>
              ) : (
                <div className="divide-y divide-base-200 dark:divide-navy-700">
                  {partConsumptions.map((consumption) => (
                    <div
                      key={consumption.id}
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3.5"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-10 place-items-center rounded-sm bg-error/10 font-numeric text-[15px] font-bold text-error"
                      >
                        −{consumption.quantity}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-base-content dark:text-white">
                          <span className="sr-only">{consumption.quantity} Stück verbraucht, </span>
                          {consumption.maintenanceDate
                            ? `${maintenanceTypeLabels[consumption.maintenanceType as MaintenanceType] ?? "Eintrag"} vom ${formatDate(consumption.maintenanceDate)}`
                            : "Manuell verbucht"}
                          {/* Linked repairs jump straight to the bike's history.
                              The badge stays inert when the entry was booked before
                              the server started joining this context, or when the
                              record has since been deleted. */}
                          {consumption.maintenanceRecordId != null &&
                            (consumption.motorcycleId != null ? (
                              <Link
                                to={`/motorcycle/${createMotorcycleSlug(
                                  consumption.motorcycleMake ?? "",
                                  consumption.motorcycleModel ?? "",
                                )}/${consumption.motorcycleId}#maintenance`}
                                className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-content/70 transition-colors hover:bg-base-300 hover:text-base-content dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-700"
                              >
                                <Wrench className="h-2.5 w-2.5" />
                                {[consumption.motorcycleMake, consumption.motorcycleModel]
                                  .filter(Boolean)
                                  .join(" ") || "Wartung"}
                              </Link>
                            ) : (
                              <span className="ml-1.5 inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-content/70 dark:bg-navy-900 dark:text-navy-300">
                                <Wrench className="h-2.5 w-2.5" />
                                Wartung
                              </span>
                            ))}
                        </p>
                        <p className="font-mono text-xs text-base-content/70 dark:text-navy-300">
                          {formatDate(consumption.date)}
                        </p>
                        {consumption.notes && (
                          <p className="truncate text-xs text-base-content/70 dark:text-navy-300">
                            {consumption.notes}
                          </p>
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
                        className="shrink-0 rounded-sm border border-base-content/15 px-2 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
                      >
                        Zurückbuchen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeading
                code="03"
                title="Kompatibilität"
                meta={compatibility.length > 0 ? String(compatibility.length) : undefined}
              />
              <CardBody className="flex flex-col gap-1.5 py-3">
                {compatibility.length === 0 ? (
                  <p className="text-sm text-base-content/70 dark:text-navy-300">
                    Keine Baureihe zugeordnet — über Bearbeiten lassen sich Familie, Serie oder
                    Modell verknüpfen.
                  </p>
                ) : (
                  <>
                    {compatibility.slice(0, COMPAT_VISIBLE).map((node) => (
                      <span
                        key={node.id}
                        title={seriesPath(node, modelSeries)}
                        className="rounded-sm border border-base-300 px-2.5 py-1 font-mono text-xs font-semibold text-base-content dark:border-navy-700 dark:text-navy-100"
                      >
                        {modelSeriesDisplayName(node)}
                      </span>
                    ))}
                    {compatibility.length > COMPAT_VISIBLE && (
                      <details className="text-[13px]">
                        <summary className="cursor-pointer py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-primary dark:text-primary-light">
                          + {compatibility.length - COMPAT_VISIBLE} weitere
                        </summary>
                        <p className="pt-1.5 font-mono text-xs leading-relaxed text-base-content/70 dark:text-navy-300">
                          {compatibility
                            .slice(COMPAT_VISIBLE)
                            .map((node) => modelSeriesDisplayName(node))
                            .join(" · ")}
                        </p>
                      </details>
                    )}
                  </>
                )}
                <p className="text-[13px] text-base-content/70 dark:text-navy-300">
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
                <PartLabel part={part} modelSeries={modelSeries} />
              </CardBody>
            </Card>
          </div>
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
        <PartConsumptionForm
          key={consumptionNote ?? ""}
          part={part}
          defaultNotes={consumptionNote}
          onClose={() => setIsAddConsumptionOpen(false)}
        />
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
