import { useEffect, useRef } from "react";
import type L from "leaflet";
import clsx from "clsx";
import { addOsmTiles, loadLeaflet } from "~/utils/leaflet.client";
import {
  computeBounds,
  drawableLegs,
  formatDate,
  LOCATION_TYPE_LABELS,
  round1,
  visiblePoints,
  type HeatPoint,
} from "~/utils/map-analysis";
import { formatCurrency, formatNumber } from "~/utils/numberUtils";
import type { LocationType } from "~/types/db";
import type { LatLon, MapHome, MapLeg, MapLocation, MapMotorcycle } from "~/types/map";

export interface MapLayerVisibility {
  workshops: boolean;
  inspections: boolean;
  storage: boolean;
  other: boolean;
  fuelHeat: boolean;
  legs: boolean;
}

export const DEFAULT_LAYERS: MapLayerVisibility = {
  workshops: true,
  inspections: true,
  storage: true,
  other: false,
  fuelHeat: true,
  legs: true,
};

interface FleetMapProps {
  locations: MapLocation[];
  legs: MapLeg[];
  heatPoints: HeatPoint[];
  home: MapHome | null;
  motorcycles: MapMotorcycle[];
  motorcycleColors: Map<number, string>;
  layers: MapLayerVisibility;
  /** Per-location fuel numbers under the current filter, for popups. */
  fuelOf: (loc: MapLocation) => { fuelStops: number; liters: number };
  onEditLocation?: (locationId: number) => void;
  /** Changes whenever the map should re-fit to its content (e.g. the filter). */
  fitKey: string;
  className?: string;
  /** Tab-stop etc. are kept; this only hides the layer legend. */
  compact?: boolean;
}

/** Warm single-hue sequential ramp for the fuel-stop heat layer. */
const HEAT_GRADIENT: Record<number, string> = {
  0.15: "#F2C277",
  0.4: "#E8A341",
  0.7: "#FF4124",
  1: "#8A1A0E",
};

const TYPE_STYLE: Record<LocationType, { color: string; glyph: string; label: string }> = {
  maintenanceShop: { color: "#E8A341", glyph: "wrench", label: LOCATION_TYPE_LABELS.maintenanceShop },
  inspection: { color: "#5B1D7A", glyph: "check", label: LOCATION_TYPE_LABELS.inspection },
  storage: { color: "#64748b", glyph: "garage", label: LOCATION_TYPE_LABELS.storage },
  other: { color: "#94a3b8", glyph: "dot", label: LOCATION_TYPE_LABELS.other },
  fuelStation: { color: "#FF4124", glyph: "fuel", label: LOCATION_TYPE_LABELS.fuelStation },
};

const GLYPH_PATHS: Record<string, string> = {
  wrench:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  check: "M20 6 9 17l-5-5",
  garage: "M3 21V10l9-7 9 7v11M7 21v-7h10v7",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  fuel: "M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M6 9h6M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0v-7l-3-3",
  home: "M3 10.5 12 3l9 7.5V21H3z",
};

