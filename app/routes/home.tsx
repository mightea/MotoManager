import { data, useActionData, useNavigate, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { createMotorcycle } from "~/services/motorcycles";
import { fetchModelSeries } from "~/services/parts";
import { getCurrencies, getUserSettings } from "~/services/settings";
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
  Eye,
  EyeOff,
  Wrench,
  X,
} from "lucide-react";
import clsx from "clsx";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { DropdownMenu } from "~/components/dropdown-menu";
import { Modal } from "~/components/modal";
// Lazy-loaded: pulls in react-easy-crop, which only appears inside this modal.
const AddMotorcycleForm = lazy(() =>
  import("~/components/add-motorcycle-form").then((m) => ({
    default: m.AddMotorcycleForm,
  })),
);
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

  const [dashboardData, currencies, modelSeries, settings] = await Promise.all([
    fetchFromBackend<any>("/home", {}, token),
    getCurrencies(),
    fetchModelSeries(token).catch(() => []),
    getUserSettings(token, user.id).catch(() => null),
  ]);

  const cards: MotorcycleDashboardItem[] = dashboardData?.motorcycles ?? [];
  const stats = normalizeDashboardStats(dashboardData?.stats);
  // Yearly-distance warning threshold for the overview cards (default 150 km/yr).
  const minKmPerYear = settings?.minKmPerYear ?? 150;

  return data({ cards, stats, user, currencies, modelSeries, minKmPerYear });
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
    p.delete("show");
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
    salePrice,
    saleCurrencyCode,
  } = validationResult.data;

  const currencies = await getCurrencies();
  const getCurrencyFactor = (code: string | null | undefined) => {
    if (!code) return 1;
    const currency = currencies.find(c => c.code === code);
    return currency ? currency.conversionFactor : 1;
  };

  const normalizedPurchasePrice = (purchasePrice || 0) * getCurrencyFactor(currencyCode);
  formData.set("normalizedPurchasePrice", normalizedPurchasePrice.toString());

  if (salePrice == null) {
    formData.set("normalizedSalePrice", "");
  } else {
    formData.set("normalizedSalePrice", (salePrice * getCurrencyFactor(saleCurrencyCode)).toString());
  }

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
  const { cards, stats, currencies, modelSeries, minKmPerYear } = loaderData;
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

  // Inactive = sold. Hidden by default; a toggle (?show=all) reveals them.
  const showInactive = searchParams.get("show") === "all";
  const inactiveCount = useMemo(
    () => cards.filter((c: MotorcycleDashboardItem) => (c.status ?? "active") !== "active").length,
    [cards],
  );

  const visibleCards = useMemo(() => {
    const base = showInactive
      ? cards
      : cards.filter((c: MotorcycleDashboardItem) => (c.status ?? "active") === "active");
    const filtered = base.filter((c: MotorcycleDashboardItem) => matchesFilter(c, currentFilter));
    return [...filtered].sort(compareCards(currentSort));
  }, [cards, currentSort, currentFilter, showInactive]);

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

  const toggleShowInactive = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (showInactive) next.delete("show");
      else next.set("show", "all");
      next.delete("page");
      return next;
    }, { replace: true, preventScrollReset: true });
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

      {/* Aktion erforderlich. Single row with horizontal scroll on small
          screens so wrap behavior never reflows when something else (a
          popover, a scrollbar) shifts the available width. */}
      {(counts.overdueInspection + counts.overdueMaintenance + counts.openIssues) > 0 && (
        <div className="order-1 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="label-tag" aria-hidden="true">
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
              tone="critical"
              icon={CalendarDays}
              count={counts.overdueInspection}
              label="überfällige MFK"
              active={currentFilter === "overdue-inspection"}
              onClick={() => toggleFilter("overdue-inspection")}
            />
          )}
          {counts.overdueMaintenance > 0 && (
            <AttentionChip
              tone="alert"
              icon={Wrench}
              count={counts.overdueMaintenance}
              label="Wartung fällig"
              active={currentFilter === "overdue-maintenance"}
              onClick={() => toggleFilter("overdue-maintenance")}
            />
          )}
          {counts.openIssues > 0 && (
            <AttentionChip
              tone="warn"
              icon={AlertTriangle}
              count={counts.openIssues}
              label="offene Mängel"
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

      {/* Fleet telemetry — below the grid on mobile, above on desktop. */}
      {cards.length > 0 && stats && (
        <div className="order-4 sm:order-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="label-tag">
              <span>Flotten-Telemetrie · {new Date().getFullYear()}</span>
            </span>
          </div>
          <DashboardStats stats={stats} />
        </div>
      )}

      {/* Fleet header. Section label sits on its own row above the
          sort + add controls so the page has a clear hierarchy. */}
      <div className="order-2 sm:order-3 flex flex-col gap-2">
        <span className="label-tag">
          <span>Flotte · {cards.length} {cards.length === 1 ? "Eintrag" : "Einträge"}</span>
        </span>

        {/* Sort selector + "show sold" toggle on the left, Neues-Motorrad on
            the right. items-stretch keeps them all the same height so they read
            as a single control row. */}
        <div className="flex items-stretch justify-between gap-3">
          <div className="flex items-stretch gap-2">
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

          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={toggleShowInactive}
              aria-pressed={showInactive}
              title={showInactive ? "Verkaufte ausblenden" : "Verkaufte anzeigen"}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium shadow-[0_1px_0_0_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                showInactive
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-base-300 bg-base-100 text-base-content hover:bg-base-200 dark:bg-navy-800",
              )}
            >
              {showInactive ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-base-content/60" aria-hidden="true" />
              )}
              <span className="hidden font-semibold sm:inline">Verkaufte</span>
              <span
                className={clsx(
                  "font-mono text-[10px] font-semibold tabular-nums",
                  showInactive ? "text-primary/70" : "text-base-content/50",
                )}
              >
                {inactiveCount}
              </span>
            </button>
          )}
          </div>

          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            stripe
            leftIcon={<Plus className="h-4 w-4" />}
            className="h-auto shrink-0"
          >
            <span>Neu<span className="hidden sm:inline">es Motorrad</span></span>
          </Button>
        </div>
      </div>

      <div className="order-3 sm:order-4 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              moto={moto}
              minKmPerYear={minKmPerYear} />
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
        <Suspense
          fallback={
            <div className="py-8 text-center text-sm text-base-content/60">Lädt…</div>
          }
        >
          <AddMotorcycleForm
            onSubmit={() => setIsAddOpen(false)}
            currencies={currencies}
            modelSeries={modelSeries}
          />
        </Suspense>
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

