/**
 * `GET /api/stats/fleet` payload (backend `src/fleet_analysis.rs`).
 * Money is in the normalized currency (CHF), distances in km.
 */

export interface CostBreakdown {
  fuel: number;
  /** Service, fluids, chain, battery, inspection and other upkeep. */
  service: number;
  repair: number;
  tires: number;
  /** Inventory parts booked against a record. */
  parts: number;
  /** Expenses: insurance, tax, fees. */
  fixed: number;
}

export type CostCategory = keyof CostBreakdown;

export interface FleetBikeYear {
  motorcycleId: number;
  distance: number;
  liters: number;
  costs: CostBreakdown;
  totalCost: number;
  avgConsumption: number | null;
}

export interface FleetYear {
  year: number;
  distance: number;
  /** Distance per calendar month, January first. */
  months: number[];
  liters: number;
  motorcycleCount: number;
  costs: CostBreakdown;
  totalCost: number;
  bikes: FleetBikeYear[];
}

export interface FleetMotorcycle {
  id: number;
  make: string;
  model: string;
  status: string;
  ownedFrom: string | null;
  ownedUntil: string | null;
  yearsOwned: number;
  distance: number;
  liters: number;
  avgConsumption: number | null;
  costs: CostBreakdown;
  runningCost: number;
  purchasePrice: number | null;
  salePrice: number | null;
  depreciation: number | null;
  /** Purchase − sale + running cost; null when a needed price is unknown. */
  netCost: number | null;
  runningCostPerKm: number | null;
  netCostPerKm: number | null;
  netCostPerYear: number | null;
}

export interface FuelPriceMonth {
  /** `YYYY-MM` */
  month: string;
  avgPricePerLiter: number;
  liters: number;
}

export interface ConsumptionPoint {
  motorcycleId: number;
  date: string;
  value: number;
}

export interface PeriodTotals {
  distance: number;
  cost: number;
}

export interface FleetStatsPayload {
  today: string;
  currentYear: number;
  /** Ascending. */
  years: FleetYear[];
  motorcycles: FleetMotorcycle[];
  fuelPrices: FuelPriceMonth[];
  consumption: ConsumptionPoint[];
  previousYearToDate: PeriodTotals;
  totals: PeriodTotals;
}
