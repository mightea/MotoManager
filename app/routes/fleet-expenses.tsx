import { useEffect, useState } from "react";
import { useActionData, useLoaderData } from "react-router";
import { toast } from "~/hooks/use-toast";
import type { Route } from "./+types/fleet-expenses";
import { requireUser } from "~/services/auth";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "~/services/expenses";
import { getCurrencies } from "~/services/settings";
import { fetchFromBackend } from "~/utils/backend";
import { Plus, Receipt, Calendar, Pencil, Car } from "lucide-react";
import { ExpenseDialog } from "~/components/expense-dialog";
import { EmptyState } from "~/components/empty-state";
import { formatCurrency } from "~/utils/numberUtils";
import type { Expense, Motorcycle } from "~/types/db";

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
    user
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
  const { expenses, currencies, motorcycles } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData<{ success?: boolean; intent?: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (actionData?.success) {
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
      setIsDialogOpen(false);
      setSelectedExpense(null);
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

  return (
    <div className="container mx-auto space-y-4 px-4 pt-3 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-3 dark:border-navy-700">
        <p className="min-w-0 flex-1 text-sm text-base-content/65 dark:text-navy-400">
          Versicherungen, Steuern und andere Ausgaben, die mehrere Motorräder gemeinsam betreffen.
        </p>
        <button
          onClick={openAddDialog}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-4 py-2 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Neue Ausgabe
          <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
        </button>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Noch keine Ausgaben"
            description="Erfasse Versicherungen, Steuern und andere Ausgaben, die mehrere Fahrzeuge betreffen."
            action={
              <button
                type="button"
                onClick={openAddDialog}
                className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(30,91,255,0.85)] hover:brightness-105 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Ausgabe hinzufügen
                <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
              </button>
            }
          />
        ) : (
          expenses.map(expense => {
            const heading = expense.description || expense.category;
            const showCategoryBadge = Boolean(expense.description);
            return (
              <div
                key={expense.id}
                className="group relative flex items-start justify-between gap-4 rounded-sm border border-base-300/70 bg-base-100 px-4 py-3 shadow-[0_1px_0_0_rgba(15,23,42,0.03)] transition-colors hover:border-base-content/25 dark:border-navy-700 dark:bg-navy-800"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-snug text-foreground dark:text-white truncate">
                    {heading}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-400">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {new Date(expense.date).toLocaleDateString("de-CH")}
                    </span>
                    {showCategoryBadge && (
                      <span className="inline-flex items-center rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 dark:bg-navy-900 dark:text-navy-300">
                        {expense.category}
                      </span>
                    )}
                    {expense.motorcycleIds?.map(mid => {
                      const m = motorcycles.find(bike => bike.id === mid);
                      return m ? (
                        <span
                          key={mid}
                          className="inline-flex items-center gap-1 rounded-sm border border-base-300 bg-base-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-base-content/65 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300"
                        >
                          <Car className="h-3 w-3" aria-hidden="true" />
                          {m.make} {m.model}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditDialog(expense)}
                    aria-label="Ausgabe bearbeiten"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    Bearbeiten
                  </button>
                  <span className="font-numeric text-base sm:text-lg font-semibold tabular-nums text-foreground dark:text-white whitespace-nowrap">
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

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
