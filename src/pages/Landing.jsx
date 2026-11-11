import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig, useInView, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Check, Menu, X, ShieldCheck, Bike, MapPinned, Star, BadgeCheck, QrCode, ImageDown,
  BarChart3, Users, Palette, Rocket, Zap, Gem, ChevronDown, Banknote, Bell, LayoutDashboard, Store,
  ShoppingBag, UserRound, ChevronLeft, ChevronRight, Pause, Play, Sparkles, CheckCircle2, XCircle, Smartphone,
  RotateCcw, Calculator, Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { SHOP_THEMES, getShopTheme } from '../components/shop/themes';

const EASE = [0.16, 1, 0.3, 1];
const SCREEN = (name) => `/images/landing/screens/${name}.webp`;
const photoSet = (name) => `/images/landing/${name}-640.webp 640w, /images/landing/${name}-1024.webp 1024w, /images/landing/${name}.webp 1400w`;

// Boutiques de démonstration affichées pour chaque thème (captures du vrai produit).
const DEMO_SHOPS = { emeraude: 'Chez Awa', minuit: 'Maison Diouf', terracotta: 'Wax & Couture', ocean: 'Tech Plateau', rose: 'Belle Peau', epure: 'Studio Fall' };

const PAYMENT_LOGOS = [
  { name: 'Wave', src: '/logos/wave.png', className: 'h-8' },
  { name: 'Orange Money', src: '/logos/orange-money.svg', className: 'h-6' },
  { name: 'PayDunya', src: '/logos/paydunya.png', className: 'h-5' },
  { name: 'WhatsApp', src: '/logos/whatsapp.svg', className: 'h-7' },
  { name: 'Visa', src: '/logos/visa.svg', className: 'h-6' },
  { name: 'Mastercard', src: '/logos/mastercard.svg', className: 'h-7' },
];

// Mêmes limites que le tableau de bord du marchand (onglet Facturation).
const PLANS = [
  {
    id: 'debutant', name: 'Débutant', price: '0', desc: 'Pour lancer votre première boutique.', icon: Rocket, cta: 'Commencer gratuitement', plan: null,
    features: ["Jusqu'à 10 produits", '1 livreur', 'Les 6 thèmes de vitrine', 'Paiement à la livraison et mobile money', 'Notifications WhatsApp'],
  },
  {
    id: 'pro', name: 'Pro', price: '5 000', desc: 'Pour les commerçants qui vendent chaque jour.', icon: Zap, cta: 'Choisir Pro', plan: 'pro', popular: true,
    features: ['Produits illimités', "Jusqu'à 5 livreurs", 'Statistiques détaillées', 'Personnalisation avancée', 'Mise en avant « À la une » dans l’annuaire'],
  },
  {
    id: 'premium', name: 'Premium', price: '15 000', desc: 'Pour les grandes boutiques et les équipes.', icon: Gem, cta: 'Choisir Premium', plan: 'premium',
    features: ['Tout le forfait Pro', 'Livreurs illimités', 'Support prioritaire', 'Mise en avant « À la une » dans l’annuaire'],
  },
];

const FAQ = [
  { q: 'Combien coûte SamaBoutik ?', a: "Le forfait Débutant est gratuit, sans carte bancaire : vous créez votre boutique et vendez tout de suite. Les forfaits Pro (5 000 F/mois) et Premium (15 000 F/mois) débloquent plus de produits, plus de livreurs et la mise en avant dans l'annuaire." },
  { q: 'Faut-il savoir créer un site internet ?', a: 'Non. Vous choisissez un nom et un thème, ajoutez vos produits avec une photo et un prix depuis votre téléphone, et votre vitrine est en ligne. Vous la partagez par lien, QR code ou sur WhatsApp.' },
  { q: 'Comment est-ce que je reçois mon argent ?', a: "Pour un paiement Wave ou Orange Money, l'argent est reversé automatiquement sur le numéro indiqué dans vos paramètres. Pour un paiement à la livraison, votre livreur encaisse directement auprès du client." },
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
      <p className={`mb-3 text-sm font-bold uppercase tracking-[0.14em] ${light ? 'text-emerald-300' : 'text-emerald-700'}`}>{kicker}</p>
      <h2 className={`text-balance text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl ${light ? 'text-white' : 'text-[#0b1f17]'}`}>{title}</h2>
      {text && <p className={`mt-5 text-lg leading-relaxed ${light ? 'text-white/70' : 'text-slate-600'}`}>{text}</p>}
    </div>
  );
}

const Em = ({ children, light = false }) => <span className={light ? 'text-emerald-300' : 'text-emerald-600'}>{children}</span>;

