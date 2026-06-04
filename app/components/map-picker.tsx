import { useEffect, useRef } from "react";
import type L from "leaflet";

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

      // @ts-ignore
      delete Leaflet.Icon.Default.prototype._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

  return (
    <div
      ref={mapRef}
      className={className ?? "h-72 w-full overflow-hidden rounded-sm border border-base-300 shadow-inner dark:border-navy-700"}
      style={{ minHeight: 288 }}
    />
  );
}
