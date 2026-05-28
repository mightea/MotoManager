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

const variantCode: Record<ToastVariant, string> = {
  success: "OK",
  error: "ERR",
  info: "INFO",
  warning: "WARN",
};

const variantRailColor: Record<ToastVariant, string> = {
  success: "bg-success",
  error: "bg-error",
  info: "bg-info",
  warning: "bg-warning",
};

function ToastItem({ toast }: { toast: Toast }) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  return (
    <div
      role={config.role}
      aria-live={config.role === "alert" ? "assertive" : "polite"}
      className={clsx(
        "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-sm border bg-base-100 px-4 py-3 text-base-content shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)] motion-safe:animate-fade-in dark:bg-navy-800",
        config.container,
      )}
    >
      <span aria-hidden="true" className={clsx("absolute inset-y-2 left-0 w-[3px] rounded-r-sm", variantRailColor[toast.variant])} />
      <span className="pt-0.5">
        <Icon className={clsx("h-4 w-4", config.iconColor)} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={clsx("font-mono text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums", config.iconColor)}>
            {variantCode[toast.variant]}
          </span>
          <span aria-hidden="true" className="h-px w-3 bg-base-content/20" />
          <p className="font-subdisplay text-sm leading-none truncate">{toast.title}</p>
        </div>
        {toast.description && (
          <p className="mt-1.5 text-xs leading-snug text-base-content/70">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Schließen"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40 dark:hover:bg-navy-700"
      >
        <X className="h-3.5 w-3.5" />
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
