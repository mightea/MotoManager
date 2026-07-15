import { Modal } from "~/components/modal";
import { MaintenanceForm, type BrakeConfig } from "~/components/maintenance-form";
import type { MaintenanceRecord, Location, CurrencySetting } from "~/types/db";
import type { Part } from "~/types/parts";
import { useUmami } from "./umami-provider";
import { useEffect } from "react";

interface MaintenanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: MaintenanceRecord | null;
  allRecords?: MaintenanceRecord[];
  currencyCode?: string | null;
  defaultOdo?: number | null;
  userLocations?: Location[];
  currencies?: CurrencySetting[];
  /** Parts with positive on-hand, offered as "Verwendete Teile" on create. */
  availableParts?: Part[];
  /** Per-wheel brake config; drives the brake options in the form. */
  brakeConfig?: BrakeConfig;
  onDelete?: () => void;
}

const EMPTY_RECORDS: MaintenanceRecord[] = [];

export function MaintenanceDialog({ isOpen, onClose, motorcycleId, initialData, allRecords = EMPTY_RECORDS, currencyCode, defaultOdo, userLocations, currencies, availableParts, brakeConfig, onDelete }: MaintenanceDialogProps) {
  const { trackEvent } = useUmami();

  useEffect(() => {
    if (isOpen) {
      trackEvent("maintenance_dialog_open", {
        mode: initialData ? "edit" : "create",
        type: initialData?.type
      });
    }
  }, [isOpen, initialData, trackEvent]);

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
        key={isOpen ? `open-${initialData?.id ?? "new"}` : "closed"}
        motorcycleId={motorcycleId}
        initialData={initialData}
        currencyCode={currencyCode}
        defaultOdo={defaultOdo}
        userLocations={userLocations}
        currencies={currencies}
        availableParts={availableParts}
        brakeConfig={brakeConfig}
        onCancel={onClose}
        onDelete={onDelete}
        existingBundledItems={existingBundledItems}
      />
    </Modal>
  );
}