// Cadre de téléphone réaliste autour d'une capture du vrai produit.
function PhoneFrame({ src, alt, className = '', eager = false, children }) {
  return (
    <div className={`relative rounded-[2.6rem] bg-[#111] p-[9px] shadow-[0_50px_90px_-40px_rgba(11,31,23,0.75),inset_0_0_0_1.5px_rgba(255,255,255,0.08)] ${className}`}>
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
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_60px_120px_-50px_rgba(11,31,23,0.55)]">
      <div className="flex items-center gap-3 border-b border-black/5 bg-[#f4f5f4] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></span>
        <span className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-black/5">
          <ShieldCheck className="h-3 w-3 text-emerald-600" /> {url}
        </span>
        <span className="w-12" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 20));
  const links = [
    { href: '#produit', label: 'Produit' },
    { href: '#parcours', label: 'Comment ça marche' },
    { href: '#themes', label: 'Thèmes' },
    { href: '#tarifs', label: 'Tarifs' },
    { href: '#faq', label: 'Questions' },
  ];
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? 'border-b border-black/5 bg-white/85 backdrop-blur-xl' : ''}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Navigation principale">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex h-10 items-center" aria-label="SamaBoutik, accueil">
            <img src="/logo.webp" alt="SamaBoutik" width="252" height="186" decoding="async" className="h-full w-auto object-contain" />
          </Link>
          <div className="hidden items-center gap-0.5 lg:flex">
            {links.map((l) => <a key={l.href} href={l.href} onClick={(e) => goTo(e, l.href)} className="rounded-full px-3.5 py-2 text-[15px] font-semibold text-slate-600 transition-colors hover:text-[#0b1f17]">{l.label}</a>)}
            <Link to="/boutiques" className="rounded-full px-3.5 py-2 text-[15px] font-semibold text-slate-600 transition-colors hover:text-[#0b1f17]">Boutiques près de moi</Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-full px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:text-[#0b1f17] sm:block">Se connecter</Link>
          <Link to="/register" className="rounded-full bg-[#0b1f17] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 sm:px-5">Créer ma boutique</Link>
          <button onClick={() => setOpen(!open)} className="rounded-full p-2.5 text-slate-700 hover:bg-black/5 lg:hidden" aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
            <div className="flex flex-col gap-1 px-5 pb-5">
              {links.map((l) => <a key={l.href} href={l.href} onClick={(e) => { setOpen(false); goTo(e, l.href); }} className="rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-black/5">{l.label}</a>)}
              <Link to="/boutiques" className="rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-black/5">Boutiques près de moi</Link>
              <Link to="/login" className="rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-black/5">Se connecter</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Héros                                                                */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = [
  { icon: <img src="/logos/whatsapp.svg" alt="" className="h-5 w-5" />, title: 'Nouvelle commande', text: 'Fatou D. · Robe wax · 19 500 F', time: 'à l’instant' },
  { icon: <img src="/logos/wave.png" alt="" className="h-4 w-auto" />, title: 'Paiement Wave reçu', text: '38 000 F · commande #A4F2', time: 'il y a 2 min' },
  { icon: <Bike className="h-5 w-5 text-sky-600" />, title: 'Livreur en route', text: 'Lamine arrive dans 6 min', time: 'il y a 5 min' },
  { icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />, title: 'Commande livrée', text: 'Code client 4827 validé', time: 'il y a 9 min' },
];

function LiveNotification() {
  const ref = useRef(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!inView || reduce) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % NOTIFICATIONS.length), 3400);
    return () => clearInterval(timer);
  }, [inView, reduce]);
  const n = NOTIFICATIONS[index];
  return (
    <div ref={ref} className="pointer-events-none absolute right-3 top-6 z-20 w-[248px] sm:-right-6 sm:top-10" aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.4, ease: EASE }}
          className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_20px_45px_-18px_rgba(11,31,23,0.5)] ring-1 ring-black/5 backdrop-blur">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">{n.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2"><span className="text-[13px] font-bold text-[#0b1f17]">{n.title}</span><span className="hidden shrink-0 text-[10px] text-slate-500 sm:inline">{n.time}</span></span>
            <span className="block truncate text-xs text-slate-500">{n.text}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ThemeDots({ themeId, onPick }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Thème de la vitrine">
      {SHOP_THEMES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={t.id === themeId} aria-label={`Thème ${t.name}`} title={t.name} onClick={() => onPick(t.id)}
          className={`h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110 ${t.id === themeId ? 'ring-2 ring-[#0b1f17]' : 'ring-1 ring-black/10'}`}
          style={{ background: `linear-gradient(135deg, ${t.accent} 50%, ${t.preview.panel} 50%)` }} />
      ))}
    </div>
  );
}

