import { Modal } from "~/components/modal";
import { MaintenanceForm } from "~/components/maintenance-form";
import type { MaintenanceRecord } from "~/db/schema";

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: MaintenanceRecord | null;
  currencyCode?: string | null;
}

export function MaintenanceDialog({ isOpen, onClose, motorcycleId, initialData, currencyCode }: MaintenanceDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Eintrag bearbeiten" : "Neuer Wartungseintrag"}
      description={initialData ? "Details zum Wartungseintrag anpassen." : "Füge einen neuen Service oder eine Reparatur hinzu."}
    >
      <MaintenanceForm 
        motorcycleId={motorcycleId} 
        initialData={initialData} 
        currencyCode={currencyCode}
        onSubmit={onClose} 
        onCancel={onClose} 
      />
    </Modal>
  );
}
