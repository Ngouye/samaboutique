import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Truck, ArrowRight, ShieldCheck, Check, Users, MapPin, Bell, Sparkles, CreditCard,
  Menu, X, Zap, Lock, MessageCircle, TrendingUp, ShoppingBag, Star, Shirt, Watch, Footprints,
  Gem, Wallet, CircleCheck, Rocket, Clock, ArrowUpRight, Plus, Search, Heart,
} from 'lucide-react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useMotionValueEvent,
  AnimatePresence, MotionConfig,
} from 'framer-motion';
import { playPop } from '../utils/audio';
import {
  EASE, ParticleField, SpotlightCard, Magnetic, BlurWords, Reveal, CountUp, SectionLabel,
} from '../components/landing/Magic';
import FlowAnimation from '../components/landing/FlowAnimation';

const FAKE_NOTIFICATIONS = [
  { name: "Fatou D.", city: "Dakar", action: "vient de créer sa boutique", time: "à l'instant" },
  { name: "Mamadou N.", city: "Thiès", action: "a reçu 3 commandes", time: "il y a 5 min" },
  { name: "Awa S.", city: "Saint-Louis", action: "vient de s'inscrire", time: "il y a 12 min" },
  { name: "Boutique Chez Ali", city: "Dakar", action: "a validé une livraison", time: "il y a 20 min" },
];

const TABS = [
  { id: '01', title: 'Vendeurs', description: 'Gérez votre catalogue, suivez vos commandes et encaissez vos paiements en un seul endroit.', icon: Store },
  { id: '02', title: 'Livreurs', description: 'Une application dédiée pour vos livreurs avec suivi GPS et validation par code PIN.', icon: Truck },
  { id: '03', title: 'Clients', description: "Une expérience d'achat fluide, optimisée pour mobile avec paiement Wave ou Orange Money.", icon: Users },
];

const PAYMENT_METHODS = [
  { name: 'Wave', color: 'bg-sky-400', glow: 'shadow-[0_0_12px_rgba(56,189,248,0.8)]' },
  { name: 'Orange Money', color: 'bg-orange-500', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.8)]' },
  { name: 'Free Money', color: 'bg-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.8)]' },
  { name: 'PayDunya', color: 'bg-emerald-400', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.8)]' },
  { name: 'Paiement à la livraison', color: 'bg-amber-400', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)]' },
  { name: 'Partage WhatsApp', color: 'bg-green-500', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.8)]' },
];

const DEMO_PRODUCTS = [
  { name: 'Boubou brodé', price: '25 000', icon: Shirt, bg: 'from-emerald-100 to-teal-200' },
  { name: 'Montre dorée', price: '18 500', icon: Watch, bg: 'from-amber-100 to-orange-200' },
  { name: 'Sneakers', price: '32 000', icon: Footprints, bg: 'from-sky-100 to-indigo-200' },
  { name: 'Bijoux or', price: '15 000', icon: Gem, bg: 'from-rose-100 to-pink-200' },
];

const PLANS = [
  {
    name: 'Débutant', desc: 'Pour lancer votre première boutique.', price: '0', cta: 'Commencer gratuitement',
    features: ["Jusqu'à 50 produits", 'Frais de transaction : 2%', 'Boutique personnalisée', 'Support par email'],
  },
  {
    name: 'Professionnel', desc: 'Pour les vendeurs en pleine croissance.', price: '5 000', cta: 'Essai gratuit de 14 jours', popular: true,
    features: ['Produits illimités', 'Frais de transaction : 1%', 'Nom de domaine personnalisé', 'Support prioritaire'],
  },
  {
    name: 'Premium', desc: 'Pour les grandes boutiques et agences.', price: '15 000', cta: 'Contacter les ventes',
    features: ['Tout du forfait Pro', 'Frais de transaction : 0.5%', 'Gestion multi-boutiques', 'Account manager dédié'],
  },
];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function Logo() {
  return (
    <Link to="/" className="flex h-10 w-[92px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_20px_rgba(52,211,153,0.25)]">
      <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
    </Link>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 40));

  const links = [
    { href: '#fonctionnalites', label: 'Fonctionnalités' },
    { href: '#comment', label: 'Comment ça marche' },
    { href: '#tarifs', label: 'Tarifs' },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <div className={`w-full max-w-5xl rounded-3xl border transition-all duration-500 ${scrolled ? 'border-white/10 bg-[#04120d]/80 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl' : 'border-white/[0.06] bg-white/[0.03] backdrop-blur-md'}`}>
        <div className="flex items-center justify-between py-2 pl-2 pr-2 md:pr-3">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden items-center gap-1 text-sm font-medium text-slate-300 md:flex">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white">
                  {l.label}
                </a>
              ))}
              <Link to="/boutiques" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white">
                Boutiques <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Nouveau</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:block">
              Se connecter
            </Link>
            <Link
              to="/register"
              onMouseEnter={playPop}
              className="shine-btn rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-sm font-bold text-[#02130c] shadow-[0_0_25px_rgba(52,211,153,0.35)] transition-transform hover:-translate-y-0.5 sm:px-5"
            >
              Créer ma boutique
            </Link>
            <button onClick={() => setOpen(!open)} className="rounded-full p-2 text-slate-300 hover:bg-white/5 md:hidden" aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden md:hidden"
            >
              <div className="flex flex-col gap-1 border-t border-white/5 p-3">
                {links.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5">
                    {l.label}
                  </a>
                ))}
                <Link to="/boutiques" className="rounded-xl px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5">Boutiques près de moi</Link>
                <Link to="/login" className="rounded-xl px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5">Se connecter</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Aurora({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="aurora-blob aurora-1 -left-40 top-0 h-[36rem] w-[36rem] bg-emerald-500/25" />
      <div className="aurora-blob aurora-2 -right-40 top-20 h-[32rem] w-[32rem] bg-cyan-500/20" />
      <div className="aurora-blob aurora-3 bottom-0 left-1/3 h-[28rem] w-[28rem] bg-amber-400/10" />
    </div>
  );
}

