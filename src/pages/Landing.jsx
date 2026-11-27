import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig, useInView, useReducedMotion, useScroll, useMotionValueEvent, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Check, Menu, X, ShieldCheck, Bike, BarChart3, Users, Rocket, Zap, Gem,
  ChevronDown, Banknote, Bell, LayoutDashboard, Store, ShoppingBag, UserRound, ChevronLeft, ChevronRight,
  Pause, Play, RotateCcw, Calculator, Clock, Package, Truck,
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
import { PAYMENT_CHOICES } from '../utils/payments';
import {
  QrCode as DuoQrCode, ChartBar as DuoChart, Wallet as DuoWallet, Images as DuoImages, Users as DuoUsers,
  MapTrifold as DuoMap, MapPin as DuoPin, SealCheck as DuoSeal, Star as DuoStar, Megaphone as DuoMegaphone,
  WhatsApp as DuoWhatsApp, LockKey as DuoLock, Palette as DuoPalette, Truck as DuoTruck,
} from '../components/dashboard/icons';

const EASE = [0.16, 1, 0.3, 1];
// ?v=2 : captures refaites (design Indigo & Or) ; le numéro force les navigateurs à oublier les anciennes.
const SCREEN = (name) => `/images/landing/screens/${name}.webp?v=2`;
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
    <section onMouseMove={onMove} onMouseLeave={onLeave} className="relative isolate overflow-hidden bg-[#0a0820] pb-36 pt-28 text-white sm:pb-44 lg:pt-36">
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
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ruban croisé (passage du héros à la suite)                           */
/* ------------------------------------------------------------------ */

const RIBBON_GOLD = ['Wave', 'Orange Money', 'Free Money', 'Wizall', 'Paiement à la livraison', 'Commandes WhatsApp'];
const RIBBON_INDIGO = ['Livreurs suivis en direct', 'Code de livraison', '6 thèmes de vitrine', 'QR code', 'Statistiques', 'Boutiques près de moi'];

