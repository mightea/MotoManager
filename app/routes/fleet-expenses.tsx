import { useState } from "react";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/fleet-expenses";
import { requireUser } from "~/services/auth";
import { listExpenses, createExpense, updateExpense, deleteExpense } from "~/services/expenses";
import { getCurrencies } from "~/services/settings";
import { fetchFromBackend } from "~/utils/backend";
import { Plus, Receipt, Calendar, Info, Pencil, Car } from "lucide-react";
import { ExpenseDialog } from "~/components/expense-dialog";
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
    return { success: true };
  }

  if (intent === "deleteExpense") {
    const id = parseInt(formData.get("expenseId") as string, 10);
    await deleteExpense(token, id);
    return { success: true };
  }

  return { success: false };
}

export default function FleetExpenses() {
  const { expenses, currencies, motorcycles } = useLoaderData<typeof clientLoader>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Gemeinsame Ausgaben
          </h1>
          <p className="text-sm text-secondary dark:text-navy-400 mt-1">
            Verwalte Ausgaben wie Versicherungen oder Steuern, die mehrere Fahrzeuge betreffen.
          </p>
        </div>
        <button
          onClick={openAddDialog}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Ausgabe hinzufügen
        </button>
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-100 p-12 text-center dark:border-navy-800">
            <Receipt className="mx-auto h-12 w-12 text-secondary/20 mb-4" />
            <p className="text-secondary dark:text-navy-400">Noch keine gemeinsamen Ausgaben erfasst.</p>
          </div>
        ) : (
          expenses.map(expense => (
            <div 
              key={expense.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md dark:border-navy-800 dark:bg-navy-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary dark:bg-navy-800 dark:text-navy-300">
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
