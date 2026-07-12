import { Card } from "./card";
import type { TirePressure } from "~/types/db";
import { formatPressure } from "~/utils/pressure";

interface TirePressureCardProps {
  pressure: TirePressure;
}

/**
 * Read-only display of one motorcycle's recommended tire pressures as a
 * matrix: one row per tire position (Vorne / Hinten / Beiwagen), one
 * column per riding configuration (Solo / Sozius / Offroad). Only
 * recorded configurations get a column; with a single configuration no
 * column headers render and the card stays a simple two-row list.
 */
export function TirePressureCard({ pressure }: TirePressureCardProps) {
  // Only recorded configurations become columns — every set is optional.
  const variants = [
    {
      key: "solo",
      label: "Solo",
      front: pressure.frontBar,
      rear: pressure.rearBar,
      sidecar: pressure.sidecarBar,
    },
    {
      key: "passenger",
      label: "Sozius",
      front: pressure.frontPassengerBar,
      rear: pressure.rearPassengerBar,
      sidecar: pressure.sidecarPassengerBar,
    },
    {
      key: "offroad",
      label: "Offroad",
      front: pressure.frontOffroadBar,
      rear: pressure.rearOffroadBar,
      sidecar: pressure.sidecarOffroadBar,
    },
  ].filter((v) => v.front != null || v.rear != null);
  // Headers render for several columns — and for a single non-solo column,
  // where values without their configuration label would be ambiguous.
  const showHeader = variants.length > 1 || variants.some((v) => v.key !== "solo");
  const hasSidecar = variants.some((v) => v.sidecar != null);

  return (
    <Card>
      {/* overflow-x-auto: three value columns plus labels can exceed a
          narrow phone viewport; the card must scroll, not the page. */}
      <div className="overflow-x-auto px-4 py-4">
        <table className="w-full">
          {showHeader && (
            <thead>
              <tr>
                <th aria-label="Reifenposition" />
                {variants.map((v) => (
                  <th
                    key={v.key}
                    scope="col"
                    className="pb-2 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/45 dark:text-navy-500"
                  >
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            <PositionRow
              label="Vorne"
              values={variants.map((v) => ({ key: v.key, bar: v.front }))}
              preferred={pressure.preferredUnit}
            />
            <PositionRow
              label="Hinten"
              values={variants.map((v) => ({ key: v.key, bar: v.rear }))}
              preferred={pressure.preferredUnit}
            />
            {hasSidecar && (
              <PositionRow
                label="Beiwagen"
                values={variants.map((v) => ({ key: v.key, bar: v.sidecar }))}
                preferred={pressure.preferredUnit}
              />
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PositionRow({
  label,
  values,
  preferred,
}: {
  label: string;
  values: { key: string; bar: number | null }[];
  preferred: TirePressure["preferredUnit"];
}) {
  return (
    <tr className="border-b border-base-200/70 last:border-b-0 dark:border-navy-700/60">
      <th
        scope="row"
        className="py-2.5 pr-4 text-left align-baseline font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400"
      >
        {label}
      </th>
      {values.map(({ key, bar }) => (
        <td key={key} className="py-2.5 pl-4 text-right align-baseline">
          {bar != null ? <PressureValue bar={bar} preferred={preferred} /> : (
            <span aria-hidden="true" className="text-base-content/30">—</span>
          )}
        </td>
      ))}
    </tr>
  );
}

function PressureValue({
  bar,
  preferred,
}: {
  bar: number;
  preferred: TirePressure["preferredUnit"];
}) {
  const formatted = formatPressure(bar, preferred);
  return (
    <span className="inline-flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <span className="font-numeric text-base font-semibold tabular-nums text-base-content dark:text-white">
        {formatted.primary}
      </span>
      <span className="whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/50">
        ≈ {formatted.secondary}
      </span>
    </span>
  );
}
