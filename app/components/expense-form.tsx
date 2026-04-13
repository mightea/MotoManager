import { Form, useNavigation } from "react-router";
import { Button } from "./button";
import type { Expense, Motorcycle, CurrencySetting } from "~/types/db";
import { useState } from "react";
import { Trash2, CheckSquare, Square } from "lucide-react";
import clsx from "clsx";

interface ExpenseFormProps {
  initialData?: Expense | null;
  motorcycles: Motorcycle[];
  currencies: CurrencySetting[];
  defaultCurrency?: string | null;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const CATEGORIES = ["Versicherung", "Steuern", "Vignette", "Parkplatz", "Ausrüstung", "Sonstiges"];

export function ExpenseForm({ initialData, motorcycles, currencies, defaultCurrency, onCancel }: ExpenseFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [selectedMotorcycleIds, setSelectedMotorcycleIds] = useState<number[]>(initialData?.motorcycleIds || []);

  const toggleMotorcycle = (id: number) => {
    setSelectedMotorcycleIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="intent" value={initialData ? "updateExpense" : "createExpense"} />
      {initialData && <input type="hidden" name="expenseId" value={initialData.id} />}
      {selectedMotorcycleIds.map(id => (
        <input key={id} type="hidden" name="motorcycleIds[]" value={id} />
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="expense-date" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
            Datum
          </label>
          <input
            id="expense-date"
            name="date"
            type="date"
            defaultValue={initialData?.date || new Date().toISOString().split('T')[0]}
            required
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="expense-category" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
            Kategorie
          </label>
          <select
            id="expense-category"
            name="category"
            defaultValue={initialData?.category || "Versicherung"}
            required
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="expense-amount" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
            Betrag
          </label>
          <input
            id="expense-amount"
            name="amount"
            type="number"
            step="0.01"
            defaultValue={initialData?.amount}
            required
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="expense-currency" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
            Währung
          </label>
          <select
            id="expense-currency"
            name="currency"
            defaultValue={initialData?.currency || defaultCurrency || "CHF"}
            required
            className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          >
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="expense-description" className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
          Beschreibung
        </label>
        <textarea
          id="expense-description"
          name="description"
          defaultValue={initialData?.description || ""}
          className="block w-full rounded-lg border-gray-200 bg-white p-2 text-sm focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-white"
          rows={2}
          placeholder="Optionale Notizen..."
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-secondary dark:text-navy-300">
          Fahrzeuge (Kosten werden gleichmässig verteilt)
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {motorcycles.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMotorcycle(m.id)}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-3 transition-all text-left",
                selectedMotorcycleIds.includes(m.id)
                  ? "border-primary bg-primary/5 dark:border-primary-light/50 dark:bg-primary-light/5"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-navy-600 dark:bg-navy-900 dark:hover:bg-navy-800"
              )}
            >
              {selectedMotorcycleIds.includes(m.id) ? (
                <CheckSquare className="h-5 w-5 text-primary dark:text-primary-light" />
              ) : (
                <Square className="h-5 w-5 text-secondary/30" />
              )}
              <div>
                <div className="text-sm font-bold text-foreground dark:text-white">{m.make} {m.model}</div>
                {m.numberPlate && <div className="text-[10px] text-secondary/70">{m.numberPlate}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
        {initialData && (
          <Button
            type="submit"
            name="intent"
            value="deleteExpense"
            variant="ghost"
            className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 sm:mr-auto"
            onClick={(e) => {
              if (!confirm(`Ausgabe wirklich löschen?`)) {
                e.preventDefault();
              }
            }}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting} className="sm:w-32">
            Abbrechen
          </Button>
        )}
        <Button type="submit" className="sm:w-32" disabled={isSubmitting}>
          {isSubmitting ? "Wird gespeichert..." : initialData ? "Aktualisieren" : "Erstellen"}
        </Button>
      </div>
    </Form>
  );
}
