import clsx from "clsx";
import type { TirePressure } from "~/types/db";
import { formatPressure } from "~/utils/pressure";

interface TirePressureCardProps {
  pressure: TirePressure;
}

/**
 * Read-only matrix of one motorcycle's recommended tire pressures: one row
 * per tire position (Vorne / Hinten / Beiwagen), one column per recorded
 * riding configuration (Solo / Sozius / Offroad). Renders the bare table —
 * the caller supplies the card and its heading.
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
    // overflow-x-auto: three value columns plus labels can exceed a narrow
    // phone viewport; the table scrolls, not the page.
    <div className="overflow-x-auto">
      <table className={clsx("w-full", variants.length > 1 && "min-w-[420px]")}>
        {showHeader && (
          <thead>
            <tr>
              <th aria-label="Reifenposition" className="border-b border-base-300 px-4 py-2.5 dark:border-navy-700" />
              {variants.map((v) => (
                <th
                  key={v.key}
                  scope="col"
                  className="border-b border-base-300 px-4 py-2.5 text-right font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/70 dark:border-navy-700 dark:text-navy-300"
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
    <tr className="border-b border-base-200 last:border-b-0 dark:border-navy-700">
      <th
        scope="row"
        className="px-4 py-3 text-left align-top font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-base-content dark:text-white"
      >
        {label}
      </th>
      {values.map(({ key, bar }) => (
        <td key={key} className="px-4 py-3 text-right align-top">
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
    <>
      <span className="block whitespace-nowrap font-numeric text-[17px] font-bold text-base-content dark:text-white">
        {formatted.primary}
      </span>
      <span className="block whitespace-nowrap font-mono text-[11px] text-base-content/70 dark:text-navy-300">
        ≈ {formatted.secondary}
      </span>
    </>
  );
}
