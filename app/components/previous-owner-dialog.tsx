import { Modal } from "./modal";
import { PreviousOwnerForm } from "./previous-owner-form";
import type { PreviousOwner } from "~/db/schema";

interface PreviousOwnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  initialData?: PreviousOwner | null;
  onDelete?: () => void;
  errors?: Record<string, string>;
  onSubmit?: () => void;
}

export function PreviousOwnerDialog({
  isOpen,
  onClose,
  motorcycleId,
  initialData,
  onDelete,
  errors,
  onSubmit,
}: PreviousOwnerDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Vorbesitzer bearbeiten" : "Vorbesitzer hinzufügen"}
      description="Gib die Informationen zum Vorbesitzer ein."
    >
      <PreviousOwnerForm
        motorcycleId={motorcycleId}
        initialValues={initialData}
        intent={initialData ? "updatePreviousOwner" : "createPreviousOwner"}
        onCancel={onClose}
        onDelete={onDelete}
        errors={errors}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}