function Hero({ themeId, setThemeId }) {
  const theme = getShopTheme(themeId);
  return (
    <section className="relative overflow-hidden pb-16 pt-28 lg:pb-24 lg:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_85%_10%,rgba(16,185,129,0.12),transparent_70%),radial-gradient(40%_40%_at_0%_100%,rgba(245,158,11,0.08),transparent_70%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8">
        <div>
          <a href="#themes" onClick={(e) => goTo(e, '#themes')} className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white py-1 pl-1 pr-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-700/30">
            <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">Nouveau</span>
            6 thèmes de vitrine professionnels <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.03] tracking-[-0.035em] text-[#0b1f17] sm:text-6xl lg:text-[4.25rem]">
            Votre boutique en ligne, <Em>prête à vendre</Em> au Sénégal.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Une vitrine à votre image, le paiement par Wave, Orange Money ou à la livraison, les commandes sur WhatsApp et des livreurs suivis en direct. Tout se gère depuis votre téléphone.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to={registerHref(themeId)} className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1f17] px-7 py-4 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(11,31,23,0.7)] transition-all hover:-translate-y-0.5 hover:bg-emerald-800">
              Créer ma boutique gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#produit" onClick={(e) => goTo(e, '#produit')} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-4 text-[15px] font-bold text-slate-800 transition-colors hover:border-slate-400">
              <LayoutDashboard className="h-4 w-4 text-emerald-700" /> Voir le produit
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-sm font-semibold text-slate-500">Paiements acceptés</span>
            <img src="/logos/wave.png" alt="Wave" className="h-7 w-auto" />
            <img src="/logos/orange-money.svg" alt="Orange Money" className="h-5 w-auto" />
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700"><Banknote className="h-5 w-5 text-emerald-600" /> À la livraison</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="relative">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE }} className="relative ml-auto aspect-[4/5] w-[86%] overflow-hidden rounded-[2.25rem] bg-emerald-950 shadow-[0_40px_80px_-35px_rgba(11,31,23,0.6)]">
            <img src="/images/landing/hero-commercante-1024.webp" srcSet={photoSet('hero-commercante')} sizes="(min-width: 1024px) 480px, 86vw" alt="Commerçante qui consulte ses commandes sur son téléphone" width="1400" height="2097" fetchPriority="high" decoding="async" className="h-full w-full object-cover object-[50%_18%]" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
          </motion.div>
          <LiveNotification />
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} className="absolute -bottom-6 left-0 w-[44%] max-w-[230px] sm:left-2">
            <AnimatePresence mode="wait">
              <motion.div key={theme.id} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} exit={{ opacity: 0.4 }} transition={{ duration: 0.25 }}>
                <PhoneFrame src={SCREEN(`vitrine-${theme.id}`)} alt={`Vitrine « ${DEMO_SHOPS[theme.id]} » sur téléphone, thème ${theme.name}`} eager={theme.id === 'emeraude'} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          </div>
          <div className="mt-12 flex flex-col items-center gap-2 sm:ml-[46%] sm:mt-6 sm:items-start">
            <ThemeDots themeId={themeId} onPick={setThemeId} />
            <p className="text-sm text-slate-500">Essayez un thème · <span className="font-semibold text-[#0b1f17]">{theme.name}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Moyens de paiement et outils                                         */
/* ------------------------------------------------------------------ */

