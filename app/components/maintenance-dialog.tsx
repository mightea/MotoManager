import { Modal } from "~/components/modal";
import { MaintenanceForm } from "~/components/maintenance-form";
import type { MaintenanceRecord, Location, CurrencySetting } from "~/db/schema";

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: MaintenanceRecord | null;
  currencyCode?: string | null;
  defaultOdo?: number | null;
  userLocations?: Location[];
  currencies?: CurrencySetting[];
  onDelete?: () => void;
}

export function MaintenanceDialog({ isOpen, onClose, motorcycleId, initialData, currencyCode, defaultOdo, userLocations, currencies, onDelete }: MaintenanceDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Eintrag bearbeiten" : "Neuer Eintrag"}
      description={initialData ? "Details zum Eintrag anpassen." : "Füge einen neuen Service, eine Reparatur oder Tankstopp hinzu."}
    >
      <MaintenanceForm
        motorcycleId={motorcycleId}
        initialData={initialData}
        currencyCode={currencyCode}
        defaultOdo={defaultOdo}
        userLocations={userLocations}
        currencies={currencies}
        onSubmit={onClose}
        onCancel={onClose}
        onDelete={onDelete}
      />
    </Modal>
  );
}
