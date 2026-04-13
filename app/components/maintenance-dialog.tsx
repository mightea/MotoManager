import { Modal } from "~/components/modal";
import { MaintenanceForm } from "~/components/maintenance-form";
import type { MaintenanceRecord, Location, CurrencySetting, MaintenanceLocation } from "~/types/db";

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: MaintenanceRecord | null;
  allRecords?: MaintenanceRecord[];
  currencyCode?: string | null;
  defaultOdo?: number | null;
  userLocations?: Location[];
  maintenanceLocations?: MaintenanceLocation[];
  locationNames?: string[];
  currencies?: CurrencySetting[];
  onDelete?: () => void;
}

export function MaintenanceDialog({ isOpen, onClose, motorcycleId, initialData, allRecords = [], currencyCode, defaultOdo, userLocations, maintenanceLocations, locationNames, currencies, onDelete }: MaintenanceDialogProps) {
  const existingBundledItems = initialData 
    ? allRecords
        .filter(r => r.parentId === initialData.id)
        .map(r => r.type === "fluid" ? r.fluidType || "" : r.type)
        .filter(Boolean)
    : [];

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
        maintenanceLocations={maintenanceLocations}
        _locationNames={locationNames}
        currencies={currencies}
        onSubmit={onClose}
        onCancel={onClose}
        onDelete={onDelete}
        existingBundledItems={existingBundledItems}
      />
    </Modal>
  );
}
