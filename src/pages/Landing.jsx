import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig, useInView, useReducedMotion, useScroll, useMotionValueEvent, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Check, Menu, X, ShieldCheck, Bike, BarChart3, Users, Rocket, Zap, Gem,
  ChevronDown, Banknote, Bell, LayoutDashboard, Store, ShoppingBag, UserRound, ChevronLeft, ChevronRight,
  Pause, Play, RotateCcw, Calculator, Clock, Package, Truck, Smartphone, Wallet, QrCode, MapPin,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { SHOP_THEMES, getShopTheme } from '../components/shop/themes';
import { PLAN_FEATURES } from '../utils/plans';
import { BRAND } from '../utils/brand';
import { useFinePointer } from '../utils/motion';
import { Magnetic, SpotlightCard } from '../components/landing/Magic';
import ScrollProgress from '../components/motion/ScrollProgress';
import RollingNumber from '../components/motion/RollingNumber';
import Logo from '../components/brand/Logo';
import InstallAppButton from '../components/InstallApp';
import { PAYMENT_CHOICES, depositFor } from '../utils/payments';
import {
  QrCode as DuoQrCode, ChartBar as DuoChart, Wallet as DuoWallet, Images as DuoImages, Users as DuoUsers,
  MapTrifold as DuoMap, MapPin as DuoPin, SealCheck as DuoSeal, Star as DuoStar, Megaphone as DuoMegaphone,
  WhatsApp as DuoWhatsApp, LockKey as DuoLock, Truck as DuoTruck,
} from '../components/dashboard/icons';

const EASE = [0.16, 1, 0.3, 1];
// ?v=3 : captures refaites (tableau de bord « nuit de Dakar ») ; le numéro force les navigateurs à oublier les anciennes.
const SCREEN = (name) => `/images/landing/screens/${name}.webp?v=3`;
const photoSet = (name) => `/images/landing/${name}-640.webp 640w, /images/landing/${name}-1024.webp 1024w, /images/landing/${name}.webp 1400w`;

// Boutiques de démonstration affichées pour chaque thème (captures du vrai produit).
const DEMO_SHOPS = { emeraude: 'Chez Awa', minuit: 'Maison Diouf', terracotta: 'Wax & Couture', ocean: 'Tech Plateau', rose: 'Belle Peau', epure: 'Studio Fall' };

// Mêmes limites que le tableau de bord du marchand (onglet Facturation).
const PLANS = [
  {
    id: 'debutant', name: 'Débutant', price: '0', desc: 'Pour lancer votre première boutique.', icon: Rocket, cta: 'Commencer gratuitement', plan: null,
    features: PLAN_FEATURES.debutant,
  },
  {
    id: 'pro', name: 'Pro', price: '5 000', desc: 'Pour les commerçants qui vendent chaque jour.', icon: Zap, cta: 'Choisir Pro', plan: 'pro', popular: true,
    features: PLAN_FEATURES.pro,
  },
  {
    id: 'premium', name: 'Premium', price: '15 000', desc: 'Pour les grandes boutiques et les équipes.', icon: Gem, cta: 'Choisir Premium', plan: 'premium',
    features: PLAN_FEATURES.premium,
  },
];

// Commission sur les paiements Wave / Orange Money : même taux que server/routes/payment.js.
// Le paiement à la livraison est sans commission.
const ONLINE_COMMISSION_RATE = 0.05;

const FAQ = [
  { q: 'Combien coûte SamaBoutik ?', a: "Le forfait Débutant est gratuit, sans carte bancaire : vous créez votre boutique et vendez tout de suite. Les forfaits Pro (5 000 F/mois) et Premium (15 000 F/mois) débloquent plus de produits, plus de livreurs et, pour Pro et Premium, la mise en avant dans l'annuaire. Seule commission, quel que soit le forfait : 5 % sur les ventes payées par paiement mobile (Wave, Orange Money, Free Money, Wizall). Le paiement à la livraison est sans commission." },
  { q: 'Faut-il savoir créer un site internet ?', a: 'Non. Vous choisissez un nom et un thème, ajoutez vos produits avec une photo et un prix depuis votre téléphone, et votre vitrine est en ligne. Vous la partagez par lien, QR code ou sur WhatsApp.' },
  { q: 'Comment est-ce que je reçois mon argent ?', a: "Pour un paiement mobile (Wave, Orange Money, Free Money ou Wizall), l'argent est reversé automatiquement sur le numéro indiqué dans vos paramètres, moins une commission de 5 %. Pour un paiement à la livraison, votre livreur encaisse directement auprès du client et SamaBoutik ne prélève rien." },
  { q: 'À quoi sert le code de livraison ?', a: "Chaque commande reçoit un code à 4 chiffres envoyé au client. Le livreur ne peut valider la livraison qu'avec ce code : le colis est remis à la bonne personne." },
  { q: 'Puis-je travailler avec mes propres livreurs ?', a: 'Oui. Vous ajoutez vos livreurs dans votre tableau de bord ; ils se connectent avec leur téléphone, acceptent les courses et partagent leur position pour que le client les suive en direct.' },
  { q: 'Mes clients doivent-ils créer un compte ?', a: 'Non. Ils commandent avec leur nom, leur téléphone et leur adresse, puis suivent leur commande avec leur numéro et leur code de livraison.' },
];

const registerHref = (themeId, plan) => {
  const params = new URLSearchParams();
  if (themeId) params.set('theme', themeId);
  if (plan) params.set('plan', plan);
  return `/register?${params.toString()}`;
};

/* ------------------------------------------------------------------ */
/* Éléments communs                                                    */
/* ------------------------------------------------------------------ */

// Section construite seulement à l'approche du visiteur : la page s'affiche plus vite
// sur les téléphones modestes. Les liens du menu font tout apparaître avant de défiler.
const SHOW_ALL = 'landing:afficher-tout';
function Deferred({ id, minHeight = 700, children }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show) return undefined;
    const reveal = () => setShow(true);
    window.addEventListener(SHOW_ALL, reveal);
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) reveal(); }, { rootMargin: '900px 0px' });
      if (ref.current) io.observe(ref.current);
    } else reveal();
    return () => { window.removeEventListener(SHOW_ALL, reveal); io?.disconnect(); };
  }, [show]);
  return (
    <div id={id} ref={ref} className="scroll-mt-16" style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}

