import { Modal } from "~/components/modal";
import { UserForm } from "~/components/user-form";
import type { PublicUser } from "~/types/auth";

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: PublicUser | null;
  currentUserId?: number;
}

export function UserDialog({ isOpen, onClose, initialData, currentUserId }: UserDialogProps) {
  const isSelf = initialData?.id === currentUserId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Benutzer bearbeiten" : "Neuen Benutzer anlegen"}
      description={
        initialData
          ? "Passe die Informationen für diesen Benutzer an."
          : "Erstelle ein neues Benutzerkonto für den Zugriff auf den Moto Manager."
      }
    >
      <UserForm
        initialData={initialData}
        onSubmit={onClose}
        onCancel={onClose}
        isSelf={isSelf}
      />
    </Modal>
  );
}
