import { useEffect, useState } from "react";
import { useActionData, useLoaderData } from "react-router";
import { toast } from "~/hooks/use-toast";
import type { Route } from "./+types/fleet-expenses";
import { requireUser } from "~/services/auth";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "~/services/expenses";
import { getCurrencies } from "~/services/settings";
import { fetchFromBackend } from "~/utils/backend";
import { Plus, Receipt, Calendar, Info, Pencil, Car } from "lucide-react";
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="label-tag mb-2">
            <span className="tabular-nums">§ 06</span>
            <span>Gemeinsame Ausgaben</span>
          </span>
          <h1 className="font-display text-4xl uppercase tracking-wide leading-none text-base-content dark:text-white">
            Ausgaben
          </h1>
          <p className="mt-2 text-sm text-base-content/65 dark:text-navy-400">
            Versicherungen, Steuern und andere Ausgaben, die mehrere Fahrzeuge betreffen.
          </p>
        </div>
        <button
          onClick={openAddDialog}
          className="relative inline-flex items-center justify-center gap-2 self-start rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(47,91,232,0.7)] transition-all hover:shadow-[0_18px_42px_-14px_rgba(47,91,232,0.85)] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Neue Ausgabe
          <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
        </button>
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Noch keine gemeinsamen Ausgaben"
            description="Erfasse Versicherungen, Steuern und andere Ausgaben, die mehrere Fahrzeuge betreffen."
            action={
              <button
                type="button"
                onClick={openAddDialog}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dark active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Plus className="h-4 w-4" />
                Ausgabe hinzufügen
              </button>
            }
          />
        ) : (
          expenses.map(expense => (
            <div 
              key={expense.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:border-navy-800 dark:bg-navy-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary dark:bg-navy-800 dark:text-navy-300">
                      {expense.category}
                    </span>
                    <span className="text-xs text-secondary/50 dark:text-navy-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(expense.date).toLocaleDateString("de-CH")}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-foreground dark:text-white truncate">
                    {formatCurrency(expense.amount, expense.currency)}
                  </h3>
                  
                  {expense.description && (
                    <p className="mt-1 text-sm text-secondary dark:text-navy-400 line-clamp-1 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      {expense.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {expense.motorcycleIds?.map(mid => {
                      const m = motorcycles.find(bike => bike.id === mid);
                      return m ? (
                        <div key={mid} className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50/50 px-2 py-0.5 text-[10px] font-medium text-secondary dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300">
                          <Car className="h-3 w-3" />
                          {m.make} {m.model}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <button
                  onClick={() => openEditDialog(expense)}
                  className="rounded-lg p-2 text-secondary hover:bg-gray-100 dark:hover:bg-navy-800 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
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
