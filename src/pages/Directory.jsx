import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search, LocateFixed, LoaderCircle, MapPinned, Crown, Star, ArrowRight, Store, Package, List, Map as MapIcon,
  Sparkles, X, CircleAlert, Navigation, ChevronLeft, ChevronRight, Share2, Compass, SlidersHorizontal,
  Check, LayoutGrid
} from 'lucide-react';
import { WhatsApp } from '../components/dashboard/icons';
import { shopSummary, shopPlace, isNewShop } from '../utils/shopSummary';
import { supabase } from '../supabaseClient';
import { SHOP_CATEGORIES } from '../utils/categories';
import { nearestCity, distanceKm, DAKAR_CENTER } from '../components/admin/geo';
import { getCurrentPosition } from '../utils/geolocation';
import { whatsappNumber } from '../utils/phone';
import { BlurWords } from '../components/landing/Magic';
import DirectoryMap from '../components/directory/DirectoryMap';
import { BRAND } from '../utils/brand';
import { useTilt } from '../utils/motion';
import Logo from '../components/brand/Logo';

const EASE = [0.16, 1, 0.3, 1];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : BRAND.signature);
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
const plural = (n, word) => `${word}${n > 1 ? 's' : ''}`;

const RADIUS_OPTIONS = [
  { label: 'Tous', value: null },
  { label: '< 3 km', value: 3 },
  { label: '< 7 km', value: 7 },
  { label: '< 15 km', value: 15 },
  { label: '< 30 km', value: 30 },
];

const SORT_OPTIONS = [
  { id: 'featured', label: '⭐ Recommandées' },
  { id: 'distance', label: '📍 Les plus proches' },
  { id: 'rating', label: '🏆 Mieux notées' },
  { id: 'price_asc', label: '🏷️ Prix accessible' },
  { id: 'products', label: '📦 Plus de choix' },
];

// Puces de filtre sur fond nuit : blanche (zone), dorée (catégorie), émeraude (rayon autour de moi)
const CHIP_IDLE = 'bg-white/[0.05] text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white';
const CHIP_ON = {
  white: 'bg-white text-[#0c0a24] shadow-[0_10px_24px_-12px_rgba(255,255,255,0.55)]',
  gold: 'btn-gold',
  emerald: 'bg-emerald-400 text-emerald-950 shadow-[0_10px_24px_-12px_rgba(52,211,153,0.8)]',
};
const chipClass = (active, tone = 'white') => (active ? CHIP_ON[tone] : CHIP_IDLE);

// Décor de nuit commun (héros et bannière) : lueurs, halo tournant, grain photo
function NightBackdrop({ floor = false }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_82%_0%,rgba(106,88,232,0.5),transparent_70%),radial-gradient(45%_45%_at_0%_20%,rgba(246,199,104,0.13),transparent_70%),radial-gradient(60%_50%_at_50%_110%,rgba(81,64,218,0.35),transparent_70%)]" />
      {floor && (
        <div className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden [mask-image:linear-gradient(to_top,black_15%,transparent)]">
          <div className="hero-floor absolute -left-1/2 bottom-0 h-[150%] w-[200%]" />
        </div>
      )}
      <div className="hero-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}

