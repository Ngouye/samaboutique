import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search, LocateFixed, LoaderCircle, MapPinned, Crown, Star, ArrowRight, Store, Package, List, Map as MapIcon,
  Sparkles, X, CircleAlert, Navigation, ChevronLeft, ChevronRight, ShieldCheck, Share2, Compass, SlidersHorizontal,
  Phone, Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SHOP_CATEGORIES } from '../utils/categories';
import { nearestCity, distanceKm } from '../components/admin/geo';
import { getCurrentPosition } from '../utils/geolocation';
import { BlurWords } from '../components/landing/Magic';
import DirectoryMap from '../components/directory/DirectoryMap';

const EASE = [0.16, 1, 0.3, 1];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#059669');
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

// Carte d'une vraie boutique avec carrousel photos, avis et liens directs
function ShopCard({ shop, index, selected, onHover, onSelect }) {
  const color = safeColor(shop.theme_color);
  const covers = shop.cover_images?.length ? shop.cover_images : shop.banner_url ? [shop.banner_url] : [];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const nextImg = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % covers.length);
  };

  const prevImg = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + covers.length) % covers.length);
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/boutique/${encodeURIComponent(shop.shop_name)}`;
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

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
      onMouseEnter={() => onHover && onHover(shop)}
      onClick={() => onSelect && onSelect(shop)}
      className={`group relative flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/[0.07] to-white/[0.02] ring-1 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 ${
        selected
          ? 'ring-2 ring-emerald-400 shadow-2xl shadow-emerald-500/20'
          : 'ring-white/10 hover:ring-white/30'
      }`}
    >
      {/* Zone visuelle */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        {covers.length > 0 ? (
          <img
            src={covers[activeImgIndex] || covers[0]}
            alt={shop.shop_name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${color}, #04120d)` }}
          />
        )}

        {/* Dégradé doux */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04120d] via-[#04120d]/30 to-transparent" />

        {/* Badges superposés */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-10">
          {shop.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-amber-950 shadow-md">
              <Crown className="h-3 w-3" /> À la une
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#04120d]/80 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Vérifié
          </span>
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
          {shop.distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#04120d]/80 border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur shadow-sm">
              <Navigation className="h-3 w-3 text-cyan-400" /> {formatDistance(shop.distanceKm)}
            </span>
          )}

          <button
            type="button"
            onClick={handleShare}
            title="Partager cette boutique"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/90"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Commandes carrousel si plusieurs photos */}
        {covers.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImg}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextImg}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Puces de pagination */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {covers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveImgIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    activeImgIndex === i ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/50 hover:bg-white'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenu de la fiche */}
      <div className="relative flex flex-1 flex-col px-5 pb-5">
        {/* Logo / Avatar flottant + Note */}
        <div className="-mt-7 mb-3 flex items-end justify-between">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-extrabold text-white shadow-xl ring-4 ring-[#071e16]"
            style={{ background: color }}
          >
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              shop.shop_name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {shop.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                {Number(shop.rating).toFixed(1)}
                <span className="text-white/40 font-normal">({shop.reviews_count || 0})</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ouvert
            </span>
          </div>
        </div>

        {/* Titre & Localisation */}
        <Link to={`/boutique/${encodeURIComponent(shop.shop_name)}`} className="group/title block">
          <h3 className="truncate text-lg font-extrabold text-white transition-colors group-hover/title:text-emerald-300">
            {shop.shop_name}
          </h3>
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <MapPinned className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{shop.city}{shop.address ? ` · ${shop.address}` : ''}</span>
          </p>
        </Link>

        {/* Description courte */}
        {shop.description && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {shop.description}
          </p>
        )}

        {/* Catégories */}
        {shop.categories && shop.categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {shop.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-lg bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Pied de carte avec prix, produits & actions rapides */}
        <div className="mt-auto border-t border-white/[0.08] pt-3.5">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-slate-500" />
              <strong className="text-white">{shop.products_count}</strong> produit{shop.products_count > 1 ? 's' : ''}
            </span>
            {shop.min_price_fcfa != null && shop.min_price_fcfa > 0 && (
              <span className="font-semibold text-emerald-300">
                dès {fmt(shop.min_price_fcfa)} FCFA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/boutique/${encodeURIComponent(shop.shop_name)}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-xs font-extrabold text-[#02130c] shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95"
            >
              Visiter <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${shop.shop_name}, j'ai vu votre vitrine sur SamaBoutik !`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Contacter sur WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            {shop.latitude != null && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Itinéraire Google Maps"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.12] hover:text-white active:scale-95"
              >
                <Navigation className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
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
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

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
      setLocateError(
        (err.message || 'Impossible de vous localiser').replace(
          ' Vous pourrez localiser votre boutique plus tard depuis vos paramètres.',
          ''
        )
      );
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
      <div className="min-h-screen bg-[#04120d] font-sans text-white antialiased selection:bg-emerald-500 selection:text-black">
        {/* Barre de navigation supérieure */}
        <nav className="sticky top-0 z-[600] border-b border-white/[0.08] bg-[#04120d]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link
              to="/"
              className="flex h-10 w-auto items-center justify-center overflow-hidden rounded-xl bg-white px-2 py-1 shadow-[0_0_25px_rgba(52,211,153,0.25)] transition hover:scale-105"
            >
              <img
                src="/logo.webp"
                alt="SamaBoutik"
                width="252"
                height="186"
                decoding="async"
                className="h-full w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/register"
                className="shine-btn rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 px-4 py-2 text-xs font-extrabold text-[#02130c] shadow-[0_0_25px_rgba(52,211,153,0.35)] transition hover:shadow-emerald-500/50 sm:text-sm"
              >
                <span className="hidden sm:inline">Vous êtes commerçant ? </span>Créer ma boutique
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Banner / En-tête immersif */}
        <header className="relative overflow-hidden px-4 pb-12 pt-12 md:pb-16 md:pt-20">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(52,211,153,0.15)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-[130px]" />
          <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-[140px]" />

          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Annuaire Officiel SamaBoutik · Sénégal</span>
            </motion.div>

            <h1 className="mb-4 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              <BlurWords text="Explorez les boutiques" />{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
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
              <label className="flex flex-1 items-center gap-3 rounded-2xl bg-white/[0.05] px-4 ring-1 ring-white/10 transition focus-within:ring-emerald-400">
                <Search className="h-5 w-5 shrink-0 text-emerald-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une boutique, article, quartier..."
                  className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-400"
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
                      : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-[#02130c] shadow-emerald-500/30 hover:brightness-110'
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
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Store className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-xl font-extrabold text-white">{loading ? '…' : shops.length}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Boutique{shops.length > 1 ? 's' : ''} inscrite{shops.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
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
                    <p className="text-xl font-extrabold text-emerald-300">{nearbyCount}</p>
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
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1 shrink-0">
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
                    <Compass className="h-3.5 w-3.5 text-emerald-400" /> Ville / Quartier :
                  </span>
                  <button
                    type="button"
                    onClick={() => setCity(null)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
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
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        city === name
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-[#02130c] shadow-md font-extrabold'
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
                    className={`relative shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold transition-all ${
                      category === null
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-[#02130c] shadow-lg shadow-emerald-500/20'
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
                        className={`shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-[#02130c] shadow-lg shadow-emerald-500/20'
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
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    à {city}
                  </span>
                )}
                {category && (
                  <span className="rounded-md bg-teal-500/20 px-2 py-0.5 text-xs font-bold text-teal-300">
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
                    className="bg-transparent py-1 pr-3 font-semibold text-white outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-[#071e16] text-white">
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
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      mobileView === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" /> Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('map')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
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
                      onSelect={setSelected}
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
              <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/10">
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
                  className="shine-btn inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 px-6 py-3.5 text-sm font-extrabold text-[#02130c] shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50"
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

              <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 text-xs text-emerald-300/90 text-left">
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
                        onSelect={setSelected}
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
                    onSelect={setSelected}
                    className="h-[75vh] lg:h-[calc(100vh-8rem)]"
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
                className="flex items-center gap-2 rounded-full border border-white/20 bg-[#061912]/95 px-6 py-3.5 text-sm font-extrabold text-white shadow-2xl backdrop-blur-xl transition hover:border-emerald-400"
              >
                {mobileView === 'list' ? (
                  <>
                    <MapIcon className="h-4 w-4 text-emerald-400" />
                    <span>Afficher la carte ({visible.length})</span>
                  </>
                ) : (
                  <>
                    <List className="h-4 w-4 text-emerald-400" />
                    <span>Afficher la liste ({visible.length})</span>
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Bannière d'appel à l'action pour les commerçants */}
          <section className="mt-20 overflow-hidden rounded-[2.5rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-[#071e16] to-[#04120d] p-8 text-center sm:p-12 shadow-2xl">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
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
              className="shine-btn inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 px-6 py-3.5 text-sm font-extrabold text-[#02130c] shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50"
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
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-[#02130c] shadow-lg shadow-emerald-500/30"
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-5 py-2.5 text-xs font-extrabold text-[#02130c] shadow-md hover:brightness-110"
          >
            Créer ma boutique <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
