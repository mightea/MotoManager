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
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);

  // Sync currentPos when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setCurrentPos(initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null);
    }
  }, [isOpen, initialLat, initialLng]);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function initMap() {
      if (!isOpen || !mapRef.current) return;

      // Ensure cleanup of previous instance if it exists
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }

      // Dynamically import Leaflet only on the client
      const Leaflet = (await import("leaflet")).default;

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

      const map = Leaflet.map(mapRef.current).setView([startLat, startLng], startZoom);
      leafletMap.current = map;

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (initialLat && initialLng) {
        markerRef.current = Leaflet.marker([initialLat, initialLng]).addTo(map);
      }

      // Use a slightly longer delay and repeat invalidateSize to handle modal transitions
      timer = setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 250);

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCurrentPos({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = Leaflet.marker(e.latlng).addTo(map);
        }
      });
    }

    const initTimer = isOpen ? setTimeout(initMap, 50) : null;

    return () => {
      isMounted = false;
      if (initTimer) clearTimeout(initTimer);
      clearTimeout(timer);
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
          className="h-96 w-full rounded-xl border border-gray-200 shadow-inner dark:border-navy-600 relative overflow-hidden"
          style={{ minHeight: '384px' }}
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
