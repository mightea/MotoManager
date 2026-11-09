import type { ReactNode } from "react";
import { Link } from "react-router";
import { TriangleAlert } from "lucide-react";
import type { Part } from "~/types/parts";
import { formatNumber } from "~/utils/numberUtils";
import { Card } from "~/components/card";

export interface StorageContentsItem {
  part: Part;
  /** Pieces of this part stocked at the location (summed stock entries). */
  quantity: number;
  /** Optional sub-location path, for items that sit in a nested location. */
  note?: string;
}

interface StorageContentsProps {
  /** Mono line above the title, e.g. "Werkstatt › Lagerort #4". */
  eyebrow: string;
  title: string;
  /** h1 on the location's own page, h2 inside the Lagerorte split view. */
  as?: "h1" | "h2";
  actions?: ReactNode;
  /** Extra content between the tiles and the contents (e.g. sub-locations). */
  children?: ReactNode;
  items: StorageContentsItem[];
  emptyText: string;
}

/**
 * The contents sheet of one Lagerort (or of "Ohne Lagerort"): identity and
 * actions, the TEILE / STÜCK tiles, then every part stocked there. Shared by
 * the Lagerorte split view and the location's own page (QR target).
 */
export function StorageContents({
  eyebrow,
  title,
  as: Heading = "h2",
  actions,
  children,
  items,
  emptyText,
}: StorageContentsProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const partCount = new Set(items.map((item) => item.part.id)).size;

  // Stock entries keep their quantity after a consumption (consumption is not
  // tied to an entry), so a location can claim more pieces than the part has
  // on hand. Flag those so the count can be corrected.
  const quantityByPart = new Map<number, { part: Part; quantity: number }>();
  for (const item of items) {
    const entry = quantityByPart.get(item.part.id) ?? { part: item.part, quantity: 0 };
    entry.quantity += item.quantity;
    quantityByPart.set(item.part.id, entry);
  }
  const mismatches = [...quantityByPart.values()].filter(
    (entry) => entry.quantity > Math.max(0, entry.part.onHand),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-base-200 px-5 py-4 dark:border-navy-700">
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
            {eyebrow}
          </p>
          <Heading className="break-words font-display text-3xl uppercase leading-[1.05] tracking-wide text-base-content dark:text-white">
            {title}
          </Heading>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <dl className="grid grid-cols-2 border-b border-base-200 dark:border-navy-700">
        <div className="relative flex flex-col-reverse border-r border-base-200 px-5 py-3 dark:border-navy-700">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-primary" />
          <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
            Teile
          </dt>
          <dd className="font-numeric text-[22px] font-bold leading-tight text-base-content dark:text-white">
            {formatNumber(partCount)}
          </dd>
        </div>
        <div className="flex flex-col-reverse px-5 py-3">
          <dt className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
            Stück
          </dt>
          <dd className="font-numeric text-[22px] font-bold leading-tight text-base-content dark:text-white">
            {formatNumber(totalQuantity)}
          </dd>
        </div>
      </dl>

      {children}

      <h3 className="px-5 pb-1 pt-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
        Inhalt
      </h3>
      {items.length === 0 ? (
        <p className="border-t border-base-200 px-5 py-5 text-sm text-base-content/70 dark:border-navy-700 dark:text-navy-300">
          {emptyText}
        </p>
      ) : (
        <ul>
          {items.map(({ part, quantity, note }) => (
            <li key={`${part.id}-${note ?? ""}`} className="border-t border-base-200 dark:border-navy-700">
              <Link
                to={`/parts/${part.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-base-200/50 dark:hover:bg-navy-700/30"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-base-content dark:text-white">{part.name}</span>
                  <span className="block truncate font-mono text-xs text-base-content/70 dark:text-navy-300">
                    {part.partNumber}
                    {note && ` · ${note}`}
                  </span>
                </span>
                <span className="whitespace-nowrap font-numeric text-base font-bold text-base-content dark:text-white">
                  {quantity} Stk.
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {mismatches.map(({ part, quantity }) => (
        <p
          key={part.id}
          className="flex items-start gap-2 border-t border-warning/30 bg-warning/5 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.04em] text-warning dark:bg-warning/10"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {part.name}: Teile-Liste zeigt Bestand {Math.max(0, part.onHand)}, hier {quantity} Stk. —
            Zählung angleichen.
          </span>
        </p>
      ))}

      <p className="border-t border-base-200 px-5 py-3 text-[13px] text-base-content/70 dark:border-navy-700 dark:text-navy-300">
        Bestände verwaltest du pro Teil auf der{" "}
        <Link to="/parts" className="text-primary underline dark:text-primary-light">
          Teile-Seite
        </Link>
        .
      </p>
    </Card>
  );
}
