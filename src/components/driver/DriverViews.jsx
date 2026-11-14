import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Package, ShieldCheck, ArrowRight, CircleCheck, Phone, Moped, HandCoins, Banknote, RotateCw,
  Check, Clock, LoaderCircle, LocateFixed, CreditCard, LogOut, BellRing, BellOff, Info, Store, Receipt, Wallet,
  WhatsApp, ChevronRight,
} from '../dashboard/icons';
import { CARD } from '../dashboard/ui';
import LiveLocationShare from './LiveLocationShare';
import SlideToConfirm from './SlideToConfirm';
import { parseOrderAddress, orderDirectionsUrl } from '../../utils/orderAddress';
import { paymentLabel } from '../../utils/payments';
import { whatsappNumber, formatPhone } from '../../utils/phone';
import { callPhone, openExternal } from '../../utils/links';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { fmt, deliveryFee, isPrepaid, cashToCollect, itemsCount, sinceLabel, clockLabel, orderRef } from '../../utils/delivery';

// Espace livreur, style clair de la plateforme (« carnet » du tableau de bord) :
// fond papier, cartes blanches à filet chaud, encre bleu nuit, accents indigo, ambre pour l'argent à encaisser.

// Carte chargée seulement pour une course avec position GPS (bibliothèque de carte à part).
const DeliveryMap = lazyWithRetry(() => import('./DeliveryMap'));

const SOFT = 'rounded-xl border border-[#efece4] bg-[#faf9f6]';

export function SectionTitle({ id, children, live = false, aside = null }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 id={id} className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
        )}
        {children}
      </h2>
      {aside}
    </div>
  );
}

