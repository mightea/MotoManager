import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Link2, X } from "lucide-react";
import { Card } from "~/components/card";
import { createMotorcycleSlug } from "~/utils/motorcycle";
import type { PartIssueLink } from "~/types/parts";

/** An open issue of one of the user's bikes the part could be linked to. */
export interface IssueCandidate {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  date: string | null;
  motorcycleId: number;
  motorcycleLabel: string;
  /** The part's catalog fitment covers this bike. */
  fits: boolean;
}

const PRIORITY_LABEL: Record<string, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const DATE_FMT = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatSince(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso.slice(0, 10));
  return Number.isNaN(date.getTime()) ? null : DATE_FMT.format(date);
}

/** "HOCH · seit 01.10.2026" (uppercased by the mono label style). */
function priorityLine(priority: string, date: string | null): string {
  const since = formatSince(date);
  const label = PRIORITY_LABEL[priority] ?? priority;
  return since ? `${label} · seit ${since}` : label;
}

interface PartIssueCalloutProps {
  /** Linked issues — open and done; only the open ones are shown. */
  linkedIssues: PartIssueLink[];
  candidates: IssueCandidate[];
  onHand: number;
  onBook: (issue: PartIssueLink) => void;
  onLink: (issueId: number) => void;
  onUnlink: (issueId: number) => void;
}

/**
 * "Passt zu offenem Mangel" — the open defects this spare part is meant to
 * fix, with a shortcut to book it against one. Without a link it collapses to
 * a small "Mit Mangel verknüpfen" action that opens a picker of open issues on
 * the bikes the part fits ("alle anzeigen" widens it to every own bike).
 */
export function PartIssueCallout({
  linkedIssues,
  candidates,
  onHand,
  onBook,
  onLink,
  onUnlink,
}: PartIssueCalloutProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const openLinked = linkedIssues.filter((issue) => !issue.isDone);
  const linkedIds = useMemo(() => new Set(linkedIssues.map((issue) => issue.id)), [linkedIssues]);
  const available = candidates.filter((candidate) => !linkedIds.has(candidate.id));
  const fitting = available.filter((candidate) => candidate.fits);
  const visible = showAll ? available : fitting;
  const hiddenCount = available.length - fitting.length;

  const linkAction = (
    <button
      type="button"
      onClick={() => setIsPicking((value) => !value)}
      aria-expanded={isPicking}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-primary-light"
    >
      <Link2 className="h-3 w-3" aria-hidden="true" />
      {openLinked.length > 0 ? "Weiteren Mangel verknüpfen" : "Mit Mangel verknüpfen"}
    </button>
  );

  const picker = isPicking && (
    <div className="space-y-2 rounded-sm border border-base-300 bg-base-100 p-3 dark:border-navy-700 dark:bg-navy-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-300">
          {showAll ? "Offene Mängel aller Fahrzeuge" : "Offene Mängel passender Fahrzeuge"}
        </span>
        {(hiddenCount > 0 || showAll) && (
          <label className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-300">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
            />
            alle anzeigen
          </label>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-base-content/70 dark:text-navy-300">
          {showAll || hiddenCount === 0
            ? "Keine offenen Mängel vorhanden."
            : "Kein offener Mangel an einem passenden Fahrzeug."}
        </p>
      ) : (
        <ul className="divide-y divide-base-200 dark:divide-navy-700">
          {visible.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => {
                  onLink(candidate.id);
                  setIsPicking(false);
                }}
                className="flex w-full flex-col gap-0.5 px-1 py-2 text-left transition-colors hover:bg-base-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-navy-700/40"
              >
                <span className="text-sm font-semibold text-base-content dark:text-white">
                  {candidate.motorcycleLabel} · {candidate.title}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-base-content/70 dark:text-navy-300">
                  {priorityLine(candidate.priority, candidate.date)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (openLinked.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">{linkAction}</div>
        {picker}
      </div>
    );
  }

  return (
    <Card accent="accent">
      <div className="space-y-3 py-3.5 pl-5 pr-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-subdisplay text-[15px] uppercase tracking-[0.06em] text-accent">
            Passt zu offenem Mangel
          </h2>
          {linkAction}
        </div>
        <ul className="space-y-3">
          {openLinked.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
            >
              <div className="min-w-0 space-y-0.5">
                <Link
                  to={`/motorcycle/${createMotorcycleSlug(issue.motorcycleMake, issue.motorcycleModel)}/${issue.motorcycleId}`}
                  className="block font-semibold text-base-content hover:underline dark:text-white"
                >
                  {issue.motorcycleMake} {issue.motorcycleModel} · {issue.title}
                </Link>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:text-navy-300">
                  {priorityLine(issue.priority, issue.date)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onBook(issue)}
                  disabled={onHand < 1}
                  title={onHand < 1 ? "Kein Bestand zum Verbuchen" : undefined}
                  className="inline-flex h-9 items-center rounded-sm bg-accent px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-content transition-all hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Beim Mangel verbuchen
                </button>
                <button
                  type="button"
                  onClick={() => onUnlink(issue.id)}
                  aria-label={`Verknüpfung mit „${issue.title}“ lösen`}
                  title="Verknüpfung lösen"
                  className="grid h-9 w-9 place-items-center rounded-sm text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-navy-300 dark:hover:bg-navy-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {picker}
      </div>
    </Card>
  );
}
