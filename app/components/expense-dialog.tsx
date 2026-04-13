import { Modal } from "~/components/modal";
import { ExpenseForm } from "~/components/expense-form";
import type { Expense, Motorcycle, CurrencySetting } from "~/types/db";

interface ExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Expense | null;
  motorcycles: Motorcycle[];
  currencies: CurrencySetting[];
  defaultCurrency?: string | null;
}

export function ExpenseDialog({ 
  isOpen, 
  onClose, 
  initialData, 
  motorcycles, 
  currencies, 
  defaultCurrency 
}: ExpenseDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Ausgabe bearbeiten" : "Neue gemeinsame Ausgabe"}
      description={initialData ? "Details zur Ausgabe anpassen." : "Füge eine Ausgabe hinzu, die mehrere Fahrzeuge betrifft (z.B. Versicherung)."}
    >
      <ExpenseForm
        initialData={initialData}
        motorcycles={motorcycles}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
        onCancel={onClose}
      />
    </Modal>
  );
}
