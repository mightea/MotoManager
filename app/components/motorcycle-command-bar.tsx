/* eslint-disable jsx-a11y/prefer-tag-over-role -- a native <select>/<option> can't hold the icons and tags of these results. */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Pencil,
  RotateCcw,
  Search,
  Settings2,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import {
  bikeDestinationHref,
  type BikeCommandResult,
  type BikeDestination,
  filterBikeDestinations,
  searchBikeCommands,
} from "~/utils/motorcycle-destinations";

export type CommandBarBike = {
  id: number;
  make: string;
  model: string;
  status?: string | null;
};

const DESTINATION_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  documents: FileText,
  workshop: Wrench,
  pressure: Gauge,
  torque: Settings2,
  parts: Package,
  edit: Pencil,
  maintenance: ClipboardList,
  issue: TriangleAlert,
  owners: Users,
  odometer: RotateCcw,
};

const subscribeToNothing = () => () => {};
const isApplePlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

const isSold = (bike: CommandBarBike) => (bike.status ?? "active") !== "active";
const bikeLabel = (bike: CommandBarBike) => `${bike.make} ${bike.model}`;

/**
 * "Springe zu" palette: find a bike, then jump to one of its sections or
 * dialogs. Opens with Cmd/Ctrl+K or the trigger button (the only way on touch).
 */
export function MotorcycleCommandBar({ bikes }: { bikes: readonly CommandBarBike[] }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scopedBikeId, setScopedBikeId] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optionIdPrefix = useId();
  const isApple = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => true);

  const scopedBike = bikes.find((bike) => bike.id === scopedBikeId) ?? null;

  const results = useMemo<BikeCommandResult<CommandBarBike>[]>(() => {
    if (scopedBike) {
      return filterBikeDestinations(query).map((destination) => ({
        kind: "destination",
        bike: scopedBike,
        destination,
      }));
    }
    return searchBikeCommands(bikes, query);
  }, [bikes, query, scopedBike]);

  const active = Math.min(activeIndex, results.length - 1);

  const open = useCallback(() => {
    setQuery("");
    setScopedBikeId(null);
    setActiveIndex(0);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      if (dialogRef.current?.open) {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      // Never stack on a form sheet, and leave the shortcut to its editor.
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      open();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active, isOpen, results]);

  const scopeTo = (bike: CommandBarBike | null) => {
    setScopedBikeId(bike?.id ?? null);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const goTo = (bike: CommandBarBike, destination: BikeDestination) => {
    setIsOpen(false);
    navigate(bikeDestinationHref(bike, destination));
  };

  const select = (result: BikeCommandResult<CommandBarBike>) => {
    if (result.kind === "bike") scopeTo(result.bike);
    else goTo(result.bike, result.destination);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (results.length > 0) setActiveIndex((active + 1) % results.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (results.length > 0) setActiveIndex((active - 1 + results.length) % results.length);
        break;
      case "Enter":
        event.preventDefault();
        if (results[active]) select(results[active]);
        break;
      case "Backspace":
        if (query === "" && scopedBike) {
          event.preventDefault();
          scopeTo(null);
        }
        break;
    }
  };

  const optionId = (index: number) => `${optionIdPrefix}-${index}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-sm border border-base-300 bg-base-100 px-3 text-sm font-semibold text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-navy-700 dark:bg-navy-800"
      >
        <span>Springe zu…</span>
        <kbd className="hidden rounded-sm border border-base-300 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-base-content/70 sm:inline dark:border-navy-600">
          {isApple ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Springe zu"
        className="modal items-start"
        onClose={(event) => {
          if (event.target === dialogRef.current) setIsOpen(false);
        }}
      >
        <div className="modal-box mt-[8vh] flex max-h-[75vh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-sm p-0 sm:max-w-xl">
          <span aria-hidden="true" className="motorsport-stripe block h-[3px] shrink-0" />

          <div className="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 dark:border-navy-700">
            {scopedBike ? (
              <button
                type="button"
                onClick={() => scopeTo(null)}
                aria-label="Zurück zur Motorradauswahl"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-base-content/70 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <Search className="h-4 w-4 shrink-0 text-base-content/60" aria-hidden="true" />
            )}
            {scopedBike && (
              <span className="max-w-[45%] shrink-0 truncate font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-primary dark:text-primary-light">
                {bikeLabel(scopedBike)}
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={scopedBike ? "Bereich oder Aktion…" : "Motorrad oder Bereich, z. B. GS Teile…"}
              aria-label={scopedBike ? `Bereich von ${bikeLabel(scopedBike)} suchen` : "Motorrad oder Bereich suchen"}
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 border-0 bg-transparent px-1 text-base text-base-content outline-none placeholder:text-base-content/50 focus:border-0 focus:[box-shadow:none]! focus:outline-none focus-visible:outline-none sm:text-sm"
            />
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label="Ergebnisse" className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {isOpen &&
              results.map((result, index) => {
                const Icon = result.kind === "bike" ? Bike : (DESTINATION_ICONS[result.destination.id] ?? ChevronRight);
                const key = result.kind === "bike" ? `bike-${result.bike.id}` : `${result.bike.id}-${result.destination.id}`;
                return (
                  // Keyboard handling lives on the combobox input (aria-activedescendant).
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <div
                    key={key}
                    id={optionId(index)}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === active}
                    onMouseMove={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(result)}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 text-sm text-base-content",
                      index === active && "bg-primary/10",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-base-content/60" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">
                      {result.kind === "bike" ? (
                        <span className="font-semibold">{bikeLabel(result.bike)}</span>
                      ) : (
                        <>
                          {!scopedBike && <span className="text-base-content/70">{bikeLabel(result.bike)} → </span>}
                          <span className="font-semibold">{result.destination.label}</span>
                        </>
                      )}
                    </span>
                    {isSold(result.bike) && !scopedBike && (
                      <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70">
                        Verkauft
                      </span>
                    )}
                    {result.kind === "bike" ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-base-content/50" aria-hidden="true" />
                    ) : (
                      <span className="hidden shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 sm:inline">
                        {result.destination.group}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
          {isOpen && results.length === 0 && (
            <output className="block px-4 pb-6 pt-3 text-center text-sm text-base-content/70">
              Keine Treffer
            </output>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Schließen">close</button>
        </form>
      </dialog>
    </>
  );
}