function FloatingCard({ children, className = '', delay = 0, float = 10, duration = 6, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay, type: 'spring', stiffness: 180, damping: 16 }}
      style={style}
      className={`absolute z-20 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -float, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl border border-white/10 bg-[#0b1f18]/80 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function PhoneMockup() {
  const [cartCount, setCartCount] = useState(2);
  useEffect(() => {
    const id = setInterval(() => setCartCount((c) => (c >= 5 ? 2 : c + 1)), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-[2.8rem] bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900 p-[9px] shadow-[0_60px_120px_-20px_rgba(16,185,129,0.45)] ring-1 ring-white/10">
      <div className="relative h-[520px] overflow-hidden rounded-[2.25rem] bg-[#f5f7f6] sm:h-[560px]">
        <div className="absolute left-1/2 top-2 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

        {/* En-tête de la boutique */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-4 pb-5 pt-11 text-white">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-emerald-700 shadow-lg">A</div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">Chez Awa Mode</p>
              <p className="flex items-center gap-1 text-[10px] text-emerald-100"><MapPin className="h-3 w-3" /> Dakar, Plateau</p>
            </div>
            <div className="relative rounded-full bg-white/15 p-2">
              <ShoppingBag className="h-4 w-4" />
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-900"
              >
                {cartCount}
              </motion.span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-[11px] text-emerald-50">
            <Search className="h-3.5 w-3.5" /> Rechercher un produit…
          </div>
        </div>

        {/* Catégories */}
        <div className="flex gap-2 px-4 pt-4">
          {['Tout', 'Mode', 'Beauté', 'Tech'].map((c, i) => (
            <span key={c} className={`rounded-full px-3 py-1 text-[10px] font-bold ${i === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>{c}</span>
          ))}
        </div>

        {/* Grille produits */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {DEMO_PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.12, duration: 0.6, ease: EASE }}
                className="rounded-2xl bg-white p-2 shadow-sm"
              >
                <div className={`relative flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br ${p.bg}`}>
                  <Icon className="h-9 w-9 text-slate-700/70" strokeWidth={1.5} />
                  <Heart className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-500/60" />
                </div>
                <p className="mt-2 truncate text-[11px] font-bold text-slate-800">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[11px] font-black text-emerald-700">{p.price} F</p>
                  <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
                    {i === 1 && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />}
                    <Plus className="relative h-3 w-3" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Barre de paiement */}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-900 p-3 text-white shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">{cartCount} articles</span>
            <span className="font-black">43 500 FCFA</span>
          </div>
          <div className="shine-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 py-2.5 text-xs font-black text-slate-900">
            <Wallet className="h-3.5 w-3.5" /> Payer avec Wave
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const rotateY = useTransform(sx, [-1, 1], [-12, 12]);
  const rotateX = useTransform(sy, [-1, 1], [8, -8]);
  const nearX = useTransform(sx, [-1, 1], [-28, 28]);
  const nearY = useTransform(sy, [-1, 1], [-20, 20]);
  const farX = useTransform(sx, [-1, 1], [14, -14]);
  const farY = useTransform(sy, [-1, 1], [10, -10]);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
      className="relative mx-auto flex w-full max-w-[520px] justify-center py-10"
      style={{ perspective: 1200 }}
    >
      {/* Orbites */}
      <div className="orbit orbit-slow h-[440px] w-[440px] border border-emerald-400/15 sm:h-[520px] sm:w-[520px]">
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_6px_rgba(52,211,153,0.6)]" />
      </div>
      <div className="orbit orbit-reverse h-[340px] w-[340px] border border-dashed border-cyan-300/15 sm:h-[400px] sm:w-[400px]">
        <span className="absolute -bottom-1 left-1/4 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_16px_4px_rgba(252,211,77,0.6)]" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-[100px]" />

      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative w-[250px] sm:w-[280px]">
        <PhoneMockup />
      </motion.div>

      {/* Cartes flottantes (profondeur par parallaxe) */}
      <FloatingCard delay={1.6} style={{ x: nearX, y: nearY }} className="-left-2 top-16 sm:-left-12">
        <div className="flex items-center gap-3 pr-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15">
            <Bell className="h-4 w-4 text-emerald-300" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400">Nouvelle commande</p>
            <p className="text-sm font-black text-white">+ 43 500 FCFA</p>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard delay={1.9} float={14} duration={7} style={{ x: farX, y: farY }} className="-right-2 top-40 sm:-right-4">
        <div className="flex items-center gap-2.5 pr-1">
          <CircleCheck className="h-8 w-8 text-sky-300" />
          <div>
            <p className="text-[10px] font-medium text-slate-400">Paiement reçu</p>
            <p className="text-xs font-bold text-white">via Wave · 2 s</p>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard delay={2.2} float={8} duration={5} style={{ x: nearX, y: farY }} className="bottom-24 -left-4 hidden sm:block sm:-left-10">
        <p className="mb-2 text-[10px] font-medium text-slate-400">Livraison · Code PIN</p>
        <div className="flex items-center gap-1.5">
          {[4, 8, 2, 7].map((d, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 + i * 0.2 }}
              className="flex h-7 w-6 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/10 text-xs font-black text-emerald-200"
            >
              {d}
            </motion.span>
          ))}
          <Check className="ml-1 h-4 w-4 text-emerald-400" />
        </div>
      </FloatingCard>

      <FloatingCard delay={2.5} float={12} duration={8} style={{ x: farX, y: nearY }} className="-right-4 bottom-16 hidden sm:block sm:-right-8">
        <p className="mb-2 flex items-center gap-1 text-[10px] font-medium text-slate-400"><TrendingUp className="h-3 w-3 text-emerald-400" /> Ventes de la semaine</p>
        <div className="flex h-12 items-end gap-1">
          {[35, 55, 40, 70, 60, 85, 100].map((h, i) => (
            <motion.span
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 2.8 + i * 0.08, duration: 0.8, ease: EASE }}
              className="w-3 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-300"
            />
          ))}
        </div>
      </FloatingCard>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef(null);
  const onMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <section ref={ref} onMouseMove={onMouseMove} className="relative flex min-h-screen items-center overflow-hidden pb-20 pt-32" style={{ '--mx': '50%', '--my': '30%' }}>
      <Aurora />
      <div className="bg-grid-pattern absolute inset-0" />
      <ParticleField className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(600px circle at var(--mx) var(--my), rgba(16,185,129,0.10), transparent 60%)' }} />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-6 lg:grid-cols-2 lg:gap-4">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="conic-border mb-8 rounded-full bg-white/[0.04] px-4 py-1.5 backdrop-blur"
          >
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Nouveau : SamaBoutik v2.0
            </span>
          </motion.div>

          <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            <BlurWords text="La plateforme e-commerce" delay={0.2} />
            <br className="hidden md:block" />{' '}
            <motion.span
              initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
              animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1.2, delay: 0.7, ease: EASE }}
              className="text-shimmer inline-block pb-2"
            >
              des vendeurs ambitieux.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 1, ease: EASE }}
            className="mb-10 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl"
          >
            Sécurisez vos paiements, gérez vos stocks en temps réel et coordonnez vos livraisons grâce à notre solution tout-en-un.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2, ease: EASE }}
            className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row"
          >
            <Magnetic className="w-full sm:w-auto">
              <Link
                to="/register"
                onMouseEnter={playPop}
                className="shine-btn group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 px-8 py-4 text-base font-black text-[#02130c] shadow-[0_0_40px_rgba(52,211,153,0.45)] transition-shadow hover:shadow-[0_0_60px_rgba(52,211,153,0.7)] sm:w-auto"
              >
                Commencer gratuitement
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto" strength={0.2}>
              <a
                href="#comment"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10 sm:w-auto"
              >
                Voir comment ça marche
              </a>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400 lg:justify-start"
          >
            {['Gratuit pour démarrer', 'Wave & Orange Money', 'Prête en 2 minutes'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> {t}</span>
            ))}
          </motion.div>
        </div>

        <HeroVisual />
      </div>

      {/* Indicateur de scroll */}
      <motion.a
        href="#paiements"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block"
        aria-label="Défiler vers le bas"
      >
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/20 pt-2">
          <motion.span animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="h-2 w-1 rounded-full bg-emerald-400" />
        </div>
      </motion.a>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#030a07]" />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Moyens de paiement                                                  */
