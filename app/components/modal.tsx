import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    description?: string;
}

export function Modal({ isOpen, onClose, title, children, description }: ModalProps) {
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
            <div className="modal-box flex max-h-[90vh] w-full flex-col p-0 sm:max-h-[85vh] sm:max-w-xl">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100/95 px-6 py-4 backdrop-blur-sm">
                    <div>
                        <h3 id={titleId} className="text-lg font-bold text-base-content">
                            {title}
                        </h3>
                        {description && (
                            <p id={descriptionId} className="mt-0.5 text-sm text-base-content/70">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Schließen"
                        className="btn btn-ghost btn-sm btn-square"
                    >
                        <X className="h-5 w-5" />
                    </button>
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
