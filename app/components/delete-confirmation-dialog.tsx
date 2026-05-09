import { Modal } from "./modal";
import { Button } from "./button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  confirmDisabled = false,
  cancelDisabled = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      description={description}
    >
      <div className="flex justify-end gap-3 mt-4">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={cancelDisabled}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