/* ------------------------------------------------------------------ */

function PaymentMarquee() {
  const items = [...PAYMENT_METHODS, ...PAYMENT_METHODS, ...PAYMENT_METHODS];
  return (
    <section id="paiements" className="relative overflow-hidden border-y border-white/5 py-14">
      <p className="mb-8 text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
        Paiements & outils intégrés
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#030a07] to-transparent md:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#030a07] to-transparent md:w-40" />
        <div className="marquee-track gap-4">
          {[...items, ...items].map((m, i) => (
            <div key={i} className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.06]">
              <span className={`h-3 w-3 rounded-full ${m.color} ${m.glow}`} />
              <span className="whitespace-nowrap text-lg font-bold text-slate-200">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tableau de bord (rotation 3D au scroll)                             */
/* ------------------------------------------------------------------ */

function DashboardShowcase() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.82, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [120, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0.1, 1]);

  return (
    <section className="relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-16 text-center">
          <SectionLabel>Tableau de bord</SectionLabel>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl">
            Gardez le contrôle total <br className="hidden md:block" />
            <span className="text-shimmer">sur votre activité.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Un tableau de bord puissant, conçu pour vous donner une vue d'ensemble instantanée sur vos ventes, vos livraisons et vos performances.
          </p>
        </Reveal>

        <div ref={ref} style={{ perspective: 1400 }} className="relative mx-auto max-w-6xl">
          <div className="absolute inset-x-10 top-10 -z-0 h-3/4 rounded-full bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-amber-400/20 blur-[100px]" />
          <motion.div
            style={{ rotateX, scale, y, opacity, transformOrigin: 'center top' }}
            className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-2 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.8)] backdrop-blur md:rounded-[2rem]"
          >
            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white md:rounded-[1.5rem]">
              <div className="flex h-10 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 md:h-12 md:px-5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
                <div className="mx-auto flex items-center gap-2 rounded-full bg-white px-4 py-1 font-mono text-[11px] text-slate-500 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> admin.samaboutik.sn
                </div>
              </div>
              <img src="/dashboard-preview.png" alt="Interface du tableau de bord SamaBoutik" className="h-auto w-full" loading="lazy" />
            </div>

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8, ease: EASE }}
              className="absolute -left-4 top-1/3 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1f18]/90 px-4 py-3 shadow-2xl backdrop-blur-xl md:flex lg:-left-12"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-bold text-white">Commandes en temps réel</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
              className="absolute -right-4 bottom-1/4 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1f18]/90 px-4 py-3 shadow-2xl backdrop-blur-xl md:flex lg:-right-12"
            >
              <Truck className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-bold text-white">Livreurs synchronisés</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Fonctionnalités (bento animé)                                       */
