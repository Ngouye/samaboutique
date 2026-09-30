import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Search, LocateFixed, LoaderCircle, MapPinned, Crown, Star, ArrowRight, Store, Package, List, Map as MapIcon,
  Sparkles, X, CircleAlert, Navigation,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SHOP_CATEGORIES } from '../utils/categories';
import { nearestCity, distanceKm } from '../components/admin/geo';
import { getCurrentPosition } from '../utils/geolocation';
import { BlurWords, ParticleField } from '../components/landing/Magic';
import DirectoryMap from '../components/directory/DirectoryMap';

const EASE = [0.16, 1, 0.3, 1];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#059669');
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

function ShopCard({ shop, index, selected, onHover }) {
  const color = safeColor(shop.theme_color);
  const covers = shop.cover_images?.length ? shop.cover_images : shop.banner_url ? [shop.banner_url] : [];
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index, 8) * 0.05 }}
      onMouseEnter={() => onHover(shop)}
      className={`group relative overflow-hidden rounded-[1.75rem] bg-white/[0.04] ring-1 backdrop-blur transition-colors ${selected ? 'ring-emerald-400/70' : 'ring-white/10 hover:ring-white/25'}`}
    >
      <Link to={`/boutique/${encodeURIComponent(shop.shop_name)}`} className="block">
        <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }}>
          {covers.length > 0 && (
            <div className={`grid h-full ${covers.length > 1 ? 'grid-cols-3 gap-0.5' : ''}`}>
              {covers.slice(0, 3).map((src, i) => (
                <img key={src} src={src} alt="" loading="lazy" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${covers.length > 1 && i === 0 ? 'col-span-2' : ''}`} />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04120d] via-[#04120d]/20 to-transparent" />
          {shop.featured && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-amber-950 shadow-lg shadow-amber-500/40">
              <Crown className="h-3 w-3" /> À la une
            </span>
          )}
          {shop.distanceKm != null && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              <Navigation className="h-3 w-3" /> {formatDistance(shop.distanceKm)}
            </span>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-8 mb-3 flex items-end gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white ring-4 ring-[#071a13]" style={{ background: color }}>
              {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : shop.shop_name.charAt(0).toUpperCase()}
            </span>
            {shop.rating > 0 && (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                <Star className="h-3 w-3 fill-current" /> {Number(shop.rating).toFixed(1).replace('.', ',')} <span className="text-white/40">({shop.reviews_count})</span>
              </span>
            )}
          </div>
          <h3 className="truncate text-lg font-extrabold text-white">{shop.shop_name}</h3>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-300/80">
            <MapPinned className="h-3.5 w-3.5" /> {shop.city}
          </p>
          {shop.description && <p className="mb-3 line-clamp-2 text-sm text-slate-400">{shop.description}</p>}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(shop.categories || []).slice(0, 3).map((c) => (
              <span key={c} className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-slate-300">{c}</span>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400"><Package className="h-4 w-4" /> {shop.products_count} produit{shop.products_count > 1 ? 's' : ''}{shop.min_price_fcfa ? ` · dès ${fmt(shop.min_price_fcfa)} F` : ''}</span>
            <span className="flex items-center gap-1 font-bold text-emerald-300 transition-transform group-hover:translate-x-1">Visiter <ArrowRight className="h-4 w-4" /></span>
          </div>
        </div>
      </Link>
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
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [selected, setSelected] = useState(null);
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => {
    document.title = 'Boutiques près de chez vous · SamaBoutik';
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('public_shops_directory');
      if (rpcError) setError("L'annuaire n'est pas encore disponible. Revenez très bientôt !");
      else setShops((data || []).map((s) => ({ ...s, city: nearestCity(s.latitude, s.longitude) || 'Sénégal', products_count: Number(s.products_count), reviews_count: Number(s.reviews_count) })));
      setLoading(false);
    })();
  }, []);

  const locate = async () => {
    setLocating(true);
    setLocateError('');
    try {
      const pos = await getCurrentPosition();
      setMe([pos.lat, pos.lng]);
      setCity(null);
    } catch (err) {
      setLocateError(err.message.replace(' Vous pourrez localiser votre boutique plus tard depuis vos paramètres.', ''));
    } finally {
      setLocating(false);
    }
  };

  const withDistance = useMemo(() => shops.map((s) => ({ ...s, distanceKm: me ? distanceKm(me[0], me[1], s.latitude, s.longitude) : null })), [shops, me]);
  const cities = useMemo(() => {
    const counts = new Map();
    shops.forEach((s) => counts.set(s.city, (counts.get(s.city) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [shops]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = withDistance.filter((s) =>
      (!q || s.shop_name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.categories || []).some((c) => c.toLowerCase().includes(q)))
      && (!category || (s.categories || []).includes(category))
      && (!city || s.city === city));
    if (me) list.sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  }, [withDistance, query, category, city, me]);

  const featured = visible.filter((s) => s.featured).slice(0, 8);
  const nearbyCount = me ? visible.filter((s) => s.distanceKm <= 5).length : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#04120d] font-sans text-white">
        {/* Navigation */}
        <nav className="sticky top-0 z-[600] border-b border-white/[0.06] bg-[#04120d]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="flex h-10 w-[92px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_20px_rgba(52,211,153,0.25)]">
              <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
            </Link>
            <Link to="/register" className="shine-btn rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-sm font-bold text-[#02130c] shadow-[0_0_25px_rgba(52,211,153,0.35)]">
              <span className="hidden sm:inline">Vous êtes commerçant ? </span>Créer ma boutique
            </Link>
          </div>
        </nav>

        {/* En-tête */}
        <header className="relative overflow-hidden px-4 pb-10 pt-12 md:pb-14 md:pt-20">
          <ParticleField className="absolute inset-0 opacity-60" density={45} />
          <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> Annuaire SamaBoutik
            </motion.span>
            <h1 className="mb-4 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              <BlurWords text="Les boutiques" /> <span className="text-shimmer">près de chez vous</span>
            </h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mx-auto mb-8 max-w-xl text-slate-400 md:text-lg">
              Découvrez les commerçants de votre quartier, commandez en ligne et faites-vous livrer. Paiement à la livraison, Wave ou Orange Money.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, ease: EASE, duration: 0.7 }} className="mx-auto flex max-w-2xl flex-col gap-2 rounded-3xl bg-white/[0.06] p-2 ring-1 ring-white/10 backdrop-blur sm:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-2xl bg-white/[0.04] px-4">
                <Search className="h-5 w-5 shrink-0 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Boutique, vêtements, téléphones…" className="w-full bg-transparent py-3.5 text-white outline-none placeholder:text-slate-500" />
                {query && <button type="button" onClick={() => setQuery('')} className="text-slate-500 hover:text-white" aria-label="Effacer"><X className="h-4 w-4" /></button>}
              </label>
              <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={locate} disabled={locating} className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold transition-colors ${me ? 'bg-blue-500 text-white' : 'bg-gradient-to-r from-emerald-400 to-teal-400 text-[#02130c]'}`}>
                {locating ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
                {me ? 'Autour de moi ✓' : 'Autour de moi'}
              </motion.button>
            </motion.div>
            {locateError && <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-amber-300"><CircleAlert className="h-4 w-4" /> {locateError}</p>}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex justify-center gap-8 text-center">
              <div><p className="text-3xl font-extrabold">{loading ? '…' : shops.length}</p><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Boutiques</p></div>
              <div><p className="text-3xl font-extrabold">{loading ? '…' : cities.length}</p><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Villes</p></div>
              {nearbyCount != null && <div><p className="text-3xl font-extrabold text-emerald-300">{nearbyCount}</p><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">À moins de 5 km</p></div>}
            </motion.div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-24">
          {/* Filtres */}
          <div className="scrollbar-hide -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <FilterChip active={!category} onClick={() => setCategory(null)} icon={Store} label="Toutes" />
            {SHOP_CATEGORIES.filter((c) => shops.some((s) => (s.categories || []).includes(c.name))).map((c) => (
              <FilterChip key={c.id} active={category === c.name} onClick={() => setCategory(category === c.name ? null : c.name)} icon={c.icon} label={c.name} />
            ))}
          </div>
          {cities.length > 1 && (
            <div className="scrollbar-hide -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1">
              {cities.map(([name, count]) => (
                <button key={name} type="button" onClick={() => setCity(city === name ? null : name)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${city === name ? 'bg-white text-slate-900' : 'bg-white/[0.05] text-slate-400 ring-1 ring-white/10 hover:text-white'}`}>
                  📍 {name} <span className="opacity-50">{count}</span>
                </button>
              ))}
            </div>
          )}

          {error ? (
            <EmptyBlock icon={CircleAlert} title="Annuaire indisponible" text={error} />
          ) : loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-[1.75rem] bg-white/[0.04]" />)}
            </div>
          ) : (
            <>
              {/* À la une */}
              {featured.length > 0 && !query && (
                <section className="mb-10">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-amber-300"><Crown className="h-4 w-4" /> À la une</h2>
                  <div className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
                    {featured.map((shop, i) => (
                      <motion.div key={shop.shop_name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="w-72 shrink-0 snap-start">
                        <ShopCard shop={shop} index={0} selected={selected?.shop_name === shop.shop_name} onHover={setSelected} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Liste / carte (mobile) */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
                  {visible.length} boutique{visible.length > 1 ? 's' : ''}{me ? ' · les plus proches d\'abord' : ''}
                </h2>
                <div className="flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10 lg:hidden">
                  {[{ id: 'list', icon: List, label: 'Liste' }, { id: 'map', icon: MapIcon, label: 'Carte' }].map((v) => (
                    <button key={v.id} type="button" onClick={() => setMobileView(v.id)} className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold">
                      {mobileView === v.id && <motion.span layoutId="dir-view" className="absolute inset-0 rounded-full bg-white" />}
                      <span className={`relative flex items-center gap-1.5 ${mobileView === v.id ? 'text-slate-900' : 'text-slate-400'}`}><v.icon className="h-3.5 w-3.5" /> {v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <EmptyBlock icon={MapPinned} title="Aucune boutique ici pour l'instant" text="Essayez une autre recherche, ou soyez le premier commerçant de votre quartier sur SamaBoutik !" cta />
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,0.9fr)]">
                  <div className={`${mobileView === 'map' ? 'hidden lg:grid' : 'grid'} content-start gap-5 sm:grid-cols-2`}>
                    <AnimatePresence mode="popLayout">
                      {visible.map((shop, i) => <ShopCard key={shop.shop_name} shop={shop} index={i} selected={selected?.shop_name === shop.shop_name} onHover={setSelected} />)}
                    </AnimatePresence>
                  </div>
                  <div className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
                    <div className="lg:sticky lg:top-24">
                      <DirectoryMap key={mobileView} shops={visible} me={me} selected={selected} onSelect={setSelected} className="h-[70vh] lg:h-[calc(100vh-8rem)]" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}

function FilterChip({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick} className="relative shrink-0 rounded-2xl px-4 py-2.5 text-sm font-bold">
      {active && <motion.span layoutId="dir-cat" className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
      <span className={`relative flex items-center gap-2 ${active ? 'text-[#02130c]' : 'text-slate-300'}`}>
        <Icon className="h-4 w-4" /> {label}
      </span>
      {!active && <span className="absolute inset-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/10" />}
    </button>
  );
}

function EmptyBlock({ icon: Icon, title, text, cta = false }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md rounded-[2rem] bg-white/[0.04] px-6 py-12 text-center ring-1 ring-white/10">
      <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-[#02130c] shadow-lg shadow-emerald-500/30">
        <Icon className="h-8 w-8" />
      </motion.span>
      <h3 className="mb-2 text-xl font-extrabold">{title}</h3>
      <p className="mb-6 text-slate-400">{text}</p>
      {cta && (
        <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900">
          Créer ma boutique gratuitement <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </motion.div>
  );
}
