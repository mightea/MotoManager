import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import clsx from "clsx";
import { useToasts, dismissToast, type Toast, type ToastVariant } from "~/hooks/use-toast";

const variantConfig: Record<
  ToastVariant,
  {
    icon: typeof CheckCircle2;
    container: string;
    iconColor: string;
    role: "status" | "alert";
  }
> = {
  success: {
    icon: CheckCircle2,
    container: "border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-100",
    iconColor: "text-green-600 dark:text-green-400",
    role: "status",
  },
  error: {
    icon: AlertCircle,
    container: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100",
    iconColor: "text-red-600 dark:text-red-400",
    role: "alert",
  },
  info: {
    icon: Info,
    container: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100",
    iconColor: "text-blue-600 dark:text-blue-400",
    role: "status",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
    role: "status",
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live={config.role === "alert" ? "assertive" : "polite"}
      className={clsx(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm motion-safe:animate-fade-in",
        config.container
      )}
    >
      <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", config.iconColor)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs opacity-85 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Schließen"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Benachrichtigungen"
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-4 sm:top-auto sm:right-4 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body
  );
}
