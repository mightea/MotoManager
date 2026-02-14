import clsx from "clsx";
import { Link } from "react-router";
import { useState } from "react";
import type { Motorcycle } from "~/db/schema";

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
}

export function MotorcycleDetailHeader({
  motorcycle,
  nextInspection,
  currentLocationName,
  navLinks,
  backTo = "/",
  overviewLink,
}: MotorcycleDetailHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const hasHeroImage = true;

  return (
    <div
      className={clsx(
        "sticky z-30 -mx-4 px-4 py-4 transition-all duration-300 md:mx-0 md:rounded-3xl md:p-8 md:overflow-hidden",
        hasHeroImage
          ? "text-white"
          : "bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 dark:bg-navy-900/95 md:bg-transparent md:backdrop-blur-none"
      )}
      style={{ top: "var(--app-header-offset, 96px)" }}
    >
      {hasHeroImage && (
        <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden md:rounded-3xl">
          <img
            src={
              !imageError && motorcycle.image
                ? `${motorcycle.image}?width=1200`
                : "/favicon.svg"
            }
            srcSet={
              !imageError && motorcycle.image
                ? `${motorcycle.image}?width=800 800w, ${motorcycle.image}?width=1600 1600w`
                : undefined
            }
            sizes="(max-width: 768px) 100vw, 1200px"
            alt={`${motorcycle.make} ${motorcycle.model}`}
            className={clsx(
              "h-full w-full object-cover",
              (imageError || !motorcycle.image) &&
              "p-32 object-contain opacity-50 grayscale dark:invert"
            )}
            onError={() => setImageError(true)}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        </div>
      )}

      <div className="relative flex items-start gap-4 pointer-events-auto">
        <Link
          to={backTo}
          className={clsx(
            "group flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-all hover:bg-primary hover:text-white",
            hasHeroImage
              ? "bg-white/20 text-white hover:bg-white hover:text-primary backdrop-blur-md"
              : "bg-white text-secondary dark:bg-navy-800 dark:text-navy-400 dark:hover:bg-primary-dark"
          )}
        >
          <span className="sr-only">Zurück</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1
              className={clsx(
                "text-2xl font-bold",
                hasHeroImage ? "text-white" : "text-foreground dark:text-white"
              )}
            >
              {motorcycle.make} {motorcycle.model}
            </h1>
            {motorcycle.isVeteran && (
              <span
                className={clsx(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  hasHeroImage
                    ? "border-white/30 bg-white/20 text-white backdrop-blur-sm"
                    : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-900/20 dark:text-orange-400"
                )}
              >
                Veteran
              </span>
            )}
          </div>

          <div
            className={clsx(
              "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
              hasHeroImage ? "text-gray-200" : "text-secondary dark:text-navy-400"
            )}
          >
            <span>
              {motorcycle.modelYear ? `Jahrgang ${motorcycle.modelYear}` : "Jahrgang unbekannt"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>{motorcycle.vin}</span>

            {nextInspection && (
              <>
                <span className="hidden sm:inline">•</span>
                <div
                  className={clsx(
                    "flex items-center gap-1.5 font-medium",
                    hasHeroImage
                      ? nextInspection.isOverdue
                        ? "text-red-300"
                        : "text-gray-200"
                      : nextInspection.isOverdue
                        ? "text-red-600 dark:text-red-400"
                        : "text-secondary dark:text-navy-400"
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
                <span className="hidden sm:inline">•</span>
                <span>{currentLocationName}</span>
              </>
            )}
          </div>

          {(navLinks.length > 0 || overviewLink) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {overviewLink && (
                <Link
                  key="overview-link"
                  to={overviewLink.to}
                  className={clsx(
                    "hidden rounded-full border px-4 py-1.5 text-xs font-semibold transition-all md:inline-flex",
                    overviewLink.isActive
                      ? hasHeroImage
                        ? "border-white bg-white text-primary"
                        : "border-primary bg-primary text-white"
                      : hasHeroImage
                        ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
                        : "border-gray-200 text-secondary hover:border-primary hover:text-primary dark:border-navy-600 dark:text-navy-200 dark:hover:border-primary-light dark:hover:text-primary-light"
                  )}
                >
                  {overviewLink.label ?? "Overview"}
                </Link>
              )}
              {navLinks.map((link) =>
                link.disabled ? (
                  <span
                    key={link.label}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs font-semibold opacity-60",
                      hasHeroImage
                        ? "border-white/40 text-white"
                        : "border-gray-200 text-secondary dark:border-navy-600 dark:text-navy-300"
                    )}
                  >
                    {link.label}
                  </span>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={clsx(
                      "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                      link.isActive
                        ? hasHeroImage
                          ? "border-white bg-white text-primary"
                          : "border-primary bg-primary text-white"
                        : hasHeroImage
                          ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
                          : "border-gray-200 text-secondary hover:border-primary hover:text-primary dark:border-navy-600 dark:text-navy-200 dark:hover:border-primary-light dark:hover:text-primary-light"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