// Radar « autour de moi » : chaque boutique est placée selon sa vraie direction et sa distance
// depuis votre position (ou depuis le centre de Dakar). Un clic montre la boutique sur la carte.
function ShopRadar({ shops, me, onPick }) {
  const center = me || DAKAR_CENTER;
  const { pins, maxD } = useMemo(() => {
    const cosLat = Math.cos((center[0] * Math.PI) / 180);
    const list = shops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((shop) => ({
        shop,
        d: distanceKm(center[0], center[1], shop.latitude, shop.longitude),
        bearing: Math.atan2((shop.longitude - center[1]) * cosLat, shop.latitude - center[0]),
      }))
      .sort((a, b) => Number(Boolean(b.shop.featured)) - Number(Boolean(a.shop.featured)) || a.d - b.d)
      .slice(0, 9);
    const far = Math.max(0.5, ...list.map((p) => p.d));
    const placed = [];
    list.forEach((p) => {
      const r = 0.26 + 0.6 * Math.sqrt(p.d / far);
      let angle = p.bearing;
      let x = 50;
      let y = 50;
      // Deux boutiques presque au même endroit : on décale légèrement la seconde pour qu'elles restent lisibles
      for (let tries = 0; tries < 8; tries += 1) {
        x = 50 + r * 46 * Math.sin(angle);
        y = 50 - r * 46 * Math.cos(angle);
        if (!placed.some((q) => Math.hypot(q.x - x, q.y - y) < 12)) break;
        angle += 0.5;
      }
      placed.push({ ...p, x, y });
    });
    return { pins: placed, maxD: far };
  }, [shops, center]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="hero-halo absolute left-1/2 top-1/2 h-[78%] w-[78%] rounded-full bg-[conic-gradient(from_90deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-30 blur-[70px]" aria-hidden="true" />

      {/* Cadran */}
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle,rgba(106,88,232,0.24),rgba(12,10,36,0.75)_72%)] shadow-[0_40px_90px_-40px_rgba(106,88,232,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/15" aria-hidden="true">
        {[0.3, 0.56, 0.82].map((s) => (
          <span key={s} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.09]" style={{ width: `${s * 100}%`, height: `${s * 100}%` }} />
        ))}
        <span className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <span className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="radar-sweep absolute inset-0" />
        <span className="absolute left-1/2 top-3 -translate-x-1/2 text-[10px] font-bold tracking-[0.2em] text-white/30">N</span>
      </div>

      {/* Vous / Dakar au centre */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <span className="radar-ping absolute inset-0 rounded-full bg-[#f6c768]/40" aria-hidden="true" />
        <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-[#f6c768] shadow-[0_0_24px_6px_rgba(246,199,104,0.55)] ring-4 ring-[#f6c768]/25" />
        <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0c0a24]/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#f9d784] ring-1 ring-[#f6c768]/30">
          {me ? 'Vous' : 'Dakar'}
        </span>
      </div>

      {/* Boutiques */}
      {pins.map((p, i) => {
        const color = safeColor(p.shop.theme_color);
        return (
          <motion.button
            key={p.shop.shop_name}
            type="button"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.09, duration: 0.55, ease: EASE }}
            whileHover={{ scale: 1.12 }}
            onClick={() => onPick(p.shop)}
            aria-label={`Voir ${p.shop.shop_name} sur la carte`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="group/pin absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6c768]"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-sm font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(0,0,0,0.7)] ring-2 ${p.shop.featured ? 'ring-[#f6c768]' : 'ring-white/70'}`}
              style={{ background: color }}
            >
              {p.shop.logo_url ? (
                <img src={p.shop.logo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                p.shop.shop_name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0c0a24]/95 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg ring-1 ring-white/15 transition-opacity group-hover/pin:opacity-100 group-focus-visible/pin:opacity-100">
              {p.shop.shop_name}
              <span className="ml-1.5 font-semibold text-[#f9d784]">{formatDistance(p.d)}</span>
            </span>
          </motion.button>
        );
      })}

      {pins.length > 0 && (
        <p className="absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#0c0a24]/85 px-3.5 py-1.5 text-[11px] font-bold text-white/75 ring-1 ring-white/10 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
          {pins.length} {plural(pins.length, 'boutique')} sur le radar · rayon {formatDistance(maxD)}
        </p>
      )}
    </div>
  );
}

// Fiche d'une vraie boutique : photos, description, adresse, chiffres clés et actions directes
function ShopCard({ shop, index, selected, onHover, onSelect, onShowOnMap }) {
  const color = safeColor(shop.theme_color);
  const covers = shop.cover_images?.length ? shop.cover_images : shop.banner_url ? [shop.banner_url] : [];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const tilt = useTilt({ max: 4 });
  const summary = shopSummary(shop);
  const fresh = isNewShop(shop);
  const shopUrl = `/boutique/${encodeURIComponent(shop.shop_name)}`;

  const step = (delta) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + delta + covers.length) % covers.length);
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${shopUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.shop_name, url });
        return;
      } catch {
        /* annulé par l'utilisateur */
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
      onMouseEnter={() => onHover && onHover(shop)}
      onClick={() => onSelect && onSelect(shop)}
      style={tilt.style}
      onMouseMove={tilt.handlers.onMouseMove}
      onMouseLeave={tilt.handlers.onMouseLeave}
      className={`dir-sheen group relative flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] bg-[#100e2e] transition-shadow duration-300 hover:shadow-[0_34px_70px_-34px_rgba(106,88,232,0.75)] ${
        selected ? 'ring-2 ring-[#f6c768]/80' : 'ring-1 ring-white/10 hover:ring-white/20'
      }`}
    >
      {/* Photos */}
      <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${BRAND.night})` }}>
        {covers.length > 0 && (
          <img
            src={covers[activeImgIndex] || covers[0]}
            alt={`Article de ${shop.shop_name}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#100e2e] via-[#100e2e]/10 to-black/20" />

        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          {shop.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f9d784] to-[#f3a953] px-2.5 py-1 text-[11px] font-extrabold text-[#1a1033] shadow-[0_8px_20px_-8px_rgba(243,169,83,0.9)]">
              <Crown className="h-3 w-3" /> À la une
            </span>
          )}
          {fresh && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/25 backdrop-blur">
              <Sparkles className="h-3 w-3 text-[#f9d784]" /> Nouvelle boutique
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {shop.distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/15 backdrop-blur">
              <Navigation className="h-3 w-3 text-[#f6c768]" /> {formatDistance(shop.distanceKm)}
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            title="Partager cette boutique"
            aria-label={copied ? 'Lien copié' : `Partager la boutique ${shop.shop_name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/75"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
          </button>
        </div>

        {covers.length > 1 && (
          <>
            <button type="button" onClick={step(-1)} aria-label="Photo précédente" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 ring-1 ring-white/15 backdrop-blur transition hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={step(1)} aria-label="Photo suivante" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 ring-1 ring-white/15 backdrop-blur transition hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 right-3 z-10 flex items-center gap-1">
              {covers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveImgIndex(i); }}
                  className="group/dot flex h-8 items-center justify-center px-1"
                  aria-label={`Photo ${i + 1}`}
                >
                  <span className={`block h-1.5 rounded-full transition-all ${activeImgIndex === i ? 'w-5 bg-[#f9d784]' : 'w-1.5 bg-white/50 group-hover/dot:bg-white'}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenu */}
      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-8 mb-3 flex items-end justify-between gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white shadow-[0_16px_30px_-12px_rgba(0,0,0,0.8)] ring-4 ring-[#100e2e]" style={{ background: color }}>
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
              shop.shop_name.charAt(0).toUpperCase()
            )}
          </div>
          {shop.rating > 0 ? (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#f6c768]/10 px-2.5 py-1 text-xs font-bold text-[#f9d784] ring-1 ring-[#f6c768]/25">
              <Star className="h-3 w-3 fill-current" />
              {Number(shop.rating).toFixed(1).replace('.', ',')}
              <span className="font-normal text-[#f9d784]/60">· {shop.reviews_count} avis</span>
            </span>
          ) : null}
        </div>

        <Link to={shopUrl} onClick={stop} className="group/title block">
          <h3 className="text-lg font-bold leading-snug text-white transition-colors group-hover/title:text-[#f9d784]">
            {shop.shop_name}
          </h3>
        </Link>
        <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-[#aea6f7]">
          <MapPinned className="mt-px h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{shopPlace(shop)}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-white/60">
          {summary.text}
        </p>

        {shop.categories?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shop.categories.slice(0, 3).map((c) => (
              <span key={c} className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/[0.08]">
                {c}
              </span>
            ))}
            {shop.categories.length > 3 && (
              <span className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-white/40">+{shop.categories.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <dl className="mb-4 grid grid-cols-2 divide-x divide-white/10 rounded-2xl bg-white/[0.04] text-center ring-1 ring-white/10">
            <div className="px-2 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">Articles</dt>
              <dd className="mt-0.5 flex items-center justify-center gap-1 font-figures text-sm font-bold text-white">
                <Package className="h-3.5 w-3.5 text-[#aea6f7]" /> {shop.products_count}
              </dd>
            </div>
            <div className="px-2 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">À partir de</dt>
              <dd className="mt-0.5 font-figures text-sm font-bold text-white">
                {shop.min_price_fcfa > 0 ? `${fmt(shop.min_price_fcfa)} FCFA` : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-2">
            <Link
              to={shopUrl}
              onClick={stop}
              className="btn-gold flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-extrabold active:scale-95"
            >
              Visiter la vitrine <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(`Bonjour ${shop.shop_name}, j'ai vu votre boutique sur SamaBoutik !`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                title="Écrire sur WhatsApp"
                aria-label={`Écrire à ${shop.shop_name} sur WhatsApp`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/25 transition hover:bg-emerald-400/20 active:scale-95"
              >
                <WhatsApp className="h-5 w-5" />
              </a>
            )}
            {shop.latitude != null && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onShowOnMap(shop); }}
                title="Voir sur la carte"
                aria-label={`Voir ${shop.shop_name} sur la carte`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                <MapIcon className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>
      {tilt.enabled && <span className="tilt-glare z-20" aria-hidden="true" />}
    </motion.article>
  );
}

export default function Directory() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [city, setCity] = useState(null);
  const [maxDistance, setMaxDistance] = useState(null);
  const [sortBy, setSortBy] = useState('featured');
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null); // boutique à montrer sur la carte (vol + fiche ouverte)
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
  // « Voir sur la carte » : sur téléphone, on passe à la vue carte
  const showOnMap = (shop) => {
    setSelected(shop);
    setFocus((f) => ({ shop, n: (f?.n || 0) + 1 }));
    if (!isDesktop()) setMobileView('map');
    // La carte doit être à l'écran pour voir le vol jusqu'à la boutique
    setTimeout(() => {
      const el = document.getElementById('annuaire-carte');
      const r = el?.getBoundingClientRect();
      if (r && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };
  // Clic sur une fiche : sur grand écran, la carte (toujours visible) suit
  const selectShop = (shop) => {
    setSelected(shop);
    if (isDesktop()) setFocus((f) => ({ shop, n: (f?.n || 0) + 1 }));
  };

  useEffect(() => {
    document.title = 'Boutiques près de chez vous · SamaBoutik';
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('public_shops_directory');
        if (rpcError) {
          console.warn('Erreur public_shops_directory :', rpcError);
          setError("L'annuaire n'est pas encore disponible ou est en cours de mise à jour.");
          setShops([]);
        } else {
          const realShops = (data || []).map((s) => ({
            ...s,
            city: s.city || nearestCity(s.latitude, s.longitude) || 'Sénégal',
            // Colonnes ajoutées par stock_et_annuaire.sql (absentes tant que le script n'est pas exécuté)
            whatsapp: whatsappNumber(s.phone_number) || null,
            address: s.address || null,
            products_count: Number(s.products_count || 0),
            reviews_count: Number(s.reviews_count || 0),
            rating: Number(s.rating || 0),
          }));
          setShops(realShops);
        }
      } catch (err) {
        console.error('Erreur chargement annuaire :', err);
        setError("Impossible de charger l'annuaire pour le moment.");
        setShops([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Géolocalisation de l'utilisateur
  const locate = async () => {
    setLocating(true);
    setLocateError('');
    try {
      const pos = await getCurrentPosition();
      setMe([pos.lat, pos.lng]);
      setCity(null);
      setSortBy('distance');
    } catch (err) {
      setLocateError(err.message || 'Impossible de vous localiser.');
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setMe(null);
    setMaxDistance(null);
    if (sortBy === 'distance') setSortBy('featured');
  };

  // Calcul dynamique de la distance par rapport à l'utilisateur
  const withDistance = useMemo(() => {
    return shops.map((s) => ({
      ...s,
      distanceKm:
        me && s.latitude != null && s.longitude != null
          ? distanceKm(me[0], me[1], s.latitude, s.longitude)
          : null,
    }));
  }, [shops, me]);

  // Villes et quartiers réels représentés dans la base
  const cities = useMemo(() => {
    const counts = new Map();
    shops.forEach((s) => {
      const c = s.city || 'Sénégal';
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [shops]);

  // Catégories représentées dans la base de données
  const availableCategories = useMemo(() => {
    return SHOP_CATEGORIES.filter((c) =>
      shops.some((s) => (s.categories || []).includes(c.name))
    );
  }, [shops]);

  // Filtrage et tri des boutiques réelles
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = withDistance.filter((s) => {
      const matchesQuery =
        !q ||
        s.shop_name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q) ||
        (s.categories || []).some((c) => c.toLowerCase().includes(q));

      const matchesCat = !category || (s.categories || []).includes(category);
      const matchesCity = !city || s.city === city;
      const matchesDistance = !maxDistance || (s.distanceKm != null && s.distanceKm <= maxDistance);

      return matchesQuery && matchesCat && matchesCity && matchesDistance;
    });

    // Tri
    list.sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'price_asc') {
        return (a.min_price_fcfa || 0) - (b.min_price_fcfa || 0);
      }
      if (sortBy === 'products') {
        return (b.products_count || 0) - (a.products_count || 0);
      }
      // Par défaut : À la une d'abord, puis note
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return list;
  }, [withDistance, query, category, city, maxDistance, sortBy]);

  const featured = useMemo(() => visible.filter((s) => s.featured).slice(0, 6), [visible]);
  const nearbyCount = me ? visible.filter((s) => s.distanceKm != null && s.distanceKm <= 5).length : null;

  const stats = [
    { icon: Store, value: shops.length, label: plural(shops.length, 'Boutique') },
    { icon: MapPinned, value: cities.length, label: plural(cities.length, 'Zone') },
    { icon: LayoutGrid, value: availableCategories.length, label: plural(availableCategories.length, 'Catégorie') },
    ...(nearbyCount != null ? [{ icon: Navigation, value: nearbyCount, label: 'À moins de 5 km', accent: true }] : []),
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0a0820] font-sans text-white antialiased selection:bg-[#6a58e8]/50">
        {/* Barre de navigation supérieure */}
        <nav className="sticky top-0 z-[600] border-b border-white/[0.08] bg-[#0a0820]/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link to="/" aria-label="SamaBoutik, accueil" className="flex items-center transition hover:scale-[1.03]">
              <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-lg hidden sm:inline" />
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="hidden min-h-10 items-center rounded-full px-4 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white md:inline-flex"
              >
                Espace marchand
              </Link>
              <Link
                to="/register"
                className="btn-gold inline-flex min-h-10 items-center rounded-full px-4 py-2 text-xs font-extrabold sm:text-sm"
              >
                <span className="hidden sm:inline">Vous êtes commerçant ?&nbsp;</span>Créer ma boutique
              </Link>
            </div>
          </div>
        </nav>

        {/* En-tête « nuit de Dakar » : recherche, position et radar des boutiques */}
        <header className="relative isolate overflow-hidden rounded-b-[2.5rem] px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-16">
          <NightBackdrop floor />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="min-w-0 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/15 backdrop-blur"
              >
                <span className="relative flex h-2 w-2">
                  <span className="radar-ping absolute inset-0 rounded-full bg-emerald-400" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Annuaire officiel SamaBoutik · Sénégal
              </motion.div>

              <h1 className="mb-5 text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.1rem]">
                <BlurWords text="Explorez les boutiques" />{' '}
                <motion.span
                  initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
                  className="font-editorial text-sunrise inline-block pb-1 pr-1"
                >
                  près de chez vous
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mx-auto mb-8 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-base lg:mx-0"
              >
                Découvrez les commerces réels de votre quartier, visitez leur vitrine en ligne, contactez-les sur
                WhatsApp et faites-vous livrer en toute confiance.
              </motion.p>

              {/* Barre de recherche principale & Géolocalisation */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, ease: EASE, duration: 0.6 }}
                className="mx-auto flex max-w-2xl flex-col gap-2 rounded-[1.6rem] bg-white/[0.07] p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/15 backdrop-blur-xl sm:flex-row lg:mx-0"
              >
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.15rem] bg-[#0c0a24]/60 px-4 ring-1 ring-white/10 transition focus-within:ring-2 focus-within:ring-[#f6c768]/60">
                  <Search className="h-5 w-5 shrink-0 text-[#f6c768]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Boutique, article ou quartier…"
                    aria-label="Rechercher une boutique"
                    className="w-full min-w-0 bg-transparent py-3.5 text-base text-white outline-none placeholder:text-white/40 sm:text-sm"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
                      aria-label="Effacer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={locate}
                    disabled={locating}
                    className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1.15rem] px-5 text-sm font-extrabold transition sm:flex-initial ${
                      me
                        ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/35 hover:bg-emerald-400/25'
                        : 'btn-gold'
                    }`}
                  >
                    {locating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <LocateFixed className="h-4 w-4" />
                    )}
                    <span className="whitespace-nowrap">{me ? 'Position active' : 'Autour de moi'}</span>
                  </motion.button>

                  {me && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      title="Désactiver ma position"
                      aria-label="Désactiver ma position"
                      className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-white/[0.06] text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>

              {locateError && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-300 lg:justify-start">
                  <CircleAlert className="h-4 w-4 shrink-0" /> {locateError}
                </p>
              )}

              {/* Statistiques clés de l'annuaire */}
              <motion.dl
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, ease: EASE, duration: 0.6 }}
                className={`mx-auto mt-6 grid max-w-2xl gap-2.5 lg:mx-0 ${stats.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
              >
                {stats.map(({ icon: Icon, value, label, accent }) => (
                  <div key={label} className="min-w-0 rounded-2xl bg-white/[0.045] px-3 py-3 text-left ring-1 ring-white/10 backdrop-blur sm:px-4">                    <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                      <Icon className={`hidden h-3.5 w-3.5 shrink-0 sm:block ${accent ? 'text-emerald-300' : 'text-[#f6c768]'}`} />
                      <span className="truncate">{label}</span>
                    </dt>
                    <dd className={`font-editorial mt-1 text-[1.75rem] leading-none ${accent ? 'text-emerald-200' : 'text-white'}`}>
                      {loading ? '…' : value}
                    </dd>
                  </div>
                ))}
              </motion.dl>
            </div>

            {/* Radar des boutiques (grand écran) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.9, ease: EASE }}
              className="hidden min-w-0 lg:block"
            >
              <ShopRadar shops={withDistance} me={me} onPick={showOnMap} />
            </motion.div>
          </div>
        </header>

        {/* Section Principale */}
        <main className="relative mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6">
          {/* Quartiers populaires & Rayon GPS */}
          {(me || cities.length > 1 || availableCategories.length > 0) && (
            <div className="mb-8 space-y-3 rounded-[1.75rem] bg-white/[0.03] p-3 ring-1 ring-white/[0.08] sm:p-4">
              {/* Filtre par rayon si géolocalisé */}
              {me && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                    <Navigation className="h-3.5 w-3.5" /> Rayon
                  </span>
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setMaxDistance(opt.value)}
                      className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${chipClass(maxDistance === opt.value, 'emerald')}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Villes / Zones réelles */}
              {cities.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="flex shrink-0 items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                    <Compass className="h-3.5 w-3.5 text-[#aea6f7]" /> Zone
                  </span>
                  <button
                    type="button"
                    onClick={() => setCity(null)}
                    className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${chipClass(city === null)}`}
                  >
                    Toutes <span className="text-[10px] opacity-60">({shops.length})</span>
                  </button>
                  {cities.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCity(city === name ? null : name)}
                      className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${chipClass(city === name)}`}
                    >
                      {name} <span className="text-[10px] opacity-60">({count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Catégories de commerces réels */}
              {availableCategories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setCategory(null)}
                    className={`min-h-10 shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold transition-all ${chipClass(category === null, 'gold')}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" /> Toutes les catégories
                    </span>
                  </button>

                  {availableCategories.map((c) => {
                    const Icon = c.icon;
                    const isActive = category === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(isActive ? null : c.name)}
                        className={`min-h-10 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${chipClass(isActive, 'gold')}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" /> {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* En-tête de la grille si des boutiques existent */}
          {shops.length > 0 && (
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
                <h2 className="flex items-baseline gap-2 text-lg font-extrabold text-white sm:text-xl">
                  <span className="font-editorial text-sunrise text-[2rem] leading-none">{visible.length}</span>
                  {plural(visible.length, 'boutique')} {plural(visible.length, 'disponible')}
                </h2>
                {city && (
                  <span className="rounded-full bg-[#6a58e8]/20 px-2.5 py-0.5 text-xs font-bold text-[#c3baff] ring-1 ring-[#8a7cf1]/30">
                    à {city}
                  </span>
                )}
                {category && (
                  <span className="rounded-full bg-[#f6c768]/10 px-2.5 py-0.5 text-xs font-bold text-[#f9d784] ring-1 ring-[#f6c768]/25">
                    dans {category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Sélecteur de tri */}
                <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] p-1 text-xs ring-1 ring-white/10">
                  <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-[#f6c768]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Trier les boutiques"
                    className="min-h-9 cursor-pointer bg-transparent py-1 pr-3 text-base font-semibold text-white outline-none [color-scheme:dark] sm:text-[inherit]"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-[#0c0a24] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélecteur Liste / Carte (visible sur mobile & tablette) */}
                <div className="flex rounded-xl bg-white/[0.06] p-1 ring-1 ring-white/10 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className={`flex min-h-9 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mobileView === 'list' ? 'bg-white text-[#0c0a24]' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('map')}
                    className={`flex min-h-9 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mobileView === 'map' ? 'bg-white text-[#0c0a24]' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <MapIcon className="h-3.5 w-3.5" /> Carte
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section À la une */}
          {featured.length > 0 && !query && !category && !city && (
            <section className="mb-12">
              <div className="mb-5 flex items-center gap-4">
                <h3 className="flex shrink-0 items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#f6c768]">
                  <Crown className="h-4 w-4" /> Boutiques à la une
                </h3>
                <span className="h-px flex-1 bg-gradient-to-r from-[#f6c768]/40 via-white/10 to-transparent" />
              </div>

              <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 scrollbar-hide sm:mx-0 sm:px-0">
                {featured.map((shop, i) => (
                  <div key={shop.shop_name} className="w-[19rem] shrink-0 snap-start sm:w-80">
                    <ShopCard
                      shop={shop}
                      index={i}
                      selected={selected?.shop_name === shop.shop_name}
                      onHover={setSelected}
                      onSelect={selectShop}
                      onShowOnMap={showOnMap}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Grille principale & Carte synchronisée */}
          {error ? (
            <EmptyBlock icon={CircleAlert} title="Annuaire indisponible" text={error} />
          ) : loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-[1.75rem] bg-white/[0.04] ring-1 ring-white/10">
                  <div className="aspect-[16/9] animate-pulse bg-white/[0.06]" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.08]" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/[0.06]" />
                    <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : shops.length === 0 ? (
            /* État vide quand aucune boutique réelle n'a encore publié sa localisation */
            <div className="relative isolate mx-auto max-w-2xl overflow-hidden rounded-[2.5rem] bg-white/[0.04] p-8 text-center ring-1 ring-white/10 sm:p-12">
              <NightBackdrop />
              <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#f6c768]/10 text-[#f9d784] ring-1 ring-[#f6c768]/25">
                <Store className="h-10 w-10" />
              </span>
              <h3 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
                Soyez le premier commerce de votre quartier <span className="font-editorial text-sunrise">sur SamaBoutik !</span>
              </h3>
              <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
                Les commerçants de Dakar et du Sénégal ajoutent progressivement leur vitrine à l'annuaire. Créez votre boutique en 2 minutes ou activez votre localisation publique depuis vos paramètres marchands.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/register"
                  className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-extrabold"
                >
                  Créer ma boutique gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] px-6 py-3.5 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/10"
                >
                  Espace Marchand
                </Link>
              </div>

              <div className="mt-8 rounded-2xl bg-white/[0.04] p-4 text-left text-xs ring-1 ring-white/10">
                <p className="mb-1 font-bold text-white">💡 Vous avez déjà un compte commerçant SamaBoutik ?</p>
                <p className="text-white/60">Rendez-vous dans vos <strong className="text-white/85">Paramètres</strong> pour renseigner vos coordonnées GPS et cocher <em>« Afficher ma boutique dans l'annuaire »</em>.</p>
              </div>
            </div>
          ) : visible.length === 0 ? (
            /* Filtre de recherche sans résultat */
            <EmptyBlock
              icon={MapPinned}
              title="Aucune boutique ne correspond à vos critères"
              text="Essayez d'élargir votre recherche, de changer de zone ou de réinitialiser vos filtres."
              onReset={() => {
                setQuery('');
                setCategory(null);
                setCity(null);
                setMaxDistance(null);
              }}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Colonne Cartes */}
              <div className={`min-w-0 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {visible.map((shop, i) => (
                      <ShopCard
                        key={shop.shop_name}
                        shop={shop}
                        index={i}
                        selected={selected?.shop_name === shop.shop_name}
                        onHover={setSelected}
                        onSelect={selectShop}
                        onShowOnMap={showOnMap}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Colonne Carte Interactive (Sticky sur écran large) */}
              <div className={`min-w-0 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
                <div className="lg:sticky lg:top-24">
                  <DirectoryMap
                    key={mobileView}
                    shops={visible}
                    me={me}
                    selected={selected}
                    focus={focus}
                    onSelect={setSelected}
                    className="h-[75vh] supports-[height:100dvh]:h-[75dvh] lg:h-[calc(100vh-8rem)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bouton Flottant Mobile pour alterner Liste / Carte (style Airbnb) */}
          {visible.length > 0 && (
            <div className="fixed bottom-6 left-1/2 z-[500] -translate-x-1/2 lg:hidden">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
                className="btn-gold flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3.5 text-sm font-extrabold"
              >
                {mobileView === 'list' ? (
                  <>
                    <MapIcon className="h-4 w-4" />
                    <span>Afficher la carte ({visible.length})</span>
                  </>
                ) : (
                  <>
                    <List className="h-4 w-4" />
                    <span>Afficher la liste ({visible.length})</span>
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Bannière d'appel à l'action pour les commerçants */}
          <section className="relative isolate mt-24 overflow-hidden rounded-[2.5rem] bg-[#0f0c30] px-6 py-14 text-center ring-1 ring-white/10 sm:px-12 sm:py-16">
            <NightBackdrop floor />
            <div className="hero-halo pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[320px] rounded-full bg-[conic-gradient(from_90deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-25 blur-[90px]" aria-hidden="true" />
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6c768]/10 text-[#f9d784] ring-1 ring-[#f6c768]/30">
              <Store className="h-7 w-7" />
            </span>
            <h3 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
              Vous tenez un commerce <span className="font-editorial text-sunrise">au Sénégal ?</span>
            </h3>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Créez votre vitrine en 2 minutes, acceptez les paiements Wave & Orange Money et faites apparaître
              votre boutique sur la carte de votre quartier pour attirer de nouveaux clients.
            </p>
            <Link
              to="/register"
              className="btn-gold inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-extrabold"
            >
              Lancer ma boutique gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

function EmptyBlock({ icon: Icon, title, text, cta = false, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md rounded-[2.5rem] bg-white/[0.04] px-6 py-12 text-center ring-1 ring-white/10"
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f6c768]/10 text-[#f9d784] shadow-[0_18px_40px_-16px_rgba(246,199,104,0.5)] ring-1 ring-[#f6c768]/25"
      >
        <Icon className="h-8 w-8" />
      </motion.span>
      <h3 className="mb-2 text-xl font-extrabold text-white">{title}</h3>
      <p className="mb-6 text-sm text-white/55">{text}</p>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/10"
          >
            Réinitialiser les filtres
          </button>
        )}
        {cta && (
          <Link
            to="/register"
            className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold"
          >
            Créer ma boutique <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
