import { Modal } from "~/components/modal";
import { MaintenanceForm } from "~/components/maintenance-form";
import type { MaintenanceRecord, Location, CurrencySetting } from "~/types/db";

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: MaintenanceRecord | null;
  currencyCode?: string | null;
  defaultOdo?: number | null;
  userLocations?: Location[];
  locationNames?: string[];
  currencies?: CurrencySetting[];
  onDelete?: () => void;
  existingBundledItems?: string[];
}

export function MaintenanceDialog({ isOpen, onClose, motorcycleId, initialData, currencyCode, defaultOdo, userLocations, locationNames, currencies, onDelete, existingBundledItems }: MaintenanceDialogProps) {
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
        locationNames={locationNames}
        currencies={currencies}
        onSubmit={onClose}
        onCancel={onClose}
        onDelete={onDelete}
        existingBundledItems={existingBundledItems}
      />
    </Modal>
  );
}
