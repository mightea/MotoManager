import { useEffect, useState } from "react";
import { FormattedText } from "~/components/formatted-text";
import { Link, useActionData, useLoaderData, useSearchParams } from "react-router";
import clsx from "clsx";
import { toast } from "~/hooks/use-toast";
import type { Route } from "./+types/fleet-expenses";
import { requireUser } from "~/services/auth";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "~/services/expenses";
import { getCurrencies } from "~/services/settings";
import { fetchFromBackend } from "~/utils/backend";
import { Plus, Receipt, Pencil } from "lucide-react";
import { ExpenseDialog } from "~/components/expense-dialog";
import { EmptyState } from "~/components/empty-state";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/button";
import { Card, CardHeading } from "~/components/card";
import { formatCurrency } from "~/utils/numberUtils";
import { SERIES_COLORS } from "~/utils/map-analysis";
import { useTheme } from "~/components/theme-provider";
import type { Expense, Motorcycle } from "~/types/db";

// One date format across the app: 01.07.2026, not 1.7.2026.
const DATE_FORMAT = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function countLabel(n: number): string {
  return `${n} ${n === 1 ? "Ausgabe" : "Ausgaben"}`;
}

/** Sum per currency — "CHF 754.52", or "CHF 700.00 + EUR 40.00" when mixed. */
function formatTotals(list: Expense[]): string {
  const sums = new Map<string, number>();
  for (const expense of list) sums.set(expense.currency, (sums.get(expense.currency) ?? 0) + expense.amount);
  return [...sums.entries()].map(([currency, sum]) => formatCurrency(sum, currency)).join(" + ");
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);
  
  const [expenses, currencies, motorcyclesResponse] = await Promise.all([
    listExpenses(token),
    getCurrencies(),
    fetchFromBackend<{ motorcycles: Motorcycle[] }>("/motorcycles", {}, token),
  ]);

  return { 
    expenses,
    currencies,
    motorcycles: motorcyclesResponse.motorcycles,
    user,
    currentYear: new Date().getFullYear(),
  };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "createExpense" || intent === "updateExpense") {
    const motorcycleIds = formData.getAll("motorcycleIds[]").map(id => parseInt(id as string, 10));
    const expenseData = {
      date: formData.get("date") as string,
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string || null,
      // Always sent: "" clears stale formatting, an absent key would keep it.
      descriptionMarkup: (formData.get("descriptionMarkup") as string | null) ?? "",
      motorcycleIds,
      intervalMonths: null, // Future use
    };

    if (intent === "createExpense") {
      await createExpense(token, expenseData);
    } else {
      const id = parseInt(formData.get("expenseId") as string, 10);
      await updateExpense(token, id, expenseData);
    }
    return { success: true, intent };
  }

  if (intent === "deleteExpense") {
    const id = parseInt(formData.get("expenseId") as string, 10);
    await deleteExpense(token, id);
    return { success: true, intent };
  }

  return { success: false };
}

