import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  /**
   * Optional mono code rendered above the title (e.g. "§ 04", "VOID").
   * Defaults to "FORM" for the service-manual feel.
   */
  code?: string;
}

/**
 * Modal — service-manual form sheet. Sticky header carries a top motorsport
 * stripe, a mono section code, a display-cased title, and an X close.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  description,
  code = "FORM",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="modal-box flex max-h-[90vh] w-full flex-col rounded-sm p-0 sm:max-h-[85vh] sm:max-w-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 backdrop-blur-sm dark:bg-navy-800/95">
          {/* Top motorsport stripe — signature */}
          <span aria-hidden="true" className="motorsport-stripe block h-[3px]" />

          <div className="flex items-start justify-between px-6 py-4">
            <div className="min-w-0 pr-4">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-base-content/50 tabular-nums">
                {code}
              </p>
              <h3
                id={titleId}
                className="mt-1 font-display text-xl uppercase leading-none tracking-wide text-base-content"
              >
                {title}
              </h3>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1.5 text-sm text-base-content/65"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
      {/* Backdrop click closes via native <form method="dialog"> submit. */}
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Schließen">close</button>
      </form>
    </dialog>
  );
}
