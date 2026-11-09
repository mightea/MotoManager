import { data, Link, useActionData, useNavigate, useSearchParams } from "react-router";
import { FormattedText } from "~/components/formatted-text";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Archive,
  Download,
  Globe,
  Layers,
  Lock,
  Package,
  Plus,
  Search,
} from "lucide-react";
import type { Route } from "./+types/parts";
import { requireUser } from "~/services/auth";
import { ApiError, fetchFromBackend, getBackendAssetUrl } from "~/utils/backend";
import {
  createPart,
  createPartStock,
  createStorageLocation,
  fetchModelSeries,
  fetchParts,
  fetchPartStocks,
  fetchPublicParts,
  fetchStorageLocations,
  importPartImageFromUrl,
} from "~/services/parts";
import type { PublicPart, PublicStockEntry } from "~/types/parts";
import { seriesNames, storageLocationRoot } from "~/utils/parts";
import { seriesMatchesBike } from "~/utils/series";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { Motorcycle } from "~/types/db";
import { Card } from "~/components/card";
import { PageHeader } from "~/components/page-header";
import { DropdownMenu } from "~/components/dropdown-menu";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { PartForm } from "~/components/part-form";
import { BmwbikeImportDialog } from "~/components/bmwbike-import-dialog";
import { InvoiceImportDialog } from "~/components/invoice-import-dialog";
import { toast } from "~/hooks/use-toast";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Teile - Moto Manager" },
    { name: "description", content: "Ersatzteil-Bestand, Verbrauch und öffentliche Teile." },
  ];
}

/**
 * Public stock rows carry no id — derive a stable list key from their fields.
 * The list is read-only and re-rendered wholesale from loader data, so a rare
 * collision between two identical rows is harmless.
 */
function publicStockKey(stock: PublicStockEntry): string {
  return [
    stock.quantity,
    stock.price ?? "",
    stock.currency ?? "",
    stock.purchaseDate ?? "",
    stock.storageLocation ?? "",
    stock.isUsed,
  ].join("|");
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);

  const [parts, modelSeries, storageLocations, publicParts, stocks, motorcycles] = await Promise.all([
    fetchParts(token),
    fetchModelSeries(token),
    fetchStorageLocations(token),
    fetchPublicParts(token).catch(() => [] as PublicPart[]),
    fetchPartStocks(token),
    // Only feeds the "Für" column — the list works without it.
    fetchFromBackend<{ motorcycles: Motorcycle[] }>("/motorcycles", {}, token)
      .then((response) => response.motorcycles)
      .catch(() => [] as Motorcycle[]),
  ]);

  return data({ parts, modelSeries, storageLocations, publicParts, stocks, motorcycles });
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
    if (intent === "createPart") {
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
        descriptionMarkup: optionalString("descriptionMarkup") ?? "",
        oemPartNumber: optionalString("oemPartNumber"),
        isPublic: formData.get("isPublic") === "true",
        seriesIds: formData.getAll("seriesIds").map(Number).filter(Number.isFinite),
      };
      {
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
            isUsed: formData.get("stockIsUsed") === "true",
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

        // BMWBike import/enrichment: the backend downloads the image from
        // the source URL. The part is complete without it, so a failure only warns.
        const importImageUrl = optionalString("importImageUrl");
        if (importImageUrl) {
          try {
            await importPartImageFromUrl(token, created.id, importImageUrl);
          } catch (imageError) {
            if (imageError instanceof Response) throw imageError;
            return data({
              success: true,
              intent,
              error: "Teil erstellt, aber das Bild konnte nicht übernommen werden.",
            });
          }
        }
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
};

/** "Ohne Lagerort" in the Lagerort filter — stock on hand that has no place yet. */
const NO_LOCATION = "none";

const toolbarFieldClass =
  "flex h-9 items-center gap-2 rounded-sm border border-base-300 px-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:border-navy-700 dark:text-navy-300";

const toolbarSelectClass =
  "min-w-0 flex-1 cursor-pointer border-none bg-transparent py-0 pl-0 pr-6 font-sans text-sm font-semibold normal-case tracking-normal text-base-content focus:outline-none focus:ring-0 dark:text-white";

function stockTone(onHand: number): "empty" | "low" | "ok" {
  if (onHand <= 0) return "empty";
  if (onHand === 1) return "low";
  return "ok";
}

