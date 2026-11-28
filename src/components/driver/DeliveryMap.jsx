import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUp, ArrowUpLeft, ArrowUpRight, ChevronDown, CornerUpLeft, CornerUpRight, Flag, Navigation2, RotateCw, Undo2, Route as RouteIcon, Timer } from 'lucide-react';
import { Navigation } from '../dashboard/icons';
import { Basemap, MAP_BG } from '../map/Basemap';
import { distanceKm } from '../admin/geo';
import { openExternal } from '../../utils/links';
import { useRoute } from '../../utils/route';

const destinationIcon = L.divIcon({ className: '', html: '<div class="dest-pin"><span>🏠</span></div>', iconSize: [40, 40], iconAnchor: [20, 40] });
const courierIcon = L.divIcon({ className: '', html: '<div class="courier-marker"><span>🛵</span></div>', iconSize: [48, 48], iconAnchor: [24, 24] });

const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
const STEP_ICONS = {
  start: Navigation2, arrive: Flag, right: CornerUpRight, left: CornerUpLeft, 'slight-right': ArrowUpRight,
  'slight-left': ArrowUpLeft, 'u-turn': Undo2, roundabout: RotateCw, straight: ArrowUp,
};

// Cadrage : la destination seule, puis l'itinéraire (ou livreur + destination) une seule fois,
// pour ne pas reprendre la main si le livreur déplace la carte.
function Frame({ destination, courier, coords }) {
  const map = useMap();
  const framed = useRef('');
  useEffect(() => {
    if (coords?.length > 1 && framed.current !== 'route') {
      framed.current = 'route';
      // Marges : le haut garde la place des boutons, le bas celle du bandeau « prochaine étape »
      map.fitBounds(L.latLngBounds(coords), { paddingTopLeft: [36, 64], paddingBottomRight: [36, 112], maxZoom: 16 });
    } else if (courier && !framed.current) {
      framed.current = 'courier';
      map.fitBounds(L.latLngBounds([courier, destination]), { padding: [48, 48], maxZoom: 16 });
    } else if (!courier && !framed.current) {
      map.setView(destination, 16);
    }
  }, [map, destination, courier, coords]);
  return null;
}

// Carte de la course en cours : maison du client, position du livreur, itinéraire par la route
// (rues et étapes en français) et guidage dans l'application de navigation du téléphone.
export default function DeliveryMap({ destination, courier, directionsUrl }) {
  const dest = useMemo(() => [destination.lat, destination.lng], [destination.lat, destination.lng]);
  const me = useMemo(() => (courier ? [courier.lat, courier.lng] : null), [courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const { route } = useRoute(me, dest);
  const [showSteps, setShowSteps] = useState(false);
  const crowKm = me ? distanceKm(me[0], me[1], dest[0], dest[1]) : null;
  // Prochaine étape : la première manœuvre après le départ, et la distance pour y arriver
  const next = route?.steps?.length > 1 ? route.steps[1] : null;
  const NextIcon = next ? STEP_ICONS[next.kind] || ArrowUp : null;

  return (
    <div>
      <div className="delivery-map relative isolate h-80 overflow-hidden" style={{ background: MAP_BG }}>
        <MapContainer center={dest} zoom={16} zoomControl={false} scrollWheelZoom={false} attributionControl className="h-full w-full" style={{ background: MAP_BG }}>
          <Basemap />
          <Frame destination={dest} courier={me} coords={route?.coords} />
          {route ? (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
              <Polyline positions={route.coords} pathOptions={{ color: '#4f3fe0', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
            </>
          ) : me ? (
            <Polyline positions={[me, dest]} pathOptions={{ color: '#7c6cf2', weight: 3, dashArray: '6 8', opacity: 0.8 }} />
          ) : null}
          <Marker position={dest} icon={destinationIcon} />
          {me && <Marker position={me} icon={courierIcon} zIndexOffset={500} />}
        </MapContainer>

        {route ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[400] inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-md">
            <RouteIcon className="h-3.5 w-3.5 text-brand-600" /> {formatKm(route.km)}
            <span className="h-3 w-px bg-stone-200" />
            <Timer className="h-3.5 w-3.5 text-amber-600" /> {route.minutes} min
          </span>
        ) : crowKm != null ? (
          <span className="pointer-events-none absolute left-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-md">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> {formatKm(crowKm)} à vol d’oiseau
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => openExternal(directionsUrl)}
          className="absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-brand-800"
        >
          <Navigation className="h-4 w-4" /> Lancer le guidage
        </button>

        {/* Prochaine étape : flèche, consigne et nom de la rue */}
        {next ? (
          <div className="absolute inset-x-3 bottom-7 z-[400] flex items-center gap-3 rounded-2xl bg-ink/90 p-3 text-white shadow-xl backdrop-blur">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-ink">
              <NextIcon className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-200">Dans {formatKm(route.steps[0].km)}</span>
              <span className="block text-sm font-bold leading-snug">{next.text}</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* Toutes les étapes de l'itinéraire */}
      {route?.steps?.length > 2 ? (
        <div className="border-t border-[#efece4] bg-white">
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            aria-expanded={showSteps}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-ink"
          >
            <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4 text-brand-600" /> Itinéraire détaillé · {route.steps.length} étapes</span>
            <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
          </button>
          {showSteps ? (
            <ol className="max-h-72 space-y-1 overflow-y-auto px-4 pb-4">
              {route.steps.map((step, i) => {
                const Icon = STEP_ICONS[step.kind] || ArrowUp;
                return (
                  <li key={`${i}-${step.text}`} className="flex items-start gap-3 rounded-xl px-2 py-2 odd:bg-[#faf9f6]">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.kind === 'arrive' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700'}`}>
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-ink">{step.text}</span>
                      {step.km > 0 ? <span className="block text-xs text-stone-500">{formatKm(step.km)}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
