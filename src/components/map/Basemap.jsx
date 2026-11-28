import { useEffect, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

// Fond de carte vectoriel OpenFreeMap : gratuit, sans clé ni inscription, usage commercial autorisé.
// Style « liberty » : routes en couleur avec leur nom, quartiers, lieux et bâtiments (le style « positron »,
// très pâle, ne montrait presque pas les rues ni les quartiers).
// Si l'appareil ne sait pas afficher de carte vectorielle (WebGL absent), on bascule sur les tuiles OpenStreetMap.
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export const MAP_BG = '#f2efe9';

// Noms en français quand ils existent (le style prend sinon l'anglais en premier) : rues, quartiers, lieux.
const FRENCH_NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];
function applyFrenchLabels(gl) {
  try {
    (gl.getStyle()?.layers || []).forEach((layer) => {
      const field = layer.type === 'symbol' ? layer.layout?.['text-field'] : null;
      if (field && JSON.stringify(field).includes('name')) gl.setLayoutProperty(layer.id, 'text-field', FRENCH_NAME);
    });
  } catch { /* style encore incomplet : les noms d'origine restent affichés */ }
}
const VECTOR_ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const RASTER_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Fond de carte : vectoriel (net à tous les zooms) ou, à défaut, tuiles OpenStreetMap.
export function Basemap({ onReady }) {
  const map = useMap();
  const [raster, setRaster] = useState(() => !webglAvailable());

  useEffect(() => {
    map.attributionControl?.setPrefix(false);
    if (raster) {
      onReady?.();
      return undefined;
    }
    let layer = null;
    let cancelled = false;
    map.attributionControl?.addAttribution(VECTOR_ATTRIBUTION);
    Promise.all([
      import('maplibre-gl'),
      // Le « worker » de MapLibre (calcul des tuiles en arrière-plan) doit être un fichier publié à part
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
      import('@maplibre/maplibre-gl-leaflet'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
      .then(([maplibre, worker, plugin]) => {
        if (cancelled) return;
        maplibre.setWorkerUrl(new URL(worker.default, window.location.href).href);
        layer = plugin.maplibreGL({ style: MAP_STYLE, attributionControl: false, interactive: false });
        layer.addTo(map);
        const gl = layer.getMaplibreMap();
        let loaded = false;
        gl.once('load', () => {
          loaded = true;
          applyFrenchLabels(gl);
          onReady?.();
        });
        // Style introuvable (réseau coupé, service indisponible) : tuiles classiques
        gl.on('error', () => {
          if (!loaded && !cancelled) setRaster(true);
        });
      })
      .catch(() => {
        if (!cancelled) setRaster(true);
      });
    return () => {
      cancelled = true;
      map.attributionControl?.removeAttribution(VECTOR_ATTRIBUTION);
      if (layer) map.removeLayer(layer);
    };
  }, [map, raster, onReady]);

  if (!raster) return null;
  return <TileLayer attribution={RASTER_ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />;
}