export default function PartsPage({ loaderData }: Route.ComponentProps) {
  const { parts, modelSeries, storageLocations, publicParts, stocks, motorcycles } = loaderData;
  const actionData = useActionData<typeof clientAction>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<"mine" | "public">("mine");
  const [search, setSearch] = useState("");
  // Top-level Lagerort filter for the own-parts tab ("" = all, "none" =
  // stock without a Lagerort). Deep-linkable via ?lagerort= from Lagerorte.
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get("lagerort") ?? "");
  // "Für" filter: one of the user's own bikes ("" = all).
  const [bikeFilter, setBikeFilter] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      const message = SUCCESS_TOASTS[intent];
      if (message) toast.success(message);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddPartOpen(false);
      setIsImportOpen(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [actionData]);

  const rootLocations = useMemo(
    () =>
      storageLocations
        .filter((location) => location.parentId == null)
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [storageLocations],
  );
  // Which top-level Lagerort each part has stock in: partId -> set of root ids.
  const rootsByPart = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const stock of stocks) {
      if (stock.storageLocationId == null) continue;
      const location = storageLocations.find(
        (candidate) => candidate.id === stock.storageLocationId,
      );
      if (!location) continue;
      const root = storageLocationRoot(location, storageLocations);
      const set = map.get(stock.partId) ?? new Set<number>();
      set.add(root.id);
      map.set(stock.partId, set);
    }
    return map;
  }, [stocks, storageLocations]);
  // Parts with stock entries that still lack a Lagerort (same rule as the
  // "Ohne Lagerort" row on the Lagerorte page).
  const unplacedPartIds = useMemo(
    () =>
      new Set(
        stocks
          .filter((stock) => stock.storageLocationId == null && stock.quantity > 0)
          .map((stock) => stock.partId),
      ),
    [stocks],
  );

  // "Für": the user's own active bikes, matched to a part via the model catalog.
  const activeBikes = useMemo(
    () => motorcycles.filter((bike) => bike.status !== "sold" && bike.seriesId != null),
    [motorcycles],
  );
  const bikeLabel = (bike: Motorcycle) => bike.model || bike.make;
  const bikesFor = (seriesIds: number[]) =>
    seriesIds.length === 0
      ? []
      : activeBikes.filter((bike) => seriesMatchesBike(seriesIds, bike.seriesId!, modelSeries));
  const bikesByPart = useMemo(() => {
    const map = new Map<number, Motorcycle[]>();
    for (const part of parts) {
      if (part.seriesIds.length === 0) continue;
      const fits = activeBikes.filter((bike) =>
        seriesMatchesBike(part.seriesIds, bike.seriesId!, modelSeries),
      );
      if (fits.length > 0) map.set(part.id, fits);
    }
    return map;
  }, [parts, activeBikes, modelSeries]);

  const query = search.trim().toLowerCase();
  const matchesQuery = (part: {
    name: string;
    partNumber: string;
    manufacturer: string;
    oemPartNumber: string | null;
  }) =>
    !query ||
    part.name.toLowerCase().includes(query) ||
    part.partNumber.toLowerCase().includes(query) ||
    part.manufacturer.toLowerCase().includes(query) ||
    (part.oemPartNumber?.toLowerCase().includes(query) ?? false);
  const selectedBikeId = bikeFilter ? Number(bikeFilter) : null;

  const filteredParts = parts.filter((part) => {
    if (!matchesQuery(part)) return false;
    if (locationFilter === NO_LOCATION) {
      if (!unplacedPartIds.has(part.id)) return false;
    } else if (locationFilter && !rootsByPart.get(part.id)?.has(Number(locationFilter))) {
      return false;
    }
    if (selectedBikeId != null && !bikesByPart.get(part.id)?.some((bike) => bike.id === selectedBikeId)) {
      return false;
    }
    if (onlyLow && part.onHand > 1) return false;
    return true;
  });
  const filteredPublicParts = publicParts.filter((part) => {
    if (!matchesQuery(part)) return false;
    if (selectedBikeId != null && !bikesFor(part.seriesIds).some((bike) => bike.id === selectedBikeId)) {
      return false;
    }
    return true;
  });

  const totalStock = parts.reduce((sum, part) => sum + Math.max(0, part.onHand), 0);
  const emptyCount = parts.filter((part) => part.onHand <= 0).length;
  const lowCount = parts.filter((part) => part.onHand === 1).length;
  const stockSummary = `${parts.length} ${parts.length === 1 ? "Teil" : "Teile"} · ${formatNumber(totalStock)} Stück auf Lager`;
  const lowSummary = [
    emptyCount > 0 ? `${emptyCount} leer` : null,
    lowCount > 0 ? `${lowCount} knapp` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const filtersActive = query !== "" || locationFilter !== "" || bikeFilter !== "" || onlyLow;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-20 md:p-6 md:pb-12">
      <PageHeader
        eyebrow="Lager"
        title="Teile"
        description={
          <>
            {stockSummary}
            {lowSummary && (
              <>
                {" · "}
                <span className="font-semibold text-error">{lowSummary}</span>
              </>
            )}
          </>
        }
        actions={
        <>
          <Link
            to="/model-series"
            className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Modellkatalog
          </Link>
          <Link
            to="/storage-locations"
            className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Lagerorte
          </Link>
          <DropdownMenu
            align="end"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Import
              </button>
            }
          >
            <DropdownMenu.Item
              onSelect={() => setIsImportOpen(true)}
              icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Von BMWBike (URL)
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => setIsInvoiceImportOpen(true)}
              icon={<Package className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Rechnung / Bestellung (PDF, Scan)
            </DropdownMenu.Item>
          </DropdownMenu>
          <button
            onClick={() => setIsAddPartOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Teil hinzufügen</span>
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

      {/* Toolbar — catalog switch, search and the filters in one strip. */}
      <Card className="flex flex-wrap items-center gap-2.5 p-2.5">
        <fieldset className="flex gap-1.5">
          <legend className="sr-only">Katalog</legend>
          {(
            [
              { value: "mine", label: "Meine Teile", count: parts.length },
              { value: "public", label: "Andere Nutzer", count: publicParts.length },
            ] as const
          ).map((segment) => (
            <button
              key={segment.value}
              type="button"
              aria-pressed={tab === segment.value}
              onClick={() => setTab(segment.value)}
              className={clsx(
                "h-9 whitespace-nowrap rounded-sm border px-3 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                tab === segment.value
                  ? "border-primary bg-primary/10 font-bold text-primary dark:bg-primary/15 dark:text-primary-light"
                  : "border-base-300 font-semibold text-base-content/70 hover:text-base-content dark:border-navy-700 dark:text-navy-300 dark:hover:text-white",
              )}
            >
              {segment.label} · {segment.count}
            </button>
          ))}
        </fieldset>
        <span aria-hidden="true" className="hidden h-6 w-px bg-base-300 sm:block dark:bg-navy-700" />
        <label className="flex h-9 min-w-0 flex-[1_1_16rem] items-center gap-2 rounded-sm border border-base-300 px-2.5 text-base-content/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-navy-700 dark:text-navy-400">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Teile suchen</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, Teilenummer oder Hersteller"
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-base-content placeholder:text-base-content/45 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-navy-500"
          />
        </label>
        {tab === "mine" && (rootLocations.length > 0 || unplacedPartIds.size > 0) && (
          <label className={clsx(toolbarFieldClass, "flex-[1_1_12rem] sm:flex-none")}>
            Lagerort
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className={toolbarSelectClass}
            >
              <option value="">Alle Lagerorte</option>
              {rootLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
              <option value={NO_LOCATION}>Ohne Lagerort</option>
            </select>
          </label>
        )}
        {activeBikes.length > 0 && (
          <label className={clsx(toolbarFieldClass, "flex-[1_1_12rem] sm:flex-none")}>
            Für
            <select
              value={bikeFilter}
              onChange={(event) => setBikeFilter(event.target.value)}
              className={toolbarSelectClass}
            >
              <option value="">Alle Motorräder</option>
              {activeBikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bikeLabel(bike)}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "mine" && (
          <label className={clsx(toolbarFieldClass, "cursor-pointer")}>
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(event) => setOnlyLow(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Nur knapp / leer
          </label>
        )}
      </Card>

      {tab === "mine" ? (
        filteredParts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={parts.length === 0 ? "Keine Teile erfasst" : "Keine Treffer"}
            description={
              parts.length === 0
                ? "Lege dein erstes Ersatzteil an — Bestand und Verbrauch werden automatisch geführt."
                : "Kein Teil passt zur Suche oder zu den gewählten Filtern."
            }
            action={
              parts.length === 0 ? (
                <button
                  onClick={() => setIsAddPartOpen(true)}
                  className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Erstes Teil erstellen
                </button>
              ) : filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setLocationFilter("");
                    setBikeFilter("");
                    setOnlyLow(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
                >
                  Filter zurücksetzen
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-base-200 dark:border-navy-700">
                <tr className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
                  <th scope="col" className="px-4 py-3">Teil</th>
                  <th scope="col" className="px-4 py-3">Teilenummer</th>
                  <th scope="col" className="px-4 py-3">Hersteller · Passform</th>
                  <th scope="col" className="px-4 py-3 text-primary dark:text-primary-light">Für</th>
                  <th scope="col" className="px-4 py-3 text-right">Bestand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200/70 dark:divide-navy-700">
                {filteredParts.map((part) => {
                  const bikes = bikesByPart.get(part.id);
                  const series = seriesNames(part.seriesIds, modelSeries);
                  const tone = stockTone(part.onHand);
                  return (
                    <tr
                      key={part.id}
                      onClick={() => navigate(`/parts/${part.id}`)}
                      className="cursor-pointer transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30"
                    >
                      <td className="relative px-4 py-2.5">
                        {tone !== "ok" && (
                          <span
                            aria-hidden="true"
                            className={clsx(
                              "absolute inset-y-2 left-0 w-[3px] rounded-r-sm",
                              tone === "empty" ? "bg-accent" : "bg-[var(--color-workshop)]",
                            )}
                          />
                        )}
                        <div className="flex items-center gap-3">
                          {part.image ? (
                            <img
                              src={`${getBackendAssetUrl(part.image)}?width=112`}
                              alt=""
                              loading="lazy"
                              className="h-[42px] w-14 shrink-0 rounded-sm border border-base-300 bg-white object-contain dark:border-navy-700"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex h-[42px] w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-base-300 text-base-content/30 dark:border-navy-700"
                            >
                              <Package className="h-4 w-4" />
                            </span>
                          )}
                          <Link
                            to={`/parts/${part.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="line-clamp-2 font-semibold text-base-content hover:underline dark:text-white"
                          >
                            {part.name}
                          </Link>
                          {part.isPublic ? (
                            <Globe className="h-3 w-3 shrink-0 text-success" aria-label="Öffentlich" />
                          ) : (
                            <Lock className="h-3 w-3 shrink-0 text-base-content/35" aria-label="Privat" />
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-base-content/70 dark:text-navy-300">
                        {part.partNumber}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-base-content/70 dark:text-navy-300">
                        {part.manufacturer}
                        {series.length > 0 && ` · ${series.slice(0, 2).join(", ")}`}
                        {series.length > 2 && ` +${series.length - 2}`}
                      </td>
                      <td className="px-4 py-2.5">
                        {bikes ? (
                          <span className="whitespace-nowrap font-mono text-xs font-bold tracking-[0.04em] text-primary dark:text-primary-light">
                            {bikes.map(bikeLabel).join(" · ")}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-base-content/40 dark:text-navy-500">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <span
                          className={clsx(
                            "font-numeric text-base font-bold",
                            tone === "empty"
                              ? "text-error"
                              : tone === "low"
                                ? "text-warning"
                                : "text-base-content dark:text-white",
                          )}
                        >
                          {part.onHand} Stk.
                        </span>
                        {tone !== "ok" && (
                          <span
                            className={clsx(
                              "ml-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]",
                              tone === "empty" ? "text-error" : "text-warning",
                            )}
                          >
                            {tone === "empty" ? "Leer" : "Knapp"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filteredParts.map((part) => {
              const tone = stockTone(part.onHand);
              const bikes = bikesByPart.get(part.id);
              return (
                <Link key={part.id} to={`/parts/${part.id}`} className="block text-left">
                  <Card
                    accent={tone === "empty" ? "accent" : tone === "low" ? "workshop" : undefined}
                    className="h-full px-4 py-3.5 transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30"
                  >
                    <div className="flex items-start gap-3">
                      {part.image && (
                        <img
                          src={`${getBackendAssetUrl(part.image)}?width=112`}
                          alt=""
                          loading="lazy"
                          className="h-[42px] w-14 shrink-0 rounded-sm border border-base-300 bg-white object-contain dark:border-navy-700"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="line-clamp-2 text-sm font-semibold text-base-content dark:text-white">
                            {part.name}
                          </h3>
                          {part.isPublic ? (
                            <Globe className="h-3 w-3 shrink-0 text-success" aria-label="Öffentlich" />
                          ) : (
                            <Lock className="h-3 w-3 shrink-0 text-base-content/35" aria-label="Privat" />
                          )}
                        </div>
                        <p className="truncate font-mono text-[11px] text-base-content/70 dark:text-navy-400">
                          {part.partNumber} · {part.manufacturer}
                        </p>
                        {bikes ? (
                          <p className="truncate font-mono text-[11px] font-bold tracking-[0.04em] text-primary dark:text-primary-light">
                            Für {bikes.map(bikeLabel).join(" · ")}
                          </p>
                        ) : (
                          part.seriesIds.length > 0 && (
                            <p className="truncate text-[11px] text-base-content/60 dark:text-navy-400">
                              {seriesNames(part.seriesIds, modelSeries).slice(0, 2).join(", ")}
                              {part.seriesIds.length > 2 && ` +${part.seriesIds.length - 2}`}
                            </p>
                          )
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={clsx(
                            "font-numeric text-base font-bold leading-none",
                            tone === "empty"
                              ? "text-error"
                              : tone === "low"
                                ? "text-warning"
                                : "text-base-content dark:text-white",
                          )}
                        >
                          {part.onHand} Stk.
                        </p>
                        {tone !== "ok" && (
                          <p
                            className={clsx(
                              "mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]",
                              tone === "empty" ? "text-error" : "text-warning",
                            )}
                          >
                            {tone === "empty" ? "Leer" : "Knapp"}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-base-content/60 dark:text-navy-400">
            <p>
              {filteredParts.length === parts.length
                ? `${parts.length} ${parts.length === 1 ? "Teil" : "Teile"}`
                : `${filteredParts.length} von ${parts.length} Teilen`}
              {activeBikes.length > 0 && " · Für = eigene Motorräder laut Passform"}
            </p>
            <p>Knapp = 1 Stück · Leer = 0</p>
          </div>
          </>
        )
      ) : filteredPublicParts.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Keine öffentlichen Teile"
          description="Andere Nutzer haben noch keine passenden Teile erfasst."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPublicParts.map((part) => {
            const bikes = bikesFor(part.seriesIds);
            return (
            <Card key={part.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                {part.image && (
                  <img
                    src={`${getBackendAssetUrl(part.image)}?width=112`}
                    alt=""
                    loading="lazy"
                    className="h-[42px] w-14 shrink-0 rounded-sm border border-base-300 bg-white object-contain dark:border-navy-700"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h3 className="truncate text-sm font-semibold text-base-content dark:text-white">
                    {part.name}
                  </h3>
                  <p className="truncate font-mono text-[11px] text-base-content/70 dark:text-navy-400">
                    {part.partNumber}
                    {part.oemPartNumber && ` · BMW ${part.oemPartNumber}`}
                  </p>
                  <p className="truncate text-[11px] text-base-content/60 dark:text-navy-400">
                    von {part.ownerName}
                    {part.seriesIds.length > 0 &&
                      ` · ${seriesNames(part.seriesIds, modelSeries).slice(0, 2).join(", ")}`}
                  </p>
                  {bikes.length > 0 && (
                    <p className="truncate font-mono text-[11px] font-bold tracking-[0.04em] text-primary dark:text-primary-light">
                      Für {bikes.map(bikeLabel).join(" · ")}
                    </p>
                  )}
                  {part.description && (
                    <p className="truncate text-[11px] text-base-content/60 dark:text-navy-400">
                      <FormattedText description={part.description} markup={part.descriptionMarkup} />
                    </p>
                  )}
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                    !part.isPublic
                      ? "bg-base-200 text-base-content/60 dark:bg-navy-900 dark:text-navy-400"
                      : part.hasStock
                        ? "bg-success/15 text-success"
                        : "bg-base-200 text-base-content/60 dark:bg-navy-900 dark:text-navy-400",
                  )}
                >
                  {!part.isPublic
                    ? "Bestand privat"
                    : part.hasStock
                      ? `Auf Lager (${part.totalQuantity})`
                      : "Nicht auf Lager"}
                </span>
              </div>
              {part.isPublic && (part.stocks?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-base-200 pt-2 text-[11px] text-base-content/60 dark:border-navy-700 dark:text-navy-400">
                  {part.stocks!.map((stock) => (
                    <li key={publicStockKey(stock)} className="truncate">
                      {stock.quantity} Stk.
                      {stock.price != null && ` · ${formatCurrency(stock.price, stock.currency ?? "CHF")}`}
                      {stock.purchaseDate && ` · ${new Date(stock.purchaseDate).toLocaleDateString("de-CH")}`}
                      {stock.storageLocation && ` · ${stock.storageLocation}`}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            );
          })}
        </div>
      )}

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

      <BmwbikeImportDialog
        isOpen={isImportOpen}
        modelSeries={modelSeries}
        storageLocations={storageLocations}
        onClose={() => setIsImportOpen(false)}
      />

      <InvoiceImportDialog
        isOpen={isInvoiceImportOpen}
        modelSeries={modelSeries}
        storageLocations={storageLocations}
        onClose={() => setIsInvoiceImportOpen(false)}
      />

    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
