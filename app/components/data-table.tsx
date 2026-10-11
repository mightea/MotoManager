import type { ReactNode } from "react";
import clsx from "clsx";

/** Header cell of the service-manual data tables (mono uppercase caption). */
export function Th({ children, align = "left", hide = false }: { children?: ReactNode; align?: "left" | "right"; hide?: boolean }) {

  return (
    <th
      className={clsx(
        "px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/55 dark:text-navy-300",
        align === "right" && "text-right",
        hide && "hidden md:table-cell",
      )}
    >
      {children}
    </th>
  );
}

/** Body cell: tabular figures, optional emphasis, hidden below `md` when `hide`. */
export function Td({
  children,
  align = "left",
  hide = false,
  strong = false,
}: {
  children?: ReactNode;
  align?: "left" | "right";
  hide?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={clsx(
        "px-4 py-3 font-numeric text-sm tabular-nums",
        align === "right" && "text-right",
        hide && "hidden md:table-cell",
        strong ? "font-semibold text-base-content dark:text-white" : "text-base-content/70 dark:text-navy-300",
      )}
    >
      {children}
    </td>
  );
}
