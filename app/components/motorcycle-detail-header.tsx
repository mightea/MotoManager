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

export function MotorcycleDetailHeader({
  motorcycle,
  nextInspection,
  currentLocationName,
  navLinks,
  backTo = "/",
  overviewLink,
  ownerCount: _ownerCount,
}: MotorcycleDetailHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const hasHeroImage = true;
  const imageUrl = getBackendAssetUrl(motorcycle.image);

  return (
    <div className="relative -mx-4 px-4 py-4 text-white md:mx-0 md:mt-2 md:overflow-hidden md:rounded-3xl md:px-8 md:py-6">
      {hasHeroImage && (
        <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden md:rounded-3xl">
          <img
            src={
              !imageError && imageUrl
                ? `${imageUrl}?width=1200`
                : "/favicon.svg"
            }
            srcSet={
              !imageError && imageUrl
                ? `${imageUrl}?width=800 800w, ${imageUrl}?width=1600 1600w`
                : undefined
            }
            sizes="(max-width: 768px) 100vw, 1200px"
            alt={`${motorcycle.make} ${motorcycle.model}`}
            className={clsx(
              "h-full w-full object-cover",
              (imageError || !imageUrl) &&
              "p-32 object-contain opacity-50 grayscale dark:invert"
            )}
            onError={() => setImageError(true)}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        </div>
      )}

      <div className="relative flex items-center gap-4 pointer-events-auto">
        <Link
          to={backTo}
          aria-label="Zurück"
          className="group flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-x-3">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">
              {motorcycle.make} {motorcycle.model}
            </h1>
            {motorcycle.isVeteran && (
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                Veteran
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-200">
            <span>
              {motorcycle.fabricationDate ? `${motorcycle.fabricationDate}` : "Fabrikationsdatum unbekannt"}
            </span>

            {nextInspection && (
              <>
                <span className="hidden sm:inline text-white/40">•</span>
                <div
                  className={clsx(
                    "flex items-center gap-1.5 font-medium",
                    nextInspection.isOverdue ? "text-red-300" : "text-gray-200"
                  )}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect width="18" height="18" x="3" y="4" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                  <span>MFK: {nextInspection.relativeLabel}</span>
                </div>
              </>
            )}

            {currentLocationName && (
              <>
                <span className="hidden sm:inline text-white/40">•</span>
                <span>{currentLocationName}</span>
              </>
            )}
          </div>
        </div>

        {/* Sub-nav (Dokumente, Anzugsmomente) - desktop only, beside title */}
        {(navLinks.length > 0 || overviewLink) && (
          <div className="hidden md:flex gap-2">
            {overviewLink && (
              <Link
                key="overview-link"
                to={overviewLink.to}
                className={clsx(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 md:px-4 text-[10px] md:text-xs font-semibold transition-all",
                  overviewLink.isActive
                    ? "border-white bg-white text-navy-900"
                    : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {overviewLink.label ?? "Übersicht"}
              </Link>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 md:px-4 text-[10px] md:text-xs font-semibold transition-all",
                  link.isActive
                    ? "border-white bg-white text-navy-900"
                    : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sub-nav - mobile (below title) */}
      {(navLinks.length > 0 || overviewLink) && (
        <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:hidden">
          {overviewLink && (
            <Link
              key="overview-link-mobile"
              to={overviewLink.to}
              className={clsx(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                overviewLink.isActive
                  ? "border-white bg-white text-primary"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {overviewLink.label ?? "Übersicht"}
            </Link>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.to + "-mobile"}
              to={link.to}
              className={clsx(
                "whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                link.isActive
                  ? "border-white bg-white text-primary"
                  : "border-white/40 bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
