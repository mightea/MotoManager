import clsx from "clsx";
import { Link } from "react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Motorcycle } from "~/types/db";
import { getBackendAssetUrl } from "~/utils/backend";

type NextInspectionInfo = {
  relativeLabel: string;
  isOverdue: boolean;
} | null;

type NavLink = {
  label: string;
  /** Shorter label used on phone widths, e.g. "Werkstatt" for "Werkstattdaten". */
  shortLabel?: string;
  to: string;
  isActive?: boolean;
  disabled?: boolean;
};

type OverviewLink = {
  to: string;
  label?: string;
  isActive?: boolean;
};

interface MotorcycleDetailHeaderProps {
  motorcycle: Motorcycle;
  /** Kept for callers that pass it; the MFK now reads from `stats`. */
  nextInspection?: NextInspectionInfo;
  currentLocationName?: string | null;
  navLinks: NavLink[];
  backTo?: string;
  overviewLink?: OverviewLink;
  ownerCount?: number;
  /** Key numbers shown in the hero, e.g. Tacho, Ø Verbrauch, MFK. */
  stats?: HeroStat[];
  /** Short facts under the title on wide screens, e.g. "Baujahr 2017 · 1. Hand". */
  facts?: string[];
  /** Lower hero for the sub-pages (Dokumente, Werkstattdaten, Teile). */
  compact?: boolean;
}

export type HeroStat = {
  label: string;
  value: string;
  tone?: "default" | "alert";
  /** Leave the figure out of the three-up phone strip. */
  hideOnMobile?: boolean;
};

const NO_STATS: HeroStat[] = [];
const NO_FACTS: string[] = [];

/**
 * Motorcycle hero + section tabs, shared by all motorcycle pages.
 *
 * Wide screens: the photo fills the right ~60% and fades into the ink plate
 * on the left, which carries back link, location tag and file code, the name
 * in Anton and a facts line; the key figures sit in a boxed strip bottom
 * right. Phones: the photo fills the plate, the name sits low on a bottom
 * scrim and the figures run as a three-up strip beneath it. A motorsport
 * stripe closes the plate; the tabs follow as a code-over-label row.
 */
