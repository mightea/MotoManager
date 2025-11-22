import { Form } from "react-router";
import { Plus } from "lucide-react";

interface AddMotorcycleFormProps {
  onSubmit: () => void;
}

export function AddMotorcycleForm({ onSubmit }: AddMotorcycleFormProps) {
  return (
    <Form method="post" className="grid gap-5" onSubmit={onSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
                <label htmlFor="make" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Marke</label>
                <input type="text" name="make" id="make" required placeholder="z.B. Yamaha"
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="model" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Modell</label>
                <input type="text" name="model" id="model" required placeholder="z.B. MT-07"
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="modelYear" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Jahrgang</label>
                <input type="number" name="modelYear" id="modelYear" placeholder="z.B. 2021"
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="vin" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Fahrgestellnummer (VIN)</label>
                <input type="text" name="vin" id="vin" required 
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="vehicleIdNr" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Stammnummer</label>
                <input type="text" name="vehicleIdNr" id="vehicleIdNr" 
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="firstRegistration" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">1. Inverkehrssetzung</label>
                <input type="date" name="firstRegistration" id="firstRegistration" 
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="initialOdo" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Anfangs-KM</label>
                <input type="number" name="initialOdo" id="initialOdo" defaultValue={0} 
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="purchaseDate" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kaufdatum</label>
                <input type="date" name="purchaseDate" id="purchaseDate" 
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500 dark:[color-scheme:dark]"/>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="purchasePrice" className="text-xs font-semibold uppercase tracking-wider text-secondary dark:text-navy-300">Kaufpreis</label>
                <div className="flex rounded-xl shadow-sm">
                    <input type="number" name="purchasePrice" id="purchasePrice" step="0.05" placeholder="0.00"
                        className="block w-full rounded-l-xl border-gray-200 bg-gray-50 p-3 text-sm text-foreground focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500"/>
                     <select
                        name="currencyCode"
                        className="rounded-r-xl border-l-0 border-gray-200 bg-gray-100 p-3 text-sm text-secondary focus:border-primary focus:ring-primary dark:border-navy-600 dark:bg-navy-800 dark:text-navy-300"
                        defaultValue="CHF"
                    >
                        <option value="CHF">CHF</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="col-span-full space-y-3 pt-2">
            <div className="flex items-center gap-3">
                <input type="checkbox" name="isVeteran" id="isVeteran" value="true"
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary dark:border-navy-500 dark:bg-navy-900 dark:checked:bg-primary"/>
                <label htmlFor="isVeteran" className="text-sm font-medium text-foreground dark:text-white">
                    Veteranen-Status
                </label>
            </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
            <button
                type="button"
                onClick={onSubmit}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
            >
                Abbrechen
            </button>
            <button 
                type="submit" 
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98]"
            >
                Speichern
            </button>
        </div>
    </Form>
  );
}
