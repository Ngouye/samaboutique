import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Crown, Star, Navigation, Compass, Store, Plus, Minus, MapPin, Package, Maximize2 } from 'lucide-react';
import { WhatsApp } from '../dashboard/icons';
import { DAKAR_CENTER } from '../admin/geo';
import { BRAND } from '../../utils/brand';
import { shopSummary, shopPlace } from '../../utils/shopSummary';
import { Basemap, MAP_BG } from '../map/Basemap';


const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : BRAND.signature);
const safeUrl = (u) => (/^https:\/\/[^\s"'()<>]+$/i.test(u || '') ? u : null);
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const directionsUrl = (shop) => `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;


// Épingle personnalisée : logo ou initiale de la boutique, couleur de marque
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
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
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

// « Voir sur la carte » : vol jusqu'à la boutique, puis ouverture de sa fiche.
// Sur téléphone, la carte vient d'apparaître : on laisse sa taille se stabiliser avant de voler,
// et si le vol a été interrompu, on se place directement sur la boutique.
const FOCUS_ZOOM = 16;

function Focus({ focus, markers }) {
  const map = useMap();
  useEffect(() => {
    const shop = focus?.shop;
    if (!shop || shop.latitude == null || shop.longitude == null) return undefined;
    const target = L.latLng(shop.latitude, shop.longitude);
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      if (map.getZoom() < FOCUS_ZOOM - 1 || map.distance(map.getCenter(), target) > 400) {
        map.setView(target, FOCUS_ZOOM, { animate: false });
      }
      markers.current[shop.shop_name]?.openPopup();
    };
    const start = setTimeout(() => {
      map.invalidateSize();
      map.once('moveend', settle);
      map.flyTo(target, Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.9 });
    }, 250);
    const fallback = setTimeout(settle, 1800);
    return () => {
      clearTimeout(start);
      clearTimeout(fallback);
      map.off('moveend', settle);
    };
  }, [map, focus, markers]);
  return null;
}

const CONTROL = 'flex h-10 w-10 items-center justify-center bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500';

function MapControls({ me, points }) {
  const map = useMap();
  const showAll = () => {
    if (points.length === 1) map.flyTo(points[0], 15, { duration: 0.8 });
    else if (points.length > 1) map.flyToBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15, duration: 0.8 });
    else map.flyTo(DAKAR_CENTER, 12, { duration: 0.8 });
  };
  return (
    <div className="absolute right-3 top-3 z-[400] flex flex-col gap-2">
      <div className="flex flex-col divide-y divide-slate-200 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5">
        <button type="button" onClick={() => map.zoomIn()} aria-label="Zoomer" title="Zoomer" className={CONTROL}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => map.zoomOut()} aria-label="Dézoomer" title="Dézoomer" className={CONTROL}>
          <Minus className="h-4 w-4" />
        </button>
      </div>
      <button type="button" onClick={showAll} aria-label="Voir toutes les boutiques" title="Voir toutes les boutiques" className={`${CONTROL} rounded-xl shadow-lg ring-1 ring-black/5`}>
        <Maximize2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => map.flyTo(DAKAR_CENTER, 12, { duration: 0.8 })} aria-label="Centrer sur Dakar" title="Centrer sur Dakar" className={`${CONTROL} rounded-xl shadow-lg ring-1 ring-black/5`}>
        <Compass className="h-4 w-4" />
      </button>
      {me && (
        <button type="button" onClick={() => map.flyTo(me, 15, { duration: 0.8 })} aria-label="Ma position" title="Ma position" className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-500">
          <Navigation className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Fiche de la boutique dans la bulle de la carte
function ShopPopup({ shop }) {
  const cover = safeUrl(shop.cover_images?.[0]) || safeUrl(shop.banner_url);
  const logo = safeUrl(shop.logo_url);
  const color = safeColor(shop.theme_color);
  const summary = shopSummary(shop).text;
  const shopUrl = `/boutique/${encodeURIComponent(shop.shop_name)}`;

  return (
    <div className="w-[17.5rem] overflow-hidden font-sans text-white">
      <div className="relative h-28 w-full">
        <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${BRAND.night})` }}>
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />}
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent" />
        </div>
        <div className="absolute left-3 top-3 flex gap-1.5">
          {shop.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow">
              <Crown className="h-2.5 w-2.5" /> À la une
            </span>
          )}
          {shop.distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              <Navigation className="h-2.5 w-2.5 text-brand-300" /> {formatDistance(shop.distanceKm)}
            </span>
          )}
        </div>
        <div className="absolute -bottom-0 left-3 flex translate-y-1/2 items-end">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl text-lg font-extrabold text-white shadow-lg ring-[3px] ring-night" style={{ background: color }}>
            {logo ? <img src={logo} alt="" className="h-full w-full object-cover" loading="lazy" /> : shop.shop_name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-8">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[15px] font-extrabold leading-tight text-white">{shop.shop_name}</h4>
          {shop.rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
              <Star className="h-3 w-3 fill-current" /> {Number(shop.rating).toFixed(1).replace('.', ',')}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-brand-300">
          <MapPin className="mt-px h-3 w-3 shrink-0" /> <span>{shopPlace(shop)}</span>
        </p>
        <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-slate-300">{summary}</p>

        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> <b className="text-white">{shop.products_count}</b> article{shop.products_count > 1 ? 's' : ''}</span>
          {shop.min_price_fcfa > 0 && <span>dès <b className="text-white">{fmt(shop.min_price_fcfa)} FCFA</b></span>}
        </div>

        <Link to={shopUrl} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-400 to-amber-300 py-2.5 text-xs font-extrabold text-night! shadow-sm transition hover:brightness-110">
          <Store className="h-3.5 w-3.5" /> Visiter la vitrine
        </Link>
        <div className={`mt-2 grid gap-2 ${shop.whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <a href={directionsUrl(shop)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white! transition hover:bg-white/20">
            <Navigation className="h-3.5 w-3.5 text-amber-300" /> Itinéraire
          </a>
          {shop.whatsapp && (
            <a href={`https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(`Bonjour ${shop.shop_name}, j'ai vu votre boutique sur SamaBoutik !`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-2 text-xs font-bold text-emerald-200! transition hover:bg-emerald-500/25">
              <WhatsApp className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DirectoryMap({ shops, me, selected, focus, onSelect, className = '' }) {
  const markers = useRef({});
  const [ready, setReady] = useState(false);
  const located = useMemo(() => shops.filter((s) => s.latitude != null && s.longitude != null), [shops]);
  const points = useMemo(() => located.map((s) => [s.latitude, s.longitude]), [located]);
  const onReady = useCallback(() => setReady(true), []);

  // Connexion lente : on retire le voile de chargement au bout de 8 s, les épingles restent utiles
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="annuaire-carte" className={`directory-map relative isolate overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl ${className}`} style={{ background: MAP_BG }}>
      <MapContainer
        center={DAKAR_CENTER}
        zoom={12}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
        style={{ background: MAP_BG }}
      >
        <Basemap onReady={onReady} />
        <KeepSized />
        <Fit points={points} me={me} />
        <Focus focus={focus} markers={markers} />
        <MapControls me={me} points={points} />

        {me && <Marker position={me} icon={meIcon} zIndexOffset={2000} />}

        {located.map((shop) => {
          const isSelected = selected?.shop_name === shop.shop_name;
          return (
            <Marker
              key={shop.shop_name}
              ref={(m) => {
                if (m) markers.current[shop.shop_name] = m;
                else delete markers.current[shop.shop_name];
              }}
              position={[shop.latitude, shop.longitude]}
              icon={logoIcon(shop, isSelected)}
              title={shop.shop_name}
              alt={shop.shop_name}
              zIndexOffset={isSelected ? 1000 : shop.featured ? 500 : 100}
              eventHandlers={{ click: () => onSelect(shop) }}
            >
              <Popup className="custom-shop-popup" autoPanPaddingTopLeft={[16, 64]} autoPanPaddingBottomRight={[64, 24]} minWidth={280} maxWidth={280}>
                <ShopPopup shop={shop} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Chargement du fond de carte */}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-[300] flex items-center justify-center" style={{ background: MAP_BG }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Chargement de la carte…
          </span>
        </div>
      )}

      {/* Nombre de boutiques visibles */}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span>{located.length} boutique{located.length > 1 ? 's' : ''} sur la carte</span>
      </div>
    </div>
  );
}
