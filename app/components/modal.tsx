import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    description?: string;
}

export function Modal({ isOpen, onClose, title, children, description }: ModalProps) {
    return (
        <Dialog open={isOpen} as="div" className="relative z-50 focus:outline-none" onClose={onClose}>
            {/* Backdrop */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                {/* Desktop: centered | Mobile: bottom-aligned */}
                <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
                    <DialogPanel
                        transition
                        className="flex w-full max-h-[90vh] sm:max-h-[85vh] flex-col sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 transition-all duration-300 ease-out data-[closed]:translate-y-full sm:data-[closed]:translate-y-0 sm:data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-navy-800 dark:ring-white/10"
                    >
                        {/* Drag indicator (mobile only) */}
                        <div className="flex justify-center pt-3 sm:hidden">
                            <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-navy-600" />
                        </div>

                        {/* Sticky Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-navy-700 dark:bg-navy-800/95 sm:rounded-t-2xl">
                            <div>
                                <DialogTitle as="h3" className="text-lg font-bold text-foreground dark:text-white">
                                    {title}
                                </DialogTitle>
                                {description && (
                                    <p className="mt-0.5 text-sm text-secondary dark:text-navy-400">
                                        {description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="grid h-9 w-9 place-items-center rounded-xl text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {children}
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
