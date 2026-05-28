import clsx from "clsx";
import { Link } from "react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, CalendarDays } from "lucide-react";
import type { Motorcycle } from "~/types/db";
import { getBackendAssetUrl } from "~/utils/backend";

type NextInspectionInfo = {
  relativeLabel: string;
  isOverdue: boolean;
} | null;

type NavLink = {
  label: string;
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
  nextInspection: NextInspectionInfo;
  currentLocationName?: string | null;
  navLinks: NavLink[];
  backTo?: string;
  overviewLink?: OverviewLink;
  ownerCount?: number;
}

/**
 * Race-program cover header.
 *
 * - Wide cinematic hero photo, slightly desaturated, with a dark editorial scrim.
 * - Hero text is split into two columns:
 *     · Left (large): make/model in Anton, fabrication date as a mono stamp.
 *     · Right (small, on desktop): MFK and location stats, mono labels above
 *       tabular values, separated by hairline rules.
 * - A motorsport stripe runs as a thin band at the bottom of the hero —
 *   the signature element that ties the page to the rest of the app.
 * - Sub-nav (Übersicht / Dokumente / Anzugsmomente) sits below the hero as
 *   a tabular row of file tabs, NOT pills on the photo.
 */
export function MotorcycleDetailHeader({
  motorcycle,
  nextInspection,
  currentLocationName,
  navLinks,
  backTo = "/",
  overviewLink,
}: MotorcycleDetailHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getBackendAssetUrl(motorcycle.image);
  const hasImage = Boolean(!imageError && imageUrl);

  const allNavLinks = overviewLink
    ? [{ label: overviewLink.label ?? "Übersicht", to: overviewLink.to, isActive: overviewLink.isActive }, ...navLinks]
    : navLinks;

  return (
    <div className="-mx-4 md:mx-0">
      {/* Hero plate */}
      <div className="relative overflow-hidden md:rounded-sm">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          {hasImage ? (
            <img
              src={`${imageUrl}?width=1600`}
              srcSet={`${imageUrl}?width=1200 1200w, ${imageUrl}?width=2000 2000w`}
              sizes="100vw"
              alt={`${motorcycle.make} ${motorcycle.model}`}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
              fetchPriority="high"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[var(--color-secondary)] via-navy-900 to-base-300" />
          )}
          {/* Editorial scrim — top-left brightens, bottom-right darkens for legible text */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.85)_100%)]" />
          {/* Subtle 1px scanline texture for the workshop feel */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, white 0, white 1px, transparent 1px, transparent 3px)",
            }}
          />
        </div>

        <div className="relative px-4 pb-6 pt-4 text-white md:px-8 md:pb-8 md:pt-6">
          {/* Top utility row: back arrow + section code */}
          <div className="flex items-center justify-between">
            <Link
              to={backTo}
              aria-label="Zurück zur Übersicht"
              className="inline-flex items-center gap-2 rounded-sm border border-white/25 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Garage
            </Link>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 tabular-nums">
              FILE · {String(motorcycle.id).padStart(4, "0")}
            </span>
          </div>

          {/* Title block */}
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              {motorcycle.isVeteran && (
                <span className="stamp mb-3">Veteran · Historisch</span>
              )}
              <h1 className="font-display text-[clamp(2.25rem,6vw,4rem)] uppercase leading-[0.95] tracking-wide text-white">
                {motorcycle.make}
              </h1>
              <h2 className="font-display text-[clamp(1.75rem,4.5vw,3rem)] uppercase leading-[0.95] tracking-wide text-white/80">
                {motorcycle.model}
              </h2>
              <p className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                <span className="h-px w-6 bg-white/40" aria-hidden="true" />
                {motorcycle.fabricationDate ?? "Fabrikation unbekannt"}
              </p>
            </div>

            {/* Right stats column — desktop only */}
            <div className="hidden md:grid md:gap-2 md:text-right md:font-mono md:text-xs">
              {nextInspection && (
                <DatumLine
                  icon={CalendarDays}
                  label="MFK"
                  value={nextInspection.relativeLabel}
                  tone={nextInspection.isOverdue ? "alert" : "default"}
                />
              )}
              {currentLocationName && (
                <DatumLine
                  icon={MapPin}
                  label="Standort"
                  value={currentLocationName}
                />
              )}
            </div>
          </div>

          {/* Mobile stats row */}
          {(nextInspection || currentLocationName) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 md:hidden">
              {nextInspection && (
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
                    nextInspection.isOverdue ? "text-error/90" : "text-white/75"
                  )}
                >
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  MFK · {nextInspection.relativeLabel}
                </span>
              )}
              {currentLocationName && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {currentLocationName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Signature stripe at the bottom of the hero */}
        <div className="motorsport-stripe relative h-[4px]" aria-hidden="true" />
      </div>

      {/* Sub-nav (file-tab style) */}
      {allNavLinks.length > 0 && (
        <nav
          aria-label="Fahrzeug-Unterseiten"
          className="relative -mt-px overflow-x-auto border-b border-base-300 bg-base-100 px-4 dark:border-navy-700 dark:bg-navy-900 md:px-8"
        >
          <ul className="flex items-stretch gap-1 py-0">
            {allNavLinks.map((link, index) => {
              const code = String(index + 1).padStart(2, "0");
              return (
                <li key={link.to} className="flex">
                  <Link
                    to={link.to}
                    aria-current={link.isActive ? "page" : undefined}
                    className={clsx(
                      "group relative flex flex-col items-start gap-0.5 px-3 pb-2 pt-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      link.isActive
                        ? "text-base-content"
                        : "text-base-content/55 hover:text-base-content"
                    )}
                  >
                    <span
                      className={clsx(
                        "font-mono text-[10px] font-semibold tracking-[0.14em] uppercase tabular-nums",
                        link.isActive ? "text-primary" : "text-base-content/45 group-hover:text-base-content/65"
                      )}
                    >
                      {code}
                    </span>
                    <span className="font-subdisplay text-sm leading-none whitespace-nowrap">
                      {link.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "motorsport-stripe absolute inset-x-2 -bottom-px h-[3px] origin-left transition-transform duration-300",
                        link.isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function DatumLine({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className="flex items-center justify-end gap-3 text-white">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
        {label}
      </span>
      <span className="h-px w-4 bg-white/30" aria-hidden="true" />
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 font-numeric text-sm font-semibold",
          tone === "alert" ? "text-error" : "text-white"
        )}
      >
        <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        {value}
      </span>
    </div>
  );
}
