import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { DAKAR_CENTER } from '../admin/geo';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#059669');
const safeUrl = (u) => (/^https:\/\/[^\s"'()<>]+$/i.test(u || '') ? u : null);

// Épingle : logo de la boutique (ou son initiale) dans un médaillon à sa couleur.
function logoIcon(shop, selected) {
  const logo = safeUrl(shop.logo_url);
  const initial = escapeHtml((shop.shop_name || '?').trim().charAt(0).toUpperCase());
  return L.divIcon({
    className: '',
    html: `<div class="logo-pin${shop.featured ? ' is-featured' : ''}${selected ? ' is-selected' : ''}" style="--pin:${safeColor(shop.theme_color)};${logo ? `background-image:url('${logo}')` : ''}">${logo ? '' : initial}</div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 55],
    popupAnchor: [0, -52],
  });
}
const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

function Fit({ points, me }) {
  const map = useMap();
  useEffect(() => {
    if (me) {
      const near = points.filter((p) => map.distance(p, me) < 15000);
      map.fitBounds(L.latLngBounds([me, ...near.slice(0, 20)]), { padding: [50, 50], maxZoom: 15 });
    } else if (points.length === 1) map.setView(points[0], 14);
    else if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
  }, [map, points, me]);
  return null;
}

// Carte affichée après coup (onglet « Carte » sur mobile) : Leaflet doit recalculer sa taille.
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FlyTo({ shop }) {
  const map = useMap();
  useEffect(() => {
    if (shop) map.flyTo([shop.latitude, shop.longitude], Math.max(map.getZoom(), 15), { duration: 1 });
  }, [map, shop]);
  return null;
}

export default function DirectoryMap({ shops, me, selected, onSelect, className = '' }) {
  const points = useMemo(() => shops.map((s) => [s.latitude, s.longitude]), [shops]);
  return (
    <div className={`relative isolate overflow-hidden rounded-[2rem] ring-1 ring-white/10 ${className}`}>
      <MapContainer center={DAKAR_CENTER} zoom={12} scrollWheelZoom className="h-full w-full" style={{ background: '#dfe9e6' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <KeepSized />
        <Fit points={points} me={me} />
        <FlyTo shop={selected} />
        {me && <Marker position={me} icon={meIcon} zIndexOffset={2000} />}
        {shops.map((shop) => (
          <Marker
            key={shop.shop_name}
            position={[shop.latitude, shop.longitude]}
            icon={logoIcon(shop, selected?.shop_name === shop.shop_name)}
            zIndexOffset={shop.featured ? 500 : 0}
            eventHandlers={{ click: () => onSelect(shop) }}
          >
            <Popup>
              <div className="min-w-[190px] font-sans">
                <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                  {shop.featured && <Crown className="h-3.5 w-3.5 text-amber-500" />} {shop.shop_name}
                </p>
                <p className="mb-2 text-xs text-slate-500">
                  {shop.city}{shop.distanceKm != null ? ` · à ${shop.distanceKm < 1 ? `${Math.round(shop.distanceKm * 1000)} m` : `${shop.distanceKm.toFixed(1).replace('.', ',')} km`}` : ''}
                </p>
                <Link to={`/boutique/${encodeURIComponent(shop.shop_name)}`} className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold !text-white">
                  Visiter la boutique <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