function RibbonBand({ items, reverse = false }) {
  return (
    <div className={`marquee-track ${reverse ? 'marquee-reverse' : ''}`} style={{ animationDuration: '46s' }}>
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? true : undefined}>
          {items.map((t) => (
            <li key={t} className="flex items-center gap-7 whitespace-nowrap pl-7 text-lg font-extrabold uppercase tracking-[-0.01em] sm:text-2xl">
              {t}<Sparkle className="h-4 w-4 shrink-0 opacity-70 sm:h-5 sm:w-5" />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function Ribbon() {
  return (
    <div className="relative z-10 -mt-24 h-[180px] overflow-hidden bg-[linear-gradient(transparent_50%,#f7f6f2_50%)] sm:-mt-28 sm:h-[210px]">
      <div className="absolute inset-x-[-12%] top-[56px] -rotate-[4deg] bg-gradient-to-r from-[#f9d784] via-[#f3a953] to-[#ec8a5a] py-3 text-[#1a1033] shadow-[0_24px_50px_-24px_rgba(243,169,83,0.7)] sm:top-[66px] sm:py-4">
        <RibbonBand items={RIBBON_GOLD} />
      </div>
      <div className="absolute inset-x-[-12%] top-[66px] rotate-[3deg] bg-brand-700 py-3 text-white shadow-[0_24px_50px_-20px_rgba(42,37,128,0.8)] sm:top-[78px] sm:py-4">
        <RibbonBand items={RIBBON_INDIGO} reverse />
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
    <section className="relative bg-[#f7f6f2] pb-20 pt-6 lg:pb-28" aria-labelledby="commerces-titre">
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
    points: ['Aucun compte ni mot de passe à créer', 'Sa position GPS partagée en un geste', 'Paiement à la livraison ou mobile : Wave, Orange Money, Free Money, Wizall'],
    chip: 'Commande envoyée',
    visual: () => <PhoneFrame src={SCREEN('panier')} alt="Formulaire de commande sur la vitrine : paiement à la livraison, Wave, Orange Money, Free Money ou Wizall" />,
  },
  {
    tab: 'Notification', actor: 'boutique', icon: Bell,
    title: 'Vous êtes prévenu tout de suite sur WhatsApp',
    text: 'La commande arrive sur votre téléphone avec tout ce qu’il faut pour la préparer.',
    points: ['Articles, adresse et téléphone du client', 'Une alerte sonore dans votre tableau de bord', 'Le client reçoit sa confirmation et son code de livraison'],
    chip: 'Nouvelle commande',
    visual: () => <WhatsAppScreen />,
  },
  {
    tab: 'Livraison', actor: 'livreur', icon: Bike,
    title: 'Le livreur part, le client le suit en direct',
    text: 'Votre livreur accepte la course depuis son téléphone. Sa position est partagée pendant tout le trajet.',
    points: ['La course apparaît dans l’application du livreur', 'Le client voit son livreur arriver sur la carte', 'Appel ou WhatsApp en un geste'],
    chip: 'Position en direct',
    visual: () => <PhoneFrame src={SCREEN('livreur-course')} alt="Application livreur avec une course en cours" />,
  },
  {
    tab: 'Code PIN', actor: 'livreur', icon: ShieldCheck,
    title: 'Remis avec un code, à la bonne personne',
    text: 'À l’arrivée, le livreur demande au client son code secret à 4 chiffres.',
    points: ['Un code différent pour chaque commande', 'Impossible de valider la livraison sans lui', 'Les essais au hasard sont bloqués'],
    chip: 'Livraison validée',
    visual: () => <PhoneFrame src={SCREEN('livreur-code')} alt="Saisie du code client pour valider la livraison" />,
  },
  {
    tab: 'Paiement', actor: 'boutique', icon: Banknote,
    title: 'L’argent arrive chez vous',
    text: 'Votre journée se lit d’un coup d’œil : ce qui est encaissé, ce que doivent les livreurs, et votre part.',
    points: ['Paiements mobiles reversés sur votre numéro', 'Espèces encaissées par votre livreur', 'Le bilan de chaque livreur, chaque jour'],
    chip: '+ 47 500 F aujourd’hui',
    chipAt: 'bottom-[14%]', // sous la caisse du jour, pour ne pas cacher le montant
    visual: () => <PhoneFrame src={SCREEN('tableau-mobile')} alt="Tableau de bord sur téléphone : caisse du jour, frais de livraison et votre part" />,
  },
];

// Focus arrivé au clavier (et non par un clic) : sert à suspendre le défilement pour qui navigue au clavier.
const isKeyboardFocus = (el) => {
  try { return el.matches(':focus-visible'); } catch { return true; }
};

function HowItWorks() {
  const sectionRef = useRef(null);
  const tabsRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  // 'auto' : défile seul (suspendu au survol et au clavier) · 'paused' : arrêté par le visiteur · 'forced' : relancé par le visiteur
  const [mode, setMode] = useState('auto');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const running = !reduce && inView && (mode === 'forced' || (mode === 'auto' && !hovered && !focused));
  const step = STEPS[active];

  const go = (i) => setActive((i + STEPS.length) % STEPS.length);
  // Dès que le visiteur choisit lui-même une étape, le défilement automatique s'arrête ; il peut le relancer.
  const pick = (i) => { setMode('paused'); go(i); };

  // Garde l'onglet actif visible dans la barre défilante (téléphone), sans faire défiler la page.
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.children[active];
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  const onTabKey = (e) => {
    const moves = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: STEPS.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (moves[e.key] + STEPS.length) % STEPS.length;
    pick(next);
    tabsRef.current?.children[next]?.focus();
  };

  return (
    <section
      ref={sectionRef}
      onFocus={(e) => { if (isKeyboardFocus(e.target)) setFocused(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
      className="relative overflow-hidden bg-ink py-20 text-white lg:py-28"
    >
      <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-brand-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal><SectionTitle light kicker="Comment ça marche" title={<>De la commande à l’argent encaissé, <Em light>en 5 étapes</Em>.</>} /></Reveal>
          <div className="flex items-center gap-2" role="group" aria-label="Commandes du parcours">
            <button type="button" onClick={() => pick(active - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10" aria-label="Étape précédente"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => pick(active + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10" aria-label="Étape suivante"><ChevronRight className="h-5 w-5" /></button>
            {!reduce && (
              <button type="button" onClick={() => setMode((m) => (m === 'paused' ? 'forced' : 'paused'))} className="ml-1 inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/10">
                {mode === 'paused' ? <><Play className="h-4 w-4" /> Lecture</> : <><Pause className="h-4 w-4" /> Pause</>}
              </button>
            )}
          </div>
        </div>

        {/* Onglets des 5 étapes, avec barre de progression */}
        <div ref={tabsRef} role="tablist" aria-label="Étapes" onKeyDown={onTabKey} className="scrollbar-hide -mx-5 mt-12 flex gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {STEPS.map((s, i) => {
            const selected = i === active;
            const Icon = s.icon;
            return (
              <button
                key={s.tab}
                id={`how-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="how-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => pick(i)}
                className={`relative min-w-[170px] shrink-0 overflow-hidden rounded-2xl border px-4 pb-4 pt-5 text-left transition-colors lg:min-w-0 ${selected ? 'border-white/25 bg-white/10' : 'border-white/10 hover:bg-white/5'}`}
              >
                <span className="absolute inset-x-4 top-2.5 h-[3px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  {selected ? (
                    reduce
                      ? <span className="block h-full w-full bg-brand-400" />
                      : <span key={`${i}-${active}`} className="step-progress block h-full w-full bg-brand-400" style={{ animationDuration: `${STEP_DURATION_MS}ms`, animationPlayState: running ? 'running' : 'paused' }} onAnimationEnd={() => go(active + 1)} />
                  ) : i < active ? <span className="block h-full w-full bg-brand-400/60" /> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-brand-400 text-ink' : 'bg-white/10 text-white/70'}`}><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0">
                    <span className={`block text-[11px] font-bold uppercase tracking-wider ${selected ? 'text-brand-300' : 'text-white/60'}`}>Étape {i + 1}</span>
                    <span className={`block truncate font-bold ${selected ? 'text-white' : 'text-white/75'}`}>{s.tab}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Scène de l'étape active */}
        <div
          id="how-panel"
          role="tabpanel"
          aria-labelledby={`how-tab-${active}`}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovered(false); }}
          className="mt-6 grid items-center gap-12 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-14"
        >
          {/* Les 5 textes sont superposés dans la même case : le bloc garde la hauteur du plus long,
              donc la page ne bouge pas quand l'étape change. Seul le texte de l'étape active est visible et lu. */}
          <div className="grid">
            {STEPS.map((s, i) => {
              const shown = i === active;
              const actor = ACTORS[s.actor];
              return (
                <div
                  key={s.tab}
                  aria-hidden={!shown}
                  className={`col-start-1 row-start-1 transition-[opacity,translate,visibility] duration-300 ease-out motion-reduce:transition-none ${shown ? 'visible translate-y-0 opacity-100 delay-150' : 'invisible translate-y-3 opacity-0'}`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold tabular-nums text-white/60">0{i + 1} / 0{STEPS.length}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${actor.cls}`}><actor.icon className="h-3.5 w-3.5" /> {actor.label}</span>
                  </div>
                  <h3 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/70">{s.text}</p>
                  <ul className="mt-8 space-y-3.5">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-400/15 text-brand-300"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                        <span className="text-white/85">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="relative mx-auto w-[240px] sm:w-[268px]">
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-brand-400/20 blur-3xl" aria-hidden="true" />
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 28, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -18, rotate: 2 }} transition={{ duration: 0.5, ease: EASE }} className="relative">
                {step.visual()}
                <motion.div initial={{ opacity: 0, x: -14, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.35, duration: 0.45, ease: EASE }} className={`absolute -left-10 ${step.chipAt || 'top-[42%]'} flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] sm:-left-16`} aria-hidden="true">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><step.icon className="h-4 w-4" /></span>
                  <span className="whitespace-nowrap text-sm font-bold">{step.chip}</span>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
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

// Carte de la grille « Tout est inclus ». tone : light (blanc), ink (nuit) ou indigo (dégradé de la marque).
function Tile({ icon: Icon, title, text, children, className = '', tone = 'light' }) {
  const dark = tone !== 'light';
  const surface = {
    light: 'border border-black/[0.06] bg-white',
    ink: 'bg-ink text-white',
    indigo: 'bg-gradient-to-br from-brand-700 via-brand-900 to-night text-white',
  }[tone];
  return (
    <Reveal className={className}>
      <SpotlightCard className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(18,16,58,0.35)] ${surface}`}>
        <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${dark ? 'bg-white/10 text-amber-300 ring-1 ring-white/15' : 'bg-gradient-to-br from-brand-50 to-white text-brand-700 ring-1 ring-brand-100'}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className={`text-[17px] font-bold ${dark ? 'text-white' : 'text-ink'}`}>{title}</h3>
        <p className={`mt-1.5 text-sm leading-relaxed ${dark ? 'text-white/65' : 'text-slate-600'}`}>{text}</p>
        {children && <div className="mt-5 flex flex-1 flex-col justify-end">{children}</div>}
      </SpotlightCard>
    </Reveal>
  );
}

const STAT_BARS = [28, 36, 31, 44, 40, 52, 47, 58, 54, 66, 61, 74, 70, 86];
const MAP_PINS = [[22, 62, false], [46, 40, true], [70, 70, false], [84, 34, false]]; // [x %, y %, boutique mise en avant]

function Included() {
  const reduce = useReducedMotion();
  const appear = (i, from) => (reduce ? {} : { initial: from, whileInView: { opacity: 1, x: 0, y: 0, scaleY: 1 }, viewport: { once: true }, transition: { duration: 0.55, delay: 0.15 + i * 0.05, ease: EASE } });
  return (
    <section className="bg-[#f7f6f2] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle kicker="Tout est inclus" title={<>Les outils d’une grande enseigne, <Em>dans votre poche</Em>.</>} text="Pensés pour le commerce au Sénégal : rapides même en 3G, simples à prendre en main, sans application à installer." /></Reveal>

        {/* Grille de 4 colonnes x 4 rangées sur ordinateur (2 colonnes sur tablette), remplie sans trou */}
        <div className="mt-12 grid grid-flow-row-dense gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-4">
          <Tile tone="ink" icon={DuoQrCode} title="QR code de boutique" text="À coller sur votre comptoir ou vos sacs : un scan, et le client est sur votre vitrine." className="lg:row-span-2">
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2">
              <div className="relative rounded-2xl bg-white p-3 shadow-[0_0_70px_-12px_rgba(138,124,241,0.7)]">
                <QRCodeSVG value="https://samaboutik-nine.vercel.app/boutiques" size={128} fgColor={BRAND.ink} />
                <span className="qr-scan pointer-events-none absolute inset-x-2 top-3 h-0.5 rounded-full bg-brand-500 shadow-[0_0_14px_3px_rgba(106,88,232,0.65)]" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-white/50">Scannez : l’annuaire s’ouvre</p>
            </div>
          </Tile>

          <Tile icon={DuoChart} title="Statistiques" text="Chiffre d’affaires, commandes, panier moyen et taux de livraison, sur 7, 30 ou 90 jours." className="sm:col-span-2">
            <div className="flex items-end gap-5">
              <div className="shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">30 derniers jours</p>
                <p className="font-figures text-2xl font-bold text-ink tabular-nums">545 000 F</p>
              </div>
              <div className="flex h-20 flex-1 items-end gap-1" aria-hidden="true">
                {STAT_BARS.map((h, i) => (
                  <motion.span key={i} {...appear(i, { scaleY: 0 })} className={`flex-1 origin-bottom rounded-t-md transition-colors ${i === STAT_BARS.length - 1 ? 'bg-brand-600' : 'bg-brand-100 group-hover:bg-brand-200'}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </Tile>

          <Tile icon={DuoWallet} title="5 façons de payer" text="Vos clients choisissent : à la livraison, Wave, Orange Money, Free Money ou Wizall." className="lg:row-span-2">
            <ul className="space-y-2">
              {PAYMENT_CHOICES.map((m, i) => (
                <motion.li key={m.id} {...appear(i, { opacity: 0, x: 14 })} className="flex items-center gap-3 rounded-2xl bg-[#f7f6f2] px-3 py-2.5 ring-1 ring-black/[0.04]">
                  {m.id === 'ON_DELIVERY' ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-black/5"><DuoTruck className="h-5 w-5" /></span>
                  ) : m.logo ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-black/5"><img src={m.logo} alt="" loading="lazy" className="max-h-full max-w-full object-contain" /></span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold" style={{ background: m.tint, color: m.ink }} aria-hidden="true">{m.monogram}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{m.label}</span>
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                </motion.li>
              ))}
            </ul>
          </Tile>

          <Tile icon={DuoImages} title="Photos allégées" text="Vos photos sont compressées automatiquement : la vitrine s’ouvre vite, même en 3G.">
            <p className="flex items-baseline gap-2 font-extrabold text-ink"><span className="text-sm text-slate-400 line-through">4,2 Mo</span><ArrowRight className="h-4 w-4 self-center text-brand-600" /><span className="font-figures text-2xl">180 Ko</span></p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <motion.div className="h-full w-[6%] rounded-full bg-gradient-to-r from-brand-500 to-amber-400" {...(reduce ? {} : { initial: { width: '100%' }, whileInView: { width: '6%' }, viewport: { once: true }, transition: { duration: 1.4, delay: 0.3, ease: EASE } })} />
            </div>
          </Tile>

          <Tile icon={DuoUsers} title="Équipe de livreurs" text="Ajoutez vos livreurs : ils acceptent les courses et vous voyez le bilan de chacun.">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex -space-x-2">{['L', 'M', 'B', 'A'].map((l, i) => <span key={l} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white ${['bg-brand-700', 'bg-amber-600', 'bg-sky-700', 'bg-ink'][i]}`}>{l}</span>)}</div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">4 courses aujourd’hui</span>
            </div>
          </Tile>

          <Tile icon={DuoMap} title="Boutiques près de moi" text="Votre boutique apparaît sur la carte des commerçants de votre quartier." className="sm:col-span-2">
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">
              <Link to="/boutiques" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">Voir l’annuaire <ArrowUpRight className="h-4 w-4" /></Link>
              <div className="relative h-24 w-full overflow-hidden rounded-2xl bg-[#eceaf6] ring-1 ring-black/5 sm:max-w-[18rem]" aria-hidden="true">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 256 96" preserveAspectRatio="none" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round">
                  <path d="M-10 72 C 60 58, 120 92, 270 38" /><path d="M72 -10 L 98 110" /><path d="M184 -10 C 172 40, 204 70, 192 110" />
                </svg>
                {MAP_PINS.map(([x, y, main]) => (
                  <span key={`${x}-${y}`} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${x}%`, top: `${y}%` }}>
                    {main && <span className="absolute left-1/2 top-3/4 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/35 motion-safe:animate-ping" />}
                    <DuoPin className={`relative h-6 w-6 drop-shadow-sm ${main ? 'text-brand-700' : 'text-slate-400'}`} />
                  </span>
                ))}
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink shadow-sm">Chez Awa · 4,8 <DuoStar className="h-3 w-3 text-amber-400" /></span>
              </div>
            </div>
          </Tile>

          <Tile icon={DuoSeal} title="Avis vérifiés" text="Les avis de vos clients livrés portent le badge « achat vérifié ».">
            <div className="rounded-2xl bg-[#f7f6f2] p-3 ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-0.5" role="img" aria-label="5 étoiles sur 5">{[1, 2, 3, 4, 5].map((s) => <DuoStar key={s} className="h-4 w-4 text-amber-400" />)}</div>
              <p className="mt-1.5 text-xs font-medium text-slate-700">« Livré en 2 h, très bon accueil. »</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><DuoSeal className="h-3.5 w-3.5" /> Achat vérifié</span>
            </div>
          </Tile>

          <Tile tone="indigo" icon={DuoMegaphone} title="Affiche pour WhatsApp" text="En un clic : photo, prix, lien et QR code de votre boutique, prêts pour votre statut." className="lg:row-span-2">
            <div className="flex flex-1 flex-col items-center justify-end gap-3" aria-hidden="true">
              <div className="w-full max-w-[11rem] -rotate-3 overflow-hidden rounded-2xl bg-night shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:rotate-0">
                <div className="flex items-center gap-1.5 px-2.5 pt-2.5"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[8px] font-bold">C</span><span className="text-[9px] font-bold">Chez Awa</span></div>
                <div className="relative mx-2.5 mt-2 aspect-[4/5] overflow-hidden rounded-xl">
                  <img src="/images/landing/boutique-mode-640.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1.5 right-1.5 rounded-full bg-brand-600 px-2 py-0.5 font-figures text-[10px] font-bold">18 500 F</span>
                </div>
                <p className="px-2.5 pt-2 text-[11px] font-bold">Robe wax Teranga</p>
                <div className="m-2.5 flex items-center justify-between rounded-lg bg-white p-1.5 text-ink"><span className="text-[8px] font-bold leading-tight">Commandez<br />ici</span><QRCodeSVG value="https://samaboutik-nine.vercel.app/boutiques" size={30} fgColor={BRAND.ink} /></div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#25D366]/25"><DuoWhatsApp className="h-4 w-4" /> Partager</span>
            </div>
          </Tile>

          <Tile icon={DuoLock} title="Données protégées" text="Les informations de vos clients restent privées, et chaque livraison est confirmée par un code." className="sm:col-span-2 lg:col-span-1">
            <div className="flex gap-1.5" aria-hidden="true">
              {['4', '8', '3', '0'].map((d, i) => <motion.span key={i} {...appear(i, { opacity: 0, y: 8 })} className="flex h-10 w-9 items-center justify-center rounded-xl bg-[#f7f6f2] font-figures text-lg font-bold text-ink ring-1 ring-black/5">{d}</motion.span>)}
            </div>
          </Tile>

          <Tile icon={DuoPalette} title="6 thèmes de vitrine" text="Changez l’allure de votre vitrine en un geste, sans toucher à vos produits." className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {SHOP_THEMES.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-full bg-[#f7f6f2] py-1.5 pl-1.5 pr-3 text-xs font-bold text-ink ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5">
                  <span className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: t.accent }} /> {t.name}
                </span>
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Commerces                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Expérience en Direct & Simulateur Interactif                       */
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

const DEMO_PRODUCTS = [
  {
    id: 'wax',
    name: 'Robe Soie & Wax Brodé',
    category: 'Mode & Couture',
    price: 25000,
    img: 'boutique-vetements',
    variants: ['Taille S', 'Taille M', 'Taille L'],
    defaultVariant: 'Taille M',
    themeName: 'Terracotta',
    themeId: 'terracotta',
  },
  {
    id: 'panier',
    name: 'Panier Fraîcheur Bio Dakar',
    category: 'Épicerie & Frais',
    price: 12500,
    img: 'marche-fruits',
    variants: ['5 kg', '10 kg (Famille)'],
    defaultVariant: '5 kg',
    themeName: 'Émeraude',
    themeId: 'emeraude',
  },
  {
    id: 'sac',
    name: 'Sac Cuir Artisanal Ngor',
    category: 'Artisanat & Cadeaux',
    price: 18000,
    img: 'artisanat',
    variants: ['Noir Ébène', 'Camel Terracotta'],
    defaultVariant: 'Camel Terracotta',
    themeName: 'Épure',
    themeId: 'epure',
  },
];

function LiveExperience({ themeId }) {
  const [tab, setTab] = useState('demo'); // 'demo' | 'calculator'
  const [selectedProd, setSelectedProd] = useState(DEMO_PRODUCTS[0]);
  const [selectedVar, setSelectedVar] = useState(DEMO_PRODUCTS[0].defaultVariant);
  const [payMethod, setPayMethod] = useState('wave'); // 'wave' | 'cash'
  const [simStep, setSimStep] = useState(0); // 0 = idle, 1..4 = steps
  const [isSimulating, setIsSimulating] = useState(false);

  // Pour le simulateur de revenus
  const [ordersPerDay, setOrdersPerDay] = useState(15);
  const [avgBasket, setAvgBasket] = useState(18000);
  const [onlineShare, setOnlineShare] = useState(50); // % des ventes payées par Wave / Orange Money

  const monthlyOrders = ordersPerDay * 30;
  const monthlyRevenue = monthlyOrders * avgBasket;
  const commission = Math.round(monthlyRevenue * (onlineShare / 100) * ONLINE_COMMISSION_RATE);
  const hoursSaved = Math.round((monthlyOrders * 20) / 60); // hypothèse affichée : 20 min d'échanges évitées par commande

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);
    playChime();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: [BRAND.vivid, BRAND.light, BRAND.gold, '#fde68a', '#ffffff'],
      });
    } catch {
      // ignore
    }

    setTimeout(() => setSimStep(2), 700);
    setTimeout(() => setSimStep(3), 1400);
    setTimeout(() => {
      setSimStep(4);
      setIsSimulating(false);
    }, 2100);
  };

  const resetSimulation = () => {
    setSimStep(0);
    setIsSimulating(false);
  };

  return (
    <section className="relative overflow-hidden py-24 lg:py-32 bg-night text-white">
      {/* Effets lumineux néon d'ambiance */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[140px]" />
        <div className="absolute bottom-0 right-10 h-[450px] w-[450px] rounded-full bg-brand-600/10 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* En-tête de section */}
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-brand-300 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-brand-400 animate-ping" />
              <span>Expérience Interactive en Direct</span>
            </div>
            <h2 className="mt-4 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Voyez la magie en action. <Em light>En 10 secondes chrono</Em>.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100/75 sm:text-xl">
              Ne nous croyez pas sur parole : testez vous-même une commande en direct ou calculez le chiffre d’affaires que vous rapportera votre boutique.
            </p>
          </Reveal>

          {/* Onglets principaux : Démo vs Calculateur */}
          <Reveal delay={0.08}>
            <div className="mt-9 inline-flex items-center rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => { setTab('demo'); resetSimulation(); }}
                className={`relative rounded-xl px-5 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  tab === 'demo' ? 'text-night' : 'text-white/70 hover:text-white'
                }`}
              >
                {tab === 'demo' && (
                  <motion.div
                    layoutId="mainTab"
                    className="absolute inset-0 rounded-xl bg-brand-400 shadow-md shadow-brand-400/30"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Tester une commande en direct
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab('calculator')}
                className={`relative rounded-xl px-5 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  tab === 'calculator' ? 'text-night' : 'text-white/70 hover:text-white'
                }`}
              >
                {tab === 'calculator' && (
                  <motion.div
                    layoutId="mainTab"
                    className="absolute inset-0 rounded-xl bg-brand-400 shadow-md shadow-brand-400/30"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Simulateur de chiffre d’affaires
                </span>
              </button>
            </div>
          </Reveal>
        </div>

        {/* CONTENU ONGLET 1 : DÉMO COMMANDE EN DIRECT */}
        {tab === 'demo' && (
          <div className="mt-12">
            <Reveal delay={0.1}>
              <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 lg:p-10 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                {/* Barre de contrôle du terminal */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-brand-500/80" />
                    <span className="ml-2 font-mono text-xs text-white/50">samaboutik-simulator // live-feed</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-bold text-brand-300 ring-1 ring-brand-400/30">
                    <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                    <span>SYSTÈME EN DIRECT</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
                  {/* Côté Gauche (5 colonnes) : Sélection & Commande client */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-400">1. Choisissez un article</span>
                        <span className="text-xs text-white/50">Cliquez pour tester</span>
                      </div>

                      {/* Sélecteur de produit démo */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {DEMO_PRODUCTS.map((p) => {
                          const isSel = selectedProd.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProd(p);
                                setSelectedVar(p.defaultVariant);
                                resetSimulation();
                              }}
                              className={`group relative flex flex-col items-center rounded-2xl p-2.5 text-center transition-all ${
                                isSel
                                  ? 'bg-brand-500/25 ring-2 ring-brand-400'
                                  : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
                              }`}
                            >
                              <img
                                src={`/images/landing/${p.img}-640.webp`}
                                alt={p.name}
                                className="h-14 w-14 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                              />
                              <p className="mt-2 line-clamp-1 text-[11px] font-bold text-white">{p.name}</p>
                              <p className="text-[10px] font-extrabold text-brand-300">{p.price.toLocaleString('fr-FR')} F</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Détail du produit actif */}
                      <div className="mt-5 rounded-2xl bg-black/40 p-4 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">{selectedProd.name}</p>
                            <p className="text-xs text-white/60">{selectedProd.category}</p>
                          </div>
                          <span className="text-lg font-extrabold text-brand-300">
                            {selectedProd.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>

                        {/* Variantes */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-[11px] font-semibold text-white/60">Variante sélectionnée :</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selectedProd.variants.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setSelectedVar(v)}
                                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                  selectedVar === v
                                    ? 'bg-brand-400 text-night'
                                    : 'bg-white/10 text-white/80 hover:bg-white/15'
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mode de paiement */}
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <p className="text-[11px] font-semibold text-white/60">Mode de paiement client :</p>
                          <div className="mt-1.5 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPayMethod('wave')}
                              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                                payMethod === 'wave'
                                  ? 'bg-[#1dc4e9]/20 text-[#1dc4e9] ring-2 ring-[#1dc4e9]'
                                  : 'bg-white/5 text-white/70 hover:bg-white/10 ring-1 ring-white/10'
                              }`}
                            >
                              <img src="/logos/wave.png" alt="Wave" className="h-4 w-4 rounded-full object-contain" />
                              <span>Paiement Wave</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayMethod('cash')}
                              className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                                payMethod === 'cash'
                                  ? 'bg-amber-400/20 text-amber-300 ring-2 ring-amber-400'
                                  : 'bg-white/5 text-white/70 hover:bg-white/10 ring-1 ring-white/10'
                              }`}
                            >
                              <Banknote className="h-4 w-4" />
                              <span>À la livraison</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bouton d'action pour lancer la commande */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-brand-400 via-brand-500 to-amber-300 py-4 text-base font-extrabold text-night shadow-lg shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      >
                        {isSimulating ? (
                          <>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-night border-t-transparent" />
                            <span>Simulation du flux en cours…</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5 fill-night" />
                            <span>Tester la commande en 1 clic 🚀</span>
                          </>
                        )}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-white/50">
                        Déclenche instantanément la synchronisation en direct.
                      </p>
                    </div>
                  </div>

                  {/* Côté Droit (7 colonnes) : Pipeline en Temps Réel */}
                  <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                            <Zap className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">Pipeline des Opérations SamaBoutik</p>
                            <p className="text-[11px] text-white/50">Automatisation complète du panier jusqu’à la livraison</p>
                          </div>
                        </div>

                        {simStep > 0 && (
                          <button
                            type="button"
                            onClick={resetSimulation}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/15"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
                          </button>
                        )}
                      </div>

                      {/* Flux d'étapes animées */}
                      <div className="mt-6 space-y-3.5">
                        {/* Étape 1 : Expérience Client */}
                        <div
                          className={`flex items-start gap-3.5 rounded-2xl p-4 transition-all duration-500 ${
                            simStep >= 1
                              ? 'bg-brand-500/15 border border-brand-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 1 ? 'bg-brand-400 text-night shadow-md shadow-brand-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 1 ? '✓' : '1'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Étape 1 • Expérience Client</p>
                              {simStep >= 1 && <span className="font-mono text-[10px] text-brand-300 font-bold">Sans compte</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 1 ? 'Commande #SB-892 validée sans création de compte' : 'En attente du clic client sur le panier…'}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              Article : {selectedProd.name} ({selectedVar}) • Reçu de commande numérique généré instantanément.
                            </p>
                          </div>
                        </div>

                        {/* Étape 2 : Règlement */}
                        <div
                          className={`flex items-start gap-3.5 rounded-2xl p-4 transition-all duration-500 ${
                            simStep >= 2
                              ? 'bg-brand-500/15 border border-brand-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 2 ? 'bg-brand-400 text-night shadow-md shadow-brand-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 2 ? '✓' : '2'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Étape 2 • Flux Financier Sécurisé</p>
                              {simStep >= 2 && <span className="font-mono text-[10px] text-brand-300 font-bold">{payMethod === 'wave' ? 'Confirmé' : 'À la livraison'}</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 2
                                ? (payMethod === 'wave' ? `Paiement Wave ${selectedProd.price.toLocaleString('fr-FR')} F certifié en direct` : `Paiement en espèces prévu à la remise (${selectedProd.price.toLocaleString('fr-FR')} F)`)
                                : 'Validation automatique du règlement sans capture d’écran…'}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {payMethod === 'wave' ? 'Reversement automatique sur le numéro Wave ou Orange Money du marchand, moins 5 % de commission.' : 'Le livreur encaisse la somme exacte à la remise du colis • aucune commission.'}
                            </p>
                          </div>
                        </div>

                        {/* Étape 3 : Marchand */}
                        <div
                          className={`flex items-start gap-3.5 rounded-2xl p-4 transition-all duration-500 ${
                            simStep >= 3
                              ? 'bg-brand-500/15 border border-brand-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 3 ? 'bg-brand-400 text-night shadow-md shadow-brand-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 3 ? '✓' : '3'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Étape 3 • Tableau de Bord Marchand</p>
                              {simStep >= 3 && <span className="font-mono text-[10px] text-brand-300 font-bold">Bip reçu 🔔</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 3 ? 'Notification WhatsApp envoyée & stock mis à jour' : 'Alerte sonore et notification WhatsApp automatique…'}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              Le marchand prépare le colis sans avoir échangé 20 messages WhatsApp au préalable.
                            </p>
                          </div>
                        </div>

                        {/* Étape 4 : Livreur & PIN */}
                        <div
                          className={`flex items-start gap-3.5 rounded-2xl p-4 transition-all duration-500 ${
                            simStep >= 4
                              ? 'bg-brand-500/25 border-2 border-brand-400 shadow-lg shadow-brand-500/20'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 4 ? 'bg-brand-400 text-night shadow-md shadow-brand-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 4 ? '✓' : '4'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Étape 4 • Course & Livraison Sécurisée</p>
                              {simStep >= 4 && <span className="inline-flex items-center gap-1 rounded-full bg-brand-400 text-night px-2 py-0.5 text-[10px] font-black">PIN ACTIF</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 4 ? 'Livreur Modou en route avec itinéraire Google Maps' : 'Attribution de la course et génération du code PIN…'}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {simStep >= 4 ? '🔒 Code PIN secret envoyé au client : 5834. Aucun colis égaré.' : 'Position GPS partagée en direct sur le téléphone du client.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Résumé de fin de simulation */}
                    {simStep === 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-brand-500/20 p-4 border border-brand-400/30 sm:flex-row"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-400 text-night font-black">
                            ✓
                          </span>
                          <div>
                            <p className="text-sm font-extrabold text-white">Parcours complet : de la commande à la livraison.</p>
                            <p className="text-xs text-brand-200">Voici, en accéléré, ce que vivront vos clients.</p>
                          </div>
                        </div>
                        <Link
                          to={registerHref(selectedProd.themeId || themeId)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-night shadow-md hover:bg-brand-100 transition-colors"
                        >
                          <span>Lancer ma boutique maintenant</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        )}

        {/* CONTENU ONGLET 2 : SIMULATEUR DE REVENUS & GAINS */}
        {tab === 'calculator' && (
          <div className="mt-12">
            <Reveal delay={0.1}>
              <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 lg:p-12 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                  {/* Curseurs interactifs (6 colonnes) */}
                  <div className="lg:col-span-6 space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="orders-slider" className="text-sm font-bold text-white">Commandes par jour :</label>
                        <span className="shrink-0 whitespace-nowrap rounded-xl bg-brand-400 px-3 py-1 font-mono text-sm font-extrabold text-night">
                          {ordersPerDay} commandes / j
                        </span>
                      </div>
                      <input
                        id="orders-slider"
                        type="range"
                        min="2"
                        max="50"
                        step="1"
                        value={ordersPerDay}
                        onChange={(e) => setOrdersPerDay(Number(e.target.value))}
                        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-brand-400"
                      />
                      <div className="mt-2 flex justify-between text-[11px] text-white/50">
                        <span>2 / jour</span>
                        <span>25 / jour</span>
                        <span>50 / jour</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="basket-slider" className="text-sm font-bold text-white">Panier moyen par commande :</label>
                        <span className="shrink-0 whitespace-nowrap rounded-xl bg-brand-400 px-3 py-1 font-mono text-sm font-extrabold text-night">
                          {avgBasket.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                      <input
                        id="basket-slider"
                        type="range"
                        min="3000"
                        max="50000"
                        step="1000"
                        value={avgBasket}
                        onChange={(e) => setAvgBasket(Number(e.target.value))}
                        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-brand-400"
                      />
                      <div className="mt-2 flex justify-between text-[11px] text-white/50">
                        <span>3 000 F</span>
                        <span>25 000 F</span>
                        <span>50 000 F</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="online-slider" className="text-sm font-bold text-white">Payé par paiement mobile :</label>
                        <span className="shrink-0 whitespace-nowrap rounded-xl bg-brand-400 px-3 py-1 font-mono text-sm font-extrabold text-night">
                          {onlineShare} %
                        </span>
                      </div>
                      <input
                        id="online-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={onlineShare}
                        onChange={(e) => setOnlineShare(Number(e.target.value))}
                        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-brand-400"
                      />
                      <div className="mt-2 flex justify-between text-[11px] text-white/50">
                        <span>Tout à la livraison</span>
                        <span>Tout en ligne</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-brand-500/10 p-4 border border-brand-400/20 text-xs text-brand-200">
                      💡 <strong>Bon à savoir :</strong> le paiement à la livraison est sans commission. Sur un paiement mobile (Wave, Orange Money, Free Money, Wizall), SamaBoutik garde <strong>5 %</strong> et vous reverse le reste automatiquement.
                    </div>
                  </div>

                  {/* Rendu des calculs en direct (6 colonnes) */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="rounded-3xl border border-brand-400/30 bg-gradient-to-b from-brand-500/20 to-brand-950/40 p-7 lg:p-9 shadow-xl">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-brand-300">Chiffre d’affaires mensuel estimé</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {monthlyRevenue.toLocaleString('fr-FR')} <span className="text-2xl font-bold text-brand-300 sm:text-3xl">FCFA</span>
                      </p>
                      <p className="mt-2 text-xs text-brand-100/70">
                        Soit {monthlyOrders} commandes par mois · vous gardez {(monthlyRevenue - commission).toLocaleString('fr-FR')} FCFA après commission.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-brand-400">
                          <Banknote className="h-5 w-5" />
                          <p className="text-xs font-bold uppercase">Commission SamaBoutik</p>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                          {commission.toLocaleString('fr-FR')} F
                        </p>
                        <p className="mt-1 text-[11px] text-white/60">
                          5 % des ventes payées en ligne · 0 F sur le paiement à la livraison.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-brand-400">
                          <Clock className="h-5 w-5" />
                          <p className="text-xs font-bold uppercase">Temps gagné</p>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                          ~{hoursSaved} heures
                        </p>
                        <p className="mt-1 text-[11px] text-white/60">
                          Estimation : ~20 minutes d’échanges évitées par commande.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={registerHref(themeId)}
                        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-400 py-4 text-base font-extrabold text-night shadow-lg shadow-brand-400/25 transition-all hover:bg-brand-300 hover:scale-[1.01]"
                      >
                        <span>Ouvrir ma boutique à 0 franc</span>
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
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
          <Hero themeId={themeId} setThemeId={setThemeId} />
          <Ribbon />
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
