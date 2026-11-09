import { Hash, FileText, Fingerprint, Calendar, Info, Clock, DollarSign, Gauge, Fuel, Route, Navigation2 } from "lucide-react";
import type { Motorcycle, PreviousOwner } from "~/types/db";
import { StatisticEntry } from "./statistic-entry";
import { Card, CardHeading } from "./card";
import { Button } from "./button";
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
  /**
   * Ownership history is known to be incomplete. Suppresses the definitive
   * "N. Hand" position in favour of an "unknown" note. Owners are managed from
   * the motorcycle edit form, so this view is read-only.
   */
  hasUnknownOwners?: boolean;
  ownerCount?: number;
  avgFuelConsumption?: number | null;
  avgTripDistance?: number | null;
  estimatedRange?: number | null;
  totalLifetimeCost?: number;
  /**
   * "summary" (default) — compact card showing summary chips + buttons to edit
   *   the motorcycle or open the full data sheet. Renders inline on the page.
   * "details" — full data dump (all stat entries, fuel/usage groups, previous
   *   owners). Renders inside a Modal sheet, opened on demand.
   */
  variant?: "summary" | "details";
  onShowDetails?: () => void;
}

/**
 * Displays technical and ownership details for a motorcycle. Renders two variants:
 * a compact summary card for the detail page, and a full "details" view designed
 * to live inside a Modal sheet.
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
  hasUnknownOwners = false,
  ownerCount,
  avgFuelConsumption,
  avgTripDistance,
  estimatedRange,
  totalLifetimeCost,
  variant = "summary",
  onShowDetails,
}: MotorcycleInfoCardProps) {
  // With an incomplete history the recorded owners no longer pin down a
  // definitive "N. Hand" position. Rather than surface an "unknown" chip in the
  // compact summary, we omit the hand label there entirely (the details view
  // still spells the uncertainty out).
  const handLabel =
    !hasUnknownOwners && ownerCount !== undefined && ownerCount > 0
      ? `${ownerCount}. Hand`
      : null;

  const summaryItems = [
    hasPurchaseDate && kmDriven > 0 ? { label: "Gefahren seit Kauf", value: `${formatNumber(kmDriven)} km` } : null,
    handLabel ? { label: "Besitz", value: handLabel } : null,
    ownershipLabel && yearsOwned > 0 ? { label: "Im Besitz seit", value: `${yearsOwned.toFixed(1)} Jahren` } : null,
    avgFuelConsumption ? { label: "Ø Verbrauch", value: `${avgFuelConsumption.toFixed(2)} L/100` } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  if (variant === "summary") {
    return (
      <Card>
        <CardHeading
          title="Fahrzeugdaten"
          trailing={
            <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
              Bearbeiten
            </Button>
          }
        />

        <div className="px-4 py-3">
          {summaryItems.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {summaryItems.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
                    {item.label}
                  </dt>
                  <dd className="font-numeric text-[15px] font-bold text-base-content dark:text-white">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-base-content/70 dark:text-navy-300">
              Noch keine Kennzahlen — sie erscheinen mit Kaufdatum und den ersten Wartungs- oder Tank-Einträgen.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onShowDetails}
          className="block w-full border-t border-base-200 px-4 py-2.5 text-left font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:border-navy-700 dark:text-primary-light"
        >
          Alle Details →
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
            <StatisticEntry
              icon={Hash}
              label="Kennzeichen"
              value={motorcycle.numberPlate?.trim()}
            />
            <StatisticEntry
              icon={FileText}
              label="Stammnummer"
              value={motorcycle.vehicleNr?.trim()}
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
                  {motorcycle.status === "sold" ? "Verkauft" : "Aktiv"}
                  {motorcycle.isVeteran && " • Veteran"}
                </span>
              }
            />
          </div>

          {/* Fuel Consumption Group */}
          {(avgFuelConsumption || avgTripDistance || motorcycle.fuelTankSize) && (
            <div className="border-t border-base-300 pt-4 dark:border-navy-700">
              <h3 className="label-tag mb-3">
                <span className="tabular-nums">02·1</span>
                <span>Treibstoff &amp; Verbrauch</span>
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
          <div className="border-t border-base-300 pt-4 dark:border-navy-700">
            <h3 className="label-tag mb-3">
              <span className="tabular-nums">02·2</span>
              <span>Kauf &amp; Nutzung</span>
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

          {/* Sale Group — only for sold bikes. */}
          {motorcycle.status === "sold" && (
            <div className="border-t border-base-300 pt-4 dark:border-navy-700">
              <h3 className="label-tag mb-3">Verkauf</h3>
              <div className="space-y-3">
                <StatisticEntry
                  icon={Calendar}
                  label="Verkaufsdatum"
                  value={motorcycle.soldDate ? new Date(motorcycle.soldDate).toLocaleDateString("de-CH") : null}
                />
                <StatisticEntry
                  icon={DollarSign}
                  label="Verkaufspreis"
                  value={
                    motorcycle.salePrice !== null && motorcycle.salePrice !== undefined
                      ? formatCurrency(motorcycle.salePrice, motorcycle.saleCurrencyCode || motorcycle.currencyCode || undefined)
                      : null
                  }
                />
                <StatisticEntry
                  icon={Gauge}
                  label="Kilometerstand"
                  value={typeof motorcycle.saleOdo === "number" ? `${formatNumber(motorcycle.saleOdo)} km` : null}
                />
                <StatisticEntry icon={Info} label="Käufer" value={motorcycle.buyerName || null} />
              </div>
            </div>
          )}

          {/* Previous Owners Group — read-only; managed from the edit form. */}
          <div className="border-t border-base-300 pt-4 dark:border-navy-700">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="label-tag">
                <span className="tabular-nums">02·3</span>
                <span>Vorbesitzer</span>
              </h3>
            </div>
            {previousOwnersList.length > 0 ? (
              <ul className="space-y-2">
                {previousOwnersList.map((owner) => (
                  <li
                    key={owner.id}
                    className="relative flex items-center justify-between gap-3 rounded-sm border border-base-300 bg-base-100 px-3 py-2.5 dark:border-navy-700 dark:bg-navy-900/50"
                  >
                    <div className="min-w-0">
                      <p className="font-subdisplay text-sm text-base-content dark:text-white truncate">
                        {owner.name} {owner.surname}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                        {owner.purchaseDate ? `Kauf · ${owner.purchaseDate}` : "Kaufdatum unbekannt"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                {hasUnknownOwners ? "Besitzhistorie unbekannt" : "Keine Vorbesitzer · 1. Hand"}
              </p>
            )}
            {hasUnknownOwners && previousOwnersList.length > 0 && (
              <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                Besitzhistorie unvollständig
              </p>
            )}
          </div>
    </div>
  );
}