function Chip({ children, tone = 'muted' }) {
  const tones = {
    muted: 'bg-stone-100 text-stone-700',
    brand: 'bg-brand-50 text-brand-800',
    gold: 'bg-amber-50 text-amber-800',
    sky: 'bg-sky-50 text-sky-800',
  };
  return <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

// --- Ma journée : trois chiffres utiles ------------------------------------------------------
export function TodayStrip({ summary }) {
  const owed = summary.toReturn < 0;
  const tiles = [
    { label: 'Livrées', value: summary.count, icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Mes gains', value: `${fmt(summary.fees)} F`, icon: HandCoins, tone: 'bg-brand-50 text-brand-700' },
    { label: owed ? 'On vous doit' : 'À reverser', value: `${fmt(Math.abs(summary.toReturn))} F`, icon: Banknote, tone: 'bg-amber-50 text-amber-700' },
  ];
  return (
    <section aria-label="Ma journée" className={CARD}>
      <div className="grid grid-cols-3 divide-x divide-[#efece4]">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 px-3 py-3">
            <span className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${t.tone}`}><t.icon className="h-4 w-4" /></span>
            <p className="whitespace-nowrap font-figures text-[15px] font-bold leading-tight text-ink min-[360px]:text-base">{t.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-stone-500">{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Course en cours ------------------------------------------------------------------------
const STEPS = [
  { label: 'Colis récupéré', icon: Package },
  { label: 'En route', icon: Moped },
  { label: 'Remise · code', icon: ShieldCheck },
];

function Steps() {
  return (
    <ol className="relative grid grid-cols-3" aria-label="Étapes de la course">
      <span className="absolute left-[16.6%] right-[16.6%] top-4 h-0.5 rounded-full bg-[#e8e5dc]" aria-hidden="true" />
      <span className="absolute left-[16.6%] top-4 h-0.5 w-[33.3%] rounded-full bg-brand-500" aria-hidden="true" />
      {STEPS.map((s, i) => {
        const done = i === 0;
        const current = i === 1;
        return (
          <li key={s.label} className="relative flex flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-brand-600 text-white' : current ? 'bg-white text-brand-700 ring-2 ring-brand-500' : 'bg-white text-stone-400 ring-1 ring-[#e8e5dc]'}`}>
              {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
            </span>
            <span className={`text-[11px] font-semibold ${i <= 1 ? 'text-stone-700' : 'text-stone-400'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PaymentPanel({ order }) {
  const fee = deliveryFee(order);
  if (isPrepaid(order)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-sky-200"><CreditCard className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sky-900">Déjà payée en ligne ({paymentLabel(order)})</p>
          <p className="text-xs text-sky-800/80">N'encaissez rien{fee > 0 ? ` · votre gain : ${fmt(fee)} F` : ''}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800/80">À encaisser en espèces</p>
        <p className="mt-1 whitespace-nowrap font-figures text-2xl font-bold leading-none text-amber-900">
          {fmt(cashToCollect(order))} <span className="text-xs font-semibold text-amber-800/70">FCFA</span>
        </p>
      </div>
      {fee > 0 && <Chip tone="brand">dont gain {fmt(fee)} F</Chip>}
    </div>
  );
}

const ACTION = 'flex flex-col items-center gap-1 rounded-xl border py-3 text-[13px] font-semibold transition-colors';

export function ActiveDelivery({ order, token, now, courier, onPosition, onSessionExpired, onValidate }) {
  const { address, coords } = parseOrderAddress(order.customer_address);
  const items = order.cart_items || [];
  const directions = orderDirectionsUrl(order);
  const wa = whatsappNumber(order.customer_phone);
  const waText = `Bonjour ${order.customer_name},\n\n🛵 C'est votre livreur. J'arrive avec votre commande.\n\n🔒 Préparez votre code à 4 chiffres pour valider la livraison.\n\nÀ tout de suite !`;

  return (
    <motion.section aria-labelledby="course-en-cours" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <SectionTitle id="course-en-cours" live>Course en cours</SectionTitle>
      <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-[0_12px_32px_-18px_color-mix(in_srgb,_var(--color-brand-600)_45%,_transparent)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#efece4] px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
            <Moped className="h-3.5 w-3.5" /> En route vers le client
          </span>
          <span className="truncate font-mono text-[11px] text-stone-400">#{orderRef(order)} · {sinceLabel(order.created_at, now)}</span>
        </div>

        {coords ? (
          <Suspense fallback={<div className="h-44 animate-pulse bg-[#f2f3f0]" />}>
            <DeliveryMap destination={coords} courier={courier} directionsUrl={directions} />
          </Suspense>
        ) : (
          <div className={`${SOFT} mx-4 mt-4 flex items-center gap-2.5 px-3.5 py-3 text-sm text-stone-600`}>
            <MapPin className="h-4 w-4 shrink-0 text-stone-400" /> Pas de position GPS : suivez l'adresse ci-dessous.
          </div>
        )}

        <div className="space-y-4 p-4">
          <LiveLocationShare token={token} orderId={order.id} onSessionExpired={onSessionExpired} onPosition={onPosition} />
          <Steps />

          <div className={`${SOFT} p-3.5`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Client</p>
            <p className="mt-0.5 text-base font-bold text-ink">{order.customer_name}</p>
            <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-snug text-stone-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {address || 'Adresse non précisée'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {order.delivery_zone && <Chip>{order.delivery_zone}</Chip>}
              {coords && <Chip tone="brand"><LocateFixed className="h-3 w-3" /> Position GPS partagée</Chip>}
            </div>
          </div>

          <div className={`${SOFT} p-3.5`}>
            <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
              <span>Colis</span>
              <span className="normal-case tracking-normal text-stone-500">{itemsCount(order)} article{itemsCount(order) > 1 ? 's' : ''}</span>
            </p>
            <ul className="mt-2 space-y-1.5">
              {items.slice(0, 4).map((it, i) => (
                <li key={`${it.product_id || i}-${i}`} className="flex items-start gap-2 text-sm">
                  <span className="flex h-5 min-w-6 items-center justify-center rounded-md bg-white px-1 font-figures text-xs font-bold text-ink ring-1 ring-[#e8e5dc]">{Number(it.quantity) || 1}×</span>
                  <span className="font-medium text-stone-800">{it.name}</span>
                </li>
              ))}
            </ul>
            {items.length > 4 && <p className="mt-1.5 text-xs font-medium text-stone-500">+ {items.length - 4} autre{items.length - 4 > 1 ? 's' : ''} article{items.length - 4 > 1 ? 's' : ''}</p>}
          </div>

          <PaymentPanel order={order} />

          <div className="grid grid-cols-3 gap-2">
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => callPhone(order.customer_phone)} aria-label={`Appeler ${order.customer_name}`} className={`${ACTION} border-[#e8e5dc] bg-white text-ink hover:bg-stone-50`}>
              <Phone className="h-5 w-5 text-brand-700" /> Appeler
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => openExternal(`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`)} aria-label={`Écrire à ${order.customer_name} sur WhatsApp`} className={`${ACTION} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
              <WhatsApp className="h-5 w-5" /> WhatsApp
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => openExternal(directions)} aria-label="Itinéraire jusqu'au client" className={`${ACTION} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`}>
              <Navigation className="h-5 w-5" /> Itinéraire
            </motion.button>
          </div>

          <SlideToConfirm label="Glissez pour valider la livraison" shortLabel="Glissez pour valider" ariaLabel="Glisser pour valider la livraison" onConfirm={onValidate} />
          <p className="text-center text-xs text-stone-500">Le client vous donne son code à 4 chiffres à la remise du colis.</p>
        </div>
      </div>
    </motion.section>
  );
}

// --- Courses disponibles --------------------------------------------------------------------
export function CourseCard({ order, index, now, busy, assigning, onAccept }) {
  const { address, coords } = parseOrderAddress(order.customer_address);
  const fee = deliveryFee(order);
  const count = itemsCount(order);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 6) * 0.05 } }}
      exit={{ opacity: 0, x: -60 }}
      className={`${CARD} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-ink">{order.delivery_zone || 'Zone non précisée'}</h3>
          <p className="mt-0.5 line-clamp-2 flex items-start gap-1.5 text-[13px] text-stone-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {address || 'Adresse donnée à l’acceptation'}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600">
          <Clock className="h-3 w-3" /> {sinceLabel(order.created_at, now)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip><Package className="h-3 w-3" /> {count} article{count > 1 ? 's' : ''}</Chip>
        {isPrepaid(order)
          ? <Chip tone="sky"><CreditCard className="h-3 w-3" /> Payée en ligne</Chip>
          : <Chip tone="gold"><Banknote className="h-3 w-3" /> {fmt(cashToCollect(order))} F à encaisser</Chip>}
        {coords && <Chip><LocateFixed className="h-3 w-3" /> GPS</Chip>}
      </div>

      <div className="mt-3.5 flex items-center gap-3 border-t border-[#efece4] pt-3.5">
        <div className="shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Votre gain</p>
          <p className="whitespace-nowrap font-figures text-base font-bold text-brand-700">{fee > 0 ? `+${fmt(fee)} F` : '—'}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onAccept(order.id)}
          disabled={busy || assigning}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
        >
          {assigning ? <LoaderCircle className="h-5 w-5 animate-spin" /> : busy ? <><Clock className="h-4 w-4" /> Course en cours</> : <>Accepter <ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </div>
    </motion.article>
  );
}

export function RadarEmpty({ soundEnabled, onEnableSound, onRefresh }) {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-8 text-center`}>
      <div className="relative mb-5 h-32 w-32">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute rounded-full border border-brand-200" style={{ inset: `${i * 18}px` }} />
        ))}
        <span className="absolute inset-0 animate-spin rounded-full motion-reduce:animate-none" style={{ background: 'conic-gradient(from 0deg, color-mix(in srgb, var(--color-brand-400) 30%, transparent), transparent 28%)', animationDuration: '3s' }} />
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-lg">
          <Moped className="h-5 w-5" />
        </span>
      </div>
      <h3 className="text-base font-bold text-ink">En attente de courses</h3>
      <p className="mt-1 max-w-xs text-sm text-stone-500">Les nouvelles commandes de la boutique apparaissent ici automatiquement.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {!soundEnabled && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={onEnableSound} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white hover:bg-brand-800">
            <BellRing className="h-4 w-4" /> Activer les alertes
          </motion.button>
        )}
        <motion.button whileTap={{ scale: 0.96 }} onClick={onRefresh} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#dcd8cd] bg-white px-4 text-sm font-bold text-stone-700 hover:border-stone-400">
          <RotateCw className="h-4 w-4" /> Actualiser
        </motion.button>
      </div>
    </div>
  );
}

export function AvailableCourses({ orders, now, busy, assigningId, onAccept, lastSync, soundEnabled, onEnableSound, onRefresh }) {
  return (
    <section aria-labelledby="courses-dispo">
      <SectionTitle
        id="courses-dispo"
        aside={<span className="hidden shrink-0 text-[11px] text-stone-400 min-[375px]:inline">{lastSync ? `Mis à jour ${sinceLabel(lastSync, now)}` : ''}</span>}
      >
        Courses disponibles
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] text-brand-800">{orders.length}</span>
      </SectionTitle>
      {orders.length === 0 ? (
        <RadarEmpty soundEnabled={soundEnabled} onEnableSound={onEnableSound} onRefresh={onRefresh} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {orders.map((o, i) => (
              <CourseCard key={o.id} order={o} index={i} now={now} busy={busy} assigning={assigningId === o.id} onAccept={onAccept} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

// --- Gains -----------------------------------------------------------------------------------
export function EarningsView({ summary, delivered }) {
  const owed = summary.toReturn < 0;
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-ink p-5 text-white shadow-[0_18px_40px_-22px_color-mix(in_srgb,_var(--color-ink)_80%,_transparent)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/40 blur-3xl" aria-hidden="true" />
        <p className="relative flex items-center gap-2 text-sm font-medium text-white/75"><HandCoins className="h-4 w-4" /> Mes gains aujourd'hui</p>
        <p className="relative mt-1 whitespace-nowrap font-figures text-4xl font-bold tracking-tight">
          {fmt(summary.fees)} <span className="text-base font-semibold text-white/60">FCFA</span>
        </p>
        <p className="relative mt-1.5 text-sm text-white/65">{summary.count} course{summary.count > 1 ? 's' : ''} livrée{summary.count > 1 ? 's' : ''} · frais de livraison</p>
      </section>

      <section aria-labelledby="bilan" className={`${CARD} p-4`}>
        <h2 id="bilan" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500"><Wallet className="h-4 w-4 text-amber-600" /> Bilan de caisse</h2>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3"><dt className="text-stone-600">Espèces encaissées</dt><dd className="whitespace-nowrap font-figures font-semibold text-ink">{fmt(summary.cash)} F</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-stone-600">Mes frais de livraison</dt><dd className="whitespace-nowrap font-figures font-semibold text-brand-700">− {fmt(summary.fees)} F</dd></div>
          <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#dcd8cd] pt-2.5">
            <dt className="min-w-0 font-bold leading-snug text-ink">{owed ? 'La boutique vous doit' : 'À reverser à la boutique'}</dt>
            <dd className="shrink-0 whitespace-nowrap font-figures text-lg font-bold text-amber-700">{fmt(Math.abs(summary.toReturn))} F</dd>
          </div>
        </dl>
        <p className={`${SOFT} mt-3 px-3.5 py-2.5 text-xs leading-relaxed text-stone-600`}>
          {owed
            ? 'Vos courses payées en ligne vous ont rapporté plus de frais que les espèces encaissées : la boutique vous doit la différence.'
            : 'Remettez cette somme à la boutique en fin de tournée. Vos frais de livraison sont déjà déduits.'}
        </p>
      </section>

      <section aria-labelledby="historique">
        <SectionTitle id="historique"><Receipt className="h-4 w-4" /> Courses livrées aujourd'hui</SectionTitle>
        {delivered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dcd8cd] bg-white/60 p-7 text-center text-sm text-stone-500">Aucune course livrée pour le moment.</div>
        ) : (
          <ul className={`${CARD} divide-y divide-[#efece4] overflow-hidden`}>
            {[...delivered].sort((a, b) => Date.parse(b.delivered_at || 0) - Date.parse(a.delivered_at || 0)).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-figures text-[10px] font-semibold">{clockLabel(o.delivered_at) || '—'}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{o.delivery_zone || 'Livraison'}</p>
                  <p className="truncate text-xs text-stone-500">#{orderRef(o)} · {isPrepaid(o) ? 'payée en ligne' : `${fmt(cashToCollect(o))} F en espèces`}</p>
                </div>
                <p className="shrink-0 whitespace-nowrap font-figures text-sm font-bold text-brand-700">+{fmt(deliveryFee(o))} F</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// --- Profil ----------------------------------------------------------------------------------
export function ProfileView({ driverName, shopLabel, merchantPhone, summary, available, soundEnabled, onToggleSound, onLogout }) {
  const shopWa = whatsappNumber(merchantPhone);
  const rows = [
    { icon: soundEnabled ? BellRing : BellOff, label: 'Alertes de nouvelles courses', detail: soundEnabled ? 'Son et vibration activés' : 'Désactivées', onClick: onToggleSound, toggle: soundEnabled },
    merchantPhone && { icon: Phone, label: 'Appeler la boutique', detail: formatPhone(merchantPhone), onClick: () => callPhone(merchantPhone) },
    shopWa && { icon: WhatsApp, label: 'Écrire à la boutique', detail: 'WhatsApp', onClick: () => openExternal(`https://wa.me/${shopWa}`) },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <section className={`${CARD} relative overflow-hidden p-5`}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-brand-100 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-2xl font-bold text-white">
            {driverName.charAt(0).toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-ink">{driverName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-stone-500"><Store className="h-3.5 w-3.5 shrink-0" /> Livreur partenaire · {shopLabel}</p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En service
            </span>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { v: summary.count, l: 'Livrées' },
            { v: available, l: 'Disponibles' },
            { v: `${fmt(summary.fees)} F`, l: 'Gains' },
          ].map((s) => (
            <div key={s.l} className={`${SOFT} min-w-0 px-1.5 py-2.5`}>
              <p className="whitespace-nowrap font-figures text-[15px] font-bold text-ink min-[360px]:text-base">{s.v}</p>
              <p className="text-[11px] text-stone-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <ul className={`${CARD} divide-y divide-[#efece4] overflow-hidden`}>
        {rows.map((r) => (
          <li key={r.label}>
            <button
              type="button"
              onClick={r.onClick}
              {...(r.toggle !== undefined ? { role: 'switch', 'aria-checked': Boolean(r.toggle) } : {})}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-stone-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7f6f2] text-stone-700"><r.icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{r.label}</span>
                <span className="block truncate text-xs text-stone-500">{r.detail}</span>
              </span>
              {r.toggle !== undefined ? (
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${r.toggle ? 'bg-brand-600' : 'bg-stone-300'}`} aria-hidden="true">
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.toggle ? 'left-[22px]' : 'left-0.5'}`} />
                </span>
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-[13px] leading-relaxed text-amber-900">
          Pendant une course, gardez cette page ouverte : le client suit votre position en direct, et l'écran reste allumé.
        </p>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50">
        <LogOut className="h-[18px] w-[18px]" /> Se déconnecter
      </motion.button>
    </div>
  );
}
