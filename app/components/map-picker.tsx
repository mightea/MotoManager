import { useEffect, useId, useRef } from "react";
import type L from "leaflet";
// Self-hosted marker assets (bundled by Vite) instead of the unpkg CDN, so the
// picker works offline and under a strict CSP.
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onSelect: (lat: number, lng: number) => void;
  className?: string;
}

const ZURICH: [number, number] = [47.3769, 8.5417];

export function MapPicker({ latitude, longitude, onSelect, className }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletLib = useRef<typeof L | null>(null);
  const onSelectRef = useRef(onSelect);
  // Latest props, read by the async init when it eventually runs so it doesn't
  // anchor the map at a stale center / drop a stale marker.
  const coordsRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: latitude,
    lng: longitude,
  });

  useEffect(() => {
    onSelectRef.current = onSelect;
    coordsRef.current = { lat: latitude, lng: longitude };
  });

  useEffect(() => {
    let isMounted = true;
    let invalidateTimer: ReturnType<typeof setTimeout>;

    async function initMap() {
      if (!mapRef.current || leafletMap.current) return;

      const Leaflet = (await import("leaflet")).default;
      if (!isMounted || !mapRef.current) return;
      leafletLib.current = Leaflet;

      // @ts-ignore — private Leaflet internal; removing it lets mergeOptions win.
      delete Leaflet.Icon.Default.prototype._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });

      const { lat: curLat, lng: curLng } = coordsRef.current;
      const hasCoords = curLat !== null && curLng !== null;
      const start: [number, number] = hasCoords ? [curLat, curLng] : ZURICH;
      const map = Leaflet.map(mapRef.current).setView(start, hasCoords ? 16 : 13);
      leafletMap.current = map;

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (hasCoords) {
        markerRef.current = Leaflet.marker(start).addTo(map);
      }

      invalidateTimer = setTimeout(() => map.invalidateSize(), 100);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else if (leafletLib.current) {
          markerRef.current = leafletLib.current.marker(e.latlng).addTo(map);
        }
        onSelectRef.current(lat, lng);
      });
    }

    void initMap();

    return () => {
      isMounted = false;
      clearTimeout(invalidateTimer);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        leafletLib.current = null;
      }
    };
    // Init once per mount; prop-driven updates happen in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect external coord changes (geolocation button, clearing, opening with stored value).
  // While the async init is still in flight leafletMap.current is null — in that case
  // initMap will pick up the latest values via coordsRef and do the right thing itself.
  useEffect(() => {
    const map = leafletMap.current;
    const Leaflet = leafletLib.current;
    if (!map || !Leaflet) return;

    if (latitude === null || longitude === null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const latLng: [number, number] = [latitude, longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = Leaflet.marker(latLng).addTo(map);
    }
    map.setView(latLng, Math.max(map.getZoom(), 14));
  }, [latitude, longitude]);

  const instructionsId = useId();
  const latId = useId();
  const lngId = useId();

  const commitLat = (value: string) => {
    const lat = parseFloat(value);
    if (Number.isFinite(lat) && longitude !== null) onSelect(lat, longitude);
  };
  const commitLng = (value: string) => {
    const lng = parseFloat(value);
    if (Number.isFinite(lng) && latitude !== null) onSelect(latitude, lng);
  };

  return (
    <div className="space-y-2">
      <p id={instructionsId} className="text-xs text-base-content/65">
        Klicke auf die Karte, um den Standort zu setzen — oder gib die Koordinaten unten ein.
      </p>
      <div
        ref={mapRef}
        role="application"
        aria-label="Standortkarte"
        aria-describedby={instructionsId}
        className={className ?? "h-72 w-full overflow-hidden rounded-sm border border-base-300 shadow-inner dark:border-navy-700"}
        style={{ minHeight: 288 }}
      />
      {/* Keyboard-accessible alternative to clicking the map. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor={latId} className="text-[10px] font-semibold uppercase tracking-wider text-base-content/60">
            Breitengrad
          </label>
          <input
            id={latId}
            type="number"
            step="any"
            inputMode="decimal"
            value={latitude ?? ""}
            onChange={(e) => commitLat(e.target.value)}
            className="block w-full rounded-sm border border-base-300 bg-base-100 p-2 text-sm dark:border-navy-700 dark:bg-navy-800"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={lngId} className="text-[10px] font-semibold uppercase tracking-wider text-base-content/60">
            Längengrad
          </label>
          <input
            id={lngId}
            type="number"
            step="any"
            inputMode="decimal"
            value={longitude ?? ""}
            onChange={(e) => commitLng(e.target.value)}
            className="block w-full rounded-sm border border-base-300 bg-base-100 p-2 text-sm dark:border-navy-700 dark:bg-navy-800"
          />
        </div>
      </div>
    </div>
  );
}