/* ------------------------------------------------------------------ */

function BentoCard({ icon: Icon, title, desc, children, className = '', delay = 0 }) {
  return (
    <Reveal delay={delay} className={className}>
      <SpotlightCard className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6 md:p-8">
        <div className="mb-6 min-h-[180px] flex-1">{children}</div>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
          <Icon className="h-5 w-5 text-emerald-300" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
        <p className="leading-relaxed text-slate-400">{desc}</p>
      </SpotlightCard>
    </Reveal>
  );
}

function StoreBuilderDemo() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07140f] p-4">
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 font-mono text-xs text-slate-300 md:text-sm">
        <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="typewriter">samaboutik.sn/boutique/chez-awa</span>
      </div>
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        {DEMO_PRODUCTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 + i * 0.25, type: 'spring', stiffness: 200, damping: 14 }}
              className="rounded-xl bg-white/[0.06] p-1.5 md:p-2"
            >
              <div className={`flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br ${p.bg}`}>
                <Icon className="h-6 w-6 text-slate-700/70" strokeWidth={1.5} />
              </div>
              <div className="mt-2 h-1.5 w-3/4 rounded bg-white/20" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-emerald-400/50" />
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 2.4 }}
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-400/10 py-2 text-xs font-bold text-emerald-300"
      >
        <Rocket className="h-3.5 w-3.5" /> Boutique en ligne !
      </motion.div>
    </div>
  );
}

