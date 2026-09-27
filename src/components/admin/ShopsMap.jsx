import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, ExternalLink, Eye } from 'lucide-react';
import { DAKAR_CENTER } from './geo';

export const PLAN_META = {
  debutant: { label: 'Débutant', color: '#2a78d6' },
  pro: { label: 'Pro', color: '#4a3aa7' },
  premium: { label: 'Premium', color: '#eb6834' },
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Épingle personnalisée : couleur du forfait, initiale de la boutique, halo si sélectionnée.
function pinIcon(merchant, selected) {
  const color = merchant.is_suspended ? '#94a3b8' : (PLAN_META[merchant.subscription_plan] || PLAN_META.debutant).color;
  const initial = escapeHtml((merchant.shop_name || '?').trim().charAt(0).toUpperCase());
  return L.divIcon({
    className: '',
    html: `<div class="shop-pin${selected ? ' is-selected' : ''}" style="--pin:${color}"><span>${initial}</span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -40],
  });
}

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function FlyToSelected({ merchant }) {
  const map = useMap();
  useEffect(() => {
    if (merchant?.latitude != null) {
      map.flyTo([merchant.latitude, merchant.longitude], Math.max(map.getZoom(), 15), { duration: 1.2 });
    }
  }, [map, merchant]);
  return null;
}

export default function ShopsMap({ merchants, selectedId, onSelect, onOpenDetails, height = 520, className = '', interactive = true }) {
  const located = useMemo(() => merchants.filter((m) => m.latitude != null && m.longitude != null), [merchants]);
  const points = useMemo(() => located.map((m) => [m.latitude, m.longitude]), [located]);
  const selected = located.find((m) => m.id === selectedId) || null;

  return (
    <div className={`relative isolate overflow-hidden rounded-3xl ring-1 ring-slate-200 ${className}`} style={{ height }}>
      <MapContainer
        center={DAKAR_CENTER}
        zoom={11}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="h-full w-full"
        style={{ background: '#e5eef0' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToMarkers points={points} />
        {selected && <FlyToSelected merchant={selected} />}
        {selected?.location_accuracy_m > 0 && (
          <Circle center={[selected.latitude, selected.longitude]} radius={selected.location_accuracy_m} pathOptions={{ color: '#059669', fillColor: '#34d399', fillOpacity: 0.15, weight: 1 }} />
        )}
        {located.map((m) => (
          <Marker
            key={m.id}
            position={[m.latitude, m.longitude]}
            icon={pinIcon(m, m.id === selectedId)}
            eventHandlers={{ click: () => onSelect?.(m) }}
          >
            <Popup>
              <div className="min-w-[200px] font-sans">
                <p className="text-sm font-bold text-slate-900">{m.shop_name}</p>
                <p className="mb-2 text-xs text-slate-500">
                  {(PLAN_META[m.subscription_plan] || PLAN_META.debutant).label}
                  {m.city ? ` · ${m.city}` : ''}
                  {m.is_suspended ? ' · Suspendue' : ''}
                </p>
                {m.phone_number && (
                  <a href={`tel:${m.phone_number}`} className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Phone className="h-3 w-3" /> {m.phone_number}
                  </a>
                )}
                <div className="mt-2 flex gap-1.5">
                  {onOpenDetails && (
                    <button onClick={() => onOpenDetails(m)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-bold text-white">
                      <Eye className="h-3 w-3" /> Fiche
                    </button>
                  )}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${m.latitude},${m.longitude}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-700">
                    <ExternalLink className="h-3 w-3" /> Itinéraire
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {located.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <p className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-lg">Aucune boutique localisée pour le moment</p>
        </div>
      )}
    </div>
  );
}
