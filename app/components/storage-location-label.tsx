import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { StorageLocation } from "~/types/parts";
import { storageLocationPath } from "~/utils/parts";

/** Generate a QR code data URL for arbitrary text (client-side, no network). */
export function useQrDataUrl(text: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setUrl(null);
      return;
    }
    let active = true;
    QRCode.toDataURL(text, { margin: 1, width: 512, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (active) setUrl(dataUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [text]);

  return url;
}

/** The absolute URL a printed label points at — the location's detail page. */
export function storageLocationUrl(locationId: number): string {
  return `${window.location.origin}/storage-locations/${locationId}`;
}

interface StorageLocationLabelProps {
  location: StorageLocation;
  allLocations: StorageLocation[];
  /** Physical place (garage/workshop) shown as path prefix on the label. */
  placeName?: string | null;
}

/**
 * A printable label: QR code linking to the location's page plus the location
 * name and its full path. Sized for sticking on shelves and bins; the dashed
 * border doubles as a cutting guide.
 */
export function StorageLocationLabel({
  location,
  allLocations,
  placeName,
}: StorageLocationLabelProps) {
  const qrUrl = useQrDataUrl(storageLocationUrl(location.id));
  const rawPath = storageLocationPath(location, allLocations);
  const path = placeName ? `${placeName} › ${rawPath}` : rawPath;

  return (
    <div className="flex items-center gap-3 border border-dashed border-base-content/30 p-3 print:break-inside-avoid print:border-gray-400">
      {qrUrl ? (
        <img
          src={qrUrl}
          alt={`QR-Code für ${location.name}`}
          className="h-24 w-24 shrink-0 print:h-[2.6cm] print:w-[2.6cm]"
        />
      ) : (
        <div className="h-24 w-24 shrink-0 animate-pulse bg-base-200 print:h-[2.6cm] print:w-[2.6cm]" />
      )}
      <div className="min-w-0">
        <p className="break-words font-display text-base uppercase leading-tight tracking-wide text-base-content print:!text-black">
          {location.name}
        </p>
        {path !== location.name && (
          <p className="mt-0.5 break-words text-[11px] leading-snug text-base-content/60 print:!text-gray-700">
            {path}
          </p>
        )}
        <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-base-content/40 print:!text-gray-500">
          MotoManager · Lagerort #{location.id}
        </p>
      </div>
    </div>
  );
}