export default function FleetExpenses() {
  const { expenses, currencies, motorcycles, currentYear } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<{ success?: boolean; intent?: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";

  // Close the dialog when an action result arrives — adjusted during render
  // so the dialog never repaints over the fresh list. The toast stays in an
  // effect: it is a real one-shot side effect on the toast store.
  const [prevActionData, setPrevActionData] = useState(actionData);
  if (prevActionData !== actionData) {
    setPrevActionData(actionData);
    if (actionData?.success) {
      setIsDialogOpen(false);
      setSelectedExpense(null);
    }
  }

  useEffect(() => {
    if (!actionData?.success) return;
    switch (actionData.intent) {
      case "createExpense":
        toast.success("Ausgabe hinzugefügt");
        break;
      case "updateExpense":
        toast.success("Ausgabe aktualisiert");
        break;
      case "deleteExpense":
        toast.success("Ausgabe gelöscht");
        break;
    }
  }, [actionData]);

  const openAddDialog = () => {
    setSelectedExpense(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDialogOpen(true);
  };

  // Year filter — `?jahr=2026` or `?jahr=alle`; defaults to the running year
  // when it has entries, else the latest year with entries.
  const years = [...new Set(expenses.map((expense) => yearOf(expense.date)))].sort((a, b) => b - a);
  const yearParam = searchParams.get("jahr");
  const defaultYear: number | null = years.includes(currentYear) ? currentYear : (years[0] ?? null);
  const selectedYear: number | null =
    yearParam === "alle" ? null : yearParam && years.includes(Number(yearParam)) ? Number(yearParam) : defaultYear;
  const setYear = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("jahr", value);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };
  const yearLabel = selectedYear === null ? "Gesamt" : String(selectedYear);

  const visible = expenses
    .filter((expense) => selectedYear === null || yearOf(expense.date) === selectedYear)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const total = formatTotals(visible);
  const singleCurrency = new Set(visible.map((expense) => expense.currency)).size === 1 ? visible[0].currency : null;

  // Summary tiles: the year's total, the biggest category, and what lacks a
  // category (or the runner-up category when nothing is missing).
  const byCategory = new Map<string, Expense[]>();
  const uncategorized: Expense[] = [];
  for (const expense of visible) {
    if (!expense.category) {
      uncategorized.push(expense);
      continue;
    }
    byCategory.set(expense.category, [...(byCategory.get(expense.category) ?? []), expense]);
  }
  const categoryRanking = [...byCategory.entries()].sort(
    (a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0),
  );
  const tiles: { label: string; value: string; note: string; rail: string }[] = [];
  if (visible.length > 0) {
    tiles.push({
      label: `Summe ${yearLabel}`,
      value: total,
      note: countLabel(visible.length),
      rail: "bg-secondary",
    });
    const [top, second] = categoryRanking;
    if (top) {
      tiles.push({ label: top[0], value: formatTotals(top[1]), note: countLabel(top[1].length), rail: "bg-primary" });
    }
    if (uncategorized.length > 0) {
      tiles.push({
        label: "Ohne Kategorie",
        value: formatTotals(uncategorized),
        note: [...new Set(uncategorized.map((e) => e.description || "Ohne Bezeichnung"))].join(", "),
        rail: "bg-[var(--color-workshop)]",
      });
    } else if (second) {
      tiles.push({ label: second[0], value: formatTotals(second[1]), note: countLabel(second[1].length), rail: "bg-accent" });
    }
  }

  // Same colour per bike as Statistiken and Karte: ascending id.
  const bikeColors = new Map<number, string>();
  [...motorcycles]
    .sort((a, b) => a.id - b.id)
    .forEach((m, i) => bikeColors.set(m.id, SERIES_COLORS[Math.min(i, SERIES_COLORS.length - 1)][mode]));
  const bikeName = (id: number) => {
    const bike = motorcycles.find((candidate) => candidate.id === id);
    return bike ? `${bike.make} ${bike.model}` : "Unbekanntes Motorrad";
  };

  // Per-bike share, split equally across linked bikes — the same rule the
  // backend's fleet statistics use. Only meaningful in a single currency.
  const bikeShares = (() => {
    if (!singleCurrency) return [];
    const totals = new Map<number | null, number>();
    for (const expense of visible) {
      const ids = expense.motorcycleIds?.length ? expense.motorcycleIds : [null];
      for (const id of ids) totals.set(id, (totals.get(id) ?? 0) + expense.amount / ids.length);
    }
    return [...totals.entries()]
      .map(([id, amount]) => ({
        key: id ?? "none",
        label: id == null ? "Ohne Motorrad" : bikeName(id),
        color: id == null ? undefined : bikeColors.get(id),
        unassigned: id == null,
        amount,
      }))
      .sort((a, b) => Number(a.unassigned) - Number(b.unassigned) || b.amount - a.amount);
  })();
  const maxShare = Math.max(...bikeShares.map((share) => share.amount), 1);

  const CAPTION = "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]";
  const TH = clsx(CAPTION, "px-3 py-2.5 text-left text-base-content/70 first:pl-4 last:pr-4 dark:text-navy-300");

  const categoryBadge = (expense: Expense) =>
    expense.category ? (
      <span className={clsx(CAPTION, "whitespace-nowrap rounded-sm border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary dark:bg-primary/20 dark:text-primary-light")}>
        {expense.category}
      </span>
    ) : (
      <span className={clsx(CAPTION, "whitespace-nowrap rounded-sm border border-warning/40 bg-warning/10 px-2 py-0.5 text-[var(--color-workshop-ink)] dark:text-warning")}>
        — Kategorie fehlt
      </span>
    );

  const bikeChips = (expense: Expense) => (
    <span className="flex flex-wrap gap-1">
      {(expense.motorcycleIds ?? []).map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-base-300 px-1.5 py-0.5 text-xs font-semibold text-base-content dark:border-navy-700 dark:text-white"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0" style={{ backgroundColor: bikeColors.get(id) }} />
          {bikeName(id)}
        </span>
      ))}
    </span>
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-24 md:p-6">
      <PageHeader
        eyebrow="Flotte"
        title="Ausgaben"
        description="Versicherungen, Steuern und andere Ausgaben, die mehrere Motorräder gemeinsam betreffen."
        actions={
          <>
            {years.length > 0 && (
              <label className="flex h-10 items-center gap-2 rounded-sm border border-base-300 bg-base-100 px-2.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300">
                Jahr
                <select
                  value={selectedYear === null ? "alle" : String(selectedYear)}
                  onChange={(e) => setYear(e.target.value)}
                  className="border-none bg-transparent py-0 pl-0 pr-7 font-mono text-[13px] font-bold tabular-nums text-base-content focus:ring-0 dark:text-white"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                  <option value="alle">Alle Jahre</option>
                </select>
              </label>
            )}
            <Button onClick={openAddDialog} leftIcon={<Plus className="h-4 w-4" />} className="shrink-0">
              Neue Ausgabe
            </Button>
          </>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Noch keine Ausgaben"
          description="Erfasse Versicherungen, Steuern und andere Ausgaben, die mehrere Fahrzeuge betreffen."
          action={
            <Button type="button" onClick={openAddDialog} leftIcon={<Plus className="h-4 w-4" />}>
              Ausgabe hinzufügen
            </Button>
          }
        />
      ) : (
        <>
          {tiles.length > 0 && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((tile) => (
                <div
                  key={tile.label}
                  className="flex gap-2.5 rounded-sm border border-base-300/70 bg-base-100 px-3.5 py-3 dark:border-navy-700 dark:bg-navy-800"
                >
                  <span aria-hidden="true" className={clsx("w-[3px] shrink-0 rounded-sm", tile.rail)} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <dt className={clsx(CAPTION, "text-base-content/70 dark:text-navy-300")}>{tile.label}</dt>
                    <dd className="font-mono text-2xl font-bold leading-tight tabular-nums text-base-content dark:text-white">{tile.value}</dd>
                    <span className="truncate font-mono text-xs text-base-content/70 dark:text-navy-400" title={tile.note}>
                      {tile.note}
                    </span>
                  </span>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap items-start gap-5">
            <Card className="min-w-0 flex-[2_1_640px]">
              <CardHeading title={yearLabel} meta={`${countLabel(visible.length)}${visible.length > 0 ? ` · ${total}` : ""}`} />
              {visible.length === 0 ? (
                <p className="px-4 py-6 text-sm text-base-content/70 dark:text-navy-400">Keine Ausgaben in diesem Jahr.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="border-b border-base-300 dark:border-navy-700">
                      <tr>
                        <th scope="col" className={clsx(TH, "hidden md:table-cell")}>Datum</th>
                        <th scope="col" className={TH}>Bezeichnung</th>
                        <th scope="col" className={clsx(TH, "hidden md:table-cell")}>Kategorie</th>
                        <th scope="col" className={clsx(TH, "hidden lg:table-cell")}>Motorräder</th>
                        <th scope="col" className={clsx(TH, "text-right")}>Betrag</th>
                        <th scope="col" className="w-12 py-2.5 pr-4">
                          <span className="sr-only">Aktionen</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200 dark:divide-navy-700">
                      {visible.map((expense) => (
                        <tr key={expense.id} className="align-top transition-colors hover:bg-base-200/40 dark:hover:bg-navy-700/30">
                          <td className="hidden whitespace-nowrap py-3 pl-4 pr-3 font-mono text-[13px] tabular-nums text-base-content md:table-cell dark:text-gray-200">
                            {DATE_FORMAT.format(new Date(expense.date))}
                          </td>
                          <td className="py-3 pl-4 pr-3 md:pl-3">
                            <div className="font-semibold text-base-content dark:text-white">
                              {expense.description ? (
                                <FormattedText description={expense.description} markup={expense.descriptionMarkup} />
                              ) : (
                                expense.category || "Ohne Bezeichnung"
                              )}
                            </div>
                            {/* Narrow widths fold date, category and bikes in here. */}
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                              <span className={clsx(CAPTION, "tabular-nums text-base-content/70 dark:text-navy-400")}>
                                {DATE_FORMAT.format(new Date(expense.date))}
                              </span>
                              {categoryBadge(expense)}
                            </div>
                            <div className="mt-1.5 lg:hidden">{bikeChips(expense)}</div>
                          </td>
                          <td className="hidden px-3 py-3 md:table-cell">{categoryBadge(expense)}</td>
                          <td className="hidden px-3 py-3 lg:table-cell">{bikeChips(expense)}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-bold tabular-nums text-base-content dark:text-white">
                            {formatCurrency(expense.amount, expense.currency)}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEditDialog(expense)}
                              aria-label="Ausgabe bearbeiten"
                              title="Bearbeiten"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-base-300 text-base-content/70 transition-colors hover:border-base-content/35 hover:text-base-content dark:border-navy-700 dark:text-navy-300 dark:hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {bikeShares.length > 0 && singleCurrency && (
              <Card className="min-w-0 flex-[1_1_320px]">
                <CardHeading title="Pro Motorrad" />
                <div className="px-4 pb-3 pt-2">
                  <p className="text-[13px] text-base-content/70 dark:text-navy-400">
                    Jede Ausgabe gleichmässig auf ihre Motorräder verteilt.
                  </p>
                  <ul className="divide-y divide-base-200 dark:divide-navy-700">
                    {bikeShares.map((share) => (
                      <li key={share.key} className="flex flex-col gap-1.5 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className={clsx(
                              "flex min-w-0 items-center gap-2 text-sm",
                              share.unassigned ? "text-base-content/70 dark:text-navy-400" : "font-semibold text-base-content dark:text-white",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={clsx("h-2.5 w-2.5 shrink-0", share.unassigned && "bg-base-content/25")}
                              style={share.color ? { backgroundColor: share.color } : undefined}
                            />
                            <span className="truncate">{share.label}</span>
                          </span>
                          <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-base-content dark:text-white">
                            {formatCurrency(share.amount, singleCurrency)}
                          </span>
                        </div>
                        <span className="block h-2 bg-base-200 dark:bg-navy-700" aria-hidden="true">
                          <span
                            className={clsx("block h-full", share.unassigned && "bg-base-content/25")}
                            style={{
                              width: `${(share.amount / maxShare) * 100}%`,
                              backgroundColor: share.color,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={selectedYear === null ? "/fleet-stats" : `/fleet-stats?jahr=${selectedYear}`}
                    className={clsx(CAPTION, "mt-2.5 inline-block text-primary hover:underline dark:text-primary-light")}
                  >
                    = Fixkosten {selectedYear ?? ""} in Statistiken →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      <ExpenseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialData={selectedExpense}
        motorcycles={motorcycles}
        currencies={currencies}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
