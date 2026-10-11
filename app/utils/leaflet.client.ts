import type L from "leaflet";
// Self-hosted marker assets (bundled by Vite) instead of the unpkg CDN, so maps
// work offline and under a strict CSP.
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/** OpenStreetMap standard tiles. The attribution is a usage-policy requirement. */
export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let leafletPromise: Promise<typeof L> | null = null;

/**
 * Loads Leaflet lazily (it touches `window` at import time, so it can't be a
 * static import in SPA code paths that also run in tests) and patches the
 * default marker icon to the bundled assets exactly once.
 */
export function loadLeaflet(): Promise<typeof L> {
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then((mod) => {
      const Leaflet = mod.default;
      // @ts-ignore — private Leaflet internal; removing it lets mergeOptions win.
      delete Leaflet.Icon.Default.prototype._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });
      return Leaflet;
    });
  }
  return leafletPromise;
}

/** Adds the OSM base layer to a map. */
export function addOsmTiles(Leaflet: typeof L, map: L.Map): L.TileLayer {
  return Leaflet.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
}
