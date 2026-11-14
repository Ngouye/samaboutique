import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import RollingNumber from '../motion/RollingNumber';
import { BlurWords } from '../landing/Magic';
import { useTilt } from '../../utils/motion';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Minus, QrCode, Truck, Store, ShoppingBag, Plus, Share2, Check,
  AlertCircle, Users, Wallet, Package, Clock, PackageOpen, PackageX, TriangleAlert, HandCoins, CircleCheck,
} from './icons';
import { ChartCard, AreaChart, ColumnChart, DonutChart, BarList, Sparkline } from './Charts';
import { computeAnalytics, PERIODS, CHART_COLORS, statusGroupOf, fmt } from './analytics';
import { CARD } from './ui';

const EASE = [0.16, 1, 0.3, 1];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const plural = (n, word) => `${word}${n > 1 ? 's' : ''}`;

/* ------------------------------------------------------------------ */

function DeltaBadge({ value, periodLabel, points = false }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-stone-400">Pas de comparaison</span>;
  }
  const up = value > 0.0005;
  const down = value < -0.0005;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const text = points
    ? `${value > 0 ? '+' : ''}${Math.round(value * 100)} pt`
    : `${value > 0 ? '+' : ''}${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  const tone = up ? 'text-emerald-700' : down ? 'text-red-700' : 'text-stone-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-bold ${tone}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} /> {text}
      </span>
      <span className="text-stone-400">vs {periodLabel} préc.</span>
    </span>
  );
}

function StatTile({ label, value, unit, deltaValue, periodLabel, points, spark, accent, icon: Icon, onClick, big = false }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <motion.div variants={item} className={`h-full ${big ? 'col-span-2' : ''}`}>
      <Tag onClick={onClick} className={`${CARD} group flex h-full w-full flex-col p-4 text-left transition-colors md:p-5 ${onClick ? 'hover:border-stone-300' : ''}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-stone-500 md:text-sm">{label}</p>
          <Icon className="h-4 w-4 text-stone-400 transition-colors group-hover:text-brand-600" />
        </div>
        <p className={`font-figures font-semibold leading-none tracking-tight text-ink tabular-nums ${big ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>
          {typeof value === 'number' ? <RollingNumber value={value} /> : value}
          {unit && <span className="ml-1 text-sm font-medium text-stone-400 md:text-base">{unit}</span>}
        </p>
        <div className="mt-2.5 min-h-[20px]"><DeltaBadge value={deltaValue} periodLabel={periodLabel} points={points} /></div>
        <div className="mt-auto pt-3"><Sparkline values={spark} accent={accent} height={big ? 44 : 32} /></div>
      </Tag>
    </motion.div>
  );
}

// Tâche de la section « À faire maintenant ».
const TASK_TONES = {
  amber: { dot: 'bg-amber-500', text: 'text-amber-700', ring: 'hover:border-amber-300' },
  sky: { dot: 'bg-sky-500', text: 'text-sky-700', ring: 'hover:border-sky-300' },
  violet: { dot: 'bg-violet-500', text: 'text-violet-700', ring: 'hover:border-violet-300' },
  red: { dot: 'bg-red-500', text: 'text-red-700', ring: 'hover:border-red-300' },
  emerald: { dot: 'bg-brand-500', text: 'text-brand-700', ring: 'hover:border-brand-300' },
};

function TaskCard({ task }) {
  const tone = TASK_TONES[task.tone];
  const Icon = task.icon;
  const tilt = useTilt({ max: 6 });
  return (
    <motion.button
      type="button"
      onClick={task.go}
      whileTap={{ scale: 0.97 }}
      style={tilt.style}
      {...tilt.handlers}
      className={`${CARD} group relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden p-4 text-left transition-colors sm:w-auto md:p-5 ${tone.ring}`}
    >
      <span className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] ${tone.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        {task.kicker}
        <Icon className="ml-auto h-4 w-4 opacity-70" />
      </span>
      <span className="mt-3 font-figures text-4xl font-semibold leading-none tracking-tight text-ink tabular-nums">
        <RollingNumber value={task.value} />{task.unit && <span className="ml-1 text-xl font-medium text-stone-400">{task.unit}</span>}
      </span>
      <span className="mt-1.5 text-sm font-semibold text-slate-800">{task.label}</span>
      <span className="mt-0.5 text-xs leading-relaxed text-stone-500">{task.hint}</span>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink">
        {task.action} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
      {tilt.enabled && <span className="tilt-glare" aria-hidden="true" />}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */

// Premiers pas d'une nouvelle boutique : calculés à partir de ses données, masquables.
function StartChecklist({ merchant, products, driverCount, ordersCount, inDirectory, onNavigate, onAddProduct, onShare }) {
  const storageKey = `sb_demarrage_masque_${merchant?.id}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const steps = [
    { id: 'logo', done: Boolean(merchant?.logo_url), label: 'Ajouter votre logo', hint: 'Il s’affiche en haut de votre vitrine.', action: 'Ajouter', go: () => onNavigate('settings') },
    { id: 'description', done: (merchant?.description || '').trim().length >= 20, label: 'Présenter votre boutique', hint: 'Quelques mots sur ce que vous vendez.', action: 'Écrire', go: () => onNavigate('settings') },
    { id: 'products', done: products.length >= 3, label: `Ajouter 3 produits (${Math.min(products.length, 3)}/3)`, hint: 'Une belle photo et un prix suffisent.', action: 'Ajouter', go: onAddProduct },
    { id: 'driver', done: driverCount > 0, label: 'Ajouter un livreur', hint: 'Il reçoit vos courses sur son téléphone.', action: 'Ajouter', go: () => onNavigate('team') },
    { id: 'directory', done: Boolean(inDirectory), label: 'Apparaître dans « Boutiques près de moi »', hint: 'Paramètres : localisez votre boutique, puis cochez la case. Il faut aussi au moins un produit.', action: 'Activer', go: () => onNavigate('settings') },
    { id: 'order', done: ordersCount > 0, label: 'Recevoir votre première commande', hint: 'Partagez votre vitrine sur WhatsApp et dans votre statut.', action: 'Partager', go: onShare },
  ];
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const hide = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* stockage indisponible */ }
    setHidden(true);
  };

  return (
    <motion.section variants={item} aria-labelledby="start-title" className={`${CARD} p-5 md:p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="start-title" className="font-ledger text-2xl text-ink">Bien démarrer</h2>
          <p className="mt-0.5 text-sm text-stone-500">{done} étape{done > 1 ? 's' : ''} sur {steps.length} : votre boutique est presque prête.</p>
        </div>
        <button type="button" onClick={hide} className="min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-[#f1efe8] hover:text-slate-800">
          Masquer
        </button>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1efe8]" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Progression">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} className="h-full rounded-full bg-brand-600" />
      </div>
      <ol className="mt-4 divide-y divide-[#efece4]">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            {s.done ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
            ) : (
              <span className="h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-stone-300" />
            )}
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${s.done ? 'text-stone-400 line-through' : 'text-ink'}`}>{s.label}</span>
              {!s.done && <span className="block text-xs text-stone-500">{s.hint}</span>}
            </span>
            {!s.done && (
              <button type="button" onClick={s.go} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-800">
                {s.action} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </motion.section>
  );
}

export default function Overview({
  merchant, orders, products, driverBalances, today, shopUrl, inDirectory,
  onNavigate, onOpenQR, onSelectDriver, onAddProduct, onShare,
}) {
  const [period, setPeriod] = useState(30);
  // Le ticket de caisse « s'imprime » à la première ouverture de l'accueil dans la visite, pas à chaque fois.
  const [printReceipt] = useState(() => {
    try { return !sessionStorage.getItem('sb_ticket_imprime'); } catch { return true; }
  });
  useEffect(() => {
    try { sessionStorage.setItem('sb_ticket_imprime', '1'); } catch { /* stockage indisponible */ }
  }, []);
  const a = useMemo(() => computeAnalytics(orders, products, period), [orders, products, period]);
  const periodLabel = `${period} j`;
  const count = (status) => orders.filter((o) => o.status === status).length;
  const pending = count('PENDING');
  const preparing = count('PREPARING');
  const inTransit = count('IN_TRANSIT');
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const toCollect = driverBalances.reduce((sum, d) => sum + Math.max(0, d.aReverser), 0);
  const rangeText = `du ${new Date(a.range.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(a.range.end - 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  const now = new Date();
  const hour = now.getHours();
  // Trait d'union insécable : « après-midi » ne se coupe jamais en fin de ligne.
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après‑midi' : 'Bonsoir';

  const tasks = [
    pending > 0 && {
      id: 'pending', tone: 'amber', icon: Clock, kicker: 'Nouvelles', value: pending, label: `${plural(pending, 'commande')} à traiter`,
      hint: 'Acceptez-les pour lancer la préparation.', action: 'Traiter', go: () => onNavigate('orders', { status: 'PENDING' }),
    },
    preparing > 0 && {
      id: 'preparing', tone: 'sky', icon: PackageOpen, kicker: 'En cours', value: preparing, label: 'en préparation',
      hint: 'À remettre à un livreur une fois prêtes.', action: 'Voir', go: () => onNavigate('orders', { status: 'PREPARING' }),
    },
    inTransit > 0 && {
      id: 'transit', tone: 'violet', icon: Truck, kicker: 'Sur la route', value: inTransit, label: 'en livraison',
      hint: 'Le client attend son colis.', action: 'Suivre', go: () => onNavigate('orders', { status: 'IN_TRANSIT' }),
    },
    outOfStock > 0 && {
      id: 'out', tone: 'red', icon: PackageX, kicker: 'Rupture', value: outOfStock, label: `${plural(outOfStock, 'produit')} épuisé${outOfStock > 1 ? 's' : ''}`,
      hint: 'Vos clients ne peuvent plus les commander.', action: 'Réapprovisionner', go: () => onNavigate('products', { productFilter: 'OUT' }),
    },
    lowStock > 0 && {
      id: 'low', tone: 'amber', icon: TriangleAlert, kicker: 'Stock faible', value: lowStock, label: `${plural(lowStock, 'produit')} presque épuisé${lowStock > 1 ? 's' : ''}`,
      hint: '5 pièces ou moins en stock.', action: 'Voir les produits', go: () => onNavigate('products', { productFilter: 'LOW' }),
    },
    toCollect > 0 && {
      id: 'collect', tone: 'emerald', icon: HandCoins, kicker: 'Livreurs', value: toCollect, unit: 'F', label: 'à récupérer auprès des livreurs',
      hint: 'Espèces encaissées aujourd’hui, frais de course déduits.', action: 'Voir l’équipe', go: () => onNavigate('team'),
    },
  ].filter(Boolean);

  const summary = pending > 0
    ? `${pending} ${plural(pending, 'commande')} ${pending > 1 ? 'vous attendent' : 'vous attend'}.`
    : tasks.length > 0 ? 'Aucune nouvelle commande. Quelques points à surveiller ci-dessous.' : 'Tout est à jour. Belle journée de vente !';

  const quickActions = [
    { label: 'Ma vitrine', icon: Store, href: shopUrl },
    { label: 'Ajouter un produit', short: 'Produit', icon: Plus, onClick: onAddProduct, primary: true },
    { label: 'Partager ma vitrine', short: 'Partager', icon: Share2, onClick: onShare },
    { label: 'QR code', icon: QrCode, onClick: onOpenQR },
  ];

  const seriesTable = {
    columns: [
      { key: 'longLabel', label: 'Période' },
      { key: 'revenue', label: 'Chiffre d\'affaires', align: 'right', format: (v) => `${fmt(v)} F` },
      { key: 'orders', label: 'Commandes', align: 'right' },
      { key: 'delivered', label: 'Livrées', align: 'right' },
    ],
    rows: a.series,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto flex max-w-[1240px] flex-col gap-8 md:gap-10">
      {/* Accueil : salutation et actions rapides */}
      <motion.section variants={item}>
        <p className="text-sm font-medium text-stone-500 first-letter:uppercase">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-1.5 text-balance font-ledger text-[2.35rem] leading-[1.02] tracking-[-0.01em] text-ink md:text-[3.4rem]">
          <BlurWords text={`${greeting},`} />{' '}
          <span className="text-brand-700"><BlurWords text={merchant?.shop_name || 'Marchand'} delay={0.18} /></span>
        </h1>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[15px] text-stone-600 md:text-base">{summary}</p>

        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2.5 lg:justify-end">
          {quickActions.map((q) => {
            const Tag = q.href ? 'a' : 'button';
            const linkProps = q.href ? { href: q.href, target: '_blank', rel: 'noreferrer' } : { type: 'button', onClick: q.onClick };
            return (
              <Tag
                key={q.label}
                {...linkProps}
                className={`group flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:transition-colors ${q.primary ? 'sm:bg-ink sm:text-white sm:hover:bg-brand-800' : 'sm:border sm:border-[#dcd8cd] sm:bg-white sm:text-slate-800 sm:hover:border-stone-400'}`}
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-active:scale-95 sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0 ${q.primary ? 'bg-ink text-white shadow-[0_10px_24px_-12px_color-mix(in_srgb,_var(--color-ink)_70%,_transparent)]' : 'bg-white text-ink ring-1 ring-[#e8e5dc]'}`}>
                  <q.icon className="h-5 w-5 sm:h-4 sm:w-4" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-stone-600 sm:text-sm sm:font-bold sm:text-inherit">
                  <span className="sm:hidden">{q.short || q.label}</span>
                  <span className="hidden sm:inline">{q.label}</span>
                </span>
              </Tag>
            );
          })}
        </div>
        </div>
      </motion.section>

      <StartChecklist
        merchant={merchant}
        products={products}
        driverCount={driverBalances.length}
        ordersCount={orders.length}
        inDirectory={inDirectory}
        onNavigate={onNavigate}
        onAddProduct={onAddProduct}
        onShare={onShare}
      />

      {merchant?.subscription_status === 'expired' && (
        <motion.div variants={item} className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertCircle className="h-5 w-5" /></span>
          <div className="flex-1">
            <h3 className="font-bold text-red-900">Abonnement expiré</h3>
            <p className="mt-0.5 text-sm text-red-700">Votre boutique est actuellement fermée au public. Renouvelez votre abonnement pour la rouvrir.</p>
          </div>
          <button onClick={() => onNavigate('billing')} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">Renouveler</button>
        </motion.div>
      )}

      {/* À faire maintenant + caisse du jour */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <motion.section variants={item} aria-labelledby="todo-title" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="todo-title" className="font-ledger text-2xl text-ink md:text-[1.75rem]">À faire maintenant</h2>
            {tasks.length > 0 && <span className="text-sm font-semibold text-stone-500">{tasks.length} point{tasks.length > 1 ? 's' : ''}</span>}
          </div>
          {tasks.length === 0 ? (
            <div className={`${CARD} flex items-center gap-4 p-5`}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CircleCheck className="h-6 w-6" /></span>
              <div>
                <p className="font-bold text-ink">Rien à traiter pour le moment</p>
                <p className="text-sm text-stone-500">Aucune commande en attente, aucun produit en rupture. Partagez votre vitrine pour attirer de nouveaux clients.</p>
              </div>
            </div>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
              {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
            </div>
          )}
        </motion.section>

        {/* Ticket de caisse du jour : il sort de la fente de l'imprimante (une fois par visite) */}
        <motion.section variants={item} aria-label="Caisse du jour" className="relative lg:mt-[2.6rem]">
          <div aria-hidden="true" className="relative z-10 h-3.5 rounded-full bg-gradient-to-b from-ink to-brand-950 shadow-[0_8px_14px_-8px_color-mix(in_srgb,_var(--color-ink)_80%,_transparent)]">
            <span className="absolute inset-x-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/60" />
            <span className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          </div>
          <div className="-mt-2 overflow-hidden px-3 pt-2">
            <motion.div
              initial={printReceipt ? { y: '-100%' } : false}
              animate={{ y: '0%' }}
              transition={{ duration: 1.5, delay: 0.35, ease: [0.3, 0.9, 0.35, 1] }}
              className="[filter:drop-shadow(0_1px_1px_color-mix(in_srgb,_var(--color-ink)_8%,_transparent))_drop-shadow(0_12px_24px_color-mix(in_srgb,_var(--color-ink)_6%,_transparent))]"
            >
              <div className="receipt-edge bg-white px-5 pb-9 pt-5">
                <div className="flex items-center justify-between font-figures text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                  <span>Caisse du jour</span>
                  <span>{now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                </div>
                <p className="mt-4 font-figures text-[2.6rem] font-semibold leading-none tracking-tight text-ink">
                  <RollingNumber value={today.totalEnbaisse} /><span className="ml-1.5 text-lg font-medium text-stone-400">F</span>
                </p>
                <p className="mt-1.5 text-xs text-stone-500">Commandes livrées aujourd’hui</p>
                <div className="my-4 border-t border-dashed border-stone-300" />
                <dl className="space-y-2.5 font-figures text-sm tabular-nums">
                  <div className="flex justify-between gap-3">
                    <dt className="font-sans text-stone-500">Frais de livraison</dt>
                    <dd className="text-stone-700">− <RollingNumber value={today.partLivreur} /> F</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-base">
                    <dt className="font-sans font-bold text-ink">Votre part</dt>
                    <dd className="font-semibold text-brand-700"><RollingNumber value={today.partMarchand} /> F</dd>
                  </div>
                </dl>
                <div className="my-4 border-t border-dashed border-stone-300" />
                <p className="text-center font-figures text-[10px] font-semibold uppercase tracking-[0.35em] text-stone-400">Jërëjëf · Merci</p>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </div>

      {/* Indicateurs de la période */}
      <section aria-labelledby="perf-title" className="flex flex-col gap-4">
        <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="perf-title" className="font-ledger text-2xl text-ink md:text-[1.75rem]">Vos ventes</h2>
            <p className="text-sm text-stone-500">{rangeText}</p>
          </div>
          <div className="relative flex rounded-full border border-[#e8e5dc] bg-white p-1" role="group" aria-label="Période">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`relative min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${period === p.id ? 'text-white' : 'text-stone-500 hover:text-slate-800'}`}
              >
                {period === p.id && (
                  <motion.span layoutId="period-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative">{p.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
          <StatTile big label="Chiffre d'affaires livré" value={a.revenue} unit="FCFA" deltaValue={a.revenueDelta} periodLabel={periodLabel} spark={a.spark.map((s) => s.revenue)} accent={CHART_COLORS.revenue} icon={Wallet} />
          <StatTile label="Commandes" value={a.ordersCount} deltaValue={a.ordersDelta} periodLabel={periodLabel} spark={a.spark.map((s) => s.orders)} accent={CHART_COLORS.orders} icon={ShoppingBag} onClick={() => onNavigate('orders')} />
          <StatTile label="Panier moyen" value={a.avgBasket} unit="F" deltaValue={a.avgBasketDelta} periodLabel={periodLabel} spark={a.spark.map((s) => (s.delivered ? s.revenue / s.delivered : 0))} accent={CHART_COLORS.revenue} icon={Package} />
          <StatTile label="Taux de livraison" value={Math.round(a.deliveryRate * 100)} unit="%" deltaValue={a.deliveryRateDelta} points periodLabel={periodLabel} spark={a.spark.map((s) => (s.orders ? s.delivered / s.orders : 0))} accent="#1baf7a" icon={Truck} />
        </div>
      </section>

      {/* Évolution + statuts */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <motion.div variants={item} className="xl:col-span-2">
          <ChartCard
            className="h-full"
            title="Évolution du chiffre d'affaires"
            subtitle={period > 31 ? 'Par semaine, commandes livrées' : 'Par jour, commandes livrées'}
            table={seriesTable}
          >
            <AreaChart
              data={a.series}
              valueKey="revenue"
              color={CHART_COLORS.revenue}
              seriesLabel="Chiffre d'affaires"
              formatValue={(v) => `${fmt(v)} FCFA`}
              extraRows={(d) => [{ label: 'livrée(s)', value: d.delivered, color: '#cbd5e1' }]}
              height={360}
              animationKey={period}
            />
          </ChartCard>
        </motion.div>
        <motion.div variants={item}>
          <ChartCard
            title="Statut des commandes"
            subtitle={`${a.ordersCount} commande${a.ordersCount > 1 ? 's' : ''} sur la période`}
            className="h-full"
            table={{
              columns: [{ key: 'label', label: 'Statut' }, { key: 'value', label: 'Commandes', align: 'right' }],
              rows: a.statusBreakdown,
            }}
          >
            <DonutChart segments={a.statusBreakdown} centerLabel="Commandes" animationKey={period} />
          </ChartCard>
        </motion.div>
      </div>

      {/* Volume + meilleurs produits */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <motion.div variants={item}>
          <ChartCard
            title="Commandes reçues"
            subtitle={period > 31 ? 'Par semaine' : 'Par jour'}
            className="h-full"
            table={{ columns: [{ key: 'longLabel', label: 'Période' }, { key: 'orders', label: 'Commandes', align: 'right' }], rows: a.series }}
          >
            <ColumnChart data={a.series} valueKey="orders" color={CHART_COLORS.orders} seriesLabel="commande(s)" formatValue={(v) => fmt(v)} height={280} animationKey={period} />
          </ChartCard>
        </motion.div>
        <motion.div variants={item}>
          <ChartCard
            title="Meilleurs produits"
            subtitle="Classés par chiffre généré"
            className="h-full"
            table={{
              columns: [
                { key: 'name', label: 'Produit' },
                { key: 'quantity', label: 'Vendus', align: 'right' },
                { key: 'revenue', label: 'Chiffre', align: 'right', format: (v) => `${fmt(v)} F` },
              ],
              rows: a.topProducts,
            }}
          >
            <BarList
              items={a.topProducts.map((p) => ({ label: p.name, value: p.revenue, quantity: p.quantity }))}
              color={CHART_COLORS.products}
              formatValue={(v) => `${fmt(v)} F`}
              detail={(p) => `${p.quantity} vendu${p.quantity > 1 ? 's' : ''}`}
              emptyText="Aucune vente sur la période."
              animationKey={period}
            />
          </ChartCard>
        </motion.div>
      </div>

      {/* Commandes récentes + équipe */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <motion.section variants={item} className={`${CARD} p-5 md:p-6 xl:col-span-2`}>
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink">Commandes récentes</h3>
              <p className="mt-0.5 text-sm text-stone-500">Les 6 dernières reçues</p>
            </div>
            <button onClick={() => onNavigate('orders')} className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800">
              Tout voir <ArrowRight className="h-4 w-4" />
            </button>
          </header>
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dcd8cd] py-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-stone-300" />
              <p className="text-sm text-stone-500">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#efece4]">
              {orders.slice(0, 6).map((o) => {
                const g = statusGroupOf(o.status);
                return (
                  <li key={o.id}>
                    <button onClick={() => onNavigate('orders')} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[#faf9f6]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1efe8] text-sm font-bold text-ink">
                        {(o.customer_name || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{o.customer_name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
                          <span className="truncate">{g.label} · {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-figures font-semibold text-ink tabular-nums">{fmt(o.total_amount_fcfa)} F</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        <motion.section variants={item} className={`${CARD} p-5 md:p-6`}>
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-ink">Mon équipe</h3>
              <p className="mt-0.5 text-sm text-stone-500">Solde des livreurs aujourd'hui</p>
            </div>
            <button onClick={() => onNavigate('team')} className="inline-flex min-h-9 items-center px-1 text-sm font-bold text-brand-700 hover:text-brand-800">Gérer</button>
          </header>
          <div className="flex flex-col gap-1">
            {driverBalances.slice(0, 6).map((d) => (
              <button key={d.id} onClick={() => onSelectDriver(d)} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[#faf9f6]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-800">
                  {d.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{d.full_name}</span>
                  <span className="block text-xs text-stone-500">{d.count} course{d.count > 1 ? 's' : ''} · {d.vehicle_type}</span>
                </span>
                <span className="text-right">
                  <span className={`block font-figures text-sm font-semibold tabular-nums ${d.aReverser < 0 ? 'text-red-700' : 'text-ink'}`}>
                    {d.aReverser < 0 ? '−' : '+'}{fmt(Math.abs(d.aReverser))} F
                  </span>
                  <span className="block text-[11px] text-stone-400">{d.aReverser < 0 ? 'vous lui devez' : 'à vous reverser'}</span>
                </span>
              </button>
            ))}
            {driverBalances.length === 0 && (
              <div className="py-10 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                <p className="text-sm text-stone-500">Aucun livreur dans l'équipe.</p>
                <button onClick={() => onNavigate('team')} className="mt-3 text-sm font-bold text-brand-700">Ajouter un livreur</button>
              </div>
            )}
          </div>
          <a href={shopUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-xl bg-[#f6f4ee] px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-800">
            Voir ma boutique en ligne <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.section>
      </div>
    </motion.div>
  );
}