export function MotorcycleDetailHeader({
  motorcycle,
  currentLocationName,
  navLinks,
  backTo = "/",
  overviewLink,
  stats = NO_STATS,
  facts = NO_FACTS,
  compact = false,
}: MotorcycleDetailHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getBackendAssetUrl(motorcycle.image);
  const hasImage = Boolean(!imageError && imageUrl);
  const fileCode = String(motorcycle.id).padStart(4, "0");

  const allNavLinks = overviewLink
    ? [{ label: overviewLink.label ?? "Übersicht", to: overviewLink.to, isActive: overviewLink.isActive }, ...navLinks]
    : navLinks;

  const mobileStats = stats.filter((s) => !s.hideOnMobile).slice(0, 3);
  const mobileLine = [
    motorcycle.fabricationDate,
    `File ${fileCode}`,
    currentLocationName,
  ].filter(Boolean).join(" · ");

  return (
    <div className="-mx-4 md:mx-0">
      <section
        aria-label={`${motorcycle.make} ${motorcycle.model}`}
        className="relative overflow-hidden bg-[#0a0711] text-white md:rounded-sm"
      >
        {hasImage ? (
          <img
            src={`${imageUrl}?width=1600`}
            srcSet={`${imageUrl}?width=800 800w, ${imageUrl}?width=1200 1200w, ${imageUrl}?width=2000 2000w`}
            sizes="(min-width: 768px) 62vw, 100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_60%] md:left-auto md:w-[62%] md:object-[center_55%]"
            onError={() => setImageError(true)}
            fetchPriority="high"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-[var(--color-secondary)] via-navy-900 to-[#0a0711] md:left-auto md:w-[62%]"
          />
        )}
        {/* Scrims — bottom-up on phones, left-to-right on wide screens. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,7,17,0.95)_0%,rgba(10,7,17,0.75)_45%,rgba(10,7,17,0.2)_100%)] md:bg-[linear-gradient(90deg,#0a0711_0%,#0a0711_38%,rgba(10,7,17,0.7)_60%,rgba(10,7,17,0.25)_100%)]"
        />

        <div
          className={clsx(
            "relative flex flex-col gap-2.5 px-4 pb-4 pt-3.5 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:px-7",
            compact ? "md:min-h-[190px] md:pb-[22px] md:pt-[18px]" : "md:min-h-[230px] md:pb-[26px] md:pt-5",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2.5 md:gap-2">
            {/* Utility row */}
            <div className="flex flex-wrap items-center justify-between gap-2 md:justify-start md:gap-3">
              <Link
                to={backTo}
                prefetch="intent"
                aria-label="Zurück zur Garage"
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-white/40 bg-[rgba(10,7,17,0.4)] px-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:h-[30px] md:border-white/30 md:bg-transparent"
              >
                <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                Garage
              </Link>
              {currentLocationName && (
                <span className="hidden border border-white/30 px-2 py-1 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] md:inline">
                  Standort · {currentLocationName}
                </span>
              )}
              <span className="hidden font-mono text-[12px] uppercase tracking-[0.1em] text-[#d1ceda] tabular-nums md:inline">
                File · {fileCode}
              </span>
              {motorcycle.isVeteran && <span className="stamp">Veteran</span>}
              {motorcycle.status === "sold" && <span className="stamp stamp-error">Verkauft</span>}
            </div>

            {/* Phones: leave the photo room to show before the name. */}
            <div className={clsx("md:hidden", compact ? "h-16" : "h-[110px]")} aria-hidden="true" />

            <h1
              className={clsx(
                "font-display uppercase leading-none tracking-[0.5px]",
                compact ? "text-[36px] md:text-[52px]" : "text-[42px] md:text-[64px]",
              )}
            >
              {motorcycle.make} <span className="text-[#d1ceda]">{motorcycle.model}</span>
            </h1>

            <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#d1ceda] md:hidden">
              {mobileLine}
            </p>
            <p className="hidden font-mono text-[12px] uppercase tracking-[0.1em] text-[#d1ceda] md:block">
              {facts.length > 0 ? facts.join(" · ") : motorcycle.fabricationDate ?? "Fabrikation unbekannt"}
            </p>
          </div>

          {stats.length > 0 && (
            <>
              {/* Wide screens: boxed strip, bottom right. */}
              <dl className="hidden border border-white/15 bg-[rgba(10,7,17,0.72)] md:grid md:auto-cols-[minmax(110px,auto)] md:grid-flow-col">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={clsx(
                      "flex flex-col-reverse border-white/15 px-[18px] py-2 [&:not(:last-child)]:border-r",
                      stat.tone === "alert" && "bg-error",
                    )}
                  >
                    <dt
                      className={clsx(
                        "font-mono text-[11px] font-semibold uppercase tracking-[0.1em]",
                        stat.tone === "alert" ? "text-white" : "text-[#d1ceda]",
                      )}
                    >
                      {stat.label}
                    </dt>
                    <dd className={clsx("font-numeric font-bold leading-tight", compact ? "text-xl" : "text-[22px]")}>
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Phones: three-up strip under the name. */}
              <dl className="mt-1 grid grid-cols-3 border-t border-white/20 pt-2.5 md:hidden">
                {mobileStats.map((stat) => (
                  <div key={stat.label} className="flex min-w-0 flex-col-reverse">
                    <dt
                      className={clsx(
                        "truncate font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
                        stat.tone === "alert" ? "text-error" : "text-[#d1ceda]",
                      )}
                    >
                      {stat.label}
                    </dt>
                    <dd
                      className={clsx(
                        "truncate font-numeric text-[17px] font-bold leading-tight",
                        stat.tone === "alert" && "text-error",
                      )}
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>

        {/* Signature stripe closing the plate */}
        <div className="motorsport-stripe relative h-[3px]" aria-hidden="true" />
      </section>

      {/* Section tabs — equal four-up grid on phones, a spaced row above. */}
      {allNavLinks.length > 0 && (
        <nav
          aria-label="Bereiche"
          className="border-b border-base-300 bg-base-100 dark:border-navy-700 dark:bg-navy-900 md:mt-5 md:bg-transparent md:px-1 md:dark:bg-transparent"
        >
          <ul
            className="grid md:flex md:gap-7"
            style={{ gridTemplateColumns: `repeat(${allNavLinks.length}, minmax(0, 1fr))` }}
          >
            {allNavLinks.map((link, index) => (
              <li key={link.to} className="flex min-w-0">
                <Link
                  to={link.to}
                  prefetch="intent"
                  aria-current={link.isActive ? "page" : undefined}
                  className={clsx(
                    "group flex w-full flex-col items-center pb-2.5 pt-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 md:items-start md:pt-1",
                    link.isActive
                      ? "text-base-content shadow-[inset_0_-3px_0_var(--color-primary)] dark:text-white"
                      : "text-base-content/70 hover:text-base-content dark:text-navy-300 dark:hover:text-white",
                  )}
                >
                  <span
                    className={clsx(
                      "font-mono text-[11px] font-semibold tabular-nums",
                      link.isActive ? "text-primary" : "text-base-content/45 dark:text-navy-400",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-full truncate text-[12px] font-bold uppercase tracking-[0.04em] md:text-sm md:tracking-[0.06em]">
                    {link.shortLabel ? (
                      <>
                        <span className="md:hidden">{link.shortLabel}</span>
                        <span className="hidden md:inline">{link.label}</span>
                      </>
                    ) : (
                      link.label
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
