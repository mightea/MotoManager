import type { ModelSeries, Part } from "~/types/parts";
import { seriesNames } from "~/utils/parts";
import { useQrDataUrl } from "./storage-location-label";

/** The absolute URL a printed part label points at — the part's page. */
export function partUrl(partId: number): string {
  return `${window.location.origin}/parts/${partId}`;
}

interface PartLabelProps {
  part: Part;
  modelSeries: ModelSeries[];
}

/**
 * A printable part label: QR code linking to the part's page plus everything
 * needed to identify the physical piece — part number, name, manufacturer
 * and fitment. Dashed border doubles as a cutting guide.
 */
export function PartLabel({ part, modelSeries }: PartLabelProps) {
  const qrUrl = useQrDataUrl(partUrl(part.id));
  const fitment = seriesNames(part.seriesIds, modelSeries);
  const fitmentLine =
    fitment.length === 0
      ? null
      : fitment.slice(0, 3).join(", ") +
        (fitment.length > 3 ? ` +${fitment.length - 3} weitere` : "");

  return (
    <div className="flex items-center gap-3 border border-dashed border-base-content/30 p-3 print:break-inside-avoid print:border-gray-400">
      {qrUrl ? (
        <img
          src={qrUrl}
          alt={`QR-Code für ${part.name}`}
          className="h-24 w-24 shrink-0 print:h-[2.6cm] print:w-[2.6cm]"
        />
      ) : (
        <div className="h-24 w-24 shrink-0 animate-pulse bg-base-200 print:h-[2.6cm] print:w-[2.6cm]" />
      )}
      <div className="min-w-0">
        <p className="break-all font-mono text-sm font-bold tracking-wide text-base-content print:!text-black">
          {part.partNumber}
        </p>
        <p className="mt-0.5 break-words font-display text-base uppercase leading-tight tracking-wide text-base-content print:!text-black">
          {part.name}
        </p>
        <p className="mt-0.5 break-words text-[11px] leading-snug text-base-content/60 print:!text-gray-700">
          {part.manufacturer}
          {fitmentLine && ` · ${fitmentLine}`}
        </p>
        <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/40 print:!text-gray-500">
          MotoManager · Teil #{part.id}
        </p>
      </div>
    </div>
  );
}
