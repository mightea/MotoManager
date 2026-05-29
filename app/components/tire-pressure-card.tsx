import { Pencil } from "lucide-react";
import { Card, CardAction, CardHeading } from "./card";
import type { TirePressure } from "~/types/db";
import { formatPressure } from "~/utils/pressure";

interface TirePressureCardProps {
  pressure: TirePressure;
  onEdit: () => void;
}

/**
 * Read-only display of one motorcycle's recommended tire pressures.
 * Three rows max — Vorne / Hinten / Beiwagen — each shows the user's
 * preferred unit prominently with the converted unit in a small
 * mono-uppercase secondary line.
 */
export function TirePressureCard({ pressure, onEdit }: TirePressureCardProps) {
  return (
    <Card>
      <CardHeading
        title="Reifendruck"
        trailing={
          <CardAction onClick={onEdit} aria-label="Reifendruck bearbeiten">
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Bearbeiten
          </CardAction>
        }
      />
      <div className="px-4 py-4">
        <dl className="space-y-3">
          <PressureRow
            label="Vorne"
            bar={pressure.frontBar}
            preferred={pressure.preferredUnit}
          />
          <PressureRow
            label="Hinten"
            bar={pressure.rearBar}
            preferred={pressure.preferredUnit}
          />
          {pressure.sidecarBar != null && (
            <PressureRow
              label="Beiwagen"
              bar={pressure.sidecarBar}
              preferred={pressure.preferredUnit}
            />
          )}
        </dl>
      </div>
    </Card>
  );
}

function PressureRow({
  label,
  bar,
  preferred,
}: {
  label: string;
  bar: number;
  preferred: TirePressure["preferredUnit"];
}) {
  const formatted = formatPressure(bar, preferred);
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-base-200/70 pb-2 last:border-b-0 last:pb-0 dark:border-navy-700/60">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400">
        {label}
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className="font-numeric text-base font-semibold tabular-nums text-base-content dark:text-white">
          {formatted.primary}
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
          ≈ {formatted.secondary}
        </span>
      </dd>
    </div>
  );
}
