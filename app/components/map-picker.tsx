import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";
import { Check, MapPin } from "lucide-react";
import type L from "leaflet";

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

export function MapPicker({ isOpen, onClose, onSelect, initialLat, initialLng }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!isOpen || !mapRef.current || leafletMap.current) return;

      // Dynamically import Leaflet only on the client
      const Leaflet = (await import("leaflet")).default;
      try {
        await import("leaflet/dist/leaflet.css");
      } catch {
        // CSS import might fail in some SSR environments, but we only need it on client
      }

      if (!isMounted || !mapRef.current) return;

      // Fix for default marker icons in Leaflet with Vite
      // @ts-ignore
      delete Leaflet.Icon.Default.prototype._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const startLat = initialLat || 47.3769; // Zurich default
      const startLng = initialLng || 8.5417;
      const startZoom = initialLat && initialLng ? 16 : 13;

      leafletMap.current = Leaflet.map(mapRef.current).setView([startLat, startLng], startZoom);

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap.current);

      if (initialLat && initialLng) {
        markerRef.current = Leaflet.marker([initialLat, initialLng]).addTo(leafletMap.current);
      }

      leafletMap.current.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCurrentPos({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else if (leafletMap.current) {
          markerRef.current = Leaflet.marker(e.latlng).addTo(leafletMap.current);
        }
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  const handleConfirm = () => {
    if (currentPos) {
      onSelect(currentPos.lat, currentPos.lng);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Standort auf Karte wählen"
      description="Klicke auf die Karte, um die Position der Tankstelle festzulegen."
    >
      <div className="space-y-4">
        <div 
          ref={mapRef} 
          className="h-96 w-full rounded-xl border border-gray-200 shadow-inner dark:border-navy-600"
          style={{ zIndex: 1 }}
        ></div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-secondary dark:text-navy-400">
            {currentPos ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {currentPos.lat.toFixed(6)}, {currentPos.lng.toFixed(6)}
              </span>
            ) : (
              "Keine Position gewählt"
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100 dark:text-navy-300 dark:hover:bg-navy-700"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!currentPos}
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Position übernehmen
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