function LogoStrip() {
  return (
    <section className="border-y border-black/5 bg-[#f6f7f6] py-8" aria-label="Moyens de paiement et outils intégrés">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 lg:flex-row lg:justify-between lg:px-8">
        <p className="text-sm font-bold text-slate-600">Paiements et outils intégrés, sans rien installer</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {PAYMENT_LOGOS.map((l) => <li key={l.name}><img src={l.src} alt={l.name} loading="lazy" decoding="async" className={`${l.className} w-auto opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0`} /></li>)}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Le tableau de bord                                                   */
/* ------------------------------------------------------------------ */

function ProductShowcase() {
  return (
    <section className="overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle center kicker="Le produit" title={<>Un vrai tableau de bord, <Em>pensé pour le commerce</Em>.</>} text="Commandes en temps réel, chiffre d’affaires, livreurs, stock : tout ce qui compte, au même endroit, sur ordinateur comme sur téléphone." /></Reveal>
        <motion.div initial={{ opacity: 0, y: 60, rotateX: 14 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.1, ease: EASE }} style={{ transformPerspective: 1800 }} className="relative mx-auto mt-14 max-w-6xl">
          <BrowserFrame>
            <img src={SCREEN('tableau-de-bord')} srcSet={`${SCREEN('tableau-de-bord-960')} 960w, ${SCREEN('tableau-de-bord')} 1600w`} sizes="(min-width: 1200px) 1150px, 100vw" alt="Tableau de bord SamaBoutik : chiffre d’affaires, commandes, panier moyen" width="1600" height="1000" loading="lazy" decoding="async" className="block w-full" />
          </BrowserFrame>
          <div className="absolute -bottom-10 -right-2 hidden w-[200px] lg:block xl:-right-10">
            <PhoneFrame src={SCREEN('panier')} alt="Panier et formulaire de commande sur téléphone" />
          </div>
        </motion.div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            { icon: Bell, title: 'Commandes en direct', text: 'Chaque commande arrive avec un son et sur WhatsApp. Vous la traitez en un geste.' },
            { icon: BarChart3, title: 'Vos chiffres, clairs', text: 'Chiffre d’affaires, panier moyen, taux de livraison : sur 7, 30 ou 90 jours.' },
            { icon: Users, title: 'Votre équipe', text: 'Vos livreurs, leurs courses du jour et ce qu’ils doivent vous reverser.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><f.icon className="h-5 w-5" /></span>
                <div><p className="font-bold text-[#0b1f17]">{f.title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p></div>
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
  boutique: { label: 'Côté boutique', icon: Store, cls: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30' },
  livreur: { label: 'Côté livreur', icon: Bike, cls: 'bg-amber-400/15 text-amber-200 ring-amber-300/30' },
};

const STEPS = [
  {
    tab: 'Commande', actor: 'client', icon: ShoppingBag,
    title: 'Le client commande en une minute, sans compte',
    text: 'Depuis votre vitrine, il choisit ses articles et laisse seulement son nom, son téléphone et son adresse.',
    points: ['Aucun compte ni mot de passe à créer', 'Sa position GPS partagée en un geste', 'Paiement à la livraison, par Wave ou par Orange Money'],
    chip: 'Commande envoyée',
    visual: () => <PhoneFrame src={SCREEN('panier')} alt="Panier et formulaire de commande sur la vitrine" />,
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
    points: ['Wave et Orange Money reversés sur votre numéro', 'Espèces encaissées par votre livreur', 'Le bilan de chaque livreur, chaque jour'],
    chip: '+ 67 000 F aujourd’hui',
    visual: () => <PhoneFrame src={SCREEN('tableau-mobile')} alt="Tableau de bord sur téléphone : encaissé aujourd’hui, frais livreurs, votre part" />,
  },
];

function HowItWorks() {
  const sectionRef = useRef(null);
  const tabsRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const running = !reduce && !paused && !hovered && inView;
  const step = STEPS[active];
  const actor = ACTORS[step.actor];

  const go = (i) => setActive((i + STEPS.length) % STEPS.length);

  // Garde l'onglet actif visible dans la barre défilante (téléphone), sans faire défiler la page.
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.children[active];
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (active + (e.key === 'ArrowRight' ? 1 : -1) + STEPS.length) % STEPS.length;
    go(next);
    tabsRef.current?.children[next]?.focus();
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#0b1f17] py-20 text-white lg:py-28">
      <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal><SectionTitle light kicker="Comment ça marche" title={<>De la commande à l’argent encaissé, <Em light>en 5 étapes</Em>.</>} /></Reveal>
          <div className="flex items-center gap-2" aria-label="Commandes du parcours">
            <button type="button" onClick={() => go(active - 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10" aria-label="Étape précédente"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(active + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10" aria-label="Étape suivante"><ChevronRight className="h-5 w-5" /></button>
            {!reduce && (
              <button type="button" onClick={() => setPaused((p) => !p)} className="ml-1 inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/10" aria-pressed={paused}>
                {paused ? <><Play className="h-4 w-4" /> Lecture</> : <><Pause className="h-4 w-4" /> Pause</>}
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
                onClick={() => go(i)}
                className={`relative min-w-[170px] shrink-0 overflow-hidden rounded-2xl border px-4 pb-4 pt-5 text-left transition-colors lg:min-w-0 ${selected ? 'border-white/25 bg-white/10' : 'border-white/10 hover:bg-white/5'}`}
              >
                <span className="absolute inset-x-4 top-2.5 h-[3px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  {selected ? (
                    reduce
                      ? <span className="block h-full w-full bg-emerald-400" />
                      : <span key={`${i}-${active}`} className="step-progress block h-full w-full bg-emerald-400" style={{ animationDuration: `${STEP_DURATION_MS}ms`, animationPlayState: running ? 'running' : 'paused' }} onAnimationEnd={() => go(active + 1)} />
                  ) : i < active ? <span className="block h-full w-full bg-emerald-400/60" /> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-emerald-400 text-[#0b1f17]' : 'bg-white/10 text-white/70'}`}><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0">
                    <span className={`block text-[11px] font-bold uppercase tracking-wider ${selected ? 'text-emerald-300' : 'text-white/45'}`}>Étape {i + 1}</span>
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
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="mt-6 grid items-center gap-12 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-14"
        >
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: EASE }}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold tabular-nums text-white/50">0{active + 1} / 0{STEPS.length}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${actor.cls}`}><actor.icon className="h-3.5 w-3.5" /> {actor.label}</span>
              </div>
              <h3 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{step.title}</h3>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/70">{step.text}</p>
              <ul className="mt-8 space-y-3.5">
                {step.points.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                    <span className="text-white/85">{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <div className="relative mx-auto w-[240px] sm:w-[268px]">
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 28, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -18, rotate: 2 }} transition={{ duration: 0.5, ease: EASE }} className="relative">
                {step.visual()}
                <motion.div initial={{ opacity: 0, x: -14, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.35, duration: 0.45, ease: EASE }} className="absolute -left-10 top-[42%] flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-[#0b1f17] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] sm:-left-16" aria-hidden="true">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><step.icon className="h-4 w-4" /></span>
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
            <Link to={registerHref(themeId)} className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#0b1f17] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800">
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
                  <PhoneFrame src={SCREEN(`vitrine-${t.id}`)} alt={`Vitrine « ${DEMO_SHOPS[t.id]} », thème ${t.name}`} className={selected ? 'ring-4 ring-emerald-500 ring-offset-4 ring-offset-white' : ''} />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                  <span className="font-bold text-[#0b1f17]">{t.name}</span>
                  {selected && <Check className="h-4 w-4 text-emerald-600" />}
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

function Tile({ icon: Icon, title, text, children, className = '', dark = false }) {
  return (
    <Reveal className={className}>
      <div className={`flex h-full flex-col rounded-[1.75rem] p-6 transition-transform duration-300 hover:-translate-y-1 ${dark ? 'bg-[#0b1f17] text-white' : 'border border-black/5 bg-white'}`}>
        <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}><Icon className="h-5 w-5" /></span>
        <h3 className={`text-lg font-bold ${dark ? 'text-white' : 'text-[#0b1f17]'}`}>{title}</h3>
        <p className={`mt-1.5 text-sm leading-relaxed ${dark ? 'text-white/65' : 'text-slate-600'}`}>{text}</p>
        {children && <div className="mt-5 flex-1">{children}</div>}
      </div>
    </Reveal>
  );
}

function Included() {
  const bars = [32, 48, 40, 64, 56, 78, 70];
  return (
    <section className="bg-[#f6f7f6] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle kicker="Tout est inclus" title={<>Les outils d’une grande enseigne, <Em>dans votre poche</Em>.</>} /></Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-4">
          <Tile icon={QrCode} title="QR code de boutique" text="À coller sur votre comptoir ou vos sacs : un scan, et le client est sur votre vitrine." className="lg:row-span-2" dark>
            <div className="flex h-full items-center justify-center"><div className="rounded-2xl bg-white p-3"><QRCodeSVG value="https://samaboutik-nine.vercel.app/boutiques" size={128} fgColor="#0b1f17" /></div></div>
          </Tile>
          <Tile icon={BarChart3} title="Statistiques" text="Chiffre d’affaires, commandes, panier moyen : tout se lit en un coup d’œil.">
            <div className="flex h-16 items-end gap-1.5">{bars.map((h, i) => <span key={i} className={`flex-1 rounded-t-md ${i === bars.length - 1 ? 'bg-emerald-600' : 'bg-emerald-100'}`} style={{ height: `${h}%` }} />)}</div>
          </Tile>
          <Tile icon={ImageDown} title="Photos allégées" text="Vos photos sont compressées automatiquement : la vitrine s’ouvre vite, même en 3G.">
            <p className="flex items-baseline gap-2 font-extrabold text-[#0b1f17]"><span className="text-slate-400 line-through">4,2 Mo</span><ArrowRight className="h-4 w-4 self-center text-emerald-600" /><span className="text-2xl">180 Ko</span></p>
          </Tile>
          <Tile icon={MapPinned} title="Boutiques près de moi" text="Apparaissez sur la carte des commerçants de votre quartier.">
            <Link to="/boutiques" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline">Voir l’annuaire <ArrowUpRight className="h-4 w-4" /></Link>
          </Tile>
          <Tile icon={Users} title="Équipe de livreurs" text="Ajoutez vos livreurs : ils acceptent les courses et vous voyez le bilan de chacun.">
            <div className="flex -space-x-2">{['L', 'M', 'B', 'A'].map((l, i) => <span key={l} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white ${['bg-emerald-700', 'bg-amber-600', 'bg-sky-700', 'bg-[#0b1f17]'][i]}`}>{l}</span>)}</div>
          </Tile>
          <Tile icon={BadgeCheck} title="Avis vérifiés" text="Les avis de vos clients livrés portent le badge « achat vérifié ».">
            <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-5 w-5 fill-amber-400 text-amber-400" />)}</div>
          </Tile>
          <Tile icon={Palette} title="6 thèmes" text="Changez l’allure de votre vitrine en un geste, sans toucher à vos produits.">
            <div className="flex gap-1.5">{SHOP_THEMES.map((t) => <span key={t.id} className="h-7 flex-1 rounded-lg" style={{ background: t.accent }} title={t.name} />)}</div>
          </Tile>
          <Tile icon={ShieldCheck} title="Données protégées" text="Les informations de vos clients restent privées, et chaque livraison est confirmée par un code." />
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

  const monthlyOrders = ordersPerDay * 30;
  const monthlyRevenue = monthlyOrders * avgBasket;
  const commissionSaved = Math.round(monthlyRevenue * 0.1);
  const hoursSaved = Math.round(monthlyOrders * 0.35);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);
    playChime();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#38bdf8', '#ffffff'],
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
    <section className="relative overflow-hidden py-24 lg:py-32 bg-[#06140e] text-white">
      {/* Effets lumineux néon d'ambiance */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute bottom-0 right-10 h-[450px] w-[450px] rounded-full bg-emerald-600/10 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* En-tête de section */}
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-300 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Expérience Interactive en Direct</span>
            </div>
            <h2 className="mt-4 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              Voyez la magie en action. <Em light>En 10 secondes chrono</Em>.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-100/75 sm:text-xl">
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
                  tab === 'demo' ? 'text-[#06140e]' : 'text-white/70 hover:text-white'
                }`}
              >
                {tab === 'demo' && (
                  <motion.div
                    layoutId="mainTab"
                    className="absolute inset-0 rounded-xl bg-emerald-400 shadow-md shadow-emerald-400/30"
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
                  tab === 'calculator' ? 'text-[#06140e]' : 'text-white/70 hover:text-white'
                }`}
              >
                {tab === 'calculator' && (
                  <motion.div
                    layoutId="mainTab"
                    className="absolute inset-0 rounded-xl bg-emerald-400 shadow-md shadow-emerald-400/30"
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
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-xs text-white/50">samaboutik-simulator // live-feed</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SYSTÈME EN DIRECT</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
                  {/* Côté Gauche (5 colonnes) : Sélection & Commande client */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">1. Choisissez un article</span>
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
                                  ? 'bg-emerald-500/25 ring-2 ring-emerald-400'
                                  : 'bg-white/5 hover:bg-white/10 ring-1 ring-white/10'
                              }`}
                            >
                              <img
                                src={`/images/landing/${p.img}-640.webp`}
                                alt={p.name}
                                className="h-14 w-14 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                              />
                              <p className="mt-2 line-clamp-1 text-[11px] font-bold text-white">{p.name}</p>
                              <p className="text-[10px] font-extrabold text-emerald-300">{p.price.toLocaleString('fr-FR')} F</p>
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
                          <span className="text-lg font-extrabold text-emerald-300">
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
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                  selectedVar === v
                                    ? 'bg-emerald-400 text-[#06140e]'
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
                        className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 py-4 text-base font-extrabold text-[#06140e] shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      >
                        {isSimulating ? (
                          <>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#06140e] border-t-transparent" />
                            <span>Simulation du flux en cours…</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5 fill-[#06140e]" />
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
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
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
                              ? 'bg-emerald-500/15 border border-emerald-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 1 ? 'bg-emerald-400 text-[#06140e] shadow-md shadow-emerald-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 1 ? '✓' : '1'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Étape 1 • Expérience Client</p>
                              {simStep >= 1 && <span className="font-mono text-[10px] text-emerald-300 font-bold">0.8 sec</span>}
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
                              ? 'bg-emerald-500/15 border border-emerald-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 2 ? 'bg-emerald-400 text-[#06140e] shadow-md shadow-emerald-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 2 ? '✓' : '2'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Étape 2 • Flux Financier Sécurisé</p>
                              {simStep >= 2 && <span className="font-mono text-[10px] text-emerald-300 font-bold">1.4 sec</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 2
                                ? (payMethod === 'wave' ? `Paiement Wave ${selectedProd.price.toLocaleString('fr-FR')} F certifié en direct` : `Paiement en espèces prévu à la remise (${selectedProd.price.toLocaleString('fr-FR')} F)`)
                                : 'Validation automatique du règlement sans capture d’écran…'}
                            </p>
                            <p className="text-xs text-white/70 mt-1">
                              {payMethod === 'wave' ? 'Reversement automatique vers le marchand • 0 F de commission prélevée sur vos ventes.' : 'Le livreur encaissera la somme exacte sans litige.'}
                            </p>
                          </div>
                        </div>

                        {/* Étape 3 : Marchand */}
                        <div
                          className={`flex items-start gap-3.5 rounded-2xl p-4 transition-all duration-500 ${
                            simStep >= 3
                              ? 'bg-emerald-500/15 border border-emerald-400/40 shadow-sm'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 3 ? 'bg-emerald-400 text-[#06140e] shadow-md shadow-emerald-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 3 ? '✓' : '3'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Étape 3 • Tableau de Bord Marchand</p>
                              {simStep >= 3 && <span className="font-mono text-[10px] text-emerald-300 font-bold">Bip reçu 🔔</span>}
                            </div>
                            <p className="text-sm font-extrabold text-white mt-0.5">
                              {simStep >= 3 ? 'Notification WhatsApp envoyée & stock décrémenté' : 'Alerte sonore et notification WhatsApp automatique…'}
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
                              ? 'bg-emerald-500/25 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20'
                              : 'bg-white/[0.03] border border-white/5 opacity-50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            simStep >= 4 ? 'bg-emerald-400 text-[#06140e] shadow-md shadow-emerald-400/30' : 'bg-white/10 text-white/40'
                          }`}>
                            {simStep >= 4 ? '✓' : '4'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Étape 4 • Course & Livraison Sécurisée</p>
                              {simStep >= 4 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 text-[#06140e] px-2 py-0.5 text-[10px] font-black">PIN ACTIF</span>}
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
                        className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-emerald-500/20 p-4 border border-emerald-400/30 sm:flex-row"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 text-[#06140e] font-black">
                            ✓
                          </span>
                          <div>
                            <p className="text-sm font-extrabold text-white">Cycle complet réussi en moins de 3 secondes !</p>
                            <p className="text-xs text-emerald-200">C’est exactement ce que vivront vos clients chaque jour.</p>
                          </div>
                        </div>
                        <Link
                          to={registerHref(selectedProd.themeId || themeId)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#06140e] shadow-md hover:bg-emerald-100 transition-colors"
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
                        <span className="rounded-xl bg-emerald-400 px-3 py-1 font-mono text-sm font-extrabold text-[#06140e]">
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
                        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-emerald-400"
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
                        <span className="rounded-xl bg-emerald-400 px-3 py-1 font-mono text-sm font-extrabold text-[#06140e]">
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
                        className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-emerald-400"
                      />
                      <div className="mt-2 flex justify-between text-[11px] text-white/50">
                        <span>3 000 F</span>
                        <span>25 000 F</span>
                        <span>50 000 F</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-400/20 text-xs text-emerald-200">
                      💡 <strong>Le saviez-vous ?</strong> Les boutiques disposant d’un catalogue en ligne partagé sur WhatsApp augmentent leur panier moyen de <strong>+35 %</strong> grâce à la suggestion automatique de produits complémentaires.
                    </div>
                  </div>

                  {/* Rendu des calculs en direct (6 colonnes) */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 p-7 lg:p-9 shadow-xl">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">Chiffre d’affaires mensuel estimé</p>
                      <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {monthlyRevenue.toLocaleString('fr-FR')} <span className="text-2xl font-bold text-emerald-300 sm:text-3xl">FCFA</span>
                      </p>
                      <p className="mt-2 text-xs text-emerald-100/70">
                        Soit {monthlyOrders} commandes traitées automatiquement chaque mois.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Banknote className="h-5 w-5" />
                          <p className="text-xs font-bold uppercase">Commissions sauvées</p>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                          +{commissionSaved.toLocaleString('fr-FR')} F
                        </p>
                        <p className="mt-1 text-[11px] text-white/60">
                          0% de commission avec SamaBoutik vs ~10% ailleurs.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Clock className="h-5 w-5" />
                          <p className="text-xs font-bold uppercase">Temps économisé</p>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                          ~{hoursSaved} heures
                        </p>
                        <p className="mt-1 text-[11px] text-white/60">
                          Fini les 25 minutes de négociation par message.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={registerHref(themeId)}
                        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 py-4 text-base font-extrabold text-[#06140e] shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300 hover:scale-[1.01]"
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
    <section className="bg-[#f6f7f6] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal><SectionTitle center kicker="Tarifs" title={<>Commencez à <Em>0 franc</Em>. Grandissez à votre rythme.</>} text="Pas de carte bancaire, pas d’engagement : changez de forfait quand vous voulez." /></Reveal>
        <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-3 lg:items-center">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <div className={`relative flex flex-col rounded-[2rem] p-7 ${p.popular ? 'bg-[#0b1f17] text-white shadow-[0_40px_80px_-40px_rgba(11,31,23,0.9)] lg:py-10' : 'border border-black/10 bg-white'}`}>
                {p.popular && <span className="absolute -top-3 left-7 rounded-full bg-amber-300 px-3 py-1 text-xs font-extrabold text-[#0b1f17]">Recommandé</span>}
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${p.popular ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}><p.icon className="h-5 w-5" /></span>
                <p className="mt-5 text-xl font-bold">{p.name}</p>
                <p className={`mt-1 text-sm ${p.popular ? 'text-white/65' : 'text-slate-500'}`}>{p.desc}</p>
                <p className="mt-6 flex items-baseline gap-1.5"><span className="text-5xl font-extrabold tracking-tight">{p.price}</span><span className={`text-sm font-semibold ${p.popular ? 'text-white/60' : 'text-slate-500'}`}>FCFA / mois</span></p>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.popular ? 'text-emerald-300' : 'text-emerald-600'}`} /> {f}</li>)}
                </ul>
                <Link to={registerHref(themeId, p.plan)} className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-colors ${p.popular ? 'bg-emerald-400 text-[#0b1f17] hover:bg-emerald-300' : 'bg-[#0b1f17] text-white hover:bg-emerald-800'}`}>
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
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
                  <span className="text-lg font-bold text-[#0b1f17]">{item.q}</span>
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
/* Appel final et pied de page                                          */
/* ------------------------------------------------------------------ */

function FinalCta({ themeId }) {
  return (
    <section className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#0b1f17] sm:rounded-[2.5rem]">
        <img src="/images/landing/rue-dakar-1024.webp" srcSet={photoSet('rue-dakar')} sizes="100vw" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_40%] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f17] via-[#0b1f17]/70 to-[#0b1f17]/30" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center text-white sm:py-32">
          <Reveal>
            <h2 className="text-balance text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Votre boutique peut être en ligne <Em light>aujourd’hui</Em>.</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">Gratuit pour démarrer, sans carte bancaire. Créez votre vitrine, ajoutez vos produits et partagez le lien à vos clients.</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={registerHref(themeId)} className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 py-4 font-bold text-[#0b1f17] transition-colors hover:bg-emerald-300">
                Créer ma boutique gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/boutiques" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-4 font-bold text-white transition-colors hover:bg-white/10">
                <Store className="h-4 w-4" /> Voir les boutiques
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.webp" alt="SamaBoutik" width="252" height="186" loading="lazy" decoding="async" className="h-10 w-auto" />
          <span className="text-sm">La boutique en ligne des commerçants du Sénégal.</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Liens du pied de page">
          <Link to="/boutiques" className="hover:text-[#0b1f17]">Boutiques près de moi</Link>
          <a href="#tarifs" onClick={(e) => goTo(e, '#tarifs')} className="hover:text-[#0b1f17]">Tarifs</a>
          <a href="#faq" onClick={(e) => goTo(e, '#faq')} className="hover:text-[#0b1f17]">Questions</a>
          <Link to="/login" className="hover:text-[#0b1f17]">Se connecter</Link>
          <Link to="/register" className="hover:text-[#0b1f17]">Créer ma boutique</Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-black/5 px-5 pt-6 text-xs sm:flex-row sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} SamaBoutik. Tous droits réservés.</p>
        <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Paiements sécurisés par PayDunya</p>
      </div>
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
      <div className="min-h-screen overflow-x-clip bg-white font-sans text-[#0b1f17]">
        <Navbar />
        <main>
          <Hero themeId={themeId} setThemeId={setThemeId} />
          <LogoStrip />
          <Deferred id="produit" minHeight={1300}><ProductShowcase /></Deferred>
          <Deferred id="parcours" minHeight={1150}><HowItWorks /></Deferred>
          <Deferred id="themes" minHeight={900}><Themes themeId={themeId} onPick={setThemeId} /></Deferred>
          <Deferred minHeight={1100}><Included /></Deferred>
          <Deferred minHeight={800}><LiveExperience themeId={themeId} /></Deferred>
          <Deferred id="tarifs" minHeight={1000}><Pricing themeId={themeId} /></Deferred>
          <Deferred id="faq" minHeight={700}><Faq /></Deferred>
          <Deferred minHeight={600}><FinalCta themeId={themeId} /></Deferred>
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
