import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from '../dashboard/icons';
import { Basemap, MAP_BG } from '../map/Basemap';
import { distanceKm } from '../admin/geo';
import { openExternal } from '../../utils/links';

const destinationIcon = L.divIcon({ className: '', html: '<div class="dest-pin"><span>🏠</span></div>', iconSize: [40, 40], iconAnchor: [20, 40] });
const courierIcon = L.divIcon({ className: '', html: '<div class="courier-marker"><span>🛵</span></div>', iconSize: [48, 48], iconAnchor: [24, 24] });

const formatKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

// Cadrage : la destination seule, puis livreur + destination dès que le GPS répond (une seule fois,
// pour ne pas reprendre la main si le livreur déplace la carte).
function Frame({ destination, courier }) {
  const map = useMap();
  const framedWithCourier = useRef(false);
  useEffect(() => {
    if (courier && !framedWithCourier.current) {
      framedWithCourier.current = true;
      map.fitBounds(L.latLngBounds([courier, destination]), { padding: [40, 40], maxZoom: 16 });
    } else if (!courier) {
      map.setView(destination, 16);
    }
  }, [map, destination, courier]);
  return null;
}

// Carte de la course en cours : maison du client, position du livreur, distance et guidage.
export default function DeliveryMap({ destination, courier, directionsUrl }) {
  const dest = useMemo(() => [destination.lat, destination.lng], [destination.lat, destination.lng]);
  const me = useMemo(() => (courier ? [courier.lat, courier.lng] : null), [courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const km = me ? distanceKm(me[0], me[1], dest[0], dest[1]) : null;

  return (
    <div className="delivery-map relative isolate h-44 overflow-hidden" style={{ background: MAP_BG }}>
      <MapContainer center={dest} zoom={16} zoomControl={false} scrollWheelZoom={false} attributionControl className="h-full w-full" style={{ background: MAP_BG }}>
        <Basemap />
        <Frame destination={dest} courier={me} />
        {me && <Polyline positions={[me, dest]} pathOptions={{ color: '#7c6cf2', weight: 3, dashArray: '6 8', opacity: 0.8 }} />}
        <Marker position={dest} icon={destinationIcon} />
        {me && <Marker position={me} icon={courierIcon} zIndexOffset={500} />}
      </MapContainer>

      {km != null && (
        <span className="pointer-events-none absolute left-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-md">
          <span className="h-2 w-2 rounded-full bg-brand-500" /> {formatKm(km)} à vol d’oiseau
        </span>
      )}
      <button
        type="button"
        onClick={() => openExternal(directionsUrl)}
        className="absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-brand-800"
      >
        <Navigation className="h-4 w-4" /> Lancer le guidage
      </button>
    </div>
  );
}