type AttentionTone = "critical" | "alert" | "warn";

/**
 * Attention chip — sharp-cornered tag used in the "§ 01 — Aktion erforderlich"
 * row on the home page. Three tones reflecting the Dakar palette's severity
 * gradient:
 *   critical → error red       (overdue MFK, must act)
 *   alert    → vermillion       (maintenance due, urgent)
 *   warn     → sand / workshop  (open issues, notable)
 *
 * Renders the count in font-numeric (JetBrains Mono tabular) and the label
 * in sans semibold so the number reads as data and the rest stays scannable.
 */
function AttentionChip({
  tone,
  icon: Icon,
  count,
  label,
  active,
  onClick,
}: {
  tone: AttentionTone;
  icon: typeof Clock;
  count: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const tones: Record<AttentionTone, { idle: string; activeCls: string; iconColor: string; railColor: string }> = {
    critical: {
      idle: "border-error/30 bg-error/5 text-error hover:bg-error/10 dark:border-error/40 dark:bg-error/10 dark:text-error",
      activeCls: "border-error bg-error/15 text-error ring-1 ring-error/30 dark:bg-error/25 dark:text-error",
      iconColor: "text-error",
      railColor: "bg-error",
    },
    alert: {
      idle: "border-[var(--color-brand-red)]/30 bg-[var(--color-brand-red)]/5 text-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/10 dark:border-[var(--color-brand-red)]/40 dark:bg-[var(--color-brand-red)]/10",
      activeCls: "border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/15 text-[var(--color-brand-red)] ring-1 ring-[var(--color-brand-red)]/30 dark:bg-[var(--color-brand-red)]/25",
      iconColor: "text-[var(--color-brand-red)]",
      railColor: "bg-[var(--color-brand-red)]",
    },
    warn: {
      idle: "border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 text-[var(--color-workshop-ink)] hover:bg-[var(--color-workshop)]/20 dark:border-[var(--color-workshop)]/50 dark:bg-[var(--color-workshop)]/15 dark:text-[var(--color-workshop-soft)]",
      activeCls: "border-[var(--color-workshop)] bg-[var(--color-workshop)]/25 text-[var(--color-workshop-ink)] ring-1 ring-[var(--color-workshop)]/40 dark:bg-[var(--color-workshop)]/30 dark:text-[var(--color-workshop-soft)]",
      iconColor: "text-[var(--color-workshop)]",
      railColor: "bg-[var(--color-workshop)]",
    },
  };
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-sm border pl-2.5 pr-3 py-1.5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-navy-950",
        active ? t.activeCls : t.idle,
      )}
    >
      <Icon className={clsx("h-3.5 w-3.5 shrink-0", t.iconColor)} aria-hidden="true" />
      <span className="font-numeric text-sm font-semibold tabular-nums leading-none">
        {count}
      </span>
      <span className="text-xs font-semibold leading-none">
        {label}
      </span>
      {active && (
        <span aria-hidden="true" className={clsx("absolute inset-y-1 left-0 w-[3px] rounded-r-sm", t.railColor)} />
      )}
    </button>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