function MobileMoneyDemo() {
  const chips = [
    { name: 'Wave', cls: 'bg-sky-400/15 text-sky-300 border-sky-400/30', pos: 'left-0 top-2' },
    { name: 'Orange Money', cls: 'bg-orange-400/15 text-orange-300 border-orange-400/30', pos: 'right-0 top-10' },
    { name: 'Free Money', cls: 'bg-red-400/15 text-red-300 border-red-400/30', pos: 'left-4 bottom-2' },
  ];
  return (
    <div className="relative flex h-full min-h-[180px] items-center justify-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
        <span className="absolute -inset-4 rounded-full border border-emerald-400/20" />
        <span className="absolute -inset-9 rounded-full border border-emerald-400/10" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_40px_rgba(52,211,153,0.6)]">
          <CreditCard className="h-7 w-7 text-[#02130c]" />
        </div>
      </div>
      {chips.map((c, i) => (
        <motion.span
          key={c.name}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}
          className={`absolute ${c.pos}`}
        >
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
            className={`block rounded-full border px-3 py-1 text-xs font-bold ${c.cls}`}
          >
            {c.name}
          </motion.span>
        </motion.span>
      ))}
    </div>
  );
}

const ROUTE = 'M 30 150 C 80 150, 70 70, 140 80 S 220 40, 270 30';

function DeliveryMapDemo() {
  return (
    <div className="relative h-full min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#07140f]">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      <svg viewBox="0 0 300 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        <path d={ROUTE} fill="none" stroke="rgba(52,211,153,0.15)" strokeWidth="6" strokeLinecap="round" />
        <motion.path
          d={ROUTE}
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
        <circle cx="30" cy="150" r="6" fill="#fbbf24" />
        <circle cx="270" cy="30" r="7" fill="#34d399" />
        <circle cx="270" cy="30" r="14" fill="none" stroke="#34d399" strokeOpacity="0.4">
          <animate attributeName="r" values="7;18;7" dur="2s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <g>
          <circle r="8" fill="#fff" />
          <circle r="4" fill="#10b981" />
          <animateMotion dur="4s" repeatCount="indefinite" path={ROUTE} />
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur">
        <MapPin className="h-3 w-3" /> En route · GPS
      </div>
    </div>
  );
}

function PinDemo() {
  const digits = ['4', '8', '2', '7'];
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-5">
      <div className="flex gap-2.5">
        {digits.map((d, i) => (
          <motion.div
            key={i}
            initial={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
            whileInView={{ borderColor: 'rgba(52,211,153,0.6)', backgroundColor: 'rgba(52,211,153,0.1)' }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.35, duration: 0.3 }}
            className="flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-black text-white"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.3 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.35, type: 'spring', stiffness: 400 }}
            >
              {d}
            </motion.span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 2, type: 'spring' }}
        className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-1.5 text-sm font-bold text-emerald-300"
      >
        <CircleCheck className="h-4 w-4" /> Livraison confirmée
      </motion.div>
    </div>
  );
}

function WhatsAppDemo() {
  const lines = ['🛍️ Nouvelle commande', '👤 Fatou · Dakar', '💰 Total : 43 500 FCFA', '🔐 Code : 4827'];
  return (
    <div className="flex h-full min-h-[180px] flex-col justify-center">
      <div className="max-w-[240px] rounded-2xl rounded-tl-sm bg-[#1f3a2e] p-3 shadow-lg">
        {lines.map((l, i) => (
          <motion.p
            key={l}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.3 }}
            className="text-sm text-emerald-50"
          >
            {l}
          </motion.p>
        ))}
        <p className="mt-1 text-right text-[10px] text-emerald-200/60">12:04 ✓✓</p>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.8 }}
        className="ml-auto mt-3 flex items-center gap-1 rounded-2xl rounded-tr-sm bg-white/10 px-3 py-2 text-sm text-white"
      >
        Bien reçu, merci ! 🙏
      </motion.div>
    </div>
  );
}

