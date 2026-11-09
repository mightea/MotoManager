import { data, Link, useActionData, useNavigate, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { createMotorcycle } from "~/services/motorcycles";
import { fetchModelSeries } from "~/services/parts";
import { getCurrencies, getUserSettings } from "~/services/settings";
import { requireUser } from "~/services/auth";
import { getUserPrefs, setUserPrefs } from "~/services/preferences";
import { fetchFromBackend } from "~/utils/backend";
import { type MotorcycleDashboardItem, normalizeDashboardStats } from "~/utils/home-stats";
import type { Issue } from "~/types/db";

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
  X,
} from "lucide-react";
import clsx from "clsx";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Card } from "~/components/card";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import { MotorcycleCard } from "~/components/motorcycle-card";
import { Button } from "~/components/button";
import { MotorcycleCardSkeleton } from "~/components/skeleton";
import { EmptyState } from "~/components/empty-state";
import { toast } from "~/hooks/use-toast";

/** An open issue as the garage lists it (card lines + attention details). */
type FleetIssue = {
  id: number;
  motorcycleId: number;
  title: string;
  priority: Issue["priority"];
  date: string | null;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL: Record<string, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

/** Most severe first, then newest. */
function compareIssues(a: FleetIssue, b: FleetIssue): number {
  const rank = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
  if (rank !== 0) return rank;
  return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
}

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
    fetchFromBackend<{ motorcycles?: MotorcycleDashboardItem[]; stats?: unknown }>(
      "/home",
      {},
      token,
    ),
    getCurrencies(),
    fetchModelSeries(token).catch(() => []),
    getUserSettings(token, user.id).catch(() => null),
  ]);

  const cards: MotorcycleDashboardItem[] = dashboardData?.motorcycles ?? [];
  const stats = normalizeDashboardStats(dashboardData?.stats);

  // /home only carries an open-issue count per bike. The cards and the
  // "Aktion erforderlich" details name the issues, so fetch the lists of the
  // (active) bikes that have any — in parallel, degrading to the bare count.
  const issueLists = await Promise.all(
    cards
      .filter((c) => (c.status ?? "active") === "active" && c.numberOfIssues > 0)
      .map((c) =>
        fetchFromBackend<{ issues?: Issue[] }>(`/motorcycles/${c.id}/issues`, {}, token)
          .then((r) => [c.id, r?.issues ?? []] as const)
          .catch(() => null),
      ),
  );
  const openIssuesByBike: Record<number, FleetIssue[]> = {};
  for (const entry of issueLists) {
    if (!entry) continue;
    const [bikeId, issues] = entry;
    openIssuesByBike[bikeId] = issues
      .filter((i) => i.status !== "done")
      .map((i) => ({ id: i.id, title: i.title, priority: i.priority, date: i.date, motorcycleId: bikeId }))
      .sort(compareIssues);
  }
  // Yearly-distance warning threshold for the overview cards (default 150 km/yr).
  const minKmPerYear = settings?.minKmPerYear ?? 150;

  return data({ cards, stats, user, currencies, modelSeries, minKmPerYear, openIssuesByBike });
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
  const { cards, stats, currencies, modelSeries, minKmPerYear, openIssuesByBike } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [currentYear] = useState(() => new Date().getFullYear());
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

  // Attention items only concern active bikes (the backend already zeroes
  // inspection/maintenance/issues for sold ones).
  const activeCards = useMemo(
    () => cards.filter((c: MotorcycleDashboardItem) => (c.status ?? "active") === "active"),
    [cards],
  );
  const overdueInspectionCards = useMemo(
    () => activeCards.filter((c: MotorcycleDashboardItem) => c.nextInspection?.isOverdue),
    [activeCards],
  );
  const maintenanceCards = useMemo(
    () => activeCards.filter((c: MotorcycleDashboardItem) => c.hasOverdueMaintenance),
    [activeCards],
  );
  const fleetIssues = useMemo(
    () => Object.values(openIssuesByBike).flat().sort(compareIssues),
    [openIssuesByBike],
  );
  const counts = useMemo(() => ({
    overdueInspection: overdueInspectionCards.length,
    overdueMaintenance: maintenanceCards.length,
    openIssues: activeCards.reduce((sum: number, c: MotorcycleDashboardItem) => sum + (c.numberOfIssues || 0), 0),
    highIssues: fleetIssues.filter((i) => i.priority === "high").length,
  }), [overdueInspectionCards, maintenanceCards, activeCards, fleetIssues]);

  const bikeById = useMemo(
    () => new Map(cards.map((c: MotorcycleDashboardItem) => [c.id, c])),
    [cards],
  );

  // Busiest bike's km this year — the stats only name it.
  const busiestBikeKm = useMemo(() => {
    const busiest = [...activeCards].sort((a, b) => b.odometerThisYear - a.odometerThisYear)[0];
    return busiest && busiest.odometerThisYear > 0 ? busiest.odometerThisYear : null;
  }, [activeCards]);

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

  const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const bikeName = (id: number) => {
    const bike = bikeById.get(id);
    return bike ? `${bike.make} ${bike.model}` : `#${id}`;
  };
  const bikeHref = (bike: MotorcycleDashboardItem) =>
    `/motorcycle/${createMotorcycleSlug(bike.make, bike.model)}/${bike.id}`;
  const hasAttention = (counts.overdueInspection + counts.overdueMaintenance + counts.openIssues) > 0;
  const activeCount = cards.length - inactiveCount;
  const VISIBLE_ISSUES = 5;

  return (
    <div className="container mx-auto p-4 flex flex-col gap-6 pb-28 sm:pb-12">

      {/* Aktion erforderlich — one bar of filter chips; "Details" unfolds
          the per-bike lists behind each count. */}
      {hasAttention && (
        <section aria-labelledby="attention-heading" className="order-1 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-sm border border-base-300 bg-base-100 py-2 pl-3.5 pr-2.5 dark:border-navy-700 dark:bg-navy-800">
            <h2
              id="attention-heading"
              className="mr-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-base-content/70"
            >
              Aktion erforderlich
            </h2>
            {counts.overdueInspection > 0 && (
              <AttentionChip
                tone="critical"
                count={counts.overdueInspection}
                label={
                  overdueInspectionCards.length === 1 ? (
                    <>MFK überfällig · <strong>{overdueInspectionCards[0].model}</strong></>
                  ) : (
                    "MFK überfällig"
                  )
                }
                active={currentFilter === "overdue-inspection"}
                onClick={() => toggleFilter("overdue-inspection")}
              />
            )}
            {counts.overdueMaintenance > 0 && (
              <AttentionChip
                tone="alert"
                count={counts.overdueMaintenance}
                label="Wartung fällig"
                active={currentFilter === "overdue-maintenance"}
                onClick={() => toggleFilter("overdue-maintenance")}
              />
            )}
            {counts.openIssues > 0 && (
              <AttentionChip
                tone="warn"
                count={counts.openIssues}
                label={
                  <>
                    offene Mängel
                    {counts.highIssues > 0 && (
                      <span className="font-semibold text-error"> · {counts.highIssues} hoch</span>
                    )}
                  </>
                }
                active={currentFilter === "issues"}
                onClick={() => toggleFilter("issues")}
              />
            )}
            {currentFilter !== "all" && (
              <button
                type="button"
                onClick={() => updateParam("filter", null)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Filter aufheben
              </button>
            )}
            <span className="flex-1" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setAttentionOpen((v) => !v)}
              aria-expanded={attentionOpen}
              aria-controls="attention-details"
              className="inline-flex h-8 items-center gap-1 rounded-sm px-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-primary-light"
            >
              Details
              <ChevronDown
                className={clsx("h-3.5 w-3.5 motion-safe:transition-transform", attentionOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          </div>

          {attentionOpen && (
            <div
              id="attention-details"
              className="grid items-start gap-3 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]"
            >
              {overdueInspectionCards.length > 0 && (
                <AttentionPanel title="MFK überfällig" count={overdueInspectionCards.length} accent="error" countClass="text-error">
                  {overdueInspectionCards.map((bike) => (
                    <AttentionRow key={bike.id} to={bikeHref(bike)}>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{bike.make} {bike.model}</span>
                        <span className="font-mono text-[12px] text-base-content/70">
                          fällig {dateFmt.format(new Date(bike.nextInspection!.dueDateISO))}
                          {bike.currentLocationName ? ` · ${bike.currentLocationName}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-error">
                        {bike.nextInspection!.relativeLabel.replace(/\s*überfällig$/, "")}
                      </span>
                    </AttentionRow>
                  ))}
                </AttentionPanel>
              )}
              {maintenanceCards.length > 0 && (
                <AttentionPanel
                  title="Wartung fällig"
                  count={maintenanceCards.length}
                  accent="workshop"
                  countClass="text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]"
                >
                  {maintenanceCards.map((bike) => (
                    <AttentionRow key={bike.id} to={bikeHref(bike)}>
                      <span className="text-sm font-semibold">{bike.make} {bike.model}</span>
                      <span className="text-right text-[13px] text-base-content/70 dark:text-navy-300">
                        {bike.overdueMaintenanceItems.join(", ")}
                      </span>
                    </AttentionRow>
                  ))}
                </AttentionPanel>
              )}
              {counts.openIssues > 0 && (
                <AttentionPanel title="Offene Mängel" count={counts.openIssues} accent="secondary">
                  {fleetIssues.slice(0, VISIBLE_ISSUES).map((issue) => {
                    const bike = bikeById.get(issue.motorcycleId);
                    return (
                      <AttentionRow key={issue.id} to={bike ? bikeHref(bike) : "/"}>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-semibold">{issue.title}</span>
                          <span className="font-mono text-[12px] text-base-content/70">
                            {bikeName(issue.motorcycleId)}
                            {issue.date ? ` · ${dateFmt.format(new Date(issue.date))}` : ""}
                          </span>
                        </span>
                        <span
                          className={clsx(
                            "shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.1em]",
                            issue.priority === "high"
                              ? "text-error"
                              : issue.priority === "medium"
                                ? "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]"
                                : "text-base-content/70",
                          )}
                        >
                          {PRIORITY_LABEL[issue.priority] ?? issue.priority}
                        </span>
                      </AttentionRow>
                    );
                  })}
                  {counts.openIssues > Math.min(VISIBLE_ISSUES, fleetIssues.length) && (
                    <button
                      type="button"
                      onClick={() => updateParam("filter", "issues")}
                      className="block w-full border-t border-base-200 py-2.5 pl-[18px] pr-3.5 text-left font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:border-navy-700 dark:text-primary-light"
                    >
                      + {counts.openIssues - Math.min(VISIBLE_ISSUES, fleetIssues.length)} weitere →
                    </button>
                  )}
                </AttentionPanel>
              )}
            </div>
          )}
        </section>
      )}

      {/* Fleet telemetry — below the grid on mobile, above on desktop. */}
      {cards.length > 0 && stats && (
        <div className="order-4 sm:order-2 flex flex-col gap-3">
          <span className="label-tag">
            <span>Flotten-Telemetrie · {currentYear}</span>
          </span>
          <DashboardStats stats={stats} busiestBikeKm={busiestBikeKm} />
        </div>
      )}

      {/* Fleet header — section label left, sort / sold toggle / add right. */}
      <div className="order-2 sm:order-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="label-tag">
          <span>
            Flotte · {activeCount} aktiv
            {inactiveCount > 0 && ` · ${inactiveCount} verkauft`}
          </span>
        </h2>

        <div className="flex flex-wrap items-stretch gap-2">
          <DropdownMenu
            align="start"
            trigger={
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-base-300 bg-base-100 px-2.5 text-sm font-semibold text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800"
              >
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                  Sort
                </span>
                {ActiveSortIcon && <ActiveSortIcon className="h-3.5 w-3.5 text-base-content/60" aria-hidden="true" />}
                <span>{activeSortOption?.label ?? "Letzte Aktivität"}</span>
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
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-base-300 bg-base-100 px-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-base-content/70 hover:bg-base-200 dark:border-navy-700 dark:bg-navy-800">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={toggleShowInactive}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Verkaufte ({inactiveCount})
            </label>
          )}

          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="h-10 shrink-0"
          >
            <span>Neu<span className="hidden sm:inline">es Motorrad</span></span>
          </Button>
        </div>
      </div>

      <div className="order-3 sm:order-4 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
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
              minKmPerYear={minKmPerYear}
              issues={openIssuesByBike[moto.id]} />
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
 * Attention chip — a tinted tag in the "Aktion erforderlich" bar: the count
 * in the mono face (toned by severity), the label in body text. Toggles the
 * matching grid filter.
 */
function AttentionChip({
  tone,
  count,
  label,
  active,
  onClick,
}: {
  tone: AttentionTone;
  count: number;
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const tones: Record<AttentionTone, { chip: string; count: string; ring: string }> = {
    critical: {
      chip: "border-error/30 bg-error/5 dark:border-error/40 dark:bg-error/10",
      count: "text-error",
      ring: "ring-error/50",
    },
    alert: {
      chip: "border-[var(--color-workshop)]/40 bg-[var(--color-workshop)]/10 dark:bg-[var(--color-workshop)]/15",
      count: "text-[var(--color-workshop-ink)] dark:text-[var(--color-workshop-soft)]",
      ring: "ring-[var(--color-workshop)]/60",
    },
    warn: {
      chip: "border-secondary/25 bg-secondary/5 dark:border-navy-500 dark:bg-secondary/20",
      count: "text-secondary dark:text-navy-200",
      ring: "ring-secondary/40",
    },
  };
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm border px-2.5 text-[13px] text-base-content motion-safe:transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white",
        t.chip,
        active && clsx("ring-2", t.ring),
      )}
    >
      <span className={clsx("font-numeric font-bold tabular-nums", t.count)}>{count}</span>
      <span>{label}</span>
    </button>
  );
}

/** One of the "Aktion erforderlich" detail cards: rail, title, count, rows. */
function AttentionPanel({
  title,
  count,
  accent,
  countClass,
  children,
}: {
  title: string;
  count: number;
  accent: "error" | "workshop" | "secondary";
  countClass?: string;
  children: ReactNode;
}) {
  return (
    <Card accent={accent}>
      <div className="flex items-baseline justify-between gap-3 border-b border-base-200 py-3 pl-[18px] pr-3.5 dark:border-navy-700">
        <h3 className="font-subdisplay text-sm uppercase tracking-[0.06em] text-base-content dark:text-white">{title}</h3>
        <span className={clsx("font-numeric text-xl font-bold", countClass ?? "text-base-content dark:text-white")}>{count}</span>
      </div>
      <div className="divide-y divide-base-200/70 dark:divide-navy-700">{children}</div>
    </Card>
  );
}

function AttentionRow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      prefetch="intent"
      className="flex items-start justify-between gap-3 py-2 pl-[18px] pr-3.5 text-base-content hover:bg-base-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:text-white dark:hover:bg-navy-700/40"
    >
      {children}
    </Link>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
