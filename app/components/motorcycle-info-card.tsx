import { useState } from "react";
import { ChevronDown, Hash, FileText, Fingerprint, Calendar, Info, Clock, DollarSign, Gauge, Plus, Fuel, Route, Navigation2 } from "lucide-react";
import clsx from "clsx";
import type { Motorcycle, PreviousOwner } from "~/types/db";
import { StatisticEntry } from "./statistic-entry";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";

interface MotorcycleInfoCardProps {
  motorcycle: Motorcycle;
  formattedFirstRegistration: string | null;
  formattedPurchaseDate: string | null;
  ownershipLabel: string | null;
  kmDriven: number;
  avgKmPerYear: number;
  yearsOwned: number;
  hasPurchaseDate: boolean;
  onEdit: () => void;
  previousOwnersList: PreviousOwner[];
  onAddPreviousOwner: () => void;
  onEditPreviousOwner: (owner: PreviousOwner) => void;
  ownerCount?: number;
  avgFuelConsumption?: number | null;
  avgTripDistance?: number | null;
  estimatedRange?: number | null;
  totalLifetimeCost?: number;
}

/**
 * A card component displaying technical and ownership details for a motorcycle.
 * Supports expanding/collapsing for detailed information.
 */
export function MotorcycleInfoCard({
  motorcycle,
  formattedFirstRegistration,
  formattedPurchaseDate,
  ownershipLabel,
  kmDriven,
  avgKmPerYear,
  yearsOwned,
  hasPurchaseDate,
  onEdit,
  previousOwnersList,
  onAddPreviousOwner,
  onEditPreviousOwner,
  ownerCount,
  avgFuelConsumption,
  avgTripDistance,
  estimatedRange,
  totalLifetimeCost,
}: MotorcycleInfoCardProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const summaryItems = [
    hasPurchaseDate && kmDriven > 0 ? `${formatNumber(kmDriven)} km gefahren` : null,
    ownerCount !== undefined && ownerCount > 0 ? `${ownerCount}. Hand` : null,
    ownershipLabel ? `${ownershipLabel} im Besitz` : null,
    avgFuelConsumption ? `${avgFuelConsumption.toFixed(2)} L/100km` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-700 dark:bg-navy-800">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-navy-700">
        <button
          type="button"
          onClick={() => setDetailsExpanded((prev) => !prev)}
          className="flex flex-1 items-center justify-between text-left text-sm font-semibold text-foreground transition-colors hover:text-primary dark:text-white"
          aria-expanded={detailsExpanded}
        >
          <span>Fahrzeugdaten</span>
          <ChevronDown
            className={clsx("h-5 w-5 transition-transform", {
              "rotate-180": detailsExpanded,
            })}
          />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-all hover:border-primary hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-600 dark:text-navy-200 dark:hover:border-primary-light dark:hover:text-primary-light"
        >
          Bearbeiten
        </button>
      </div>

      <div
        className={clsx(
          "grid transition-all duration-300 ease-in-out",
          detailsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
        <div className="mt-3 space-y-2">
        <div className="mt-4 space-y-6">
          <div className="space-y-2">
            <StatisticEntry
              icon={Hash}
              label="Kennzeichen"
              value={motorcycle.numberPlate?.trim()}
            />
            <StatisticEntry
              icon={FileText}
              label="Stammnummer"
              value={motorcycle.vehicleIdNr?.trim()}
            />
            <StatisticEntry
              icon={Fingerprint}
              label="VIN"
              value={motorcycle.vin}
            />
            <StatisticEntry
              icon={Fingerprint}
              label="Motor-Nummer"
              value={motorcycle.engineNumber}
            />
            <StatisticEntry
              icon={Calendar}
              label="1. Inverkehrsetzung"
              value={formattedFirstRegistration}
            />
            <StatisticEntry
              icon={Info}
              label="Status"
              value={
                <span className="flex items-center gap-2">
                  {motorcycle.isArchived && "Archiviert"}
                  {motorcycle.isVeteran && (motorcycle.isArchived ? " • Veteran" : "Veteran")}
                  {!motorcycle.isArchived && !motorcycle.isVeteran && "Aktiv"}
                </span>
              }
            />
          </div>

          {/* Fuel Consumption Group */}
          {(avgFuelConsumption || avgTripDistance || motorcycle.fuelTankSize) && (
            <div className="pt-4 border-t border-gray-100 dark:border-navy-700 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 px-1">
                Treibstoff & Verbrauch
              </h3>
              <StatisticEntry
                icon={Fuel}
                label="Tankgrösse"
                value={motorcycle.fuelTankSize ? `${motorcycle.fuelTankSize} L` : null}
              />
              <StatisticEntry
                icon={Gauge}
                label="Ø Verbrauch"
                value={avgFuelConsumption ? `${avgFuelConsumption.toFixed(2)} L/100km` : null}
              />
              <StatisticEntry
                icon={Route}
                label="Ø Distanz / Tank"
                value={avgTripDistance ? `${Math.round(avgTripDistance)} km` : null}
              />
              <StatisticEntry
                icon={Navigation2}
                label="Theoretische Reichweite"
                value={estimatedRange ? `~ ${Math.round(estimatedRange)} km` : null}
              />
            </div>
          )}

          {/* Purchase & Usage Group */}
          <div className="pt-4 border-t border-gray-100 dark:border-navy-700 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 px-1">
              Kauf & Nutzung
            </h3>
            <StatisticEntry
              icon={Calendar}
              label="Kaufdatum"
              value={formattedPurchaseDate}
            />
            <StatisticEntry
              icon={Clock}
              label="Besitzdauer"
              value={ownershipLabel}
            />
            <StatisticEntry
              icon={DollarSign}
              label="Kaufpreis"
              value={
                motorcycle.purchasePrice !== null && motorcycle.purchasePrice !== undefined
                  ? formatCurrency(motorcycle.purchasePrice, motorcycle.currencyCode || undefined)
                  : null
              }
            />
            <StatisticEntry
              icon={Gauge}
              label="Anfangs-KM"
              value={motorcycle.initialOdo > 0 ? `${formatNumber(motorcycle.initialOdo)} km` : null}
            />
            <StatisticEntry
              icon={Gauge}
              label="Distanz seit Kauf"
              value={hasPurchaseDate ? `${formatNumber(kmDriven)} km` : null}
            />
            <StatisticEntry
              icon={Gauge}
              label="Ø km / Jahr"
              value={hasPurchaseDate && yearsOwned > 0.1 ? `${formatNumber(Math.round(avgKmPerYear))} km` : null}
            />
            {totalLifetimeCost !== undefined && (
              <StatisticEntry
                icon={DollarSign}
                label="Gesamtkosten Lebensdauer"
                value={formatCurrency(totalLifetimeCost, motorcycle.currencyCode || "CHF")}
              />
            )}
          </div>

          {/* Previous Owners Group */}
          <div className="pt-4 border-t border-gray-100 dark:border-navy-700 space-y-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                Vorbesitzer
              </h3>
              <button
                type="button"
                onClick={onAddPreviousOwner}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark transition-colors"
              >
                <Plus className="h-3 w-3" />
                Hinzufügen
              </button>
            </div>
            {previousOwnersList.length > 0 ? (
              <div className="space-y-3">
                {previousOwnersList.map((owner) => (
                  <div
                    key={owner.id}
                    className="group relative flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-primary/20 hover:bg-white dark:border-navy-700 dark:bg-navy-900/50 dark:hover:border-primary/30 dark:hover:bg-navy-900"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground dark:text-white">
                        {owner.name} {owner.surname}
                      </p>
                      <p className="text-xs text-secondary dark:text-navy-300">
                        Kaufdatum: {owner.purchaseDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditPreviousOwner(owner)}
                      className="rounded-md p-1.5 text-secondary opacity-0 transition-all hover:bg-gray-100 hover:text-primary group-hover:opacity-100 dark:text-navy-400 dark:hover:bg-navy-700"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-1 text-xs text-secondary italic">
                Keine Vorbesitzer eingetragen.
              </p>
            )}
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Collapsed Summary */}
      <div
        className={clsx(
          "grid transition-all duration-300 ease-in-out",
          !detailsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-secondary dark:text-navy-300">
            {summaryItems.map((item, index) => (
              <div key={item} className="flex items-center gap-x-2">
                {index > 0 && <span className="text-gray-300 dark:text-navy-600">•</span>}
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