function Features() {
  return (
    <section id="fonctionnalites" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-16 max-w-2xl">
          <SectionLabel>Fonctionnalités</SectionLabel>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Tout ce qu'il faut pour vendre, <span className="text-shimmer">rien de superflu.</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <BentoCard className="md:col-span-2" icon={Zap} title="Votre boutique en ligne en 2 minutes" desc="Ajoutez vos produits et générez une vitrine élégante, prête à partager, en quelques clics.">
            <StoreBuilderDemo />
          </BentoCard>
          <BentoCard delay={0.1} icon={Wallet} title="Mobile Money intégré" desc="Encaissez via Wave, Orange Money ou Free Money. Chaque transaction est vérifiée.">
            <MobileMoneyDemo />
          </BentoCard>
          <BentoCard icon={Truck} title="Livreurs suivis en direct" desc="Assignez vos livreurs et suivez chaque course grâce à la position GPS du client.">
            <DeliveryMapDemo />
          </BentoCard>
          <BentoCard delay={0.1} icon={ShieldCheck} title="Code PIN anti-fraude" desc="La livraison n'est validée que lorsque le client communique son code secret.">
            <PinDemo />
          </BentoCard>
          <BentoCard delay={0.2} icon={MessageCircle} title="Commandes sur WhatsApp" desc="Chaque commande peut être partagée en un clic à vos clients et à votre équipe.">
            <WhatsAppDemo />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Écosystème : Client → Marchand → Livreur                            */
/* ------------------------------------------------------------------ */

function Ecosystem() {
  return (
    <section id="ecosysteme" className="relative scroll-mt-10 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-12 text-center">
          <SectionLabel>Écosystème connecté</SectionLabel>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Trois acteurs. <span className="text-shimmer">Une seule plateforme.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Chaque commande circule en temps réel entre vos clients, votre boutique et vos livreurs, jusqu'à la remise sécurisée par code PIN.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] px-4 py-10 md:px-10 md:py-14">
            <div className="aurora-blob aurora-1 -left-20 -top-20 h-72 w-72 bg-sky-500/10" />
            <div className="aurora-blob aurora-2 -right-20 bottom-0 h-72 w-72 bg-amber-400/10" />
            <div className="bg-grid-pattern absolute inset-0" />
            <FlowAnimation className="relative mx-auto max-w-4xl" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Comment ça marche (ligne tracée au scroll)                          */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const steps = [
    { title: 'Création instantanée', desc: 'Ajoutez vos produits et générez une vitrine en quelques clics.', image: '/card-creation.jpg', icon: Store },
    { title: 'Paiement sécurisé', desc: 'Encaissez via Mobile Money. Chaque transaction est vérifiée.', image: '/card-payment.jpg', icon: Lock },
    { title: 'Livraison suivie', desc: "Assignez vos livreurs et suivez l'acheminement en temps réel.", image: '/card-delivery.jpg', icon: Truck },
  ];

  return (
    <section id="comment" ref={ref} className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-20 text-center">
          <SectionLabel>Comment ça marche</SectionLabel>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Trois étapes. <span className="text-shimmer">Zéro prise de tête.</span>
          </h2>
        </Reveal>

        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          <div className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-white/10 md:block">
            <motion.div style={{ scaleX: lineScale }} className="h-full origin-left bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </div>

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 0.15} className="flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className="relative z-10 mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-[#06150f] shadow-[0_0_30px_rgba(52,211,153,0.3)]"
                >
                  <Icon className="h-6 w-6 text-emerald-300" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-black text-slate-900">{i + 1}</span>
                </motion.div>
                <SpotlightCard className="group w-full overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                    <img src={s.image} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="px-3 pb-4 pt-6">
                    <h3 className="mb-2 text-xl font-bold text-white">{s.title}</h3>
                    <p className="text-slate-400">{s.desc}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cas d'usage (onglets)                                               */
/* ------------------------------------------------------------------ */

function UseCases() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-16">
          <SectionLabel>Cas d'usage</SectionLabel>
          <h2 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Un impact direct sur toutes les strates de votre entreprise.
          </h2>
        </Reveal>

        <div className="flex flex-col gap-10 md:flex-row">
          <div className="flex w-full flex-col gap-2 md:w-1/3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative rounded-2xl p-6 text-left transition-colors"
                >
                  {active && (
                    <motion.div
                      layoutId="tab-highlight"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="absolute inset-0 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] shadow-[0_0_30px_rgba(52,211,153,0.12)]"
                    />
                  )}
                  <div className="relative flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? 'bg-emerald-400 text-[#02130c]' : 'bg-white/5 text-slate-400'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className={`text-lg font-bold transition-colors ${active ? 'text-white' : 'text-slate-400'}`}>{tab.title}</h3>
                  </div>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative mt-3 overflow-hidden text-sm leading-relaxed text-slate-300"
                      >
                        {tab.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          <div className="w-full md:w-2/3">
            <div className="relative flex h-[400px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-8">
              <div className="aurora-blob aurora-1 right-0 top-0 h-64 w-64 bg-emerald-500/20" />
              <div className="aurora-blob aurora-2 bottom-0 left-0 h-64 w-64 bg-cyan-500/15" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="relative z-10 w-full"
                >
                  {activeTab === '01' && <SellerMock />}
                  {activeTab === '02' && <DriverMock />}
                  {activeTab === '03' && <CustomerMock />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SellerMock() {
  const orders = [
    { name: 'Fatou D.', amount: '43 500', status: 'Payée', cls: 'bg-emerald-400/15 text-emerald-300' },
    { name: 'Moussa K.', amount: '18 000', status: 'En livraison', cls: 'bg-amber-400/15 text-amber-300' },
    { name: 'Aïcha B.', amount: '27 250', status: 'Nouvelle', cls: 'bg-sky-400/15 text-sky-300' },
  ];
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1f18]/90 p-5 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
        <p className="font-bold text-white">Commandes du jour</p>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-300">+3</span>
      </div>
      <div className="space-y-2.5">
        {orders.map((o, i) => (
          <motion.div
            key={o.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
          >
            <div>
              <p className="text-sm font-bold text-white">{o.name}</p>
              <p className="text-xs text-slate-400">{o.amount} FCFA</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${o.cls}`}>{o.status}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DriverMock() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#0b1f18]/90 p-5 shadow-2xl backdrop-blur">
      <div className="mb-4 h-40 overflow-hidden rounded-xl">
        <DeliveryMapDemo />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Livraison #4029</p>
          <p className="text-xs text-slate-400">En cours d'acheminement</p>
        </div>
        <span className="rounded bg-emerald-400/15 px-2 py-1 text-xs font-bold text-emerald-300">Actif</span>
      </div>
      <div className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-sm font-black text-[#02130c]">
        Valider la livraison
      </div>
    </div>
  );
}

function CustomerMock() {
  return (
    <div className="flex items-center justify-center gap-4">
      {DEMO_PRODUCTS.slice(0, 2).map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.name}
            initial={{ rotate: 0, y: 20 }}
            animate={{ rotate: i === 0 ? -6 : 4, y: i === 0 ? 16 : 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 14 }}
            className={`w-40 rounded-2xl bg-white p-3 shadow-2xl sm:w-48 ${i === 1 ? 'z-10' : ''}`}
          >
            <div className={`mb-3 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br sm:h-32 ${p.bg}`}>
              <Icon className="h-12 w-12 text-slate-700/70" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-slate-800">{p.name}</p>
            <div className="mb-3 flex items-center gap-1 text-amber-400">
              {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-3 w-3 fill-current" />)}
            </div>
            <div className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold text-white ${i === 1 ? 'bg-emerald-600' : 'bg-slate-900'}`}>
              {i === 1 ? 'Ajouter au panier' : `${p.price} FCFA`}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Résultats                                                           */
/* ------------------------------------------------------------------ */

function Metrics() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-12 text-center">
          <SectionLabel>Résultats mesurables</SectionLabel>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Reveal className="md:row-span-2">
            <SpotlightCard className="relative flex h-full flex-col justify-center overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-transparent p-10 md:p-12">
              <div className="aurora-blob aurora-3 -right-20 -top-20 h-80 w-80 bg-emerald-500/25" />
              <ShieldCheck className="relative mb-6 h-12 w-12 text-emerald-300" />
              <p className="relative mb-4 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent md:text-8xl">
                <CountUp to={99.9} decimals={1} suffix="%" />
              </p>
              <p className="relative text-lg text-slate-300">Fiabilité des transactions et disponibilité de la plateforme.</p>
            </SpotlightCard>
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-2">
            <SpotlightCard className="flex h-full flex-col gap-2 rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-8 md:flex-row md:items-center md:gap-10 md:p-10">
              <p className="text-6xl font-extrabold text-white md:text-7xl"><CountUp to={3} suffix="x" /></p>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Croissance</p>
                <p className="text-slate-400">En moyenne, nos marchands voient leurs ventes tripler grâce à la simplification du processus d'achat.</p>
              </div>
            </SpotlightCard>
          </Reveal>
          <Reveal delay={0.2} className="md:col-span-2">
            <SpotlightCard className="flex h-full flex-col gap-2 rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-8 md:flex-row md:items-center md:gap-10 md:p-10">
              <p className="flex items-baseline gap-2 text-6xl font-extrabold text-white md:text-7xl">
                <Clock className="h-10 w-10 self-center text-amber-300" />
                &lt;<CountUp to={2} /><span className="text-3xl text-slate-400">min</span>
              </p>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Déploiement</p>
                <p className="text-slate-400">Le temps moyen nécessaire pour créer une boutique complète et encaisser sa première vente.</p>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tarifs                                                              */
/* ------------------------------------------------------------------ */

function Pricing() {
  return (
    <section id="tarifs" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-16 text-center">
          <SectionLabel>Tarifs simples et transparents</SectionLabel>
          <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            Payez uniquement <span className="text-shimmer">quand vous encaissez.</span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.12} className={plan.popular ? 'md:-translate-y-4' : ''}>
              <motion.div whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={`h-full rounded-[2rem] ${plan.popular ? 'conic-border' : ''}`}>
                <SpotlightCard
                  className={`relative flex h-full flex-col rounded-[2rem] p-8 ${plan.popular
                    ? 'bg-gradient-to-b from-[#0b2a1f] to-[#06150f] shadow-[0_30px_80px_-20px_rgba(52,211,153,0.35)]'
                    : 'border border-white/[0.08] bg-white/[0.03]'}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                      Le plus populaire
                    </span>
                  )}
                  <h3 className="mb-2 text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mb-6 text-sm text-slate-400">{plan.desc}</p>
                  <div className="mb-8 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">{plan.price} FCFA</span>
                    <span className="text-slate-500">/mois</span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.popular ? 'bg-emerald-400 text-[#02130c]' : 'bg-emerald-400/15 text-emerald-300'}`}>
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all ${plan.popular
                      ? 'shine-btn bg-gradient-to-r from-emerald-400 to-teal-400 text-[#02130c] shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:shadow-[0_0_45px_rgba(52,211,153,0.6)]'
                      : 'border border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10'}`}
                  >
                    {plan.cta}
                  </Link>
                </SpotlightCard>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Appel à l'action final + pied de page                               */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="relative px-4 py-20 md:px-6">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-emerald-900/60 via-[#06150f] to-[#030a07] px-6 py-20 text-center md:py-28">
          <Aurora />
          <ParticleField className="absolute inset-0 h-full w-full" density={50} color="253, 230, 138" />
          <div className="relative z-10">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.5)]"
            >
              <Sparkles className="h-8 w-8 text-slate-900" />
            </motion.div>
            <h2 className="mx-auto mb-6 max-w-3xl text-4xl font-extrabold tracking-tight text-white md:text-6xl">
              L'innovation e-commerce <br className="hidden md:block" />
              <span className="text-shimmer">au rythme de votre ambition.</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-slate-300">
              Rejoignez les vendeurs qui ont déjà digitalisé leur commerce. Votre boutique vous attend.
            </p>
            <Magnetic>
              <Link
                to="/register"
                onMouseEnter={playPop}
                className="shine-btn group inline-flex items-center gap-2 rounded-full bg-white px-10 py-5 text-lg font-black text-[#02130c] shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-shadow hover:shadow-[0_0_80px_rgba(52,211,153,0.6)]"
              >
                Créer ma boutique gratuitement
                <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const columns = [
    { title: 'Produit', links: [['Fonctionnalités', '#fonctionnalites'], ['Tarifs', '#tarifs'], ['Sécurité', '#fonctionnalites']] },
    { title: 'Ressources', links: [['Documentation', '#'], ['Blog', '#'], ['Support', '#']] },
    { title: 'Légal', links: [['Confidentialité', '#'], ['Conditions', '#']] },
  ];
  return (
    <footer className="border-t border-white/5 py-16 text-slate-400">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 md:grid-cols-5">
        <div className="col-span-2">
          <Logo />
          <p className="mb-8 mt-6 max-w-xs text-sm text-slate-500">La plateforme e-commerce moderne pour les entrepreneurs sénégalais.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-bold text-white">{col.title}</h4>
            <ul className="space-y-3 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}><a href={href} className="transition-colors hover:text-emerald-300">{label}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/5 px-6 pt-8 text-xs text-slate-500 md:flex-row">
        <p>© {new Date().getFullYear()} SamaBoutik. Tous droits réservés.</p>
        <div className="flex items-center gap-2 font-mono">
          Statut : tous les systèmes sont opérationnels
          <span className="relative ml-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        </div>
      </div>
    </footer>
  );
}

function LiveToast() {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cycle = () => {
      setCurrent(FAKE_NOTIFICATIONS[Math.floor(Math.random() * FAKE_NOTIFICATIONS.length)]);
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };
    const initialTimer = setTimeout(cycle, 3000);
    const interval = setInterval(cycle, 15000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-50 hidden sm:block">
      <AnimatePresence>
        {visible && current && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(5px)' }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="pointer-events-auto flex max-w-sm items-start gap-4 rounded-2xl border border-white/10 bg-[#0b1f18]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
              <Bell className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {current.name} <span className="text-xs font-normal text-slate-400">({current.city})</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-300">{current.action}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{current.time}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-[#030a07] text-slate-200 selection:bg-emerald-400/30 selection:text-white">
        <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300" />
        <Navbar />
        <Hero />
        <PaymentMarquee />
        <DashboardShowcase />
        <Features />
        <Ecosystem />
        <HowItWorks />
        <UseCases />
        <Metrics />
        <Pricing />
        <FinalCTA />
        <Footer />
        <LiveToast />
      </div>
    </MotionConfig>
  );
}
