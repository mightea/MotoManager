import { data, Link, useLocation, useParams } from "react-router";
import { Layers, Package } from "lucide-react";
import type { Route } from "./+types/motorcycle.detail.parts";
import { requireUser } from "~/services/auth";
import { fetchFromBackend, getBackendAssetUrl } from "~/utils/backend";
import {
  fetchCompatibleParts,
  fetchModelSeries,
  fetchPartStocks,
  fetchStorageLocations,
} from "~/services/parts";
import type { ModelSeries, Part, PartStock, StorageLocation } from "~/types/parts";
import { seriesNames, storageLocationPath } from "~/utils/parts";
import { seriesPath } from "~/utils/series";
import { MotorcycleDetailHeader } from "~/components/motorcycle-detail-header";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { computeMotorcycleHeaderStats } from "~/utils/motorcycle-header-stats";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";

export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.motorcycle) {
    return [{ title: "Teile - Moto Manager" }];
  }
  const { make, model } = data.motorcycle;
  return [
    { title: `Teile: ${make} ${model} - Moto Manager` },
    { name: "description", content: `Kompatible Ersatzteile für ${make} ${model}.` },
  ];
}

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  if (!params.id) {
    throw new Response("Motorcycle ID is missing", { status: 400 });
  }
  const motorcycleId = Number(params.id);
  if (!Number.isFinite(motorcycleId)) {
    throw new Response("Invalid motorcycle ID", { status: 400 });
  }

  const [response, compatibleParts, modelSeries, stocks, storageLocations] = await Promise.all([
    fetchFromBackend<any>(`/motorcycles/${motorcycleId}`, {}, token),
    fetchCompatibleParts(token, motorcycleId).catch(() => [] as Part[]),
    fetchModelSeries(token).catch(() => [] as ModelSeries[]),
    fetchPartStocks(token).catch(() => [] as PartStock[]),
    fetchStorageLocations(token).catch(() => [] as StorageLocation[]),
  ]);
  if (!response?.motorcycle) {
    throw new Response("Motorrad nicht gefunden.", { status: 404 });
  }

  const headerStats = await computeMotorcycleHeaderStats(response, token, user.id);

  return data({
    motorcycle: response.motorcycle,
    ...headerStats,
    compatibleParts,
    modelSeries,
    stocks,
    storageLocations,
  });
}

export default function MotorcyclePartsPage({ loaderData }: Route.ComponentProps) {
  const {
    motorcycle,
    nextInspection,
    currentLocationName,
    compatibleParts,
    modelSeries,
    stocks,
    storageLocations,
  } = loaderData;

  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? createMotorcycleSlug(motorcycle.make, motorcycle.model);
  const motorcycleIdParam = params.id ?? motorcycle.id.toString();
  const basePath = `/motorcycle/${slug}/${motorcycleIdParam}`;
  const location = useLocation();
  const normalizePath = (path: string) => path.replace(/\/+$/, "");
  const overviewLink = {
    to: basePath,
    isActive: normalizePath(location.pathname) === normalizePath(basePath),
  };
  const navLinks = [
    { label: "Dokumente", to: `${basePath}/documents`, isActive: false },
    { label: "Werkstattdaten", to: `${basePath}/torque-specs`, isActive: false },
    { label: "Teile", to: `${basePath}/parts`, isActive: true },
  ];

  const assignedNode = modelSeries.find((node) => node.id === motorcycle.seriesId) ?? null;

  /** "Garage › Regal A" list for a part's live stock entries. */
  const locationSummary = (partId: number): string | null => {
    const names = new Set<string>();
    for (const stock of stocks) {
      if (stock.partId !== partId || stock.storageLocationId == null) continue;
      const storageLocation = storageLocations.find(
        (candidate) => candidate.id === stock.storageLocationId,
      );
      if (storageLocation) {
        names.add(storageLocationPath(storageLocation, storageLocations));
      }
    }
    return names.size > 0 ? [...names].join(" · ") : null;
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12">
      <MotorcycleDetailHeader
        motorcycle={motorcycle}
        nextInspection={nextInspection}
        currentLocationName={currentLocationName}
        navLinks={navLinks}
        backTo={basePath}
        overviewLink={overviewLink}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="label-tag">
            <span>Kompatible Teile</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {assignedNode && (
              <span
                className="inline-flex items-center gap-1.5 rounded-sm bg-base-200 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/60 dark:bg-navy-800 dark:text-navy-300"
                title={seriesPath(assignedNode, modelSeries)}
              >
                <Layers className="h-3 w-3" aria-hidden="true" />
                {assignedNode.name}
              </span>
            )}
            <Link
              to="/parts"
              className="inline-flex items-center gap-1.5 rounded-sm border border-base-content/15 bg-base-100 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 transition-all hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:text-white"
            >
              Alle Teile verwalten
            </Link>
          </div>
        </div>

        {motorcycle.seriesId == null ? (
          <EmptyState
            icon={Layers}
            title="Keine Baureihe zugeordnet"
            description='Weise dem Motorrad in "Motorrad bearbeiten" eine Baureihe oder ein Modell zu — die VIN-Erkennung schlägt automatisch den passenden Katalogeintrag vor.'
          />
        ) : compatibleParts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Keine kompatiblen Teile"
            description="Kein Teil im Bestand ist mit dieser Baureihe verknüpft. Teile lassen sich auf der Teile-Seite anlegen und auf Familien-, Serien- oder Modell-Ebene zuordnen."
          />
        ) : (
          <Card className="overflow-hidden">
            {compatibleParts.map((part) => {
              const storagePath = locationSummary(part.id);
              return (
                <div
                  key={part.id}
                  className="flex items-center gap-3 border-b border-base-200 px-4 py-3 last:border-b-0 dark:border-navy-700"
                >
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
                      {part.seriesIds.length > 0 &&
                        ` · ${seriesNames(part.seriesIds, modelSeries).slice(0, 2).join(", ")}`}
                    </p>
                    {storagePath && (
                      <p className="truncate text-[11px] text-base-content/50">{storagePath}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={
                        part.onHand > 0
                          ? "font-numeric text-lg font-semibold leading-none text-primary"
                          : "font-numeric text-lg font-semibold leading-none text-base-content/35"
                      }
                    >
                      {part.onHand}
                    </p>
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                      Bestand
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
