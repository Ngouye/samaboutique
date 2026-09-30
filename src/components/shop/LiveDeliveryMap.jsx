import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Radio, Timer, Route, WifiOff } from 'lucide-react';

// Distance à vol d'oiseau en km.
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Position GPS partagée par le client à la commande (lien Google Maps ajouté à l'adresse).
function destinationFromAddress(address) {
  const match = /query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(String(address || ''));
  return match ? [Number(match[1]), Number(match[2])] : null;
}

const courierIcon = (heading) => L.divIcon({
  className: '',
  html: `<div class="courier-marker">${heading != null ? `<span class="courier-arrow" style="transform: rotate(${Math.round(heading)}deg)"></span>` : ''}<span>🛵</span></div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});
const destinationIcon = L.divIcon({ className: '', html: '<div class="dest-pin"><span>🏠</span></div>', iconSize: [40, 40], iconAnchor: [20, 40] });

// Le livreur glisse en douceur d'une position à la suivante au lieu de sauter.
function useGlide(target, duration = 1500) {
  const [pos, setPos] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (!target) return undefined;
    const from = fromRef.current || target;
    const start = performance.now();
    let frame;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      const next = [from[0] + (target[0] - from[0]) * ease, from[1] + (target[1] - from[1]) * ease];
      fromRef.current = next;
      setPos(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target?.[0], target?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return pos;
}

function FollowCourier({ courier, destination }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!courier) return;
    if (!fittedRef.current && destination) {
      map.fitBounds(L.latLngBounds([courier, destination]), { padding: [60, 60], maxZoom: 16 });
      fittedRef.current = true;
    } else if (!fittedRef.current) {
      map.setView(courier, 15);
      fittedRef.current = true;
    } else if (!map.getBounds().pad(-0.15).contains(courier)) {
      map.panTo(courier, { animate: true, duration: 1 });
    }
  }, [map, courier, destination]);
  return null;
}

const since = (iso, now) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  return `il y a ${Math.round(s / 60)} min`;
};

export default function LiveDeliveryMap({ position, address, themeColor }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => (position ? [position.lat, position.lng] : null), [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const courier = useGlide(target);
  const destination = useMemo(() => destinationFromAddress(address), [address]);
  const trail = useMemo(() => (Array.isArray(position?.trail) ? position.trail.map(([lat, lng]) => [Number(lat), Number(lng)]) : []), [position]);

  const stale = position ? now - new Date(position.updated_at).getTime() > 2 * 60000 : true;
  // Estimation : trajet réel ≈ 1,3 × vol d'oiseau, 22 km/h en moyenne en ville (moto).
  const remainingKm = courier && destination ? distanceKm(courier, destination) * 1.3 : null;
  const etaMin = remainingKm != null ? Math.max(1, Math.round((remainingKm / 22) * 60)) : null;

  if (!position) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
          <Radio className="h-5 w-5 text-slate-400" />
        </span>
        <p>La position du livreur apparaîtra ici dès qu'il l'aura activée sur son téléphone.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 overflow-hidden rounded-3xl ring-1 ring-slate-200">
      <div className="relative isolate h-72 md:h-80" style={{ '--shop': themeColor || '#059669' }}>
        <MapContainer center={target} zoom={15} scrollWheelZoom={false} className="h-full w-full" style={{ background: '#e5eef0' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <FollowCourier courier={courier} destination={destination} />
          {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: themeColor || '#059669', weight: 4, opacity: 0.55, dashArray: '2 8', lineCap: 'round' }} />}
          {destination && courier && <Polyline positions={[courier, destination]} pathOptions={{ color: '#64748b', weight: 2, opacity: 0.5, dashArray: '6 8' }} />}
          {destination && <Marker position={destination} icon={destinationIcon} />}
          {courier && <Marker position={courier} icon={courierIcon(position.heading)} zIndexOffset={1000} />}
        </MapContainer>
        <div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-lg backdrop-blur">
          {stale ? (
            <><WifiOff className="h-3.5 w-3.5 text-amber-500" /> Signal perdu · {since(position.updated_at, now)}</>
          ) : (
            <><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span> En direct · {since(position.updated_at, now)}</>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100 bg-white">
        <div className="flex items-center gap-3 p-4">
          <Timer className="h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Arrivée estimée</p>
            <p className="text-lg font-extrabold text-slate-900">{etaMin != null ? `~ ${etaMin} min` : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Route className="h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Distance</p>
            <p className="text-lg font-extrabold text-slate-900">{remainingKm != null ? `${remainingKm < 1 ? `${Math.round(remainingKm * 1000)} m` : `${remainingKm.toFixed(1).replace('.', ',')} km`}` : 'Adresse sans GPS'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
