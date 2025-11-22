import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { X } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import clsx from "clsx";

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
        <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0" 
            aria-hidden="true" 
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
                <DialogPanel
                    transition
                    className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-900/5 transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-navy-800 dark:ring-white/10"
                >
                    <div className="flex items-center justify-between mb-5">
                        <DialogTitle as="h3" className="text-xl font-bold text-foreground dark:text-white">
                            {title}
                        </DialogTitle>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1 text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    {description && (
                        <p className="mt-2 text-sm text-secondary dark:text-navy-400">
                            {description}
                        </p>
                    )}

                    <div className="mt-4">
                        {children}
                    </div>
                </DialogPanel>
            </div>
        </div>
    </Dialog>
  );
}
