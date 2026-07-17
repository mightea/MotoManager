import { data, Link, useActionData } from "react-router";
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
import { ApiError } from "~/utils/backend";
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
import { getBackendAssetUrl } from "~/utils/backend";
import type { PublicPart, PublicStockEntry } from "~/types/parts";
import { seriesNames, storageLocationRoot } from "~/utils/parts";
import { Card } from "~/components/card";
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

  const [parts, modelSeries, storageLocations, publicParts, stocks] = await Promise.all([
    fetchParts(token),
    fetchModelSeries(token),
    fetchStorageLocations(token),
    fetchPublicParts(token).catch(() => [] as PublicPart[]),
    fetchPartStocks(token),
  ]);

  return data({ parts, modelSeries, storageLocations, publicParts, stocks });
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

        // BMWBike import: the backend downloads the image from the source
        // URL. The part is complete without it, so a failure only warns.
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

export default function PartsPage({ loaderData }: Route.ComponentProps) {
  const { parts, modelSeries, storageLocations, publicParts, stocks } = loaderData;
  const actionData = useActionData<typeof clientAction>();

  const [tab, setTab] = useState<"mine" | "public">("mine");
  const [search, setSearch] = useState("");
  // Top-level Lagerort filter for the own-parts tab ("" = all).
  const [locationFilter, setLocationFilter] = useState("");
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInvoiceImportOpen, setIsInvoiceImportOpen] = useState(false);

  // The detail view derives from loader data so it refreshes after actions.

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

  // Which top-level Lagerort each part has stock in: partId -> set of root ids.
  const rootLocations = useMemo(
    () =>
      storageLocations
        .filter((location) => location.parentId == null)
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [storageLocations],
  );
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

  const query = search.trim().toLowerCase();
  const selectedRootId = locationFilter ? Number(locationFilter) : null;
  const filteredParts = parts.filter((part) => {
    if (
      query &&
      !part.name.toLowerCase().includes(query) &&
      !part.partNumber.toLowerCase().includes(query)
    ) {
      return false;
    }
    if (selectedRootId != null && !rootsByPart.get(part.id)?.has(selectedRootId)) {
      return false;
    }
    return true;
  });
  const filteredPublicParts = query
    ? publicParts.filter(
        (part) =>
          part.name.toLowerCase().includes(query) ||
          part.partNumber.toLowerCase().includes(query),
      )
    : publicParts;

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
          <DropdownMenu
            align="end"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
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
              Huggett-Rechnung (PDF)
            </DropdownMenu.Item>
          </DropdownMenu>
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
              { value: "public", label: `Andere Nutzer (${publicParts.length})` },
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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {tab === "mine" && rootLocations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              aria-label="Nach Lagerort filtern"
              className="block w-full rounded-sm border border-base-300 bg-base-100 py-2.5 pl-3 pr-8 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white sm:w-48"
            >
              <option value="">Alle Lagerorte</option>
              {rootLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
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
      </div>

      {tab === "mine" ? (
        filteredParts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={parts.length === 0 ? "Keine Teile erfasst" : "Keine Treffer"}
            description={
              parts.length === 0
                ? "Lege dein erstes Ersatzteil an — Bestand und Verbrauch werden automatisch geführt."
                : "Kein Teil passt zur Suche oder zum gewählten Lagerort."
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
              <Link key={part.id} to={`/parts/${part.id}`} className="block text-left">
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
              </Link>
            ))}
          </div>
        )
      ) : filteredPublicParts.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Keine öffentlichen Teile"
          description="Andere Nutzer haben noch keine passenden Teile erfasst."
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
                    !part.isPublic
                      ? "bg-base-200 text-base-content/50 dark:bg-navy-800 dark:text-navy-400"
                      : part.hasStock
                        ? "bg-success/15 text-success"
                        : "bg-base-200 text-base-content/50 dark:bg-navy-800 dark:text-navy-400",
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
                <ul className="mt-2 space-y-0.5 border-t border-base-200 pt-2 text-[11px] text-base-content/60 dark:border-navy-700">
                  {part.stocks!.map((stock) => (
                    <li key={publicStockKey(stock)} className="truncate">
                      {stock.quantity} Stk.
                      {stock.price != null && ` · ${stock.price.toFixed(2)} ${stock.currency ?? ""}`}
                      {stock.purchaseDate && ` · ${new Date(stock.purchaseDate).toLocaleDateString("de-CH")}`}
                      {stock.storageLocation && ` · ${stock.storageLocation}`}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
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
