import { Link, data, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { createMotorcycle } from "~/services/motorcycles";
import { getCurrencies } from "~/services/settings";
import { requireUser } from "~/services/auth";
import { getUserPrefs, setUserPrefs } from "~/services/preferences";
import { fetchFromBackend } from "~/utils/backend";
import { type MotorcycleDashboardItem } from "~/utils/home-stats";

import {
  CalendarDays,
  Gauge,
  Plus,
  Clock,
  Tag,
  Calendar,
  ChevronDown,
  Map as MapIcon,
  AlertTriangle,
  Wrench,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useIsOffline } from "~/utils/offline";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { motorcycleSchema } from "~/validations";

import { DashboardStats } from "~/components/dashboard-stats";
import { MotorcycleCard } from "~/components/motorcycle-card";
import { Button } from "~/components/button";
import { MotorcycleCardSkeleton } from "~/components/skeleton";

type SortKey = "updated" | "make" | "age" | "location" | "inspection";
type FilterKey = "all" | "overdue-inspection" | "overdue-maintenance" | "issues" | "veteran";

const SORT_KEYS: ReadonlyArray<SortKey> = [
  "updated",
  "make",
  "age",
  "location",
  "inspection",
];
const FILTER_KEYS: ReadonlyArray<FilterKey> = [
  "all",
  "overdue-inspection",
  "overdue-maintenance",
  "issues",
  "veteran",
];

export function meta() {
  return [
    { title: "Garage - Moto Manager" },
    { name: "description", content: "Verwalte deine Motorräder, Wartungen und Dokumente." },
  ];
}

export async function clientLoader({ request: _request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(_request);

  const [dashboardData, currencies] = await Promise.all([
    fetchFromBackend<any>("/home", {}, token),
    getCurrencies(),
  ]);

  const cards: MotorcycleDashboardItem[] = dashboardData?.motorcycles ?? [];
  const stats = dashboardData?.stats;

  return data({ cards, stats, user, currencies });
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}) {
  // Sort and filter live in the URL but are applied client-side.
  // Skip revalidation when only those params change on the same path.
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;

  const stripVolatile = (u: URL) => {
    const p = new URLSearchParams(u.searchParams);
    p.delete("sort");
    p.delete("filter");
    return p.toString();
  };

  if (stripVolatile(currentUrl) === stripVolatile(nextUrl)) return false;
  return defaultShouldRevalidate;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user: _user, token } = await requireUser(request);
  const formData = await request.formData();

  const rawData = Object.fromEntries(formData);
  const validationResult = motorcycleSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errors = validationResult.error.flatten().fieldErrors;
    const formattedErrors: Record<string, string> = {};
    for (const key of Object.keys(errors)) {
      const fieldKey = key as keyof typeof errors;
      if (errors[fieldKey]) {
        formattedErrors[key] = errors[fieldKey]![0];
      }
    }
    return data({ errors: formattedErrors }, { status: 400 });
  }

  const {
    purchasePrice,
    currencyCode,
  } = validationResult.data;

  const currencies = await getCurrencies();
  const getCurrencyFactor = (code: string | null | undefined) => {
    if (!code) return 1;
    const currency = currencies.find(c => c.code === code);
    return currency ? currency.conversionFactor : 1;
  };

  const normalizedPurchasePrice = (purchasePrice || 0) * getCurrencyFactor(currencyCode);
  formData.set("normalizedPurchasePrice", normalizedPurchasePrice.toString());

  await createMotorcycle(token, formData);

  return data({ success: true });
}

