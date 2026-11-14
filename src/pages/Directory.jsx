import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search, LocateFixed, LoaderCircle, MapPinned, Crown, Star, ArrowRight, Store, Package, List, Map as MapIcon,
  Sparkles, X, CircleAlert, Navigation, ChevronLeft, ChevronRight, Share2, Compass, SlidersHorizontal,
  Check
} from 'lucide-react';
import { WhatsApp } from '../components/dashboard/icons';
import { shopSummary, shopPlace, isNewShop } from '../utils/shopSummary';
import { supabase } from '../supabaseClient';
import { SHOP_CATEGORIES } from '../utils/categories';
import { nearestCity, distanceKm } from '../components/admin/geo';
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
      className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/[0.08] to-white/[0.02] ring-1 backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/40 ${
        selected ? 'ring-2 ring-brand-400 shadow-2xl shadow-brand-500/20' : 'ring-white/10 hover:ring-white/25'
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
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/10 to-transparent" />

        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
          {shop.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-amber-950 shadow-md">
              <Crown className="h-3 w-3" /> À la une
            </span>
          )}
          {fresh && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-slate-900 shadow-md">
              <Sparkles className="h-3 w-3 text-brand-600" /> Nouvelle boutique
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          {shop.distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-night/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur">
              <Navigation className="h-3 w-3 text-amber-300" /> {formatDistance(shop.distanceKm)}
            </span>
          )}
          <button
            type="button"
            onClick={handleShare}
            title="Partager cette boutique"
            aria-label={copied ? 'Lien copié' : `Partager la boutique ${shop.shop_name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/80"
          >
            {copied ? <Check className="h-4 w-4 text-brand-400" /> : <Share2 className="h-4 w-4" />}
          </button>
        </div>

        {covers.length > 1 && (
          <>
            <button type="button" onClick={step(-1)} aria-label="Photo précédente" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={step(1)} aria-label="Photo suivante" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100">
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
                  <span className={`block h-1.5 rounded-full transition-all ${activeImgIndex === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50 group-hover/dot:bg-white'}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenu */}
      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-8 mb-3 flex items-end justify-between gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white shadow-xl ring-4 ring-night" style={{ background: color }}>
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            ) : (
              shop.shop_name.charAt(0).toUpperCase()
            )}
          </div>
          {shop.rating > 0 ? (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
              <Star className="h-3 w-3 fill-current" />
              {Number(shop.rating).toFixed(1).replace('.', ',')}
              <span className="font-normal text-white/45">· {shop.reviews_count} avis</span>
            </span>
          ) : null}
        </div>

        <Link to={shopUrl} onClick={stop} className="group/title block">
          <h3 className="text-lg font-extrabold leading-snug text-white transition-colors group-hover/title:text-brand-300">
            {shop.shop_name}
          </h3>
        </Link>
        <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-brand-300">
          <MapPinned className="mt-px h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{shopPlace(shop)}</span>
        </p>

        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-slate-300/90">
          {summary.text}
        </p>

        {shop.categories?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shop.categories.slice(0, 3).map((c) => (
              <span key={c} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                {c}
              </span>
            ))}
            {shop.categories.length > 3 && (
              <span className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-400">+{shop.categories.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <dl className="mb-4 grid grid-cols-2 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.03] text-center">
            <div className="px-2 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Articles</dt>
              <dd className="mt-0.5 flex items-center justify-center gap-1 text-sm font-extrabold text-white">
                <Package className="h-3.5 w-3.5 text-slate-400" /> {shop.products_count}
              </dd>
            </div>
            <div className="px-2 py-2.5">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">À partir de</dt>
              <dd className="mt-0.5 text-sm font-extrabold text-white">
                {shop.min_price_fcfa > 0 ? `${fmt(shop.min_price_fcfa)} FCFA` : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-2">
            <Link
              to={shopUrl}
              onClick={stop}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-400 to-amber-300 px-3 text-sm font-extrabold text-night shadow-lg shadow-brand-500/20 transition-all hover:brightness-110 active:scale-95"
            >
              Visiter la vitrine <ArrowRight className="h-4 w-4" />
            </Link>
            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(`Bonjour ${shop.shop_name}, j'ai vu votre boutique sur SamaBoutik !`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                title="Écrire sur WhatsApp"
                aria-label={`Écrire à ${shop.shop_name} sur WhatsApp`}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
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
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/[0.12] hover:text-white active:scale-95"
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

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-night font-sans text-white antialiased selection:bg-brand-500 selection:text-black">
        {/* Barre de navigation supérieure */}
        <nav className="sticky top-0 z-[600] border-b border-white/[0.08] bg-night/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link to="/" aria-label="SamaBoutik, accueil" className="flex items-center transition hover:scale-[1.03]">
              <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-lg hidden sm:inline" />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/register"
                className="shine-btn inline-flex min-h-10 items-center rounded-full bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 px-4 py-2 text-xs font-extrabold text-night shadow-[0_0_25px_color-mix(in_srgb,_var(--color-brand-400)_35%,_transparent)] transition hover:shadow-brand-500/50 sm:text-sm"
              >
                <span className="hidden sm:inline">Vous êtes commerçant ?&nbsp;</span>Créer ma boutique
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Banner / En-tête immersif */}
        <header className="relative overflow-hidden px-4 pb-12 pt-12 md:pb-16 md:pt-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,_var(--color-brand-400)_15%,_transparent)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-[130px]" />
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px]" />

          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-1.5 text-xs font-bold text-brand-300 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              <span>Annuaire Officiel SamaBoutik · Sénégal</span>
            </motion.div>

            <h1 className="mb-4 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              <BlurWords text="Explorez les boutiques" />{' '}
              <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-amber-200 bg-clip-text text-transparent">
                près de chez vous
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base"
            >
              Découvrez les commerces réels de votre quartier, visitez leur vitrine en ligne, contactez-les sur
              WhatsApp et faites-vous livrer en toute confiance.
            </motion.p>

            {/* Barre de recherche principale & Géolocalisation */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, ease: EASE, duration: 0.6 }}
              className="mx-auto flex max-w-2xl flex-col gap-2 rounded-3xl border border-white/15 bg-white/[0.06] p-2.5 shadow-2xl backdrop-blur-xl sm:flex-row"
            >
              <label className="flex flex-1 items-center gap-3 rounded-2xl bg-white/[0.05] px-4 ring-1 ring-white/10 transition focus-within:ring-brand-400">
                <Search className="h-5 w-5 shrink-0 text-brand-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une boutique, article, quartier..."
                  className="w-full bg-transparent py-3.5 text-base text-white outline-none placeholder:text-slate-400 sm:text-sm"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
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
                  className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold shadow-md transition-all ${
                    me
                      ? 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-500'
                      : 'bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 text-night shadow-brand-500/30 hover:brightness-110'
                  }`}
                >
                  {locating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  <span>{me ? 'Position active' : 'Autour de moi'}</span>
                </motion.button>

                {me && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    title="Désactiver ma position"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>

            {locateError && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-300">
                <CircleAlert className="h-4 w-4 shrink-0" /> {locateError}
              </p>
            )}

            {/* Statistiques clés de l'annuaire */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-6 text-center sm:gap-12"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                  <Store className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-xl font-extrabold text-white">{loading ? '…' : shops.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Boutique{shops.length > 1 ? 's' : ''} inscrite{shops.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300">
                  <MapPinned className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-xl font-extrabold text-white">{loading ? '…' : cities.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Zone{cities.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              {nearbyCount != null && (
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Navigation className="h-5 w-5" />
                  </span>
                  <div className="text-left">
                    <p className="text-xl font-extrabold text-brand-300">{nearbyCount}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">À moins de 5 km</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </header>

        {/* Section Principale */}
        <main className="mx-auto max-w-7xl px-4 pb-28 sm:px-6">
          {/* Quartiers populaires & Rayon GPS */}
          {(me || cities.length > 1 || availableCategories.length > 0) && (
            <div className="mb-6 space-y-3">
              {/* Filtre par rayon si géolocalisé */}
              {me && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1 shrink-0">
                    <Navigation className="h-3.5 w-3.5" /> Rayon :
                  </span>
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setMaxDistance(opt.value)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        maxDistance === opt.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Villes / Zones réelles */}
              {cities.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
                    <Compass className="h-3.5 w-3.5 text-brand-400" /> Ville / Quartier :
                  </span>
                  <button
                    type="button"
                    onClick={() => setCity(null)}
                    className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      city === null
                        ? 'bg-white text-slate-950 shadow-md font-extrabold'
                        : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    📍 Toutes ({shops.length})
                  </button>
                  {cities.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCity(city === name ? null : name)}
                      className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        city === name
                          ? 'bg-gradient-to-r from-brand-400 to-amber-300 text-night shadow-md font-extrabold'
                          : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/15'
                      }`}
                    >
                      {name} <span className="opacity-60 text-[10px]">({count})</span>
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
                    className={`relative min-h-10 shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold transition-all ${
                      category === null
                        ? 'bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 text-night shadow-lg shadow-brand-500/20'
                        : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10'
                    }`}
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
                        className={`min-h-10 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 text-night shadow-lg shadow-brand-500/20'
                            : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10'
                        }`}
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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  {visible.length} boutique{visible.length > 1 ? 's' : ''} disponible{visible.length > 1 ? 's' : ''}
                </h2>
                {city && (
                  <span className="rounded-md bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-brand-300">
                    à {city}
                  </span>
                )}
                {category && (
                  <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-200">
                    dans {category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Sélecteur de tri */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-1 text-xs">
                  <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="min-h-9 bg-transparent py-1 pr-3 text-base font-semibold text-white outline-none cursor-pointer sm:text-[inherit]"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-night text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélecteur Liste / Carte (visible sur mobile & tablette) */}
                <div className="flex rounded-xl border border-white/10 bg-white/[0.06] p-1 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className={`flex min-h-9 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mobileView === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('map')}
                    className={`flex min-h-9 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mobileView === 'map' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
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
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-300">
                  <Crown className="h-4 w-4 text-amber-400" /> Boutiques à la une
                </h3>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x">
                {featured.map((shop, i) => (
                  <div key={shop.shop_name} className="w-80 shrink-0 snap-start">
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
                <div
                  key={i}
                  className="h-96 animate-pulse rounded-[2rem] border border-white/5 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : shops.length === 0 ? (
            /* État vide quand aucune boutique réelle n'a encore publié sa localisation */
            <div className="mx-auto max-w-2xl rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 text-center backdrop-blur-xl sm:p-12 shadow-2xl">
              <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/10 border border-brand-500/30 text-brand-400 shadow-xl shadow-brand-500/10">
                <Store className="h-10 w-10" />
              </span>
              <h3 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
                Soyez le premier commerce de votre quartier sur SamaBoutik !
              </h3>
              <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                Les commerçants de Dakar et du Sénégal ajoutent progressivement leur vitrine à l'annuaire. Créez votre boutique en 2 minutes ou activez votre localisation publique depuis vos paramètres marchands.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/register"
                  className="shine-btn inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 px-6 py-3.5 text-sm font-extrabold text-night shadow-lg shadow-brand-500/30 transition hover:shadow-brand-500/50"
                >
                  Créer ma boutique gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Espace Marchand
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-brand-500/20 bg-brand-950/40 p-4 text-xs text-brand-300/90 text-left">
                <p className="font-bold mb-1">💡 Vous avez déjà un compte commerçant SamaBoutik ?</p>
                <p className="text-slate-300">Rendez-vous dans vos <strong>Paramètres</strong> pour renseigner vos coordonnées GPS et cocher <em>« Afficher ma boutique dans l'annuaire »</em>.</p>
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
              <div className={`${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
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
              <div className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
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
                className="flex items-center gap-2 rounded-full border border-white/20 bg-night/95 px-6 py-3.5 text-sm font-extrabold text-white shadow-2xl backdrop-blur-xl transition hover:border-brand-400"
              >
                {mobileView === 'list' ? (
                  <>
                    <MapIcon className="h-4 w-4 text-brand-400" />
                    <span>Afficher la carte ({visible.length})</span>
                  </>
                ) : (
                  <>
                    <List className="h-4 w-4 text-brand-400" />
                    <span>Afficher la liste ({visible.length})</span>
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Bannière d'appel à l'action pour les commerçants */}
          <section className="mt-20 overflow-hidden rounded-[2.5rem] border border-brand-500/30 bg-gradient-to-br from-brand-950/60 via-night to-night p-8 text-center sm:p-12 shadow-2xl">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300 border border-brand-400/30">
              <Store className="h-7 w-7" />
            </span>
            <h3 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
              Vous tenez un commerce au Sénégal ?
            </h3>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Créez votre vitrine en 2 minutes, acceptez les paiements Wave & Orange Money et faites apparaître
              votre boutique sur la carte de votre quartier pour attirer de nouveaux clients.
            </p>
            <Link
              to="/register"
              className="shine-btn inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 px-6 py-3.5 text-sm font-extrabold text-night shadow-lg shadow-brand-500/30 transition hover:shadow-brand-500/50"
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
      className="mx-auto max-w-md rounded-[2.5rem] border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur"
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-amber-400 text-night shadow-lg shadow-brand-500/30"
      >
        <Icon className="h-8 w-8" />
      </motion.span>
      <h3 className="mb-2 text-xl font-extrabold text-white">{title}</h3>
      <p className="mb-6 text-sm text-slate-400">{text}</p>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            Réinitialiser les filtres
          </button>
        )}
        {cta && (
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-amber-300 px-5 py-2.5 text-xs font-extrabold text-night shadow-md hover:brightness-110"
          >
            Créer ma boutique <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
