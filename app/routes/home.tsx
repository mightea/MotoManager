import { data, useActionData, useNavigate, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { createMotorcycle } from "~/services/motorcycles";
import { getCurrencies } from "~/services/settings";
import { requireUser } from "~/services/auth";
import { getUserPrefs, setUserPrefs } from "~/services/preferences";
import { fetchFromBackend } from "~/utils/backend";
import { type MotorcycleDashboardItem, normalizeDashboardStats } from "~/utils/home-stats";

import {
  CalendarDays,
  Gauge,
  Plus,
  Clock,
  Tag,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  AlertTriangle,
  Wrench,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { DropdownMenu } from "~/components/dropdown-menu";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { motorcycleSchema } from "~/validations";

import { DashboardStats } from "~/components/dashboard-stats";
import { MotorcycleCard } from "~/components/motorcycle-card";
import { Button } from "~/components/button";
import { MotorcycleCardSkeleton } from "~/components/skeleton";
import { EmptyState } from "~/components/empty-state";
import { toast } from "~/hooks/use-toast";

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

// Matches the backend's DEFAULT_PAGE_SIZE for /api/motorcycles so the UX
// stays consistent if the cards switch to server-side pagination later.
const PAGE_SIZE = 20;

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
  const stats = normalizeDashboardStats(dashboardData?.stats);

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
        return ageMs(b) - ageMs(a);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
      toast.success("Motorrad hinzugefügt");
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

  // Pagination — server-side contract (page/pageSize/total/totalPages) applied
  // client-side over the /home payload so cards/filters/attention chips still
  // have the enriched fields they need. Swap to a paginated backend call once
  // /home or /motorcycles returns the enriched dashboard shape.
  const totalPages = Math.max(1, Math.ceil(visibleCards.length / PAGE_SIZE));

  const pageParam = searchParams.get("page");
  const requestedPage = pageParam ? Number(pageParam) : 1;
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages)
    : 1;

  // If the page number in the URL no longer points to a valid page (e.g. the
  // user changed filter and the visible count shrank), normalize it.
  useEffect(() => {
    if (!pageParam) return;
    if (!Number.isFinite(requestedPage) || requestedPage < 1 || requestedPage > totalPages) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (totalPages <= 1) next.delete("page");
        else next.set("page", String(totalPages));
        return next;
      }, { replace: true, preventScrollReset: true });
    }
  }, [pageParam, requestedPage, totalPages, setSearchParams]);

  const pagedCards = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleCards.slice(start, start + PAGE_SIZE);
  }, [visibleCards, currentPage]);

  const pageStart = visibleCards.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, visibleCards.length);

  const sortOptions: { id: SortKey; label: string; icon: typeof Clock }[] = [
    { id: "updated", label: "Letzte Aktivität", icon: Clock },
    { id: "make", label: "Marke (A–Z)", icon: Tag },
    { id: "age", label: "Baujahr (neu → alt)", icon: Calendar },
    { id: "location", label: "Standort", icon: MapIcon },
    { id: "inspection", label: "MFK (fällig zuerst)", icon: CalendarDays },
  ];

  const activeSortOption = sortOptions.find(o => o.id === currentSort);
  const ActiveSortIcon = activeSortOption?.icon;

  const updateParam = (key: "sort" | "filter" | "page", value: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      // Sort and filter changes invalidate the current page index.
      if (key === "sort" || key === "filter") next.delete("page");
      return next;
    }, { replace: true, preventScrollReset: true });
  };

  const toggleFilter = (next: FilterKey) => {
    updateParam("filter", currentFilter === next ? null : next);
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    updateParam("page", clamped === 1 ? null : String(clamped));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col gap-6 pb-28 sm:pb-12">

      {/* § 01 — Aktion erforderlich. Single row with horizontal scroll on
          small screens so wrap behavior never reflows when something else
          (a popover, a scrollbar) shifts the available width. */}
      {(counts.overdueInspection + counts.overdueMaintenance + counts.openIssues) > 0 && (
        <div className="order-1 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="label-tag" aria-hidden="true">
              <span className="tabular-nums">§ 01</span>
              <span>Aktion erforderlich</span>
            </span>
          </div>
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <span className="sr-only">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
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
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium text-secondary underline-offset-2 hover:text-foreground hover:underline dark:text-navy-300 dark:hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Filter aufheben
            </button>
          )}
          </div>
        </div>
      )}

      {/* § 02 — FLEET TELEMETRY. Below the grid on mobile, above on desktop. */}
      {cards.length > 0 && stats && (
        <div className="order-4 sm:order-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="label-tag">
              <span className="tabular-nums">§ 02</span>
              <span>Flotten-Telemetrie · {new Date().getFullYear()}</span>
            </span>
          </div>
          <DashboardStats stats={stats} />
        </div>
      )}

      {/* § 03 — Fleet header. Section label sits on its own row above the
          sort/add controls; this gives the page a clear hierarchy. */}
      <div className="order-2 sm:order-3 flex flex-col gap-2">
        <div className="flex items-end justify-between gap-3">
          <span className="label-tag">
            <span className="tabular-nums">§ 03</span>
            <span>Flotte · {cards.length} {cards.length === 1 ? "Eintrag" : "Einträge"}</span>
          </span>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="relative hidden sm:inline-flex"
          >
            <Plus className="h-5 w-5" />
            <span>Neues Motorrad</span>
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Sort Dropdown — slimmer, with a mono "SORT" label */}
          <DropdownMenu
            align="start"
            trigger={
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-base-300 bg-base-100 px-3 py-2 text-sm font-medium text-base-content shadow-[0_1px_0_0_rgba(15,23,42,0.04)] hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-navy-800"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
                  Sort
                </span>
                <span className="h-3 w-px bg-base-300 dark:bg-navy-600" aria-hidden="true" />
                {ActiveSortIcon && <ActiveSortIcon className="h-3.5 w-3.5 text-base-content/60" aria-hidden="true" />}
                <span className="font-semibold">{activeSortOption?.label ?? "Letzte Aktivität"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-base-content/50" aria-hidden="true" />
              </button>
            }
          >
            {sortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = currentSort === option.id;
              return (
                <DropdownMenu.Item
                  key={option.id}
                  icon={<Icon className={clsx("h-4 w-4", isActive ? "text-primary" : "text-base-content/60")} />}
                  onSelect={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set("sort", option.id);
                    p.delete("page");
                    navigate(`?${p.toString()}`, { replace: true, preventScrollReset: true });
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={clsx(isActive && "bg-primary/10 text-primary")}
                >
                  {option.label}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu>
        </div>
      </div>

      {/* FAB on mobile — workshop-style "ADD" pill that doesn't compete
          with the desktop button. */}
      {!isAddOpen && (
        <button
          onClick={() => setIsAddOpen(true)}
          className="group fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary px-4 py-3 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] motion-safe:transition-all motion-safe:active:scale-95 hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 dark:focus-visible:ring-offset-navy-950 sm:hidden"
          aria-label="Neues Motorrad hinzufügen"
        >
          <Plus className="h-4 w-4" />
          <span>Neu</span>
          <span aria-hidden="true" className="motorsport-stripe absolute inset-x-3 -bottom-px h-[3px]" />
        </button>
      )}

      <div className="order-3 sm:order-4 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && cards.length > 0 ? (
          [...Array(Math.min(cards.length, 6))].map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <MotorcycleCardSkeleton key={i} />
          ))
        ) : cards.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Gauge}
              title="Garage leer"
              description="Lege das erste Fahrzeug an, um Wartungen, Tanken und Mängel zu erfassen."
              action={
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Motorrad hinzufügen
                </Button>
              }
            />
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              size="sm"
              title="Keine Motorräder im aktuellen Filter"
              action={
                <button
                  type="button"
                  onClick={() => updateParam("filter", null)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-primary-light"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Filter aufheben
                </button>
              }
            />
          </div>
        ) : (
          pagedCards.map((moto: MotorcycleDashboardItem) => (
            <MotorcycleCard
              key={moto.id}
              moto={moto} />
          ))
        )}
      </div>

      {/* Pagination — only shown when more than one page exists */}
      {visibleCards.length > PAGE_SIZE && (
        <Pagination
          className="order-3 sm:order-5"
          page={currentPage}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={visibleCards.length}
          onChange={goToPage}
        />
      )}

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

function Pagination({
  page,
  totalPages,
  pageStart,
  pageEnd,
  total,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label="Seitennavigation"
      className={clsx(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs text-base-content/60 tabular-nums">
        <span className="font-semibold text-base-content">{pageStart}–{pageEnd}</span> von{" "}
        <span className="font-semibold text-base-content">{total}</span>
      </p>

      <div className="join">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={!canPrev}
          className="btn btn-sm join-item"
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zurück</span>
        </button>
        <span
          className="btn btn-sm join-item pointer-events-none tabular-nums"
          aria-current="page"
        >
          Seite {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={!canNext}
          className="btn btn-sm join-item"
          aria-label="Nächste Seite"
        >
          <span className="hidden sm:inline">Weiter</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
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
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-navy-950",
        active ? t.activeCls : t.idle,
      )}
    >
      <Icon className={clsx("h-3.5 w-3.5", t.iconColor)} aria-hidden="true" />
      {label}
    </button>
  );
}