function ageMs(card: MotorcycleDashboardItem): number {
  if (card.firstRegistration) return new Date(card.firstRegistration).getTime();
  if (card.fabricationDate) {
    return new Date(card.fabricationDate.split("/").reverse().join("-")).getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

function compareCards(sort: SortKey) {
  return (a: MotorcycleDashboardItem, b: MotorcycleDashboardItem) => {
    switch (sort) {
      case "location": {
        const codeA = a.currentLocationCountryCode || "ZZ";
        const codeB = b.currentLocationCountryCode || "ZZ";
        if (codeA === "CH" && codeB !== "CH") return -1;
        if (codeA !== "CH" && codeB === "CH") return 1;
        const codeCompare = codeA.localeCompare(codeB);
        if (codeCompare !== 0) return codeCompare;
        const locA = a.currentLocationName || "Unknown";
        const locB = b.currentLocationName || "Unknown";
        const locCompare = locA.localeCompare(locB);
        if (locCompare !== 0) return locCompare;
        return ageMs(b) - ageMs(a);
      }
      case "age":
        return ageMs(a) - ageMs(b);
      case "make":
        return a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
      case "inspection": {
        const insA = a.nextInspection?.dueDateISO ? new Date(a.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        const insB = b.nextInspection?.dueDateISO ? new Date(b.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        return insA - insB;
      }
      case "updated":
      default: {
        const actA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const actB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return actB - actA;
      }
    }
  };
}

function matchesFilter(card: MotorcycleDashboardItem, filter: FilterKey): boolean {
  switch (filter) {
    case "overdue-inspection":
      return Boolean(card.nextInspection?.isOverdue);
    case "overdue-maintenance":
      return Boolean(card.hasOverdueMaintenance);
    case "issues":
      return card.numberOfIssues > 0;
    case "veteran":
      return Boolean(card.isVeteran);
    case "all":
    default:
      return true;
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, stats, currencies } = loaderData;
  const isOffline = useIsOffline();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const actionData = useActionData<{ success?: boolean }>();
  const navigation = useNavigation();

  const isLoading = navigation.state === "loading" && !navigation.formData;

  const sortParam = searchParams.get("sort") as SortKey | null;
  const filterParam = searchParams.get("filter") as FilterKey | null;

  const currentSort: SortKey = useMemo(() => {
    if (sortParam && SORT_KEYS.includes(sortParam)) return sortParam;
    const stored = getUserPrefs().sort as SortKey | undefined;
    if (stored && SORT_KEYS.includes(stored)) return stored;
    return "updated";
  }, [sortParam]);

  const currentFilter: FilterKey = useMemo(() => {
    if (filterParam && FILTER_KEYS.includes(filterParam)) return filterParam;
    return "all";
  }, [filterParam]);

  // Persist sort preference whenever it actually changes.
  useEffect(() => {
    if (sortParam && SORT_KEYS.includes(sortParam)) {
      const prefs = getUserPrefs();
      if (prefs.sort !== sortParam) {
        setUserPrefs({ ...prefs, sort: sortParam });
      }
    }
  }, [sortParam]);

  useEffect(() => {
    if (actionData?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddOpen(false);
    }
  }, [actionData]);

  const counts = useMemo(() => ({
    overdueInspection: cards.filter((c: MotorcycleDashboardItem) => c.nextInspection?.isOverdue).length,
    overdueMaintenance: cards.filter((c: MotorcycleDashboardItem) => c.hasOverdueMaintenance).length,
    openIssues: cards.reduce((sum: number, c: MotorcycleDashboardItem) => sum + (c.numberOfIssues || 0), 0),
  }), [cards]);

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((c: MotorcycleDashboardItem) => matchesFilter(c, currentFilter));
    return [...filtered].sort(compareCards(currentSort));
  }, [cards, currentSort, currentFilter]);

  const sortOptions: { id: SortKey; label: string; icon: typeof Clock }[] = [
    { id: "updated", label: "Aktualität", icon: Clock },
    { id: "make", label: "Marke", icon: Tag },
    { id: "age", label: "Alter", icon: Calendar },
    { id: "location", label: "Standort", icon: MapIcon },
    { id: "inspection", label: "MFK", icon: CalendarDays },
  ];

  const activeSortOption = sortOptions.find(o => o.id === currentSort);
  const ActiveSortIcon = activeSortOption?.icon;

  const updateParam = (key: "sort" | "filter", value: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true, preventScrollReset: true });
  };

  const toggleFilter = (next: FilterKey) => {
    updateParam("filter", currentFilter === next ? null : next);
  };

  const offlineHint = "Offline – nur in Verbindung mit dem Server möglich.";

  return (
    <div className="container mx-auto p-4 flex flex-col gap-6 pb-28 sm:pb-12 motion-safe:animate-fade-in">

      {/* Needs-attention chips: only render if anything is actionable */}
      {(counts.overdueInspection + counts.overdueMaintenance + counts.openIssues) > 0 && (
        <div className="order-1 flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-secondary dark:text-navy-400">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            Aktion erforderlich:
          </span>
          {counts.overdueInspection > 0 && (
            <AttentionChip
              tone="red"
              icon={CalendarDays}
              label={`${counts.overdueInspection} überfällige MFK`}
              active={currentFilter === "overdue-inspection"}
              onClick={() => toggleFilter("overdue-inspection")}
            />
          )}
          {counts.overdueMaintenance > 0 && (
            <AttentionChip
              tone="orange"
              icon={Wrench}
              label={`${counts.overdueMaintenance} Wartung fällig`}
              active={currentFilter === "overdue-maintenance"}
              onClick={() => toggleFilter("overdue-maintenance")}
            />
          )}
          {counts.openIssues > 0 && (
            <AttentionChip
              tone="amber"
              icon={AlertTriangle}
              label={`${counts.openIssues} offene Mängel`}
              active={currentFilter === "issues"}
              onClick={() => toggleFilter("issues")}
            />
          )}
          {currentFilter !== "all" && (
            <button
              type="button"
              onClick={() => updateParam("filter", null)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-secondary underline-offset-2 hover:text-foreground hover:underline dark:text-navy-300 dark:hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Filter aufheben
            </button>
          )}
        </div>
      )}

      {/* Compact fleet stats — below the grid on mobile, above on desktop */}
      {cards.length > 0 && stats && (
        <DashboardStats stats={stats} className="order-4 sm:order-2" />
      )}

      {/* Header Actions */}
      <div className="order-2 sm:order-3 flex items-center justify-between">
        {/* Sort Dropdown */}
        <Menu>
          <MenuButton className="inline-flex items-center justify-center gap-x-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-secondary shadow-sm hover:bg-gray-50 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700">
            {ActiveSortIcon && <ActiveSortIcon className="h-4 w-4 text-secondary/70 dark:text-navy-400" aria-hidden="true" />}
            <span className="text-secondary/70 dark:text-navy-400">Sortiert nach</span>
            <span className="font-semibold text-foreground dark:text-white">{activeSortOption?.label ?? "Aktualität"}</span>
            <ChevronDown className="h-4 w-4 text-secondary/70 dark:text-navy-400" aria-hidden="true" />
          </MenuButton>

          <MenuItems
            transition
            anchor={{ to: "bottom start", gap: 8 }}
            className="z-30 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in dark:border-navy-700 dark:bg-navy-800 dark:ring-white/10"
          >
            {sortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = currentSort === option.id;
              return (
                <MenuItem key={option.id}>
                  <Link
                    to={`?${(() => {
                      const p = new URLSearchParams(searchParams);
                      p.set("sort", option.id);
                      return p.toString();
                    })()}`}
                    prefetch="intent"
                    replace
                    preventScrollReset
                    className={clsx(
                      "group flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                        : "text-secondary hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    )}
                  >
                    <Icon className={clsx("h-4 w-4", isActive ? "text-primary dark:text-primary-light" : "text-secondary/70 dark:text-navy-400")} />
                    {option.label}
                  </Link>
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>

        <Button
          onClick={() => setIsAddOpen(true)}
          disabled={isOffline}
          aria-disabled={isOffline}
          title={isOffline ? offlineHint : undefined}
          className="relative"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Neues Motorrad</span>
        </Button>
      </div>

      {/* FAB on mobile — hidden while modal is open */}
      {!isAddOpen && (
        <button
          onClick={() => setIsAddOpen(true)}
          disabled={isOffline}
          aria-disabled={isOffline}
          title={isOffline ? offlineHint : undefined}
          className={clsx(
            "fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg motion-safe:transition-all motion-safe:active:scale-95 sm:hidden",
            isOffline
              ? "bg-gray-400 cursor-not-allowed opacity-60"
              : "bg-primary shadow-primary/30 hover:bg-primary-dark hover:shadow-xl"
          )}
          aria-label="Neues Motorrad hinzufügen"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <div className="order-3 sm:order-4 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && cards.length > 0 ? (
          [...Array(Math.min(cards.length, 6))].map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <MotorcycleCardSkeleton key={i} />
          ))
        ) : cards.length === 0 ? (
          <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-10 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-100 dark:bg-navy-700">
              <Gauge className="h-6 w-6 text-gray-400 dark:text-navy-300" />
            </div>
            <h3 className="text-base font-semibold text-foreground dark:text-white">
              Keine Motorräder gefunden
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-secondary dark:text-navy-400">
              Deine Garage ist leer. Füge dein erstes Motorrad hinzu.
            </p>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="mt-5"
              disabled={isOffline}
              aria-disabled={isOffline}
              title={isOffline ? offlineHint : undefined}
            >
              <Plus className="h-4 w-4" />
              Motorrad hinzufügen
            </Button>
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="col-span-full flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <h3 className="text-sm font-semibold text-foreground dark:text-white">
              Keine Motorräder im aktuellen Filter
            </h3>
            <button
              type="button"
              onClick={() => updateParam("filter", null)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 dark:text-primary-light"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Filter aufheben
            </button>
          </div>
        ) : (
          visibleCards.map((moto: MotorcycleDashboardItem) => (
            <MotorcycleCard
              key={moto.id}
              moto={moto} />
          ))
        )}
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Motorrad hinzufügen"
        description="Füge ein neues Fahrzeug zu deiner Garage hinzu."
      >
        <AddMotorcycleForm onSubmit={() => setIsAddOpen(false)} currencies={currencies} />
      </Modal>
    </div>
  );
}

function AttentionChip({
  tone,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  tone: "red" | "orange" | "amber";
  icon: typeof Clock;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const tones: Record<typeof tone, { idle: string; activeCls: string; iconColor: string }> = {
    red: {
      idle: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
      activeCls: "border-red-500 bg-red-500/15 text-red-700 ring-1 ring-red-400/40 dark:bg-red-500/25 dark:text-red-200",
      iconColor: "text-red-500",
    },
    orange: {
      idle: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-300",
      activeCls: "border-orange-500 bg-orange-500/15 text-orange-700 ring-1 ring-orange-400/40 dark:bg-orange-500/25 dark:text-orange-200",
      iconColor: "text-orange-500",
    },
    amber: {
      idle: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
      activeCls: "border-amber-500 bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/40 dark:bg-amber-500/25 dark:text-amber-200",
      iconColor: "text-amber-500",
    },
  };
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold motion-safe:transition-colors",
        active ? t.activeCls : t.idle,
      )}
    >
      <Icon className={clsx("h-3.5 w-3.5", t.iconColor)} aria-hidden="true" />
      {label}
    </button>
  );
}
