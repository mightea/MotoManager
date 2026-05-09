import { useSyncExternalStore } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
}

type Listener = () => void;

const DEFAULT_DURATION_MS = 4000;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l();
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function pushToast(input: Omit<Toast, "id" | "durationMs"> & { durationMs?: number }): string {
  const id = genId();
  const toast: Toast = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant,
    durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
  };
  toasts = [...toasts, toast];
  emit();

  if (toast.durationMs > 0) {
    const timer = setTimeout(() => dismissToast(id), toast.durationMs);
    timers.set(id, timer);
  }

  return id;
}

export const toast = {
  success: (title: string, description?: string) => pushToast({ title, description, variant: "success" }),
  error: (title: string, description?: string) => pushToast({ title, description, variant: "error" }),
  info: (title: string, description?: string) => pushToast({ title, description, variant: "info" }),
  warning: (title: string, description?: string) => pushToast({ title, description, variant: "warning" }),
  dismiss: dismissToast,
};

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const emptySnapshot: Toast[] = [];
function getServerSnapshot() {
  return emptySnapshot;
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
