import type { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * "default" — standard service-manual surface (sharp corners, subtle border, soft shadow).
   * "paper" — kraft-paper grain background (.paper utility), for "logbook" content.
   * "ink" — inverted dark surface for callout cards inside the document.
   */
  variant?: "default" | "paper" | "ink";
  /**
   * Tone of the optional leading vertical accent. Omit for no accent.
   */
  accent?: "primary" | "secondary" | "accent" | "workshop" | "error" | "success" | "warning";
  /**
   * Tone of the optional motorsport-stripe slab at the top of the card.
   * Use "flag" for the 3-band motorsport stripe; "primary" for a single color.
   */
  topStripe?: "flag" | "primary";
}

/**
 * Card — the service-manual surface primitive used throughout MotoManager.
 *
 * The card has sharp corners (rounded-sm), a hairline border that gets darker
 * on hover for affordance, a 1px-baseline shadow that reads like paper on a
 * desk rather than a floating chip. Optional accents (leading rail, top
 * motorsport-stripe) let callers indicate status without painting the
 * whole surface.
 */
export function Card({
  children,
  className,
  variant = "default",
  accent,
  topStripe,
}: CardProps) {
  const surface = {
    default: "bg-base-100 dark:bg-navy-800",
    paper: "paper",
    ink: "bg-navy-900 text-navy-50 dark:bg-base-content dark:text-base-100",
  }[variant];

  const accentColor = accent
    ? {
        primary: "bg-primary",
        secondary: "bg-secondary",
        accent: "bg-accent",
        workshop: "bg-[var(--color-workshop)]",
        error: "bg-error",
        success: "bg-success",
        warning: "bg-warning",
      }[accent]
    : null;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-sm border border-base-300/70 shadow-[0_1px_0_0_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:border-navy-700",
        surface,
        className,
      )}
    >
      {topStripe === "flag" && (
        <span aria-hidden="true" className="motorsport-stripe absolute inset-x-0 top-0 h-[3px] rounded-t-sm" />
      )}
      {topStripe === "primary" && (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] rounded-t-sm bg-primary" />
      )}
      {accentColor && (
        <span aria-hidden="true" className={clsx("absolute inset-y-2 left-0 w-[3px] rounded-r-sm", accentColor)} />
      )}
      {children}
    </div>
  );
}

interface CardHeadingProps {
  /**
   * Section code, e.g. "01", "A", "§". Rendered in the mono face, tracked open.
   * Provide as a 2-digit number or short token. Omit if no code is needed.
   */
  code?: string;
  /**
   * The visible heading text. Rendered in display-cased small caps.
   */
  title: string;
  /**
   * Optional secondary text (eg "12 Einträge", "letzter Eintrag vor 3 Tagen").
   * Renders inline next to the title in the mono face.
   */
  meta?: ReactNode;
  /**
   * Optional element rendered on the trailing edge (typically an action button).
   */
  trailing?: ReactNode;
  /**
   * Heading level — defaults to h2.
   */
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/**
 * CardHeading — the shared header pattern for any Card.
 *
 *   ┌─ 01 ── HISTORIE ────────────────  [+ Eintrag]
 *
 * The section code, dash-rule, and title all sit on one mono baseline.
 * Trailing slot is reserved for the card's primary action button.
 */
export function CardHeading({
  code,
  title,
  meta,
  trailing,
  as: Tag = "h2",
  className,
}: CardHeadingProps) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-base-200 px-4 py-3 dark:border-navy-700",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {code && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45 tabular-nums shrink-0">
            {code}
          </span>
        )}
        {code && <span aria-hidden="true" className="h-px w-3 bg-base-content/25 shrink-0" />}
        <Tag className="font-subdisplay text-[0.95rem] leading-none text-base-content truncate">
          {title}
        </Tag>
        {meta && (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50 truncate">
            · {meta}
          </span>
        )}
      </div>
      {trailing && <div className="flex shrink-0 items-center">{trailing}</div>}
    </div>
  );
}

/**
 * CardBody — the standard padding wrapper used inside Card. Optional;
 * callers may render their own padding when they need to bleed content
 * (e.g., MaintenanceList sticky filter).
 *
 * Canonical card body padding is `px-4 py-4`; modal sheets use the larger
 * `px-6 py-5` — that is a deliberate, separate standard. Don't re-declare
 * either inline in route code.
 */
export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("px-4 py-4", className)}>{children}</div>;
}

/**
 * Compact action button used as a Card's `trailing` slot. Visually a workshop
 * tab — primary tint background, slight tracking, primary text.
 */
export function CardAction({
  onClick,
  children,
  "aria-label": ariaLabel,
  href,
  className,
}: {
  onClick?: () => void;
  children: ReactNode;
  "aria-label"?: string;
  href?: string;
  className?: string;
}) {
  const cls = clsx(
    "inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary transition-all hover:bg-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-primary/15 dark:text-primary-light dark:hover:bg-primary/25",
    className,
  );

  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls}>
      {children}
    </button>
  );
}
