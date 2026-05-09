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
    container: "border-success/40 bg-success/10",
    iconColor: "text-success",
    role: "status",
  },
  error: {
    icon: AlertCircle,
    container: "border-error/40 bg-error/10",
    iconColor: "text-error",
    role: "alert",
  },
  info: {
    icon: Info,
    container: "border-info/40 bg-info/10",
    iconColor: "text-info",
    role: "status",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-warning/40 bg-warning/10",
    iconColor: "text-warning",
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
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-box border p-4 text-base-content shadow-lg backdrop-blur-sm motion-safe:animate-fade-in",
        config.container
      )}
    >
      <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", config.iconColor)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs opacity-75 leading-snug">{toast.description}</p>
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
      className="toast toast-top toast-center sm:toast-bottom sm:toast-end pointer-events-none z-[100]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body
  );
}
