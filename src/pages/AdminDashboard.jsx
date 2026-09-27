import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  LayoutDashboard, Map as MapIcon, Store, CreditCard, LogOut, Menu, X, RefreshCw, Download, Search, MapPin,
  Phone, Mail, MessageCircle, ShieldCheck, ShieldAlert, Crown, Wallet, ShoppingBag,
  Users, CalendarDays, Clock, TriangleAlert, CircleCheck, Eye, Copy, ChevronRight, Sparkles, Globe, Navigation,
  TrendingUp, ArrowUpRight, ArrowDownRight, Minus, LoaderCircle, Camera, Music2,
} from 'lucide-react';
import ShopsMap, { PLAN_META } from '../components/admin/ShopsMap';
import { nearestCity } from '../components/admin/geo';
import { ChartCard, AreaChart, ColumnChart, DonutChart, BarList, Sparkline } from '../components/dashboard/Charts';
import { MagicIcon, CARD, rise } from '../components/dashboard/ui';
import { fmt, compact } from '../components/dashboard/analytics';

// Tarifs mensuels des forfaits (FCFA), identiques à la page Facturation et au webhook.
const PLAN_PRICES = { debutant: 0, pro: 5000, premium: 15000 };
const PERIODS = [{ id: 7, label: '7 jours' }, { id: 30, label: '30 jours' }, { id: 90, label: '90 jours' }];
const DAY = 86400000;

const planOf = (m) => (PLAN_META[m.subscription_plan] ? m.subscription_plan : 'debutant');
const isPaidActive = (m) => planOf(m) !== 'debutant' && m.subscription_status === 'active' && !m.is_suspended
  && (!m.subscription_end_date || new Date(m.subscription_end_date) > new Date());
const shopUrl = (m) => `${window.location.origin}/boutique/${encodeURIComponent(m.shop_name || '')}`;
const waUrl = (phone) => `https://wa.me/${String(phone || '').replace(/[^\d]/g, '')}`;
const dateFr = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('fr-FR', opts) : '—');
const relDays = (d) => {
  if (!d) return 'jamais';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / DAY);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
};

/* ------------------------------------------------------------------ */
/* Petits composants                                                   */
/* ------------------------------------------------------------------ */

function PlanBadge({ plan }) {
  const meta = PLAN_META[plan] || PLAN_META.debutant;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ merchant }) {
  if (merchant.is_suspended) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200"><ShieldAlert className="h-3.5 w-3.5" /> Suspendue</span>;
  }
  if (merchant.subscription_status === 'expired') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200"><TriangleAlert className="h-3.5 w-3.5" /> Expirée</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"><CircleCheck className="h-3.5 w-3.5" /> Active</span>;
}

