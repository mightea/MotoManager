import { Modal } from "~/components/modal";
import { IssueForm } from "~/components/issue-form";
import type { Issue, OdometerChange } from "~/types/db";

interface IssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  motorcycleId: number;
  defaultOdo?: number | null;
  odometerChanges?: OdometerChange[];
  initialIssue?: Issue | null;
  onIssueSaved?: () => void;
}

export function IssueDialog({ isOpen, onClose, motorcycleId, defaultOdo, odometerChanges, initialIssue, onIssueSaved }: IssueDialogProps) {
  const isEditing = Boolean(initialIssue);

  const handleSuccess = () => {
    onClose();
    onIssueSaved?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Mangel bearbeiten" : "Neuer Mangel"}
      description={
        isEditing
          ? "Passe die Angaben zum Mangel an und speichere die Änderungen."
          : "Erfasse einen neuen Mangel und halte den Überblick über offene Arbeiten."
      }
    >
      <IssueForm
        motorcycleId={motorcycleId}
        defaultOdo={defaultOdo}
        odometerChanges={odometerChanges}
        initialIssue={initialIssue}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  );
}