// Lien interne : affiche toutes les sections, puis défile jusqu'à la cible.
function goTo(event, hash) {
  event.preventDefault();
  window.dispatchEvent(new Event(SHOW_ALL));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', hash);
  }));
}

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: EASE, delay }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionTitle({ kicker, title, text, light = false, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <p className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${light ? 'text-brand-300' : 'text-brand-700'}`}>{kicker}</p>
      <h2 className={`text-balance text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl ${light ? 'text-white' : 'text-ink'}`}>{title}</h2>
      {text && <p className={`mt-5 text-lg leading-relaxed ${light ? 'text-white/70' : 'text-slate-600'}`}>{text}</p>}
    </div>
  );
}

const Em = ({ children, light = false }) => <span className={`font-editorial ${light ? 'text-brand-300' : 'text-brand-600'}`}>{children}</span>;

// Cadre de téléphone réaliste autour d'une capture du vrai produit.
function PhoneFrame({ src, alt, className = '', eager = false, children }) {
  return (
    <div className={`relative rounded-[2.6rem] bg-[#111] p-[9px] shadow-[0_50px_90px_-40px_color-mix(in_srgb,_var(--color-ink)_75%,_transparent),inset_0_0_0_1.5px_rgba(255,255,255,0.08)] ${className}`}>
      <div className="relative aspect-[390/844] overflow-hidden rounded-[2.05rem] bg-white">
        {src ? (
          <img src={src} alt={alt} width="600" height="1299" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : children}
        <span className="absolute left-1/2 top-2 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
      </div>
      <span className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-[#2a2a2a]" aria-hidden="true" />
      <span className="absolute -right-[3px] top-36 h-16 w-[3px] rounded-r bg-[#2a2a2a]" aria-hidden="true" />
    </div>
  );
}

// Fenêtre de navigateur autour d'une capture du tableau de bord.
function BrowserFrame({ children, url = 'samaboutik-nine.vercel.app/dashboard' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_60px_120px_-50px_color-mix(in_srgb,_var(--color-ink)_55%,_transparent)]">
      <div className="flex items-center gap-3 border-b border-black/5 bg-[#f4f5f4] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></span>
        <span className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-black/5">
          <ShieldCheck className="h-3 w-3 text-brand-600" /> {url}
        </span>
        <span className="w-12" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation : îlot flottant en verre sombre                           */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Téléphone : le bouton d'inscription de l'en-tête n'apparaît qu'une fois le grand bouton du héros dépassé.
  const [pastHero, setPastHero] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => {
    setScrolled(v > 20);
    setPastHero(v > 560);
  });
  const links = [
    { href: '#produit', label: 'Produit' },
    { href: '#parcours', label: 'Comment ça marche' },
    { href: '#themes', label: 'Thèmes' },
    { href: '#tarifs', label: 'Tarifs' },
    { href: '#faq', label: 'Questions' },
  ];
  const solid = scrolled || open;
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className={`mx-auto max-w-6xl rounded-[1.6rem] transition-[background-color,box-shadow] duration-500 ${solid ? 'bg-[#0c0a26]/80 shadow-[0_24px_60px_-28px_rgba(8,6,30,0.9)] ring-1 ring-white/10 backdrop-blur-xl' : 'bg-white/[0.04] ring-1 ring-white/[0.09] backdrop-blur-md'}`}>
        <nav className="flex h-14 items-center justify-between pl-4 pr-2 sm:h-[60px] sm:pl-5" aria-label="Navigation principale">
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center" aria-label="SamaBoutik, accueil">
              <Logo variant="dark" markClassName="h-8 w-8 sm:h-9 sm:w-9" textClassName="text-lg sm:text-xl" />
            </Link>
            <div className="hidden items-center xl:flex">
              {links.map((l) => <a key={l.href} href={l.href} onClick={(e) => goTo(e, l.href)} className="whitespace-nowrap rounded-full px-3 py-2 text-[14.5px] font-semibold text-white/65 transition-colors hover:text-white">{l.label}</a>)}
              <Link to="/boutiques" className="whitespace-nowrap rounded-full px-3 py-2 text-[14.5px] font-semibold text-white/65 transition-colors hover:text-white">Boutiques près de moi</Link>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <InstallAppButton variant="nav" label="Installer l’app" labelClassName="xl:sr-only" className="hidden md:inline-flex xl:px-2.5" />
            <Link to="/login" className="hidden whitespace-nowrap rounded-full px-4 py-2.5 text-[14.5px] font-semibold text-white/80 transition-colors hover:text-white sm:block">Se connecter</Link>
            <AnimatePresence initial={false}>
              {pastHero && !open && (
                <motion.span key="cta-mobile" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="sm:hidden">
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-gold inline-flex whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-extrabold">
                    Commencer
                  </Link>
                </motion.span>
              )}
            </AnimatePresence>
            <Link to="/register" className="btn-gold hidden items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-extrabold sm:inline-flex">
              Créer ma boutique <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => setOpen(!open)} className="rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white xl:hidden" aria-label="Menu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden xl:hidden">
              <div className="flex flex-col gap-1 px-3 pb-4">
                {links.map((l) => <a key={l.href} href={l.href} onClick={(e) => { setOpen(false); goTo(e, l.href); }} className="rounded-xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white">{l.label}</a>)}
                <Link to="/boutiques" className="rounded-xl px-4 py-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white">Boutiques près de moi</Link>
                <InstallAppButton variant="glass" className="mt-2 !py-3 !text-sm" />
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                  <Link to="/login" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-full bg-white/5 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/10">Se connecter</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-gold inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-extrabold">Créer ma boutique</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Héros : scène « nuit de Dakar »                                      */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = [
  { icon: <img src="/logos/whatsapp.svg" alt="" className="h-5 w-5" />, title: 'Nouvelle commande', text: 'Fatou D. · Robe wax · 19 500 F', time: 'à l’instant' },
  { icon: <img src="/logos/wave.png" alt="" className="h-4 w-auto" />, title: 'Paiement Wave reçu', text: '38 000 F · commande #A4F2', time: 'il y a 2 min' },
  { icon: <Bike className="h-5 w-5 text-sky-600" />, title: 'Livreur en route', text: 'Lamine arrive dans 6 min', time: 'il y a 5 min' },
  { icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />, title: 'Commande livrée', text: 'Code client 4827 validé', time: 'il y a 9 min' },
];

// Le titre se termine par un lieu qui change : « prête à vendre au Sénégal / à Dakar / sur WhatsApp… »
const HERO_WORDS = ['au Sénégal.', 'à Dakar.', 'sur WhatsApp.', 'à Touba.', 'à Saint-Louis.'];
const CASH_START = 186500;
const CASH_STEP = 19500;

// Étoile à quatre branches (étincelles du décor et du ruban)
const Sparkle = ({ className = '', style }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" focusable="false">
    <path d="M12 0C12.9 6.3 17.7 11.1 24 12 17.7 12.9 12.9 17.7 12 24 11.1 17.7 6.3 12.9 0 12 6.3 11.1 11.1 6.3 12 0Z" fill="currentColor" />
  </svg>
);

// Intervalle qui ne tourne que lorsque l'élément est à l'écran (et jamais si l'on préfère moins d'animations).
function useTicker(ref, ms) {
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [inView, reduce, ms]);
  return tick;
}

function RotatingWords({ words }) {
  const ref = useRef(null);
  const index = useTicker(ref, 2600) % words.length;
  const previous = (index - 1 + words.length) % words.length;
  return (
    <span ref={ref} className="relative inline-grid overflow-hidden pb-[0.16em] align-bottom">
      {words.map((w, i) => (
        <motion.span
          key={w}
          className="text-sunrise col-start-1 row-start-1 whitespace-nowrap pr-[0.08em]"
          initial={false}
          animate={{
            y: i === index ? '0%' : i === previous ? '-110%' : '110%',
            opacity: i === index ? 1 : 0,
            filter: i === index ? 'blur(0px)' : 'blur(8px)',
          }}
          transition={{ duration: 0.75, ease: EASE }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

// Notifications qui se succèdent dans une carte flottante.
function NotificationCycle() {
  const ref = useRef(null);
  const n = NOTIFICATIONS[useTicker(ref, 3400) % NOTIFICATIONS.length];
  return (
    <div ref={ref} className="w-[236px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={n.title} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.35, ease: EASE }} className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-black/5">{n.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2"><span className="text-[13px] font-bold text-ink">{n.title}</span><span className="shrink-0 text-[10px] text-slate-400">{n.time}</span></span>
            <span className="block truncate text-xs text-slate-500">{n.text}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Caisse du jour qui grimpe à chaque vente
function CashCard() {
  const ref = useRef(null);
  const sales = useTicker(ref, 3400);
  return (
    <div ref={ref} className="w-[196px]">
      <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">
        Caisse du jour <span className="flex items-center gap-1 normal-case tracking-normal text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> en direct</span>
      </p>
      <p className="mt-1.5 text-[1.65rem] font-extrabold leading-none tracking-tight">
        <RollingNumber value={CASH_START + sales * CASH_STEP} /> <span className="text-sm font-bold text-white/45">F</span>
      </p>
      <div className="mt-3 flex h-10 items-end gap-[3px]" aria-hidden="true">
        {STAT_BARS.slice(2).map((h, i) => (
          <motion.span key={i} className="flex-1 origin-bottom rounded-t-[3px] bg-gradient-to-t from-brand-500 to-[#f6c768]" style={{ height: `${h}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 1.3 + i * 0.05 }} />
        ))}
      </div>
    </div>
  );
}

function CourierCard() {
  const reduce = useReducedMotion();
  return (
    <div className="w-[214px]">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700">
          <Bike className="h-[18px] w-[18px] text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1d1a45]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold">Lamine arrive</span>
          <span className="block text-[11px] text-white/55">Médina · dans 6 min</span>
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 via-[#f6c768] to-[#ef8f5b]"
          initial={{ width: '22%' }}
          animate={reduce ? { width: '64%' } : { width: ['22%', '88%'] }}
          transition={reduce ? { duration: 0 } : { duration: 6.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/40"><span>Boutique</span><span>Client</span></div>
    </div>
  );
}

// Carte qui apparaît, puis flotte doucement.
function FloatCard({ children, className = '', style, delay = 0, dark = false, drift = 7 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div style={style} className={`absolute z-20 ${className}`}>
      <motion.div initial={{ opacity: 0, scale: 0.86, y: 18, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, ease: EASE, delay }}>
        <motion.div
          animate={reduce ? undefined : { y: [0, -drift, 0] }}
          transition={{ duration: 5.5 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.8 }}
          className={`rounded-2xl p-3 ${dark
            ? 'bg-[#1b1844]/90 text-white shadow-[0_30px_60px_-25px_rgba(0,0,0,0.85)] ring-1 ring-white/15 backdrop-blur-xl'
            : 'bg-white text-ink shadow-[0_30px_60px_-22px_rgba(5,3,25,0.8)] ring-1 ring-black/5'}`}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function useDepth(sx, sy, depth) {
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth * 0.75);
  return { x, y };
}

function ThemeDots({ themeId, onPick, dark = false }) {
  return (
    <div className="flex items-center" role="radiogroup" aria-label="Thème de la vitrine">
      {SHOP_THEMES.map((t) => {
        const on = t.id === themeId;
        const ring = on
          ? (dark ? 'ring-2 ring-white ring-offset-2 ring-offset-[#17143d]' : 'ring-2 ring-ink ring-offset-2')
          : (dark ? 'ring-1 ring-white/25' : 'ring-1 ring-black/10');
        return (
          // Zone de toucher de 40 px autour de la pastille de 28 px
          <button key={t.id} type="button" role="radio" aria-checked={on} aria-label={`Thème ${t.name}`} title={t.name} onClick={() => onPick(t.id)}
            className="group flex h-10 w-10 items-center justify-center rounded-full">
            <span className={`h-7 w-7 rounded-full transition-transform group-hover:scale-110 ${ring}`} style={{ background: `linear-gradient(135deg, ${t.accent} 50%, ${t.preview.panel} 50%)` }} />
          </button>
        );
      })}
    </div>
  );
}

const rise3d = (delay) => ({
  initial: { opacity: 0, y: 34, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, ease: EASE, delay },
});

function Hero({ themeId, setThemeId }) {
  const theme = getShopTheme(themeId);
  // Profondeur : chaque couche de la scène bouge un peu différemment selon la position de la souris.
  const fine = useFinePointer();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 20, mass: 0.7 });
  const sy = useSpring(my, { stiffness: 70, damping: 20, mass: 0.7 });
  const tiltY = useTransform(sx, (v) => v * 9);
  const tiltX = useTransform(sy, (v) => v * -7);
  const far = useDepth(sx, sy, 16);
  const mid = useDepth(sx, sy, -26);
  const near = useDepth(sx, sy, 46);
  const nearer = useDepth(sx, sy, -40);
  const onMove = (e) => {
    if (!fine) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mx.set(px - 0.5);
    my.set(py - 0.5);
    e.currentTarget.style.setProperty('--sx', `${(px * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty('--sy', `${(py * 100).toFixed(1)}%`);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  const depth = (layer) => (fine ? layer : undefined);

  return (
    <section onMouseMove={onMove} onMouseLeave={onLeave} className="relative isolate overflow-hidden rounded-b-[2.25rem] bg-[#0a0820] pb-8 pt-28 text-white sm:rounded-b-[3rem] sm:pb-10 lg:rounded-b-[4rem] lg:pt-36">
      {/* Décor : lumières, aurores, sol quadrillé en perspective, grain */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_78%_0%,rgba(106,88,232,0.55),transparent_70%),radial-gradient(45%_40%_at_4%_12%,rgba(246,199,104,0.16),transparent_70%),radial-gradient(60%_45%_at_50%_108%,rgba(81,64,218,0.4),transparent_70%)]" />
        <div className="hero-spot absolute inset-0" />
        <div className="absolute inset-0 hidden overflow-hidden lg:block">
          <div className="aurora-blob aurora-1 -right-32 -top-40 h-[36rem] w-[36rem] bg-brand-500/30" />
          <div className="aurora-blob aurora-2 left-[40%] top-[28%] h-80 w-80 bg-amber-400/15" />
          <div className="aurora-blob aurora-3 -left-40 bottom-[-10rem] h-[28rem] w-[28rem] bg-brand-700/40" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[58%] overflow-hidden [mask-image:linear-gradient(to_top,black_20%,transparent)]">
          <div className="hero-floor absolute -left-1/2 bottom-0 h-[150%] w-[200%]" />
        </div>
        <div className="hero-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-[1.04fr_1fr] lg:gap-4 lg:px-8">
        <div>
          <motion.a {...rise3d(0)} href="#parcours" onClick={(e) => goTo(e, '#parcours')} className="group mb-7 inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-sm font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/10">
            <span className="btn-gold rounded-full px-2.5 py-0.5 text-xs font-extrabold">Nouveau</span>
            Suivi des livraisons en direct <ArrowRight className="h-3.5 w-3.5 text-white/50 transition-transform group-hover:translate-x-0.5" />
          </motion.a>
          <h1 className="text-[2.45rem] font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-[4rem] lg:text-[4.3rem] xl:text-[5rem]">
            <span className="sr-only">Votre boutique en ligne, prête à vendre au Sénégal.</span>
            <span aria-hidden="true" className="block">
              <motion.span {...rise3d(0.05)} className="block">Votre boutique</motion.span>
              <motion.span {...rise3d(0.1)} className="block">en ligne,</motion.span>
              <motion.span {...rise3d(0.15)} className="block"><span className="font-editorial text-white/95">prête à vendre</span></motion.span>
              <motion.span {...rise3d(0.25)} className="block"><RotatingWords words={HERO_WORDS} /></motion.span>
            </span>
          </h1>
          <motion.p {...rise3d(0.35)} className="mt-7 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">
            Une vitrine à votre image, le paiement par Wave, Orange Money, Free Money, Wizall ou à la livraison, les commandes sur WhatsApp et des livreurs suivis en direct. Tout se gère depuis votre téléphone.
          </motion.p>
          <motion.div {...rise3d(0.45)} className="mt-9 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start xl:flex-row">
            <Magnetic strength={0.22} className="w-full sm:w-auto">
              <Link to={registerHref(themeId)} className="btn-gold shine-btn group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 py-4 text-[15px] font-extrabold">
                Créer ma boutique gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <a href="#produit" onClick={(e) => goTo(e, '#produit')} className="group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white/[0.06] py-2 pl-2 pr-6 text-[15px] font-bold text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/10">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition-transform group-hover:scale-105"><Play className="h-4 w-4 translate-x-px fill-current" /></span>
              Voir le produit
            </a>
          </motion.div>
          <motion.ul {...rise3d(0.55)} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/70">
            {['Gratuit pour démarrer', 'Sans carte bancaire', 'Prête en quelques minutes'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300"><Check className="h-3 w-3" strokeWidth={3} /></span>{t}</li>
            ))}
          </motion.ul>
          <motion.div {...rise3d(0.65)} className="mt-9 flex flex-wrap items-center gap-2">
            <span className="mr-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/40">Paiements</span>
            <span className="flex h-9 items-center rounded-xl bg-white px-3"><img src="/logos/wave.png" alt="Wave" className="h-5 w-auto" /></span>
            <span className="flex h-9 items-center rounded-xl bg-white px-3"><img src="/logos/orange-money.svg" alt="Orange Money" className="h-4 w-auto" /></span>
            {['Free Money', 'Wizall'].map((t) => <span key={t} className="flex h-9 items-center rounded-xl bg-white/[0.07] px-3 text-[13px] font-bold text-white/85 ring-1 ring-white/10">{t}</span>)}
            <span className="flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 text-[13px] font-bold text-white/85 ring-1 ring-white/10"><Banknote className="h-4 w-4 text-[#f6c768]" /> À la livraison</span>
          </motion.div>
        </div>

        {/* Scène 3D : photo, téléphone (thème au choix) et cartes en direct */}
        <div className="relative">
          <div className="relative mx-auto h-[440px] w-full max-w-[600px] [perspective:1400px] sm:h-[590px] lg:h-[630px]">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="hero-halo absolute left-1/2 top-1/2 h-[340px] w-[340px] rounded-full bg-[conic-gradient(from_90deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-45 blur-[70px] sm:h-[470px] sm:w-[470px]" />
              <div className="orbit orbit-slow h-[400px] w-[400px] border border-white/10 sm:h-[540px] sm:w-[540px]">
                <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6c768] shadow-[0_0_18px_4px_rgba(246,199,104,0.6)]" />
              </div>
              <div className="orbit orbit-reverse h-[290px] w-[290px] border border-dashed border-white/[0.12] sm:h-[390px] sm:w-[390px]">
                <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand-300 shadow-[0_0_14px_3px_rgba(174,166,247,0.7)]" />
              </div>
              <Sparkle className="twinkle absolute left-[6%] top-[46%] h-4 w-4 text-[#f6c768]" />
              <Sparkle className="twinkle absolute right-[10%] top-[4%] h-3 w-3 text-brand-200" style={{ animationDelay: '1.2s' }} />
              <Sparkle className="twinkle absolute bottom-[4%] right-[34%] h-5 w-5 text-white/80" style={{ animationDelay: '2.1s' }} />
            </div>

            <motion.div className="absolute inset-0" style={fine ? { rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' } : undefined}>
              {/* Commerçante */}
              <motion.div style={depth(far)} className="absolute right-0 top-[5%] w-[56%] sm:right-[2%] sm:w-[52%]">
                <motion.div initial={{ opacity: 0, y: 30, rotate: 11 }} animate={{ opacity: 1, y: 0, rotate: 6 }} transition={{ duration: 1.1, ease: EASE }} className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-brand-950 shadow-[0_50px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/15">
                  <img src="/images/landing/hero-commercante-1024.webp" srcSet={photoSet('hero-commercante')} sizes="(min-width: 1024px) 320px, 56vw" alt="Commerçante qui consulte ses commandes sur son téléphone" width="1400" height="2097" fetchPriority="high" decoding="async" className="h-full w-full object-cover object-[50%_18%]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0820]/70 via-transparent to-transparent" />
                </motion.div>
              </motion.div>

              {/* Téléphone : vitrine dans le thème choisi */}
              <motion.div style={depth(mid)} className="absolute left-[3%] top-[9%] w-[47%] max-w-[262px] sm:left-[9%]">
                <motion.div initial={{ opacity: 0, y: 70, rotate: -10 }} animate={{ opacity: 1, y: 0, rotate: -4 }} transition={{ duration: 1.1, ease: EASE, delay: 0.12 }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={theme.id} initial={{ opacity: 0.4, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0.4, scale: 0.98 }} transition={{ duration: 0.25 }}>
                      <PhoneFrame src={SCREEN(`vitrine-${theme.id}`)} alt={`Vitrine « ${DEMO_SHOPS[theme.id]} » sur téléphone, thème ${theme.name}`} eager={theme.id === 'emeraude'} className="shadow-[0_60px_90px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]" />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
                <div className="mx-auto mt-3 h-6 w-[70%] rounded-[50%] bg-brand-500/40 blur-xl" aria-hidden="true" />
              </motion.div>

              {/* Cartes en direct */}
              <FloatCard style={depth(near)} delay={0.55} className="-left-1 top-[1%] sm:-left-4">
                <div className="flex items-center gap-3 pr-1" role="img" aria-label="Paiement Wave reçu : 19 500 francs">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50"><img src="/logos/wave.png" alt="" className="h-5 w-auto" /></span>
                  <span>
                    <span className="block text-[11px] font-semibold text-slate-500">Paiement Wave reçu</span>
                    <span className="block text-lg font-extrabold leading-tight tracking-tight text-ink">+19 500 F</span>
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                </div>
              </FloatCard>
              <FloatCard style={depth(nearer)} delay={0.75} className="right-0 top-[47%] hidden sm:block sm:-right-2">
                <NotificationCycle />
              </FloatCard>
              <FloatCard style={depth(nearer)} delay={0.95} dark className="bottom-[8%] left-0 sm:bottom-[10%] sm:-left-2">
                <CourierCard />
              </FloatCard>
              <FloatCard style={depth(near)} delay={1.15} dark className="bottom-[1%] right-[3%] hidden sm:block">
                <CashCard />
              </FloatCard>
            </motion.div>
          </div>

          <motion.div {...rise3d(0.9)} className="relative z-30 mt-2 flex flex-col items-center gap-1.5">
            <div className="rounded-full bg-white/[0.06] px-1.5 ring-1 ring-white/10 backdrop-blur">
              <ThemeDots dark themeId={themeId} onPick={setThemeId} />
            </div>
            <p className="text-sm text-white/55">Essayez un thème · <span className="font-semibold text-white">{theme.name}</span></p>
          </motion.div>
        </div>
      </div>
      <HeroStrip />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Bande des paiements et outils (bas du héros)                       */
/* ------------------------------------------------------------------ */

// Bande droite en bas du héros : moyens de paiement et outils, qui défilent lentement.
const HERO_STRIP = [
  { label: 'Wave', logo: '/logos/wave.png' },
  { label: 'Orange Money', logo: '/logos/orange-money.svg' },
  { label: 'Free Money', icon: Smartphone },
  { label: 'Wizall', icon: Wallet },
  { label: 'Paiement à la livraison', icon: Banknote },
  { label: 'Commandes WhatsApp', logo: '/logos/whatsapp.svg' },
  { label: 'Livreurs suivis en direct', icon: Bike },
  { label: 'Code de livraison', icon: ShieldCheck },
  { label: 'QR code de boutique', icon: QrCode },
  { label: 'Statistiques de ventes', icon: BarChart3 },
  { label: 'Boutiques près de moi', icon: MapPin },
];

function HeroStrip() {
  return (
    <div className="relative mt-14 border-y border-white/10 bg-white/[0.03] lg:mt-12">
      <p className="sr-only">Paiements et outils inclus : {HERO_STRIP.map((i) => i.label).join(', ')}.</p>
      <div className="overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)] sm:py-5" aria-hidden="true">
        <div className="marquee-track" style={{ animationDuration: '55s' }}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center">
              {HERO_STRIP.map(({ label, logo, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 whitespace-nowrap pl-10 text-[15px] font-semibold text-white/70 sm:pl-14 sm:text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/15">
                    {logo
                      ? <img src={logo} alt="" className="h-4 w-4 object-contain" />
                      : <Icon className="h-4 w-4 text-[#f6c768]" />}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pour chaque commerce                                                 */
/* ------------------------------------------------------------------ */

// Galerie accordéon : le commerce actif s'ouvre en grand, les autres restent en fines bandes.
const COMMERCES = [
  { photo: 'couturier', pos: '50% 30%', tag: 'Couture', label: 'Ateliers de couture', text: 'Vos clients choisissent la taille et le modèle : la commande arrive complète, prête à coudre.', chips: ['Tailles et options', 'Paiement Wave'] },
  { photo: 'boutique-mode', pos: '50% 22%', tag: 'Mode', label: 'Boutiques de mode', text: 'Vos nouveautés en vitrine, partagées en statut WhatsApp avec leur affiche et leur QR code.', chips: ['Affiche WhatsApp', '6 thèmes'] },
  { photo: 'epicerie', pos: '60% 40%', tag: 'Épicerie', label: 'Épiceries de quartier', text: 'Le client commande depuis chez lui, votre livreur apporte, son code valide la livraison.', chips: ['Livreurs', 'Code de livraison'] },
  { photo: 'marche-fruits', pos: '40% 30%', tag: 'Marché', label: 'Fruits et légumes', text: 'Paiement par Wave, Orange Money ou à la livraison : le client choisit, vous encaissez.', chips: ['Wave · Orange Money', 'À la livraison'] },
  { photo: 'artisanat', pos: '50% 25%', tag: 'Artisanat', label: 'Artisans et créateurs', text: 'Une vitrine soignée pour vos pièces uniques, visible dans « Boutiques près de moi ».', chips: ['Annuaire', 'Avis vérifiés'] },
  { photo: 'livreur-moto', pos: '55% 50%', tag: 'Livraison', label: 'Et vos livreurs', text: 'Ils acceptent les courses, partagent leur position et le client les suit en direct.', chips: ['Suivi en direct', 'Bilan du jour'] },
];
const COMMERCE_MS = 5200;

function Commerces() {
  const galleryRef = useRef(null);
  const inView = useInView(galleryRef, { amount: 0.35 });
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const running = inView && !reduce && !paused;

  // Passe tout seul au commerce suivant tant que le visiteur ne choisit pas lui-même.
  useEffect(() => {
    if (!running) return undefined;
    const timer = setTimeout(() => setActive((i) => (i + 1) % COMMERCES.length), COMMERCE_MS);
    return () => clearTimeout(timer);
  }, [active, running]);

  const choose = (i) => { setActive(i); setPaused(true); };

  return (
    <section className="relative bg-[#f7f6f2] pb-20 pt-20 lg:pb-28 lg:pt-28" aria-labelledby="commerces-titre">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Pour chaque commerce</p>
            <h2 id="commerces-titre" className="text-balance text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Couturiers, épiceries, créatrices : <Em>tout le monde vend</Em>.
            </h2>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-sm text-lg leading-relaxed text-slate-600">Au marché, en atelier ou depuis chez vous : votre vitrine se crée en quelques minutes et se partage partout.</p>
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <div
          ref={galleryRef}
          onMouseLeave={() => setPaused(false)}
          className="mx-auto mt-12 flex h-[680px] max-w-7xl flex-col gap-2.5 px-5 sm:h-[620px] lg:h-[540px] lg:flex-row lg:gap-3 lg:px-8"
        >
          {COMMERCES.map((c, i) => {
            const on = i === active;
            const num = String(i + 1).padStart(2, '0');
            return (
              <button
                key={c.photo}
                type="button"
                onClick={() => choose(i)}
                onMouseEnter={() => { if (fine) choose(i); }}
                onFocus={() => choose(i)}
                aria-expanded={on}
                style={{ flexGrow: on ? 6 : 1 }}
                className="group relative min-h-0 min-w-0 basis-0 overflow-hidden rounded-[1.6rem] bg-ink text-left outline-none transition-[flex-grow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-4 focus-visible:ring-brand-400/60"
              >
                <img
                  src={`/images/landing/${c.photo}-1024.webp`}
                  srcSet={photoSet(c.photo)}
                  sizes="(min-width: 1024px) 720px, 100vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: c.pos }}
                  className={`absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-700 ease-out ${on ? 'scale-100' : 'scale-110 brightness-[0.5] saturate-[0.4] group-hover:brightness-[0.65]'}`}
                />
                <span className={`absolute inset-0 bg-gradient-to-t from-[#0a0820]/90 via-[#0a0820]/25 to-transparent transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true" />

                {/* Bande repliée : numéro et nom (à la verticale sur ordinateur) */}
                <span className={`absolute inset-0 flex items-center gap-3 px-5 text-white transition-opacity duration-300 lg:flex-col-reverse lg:justify-start lg:gap-4 lg:px-0 lg:py-6 ${on ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                  <span className="text-xs font-extrabold text-[#f6c768]">{num}</span>
                  <span className="whitespace-nowrap text-base font-extrabold tracking-tight lg:rotate-180 lg:text-lg lg:[writing-mode:vertical-rl]">{c.tag}</span>
                </span>

                {/* Commerce ouvert */}
                <AnimatePresence>
                  {on && (
                    <motion.span
                      key="contenu"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
                      className="absolute inset-x-0 bottom-0 block p-5 text-white sm:p-7 lg:p-9"
                    >
                      <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-[#f6c768]">{num} · {c.tag}</span>
                      <span className="mt-2 block text-2xl font-extrabold leading-[1.05] tracking-tight sm:text-3xl lg:text-[2.6rem]">{c.label}</span>
                      <span className="mt-3 block max-w-md text-sm leading-relaxed text-white/75 sm:text-base">{c.text}</span>
                      <span className="mt-5 flex flex-wrap gap-2">
                        {c.chips.map((chip) => (
                          <span key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.12] px-3 py-1.5 text-xs font-bold ring-1 ring-white/20 backdrop-blur">
                            <Check className="h-3 w-3 text-[#f6c768]" strokeWidth={3} /> {chip}
                          </span>
                        ))}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Temps restant avant le commerce suivant */}
                {on && running && (
                  <span className="absolute inset-x-5 top-5 h-[3px] overflow-hidden rounded-full bg-white/20 sm:inset-x-7 sm:top-6 lg:inset-x-9" aria-hidden="true">
                    <motion.span key={active} className="block h-full origin-left rounded-full bg-[#f6c768]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: COMMERCE_MS / 1000, ease: 'linear' }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Le tableau de bord                                                   */
/* ------------------------------------------------------------------ */

// Écrans du tableau de bord présentés en onglets (captures du vrai produit, boutique de démonstration).
const DASH_VIEWS = [
  { id: 'tableau-de-bord', label: 'Accueil', icon: LayoutDashboard, text: 'Dès l’ouverture : ce qu’il faut faire maintenant et la caisse du jour.', alt: 'Accueil du tableau de bord : commandes à traiter, stock, argent à récupérer auprès des livreurs et caisse du jour' },
  { id: 'tableau-commandes', label: 'Commandes', icon: ShoppingBag, text: 'Chaque commande avec l’adresse, l’itinéraire, WhatsApp et le moyen de paiement.', alt: 'Liste des commandes par statut, avec adresse, itinéraire, code PIN et moyen de paiement' },
  { id: 'tableau-produits', label: 'Produits', icon: Package, text: 'Votre catalogue et votre stock, avec une alerte avant la rupture.', alt: 'Catalogue de produits avec le stock de chaque article et les alertes de stock faible' },
  { id: 'tableau-ventes', label: 'Ventes', icon: BarChart3, text: 'Chiffre d’affaires, panier moyen et taux de livraison sur 7, 30 ou 90 jours.', alt: 'Statistiques de ventes : chiffre d’affaires, commandes, panier moyen, taux de livraison et courbe du chiffre d’affaires' },
  { id: 'tableau-livraisons', label: 'Livraisons', icon: Truck, text: 'Chaque livraison est validée par le code secret du client.', alt: 'Historique des livraisons, chacune validée par le code PIN du client' },
  { id: 'tableau-equipe', label: 'Livreurs', icon: Users, text: 'Vos livreurs, leurs courses du jour et ce qu’ils doivent vous reverser.', alt: 'Fiches des livreurs avec leurs courses du jour et la somme à reverser' },
];
const DASH_VIEW_MS = 5500;
const DASH_SIZES = '(min-width: 1200px) 1150px, 100vw';
const dashSrcSet = (id) => `${SCREEN(`${id}-960`)} 960w, ${SCREEN(id)} 1600w`;

function ProductShowcase() {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false); // le visiteur a choisi un écran : le défilement automatique s'arrête
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const frameRef = useRef(null);
  const tabsRef = useRef(null);
  const preloaded = useRef(false);
  const inView = useInView(frameRef, { margin: '-15% 0px' });
  const running = inView && !picked && !hover && !reduce;
  const view = DASH_VIEWS[active];
  const count = DASH_VIEWS.length;

  // Les autres écrans sont préchargés dès que la section est visible : pas d'écran vide en changeant d'onglet.
  useEffect(() => {
    if (!inView || preloaded.current) return;
    preloaded.current = true;
    DASH_VIEWS.slice(1).forEach(({ id }) => { const img = new Image(); img.sizes = DASH_SIZES; img.srcset = dashSrcSet(id); });
  }, [inView]);

  // Garde l'onglet actif visible dans la barre défilante (téléphone), sans faire défiler la page.
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.children[active];
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  const pick = (i) => { setPicked(true); setActive((i + count) % count); };
  const onTabKey = (e) => {
    const moves = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: count - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (moves[e.key] + count) % count;
    pick(next);
    tabsRef.current?.children[next]?.focus();
  };

  return (
    <section className="overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle center kicker="Le produit" title={<>Un vrai tableau de bord, <Em>pensé pour le commerce</Em>.</>} text="Commandes en temps réel, chiffre d’affaires, livreurs, stock : tout ce qui compte, au même endroit, sur ordinateur comme sur téléphone." /></Reveal>

        {/* Onglets : un écran du tableau de bord chacun, avec une barre de progression pendant le défilement automatique */}
        <div ref={tabsRef} role="tablist" aria-label="Écrans du tableau de bord" onKeyDown={onTabKey} className="scrollbar-hide -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {DASH_VIEWS.map((v, i) => {
            const selected = i === active;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                id={`dash-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="dash-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => pick(i)}
                className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full px-4 text-sm font-bold transition-colors ${selected ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'bg-white text-slate-600 ring-1 ring-black/10 hover:text-ink'}`}
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-amber-300' : ''}`} /> {v.label}
                {selected && !reduce && !picked && (
                  <span className="absolute inset-x-4 bottom-1 h-[2px] overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                    <span key={active} className="step-progress block h-full w-full bg-amber-300" style={{ animationDuration: `${DASH_VIEW_MS}ms`, animationPlayState: running ? 'running' : 'paused' }} onAnimationEnd={() => setActive((a) => (a + 1) % count)} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <motion.div
          ref={frameRef}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true); }}
          onPointerLeave={() => setHover(false)}
          initial={{ opacity: 0, y: 60, rotateX: 14 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.1, ease: EASE }} style={{ transformPerspective: 1800 }}
          className="relative mx-auto mt-8 max-w-6xl"
        >
          <BrowserFrame>
            <div id="dash-panel" role="tabpanel" aria-labelledby={`dash-tab-${active}`} className="relative aspect-[16/10] overflow-hidden bg-[#f6f5f1]">
              <AnimatePresence initial={false}>
                <motion.img
                  key={view.id}
                  src={SCREEN(view.id)} srcSet={dashSrcSet(view.id)} sizes={DASH_SIZES} alt={view.alt}
                  width="1600" height="1000" loading={active === 0 ? 'lazy' : 'eager'} decoding="async"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: EASE }}
                  className="absolute inset-0 block h-full w-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
          </BrowserFrame>
          <div className="absolute -bottom-10 -right-2 hidden w-[200px] lg:block xl:-right-10">
            <PhoneFrame src={SCREEN('panier')} alt="Panier et formulaire de commande sur téléphone" />
          </div>
        </motion.div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={view.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="mx-auto mt-6 max-w-xl text-center text-sm font-medium text-slate-600 lg:mt-8 lg:max-w-md xl:max-w-xl">
            <span className="font-bold text-ink">{view.label} · </span>{view.text}
          </motion.p>
        </AnimatePresence>
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            { icon: Bell, title: 'Commandes en direct', text: 'Chaque commande arrive avec un son et sur WhatsApp. Vous la traitez en un geste.' },
            { icon: BarChart3, title: 'Vos chiffres, clairs', text: 'Chiffre d’affaires, panier moyen, taux de livraison : sur 7, 30 ou 90 jours.' },
            { icon: Users, title: 'Votre équipe', text: 'Vos livreurs, leurs courses du jour et ce qu’ils doivent vous reverser.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><f.icon className="h-5 w-5" /></span>
                <div><p className="font-bold text-ink">{f.title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Comment ça marche : parcours interactif en 5 étapes                  */
/* ------------------------------------------------------------------ */

function WhatsAppScreen() {
  return (
    <PhoneFrame>
      <div className="absolute inset-0 flex flex-col bg-[#efeae2]">
        <div className="flex items-center gap-2.5 bg-[#075e54] px-4 pb-3 pt-10 text-white">
          <img src="/logos/whatsapp.svg" alt="" className="h-8 w-8 rounded-full bg-white p-1.5" />
          <div><p className="text-[13px] font-bold">SamaBoutik</p><p className="text-[10px] text-white/70">Notifications de commande</p></div>
        </div>
        <div className="flex-1 space-y-2 p-3">
          <p className="mx-auto w-max rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-slate-500">AUJOURD’HUI</p>
          <div className="max-w-[94%] rounded-xl rounded-tl-sm bg-white p-2.5 text-[11px] leading-relaxed text-slate-800 shadow-sm">
            <p>🛍️ <strong>Nouvelle commande sur Chez Awa !</strong></p>
            <p>Réf. #A4F2</p>
            <p className="mt-1">👤 Fatou Diop · 📞 77 123 45 67</p>
            <p>📍 Médina, rue 11 (Dakar Plateau / Médina)</p>
            <p>📦 1× Robe wax Teranga</p>
            <p>💰 Total : <strong>19 500 F</strong> — à payer à la livraison</p>
            <p className="mt-1">👉 Gérez-la ici : samaboutik…/dashboard</p>
            <p className="mt-0.5 text-right text-[9px] text-slate-500">10:42</p>
          </div>
          <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-white p-2.5 text-[11px] leading-relaxed text-slate-800 shadow-sm">
            <p>✅ Commande #9C31 livrée ! Code client validé.</p>
            <p className="mt-0.5 text-right text-[9px] text-slate-500">11:58</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const STEP_DURATION_MS = 6500;
const RING_LENGTH = 169.65; // 2 × π × 27

const ACTORS = {
  client: { label: 'Côté client', icon: UserRound, cls: 'bg-sky-400/15 text-sky-200 ring-sky-300/30' },
  boutique: { label: 'Côté boutique', icon: Store, cls: 'bg-brand-400/15 text-brand-200 ring-brand-300/30' },
  livreur: { label: 'Côté livreur', icon: Bike, cls: 'bg-amber-400/15 text-amber-200 ring-amber-300/30' },
};

const STEPS = [
  {
    tab: 'Commande', actor: 'client', icon: ShoppingBag,
    title: 'Le client commande en une minute, sans compte',
    text: 'Depuis votre vitrine, il choisit ses articles et laisse seulement son nom, son téléphone et son adresse.',
    points: ['Aucun compte ni mot de passe', 'Position GPS en un geste', 'Wave, Orange Money ou à la livraison'],
    chip: 'Commande envoyée',
    visual: () => <PhoneFrame src={SCREEN('panier')} alt="Formulaire de commande sur la vitrine : paiement à la livraison, Wave, Orange Money, Free Money ou Wizall" />,
  },
  {
    tab: 'Notification', actor: 'boutique', icon: Bell,
    title: 'Vous êtes prévenu tout de suite sur WhatsApp',
    text: 'La commande arrive sur votre téléphone avec tout ce qu’il faut pour la préparer.',
    points: ['Articles, adresse et téléphone', 'Alerte sonore au tableau de bord', 'Code de livraison envoyé au client'],
    chip: 'Nouvelle commande',
    visual: () => <WhatsAppScreen />,
  },
  {
    tab: 'Livraison', actor: 'livreur', icon: Bike,
    title: 'Le livreur part, le client le suit en direct',
    text: 'Votre livreur accepte la course depuis son téléphone. Sa position est partagée pendant tout le trajet.',
    points: ['Course reçue sur son téléphone', 'Le client le voit arriver', 'Appel ou WhatsApp en un geste'],
    chip: 'Position en direct',
    visual: () => <PhoneFrame src={SCREEN('livreur-course')} alt="Application livreur avec une course en cours" />,
  },
  {
    tab: 'Code PIN', actor: 'livreur', icon: ShieldCheck,
    title: 'Remis avec un code, à la bonne personne',
    text: 'À l’arrivée, le livreur demande au client son code secret à 4 chiffres.',
    points: ['Un code par commande', 'Pas de validation sans lui', 'Essais au hasard bloqués'],
    chip: 'Livraison validée',
    visual: () => <PhoneFrame src={SCREEN('livreur-code')} alt="Saisie du code client pour valider la livraison" />,
  },
  {
    tab: 'Paiement', actor: 'boutique', icon: Banknote,
    title: 'L’argent arrive chez vous',
    text: 'Votre journée se lit d’un coup d’œil : ce qui est encaissé, ce que doivent les livreurs, et votre part.',
    points: ['Paiements mobiles reversés', 'Espèces encaissées par le livreur', 'Bilan de chaque livreur'],
    chip: '+ 47 500 F aujourd’hui',
    visual: () => <PhoneFrame src={SCREEN('tableau-mobile')} alt="Tableau de bord sur téléphone : caisse du jour, frais de livraison et votre part" />,
  },
];

// Focus arrivé au clavier (et non par un clic) : sert à suspendre le défilement pour qui navigue au clavier.
const isKeyboardFocus = (el) => {
  try { return el.matches(':focus-visible'); } catch { return true; }
};

// Grand écran : la frise avance toute seule. Sur téléphone, le visiteur ouvre lui-même les étapes
// (une étape qui s'ouvre seule ferait sauter la page pendant qu'il la fait défiler).
function useWideScreen() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return wide;
}

// Scène d'une étape : téléphone sur un halo, numéro géant en filigrane, étiquette flottante.
function StepStage({ index, compact = false }) {
  const step = STEPS[index];
  const actor = ACTORS[step.actor];
  return (
    <div className={`relative flex items-center justify-center [perspective:1200px] ${compact ? 'h-[440px]' : 'h-[640px]'}`}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`ghost-number select-none font-extrabold leading-none tracking-[-0.06em] ${compact ? 'text-[13rem]' : 'text-[19rem] xl:text-[22rem]'}`}
          >
            0{index + 1}
          </motion.span>
        </AnimatePresence>
        <div className={`absolute rounded-full bg-[conic-gradient(from_120deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-30 blur-[70px] ${compact ? 'h-[260px] w-[260px]' : 'h-[380px] w-[380px]'}`} />
        <div className={`orbit orbit-slow border border-white/10 ${compact ? 'h-[330px] w-[330px]' : 'h-[470px] w-[470px]'}`}>
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6c768] shadow-[0_0_16px_4px_rgba(246,199,104,0.55)]" />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, rotateY: -32, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, rotateY: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: 32, y: -20, scale: 0.92 }}
          transition={{ duration: 0.6, ease: EASE }}
          className={`relative ${compact ? 'w-[200px]' : 'w-[250px] xl:w-[268px]'}`}
        >
          {step.visual()}
          <div className="mx-auto mt-4 h-5 w-[70%] rounded-[50%] bg-brand-500/45 blur-xl" aria-hidden="true" />
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
            className={`absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset backdrop-blur ${actor.cls}`}
            aria-hidden="true"
          >
            <actor.icon className="h-3.5 w-3.5" /> {actor.label}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -16, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
            className={`absolute ${compact ? '-left-8 top-[38%]' : '-left-16 top-[40%]'} flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink shadow-[0_24px_50px_-18px_rgba(0,0,0,0.7)]`}
            aria-hidden="true"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><step.icon className="h-4 w-4" /></span>
            <span className="whitespace-nowrap text-sm font-bold">{step.chip}</span>
          </motion.span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HowItWorks() {
  const sectionRef = useRef(null);
  const listRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const reduce = useReducedMotion();
  const wide = useWideScreen();
  const [active, setActive] = useState(0);
  // 'auto' : défile seul (suspendu au survol et au clavier) · 'paused' : arrêté par le visiteur · 'forced' : relancé par le visiteur
  const [mode, setMode] = useState('auto');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const autoplay = wide && !reduce;
  const running = autoplay && inView && (mode === 'forced' || (mode === 'auto' && !hovered && !focused));

  const go = (i) => setActive((i + STEPS.length) % STEPS.length);
  // Dès que le visiteur choisit lui-même une étape, le défilement automatique s'arrête ; il peut le relancer.
  const pick = (i) => { setMode('paused'); go(i); };

  const onListKey = (e) => {
    const moves = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: STEPS.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (moves[e.key] + STEPS.length) % STEPS.length;
    pick(next);
    listRef.current?.querySelectorAll('[data-step]')[next]?.focus();
  };

  const fill = `${(active / (STEPS.length - 1)) * 100}%`;

  return (
    <section
      ref={sectionRef}
      onFocus={(e) => { if (isKeyboardFocus(e.target)) setFocused(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      className="relative isolate overflow-hidden bg-[#0a0820] py-24 text-white lg:py-32"
    >
      {/* Décor « nuit de Dakar » */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_15%_0%,rgba(106,88,232,0.4),transparent_70%),radial-gradient(45%_40%_at_95%_70%,rgba(246,199,104,0.1),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[45%] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(174,166,247,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(174,166,247,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        <div className="hero-grain absolute inset-0 opacity-[0.06] mix-blend-overlay" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal><SectionTitle light kicker="Comment ça marche" title={<>De la commande à l’argent encaissé, <Em light>en 5 étapes</Em>.</>} /></Reveal>
          {autoplay && (
            <div className="flex items-center gap-2" role="group" aria-label="Commandes du parcours">
              <span className="mr-2 text-sm font-bold tabular-nums text-white/45">0{active + 1} <span className="text-white/25">/ 0{STEPS.length}</span></span>
              <button type="button" onClick={() => pick(active - 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/15 transition-colors hover:bg-white/10" aria-label="Étape précédente"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => pick(active + 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/15 transition-colors hover:bg-white/10" aria-label="Étape suivante"><ChevronRight className="h-5 w-5" /></button>
              <button type="button" onClick={() => setMode((m) => (m === 'paused' ? 'forced' : 'paused'))} className="ml-1 inline-flex h-11 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-sm font-bold ring-1 ring-white/15 transition-colors hover:bg-white/10">
                {mode === 'paused' ? <><Play className="h-4 w-4" /> Lecture</> : <><Pause className="h-4 w-4" /> Pause</>}
              </button>
            </div>
          )}
        </div>

        <div className="mt-14 grid items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          {/* Frise des 5 étapes */}
          <div
            ref={listRef}
            onKeyDown={onListKey}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
            className="relative"
          >
            {/* Ligne qui relie les étapes, remplie jusqu'à l'étape en cours */}
            <div className="absolute bottom-9 left-[29px] top-9 w-[2px] rounded-full bg-white/10" aria-hidden="true">
              <div className="w-full rounded-full bg-gradient-to-b from-brand-400 via-[#f6c768] to-[#ef8f5b] transition-[height] duration-700 ease-out" style={{ height: fill }} />
            </div>

            <ol className="relative space-y-2">
              {STEPS.map((s, i) => {
                const on = i === active;
                const done = i < active;
                const Icon = s.icon;
                const actor = ACTORS[s.actor];
                return (
                  <li key={s.tab}>
                    <button
                      type="button"
                      data-step
                      onClick={() => pick(i)}
                      aria-expanded={on}
                      aria-controls={`etape-${i}`}
                      className={`group flex w-full items-center gap-5 rounded-[1.4rem] py-2 pl-0 pr-3 text-left transition-colors ${on ? '' : 'hover:bg-white/[0.03]'}`}
                    >
                      <span className="relative flex h-[60px] w-[60px] shrink-0 items-center justify-center">
                        {/* Anneau de progression de l'étape en cours */}
                        {on && autoplay && (
                          <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden="true">
                            <circle cx="30" cy="30" r="27" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                            <circle
                              key={`${i}-${active}`}
                              cx="30" cy="30" r="27" fill="none" stroke="#f6c768" strokeWidth="2.5" strokeLinecap="round"
                              strokeDasharray={RING_LENGTH}
                              className="ring-progress"
                              style={{ animationDuration: `${STEP_DURATION_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
                              onAnimationEnd={() => go(active + 1)}
                            />
                          </svg>
                        )}
                        <span className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 ${on
                          ? 'btn-gold shadow-[0_0_0_6px_rgba(246,199,104,0.12),0_12px_30px_-8px_rgba(243,169,83,0.7)]'
                          : done ? 'bg-brand-600 text-white ring-1 ring-brand-400/50' : 'bg-[#15123a] text-white/55 ring-1 ring-white/15 group-hover:text-white'}`}
                        >
                          {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[11px] font-bold uppercase tracking-[0.16em] ${on ? 'text-[#f6c768]' : 'text-white/40'}`}>Étape 0{i + 1} · {actor.label.replace('Côté ', '')}</span>
                        <span className={`block text-xl font-extrabold tracking-tight transition-colors sm:text-2xl ${on ? 'text-white' : 'text-white/55 group-hover:text-white/80'}`}>{s.tab}</span>
                      </span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 lg:hidden ${on ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>

                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          id={`etape-${i}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 pl-[80px] pr-2 pt-1">
                            <h3 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">{s.title}</h3>
                            <p className="mt-3 max-w-lg leading-relaxed text-white/65">{s.text}</p>
                            <ul className="mt-5 flex flex-wrap gap-2">
                              {s.points.map((p) => (
                                <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10">
                                  <Check className="h-3.5 w-3.5 text-[#f6c768]" strokeWidth={3} /> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {/* Téléphone : la capture de l'étape sous son texte */}
                          {!wide && <div className="-ml-5 -mr-5 pb-4"><StepStage index={i} compact /></div>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Scène (grand écran) */}
          {wide && <StepStage index={active} />}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Thèmes                                                               */
/* ------------------------------------------------------------------ */

function Themes({ themeId, onPick }) {
  const theme = getShopTheme(themeId);
  return (
    <section className="overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal><SectionTitle kicker="6 thèmes professionnels" title={<>Une vitrine qui <Em>ressemble à votre commerce</Em>.</>} text="Couleurs, police, photo de bannière : chaque thème est prêt à l’emploi. Vous en changez quand vous voulez, et gardez votre couleur de marque." /></Reveal>
          <Reveal delay={0.1}>
            <Link to={registerHref(themeId)} className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-800">
              Créer ma boutique avec {theme.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
      <div className="scrollbar-hide mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-8" role="radiogroup" aria-label="Thème de la vitrine">
        {SHOP_THEMES.map((t, i) => {
          const selected = t.id === themeId;
          return (
            <Reveal key={t.id} delay={i * 0.05} className="w-[46vw] max-w-[220px] shrink-0 snap-center lg:w-auto lg:max-w-none">
              <button type="button" role="radio" aria-checked={selected} onClick={() => onPick(t.id)} className="group block w-full text-left">
                <div className={`transition-transform duration-500 ${selected ? '-translate-y-2' : 'group-hover:-translate-y-1'}`}>
                  <PhoneFrame src={SCREEN(`vitrine-${t.id}`)} alt={`Vitrine « ${DEMO_SHOPS[t.id]} », thème ${t.name}`} className={selected ? 'ring-4 ring-brand-500 ring-offset-4 ring-offset-white' : ''} />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                  <span className="font-bold text-ink">{t.name}</span>
                  {selected && <Check className="h-4 w-4 text-brand-600" />}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{t.idealFor}</p>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tout est inclus                                                      */
/* ------------------------------------------------------------------ */

// Carte de la mosaïque « Tout est inclus ». tone : light (blanc), night (nuit), gold (doré) ou indigo.
const TILE_TONES = {
  light: 'bg-white text-ink ring-1 ring-black/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_24px_50px_-34px_rgba(18,16,58,0.35)]',
  night: 'bg-[#0f0c2e] text-white ring-1 ring-white/10 shadow-[0_40px_80px_-40px_rgba(15,12,46,0.9)]',
  gold: 'bg-[linear-gradient(145deg,#fbe3a4_0%,#f6c768_40%,#ef9a5c_100%)] text-[#1a1033] shadow-[0_40px_80px_-40px_rgba(239,154,92,0.8)]',
  indigo: 'bg-[linear-gradient(150deg,#5140da_0%,#2a2580_55%,#120f3a_100%)] text-white shadow-[0_40px_80px_-40px_rgba(59,47,201,0.9)]',
};

function BentoTile({ icon: Icon, kicker, title, text, tone = 'light', big = false, className = '', children }) {
  const onDark = tone === 'night' || tone === 'indigo';
  const chip = {
    light: 'bg-brand-50 text-brand-700 ring-brand-100',
    night: 'bg-white/10 text-[#f6c768] ring-white/15',
    gold: 'bg-white/40 text-[#1a1033] ring-white/50',
    indigo: 'bg-white/10 text-[#f6c768] ring-white/15',
  }[tone];
  return (
    <Reveal className={`min-w-0 ${className}`}>
      <SpotlightCard className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[2rem] p-6 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 sm:p-7 ${TILE_TONES[tone]}`}>
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${chip}`}><Icon className="h-5 w-5" /></span>
          <span className={`text-[11px] font-extrabold uppercase tracking-[0.16em] ${onDark ? 'text-white/55' : tone === 'gold' ? 'text-[#1a1033]/60' : 'text-slate-400'}`}>{kicker}</span>
        </div>
        <h3 className={`mt-4 text-balance font-extrabold leading-[1.1] tracking-tight ${big ? 'text-2xl sm:text-[1.9rem]' : 'text-lg sm:text-xl'}`}>{title}</h3>
        {text && <p className={`mt-2 text-sm leading-relaxed ${onDark ? 'text-white/60' : tone === 'gold' ? 'text-[#1a1033]/75' : 'text-slate-500'}`}>{text}</p>}
        {children && <div className="relative mt-5 flex flex-1 flex-col justify-end">{children}</div>}
      </SpotlightCard>
    </Reveal>
  );
}

// Statistiques : périodes au choix, courbe qui se redessine et total qui défile
const STAT_PERIODS = [
  { id: '7', label: '7 j', total: 128500, orders: 21, points: [20, 35, 28, 46, 40, 58, 52, 64, 60, 72, 68, 84] },
  { id: '30', label: '30 j', total: 545000, orders: 84, points: [30, 26, 40, 36, 52, 48, 60, 55, 70, 66, 78, 90] },
  { id: '90', label: '90 j', total: 1482000, orders: 236, points: [18, 30, 26, 38, 50, 44, 58, 62, 57, 74, 80, 94] },
];
const STAT_BARS = [28, 36, 31, 44, 40, 52, 47, 58, 54, 66, 61, 74, 70, 86];

// Courbe lissée (Catmull-Rom) passant par les points, dans une zone de 600 × 200
function smoothPath(values, w = 600, h = 200) {
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / 100) * (h - 16) - 8]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { line: d, area: `${d} L${w},${h} L0,${h} Z`, last: pts[pts.length - 1] };
}

function StatsVisual() {
  const [period, setPeriod] = useState(STAT_PERIODS[1]);
  const { line, area, last } = smoothPath(period.points);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Chiffre d’affaires · {period.label}</p>
          <p className="mt-1 font-figures text-4xl font-bold tracking-tight sm:text-5xl"><RollingNumber value={period.total} /> <span className="text-lg text-white/40">F</span></p>
          <p className="mt-1 text-sm font-semibold text-emerald-300">{period.orders} commandes livrées</p>
        </div>
        <div className="flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10" role="group" aria-label="Période">
          {STAT_PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPeriod(p)} aria-pressed={p.id === period.id}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${p.id === period.id ? 'btn-gold' : 'text-white/60 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative mt-6 h-[180px] sm:h-[200px]" aria-hidden="true">
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="stats-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8a7cf1" stopOpacity="0.45" />
              <stop offset="1" stopColor="#8a7cf1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="stats-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a7cf1" />
              <stop offset="0.6" stopColor="#f6c768" />
              <stop offset="1" stopColor="#ef8f5b" />
            </linearGradient>
          </defs>
          {[50, 100, 150].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 6" />)}
          <motion.path initial={false} animate={{ d: area }} transition={{ duration: 0.8, ease: EASE }} fill="url(#stats-area)" />
          <motion.path
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
            animate={{ d: line }} transition={{ d: { duration: 0.8, ease: EASE }, pathLength: { duration: 1.6, ease: EASE } }}
            fill="none" stroke="url(#stats-line)" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          />
        </svg>
        <motion.span
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f6c768] shadow-[0_0_0_6px_rgba(246,199,104,0.2),0_0_24px_4px_rgba(246,199,104,0.6)]"
          initial={false}
          animate={{ left: `${(last[0] / 600) * 100}%`, top: `${(last[1] / 200) * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </div>
    </div>
  );
}

// Paiement : l'option choisie change toute seule (ou au clic), comme sur l'écran du client
function PaymentVisual() {
  const ref = useRef(null);
  const [picked, setPicked] = useState(null);
  const tick = useTicker(ref, 2200);
  const index = picked ?? (tick % PAYMENT_CHOICES.length);
  const choice = PAYMENT_CHOICES[index];
  return (
    <div ref={ref} className="rounded-[1.5rem] bg-[#f7f6f2] p-3 ring-1 ring-black/[0.05]">
      <ul className="space-y-1.5">
        {PAYMENT_CHOICES.map((m, i) => {
          const on = i === index;
          return (
            <li key={m.id}>
              <button type="button" onClick={() => setPicked(i)} aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-300 ${on ? 'bg-white shadow-[0_10px_24px_-14px_rgba(18,16,58,0.45)] ring-2 ring-brand-500' : 'ring-1 ring-transparent hover:bg-white/70'}`}>
                {m.id === 'ON_DELIVERY' ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-black/5"><DuoTruck className="h-5 w-5" /></span>
                ) : m.logo ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-black/5"><img src={m.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /></span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold" style={{ background: m.tint, color: m.ink }} aria-hidden="true">{m.monogram}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{m.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">{m.id === 'ON_DELIVERY' ? m.depositSub : m.sub}</span>
                </span>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${on ? 'bg-brand-600 text-white' : 'ring-1 ring-slate-300'}`}>{on && <Check className="h-3 w-3" strokeWidth={3.5} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white">
        <span className="min-w-0 truncate text-sm font-bold">
          {choice.id === 'ON_DELIVERY' ? 'Payer l’acompte · 1 950 F' : `Payer 19 500 F · ${choice.label}`}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-[#f6c768]" />
      </div>
    </div>
  );
}

const MAP_PINS = [[18, 66, false], [38, 30, false], [52, 52, true], [74, 72, false], [86, 28, false]]; // [x %, y %, boutique mise en avant]

function Included() {
  const reduce = useReducedMotion();
  const appear = (i, from) => (reduce ? {} : { initial: from, whileInView: { opacity: 1, x: 0, y: 0, scaleY: 1 }, viewport: { once: true }, transition: { duration: 0.55, delay: 0.15 + i * 0.06, ease: EASE } });
  return (
    <section className="relative isolate overflow-hidden bg-[#f7f6f2] py-24 lg:py-32" aria-labelledby="inclus-titre">
      {/* Décor : lumières douces et trame de points */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 top-24 h-[34rem] w-[34rem] rounded-full bg-brand-300/25 blur-[110px]" />
        <div className="absolute -right-32 bottom-10 h-[28rem] w-[28rem] rounded-full bg-amber-300/25 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(18,16,58,0.09)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-brand-700">Tout est inclus</p>
              <h2 id="inclus-titre" className="text-balance text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.6rem]">
                Les outils d’une grande enseigne, <Em>dans votre poche</Em>.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              {['Rapide même en 3G', 'Rien à installer', 'Tout depuis votre téléphone'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-ink ring-1 ring-black/[0.06]">
                  <Check className="h-4 w-4 text-brand-600" strokeWidth={3} /> {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {/* Statistiques */}
          <BentoTile tone="night" big icon={DuoChart} kicker="Statistiques" title="Vos chiffres, clairs comme un tableau de bord de banque." className="sm:col-span-2 lg:col-span-7">
            <StatsVisual />
          </BentoTile>

          {/* Paiements */}
          <BentoTile big icon={DuoWallet} kicker="5 façons de payer" title="Le client choisit, vous encaissez." className="sm:col-span-2 lg:col-span-5">
            <PaymentVisual />
          </BentoTile>

          {/* QR code */}
          <BentoTile tone="gold" icon={DuoQrCode} kicker="QR code de boutique" title="Un scan, et le client est sur votre vitrine." text="À coller sur votre comptoir, vos sacs ou vos cartes de visite." className="lg:col-span-4">
            <div className="flex items-end justify-between gap-3">
              <div className="relative rotate-[-4deg] rounded-2xl bg-white p-3 shadow-[0_24px_50px_-18px_rgba(26,16,51,0.55)] transition-transform duration-500 group-hover:rotate-0">
                <QRCodeSVG value="https://samaboutik-nine.vercel.app/boutiques" size={112} fgColor={BRAND.ink} />
                <span className="qr-scan pointer-events-none absolute inset-x-2 top-3 h-0.5 rounded-full bg-brand-500 shadow-[0_0_14px_3px_rgba(106,88,232,0.65)]" aria-hidden="true" />
              </div>
              <span className="mb-1 rounded-full bg-[#1a1033] px-3 py-1.5 text-xs font-bold text-[#f6c768]">Scannez-moi</span>
            </div>
          </BentoTile>

          {/* Affiche WhatsApp */}
          <BentoTile tone="indigo" icon={DuoMegaphone} kicker="Affiche WhatsApp" title="Votre produit, prêt pour votre statut." text="Photo, prix, lien et QR code : en un clic." className="lg:col-span-4">
            <div className="flex items-end justify-between gap-3" aria-hidden="true">
              <div className="w-[9.5rem] -rotate-6 overflow-hidden rounded-2xl bg-[#0a0820] shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-[1.03]">
                <div className="flex items-center gap-1.5 px-2.5 pt-2.5"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold">C</span><span className="text-[9px] font-bold">Chez Awa</span></div>
                <div className="relative mx-2.5 mt-2 aspect-[4/5] overflow-hidden rounded-xl">
                  <img src="/images/landing/boutique-mode-640.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-brand-600 px-2 py-0.5 font-figures text-[10px] font-bold">18 500 F</span>
                </div>
                <div className="m-2.5 flex items-center justify-between rounded-lg bg-white p-1.5 text-ink"><span className="text-[8px] font-bold leading-tight">Commandez<br />ici</span><QRCodeSVG value="https://samaboutik-nine.vercel.app/boutiques" size={26} fgColor={BRAND.ink} /></div>
              </div>
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#25D366]/30"><DuoWhatsApp className="h-4 w-4" /> Partager</span>
            </div>
          </BentoTile>

          {/* Annuaire */}
          <BentoTile icon={DuoMap} kicker="Boutiques près de moi" title="Visible dans votre quartier." text="Votre boutique apparaît sur la carte des commerçants." className="sm:col-span-2 lg:col-span-4">
            <div className="relative h-36 overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#eceaf6,#f4f1e8)] ring-1 ring-black/5" aria-hidden="true">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 144" preserveAspectRatio="none" fill="none" stroke="#ffffff" strokeLinecap="round">
                <path d="M-10 108 C 80 86, 150 132, 330 52" strokeWidth="9" />
                <path d="M92 -10 L 122 160" strokeWidth="7" />
                <path d="M228 -10 C 214 56, 252 100, 236 160" strokeWidth="7" />
                <path d="M-10 34 C 60 44, 140 20, 330 30" strokeWidth="4" opacity="0.8" />
              </svg>
              {MAP_PINS.map(([x, y, main]) => (
                <span key={`${x}-${y}`} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${x}%`, top: `${y}%` }}>
                  {main && <span className="absolute left-1/2 top-3/4 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/35 motion-safe:animate-ping" />}
                  <DuoPin className={`relative drop-shadow-sm ${main ? 'h-7 w-7 text-brand-700' : 'h-5 w-5 text-slate-400'}`} />
                </span>
              ))}
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">Chez Awa · 4,8 <DuoStar className="h-3 w-3 text-amber-400" /> · ouvert</span>
            </div>
            <Link to="/boutiques" className="mt-3 inline-flex min-h-9 items-center gap-1.5 self-start text-sm font-bold text-brand-700 hover:underline">Voir l’annuaire <ArrowUpRight className="h-4 w-4" /></Link>
          </BentoTile>

          {/* Petites cartes */}
          <BentoTile icon={DuoImages} kicker="Photos allégées" title="Une vitrine rapide, même en 3G." className="lg:col-span-3">
            <p className="flex items-baseline gap-2 font-extrabold text-ink"><span className="text-sm text-slate-400 line-through">4,2 Mo</span><ArrowRight className="h-4 w-4 self-center text-brand-600" /><span className="font-figures text-2xl">180 Ko</span></p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <motion.div className="h-full w-[6%] rounded-full bg-gradient-to-r from-brand-500 to-amber-400" {...(reduce ? {} : { initial: { width: '100%' }, whileInView: { width: '6%' }, viewport: { once: true }, transition: { duration: 1.4, delay: 0.3, ease: EASE } })} />
            </div>
          </BentoTile>

          <BentoTile icon={DuoUsers} kicker="Équipe de livreurs" title="Le bilan de chacun, chaque jour." className="lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2">{['L', 'M', 'B', 'A'].map((l, i) => <motion.span key={l} {...appear(i, { opacity: 0, x: -10 })} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white ${['bg-brand-700', 'bg-amber-600', 'bg-sky-700', 'bg-ink'][i]}`}>{l}</motion.span>)}</div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">4 courses</span>
            </div>
          </BentoTile>

          <BentoTile icon={DuoSeal} kicker="Avis vérifiés" title="La confiance, badge à l’appui." className="lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5" role="img" aria-label="5 étoiles sur 5">{[1, 2, 3, 4, 5].map((s) => <DuoStar key={s} className="h-4 w-4 text-amber-400" />)}</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><DuoSeal className="h-3.5 w-3.5" /> Achat vérifié</span>
            </div>
          </BentoTile>

          <BentoTile tone="night" icon={DuoLock} kicker="Données protégées" title="Chaque livraison confirmée par un code." className="lg:col-span-3">
            <div className="flex gap-1.5" aria-hidden="true">
              {['4', '8', '2', '7'].map((d, i) => <motion.span key={i} {...appear(i, { opacity: 0, y: 8 })} className="flex h-10 w-9 items-center justify-center rounded-xl bg-white/[0.08] font-figures text-lg font-bold text-white ring-1 ring-white/15">{d}</motion.span>)}
              <span className="ml-1 flex h-10 items-center justify-center rounded-xl bg-emerald-400/15 px-2.5 text-emerald-300 ring-1 ring-emerald-300/25"><Check className="h-4 w-4" strokeWidth={3} /></span>
            </div>
          </BentoTile>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Essayez vous-même : commande en direct et simulateur de revenus      */
/* ------------------------------------------------------------------ */

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio muet si bloqué par le navigateur
  }
}

const fmtF = (n) => `${Math.round(n).toLocaleString('fr-FR')} F`;

const DEMO_PRODUCTS = [
  { id: 'wax', name: 'Robe Soie & Wax Brodé', category: 'Mode & Couture', price: 25000, img: 'boutique-vetements', variants: ['Taille S', 'Taille M', 'Taille L'], defaultVariant: 'Taille M', themeId: 'terracotta', shop: 'Wax & Couture' },
  { id: 'panier', name: 'Panier Fraîcheur Bio', category: 'Épicerie & Frais', price: 12500, img: 'marche-fruits', variants: ['5 kg', '10 kg'], defaultVariant: '5 kg', themeId: 'emeraude', shop: 'Chez Awa' },
  { id: 'sac', name: 'Sac Cuir Artisanal Ngor', category: 'Artisanat', price: 18000, img: 'artisanat', variants: ['Noir Ébène', 'Camel'], defaultVariant: 'Camel', themeId: 'epure', shop: 'Studio Fall' },
];

const EVENT_TONES = {
  brand: 'bg-brand-500/20 text-brand-200 ring-brand-300/30',
  sky: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
  gold: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  emerald: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
};

// Ce qui se passe chez le commerçant après la commande (mêmes règles que le vrai produit :
// paiement mobile = 5 % de commission ; à la livraison = acompte de 10 % en ligne, le reste en espèces).
function demoEvents(product, variant, pay) {
  const deposit = depositFor(product.price);
  return [
    { icon: ShoppingBag, tone: 'brand', title: 'Commande reçue', text: `${product.name} · ${variant}`, meta: 'Sans compte client' },
    pay === 'wave'
      ? { logo: '/logos/wave.png', tone: 'sky', title: `Paiement Wave reçu · ${fmtF(product.price)}`, text: 'Validé automatiquement, sans capture d’écran', meta: 'Sécurisé' }
      : { icon: Banknote, tone: 'gold', title: `Acompte payé · ${fmtF(deposit)}`, text: `Le reste, ${fmtF(product.price - deposit)}, en espèces au livreur`, meta: 'Acompte 10 %' },
    { logo: '/logos/whatsapp.svg', tone: 'emerald', title: 'Boutique prévenue sur WhatsApp', text: 'Alerte sonore au tableau de bord, stock mis à jour', meta: 'Instantané' },
    { icon: Bike, tone: 'brand', title: 'Lamine a pris la course', text: 'Le client le suit en direct sur la carte', meta: 'En route' },
    { icon: ShieldCheck, tone: 'emerald', title: 'Livrée · code 5834 validé', text: 'Colis remis à la bonne personne', meta: 'Terminé' },
  ];
}

// Téléphone interactif : la fiche produit d'une vitrine, comme la voit le client.
function DemoPhone({ product, variant, onVariant, pay, onPay, onOrder, busy, done }) {
  const theme = getShopTheme(product.themeId);
  const deposit = depositFor(product.price);
  return (
    <div className="relative mx-auto w-[296px] sm:w-[312px]">
      <div className="pointer-events-none absolute -inset-12 rounded-full bg-brand-500/25 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[2.9rem] bg-[#0d0d12] p-[10px] shadow-[0_60px_100px_-40px_rgba(0,0,0,0.9),inset_0_0_0_1.5px_rgba(255,255,255,0.1)]">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-white text-ink">
          <span className="absolute left-1/2 top-2 z-10 h-[24px] w-[88px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
          <div className="flex items-center gap-2 px-4 pb-2.5 pt-10">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: theme.accent }}>{product.shop.charAt(0)}</span>
            <span className="text-[13px] font-extrabold">{product.shop}</span>
            <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Ouvert</span>
          </div>
          <div className="relative mx-3 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img key={product.id} src={`/images/landing/${product.img}-640.webp`} alt={product.name} loading="lazy" decoding="async"
                initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}
                className="absolute inset-0 h-full w-full object-cover" />
            </AnimatePresence>
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink">{product.category}</span>
          </div>
          <div className="px-4 pb-4 pt-3">
            <p className="text-[15px] font-extrabold leading-tight">{product.name}</p>
            <p className="mt-0.5 font-figures text-lg font-bold" style={{ color: theme.accent }}>{fmtF(product.price)}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Variante">
              {product.variants.map((v) => (
                <button key={v} type="button" onClick={() => onVariant(v)} aria-pressed={variant === v}
                  className={`min-h-8 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${variant === v ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={variant === v ? { background: theme.accent } : undefined}>
                  {v}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Paiement">
              {[
                { id: 'wave', label: 'Wave', sub: 'Tout en ligne', logo: '/logos/wave.png' },
                { id: 'cash', label: 'À la livraison', sub: `Acompte ${fmtF(deposit)}` },
              ].map((o) => (
                <button key={o.id} type="button" onClick={() => onPay(o.id)} aria-pressed={pay === o.id}
                  className={`flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-2 text-left transition-all ${pay === o.id ? 'bg-white ring-2' : 'bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100'}`}
                  style={pay === o.id ? { '--tw-ring-color': theme.accent } : undefined}>
                  {o.logo
                    ? <img src={o.logo} alt="" className="h-5 w-5 shrink-0 rounded-md object-contain" />
                    : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700"><Banknote className="h-3.5 w-3.5" /></span>}
                  <span className="min-w-0">
                    <span className="block truncate text-[10.5px] font-extrabold">{o.label}</span>
                    <span className="block truncate text-[9.5px] font-semibold text-slate-500">{o.sub}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              {/* Onde qui invite à appuyer, tant que la démonstration n'a pas été lancée */}
              {!busy && !done && <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 motion-safe:animate-ping" style={{ '--tw-ring-color': theme.accent, opacity: 0.35 }} aria-hidden="true" />}
              <button type="button" onClick={onOrder} disabled={busy}
                className="shine-btn flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.98] disabled:opacity-80"
                style={{ background: theme.accent }}>
                {busy
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Commande en cours…</>
                  : done ? <><RotateCcw className="h-4 w-4" /> Commander à nouveau</>
                    : <>Commander · {pay === 'wave' ? fmtF(product.price) : `acompte ${fmtF(deposit)}`}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fil des notifications côté commerçant, qui arrivent une à une.
function DemoFeed({ events, step, busy, onReset, product, pay, themeId }) {
  const doneAll = step >= events.length;
  const commission = Math.floor((pay === 'wave' ? product.price : depositFor(product.price)) * ONLINE_COMMISSION_RATE);
  return (
    <div className="relative min-w-0 rounded-[2rem] bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-xl sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
          <p className="text-sm font-extrabold">Pendant ce temps, chez vous</p>
        </div>
        {step > 0 && !busy && (
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/15">
            <RotateCcw className="h-3.5 w-3.5" /> Recommencer
          </button>
        )}
      </div>

      <ol className="relative mt-6 space-y-2.5" aria-live="polite">
        <span className="absolute bottom-6 left-[21px] top-6 w-[2px] rounded-full bg-white/10" aria-hidden="true">
          <span className="block w-full rounded-full bg-gradient-to-b from-brand-400 via-[#f6c768] to-emerald-400 transition-[height] duration-500 ease-out" style={{ height: `${(Math.max(0, step - 1) / (events.length - 1)) * 100}%` }} />
        </span>
        {events.map((e, i) => {
          const shown = i < step;
          const loading = busy && i === step;
          const Icon = e.icon;
          return (
            <li key={i} className={`relative flex items-start gap-3.5 rounded-2xl p-2.5 transition-all duration-500 ${shown ? 'bg-white/[0.06] ring-1 ring-white/10' : 'opacity-40'}`}>
              <span className={`relative z-10 flex h-[26px] w-[26px] shrink-0 translate-x-[5px] items-center justify-center rounded-full ring-1 transition-colors duration-500 ${shown ? EVENT_TONES[e.tone] : 'bg-[#15123a] text-white/40 ring-white/15'}`}>
                {loading
                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  : shown && e.logo ? <img src={e.logo} alt="" className="h-3.5 w-3.5 object-contain" />
                    : Icon ? <Icon className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1 pl-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-extrabold">{e.title}</span>
                  {shown && <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-white/60">{e.meta}</motion.span>}
                </span>
                <span className="mt-0.5 block text-xs text-white/55">{e.text}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence>
        {doneAll && (
          <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="mt-5 flex flex-col gap-4 rounded-2xl bg-[linear-gradient(135deg,rgba(246,199,104,0.16),rgba(138,124,241,0.14))] p-4 ring-1 ring-[#f6c768]/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#f6c768]">Dans votre caisse</p>
              <p className="mt-0.5 font-figures text-3xl font-bold">{fmtF(product.price - commission)}</p>
              <p className="text-xs text-white/55">Commission SamaBoutik : {fmtF(commission)}{pay === 'cash' ? ' (sur l’acompte seulement)' : ''}</p>
            </div>
            <Link to={registerHref(product.themeId || themeId)} className="btn-gold inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold">
              Créer ma boutique <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoldSlider({ id, label, value, min, max, step, onChange, display, ticks }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-white/65">{label}</label>
        <span className="font-figures text-2xl font-bold tabular-nums text-white">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="range-gold mt-4 w-full" style={{ '--fill': `${fill}%` }} />
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-white/35">{ticks.map((t) => <span key={t}>{t}</span>)}</div>
    </div>
  );
}

function LiveExperience({ themeId }) {
  const [tab, setTab] = useState('demo'); // 'demo' | 'calculator'
  const [product, setProduct] = useState(DEMO_PRODUCTS[0]);
  const [variant, setVariant] = useState(DEMO_PRODUCTS[0].defaultVariant);
  const [pay, setPay] = useState('wave'); // 'wave' | 'cash'
  const [step, setStep] = useState(0); // nombre de notifications arrivées
  const [busy, setBusy] = useState(false);
  const timers = useRef([]);

  // Simulateur de revenus
  const [ordersPerDay, setOrdersPerDay] = useState(15);
  const [avgBasket, setAvgBasket] = useState(18000);
  const [onlineShare, setOnlineShare] = useState(50); // % des ventes payées par Wave / Orange Money

  const monthlyOrders = ordersPerDay * 30;
  const monthlyRevenue = monthlyOrders * avgBasket;
  // 5 % sur les paiements mobiles ; à la livraison, 5 % sur l'acompte de 10 % seulement.
  const commission = Math.round(monthlyRevenue * ((onlineShare / 100) * ONLINE_COMMISSION_RATE + (1 - onlineShare / 100) * 0.1 * ONLINE_COMMISSION_RATE));
  const kept = monthlyRevenue - commission;
  const keptShare = monthlyRevenue ? (kept / monthlyRevenue) * 100 : 100;
  const hoursSaved = Math.round((monthlyOrders * 20) / 60); // hypothèse affichée : 20 min d'échanges évitées par commande

  const events = demoEvents(product, variant, pay);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const reset = () => { clearTimers(); setStep(0); setBusy(false); };

  const runSimulation = () => {
    if (busy) return;
    clearTimers();
    setBusy(true);
    setStep(0);
    playChime();
    events.forEach((_, i) => {
      timers.current.push(setTimeout(() => {
        setStep(i + 1);
        if (i === events.length - 1) {
          setBusy(false);
          try {
            confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, colors: [BRAND.vivid, BRAND.light, BRAND.gold, '#fde68a', '#ffffff'], disableForReducedMotion: true });
          } catch { /* confettis indisponibles */ }
        }
      }, 450 + i * 750));
    });
  };

  const pickProduct = (p) => { setProduct(p); setVariant(p.defaultVariant); reset(); };

  const TABS = [
    { id: 'demo', label: 'Commander comme un client', short: 'Commander', icon: Zap },
    { id: 'calculator', label: 'Calculer mes revenus', short: 'Mes revenus', icon: Calculator },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[#0a0820] py-24 text-white lg:py-32" aria-labelledby="demo-titre">
      {/* Décor « nuit de Dakar » */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(106,88,232,0.42),transparent_70%),radial-gradient(40%_35%_at_100%_80%,rgba(246,199,104,0.1),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-[50%] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(174,166,247,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(174,166,247,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        <div className="hero-grain absolute inset-0 opacity-[0.06] mix-blend-overlay" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur">
              <Sparkle className="h-3.5 w-3.5 text-[#f6c768]" /> Essayez vous-même
            </span>
            <h2 id="demo-titre" className="mt-6 text-balance text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.2rem]">
              Voyez la magie en action, <Em light>en 10 secondes</Em>.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">Passez une commande comme vos clients, et regardez ce qui se passe chez vous. Ou calculez ce que votre boutique peut vous rapporter.</p>
          </Reveal>

          {/* Onglets */}
          <Reveal delay={0.08}>
            <div className="mt-9 inline-flex max-w-full items-center rounded-full bg-white/[0.05] p-1.5 ring-1 ring-white/10 backdrop-blur" role="tablist" aria-label="Démonstration">
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => { setTab(t.id); reset(); }}
                    className={`relative rounded-full px-4 py-2.5 text-[13px] font-extrabold transition-colors sm:px-6 sm:text-sm ${on ? 'text-[#1a1033]' : 'text-white/65 hover:text-white'}`}>
                    {on && <motion.span layoutId="demo-tab" className="btn-gold absolute inset-0 rounded-full" transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }} />}
                    <span className="relative z-10 flex items-center gap-2 whitespace-nowrap"><t.icon className="h-4 w-4" /> <span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span></span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        {tab === 'demo' ? (
          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            <div className="min-w-0">
              {/* Choix de l'article */}
              <div className="mb-6 flex justify-center gap-2" role="group" aria-label="Article à commander">
                {DEMO_PRODUCTS.map((p) => {
                  const on = p.id === product.id;
                  return (
                    <button key={p.id} type="button" onClick={() => pickProduct(p)} aria-pressed={on}
                      className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-xs font-bold transition-all ${on ? 'bg-white text-ink shadow-lg' : 'bg-white/[0.06] text-white/70 ring-1 ring-white/10 hover:bg-white/10'}`}>
                      <img src={`/images/landing/${p.img}-640.webp`} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                      <span className="hidden sm:inline">{p.category}</span>
                      <span className="sm:hidden">{p.category.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mb-5 text-center text-sm font-semibold text-white/55">Choisissez la taille et le paiement, puis appuyez sur <span className="text-[#f6c768]">« Commander »</span>.</p>
              <DemoPhone product={product} variant={variant} onVariant={(v) => { setVariant(v); reset(); }} pay={pay} onPay={(v) => { setPay(v); reset(); }} onOrder={runSimulation} busy={busy} done={step >= events.length} />
            </div>
            <DemoFeed events={events} step={step} busy={busy} onReset={reset} product={product} pay={pay} themeId={themeId} />
          </div>
        ) : (
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <div className="space-y-9 rounded-[2rem] bg-white/[0.04] p-6 ring-1 ring-white/10 backdrop-blur-xl sm:p-9">
              <GoldSlider id="orders-slider" label="Commandes par jour" value={ordersPerDay} min={2} max={50} step={1} onChange={setOrdersPerDay} display={ordersPerDay} ticks={['2', '25', '50']} />
              <GoldSlider id="basket-slider" label="Panier moyen" value={avgBasket} min={3000} max={50000} step={1000} onChange={setAvgBasket} display={fmtF(avgBasket)} ticks={['3 000 F', '25 000 F', '50 000 F']} />
              <GoldSlider id="online-slider" label="Payé par paiement mobile" value={onlineShare} min={0} max={100} step={10} onChange={setOnlineShare} display={`${onlineShare} %`} ticks={['Tout à la livraison', 'Tout en ligne']} />
              <p className="rounded-2xl bg-white/[0.05] p-4 text-xs leading-relaxed text-white/60 ring-1 ring-white/10">
                <strong className="text-white">Bon à savoir :</strong> sur un paiement mobile (Wave, Orange Money, Free Money, Wizall), SamaBoutik garde 5 %. À la livraison, seul l’acompte de 10 % payé en ligne compte : rien sur les espèces.
              </p>
            </div>

            <div className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(150deg,#3b2fc9_0%,#2a2580_45%,#120f3a_100%)] p-6 ring-1 ring-white/10 sm:p-9">
              <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[#f6c768]/20 blur-3xl" aria-hidden="true" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">Chiffre d’affaires par mois</p>
              <p className="mt-2 font-figures text-5xl font-bold tracking-tight sm:text-6xl">
                <RollingNumber value={monthlyRevenue} /> <span className="text-2xl text-[#f6c768]">F</span>
              </p>
              <p className="mt-2 text-sm text-white/60">{monthlyOrders.toLocaleString('fr-FR')} commandes par mois</p>

              <div className="mt-8">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  <motion.span className="h-full bg-gradient-to-r from-brand-300 to-[#f6c768]" initial={false} animate={{ width: `${keptShare}%` }} transition={{ duration: 0.5, ease: EASE }} />
                  <span className="h-full flex-1 bg-[#ef8f5b]" />
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-white/75"><span className="h-2 w-2 rounded-full bg-[#f6c768]" /> Vous gardez {keptShare.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</span>
                  <span className="flex items-center gap-1.5 text-white/55"><span className="h-2 w-2 rounded-full bg-[#ef8f5b]" /> Commission {fmtF(commission)}</span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50"><Banknote className="h-4 w-4 text-[#f6c768]" /> Pour vous</p>
                  <p className="mt-1.5 font-figures text-xl font-bold sm:text-2xl">{fmtF(kept)}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50"><Clock className="h-4 w-4 text-[#f6c768]" /> Temps gagné</p>
                  <p className="mt-1.5 font-figures text-xl font-bold sm:text-2xl">~{hoursSaved} h</p>
                  <p className="text-[10.5px] text-white/45">≈ 20 min d’échanges évitées par commande</p>
                </div>
              </div>

              <Link to={registerHref(themeId)} className="btn-gold shine-btn mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-extrabold">
                Ouvrir ma boutique à 0 franc <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tarifs                                                               */
/* ------------------------------------------------------------------ */

function Pricing({ themeId }) {
  return (
    <section className="bg-[#f7f6f2] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle center kicker="Tarifs" title={<>Commencez à <Em>0 franc</Em>. Grandissez à votre rythme.</>} text="Pas de carte bancaire, pas d’engagement : changez de forfait quand vous voulez." /></Reveal>
        <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-3 lg:items-center">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <div className={`relative isolate flex flex-col rounded-[2rem] p-7 ${p.popular ? 'bg-[#0f0c2e] text-white shadow-[0_50px_100px_-40px_rgba(59,47,201,0.85)] ring-1 ring-[#f6c768]/40 lg:py-10' : 'border border-black/10 bg-white'}`}>
                {p.popular && (
                  <>
                    <span className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]" aria-hidden="true">
                      <span className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/40 blur-3xl" />
                      <span className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
                    </span>
                    <span className="btn-gold absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-extrabold">Recommandé</span>
                  </>
                )}
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${p.popular ? 'bg-brand-400/15 text-brand-300' : 'bg-brand-50 text-brand-700'}`}><p.icon className="h-5 w-5" /></span>
                <p className="mt-5 text-xl font-bold">{p.name}</p>
                <p className={`mt-1 text-sm ${p.popular ? 'text-white/65' : 'text-slate-500'}`}>{p.desc}</p>
                <p className="mt-6 flex items-baseline gap-1.5"><span className="text-5xl font-extrabold tracking-tight">{p.price}</span><span className={`text-sm font-semibold ${p.popular ? 'text-white/60' : 'text-slate-500'}`}>FCFA / mois</span></p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.popular ? 'text-brand-300' : 'text-brand-600'}`} /> {f}</li>)}
                </ul>
                <Link to={registerHref(themeId, p.plan)} className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-colors ${p.popular ? 'btn-gold font-extrabold' : 'bg-ink text-white hover:bg-brand-800'}`}>
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-600">
            <Banknote className="mr-1.5 inline h-4 w-4 -translate-y-px text-brand-700" aria-hidden="true" />
            Sur tous les forfaits : <strong className="text-slate-900">0 % de commission</strong> sur le paiement à la livraison,{' '}
            <strong className="text-slate-900">5 %</strong> sur les ventes payées par paiement mobile (Wave, Orange Money, Free Money, Wizall), déduits au moment du reversement.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Questions fréquentes                                                 */
/* ------------------------------------------------------------------ */

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_1.4fr] lg:px-8">
        <Reveal><SectionTitle kicker="Questions fréquentes" title={<>Tout ce que vous <Em>vous demandez</Em>.</>} text="Une autre question ? Écrivez-nous depuis votre tableau de bord, on vous répond vite." /></Reveal>
        <div className="divide-y divide-black/10 border-y border-black/10">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-5 text-left">
                  <span className="text-lg font-bold text-ink">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                      <p className="pb-6 pr-10 leading-relaxed text-slate-600">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Appel final et pied de page (fond « nuit de Dakar »)                 */
/* ------------------------------------------------------------------ */

function NightBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(106,88,232,0.45),transparent_70%),radial-gradient(40%_35%_at_90%_60%,rgba(246,199,104,0.12),transparent_70%)]" />
      <div className="hero-halo absolute left-1/2 top-[42%] h-[380px] w-[380px] rounded-full bg-[conic-gradient(from_90deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-30 blur-[90px] sm:h-[560px] sm:w-[560px]" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden [mask-image:linear-gradient(to_top,black_20%,transparent)]">
        <div className="hero-floor absolute -left-1/2 bottom-0 h-[150%] w-[200%]" />
      </div>
      <div className="hero-grain absolute inset-0 opacity-[0.06] mix-blend-overlay" />
    </div>
  );
}

function FinalCta({ themeId }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#0a0820] px-5 pb-28 pt-28 text-white sm:pb-36 sm:pt-36">
      <NightBackdrop />
      <Sparkle className="twinkle absolute left-[12%] top-[22%] h-5 w-5 text-[#f6c768]" />
      <Sparkle className="twinkle absolute right-[14%] top-[30%] h-4 w-4 text-brand-200" style={{ animationDelay: '1.4s' }} />
      <Sparkle className="twinkle absolute bottom-[22%] left-[22%] h-3 w-3 text-white/80" style={{ animationDelay: '2.3s' }} />
      <div className="relative mx-auto max-w-5xl text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-sm font-semibold text-white/80 ring-1 ring-white/15 backdrop-blur">
            <Sparkle className="h-3.5 w-3.5 text-[#f6c768]" /> Gratuit pour démarrer, sans carte bancaire
          </span>
          <h2 className="mt-7 text-balance text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[6rem]">
            Votre boutique peut être en ligne <span className="font-editorial text-sunrise">aujourd’hui.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl">Créez votre vitrine, ajoutez vos produits et partagez le lien à vos clients. Ils commandent, vous encaissez, vos livreurs livrent.</p>
          <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
            <Magnetic strength={0.22} className="w-full sm:w-auto">
              <Link to={registerHref(themeId)} className="btn-gold shine-btn group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-extrabold">
                Créer ma boutique gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link to="/boutiques" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.06] px-7 py-4 font-bold text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/10">
              <Store className="h-4 w-4" /> Voir les boutiques
            </Link>
          </div>
          <div className="mt-7 flex justify-center">
            <InstallAppButton variant="link" label="Installer SamaBoutik sur votre téléphone ou votre ordinateur" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#0a0820] text-white/55">
      <div className="mx-auto max-w-7xl border-t border-white/10 px-5 lg:px-8">
        <div className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-lg" />
            <span className="text-sm">La boutique en ligne des commerçants du Sénégal.</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold [&_a]:inline-flex [&_a]:min-h-9 [&_a]:items-center" aria-label="Liens du pied de page">
            <Link to="/boutiques" className="transition-colors hover:text-white">Boutiques près de moi</Link>
            <a href="#tarifs" onClick={(e) => goTo(e, '#tarifs')} className="transition-colors hover:text-white">Tarifs</a>
            <a href="#faq" onClick={(e) => goTo(e, '#faq')} className="transition-colors hover:text-white">Questions</a>
            <Link to="/login" className="transition-colors hover:text-white">Se connecter</Link>
            <Link to="/register" className="transition-colors hover:text-white">Créer ma boutique</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} SamaBoutik. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand-300" /> Paiements sécurisés par PayDunya</p>
        </div>
      </div>
      <p className="footer-wordmark pointer-events-none -mb-[0.2em] select-none text-center text-[16.5vw] font-extrabold leading-none tracking-[-0.06em] sm:-mt-2" aria-hidden="true">SamaBoutik</p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const [themeId, setThemeId] = useState('emeraude');
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-clip bg-white font-sans text-ink">
        <ScrollProgress />
        <Navbar />
        <main>
          <div className="bg-[#f7f6f2]"><Hero themeId={themeId} setThemeId={setThemeId} /></div>
          <Commerces />
          <Deferred id="produit" minHeight={1300}><ProductShowcase /></Deferred>
          <Deferred id="parcours" minHeight={1150}><HowItWorks /></Deferred>
          <Deferred id="themes" minHeight={900}><Themes themeId={themeId} onPick={setThemeId} /></Deferred>
          <Deferred minHeight={1100}><Included /></Deferred>
          <Deferred minHeight={800}><LiveExperience themeId={themeId} /></Deferred>
          <Deferred id="tarifs" minHeight={1000}><Pricing themeId={themeId} /></Deferred>
          <Deferred id="faq" minHeight={700}><Faq /></Deferred>
          <Deferred minHeight={700}><FinalCta themeId={themeId} /></Deferred>
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
