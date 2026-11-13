import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Crown, Star, Navigation, Compass, Store } from 'lucide-react';
import { DAKAR_CENTER } from '../admin/geo';
import { BRAND } from '../../utils/brand';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : BRAND.signature);
const safeUrl = (u) => (/^https:\/\/[^\s"'()<>]+$/i.test(u || '') ? u : null);
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

// Épingle personnalisée : logo ou initiale de la boutique avec couleur de marque
function logoIcon(shop, selected) {
  const logo = safeUrl(shop.logo_url);
  const initial = escapeHtml((shop.shop_name || '?').trim().charAt(0).toUpperCase());
  return L.divIcon({
    className: '',
    html: `<div class="logo-pin${shop.featured ? ' is-featured' : ''}${selected ? ' is-selected' : ''}" style="--pin:${safeColor(shop.theme_color)};${logo ? `background-image:url('${logo}')` : ''}">${logo ? '' : initial}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 57],
    popupAnchor: [0, -54],
  });
}

const meIcon = L.divIcon({
  className: '',
  html: '<div class="me-dot"><div class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">Vous êtes ici</div></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function Fit({ points, me }) {
  const map = useMap();
  useEffect(() => {
    if (me && points.length > 0) {
      const near = points.filter((p) => map.distance(p, me) < 20000);
      map.fitBounds(L.latLngBounds([me, ...near.slice(0, 15)]), { padding: [60, 60], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, points, me]);
  return null;
}

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
    if (shop && shop.latitude != null && shop.longitude != null) {
      map.flyTo([shop.latitude, shop.longitude], Math.max(map.getZoom(), 15), { duration: 0.9 });
    }
  }, [map, shop]);
  return null;
}

function MapControls({ me, onResetDakar }) {
  const map = useMap();
  return (
    <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          map.flyTo(DAKAR_CENTER, 12, { duration: 0.8 });
          if (onResetDakar) onResetDakar();
        }}
        title="Centrer sur Dakar"
        className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-night/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition-all hover:bg-[#09251b] hover:border-brand-400/50"
      >
        <Compass className="h-3.5 w-3.5 text-brand-400" />
        <span className="hidden sm:inline">Dakar</span>
      </button>

      {me && (
        <button
          type="button"
          onClick={() => map.flyTo(me, 15, { duration: 0.8 })}
          title="Ma position"
          className="flex items-center gap-1.5 rounded-xl border border-blue-400/40 bg-blue-600/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition-all hover:bg-blue-500"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Moi</span>
        </button>
      )}
    </div>
  );
}

export default function DirectoryMap({ shops, me, selected, onSelect, className = '' }) {
  const points = useMemo(
    () => shops.filter((s) => s.latitude != null && s.longitude != null).map((s) => [s.latitude, s.longitude]),
    [shops]
  );

  return (
    <div className={`relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-night shadow-2xl ${className}`}>
      <MapContainer
        center={DAKAR_CENTER}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: BRAND.night }}
      >
        {/* CartoDB Voyager : rendu cartographique ultra moderne et soigné */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={19}
        />
        <KeepSized />
        <Fit points={points} me={me} />
        <FlyTo shop={selected} />
        <MapControls me={me} />

        {me && <Marker position={me} icon={meIcon} zIndexOffset={2000} />}

        {shops.map((shop) => {
          const cover = shop.cover_images?.[0] || shop.banner_url;
          const color = safeColor(shop.theme_color);
          const isSelected = selected?.shop_name === shop.shop_name;

          return (
            <Marker
              key={shop.shop_name}
              position={[shop.latitude, shop.longitude]}
              icon={logoIcon(shop, isSelected)}
              zIndexOffset={isSelected ? 1000 : shop.featured ? 500 : 100}
              eventHandlers={{ click: () => onSelect(shop) }}
            >
              <Popup className="custom-shop-popup">
                <div className="w-64 overflow-hidden rounded-2xl font-sans text-white">
                  {/* Image d'en-tête de la popup */}
                  {cover ? (
                    <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-transparent" />
                      {shop.featured && (
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow">
                          <Crown className="h-2.5 w-2.5" /> À la une
                        </span>
                      )}
                      {shop.distanceKm != null && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                          <Navigation className="h-2.5 w-2.5 text-brand-400" /> {formatDistance(shop.distanceKm)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className="h-16 w-full"
                      style={{ background: `linear-gradient(135deg, ${color}, ${BRAND.night})` }}
                    />
                  )}

                  {/* Corps de la popup */}
                  <div className="p-3.5">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="truncate text-sm font-extrabold text-white">
                        {shop.shop_name}
                      </h4>
                      {shop.rating > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          <Star className="h-2.5 w-2.5 fill-current" /> {Number(shop.rating).toFixed(1)}
                        </span>
                      )}
                    </div>

                    <p className="mb-2 text-[11px] text-brand-300/90 font-medium">
                      📍 {shop.city || 'Dakar'}{shop.address ? ` · ${shop.address}` : ''}
                    </p>

                    {shop.description && (
                      <p className="mb-3 line-clamp-2 text-[11px] text-slate-300">
                        {shop.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/boutique/${encodeURIComponent(shop.shop_name)}`}
                        className="flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-brand-400 to-amber-300 py-2 text-center text-xs font-extrabold text-night shadow-sm transition hover:brightness-110"
                      >
                        <Store className="h-3 w-3" /> Vitrine
                      </Link>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 py-2 text-center text-xs font-bold text-white transition hover:bg-white/20"
                      >
                        <Navigation className="h-3 w-3 text-amber-300" /> Y aller
                      </a>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Badge indicateur en bas de la carte */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-2 rounded-xl border border-white/15 bg-night/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
        <span>{shops.length} boutique{shops.length > 1 ? 's' : ''} sur la carte</span>
      </div>
    </div>
  );
}