function ShopAvatar({ merchant, size = 'h-11 w-11 text-base' }) {
  return merchant.logo_url ? (
    <img src={merchant.logo_url} alt="" className={`${size} shrink-0 rounded-xl bg-white object-cover ring-1 ring-slate-200`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-extrabold text-white`}>
      {(merchant.shop_name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

function Delta({ value, suffix }) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400">Pas de comparaison</span>;
  const up = value > 0.0005, down = value < -0.0005;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${up ? 'bg-emerald-50 text-emerald-700' : down ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} /> {value > 0 ? '+' : ''}{(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
      </span>
      <span className="text-xs text-slate-400">{suffix}</span>
    </span>
  );
}

function Kpi({ label, value, unit, icon, gradient, deltaValue, deltaLabel, spark, accent, hint }) {
  return (
    <motion.div variants={rise} className={`${CARD} flex h-full flex-col p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <MagicIcon icon={icon} gradient={gradient} size="sm" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">
        {value}{unit && <span className="ml-1 text-base font-semibold text-slate-400">{unit}</span>}
      </p>
      <div className="mt-2 min-h-[22px]">
        {deltaLabel ? <Delta value={deltaValue} suffix={deltaLabel} /> : <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {spark && <div className="mt-auto pt-3"><Sparkline values={spark} accent={accent} /></div>}
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <div className="break-words text-sm font-semibold text-slate-800">{children || <span className="font-normal text-slate-400">Non renseigné</span>}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche détaillée d'un marchand                                       */
/* ------------------------------------------------------------------ */

function MerchantDrawer({ merchant, onClose, onToggleSuspension, onShowOnMap, busy }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!merchant) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [merchant, onClose]);

  const copyInfo = () => {
    const m = merchant;
    const text = [
      `Boutique : ${m.shop_name}`,
      `Téléphone : ${m.phone_number || '—'}`,
      `Email du compte : ${m.account_email || '—'}`,
      `Email de contact : ${m.contact_email || '—'}`,
      `Adresse : ${m.address || '—'}`,
      `Localisation : ${m.latitude != null ? `${m.latitude.toFixed(6)}, ${m.longitude.toFixed(6)} (${m.city})` : 'non localisée'}`,
      `Forfait : ${(PLAN_META[planOf(m)]).label}`,
      `Vitrine : ${shopUrl(m)}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {merchant && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-[#f6f8f7] shadow-2xl"
          >
            <div className="relative overflow-hidden bg-[#06150f] p-6 text-white">
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <div className="aurora-blob aurora-1 -left-16 -top-16 h-56 w-56 bg-emerald-500/30" />
                <div className="aurora-blob aurora-2 -right-10 bottom-0 h-48 w-48 bg-cyan-400/15" />
              </div>
              <div className="relative flex items-start gap-4">
                <ShopAvatar merchant={merchant} size="h-16 w-16 text-2xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-extrabold">{merchant.shop_name || 'Sans nom'}</h2>
                  <p className="mt-0.5 text-sm text-white/60">Inscrite le {dateFr(merchant.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PlanBadge plan={planOf(merchant)} />
                    <StatusBadge merchant={merchant} />
                  </div>
                </div>
                <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Fermer"><X className="h-5 w-5" /></motion.button>
              </div>
              <div className="relative mt-5 grid grid-cols-4 gap-2">
                {[
                  { label: 'Produits', value: merchant.products_count },
                  { label: 'Commandes', value: merchant.orders_count },
                  { label: 'Livrées', value: merchant.delivered_count },
                  { label: 'Livreurs', value: merchant.drivers_count },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/[0.07] p-3 text-center">
                    <p className="text-xl font-extrabold">{fmt(Number(s.value))}</p>
                    <p className="text-[11px] text-white/60">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <section className={`${CARD} p-5`}>
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900"><Wallet className="h-4 w-4 text-emerald-600" /> Chiffre d'affaires livré</p>
                <p className="text-3xl font-extrabold text-slate-900">{fmt(Number(merchant.revenue_fcfa))} <span className="text-base text-slate-400">FCFA</span></p>
                <p className="text-xs text-slate-500">Dernière commande : {merchant.last_order_at ? `${dateFr(merchant.last_order_at)} (${relDays(merchant.last_order_at)})` : 'aucune'}</p>
              </section>

              <section className={`${CARD} px-5 py-3`}>
                <p className="py-2 text-sm font-bold text-slate-900">Contact</p>
                <InfoRow icon={Phone} label="Téléphone (WhatsApp)">
                  {merchant.phone_number && (
                    <span className="flex flex-wrap items-center gap-2">
                      {merchant.phone_number}
                      <a href={`tel:${merchant.phone_number}`} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">Appeler</a>
                      <a href={waUrl(merchant.phone_number)} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366]/15 px-2 py-0.5 text-xs font-bold text-green-700">WhatsApp</a>
                    </span>
                  )}
                </InfoRow>
                <InfoRow icon={Mail} label="Email du compte">{merchant.account_email && <a href={`mailto:${merchant.account_email}`} className="hover:underline">{merchant.account_email}</a>}</InfoRow>
                <InfoRow icon={Mail} label="Email de contact (vitrine)">{merchant.contact_email}</InfoRow>
                <InfoRow icon={MapPin} label="Adresse déclarée">{merchant.address}</InfoRow>
                <InfoRow icon={Clock} label="Dernière connexion">{merchant.last_sign_in_at ? `${dateFr(merchant.last_sign_in_at)} (${relDays(merchant.last_sign_in_at)})` : null}</InfoRow>
              </section>

              <section className={`${CARD} p-5`}>
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Navigation className="h-4 w-4 text-rose-500" /> Localisation GPS</p>
                {merchant.latitude != null ? (
                  <>
                    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                      <iframe
                        title={`Position de ${merchant.shop_name}`}
                        className="h-48 w-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${merchant.longitude - 0.008}%2C${merchant.latitude - 0.005}%2C${merchant.longitude + 0.008}%2C${merchant.latitude + 0.005}&layer=mapnik&marker=${merchant.latitude}%2C${merchant.longitude}`}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Ville la plus proche</p><p className="font-bold">{merchant.city}</p></div>
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Précision</p><p className="font-bold">{merchant.location_accuracy_m != null ? `± ${merchant.location_accuracy_m} m` : '—'}</p></div>
                      <div className="col-span-2 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Coordonnées · {merchant.location_source === 'inscription' ? "partagées à l'inscription" : 'mises à jour par le marchand'} le {dateFr(merchant.location_updated_at)}</p><p className="font-mono font-bold">{merchant.latitude.toFixed(6)}, {merchant.longitude.toFixed(6)}</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => onShowOnMap(merchant)} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white"><MapIcon className="h-4 w-4" /> Voir sur la carte</button>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${merchant.latitude},${merchant.longitude}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700"><Navigation className="h-4 w-4" /> Itinéraire</a>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-700">Boutique non localisée</p>
                    <p className="mt-1 text-xs text-slate-500">Le marchand peut l'ajouter dans Paramètres → Localisation de la boutique.</p>
                    {merchant.phone_number && (
                      <a
                        href={`${waUrl(merchant.phone_number)}?text=${encodeURIComponent(`Bonjour ${merchant.shop_name}, pour apparaître sur la carte SamaBoutik, ouvrez votre tableau de bord → Paramètres → « Localiser ma boutique » depuis votre boutique. Merci !`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
                      >
                        <MessageCircle className="h-4 w-4" /> Lui demander sur WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </section>

              <section className={`${CARD} px-5 py-3`}>
                <p className="py-2 text-sm font-bold text-slate-900">Abonnement et paiements</p>
                <InfoRow icon={Crown} label="Forfait">{PLAN_META[planOf(merchant)].label} · {fmt(PLAN_PRICES[planOf(merchant)])} FCFA / mois</InfoRow>
                <InfoRow icon={CalendarDays} label="Fin de l'abonnement">{merchant.subscription_end_date ? `${dateFr(merchant.subscription_end_date)}` : null}</InfoRow>
                <InfoRow icon={Wallet} label="Reversements (moyen et numéro)">{merchant.payout_phone_number ? `${merchant.payout_provider || '—'} · ${merchant.payout_phone_number}` : null}</InfoRow>
              </section>

              <section className={`${CARD} px-5 py-3`}>
                <p className="py-2 text-sm font-bold text-slate-900">Vitrine</p>
                <InfoRow icon={Globe} label="Adresse de la vitrine"><a href={shopUrl(merchant)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{shopUrl(merchant)}</a></InfoRow>
                <InfoRow icon={Sparkles} label="Description">{merchant.description}</InfoRow>
                <InfoRow icon={Users} label="Réseaux sociaux">
                  {Object.entries(merchant.social_links || {}).filter(([, v]) => v).length > 0 && (
                    <span className="flex flex-wrap gap-2">
                      {Object.entries(merchant.social_links).filter(([, v]) => v).map(([k, v]) => (
                        <a key={k} href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold capitalize text-slate-700">
                          {k === 'instagram' ? <Camera className="h-3 w-3" /> : k === 'tiktok' ? <Music2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />} {k}
                        </a>
                      ))}
                    </span>
                  )}
                </InfoRow>
              </section>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-4">
              <button onClick={copyInfo} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-700">
                {copied ? <CircleCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? 'Copié' : 'Copier'}
              </button>
              <a href={shopUrl(merchant)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-700">
                <Eye className="h-4 w-4" /> Vitrine
              </a>
              <button
                onClick={() => onToggleSuspension(merchant)}
                disabled={busy}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-60 ${merchant.is_suspended ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : merchant.is_suspended ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                {merchant.is_suspended ? 'Débloquer' : 'Suspendre'}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState(30);
  const [detailsId, setDetailsId] = useState(null);
  const [mapSelectedId, setMapSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  // Filtres de la liste des marchands
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locFilter, setLocFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [mapSearch, setMapSearch] = useState('');

  const fetchAdminData = async () => {
    setRefreshing(true);
    setLoadError('');
    try {
      const [overview, activity] = await Promise.all([
        supabase.rpc('admin_merchants_overview'),
        supabase.rpc('admin_platform_series', { p_days: 365 }),
      ]);
      if (overview.error) throw overview.error;
      if (activity.error) throw activity.error;
      setMerchants((overview.data || []).map((m) => ({ ...m, city: nearestCity(m.latitude, m.longitude) })));
      setSeries(activity.data || []);
    } catch (err) {
      console.error('Erreur chargement admin:', err);
      setLoadError(err?.code === 'PGRST202'
        ? "Les fonctions d'administration ne sont pas encore installées : exécutez admin_locations.sql dans Supabase."
        : (err?.message || 'Impossible de charger les données.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const toggleSuspension = async (merchant) => {
    const action = merchant.is_suspended ? 'débloquer' : 'suspendre';
    if (!window.confirm(`Voulez-vous vraiment ${action} « ${merchant.shop_name} » ?`)) return;
    setBusyId(merchant.id);
    try {
      const { error } = await supabase.from('merchants').update({ is_suspended: !merchant.is_suspended }).eq('id', merchant.id);
      if (error) throw error;
      setMerchants((list) => list.map((m) => (m.id === merchant.id ? { ...m, is_suspended: !merchant.is_suspended } : m)));
    } catch (err) {
      alert(`Mise à jour impossible : ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const columns = [
      ['Boutique', (m) => m.shop_name], ['Téléphone', (m) => m.phone_number], ['Email du compte', (m) => m.account_email],
      ['Email de contact', (m) => m.contact_email], ['Adresse', (m) => m.address], ['Ville (GPS)', (m) => m.city || ''],
      ['Latitude', (m) => m.latitude ?? ''], ['Longitude', (m) => m.longitude ?? ''], ['Précision (m)', (m) => m.location_accuracy_m ?? ''],
      ['Forfait', (m) => PLAN_META[planOf(m)].label], ['Statut abonnement', (m) => m.subscription_status], ['Fin abonnement', (m) => m.subscription_end_date || ''],
      ['Suspendue', (m) => (m.is_suspended ? 'oui' : 'non')], ['Reversement', (m) => m.payout_provider || ''], ['Numéro de reversement', (m) => m.payout_phone_number || ''],
      ['Produits', (m) => m.products_count], ['Livreurs', (m) => m.drivers_count], ['Commandes', (m) => m.orders_count],
      ['Livrées', (m) => m.delivered_count], ['CA livré (FCFA)', (m) => m.revenue_fcfa], ['Inscription', (m) => m.created_at],
      ['Dernière connexion', (m) => m.last_sign_in_at || ''], ['Vitrine', (m) => shopUrl(m)],
    ];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [columns.map(([h]) => cell(h)).join(';'), ...merchants.map((m) => columns.map(([, get]) => cell(get(m))).join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `samaboutik-marchands-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* ------------------------------ Calculs ------------------------------ */
  const a = useMemo(() => {
    const now = Date.now();
    const start = now - period * DAY;
    const prevStart = start - period * DAY;
    const inRange = (d, s, e) => { const t = new Date(d).getTime(); return t >= s && t < e; };

    const days = series.map((d) => ({ ...d, t: new Date(`${d.day}T12:00:00`).getTime() }));
    const current = days.filter((d) => d.t >= start);
    const previous = days.filter((d) => d.t >= prevStart && d.t < start);
    const sum = (list, key) => list.reduce((acc, d) => acc + Number(d[key] || 0), 0);
    const delta = (cur, prev) => (prev ? (cur - prev) / prev : null);

    // Regroupement par semaine au-delà d'un mois, pour rester lisible
    const size = period > 31 ? 7 : 1;
    const buckets = [];
    for (let i = 0; i < current.length; i += size) {
      const chunk = current.slice(i, i + size);
      const first = new Date(chunk[0].t);
      const last = new Date(chunk[chunk.length - 1].t);
      buckets.push({
        key: chunk[0].day,
        label: first.toLocaleDateString('fr-FR', period <= 7 ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' }),
        longLabel: size > 1
          ? `Semaine du ${first.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
          : first.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        revenue: sum(chunk, 'delivered_revenue_fcfa'),
        orders: sum(chunk, 'orders_count'),
        newMerchants: sum(chunk, 'new_merchants'),
      });
    }

    const located = merchants.filter((m) => m.latitude != null);
    const paid = merchants.filter(isPaidActive);
    const mrr = paid.reduce((acc, m) => acc + PLAN_PRICES[planOf(m)], 0);
    const planBreakdown = Object.entries(PLAN_META).map(([id, meta]) => ({ id, label: meta.label, color: meta.color, value: merchants.filter((m) => planOf(m) === id).length }));

    const cityCounts = {};
    located.forEach((m) => { cityCounts[m.city] = (cityCounts[m.city] || 0) + 1; });
    const cities = Object.entries(cityCounts).map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value).slice(0, 8);

    const top = [...merchants].sort((x, y) => Number(y.revenue_fcfa) - Number(x.revenue_fcfa)).filter((m) => Number(m.revenue_fcfa) > 0).slice(0, 6)
      .map((m) => ({ label: m.shop_name || 'Sans nom', value: Number(m.revenue_fcfa), orders: Number(m.delivered_count) }));

    const expiringSoon = merchants.filter((m) => planOf(m) !== 'debutant' && m.subscription_end_date
      && new Date(m.subscription_end_date) - now < 7 * DAY && new Date(m.subscription_end_date) > now);
    const expired = merchants.filter((m) => m.subscription_status === 'expired'
      || (planOf(m) !== 'debutant' && m.subscription_end_date && new Date(m.subscription_end_date) <= now));

    const newMerchants = merchants.filter((m) => inRange(m.created_at, start, now + DAY)).length;
    const prevNewMerchants = merchants.filter((m) => inRange(m.created_at, prevStart, start)).length;

    return {
      buckets,
      revenue: sum(current, 'delivered_revenue_fcfa'),
      revenueDelta: delta(sum(current, 'delivered_revenue_fcfa'), sum(previous, 'delivered_revenue_fcfa')),
      orders: sum(current, 'orders_count'),
      ordersDelta: delta(sum(current, 'orders_count'), sum(previous, 'orders_count')),
      newMerchants,
      newMerchantsDelta: delta(newMerchants, prevNewMerchants),
      located,
      paid,
      mrr,
      planBreakdown,
      cities,
      top,
      expiringSoon,
      expired,
      suspended: merchants.filter((m) => m.is_suspended).length,
    };
  }, [merchants, series, period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = merchants.filter((m) => {
      const haystack = `${m.shop_name} ${m.phone_number} ${m.account_email} ${m.contact_email} ${m.address} ${m.city || ''}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (planFilter !== 'all' && planOf(m) !== planFilter) return false;
      if (statusFilter === 'active' && (m.is_suspended || m.subscription_status === 'expired')) return false;
      if (statusFilter === 'suspended' && !m.is_suspended) return false;
      if (statusFilter === 'expired' && m.subscription_status !== 'expired') return false;
      if (locFilter === 'located' && m.latitude == null) return false;
      if (locFilter === 'missing' && m.latitude != null) return false;
      return true;
    });
    const sorters = {
      recent: (x, y) => new Date(y.created_at) - new Date(x.created_at),
      revenue: (x, y) => Number(y.revenue_fcfa) - Number(x.revenue_fcfa),
      orders: (x, y) => Number(y.orders_count) - Number(x.orders_count),
      name: (x, y) => (x.shop_name || '').localeCompare(y.shop_name || '', 'fr'),
    };
    return list.sort(sorters[sortBy]);
  }, [merchants, search, planFilter, statusFilter, locFilter, sortBy]);

  const mapList = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return a.located.filter((m) => !q || `${m.shop_name} ${m.city} ${m.phone_number}`.toLowerCase().includes(q));
  }, [a.located, mapSearch]);

  const detailsMerchant = merchants.find((m) => m.id === detailsId) || null;
  const showOnMap = (m) => { setDetailsId(null); setTab('map'); setMapSelectedId(m.id); };

  const NAV = [
    { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: 'map', label: 'Carte des boutiques', icon: MapIcon, badge: a.located.length },
    { id: 'merchants', label: 'Marchands', icon: Store, badge: merchants.length },
    { id: 'billing', label: 'Abonnements', icon: CreditCard, badge: a.expiringSoon.length || null },
  ];
  const current = NAV.find((n) => n.id === tab);

  const sidebar = (prefix) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#06150f] text-slate-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="aurora-blob aurora-1 -left-32 -top-32 h-80 w-80 bg-emerald-500/20" />
        <div className="aurora-blob aurora-2 -right-40 bottom-10 h-72 w-72 bg-amber-400/10" />
      </div>
      <div className="relative flex items-center justify-between px-5 pt-6">
        <div className="flex h-11 w-[104px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_24px_rgba(52,211,153,0.25)]">
          <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
        </div>
        {prefix === 'mobile' && <button onClick={() => setMobileNav(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>}
      </div>
      <div className="relative mx-4 mt-6 rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/15 to-transparent p-4">
        <div className="flex items-center gap-3">
          <MagicIcon icon={ShieldCheck} gradient="amber" size="sm" sparkle />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Espace administrateur</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="relative mt-6 flex-1 space-y-1 px-3">
        {NAV.map(({ id, label, icon: Icon, badge }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); setMobileNav(false); }} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
              {active && <motion.span layoutId={`${prefix}-admin-nav`} className="absolute inset-0 rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-400/15 to-emerald-400/[0.03]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
              {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />}
              <Icon className={`relative h-[18px] w-[18px] transition-transform group-hover:scale-110 ${active ? 'text-emerald-300' : ''}`} />
              <span className="relative flex-1 text-left">{label}</span>
              {badge > 0 && <span className="relative rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div className="relative border-t border-white/5 p-3">
        <button onClick={logout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="h-[18px] w-[18px]" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#f3f5f4] font-sans text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] md:block">{sidebar('desktop')}</aside>
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} className="fixed inset-0 z-[1001] bg-slate-950/50 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-y-0 left-0 z-[1002] w-[284px] md:hidden">{sidebar('mobile')}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="md:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-[#f3f5f4]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-8">
            <button onClick={() => setMobileNav(true)} className="rounded-xl p-2 text-slate-600 hover:bg-white md:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Administration SamaBoutik</p>
              <h1 className="truncate text-lg font-bold">{current?.label}</h1>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={fetchAdminData} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" aria-label="Actualiser">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> <span className="hidden lg:inline">Actualiser</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={exportCsv} disabled={!merchants.length} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter (CSV)</span>
            </motion.button>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1400px]">
            {loadError && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {loadError}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-600/20 border-t-emerald-600" /></div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial="initial" animate="animate" exit={{ opacity: 0, y: -10 }} variants={{ animate: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">

                  {tab === 'overview' && (
                    <>
                      <motion.section variants={rise} className="relative overflow-hidden rounded-[2rem] bg-[#06150f] p-6 text-white md:p-8">
                        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                          <div className="aurora-blob aurora-1 -left-24 -top-32 h-96 w-96 bg-emerald-500/30" />
                          <div className="aurora-blob aurora-2 -right-20 top-0 h-80 w-80 bg-cyan-400/20" />
                          <div className="bg-grid-pattern absolute inset-0" />
                        </div>
                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                          <div>
                            <p className="mb-2 flex items-center gap-2 text-sm font-medium capitalize text-emerald-200/80"><CalendarDays className="h-4 w-4" /> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Plateforme <span className="text-shimmer">SamaBoutik</span></h2>
                            <p className="mt-3 max-w-xl text-emerald-50/80">
                              <strong className="text-white">{merchants.length} boutique{merchants.length > 1 ? 's' : ''}</strong> inscrite{merchants.length > 1 ? 's' : ''}, dont <strong className="text-white">{a.located.length}</strong> localisée{a.located.length > 1 ? 's' : ''} et <strong className="text-white">{a.paid.length}</strong> sur un forfait payant.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button onClick={() => setTab('map')} className="shine-btn inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#06150f]"><MapIcon className="h-4 w-4" /> Voir la carte</button>
                            <button onClick={() => setTab('merchants')} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-white/10"><Store className="h-4 w-4" /> Tous les marchands</button>
                          </div>
                        </div>
                      </motion.section>

                      <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
                        <div className="relative flex rounded-2xl border border-slate-200/70 bg-white p-1 shadow-sm" role="group" aria-label="Période">
                          {PERIODS.map((p) => (
                            <button key={p.id} onClick={() => setPeriod(p.id)} aria-pressed={period === p.id} className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${period === p.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                              {period === p.id && <motion.span layoutId="admin-period" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                              <span className="relative">{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <span className="text-sm text-slate-500">Les indicateurs d'activité portent sur les {period} derniers jours</span>
                      </motion.div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Kpi label="Chiffre d'affaires livré" value={compact(a.revenue)} unit="FCFA" icon={Wallet} gradient="emerald" deltaValue={a.revenueDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.revenue)} accent="#059669" />
                        <Kpi label="Commandes" value={fmt(a.orders)} icon={ShoppingBag} gradient="sky" deltaValue={a.ordersDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.orders)} accent="#2a78d6" />
                        <Kpi label="Nouvelles boutiques" value={fmt(a.newMerchants)} icon={Store} gradient="violet" deltaValue={a.newMerchantsDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.newMerchants)} accent="#4a3aa7" />
                        <Kpi label="Revenu mensuel (abonnements)" value={fmt(a.mrr)} unit="FCFA" icon={Crown} gradient="amber" hint={`${a.paid.length} forfait${a.paid.length > 1 ? 's' : ''} payant${a.paid.length > 1 ? 's' : ''} actif${a.paid.length > 1 ? 's' : ''} · ${a.suspended} suspendue${a.suspended > 1 ? 's' : ''}`} />
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <motion.div variants={rise} className="xl:col-span-2">
                          <ChartCard
                            className="h-full"
                            title="Chiffre d'affaires livré sur la plateforme"
                            subtitle={period > 31 ? 'Par semaine, toutes boutiques confondues' : 'Par jour, toutes boutiques confondues'}
                            table={{ columns: [{ key: 'longLabel', label: 'Période' }, { key: 'revenue', label: 'CA livré', align: 'right', format: (v) => `${fmt(v)} F` }, { key: 'orders', label: 'Commandes', align: 'right' }, { key: 'newMerchants', label: 'Nouvelles boutiques', align: 'right' }], rows: a.buckets }}
                          >
                            <AreaChart data={a.buckets} valueKey="revenue" color="#059669" seriesLabel="CA livré" formatValue={(v) => `${fmt(v)} FCFA`} extraRows={(d) => [{ label: 'commande(s)', value: d.orders, color: '#cbd5e1' }]} height={340} animationKey={period} />
                          </ChartCard>
                        </motion.div>
                        <motion.div variants={rise}>
                          <ChartCard className="h-full" title="Répartition des forfaits" subtitle={`${merchants.length} boutiques`} table={{ columns: [{ key: 'label', label: 'Forfait' }, { key: 'value', label: 'Boutiques', align: 'right' }], rows: a.planBreakdown }}>
                            <DonutChart segments={a.planBreakdown} centerLabel="Boutiques" animationKey="plans" />
                          </ChartCard>
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <motion.div variants={rise}>
                          <ChartCard className="h-full" title="Nouvelles boutiques" subtitle={period > 31 ? 'Par semaine' : 'Par jour'} table={{ columns: [{ key: 'longLabel', label: 'Période' }, { key: 'newMerchants', label: 'Inscriptions', align: 'right' }], rows: a.buckets }}>
                            <ColumnChart data={a.buckets} valueKey="newMerchants" color="#4a3aa7" seriesLabel="inscription(s)" formatValue={(v) => fmt(v)} height={430} animationKey={period} />
                          </ChartCard>
                        </motion.div>
                        <motion.div variants={rise}>
                          <ChartCard className="h-full" title="Boutiques par ville" subtitle="Ville la plus proche de la position GPS" table={{ columns: [{ key: 'label', label: 'Ville' }, { key: 'value', label: 'Boutiques', align: 'right' }], rows: a.cities }}>
                            <BarList items={a.cities} color="#2a78d6" formatValue={(v) => `${v}`} detail={(c) => `${Math.round((c.value / Math.max(1, a.located.length)) * 100)} % des boutiques localisées`} emptyText="Aucune boutique localisée pour le moment." animationKey="cities" />
                          </ChartCard>
                        </motion.div>
                        <motion.div variants={rise}>
                          <ChartCard className="h-full" title="Meilleures boutiques" subtitle="Chiffre d'affaires livré (depuis l'inscription)" table={{ columns: [{ key: 'label', label: 'Boutique' }, { key: 'orders', label: 'Livrées', align: 'right' }, { key: 'value', label: 'CA', align: 'right', format: (v) => `${fmt(v)} F` }], rows: a.top }}>
                            <BarList items={a.top} color="#059669" formatValue={(v) => `${compact(v)} F`} detail={(t) => `${t.orders} livraison${t.orders > 1 ? 's' : ''}`} emptyText="Aucune vente livrée pour le moment." animationKey="top" />
                          </ChartCard>
                        </motion.div>
                      </div>

                      <motion.section variants={rise} className={`${CARD} p-5 md:p-6`}>
                        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold">Carte des boutiques</h3>
                            <p className="text-sm text-slate-500">{a.located.length} boutique{a.located.length > 1 ? 's' : ''} localisée{a.located.length > 1 ? 's' : ''} sur {merchants.length}</p>
                          </div>
                          <button onClick={() => setTab('map')} className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800">Plein écran <ChevronRight className="h-4 w-4" /></button>
                        </header>
                        <ShopsMap merchants={merchants} height={360} onOpenDetails={(m) => setDetailsId(m.id)} />
                      </motion.section>
                    </>
                  )}

                  {tab === 'map' && (
                    <motion.div variants={rise} className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
                      <div className={`${CARD} flex max-h-[72vh] flex-col overflow-hidden`}>
                        <div className="border-b border-slate-100 p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <MagicIcon icon={MapPin} gradient="rose" size="sm" sparkle />
                            <div>
                              <p className="font-bold">{a.located.length} boutiques localisées</p>
                              <p className="text-xs text-slate-500">{merchants.length - a.located.length} restent à localiser</p>
                            </div>
                          </div>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={mapSearch} onChange={(e) => setMapSearch(e.target.value)} placeholder="Boutique, ville, téléphone…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                          {mapList.map((m) => (
                            <button key={m.id} onClick={() => setMapSelectedId(m.id)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${mapSelectedId === m.id ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'}`}>
                              <ShopAvatar merchant={m} size="h-10 w-10 text-sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold">{m.shop_name}</span>
                                <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {m.city}{m.location_accuracy_m != null ? ` · ± ${m.location_accuracy_m} m` : ''}</span>
                              </span>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.is_suspended ? '#94a3b8' : PLAN_META[planOf(m)].color }} />
                            </button>
                          ))}
                          {mapList.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Aucune boutique localisée ne correspond.</p>}
                        </div>
                        <div className="flex flex-wrap gap-3 border-t border-slate-100 p-3 text-xs text-slate-500">
                          {Object.values(PLAN_META).map((p) => <span key={p.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>)}
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Suspendue</span>
                        </div>
                      </div>
                      <ShopsMap merchants={merchants} selectedId={mapSelectedId} onSelect={(m) => setMapSelectedId(m.id)} onOpenDetails={(m) => setDetailsId(m.id)} height="72vh" />
                    </motion.div>
                  )}

                  {tab === 'merchants' && (
                    <>
                      <motion.div variants={rise} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                          { label: 'Boutiques', value: merchants.length, icon: Store, gradient: 'emerald' },
                          { label: 'Localisées', value: a.located.length, icon: MapPin, gradient: 'rose' },
                          { label: 'Forfaits payants', value: a.paid.length, icon: Crown, gradient: 'amber' },
                          { label: 'Suspendues', value: a.suspended, icon: ShieldAlert, gradient: 'slate' },
                        ].map((s) => (
                          <div key={s.label} className={`${CARD} flex items-center gap-3 p-4`}>
                            <MagicIcon icon={s.icon} gradient={s.gradient} size="sm" />
                            <div><p className="text-xl font-bold leading-tight">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
                          </div>
                        ))}
                      </motion.div>

                      <motion.div variants={rise} className={`${CARD} flex flex-col gap-3 p-4 lg:flex-row lg:items-center`}>
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone, email, adresse, ville…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            [planFilter, setPlanFilter, [['all', 'Tous les forfaits'], ['debutant', 'Débutant'], ['pro', 'Pro'], ['premium', 'Premium']]],
                            [statusFilter, setStatusFilter, [['all', 'Tous les statuts'], ['active', 'Actives'], ['expired', 'Expirées'], ['suspended', 'Suspendues']]],
                            [locFilter, setLocFilter, [['all', 'Toutes positions'], ['located', 'Localisées'], ['missing', 'Non localisées']]],
                            [sortBy, setSortBy, [['recent', 'Plus récentes'], ['revenue', 'Meilleur CA'], ['orders', 'Plus de commandes'], ['name', 'Nom (A→Z)']]],
                          ].map(([value, setter, options], i) => (
                            <select key={i} value={value} onChange={(e) => setter(e.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10">
                              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div variants={rise} className={`${CARD} overflow-hidden`}>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[980px] text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-5 py-3 font-semibold">Boutique</th>
                                <th className="px-5 py-3 font-semibold">Contact</th>
                                <th className="px-5 py-3 font-semibold">Localisation</th>
                                <th className="px-5 py-3 font-semibold">Forfait</th>
                                <th className="px-5 py-3 text-right font-semibold">Activité</th>
                                <th className="px-5 py-3 font-semibold">Statut</th>
                                <th className="px-5 py-3" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filtered.map((m, i) => (
                                <motion.tr
                                  key={m.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(i, 15) * 0.02 }}
                                  onClick={() => setDetailsId(m.id)}
                                  className="cursor-pointer transition-colors hover:bg-emerald-50/40"
                                >
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <ShopAvatar merchant={m} />
                                      <div className="min-w-0">
                                        <p className="truncate font-bold">{m.shop_name || 'Sans nom'}</p>
                                        <p className="text-xs text-slate-400">Inscrite {relDays(m.created_at)}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <p className="font-semibold text-slate-800">{m.phone_number || '—'}</p>
                                    <p className="max-w-[220px] truncate text-xs text-slate-500">{m.account_email}</p>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {m.latitude != null ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><MapPin className="h-3.5 w-3.5" /> {m.city}</span>
                                    ) : (
                                      <span className="text-xs text-slate-400">Non localisée</span>
                                    )}
                                    {m.address && <p className="mt-1 max-w-[200px] truncate text-xs text-slate-500">{m.address}</p>}
                                  </td>
                                  <td className="px-5 py-3.5"><PlanBadge plan={planOf(m)} /></td>
                                  <td className="px-5 py-3.5 text-right tabular-nums">
                                    <p className="font-bold">{fmt(Number(m.revenue_fcfa))} F</p>
                                    <p className="text-xs text-slate-500">{m.orders_count} cmd · {m.products_count} produits</p>
                                  </td>
                                  <td className="px-5 py-3.5"><StatusBadge merchant={m} /></td>
                                  <td className="px-5 py-3.5 text-right"><ChevronRight className="ml-auto h-5 w-5 text-slate-300" /></td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {filtered.length === 0 && <p className="p-10 text-center text-slate-500">Aucun marchand ne correspond à ces filtres.</p>}
                      </motion.div>
                    </>
                  )}

                  {tab === 'billing' && (
                    <>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {Object.entries(PLAN_META).map(([id, meta]) => {
                          const count = merchants.filter((m) => planOf(m) === id).length;
                          const active = merchants.filter((m) => planOf(m) === id && isPaidActive(m)).length;
                          return (
                            <motion.div key={id} variants={rise} whileHover={{ y: -6 }} className={`${CARD} relative overflow-hidden p-6`}>
                              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: meta.color }} />
                              <div className="relative mb-4 flex items-center justify-between">
                                <MagicIcon icon={id === 'premium' ? Sparkles : id === 'pro' ? TrendingUp : Store} gradient={id === 'premium' ? 'amber' : id === 'pro' ? 'violet' : 'sky'} />
                                <span className="text-sm font-semibold text-slate-500">{fmt(PLAN_PRICES[id])} FCFA / mois</span>
                              </div>
                              <p className="relative text-lg font-bold">{meta.label}</p>
                              <p className="relative mt-1 text-4xl font-extrabold">{count}</p>
                              <p className="relative text-sm text-slate-500">boutique{count > 1 ? 's' : ''}{id !== 'debutant' ? ` · ${active} active${active > 1 ? 's' : ''} · ${fmt(active * PLAN_PRICES[id])} F / mois` : ''}</p>
                            </motion.div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {[
                          { title: 'Expirent dans les 7 jours', list: a.expiringSoon, icon: Clock, empty: 'Aucun abonnement n\'expire cette semaine.' },
                          { title: 'Abonnements expirés', list: a.expired, icon: TriangleAlert, empty: 'Aucun abonnement expiré.' },
                        ].map((block) => (
                          <motion.section key={block.title} variants={rise} className={`${CARD} p-5`}>
                            <p className="mb-3 flex items-center gap-2 font-bold"><block.icon className="h-4 w-4 text-amber-500" /> {block.title} <span className="rounded-full bg-slate-100 px-2 text-xs">{block.list.length}</span></p>
                            {block.list.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{block.empty}</p> : (
                              <div className="space-y-1">
                                {block.list.map((m) => (
                                  <button key={m.id} onClick={() => setDetailsId(m.id)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-50">
                                    <ShopAvatar merchant={m} size="h-10 w-10 text-sm" />
                                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{m.shop_name}</span><span className="block text-xs text-slate-500">{PLAN_META[planOf(m)].label} · fin le {dateFr(m.subscription_end_date)}</span></span>
                                    {m.phone_number && <a onClick={(e) => e.stopPropagation()} href={`${waUrl(m.phone_number)}?text=${encodeURIComponent(`Bonjour ${m.shop_name}, votre abonnement SamaBoutik arrive à échéance. Vous pouvez le renouveler depuis votre tableau de bord → Facturation.`)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366]/15 p-2 text-green-700" aria-label="Relancer sur WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </motion.section>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      <MerchantDrawer
        merchant={detailsMerchant}
        onClose={() => setDetailsId(null)}
        onToggleSuspension={toggleSuspension}
        onShowOnMap={showOnMap}
        busy={busyId === detailsMerchant?.id}
      />
    </div>
    </MotionConfig>
  );
}
