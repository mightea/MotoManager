import { Link } from "react-router";

interface HeaderBrandProps {
  onNavigate?: () => void;
}

/**
 * Brand lockup — a service-manual nameplate.
 * Left: monogram "MM" in display headline, framed by a thin rule that doubles
 * as the start of the global header's structural language.
 * Right: stacked wordmark with a small mono "service-code" tag above.
 */
export function HeaderBrand({ onNavigate }: HeaderBrandProps) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="group relative flex items-center gap-3 pl-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
      aria-label="MotoManager — Startseite"
    >
      <div className="relative grid h-10 w-10 place-items-center rounded-sm border border-base-content/15 bg-base-100 transition-colors group-hover:border-primary/40 dark:bg-navy-900">
        <span className="font-display text-2xl leading-none text-base-content tracking-tight">
          MM
        </span>
        {/* Tiny corner accent — workshop ID feel */}
        <span className="absolute -bottom-px -right-px h-1.5 w-1.5 bg-primary" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-start leading-none">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.25em] text-base-content/55">
          MM · 01 / Garage
        </span>
        <span className="mt-1 font-display text-[1.35rem] uppercase leading-none tracking-wide text-base-content transition-colors group-hover:text-primary">
          MotoManager
        </span>
      </div>
    </Link>
  );
}