function glyphSvg(glyph: string, color: string, size: number): string {
  const path = GLYPH_PATHS[glyph] ?? GLYPH_PATHS.dot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

function markerHtml(type: LocationType, isHome: boolean): string {
  const style = TYPE_STYLE[type];
  const color = isHome ? "#1E5BFF" : style.color;
  const glyph = isHome ? "home" : style.glyph;
  return `<span class="fleet-marker" style="--marker-color:${color}">${glyphSvg(glyph, "#ffffff", 13)}</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function layerVisibleFor(type: LocationType, layers: MapLayerVisibility): boolean {
  switch (type) {
    case "maintenanceShop":
      return layers.workshops;
    case "inspection":
      return layers.inspections;
    case "storage":
      return layers.storage;
    case "other":
      return layers.other;
    case "fuelStation":
      return false;
  }
}

/**
 * The fleet map: OSM tiles, typed location markers, a fuel-stop heat layer
 * and straight-line legs between consecutive fuel stops. Leaflet is loaded
 * lazily; every prop change rebuilds the overlay layers in place.
 */
export function FleetMap({
  locations,
  legs,
  heatPoints,
  home,
  motorcycles,
  motorcycleColors,
  layers,
  fuelOf,
  onEditLocation,
  fitKey,
  className,
  compact = false,
}: FleetMapProps) {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const overlaysRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.HeatLayer | null>(null);
  const readyRef = useRef(false);
  const lastFitKey = useRef<string | null>(null);
  const onEditRef = useRef(onEditLocation);
  const renderRef = useRef<() => void>(() => {});

  useEffect(() => {
    onEditRef.current = onEditLocation;
  });

  // Bootstrap once per mount.
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const Leaflet = await loadLeaflet();
      await import("leaflet.heat");
      if (!mounted || !containerRef.current) return;
      leafletRef.current = Leaflet;

      const map = Leaflet.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView([47.3769, 8.5417], 7);
      mapRef.current = map;
      addOsmTiles(Leaflet, map);
      overlaysRef.current = Leaflet.layerGroup().addTo(map);
      readyRef.current = true;
      timer = setTimeout(() => {
        map.invalidateSize();
        renderRef.current();
      }, 60);
    }

    void init();

    return () => {
      mounted = false;
      clearTimeout(timer);
      readyRef.current = false;
      heatRef.current = null;
      overlaysRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
    };
  }, []);

  // Rebuild overlays whenever the data or layer toggles change.
  useEffect(() => {
    const render = () => {
      const Leaflet = leafletRef.current;
      const map = mapRef.current;
      const overlays = overlaysRef.current;
      if (!Leaflet || !map || !overlays || !readyRef.current) return;

      overlays.clearLayers();
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }

      const bikeName = new Map(motorcycles.map((m) => [m.id, `${m.make} ${m.model}`]));

      // Legs first so markers sit on top.
      if (layers.legs) {
        for (const leg of drawableLegs(legs)) {
          const color = motorcycleColors.get(leg.motorcycleId) ?? "#2a78d6";
          const line = Leaflet.polyline(
            [
              [leg.from.latitude, leg.from.longitude],
              [leg.to.latitude, leg.to.longitude],
            ],
            { color, weight: 2, opacity: 0.75, lineCap: "round" },
          );
          const consumption = leg.consumption === null ? "–" : `${formatNumber(leg.consumption, 2)} l/100 km`;
          line.bindPopup(
            `<div class="fleet-popup">
              <div class="fleet-popup__title" style="--series:${color}">${escapeHtml(bikeName.get(leg.motorcycleId) ?? "Etappe")}</div>
              <dl class="fleet-popup__grid">
                <dt>Zeitraum</dt><dd>${formatDate(leg.startDate)} – ${formatDate(leg.endDate)}</dd>
                <dt>Distanz</dt><dd>${formatNumber(leg.distanceKm)} km</dd>
                <dt>Luftlinie</dt><dd>${leg.straightKm === null ? "–" : `${formatNumber(round1(leg.straightKm), 1)} km`}</dd>
                <dt>Getankt</dt><dd>${leg.liters === null ? "–" : `${formatNumber(leg.liters, 1)} l`}</dd>
                <dt>Verbrauch</dt><dd>${consumption}</dd>
              </dl>
            </div>`,
          );
          overlays.addLayer(line);
        }
      }

      if (layers.fuelHeat && heatPoints.length > 0) {
        heatRef.current = Leaflet.heatLayer(heatPoints, {
          radius: 24,
          blur: 18,
          max: 1,
          minOpacity: 0.35,
          gradient: HEAT_GRADIENT,
        }).addTo(map);
      }

      for (const loc of locations) {
        const isHome = home?.locationId === loc.id;
        if (!isHome && !layerVisibleFor(loc.type, layers)) continue;
        const icon = Leaflet.divIcon({
          className: "fleet-marker-wrap",
          html: markerHtml(loc.type, isHome),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -12],
        });
        const marker = Leaflet.marker([loc.latitude, loc.longitude], {
          icon,
          title: loc.name,
          keyboard: true,
          zIndexOffset: isHome ? 1000 : 0,
        });
        marker.bindPopup(() => buildLocationPopup(loc, isHome, fuelOf(loc), onEditRef.current));
        overlays.addLayer(marker);
      }

      if (home && !locations.some((l) => l.id === home.locationId)) {
        const icon = Leaflet.divIcon({
          className: "fleet-marker-wrap",
          html: markerHtml("storage", true),
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        overlays.addLayer(Leaflet.marker([home.latitude, home.longitude], { icon, title: "Zuhause" }));
      }

      if (lastFitKey.current !== fitKey) {
        lastFitKey.current = fitKey;
        const homePoint: LatLon | null = home ? { latitude: home.latitude, longitude: home.longitude } : null;
        const bounds = computeBounds(visiblePoints(locations, legs, homePoint));
        if (bounds) {
          map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
        }
      }
    };

    renderRef.current = render;
    render();
  }, [locations, legs, heatPoints, home, motorcycles, motorcycleColors, layers, fuelOf, fitKey]);

  return (
    <div className={clsx("relative", className)}>
      <section
        ref={containerRef}
        aria-label="Karte aller Standorte, Tankstopps und Etappen"
        className="fleet-map h-full w-full"
      />
      {!compact && (
        <div className="pointer-events-none absolute bottom-7 left-2 z-[400] flex flex-wrap gap-x-3 gap-y-1 rounded-sm bg-base-100/90 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/70 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur dark:bg-navy-900/85 dark:text-navy-300">
          {layers.fuelHeat && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-sm" style={{ background: "linear-gradient(90deg,#F2C277,#E8A341,#FF4124,#8A1A0E)" }} />
              Tankstopps
            </span>
          )}
          {layers.workshops && <LegendDot color={TYPE_STYLE.maintenanceShop.color} label={TYPE_STYLE.maintenanceShop.label} />}
          {layers.inspections && <LegendDot color={TYPE_STYLE.inspection.color} label={TYPE_STYLE.inspection.label} />}
          {layers.storage && <LegendDot color={TYPE_STYLE.storage.color} label={TYPE_STYLE.storage.label} />}
          {layers.other && <LegendDot color={TYPE_STYLE.other.color} label={TYPE_STYLE.other.label} />}
          {home && <LegendDot color="#1E5BFF" label="Zuhause" />}
          {layers.legs &&
            motorcycles.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-sm" style={{ background: motorcycleColors.get(m.id) }} />
                {m.make} {m.model}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function buildLocationPopup(
  loc: MapLocation,
  isHome: boolean,
  fuel: { fuelStops: number; liters: number },
  onEdit: ((id: number) => void) | undefined,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "fleet-popup";
  const rows: [string, string][] = [];
  if (fuel.fuelStops > 0) {
    rows.push(["Tankstopps", `${fuel.fuelStops} · ${formatNumber(fuel.liters, 1)} l`]);
    if (loc.fuelCost > 0) rows.push(["Spritkosten", formatCurrency(loc.fuelCost)]);
  }
  if (loc.maintenanceVisits > 0) {
    rows.push(["Werkstattbesuche", String(loc.maintenanceVisits)]);
    if (loc.maintenanceCost > 0) rows.push(["Kosten", formatCurrency(loc.maintenanceCost)]);
  }
  if (loc.parkedVisits > 0) rows.push(["Abgestellt", `${loc.parkedVisits}×`]);
  if (loc.lastVisit) rows.push(["Zuletzt", formatDate(loc.lastVisit)]);
  if (loc.distanceFromHomeKm !== null && !isHome) {
    rows.push(["Von Zuhause", `${formatNumber(round1(loc.distanceFromHomeKm), 1)} km`]);
  }
  if (loc.countryCode) rows.push(["Land", loc.countryCode]);

  root.innerHTML = `
    <div class="fleet-popup__title" style="--series:${isHome ? "#1E5BFF" : TYPE_STYLE[loc.type].color}">${escapeHtml(loc.name)}</div>
    <div class="fleet-popup__kind">${isHome ? "Zuhause · " : ""}${TYPE_STYLE[loc.type].label}</div>
    <dl class="fleet-popup__grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>
  `;

  if (onEdit) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fleet-popup__edit";
    button.textContent = "Standort bearbeiten";
    button.addEventListener("click", () => onEdit(loc.id));
    root.appendChild(button);
  }
  return root;
}
