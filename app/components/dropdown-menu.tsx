import {
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  createContext,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefCallback,
} from "react";
import clsx from "clsx";

type DropdownMenuContextValue = {
  close: () => void;
  registerItem: (key: string, el: HTMLElement | null) => void;
  setActiveKey: (key: string | null) => void;
  activeKey: string | null;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu.Item must be used inside DropdownMenu");
  return ctx;
}

interface DropdownMenuProps {
  trigger: ReactElement;
  align?: "start" | "end";
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

function DropdownMenuRoot({
  trigger,
  align = "start",
  className,
  contentClassName,
  children,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const menuId = useId();
  const typeAheadRef = useRef<{ buffer: string; timer: number | null }>({
    buffer: "",
    timer: null,
  });

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveKey(null);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  const closeWithoutRefocus = useCallback(() => {
    setIsOpen(false);
    setActiveKey(null);
  }, []);

  const registerItem = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  const orderedKeys = useCallback((): string[] => {
    const list =
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([data-disabled="true"])'
      ) ?? [];
    return Array.from(list)
      .map((el) => el.dataset.itemKey || "")
      .filter(Boolean);
  }, []);

  const focusKey = useCallback(
    (key: string | null) => {
      if (!key) return;
      const el = itemRefs.current.get(key);
      if (el) {
        el.focus();
        setActiveKey(key);
      }
    },
    []
  );

  // Click outside closes
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        closeWithoutRefocus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, closeWithoutRefocus]);

  // Focus first item when opened
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      const keys = orderedKeys();
      if (keys.length > 0) focusKey(keys[0]);
    }, 0);
    return () => window.clearTimeout(t);
  }, [isOpen, focusKey, orderedKeys]);

  // Focus leaving the menu (e.g. Tab) closes it
  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;
    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (
          active &&
          !menuRef.current?.contains(active) &&
          !triggerRef.current?.contains(active)
        ) {
          closeWithoutRefocus();
        }
      }, 0);
    };
    menu.addEventListener("focusout", onFocusOut);
    return () => menu.removeEventListener("focusout", onFocusOut);
  }, [isOpen, closeWithoutRefocus]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const keys = orderedKeys();
    if (keys.length === 0) return;
    const currentIdx = activeKey ? keys.indexOf(activeKey) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = keys[(currentIdx + 1) % keys.length];
      focusKey(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = keys[(currentIdx - 1 + keys.length) % keys.length];
      focusKey(prev);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusKey(keys[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      focusKey(keys[keys.length - 1]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const ta = typeAheadRef.current;
      ta.buffer += e.key.toLowerCase();
      if (ta.timer !== null) window.clearTimeout(ta.timer);
      ta.timer = window.setTimeout(() => {
        ta.buffer = "";
      }, 500);
      const startIdx = currentIdx + 1;
      const ordered = keys.map((k, i) => ({ k, i }));
      const search = [...ordered.slice(startIdx), ...ordered.slice(0, startIdx)];
      const match = search.find(({ k }) => {
        const el = itemRefs.current.get(k);
        return el?.textContent?.trim().toLowerCase().startsWith(ta.buffer);
      });
      if (match) {
        e.preventDefault();
        focusKey(match.k);
      }
    }
  };

  const triggerProps = isValidElement(trigger) ? (trigger.props as Record<string, unknown>) : {};

  const injectedTrigger = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node;
          const r = (trigger as unknown as { ref?: unknown }).ref;
          if (typeof r === "function") (r as (n: HTMLElement | null) => void)(node);
          else if (r && typeof r === "object" && "current" in r) {
            (r as { current: HTMLElement | null }).current = node;
          }
        },
        onClick: (e: MouseEvent<HTMLElement>) => {
          (triggerProps.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(e);
          if (!e.defaultPrevented) setIsOpen((o) => !o);
        },
        onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
          (triggerProps.onKeyDown as ((e: KeyboardEvent<HTMLElement>) => void) | undefined)?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          }
        },
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        "aria-controls": menuId,
      } as Record<string, unknown>)
    : trigger;

  return (
    <div
      className={clsx(
        "dropdown",
        align === "end" && "dropdown-end",
        isOpen && "dropdown-open",
        className
      )}
    >
      {injectedTrigger}
      {isOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={clsx(
            "menu dropdown-content z-50 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-2xl ring-1 ring-base-content/5",
            contentClassName
          )}
        >
          <DropdownMenuContext.Provider
            value={{ close, registerItem, setActiveKey, activeKey }}
          >
            {children}
          </DropdownMenuContext.Provider>
        </ul>
      )}
    </div>
  );
}

interface ItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  onSelect?: () => void;
  variant?: "default" | "destructive";
  icon?: ReactNode;
}

function Item({
  onSelect,
  variant = "default",
  icon,
  children,
  className,
  disabled,
  onClick: onClickProp,
  ...rest
}: ItemProps) {
  const ctx = useDropdownMenuContext();
  const key = useId();

  const setRef: RefCallback<HTMLButtonElement> = (node) => {
    ctx.registerItem(key, node);
  };

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClickProp?.(e);
    if (e.defaultPrevented) return;
    onSelect?.();
    ctx.close();
  };

  return (
    <li>
      <button
        ref={setRef}
        type="button"
        role="menuitem"
        data-item-key={key}
        data-disabled={disabled || undefined}
        tabIndex={ctx.activeKey === key ? 0 : -1}
        disabled={disabled}
        onFocus={() => ctx.setActiveKey(key)}
        onClick={onClick}
        className={clsx(
          "flex w-full items-center gap-3 rounded-field px-3 py-2 text-left text-sm font-medium",
          variant === "destructive"
            ? "text-error hover:bg-error/10 focus:bg-error/10"
            : "text-base-content/80 hover:bg-base-200 focus:bg-base-200",
          disabled && "opacity-50",
          className
        )}
        {...rest}
      >
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="flex-1">{children}</span>
      </button>
    </li>
  );
}

function Separator({ className }: { className?: string }) {
  // The <li> is presentational so the parent <ul role="menu"> structure stays
  // valid HTML; the inner <hr> carries the actual separator semantics.
  return (
    <li role="none" className={clsx("my-1", className)}>
      <hr aria-orientation="horizontal" className="h-px border-0 bg-base-300" />
    </li>
  );
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      role="presentation"
      className={clsx(
        "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-base-content/60",
        className
      )}
    >
      {children}
    </li>
  );
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Item,
  Separator,
  Label,
});
