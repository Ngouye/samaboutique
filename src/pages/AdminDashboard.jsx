import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  LayoutDashboard, Map as MapIcon, Store, CreditCard, Menu, X, RefreshCw, Download, Search, MapPin,
  Phone, Mail, MessageCircle, ShieldCheck, ShieldAlert, Crown, Wallet, ShoppingBag,
  Users, CalendarDays, Clock, TriangleAlert, CircleCheck, Eye, Copy, ChevronRight, Sparkles, Globe, Navigation,
  TrendingUp, ArrowUpRight, ArrowDownRight, Minus, LoaderCircle, Camera, Music2,
  UserRound, Package, Bike, Star, Activity, Receipt, Banknote, Truck, PackageX, PanelLeft, LogOut,
} from 'lucide-react';
import ShopsMap, { PLAN_META } from '../components/admin/ShopsMap';
import { nearestCity } from '../components/admin/geo';
import { ChartCard, AreaChart, ColumnChart, DonutChart, BarList, Sparkline } from '../components/dashboard/Charts';
import { MagicIcon, LogoutButton, CARD, rise } from '../components/dashboard/ui';
import { friendlyError } from '../utils/networkErrors';
import { fmt, compact } from '../components/dashboard/analytics';
import { BRAND } from '../utils/brand';
import LogoutDialog from '../components/LogoutDialog';
import { showFarewell, markLoggedOut } from '../utils/farewell';
import Logo, { LogoMark } from '../components/brand/Logo';
import { SetupNotice, StatGrid, StatTile, DataTable, NightFx } from '../components/admin/AdminKit';
import OrdersSection, { OrderDrawer, StatusChip } from '../components/admin/sections/OrdersSection';
import CustomersSection, { CustomerDrawer } from '../components/admin/sections/CustomersSection';
import ProductsSection from '../components/admin/sections/ProductsSection';
import DriversSection from '../components/admin/sections/DriversSection';
import ReviewsSection from '../components/admin/sections/ReviewsSection';
import SystemSection from '../components/admin/sections/SystemSection';
import SubscriptionDialog from '../components/admin/SubscriptionDialog';
import { ORDER_STATUSES } from '../components/dashboard/status';
import { paymentLabel } from '../utils/payments';
import { formatPayoutProviders } from '../utils/payout';
import { filterOrders, ordersSummary, customersSummary, productsSummary, paymentsSummary, toCsv, shortRef, scopeData } from '../utils/adminData';

// Données complémentaires (admin_complet.sql) : clé d'état, fonction, paramètres.
const EXTRA_SOURCES = [
  ['orders', 'admin_orders', { p_days: 365 }],
  ['customers', 'admin_customers'],
  ['products', 'admin_products'],
  ['drivers', 'admin_drivers'],
  ['reviews', 'admin_reviews'],
  ['payments', 'admin_subscription_payments'],
  ['health', 'admin_platform_health'],
];
const isMissingFunction = (error) => error?.code === 'PGRST202' || /Could not find the function/i.test(error?.message || '');
const PAY_COLORS = ['#3b2fc9', '#e8a33d', '#1dc8ff', '#ff7900', '#d6001c', '#0d6fb8'];

// Tarifs mensuels des forfaits (FCFA), identiques à la page Facturation et au webhook.
const PLAN_PRICES = { debutant: 0, pro: 5000, premium: 15000 };
const PERIODS = [{ id: 7, label: '7 jours' }, { id: 30, label: '30 jours' }, { id: 90, label: '90 jours' }];
const DAY = 86400000;

// Menu de gauche. Grand écran (≥ 1280 px) : menu complet qui pousse la page, ou rail d'icônes
// (choix mémorisé). Tablette : rail d'icônes, le menu complet s'ouvre par-dessus la page.
// Téléphone : menu en tiroir.
const WIDE_QUERY = '(min-width: 1280px)';
const SIDEBAR_KEY = 'samaboutik_admin_sidebar';
const isWideScreen = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(WIDE_QUERY).matches);
const fullMenuWanted = () => {
  try { return localStorage.getItem(SIDEBAR_KEY) !== 'rail'; } catch { return true; }
};

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

// Lueurs du menu de gauche (indigo en haut, or en bas) et grain photo
function SidebarGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#6a58e8]/30 blur-[80px]" />
      <div className="absolute -bottom-28 -right-24 h-64 w-64 rounded-full bg-[#f6c768]/10 blur-[80px]" />
      <div className="hero-grain absolute inset-0 opacity-[0.06] mix-blend-overlay" />
    </div>
  );
}

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
    <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-brand-600 font-extrabold text-white`}>
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

function MerchantDrawer({ merchant, onClose, onToggleSuspension, onShowOnMap, busy, onChangePlan, recentOrders = [], onOpenOrder, onFocusShop }) {
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
            className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-[#f7f6f2] shadow-2xl"
          >
            <div className="relative isolate overflow-hidden bg-[#0c0a24] p-6 text-white">
              <NightFx />
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
                  <div key={s.label} className="min-w-0 rounded-2xl bg-white/[0.06] p-3 text-center ring-1 ring-white/10">
                    <p className="font-editorial text-2xl leading-none">{fmt(Number(s.value))}</p>
                    <p className="mt-1 truncate text-[11px] text-white/55">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <section className={`${CARD} p-5`}>
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900"><Wallet className="h-4 w-4 text-brand-600" /> Chiffre d'affaires livré</p>
                <p className="text-3xl font-extrabold text-slate-900">{fmt(Number(merchant.revenue_fcfa))} <span className="text-base text-slate-400">FCFA</span></p>
                <p className="text-xs text-slate-500">Dernière commande : {merchant.last_order_at ? `${dateFr(merchant.last_order_at)} (${relDays(merchant.last_order_at)})` : 'aucune'}</p>
                {onFocusShop && (
                  <button onClick={() => onFocusShop(merchant)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-100">
                    <LayoutDashboard className="h-4 w-4" /> Afficher uniquement cette boutique
                  </button>
                )}
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
                <InfoRow icon={Wallet} label="Reversements (comptes et numéro)">{merchant.payout_phone_number ? `${formatPayoutProviders(merchant.payout_provider) || '—'} · ${merchant.payout_phone_number}` : null}</InfoRow>
                {onChangePlan && (
                  <button onClick={() => onChangePlan(merchant)} className="btn-gold mb-2 mt-1 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-extrabold">
                    <Crown className="h-4 w-4" /> Changer l'offre
                  </button>
                )}
              </section>

              {recentOrders.length > 0 && (
                <section className={`${CARD} px-5 py-3`}>
                  <p className="py-2 text-sm font-bold text-slate-900">Dernières commandes</p>
                  <ul className="divide-y divide-slate-100">
                    {recentOrders.slice(0, 6).map((o) => (
                      <li key={o.id}>
                        <button onClick={() => onOpenOrder(o.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{o.customer_name}</span>
                            <span className="block text-xs text-slate-500">#{shortRef(o.id)} · {dateFr(o.created_at)}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1"><span className="text-sm font-bold">{fmt(o.total_amount_fcfa)} F</span><StatusChip status={o.status} /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={`${CARD} px-5 py-3`}>
                <p className="py-2 text-sm font-bold text-slate-900">Vitrine</p>
                <InfoRow icon={Globe} label="Adresse de la vitrine"><a href={shopUrl(merchant)} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{shopUrl(merchant)}</a></InfoRow>
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
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-60 ${merchant.is_suspended ? 'bg-brand-600 hover:bg-brand-500' : 'bg-red-600 hover:bg-red-500'}`}
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
  const [wide, setWide] = useState(isWideScreen);
  const [menuOpen, setMenuOpen] = useState(() => isWideScreen() && fullMenuWanted());
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_QUERY);
    if (!mq) return undefined;
    // Rotation de la tablette, fenêtre agrandie ou réduite
    const onChange = (e) => { setWide(e.matches); setMenuOpen(e.matches && fullMenuWanted()); };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  useEffect(() => {
    if (wide || !menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wide, menuOpen]);
  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    if (wide) {
      try { localStorage.setItem(SIDEBAR_KEY, next ? 'full' : 'rail'); } catch { /* mémoire du navigateur indisponible */ }
    }
  };
  // Filtres de la liste des marchands
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locFilter, setLocFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [mapSearch, setMapSearch] = useState('');
  // Données de toute la plateforme (admin_complet.sql) et fonctions absentes de la base
  const [extra, setExtra] = useState({ orders: [], customers: [], products: [], drivers: [], reviews: [], payments: [], health: null });
  const [missing, setMissing] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [customerKey, setCustomerKey] = useState(null);
  const [subscriptionFor, setSubscriptionFor] = useState(null);
  // Heure du dernier chargement : référence des calculs « depuis 24 h », « 30 derniers jours »…
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  // Boutique affichée : 'all' (toute la plateforme) ou l'identifiant d'une boutique.
  // Dans ce cas, chaque onglet ne montre QUE ses données (commandes, clients, produits…).
  const [scope, setScope] = useState('all');
  const scoped = useMemo(() => scopeData(extra, scope), [extra, scope]);
  const scopeMerchant = scope === 'all' ? null : merchants.find((m) => m.id === scope) || null;
  const shopOptions = useMemo(() => [...merchants].sort((x, y) => (x.shop_name || '').localeCompare(y.shop_name || '', 'fr')), [merchants]);

  const fetchAdminData = async () => {
    setRefreshing(true);
    setLoadError('');
    try {
      const [overview, activity, ...extras] = await Promise.all([
        supabase.rpc('admin_merchants_overview'),
        supabase.rpc('admin_platform_series', { p_days: 365 }),
        ...EXTRA_SOURCES.map(([, fn, args]) => supabase.rpc(fn, args)),
      ]);
      if (overview.error) throw overview.error;
      if (activity.error) throw activity.error;
      setMerchants((overview.data || []).map((m) => ({ ...m, city: nearestCity(m.latitude, m.longitude) })));
      setSeries(activity.data || []);
      const next = {};
      const absent = [];
      extras.forEach(({ data, error }, i) => {
        const key = EXTRA_SOURCES[i][0];
        if (error) {
          if (isMissingFunction(error)) absent.push(key);
          else console.error(`Erreur ${EXTRA_SOURCES[i][1]} :`, error);
        }
        next[key] = key === 'health' ? (error ? null : data) : (error ? [] : data || []);
      });
      setExtra(next);
      setMissing(absent);
      setLoadedAt(Date.now());
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

  const refreshHealth = async () => {
    const { data, error } = await supabase.rpc('admin_platform_health');
    if (!error) setExtra((e) => ({ ...e, health: data }));
  };

  const toggleSuspension = async (merchant) => {
    const action = merchant.is_suspended ? 'débloquer' : 'suspendre';
    if (!window.confirm(`Voulez-vous vraiment ${action} « ${merchant.shop_name} » ?`)) return;
    setBusyId(merchant.id);
    try {
      // Fonction journalisée (admin_complet.sql) ; sinon, mise à jour directe comme avant.
      let { data, error } = await supabase.rpc('admin_set_suspension', { p_merchant_id: merchant.id, p_suspended: !merchant.is_suspended });
      if (isMissingFunction(error)) ({ error } = await supabase.from('merchants').update({ is_suspended: !merchant.is_suspended }).eq('id', merchant.id));
      else if (!error && data?.ok === false) error = new Error(data.error);
      if (error) throw error;
      refreshHealth();
      setMerchants((list) => list.map((m) => (m.id === merchant.id ? { ...m, is_suspended: !merchant.is_suspended } : m)));
    } catch (err) {
      alert(`Mise à jour impossible : ${friendlyError(err, 'réessayez dans un instant.')}`);
    } finally {
      setBusyId(null);
    }
  };

  const saveSubscription = async (merchant, plan, months) => {
    const { data, error } = await supabase.rpc('admin_set_subscription', { p_merchant_id: merchant.id, p_plan: plan, p_months: months });
    if (error || data?.ok === false) {
      alert(isMissingFunction(error)
        ? "Exécutez d'abord admin_complet.sql dans Supabase pour pouvoir modifier les offres."
        : `Modification impossible : ${data?.error || friendlyError(error, 'réessayez dans un instant.')}`);
      return false;
    }
    setMerchants((list) => list.map((m) => (m.id === merchant.id
      ? { ...m, subscription_plan: plan, subscription_status: 'active', subscription_end_date: data.subscription_end_date }
      : m)));
    refreshHealth();
    return true;
  };

  const deleteReview = async (review) => {
    const { data, error } = await supabase.rpc('admin_delete_review', { p_review_id: review.id });
    if (error || data?.ok === false) {
      alert(`Suppression impossible : ${data?.error || friendlyError(error, 'réessayez dans un instant.')}`);
      return;
    }
    setExtra((e) => ({ ...e, reviews: e.reviews.filter((r) => r.id !== review.id) }));
    refreshHealth();
  };

  const openMerchant = (id) => { setOrderId(null); setCustomerKey(null); setDetailsId(id); };
  const openOrder = (id) => { setDetailsId(null); setCustomerKey(null); setOrderId(id); };
  const openCustomer = (key) => { setDetailsId(null); setOrderId(null); setCustomerKey(key); };

  const exportCsv = () => {
    const merchantColumns = [
      ['Boutique', (m) => m.shop_name], ['Téléphone', (m) => m.phone_number], ['Email du compte', (m) => m.account_email],
      ['Email de contact', (m) => m.contact_email], ['Adresse', (m) => m.address], ['Ville (GPS)', (m) => m.city || ''],
      ['Latitude', (m) => m.latitude ?? ''], ['Longitude', (m) => m.longitude ?? ''], ['Précision (m)', (m) => m.location_accuracy_m ?? ''],
      ['Forfait', (m) => PLAN_META[planOf(m)].label], ['Statut abonnement', (m) => m.subscription_status], ['Fin abonnement', (m) => m.subscription_end_date || ''],
      ['Suspendue', (m) => (m.is_suspended ? 'oui' : 'non')], ['Reversement', (m) => formatPayoutProviders(m.payout_provider)], ['Numéro de reversement', (m) => m.payout_phone_number || ''],
      ['Produits', (m) => m.products_count], ['Livreurs', (m) => m.drivers_count], ['Commandes', (m) => m.orders_count],
      ['Livrées', (m) => m.delivered_count], ['CA livré (FCFA)', (m) => m.revenue_fcfa], ['Inscription', (m) => m.created_at],
      ['Dernière connexion', (m) => m.last_sign_in_at || ''], ['Vitrine', (m) => shopUrl(m)],
    ];
    // Export de l'onglet ouvert
    const sets = {
      orders: ['commandes', scoped.orders, [
        ['Référence', (o) => shortRef(o.id)], ['Date', (o) => o.created_at], ['Boutique', (o) => o.shop_name], ['Client', (o) => o.customer_name],
        ['Téléphone', (o) => o.customer_phone], ['Zone', (o) => o.delivery_zone], ['Adresse', (o) => o.customer_address], ['Montant (FCFA)', (o) => o.total_amount_fcfa],
        ['Articles', (o) => o.items_count], ['Paiement', (o) => paymentLabel(o)], ['Statut', (o) => ORDER_STATUSES.find((st) => st.id === o.status)?.label || o.status],
        ['Livreur', (o) => o.driver_name || ''], ['Livrée le', (o) => o.delivered_at || ''],
      ]],
      customers: ['clients', scoped.customers, [
        ['Client', (c) => c.customer_name], ['Téléphone', (c) => c.customer_phone], ['Commandes', (c) => c.orders_count], ['Livrées', (c) => c.delivered_count],
        ['Annulées', (c) => c.cancelled_count], ['Dépensé (FCFA)', (c) => c.total_spent_fcfa], ['Boutiques', (c) => (c.shops || []).join(', ')],
        ['Quartiers', (c) => (c.zones || []).join(', ')], ['Première commande', (c) => c.first_order_at], ['Dernière commande', (c) => c.last_order_at],
      ]],
      products: ['produits', scoped.products, [
        ['Produit', (x) => x.name], ['Boutique', (x) => x.shop_name], ['Catégorie', (x) => x.category], ['Prix (FCFA)', (x) => x.price_fcfa], ['Stock', (x) => x.stock],
        ['Vendus', (x) => x.units_sold], ['CA livré (FCFA)', (x) => x.revenue_fcfa], ['Note', (x) => x.rating ?? ''], ['Avis', (x) => x.reviews_count],
        ['Visibilité', (x) => x.visibility], ['Créé le', (x) => x.created_at],
      ]],
      drivers: ['livreurs', scoped.drivers, [
        ['Livreur', (d) => d.full_name], ['Téléphone', (d) => d.phone_number], ['Véhicule', (d) => d.vehicle_type], ['Boutique', (d) => d.shop_name],
        ['Livrées', (d) => d.delivered_count], ['En route', (d) => d.in_transit_count], ['Espèces (FCFA)', (d) => d.cash_collected_fcfa], ['Dernière livraison', (d) => d.last_delivery_at || ''],
      ]],
      billing: ['paiements-abonnements', scoped.payments, [
        ['Date', (x) => x.created_at], ['Boutique', (x) => x.shop_name], ['Forfait', (x) => PLAN_META[x.plan]?.label || x.plan], ['Montant (FCFA)', (x) => x.amount_fcfa], ['Référence PayDunya', (x) => x.invoice_token],
      ]],
      reviews: ['avis', scoped.reviews, [
        ['Date', (r) => r.created_at], ['Note', (r) => r.rating], ['Commentaire', (r) => r.comment], ['Client', (r) => r.customer_name],
        ['Achat vérifié', (r) => (r.verified ? 'oui' : 'non')], ['Produit', (r) => r.product_name], ['Boutique', (r) => r.shop_name],
      ]],
    };
    const [name, rows, columns] = sets[tab] || ['boutiques', scopeMerchant ? [scopeMerchant] : merchants, merchantColumns];
    const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const scopeSlug = scopeMerchant ? `-${(scopeMerchant.shop_name || 'boutique').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
    link.download = `samaboutik-${name}${scopeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
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

  // Activité de la période (commandes de toute la plateforme)
  const ov = useMemo(() => {
    const now = loadedAt;
    const orders = filterOrders(scoped.orders, { days: period }, now);
    const os = ordersSummary(orders);
    const late = scoped.orders.filter((o) => o.status === 'PENDING' && now - Date.parse(o.created_at) > DAY);
    const ps = productsSummary(scoped.products, now);
    const negative = scoped.reviews.filter((r) => Number(r.rating) <= 2 && now - Date.parse(r.created_at) <= 30 * DAY);
    const wa = extra.health?.whatsapp?.by_status || {};
    return {
      os,
      cs: customersSummary(scoped.customers, now),
      pay: paymentsSummary(scoped.payments, now),
      late,
      outOfStock: ps.outOfStock,
      drafts: ps.draft,
      negative,
      waFailed: scopeMerchant
        ? (extra.health?.whatsapp?.recent_failures || []).filter((f) => f.shop_name === scopeMerchant.shop_name).length
        : Number(wa.failed || 0) + Number(wa.expired || 0),
      statusBars: ORDER_STATUSES.map((st) => ({ label: st.label, value: os.byStatus[st.id] || 0 })).filter((b) => b.value > 0),
      paySegments: os.payments.map((x, i) => ({ id: x.label, label: x.label, value: x.value, color: PAY_COLORS[i % PAY_COLORS.length] })),
    };
  }, [scoped, extra.health, period, loadedAt, scopeMerchant]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = merchants.filter((m) => {
      if (scope !== 'all' && m.id !== scope) return false;
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
  }, [merchants, search, planFilter, statusFilter, locFilter, sortBy, scope]);

  const mapList = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return a.located.filter((m) => !q || `${m.shop_name} ${m.city} ${m.phone_number}`.toLowerCase().includes(q));
  }, [a.located, mapSearch]);

  const detailsMerchant = merchants.find((m) => m.id === detailsId) || null;
  const showOnMap = (m) => { setDetailsId(null); setTab('map'); setMapSelectedId(m.id); };

  const NAV = [
    { id: 'overview', label: "Vue d'ensemble", short: 'Accueil', icon: LayoutDashboard, group: 'Pilotage' },
    { id: 'orders', label: 'Commandes', short: 'Commandes', icon: ShoppingBag, badge: ov.os.inProgress || null, group: 'Pilotage' },
    { id: 'customers', label: 'Clients', short: 'Clients', icon: UserRound, badge: scoped.customers.length || null, group: 'Pilotage' },
    { id: 'merchants', label: 'Boutiques', short: 'Boutiques', icon: Store, badge: merchants.length, group: 'Réseau' },
    { id: 'products', label: 'Produits', short: 'Produits', icon: Package, badge: scoped.products.length || null, group: 'Réseau' },
    { id: 'drivers', label: 'Livreurs', short: 'Livreurs', icon: Bike, badge: scoped.drivers.length || null, group: 'Réseau' },
    { id: 'map', label: 'Carte des boutiques', short: 'Carte', icon: MapIcon, badge: a.located.length, group: 'Réseau' },
    { id: 'billing', label: 'Abonnements et offres', short: 'Offres', icon: CreditCard, badge: a.expiringSoon.length || null, alert: true, group: 'Plateforme' },
    { id: 'reviews', label: 'Avis clients', short: 'Avis', icon: Star, badge: ov.negative.length || null, alert: true, group: 'Plateforme' },
    { id: 'system', label: 'Système et journal', short: 'Système', icon: Activity, badge: ov.waFailed || null, alert: true, group: 'Plateforme' },
  ];
  const current = NAV.find((n) => n.id === tab);
  // Choix d'un onglet : sur tablette, le menu complet ouvert par-dessus la page se referme
  const pick = (id) => { setTab(id); setMobileNav(false); if (!wide) setMenuOpen(false); };

  // Déconnexion : confirmation, puis écran d'au revoir pendant le retour à la page de connexion.
  const [logoutOpen, setLogoutOpen] = useState(false);
  const onLogout = () => { setMobileNav(false); setLogoutOpen(true); };
  const confirmLogout = async ({ everywhere }) => {
    showFarewell({ name: '' });
    const { error } = await logout({ everywhere });
    markLoggedOut({ everywhere, partial: Boolean(error && everywhere) });
  };

  const onLogoutClick = () => { setMenuOpen(false); onLogout(); };

  // Menu complet : téléphone (tiroir), tablette (par-dessus la page), grand écran
  const sidebar = (prefix) => (
    <div className="relative isolate flex h-full flex-col overflow-hidden bg-[#0b0a26] text-white/65">
      <SidebarGlow />
      <div className="relative flex items-center justify-between px-5 pt-6">
        <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-lg" />
        {prefix === 'mobile' && <button onClick={() => setMobileNav(false)} className="rounded-xl p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>}
        {prefix === 'overlay' && <button onClick={() => setMenuOpen(false)} className="rounded-xl p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>}
      </div>
      <div className="relative mx-4 mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f6c768]/[0.16] via-[#f6c768]/[0.05] to-transparent p-4 ring-1 ring-[#f6c768]/25">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f9d784] to-[#ef8f5b] text-[#1a1033] shadow-[0_10px_24px_-10px_rgba(243,169,83,0.8)]"><ShieldCheck className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white">Espace administrateur</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="relative mt-5 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 scrollbar-hide">
        {NAV.map(({ id, label, icon: Icon, badge, alert, group }, i) => {
          const active = tab === id;
          return (
            <div key={id}>
              {group !== NAV[i - 1]?.group && <p className={`px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 ${i === 0 ? 'pt-0' : 'pt-4'}`}>{group}</p>}
              <button onClick={() => pick(id)} aria-current={active ? 'page' : undefined} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'}`}>
                {active && <motion.span layoutId={`${prefix}-admin-nav`} className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.1] to-white/[0.02] ring-1 ring-white/10" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#f6c768] shadow-[0_0_14px_rgba(246,199,104,0.9)]" />}
                <Icon className={`relative h-[18px] w-[18px] transition-transform group-hover:scale-110 ${active ? 'text-[#f6c768]' : ''}`} />
                <span className="relative flex-1 text-left">{label}</span>
                {badge > 0 && <span className={`relative rounded-full px-2 py-0.5 text-[11px] font-bold ${alert ? 'bg-[#f6c768] text-[#1a1033]' : 'bg-white/10 text-white'}`}>{badge}</span>}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="relative border-t border-white/[0.06] p-3">
        <LogoutButton onClick={onLogoutClick} detail={user?.email} tone="dark" />
      </div>
    </div>
  );

  // Rail d'icônes (tablette, ou grand écran quand le menu est replié) : icône, nom court, pastille
  const rail = (
    <div className="relative isolate flex h-full flex-col items-center overflow-hidden bg-[#0b0a26] text-white/55">
      <SidebarGlow />
      <button type="button" onClick={() => pick('overview')} className="relative mt-5 rounded-2xl p-1.5 transition hover:bg-white/5" aria-label="SamaBoutik, vue d'ensemble" title="Vue d'ensemble">
        <LogoMark className="h-9 w-9" onDark />
      </button>
      <span className="relative mt-3 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#f9d784] to-[#ef8f5b] text-[#1a1033]" title="Espace administrateur"><ShieldCheck className="h-4 w-4" /></span>
      <nav className="relative mt-3 flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-2 pb-2 scrollbar-hide" aria-label="Navigation de l'administration">
        {NAV.map(({ id, label, short, icon: Icon, badge, alert, group }, i) => {
          const active = tab === id;
          return (
            <React.Fragment key={id}>
              {i > 0 && group !== NAV[i - 1].group && <span className="my-1.5 h-px w-8 shrink-0 bg-white/10" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => pick(id)}
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex w-full shrink-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-bold transition-colors ${active ? 'text-white' : 'hover:bg-white/[0.05] hover:text-white'}`}
              >
                {active && <motion.span layoutId="rail-admin-nav" className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-white/10" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition ${active ? 'bg-gradient-to-br from-[#f9d784] to-[#ef8f5b] text-[#1a1033] shadow-[0_10px_22px_-10px_rgba(243,169,83,0.9)]' : ''}`}>
                  <Icon className="h-[18px] w-[18px]" />
                  {badge > 0 && (
                    <span className={`absolute -right-2 -top-1.5 min-w-[18px] rounded-full px-1 text-center text-[9.5px] font-extrabold leading-[16px] ring-2 ring-[#0b0a26] ${alert ? 'bg-[#f6c768] text-[#1a1033]' : 'bg-[#6a58e8] text-white'}`}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="relative max-w-full truncate leading-none">{short}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <button type="button" onClick={onLogoutClick} title="Se déconnecter" aria-label="Se déconnecter" className="relative mb-4 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/50 ring-1 ring-white/10 transition hover:bg-red-500/15 hover:text-red-300">
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );

  const pushFull = wide && menuOpen; // grand écran, menu complet : la page se décale

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#f7f6f2] font-sans text-slate-900">
      {/* Tablette et ordinateur : rail d'icônes ou menu complet */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-out md:block ${pushFull ? 'w-[272px]' : 'w-[88px]'}`}>
        {pushFull ? sidebar('desktop') : rail}
      </aside>
      <AnimatePresence>
        {menuOpen && !wide && (
          <>
            <motion.div key="admin-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 hidden bg-[#0c0a24]/45 backdrop-blur-[3px] md:block" aria-hidden="true" />
            <motion.aside key="admin-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-y-0 left-0 z-50 hidden w-[288px] shadow-2xl md:block">
              {sidebar('overlay')}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {logoutOpen && (
          <LogoutDialog
            key="logout"
            name="Administration"
            detail={user?.email}
            consequence="Pour revenir, il faudra votre mot de passe et le code à 6 chiffres de votre application."
            allowEverywhere
            onCancel={() => setLogoutOpen(false)}
            onConfirm={confirmLogout}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} className="fixed inset-0 z-[1001] bg-slate-950/50 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} className="fixed inset-y-0 left-0 z-[1002] w-[284px] md:hidden">{sidebar('mobile')}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`transition-[padding] duration-300 ease-out ${pushFull ? 'md:pl-[272px]' : 'md:pl-[88px]'}`}>
        <header className="sticky top-0 z-20 border-b border-[#e8e5dc]/80 bg-[#f7f6f2]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-2.5 px-4 py-3 md:gap-3 md:px-6 lg:px-8">
            <button onClick={() => setMobileNav(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e8e5dc] bg-white text-slate-600 md:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
            <button
              type="button"
              onClick={toggleMenu}
              className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors md:flex ${menuOpen ? 'border-[#e8e5dc] bg-white text-stone-500 hover:text-ink' : 'border-[#d9d4fb] bg-[#6a58e8]/[0.08] text-[#3b2fc9] hover:bg-[#6a58e8]/15'}`}
              aria-label={menuOpen ? 'Replier le menu' : 'Afficher le menu'}
              aria-expanded={menuOpen}
              title={menuOpen ? 'Replier le menu' : 'Afficher le menu complet'}
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Administration · {current?.group}</p>
              <h1 className="truncate text-lg font-extrabold tracking-[-0.01em] text-ink">{current?.label}</h1>
            </div>
            {scopeMerchant && (
              <button onClick={() => setScope('all')} className="hidden max-w-[220px] items-center gap-2 rounded-full bg-[#0c0a24] py-1.5 pl-1.5 pr-3 text-xs font-bold text-white lg:inline-flex" title="Revenir à toute la plateforme">
                <ShopAvatar merchant={scopeMerchant} size="h-7 w-7 text-[11px]" />
                <span className="truncate">{scopeMerchant.shop_name}</span>
                <X className="h-3.5 w-3.5 shrink-0 text-white/60" />
              </button>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={fetchAdminData} className="flex h-10 items-center gap-2 rounded-full border border-[#e8e5dc] bg-white px-3 text-sm font-semibold text-slate-600 hover:text-ink" aria-label="Actualiser" title="Actualiser">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> <span className="hidden xl:inline">Actualiser</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={exportCsv} disabled={!merchants.length || tab === 'system'} className="flex h-10 items-center gap-2 rounded-full bg-[#0c0a24] px-3.5 text-sm font-bold text-white shadow-[0_12px_26px_-14px_rgba(12,10,36,0.8)] transition hover:bg-[#1b1745] disabled:opacity-40" aria-label="Exporter (CSV)" title="Exporter l'onglet ouvert (CSV)">
              <Download className="h-4 w-4 text-[#f6c768]" /> <span className="hidden sm:inline">Exporter</span>
            </motion.button>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 md:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1400px]">
            {loadError && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {loadError}
              </div>
            )}

            {!loading && (
              <div className="mb-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <label htmlFor="admin-scope" className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Afficher</label>
                <div className="relative sm:w-80">
                  <Store className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${scopeMerchant ? 'text-[#f6c768]' : 'text-slate-400'}`} />
                  <select
                    id="admin-scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className={`w-full cursor-pointer appearance-none truncate rounded-full py-2.5 pl-10 pr-9 text-base font-semibold outline-none transition focus:ring-4 focus:ring-[#6a58e8]/15 md:text-sm ${scopeMerchant ? 'bg-[#0c0a24] text-white ring-1 ring-[#f6c768]/40 [color-scheme:dark]' : 'bg-white text-slate-700 ring-1 ring-[#e8e5dc]'}`}
                  >
                    <option value="all">Toute la plateforme ({merchants.length} boutiques)</option>
                    {shopOptions.map((m) => <option key={m.id} value={m.id}>{m.shop_name || 'Sans nom'}</option>)}
                  </select>
                  <ChevronRight className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 ${scopeMerchant ? 'text-white/60' : 'text-slate-400'}`} />
                </div>
                {scopeMerchant && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                    <span>Uniquement les données de <strong className="text-ink">{scopeMerchant.shop_name}</strong>.</span>
                    <button onClick={() => setScope('all')} className="font-bold text-[#3b2fc9] underline underline-offset-2">Revenir à toute la plateforme</button>
                  </p>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-brand-600/20 border-t-brand-600" /></div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial="initial" animate="animate" exit={{ opacity: 0, y: -10 }} variants={{ animate: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">

                  {tab === 'overview' && (
                    <>
                      {scopeMerchant && (
                        <motion.section variants={rise} className="relative isolate overflow-hidden rounded-[2rem] bg-[#0c0a24] p-6 text-white shadow-[0_30px_70px_-40px_rgba(12,10,36,0.9)] md:p-8">
                          <NightFx />
                          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-center gap-4">
                              <ShopAvatar merchant={scopeMerchant} size="h-16 w-16 text-2xl" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f9d784]/80">Boutique sélectionnée</p>
                                <h2 className="truncate text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">{scopeMerchant.shop_name}</h2>
                                <div className="mt-2 flex flex-wrap gap-2"><PlanBadge plan={planOf(scopeMerchant)} /><StatusBadge merchant={scopeMerchant} /></div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => setDetailsId(scopeMerchant.id)} className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold"><Eye className="h-4 w-4" /> Fiche complète</button>
                              <a href={shopUrl(scopeMerchant)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"><Globe className="h-4 w-4" /> Vitrine</a>
                              <button onClick={() => setScope('all')} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"><LayoutDashboard className="h-4 w-4" /> Toute la plateforme</button>
                            </div>
                          </div>
                          <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                              { l: 'Produits', v: fmt(Number(scopeMerchant.products_count)) },
                              { l: 'Commandes', v: fmt(Number(scopeMerchant.orders_count)) },
                              { l: 'Livrées', v: fmt(Number(scopeMerchant.delivered_count)) },
                              { l: "Chiffre d'affaires livré", v: `${compact(Number(scopeMerchant.revenue_fcfa))} F` },
                            ].map((x) => (
                              <div key={x.l} className="min-w-0 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur"><p className="font-editorial truncate text-[1.7rem] leading-none">{x.v}</p><p className="mt-1.5 truncate text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">{x.l}</p></div>
                            ))}
                          </div>
                        </motion.section>
                      )}
                      {!scopeMerchant && (
                      <motion.section variants={rise} className="relative isolate overflow-hidden rounded-[2rem] bg-[#0c0a24] p-6 text-white shadow-[0_30px_70px_-40px_rgba(12,10,36,0.9)] md:p-8 lg:p-9">
                        <NightFx />
                        <div className="hero-halo pointer-events-none absolute right-[-6%] top-[-30%] -z-10 hidden h-[340px] w-[340px] rounded-full bg-[conic-gradient(from_90deg,#6a58e8,#f6c768,#ef8f5b,#8a7cf1,#6a58e8)] opacity-25 blur-[80px] md:block" aria-hidden="true" />
                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                          <div className="min-w-0">
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-semibold capitalize text-white/75 ring-1 ring-white/10">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.7)]" />
                              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <h2 className="text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.035em] md:text-[2.75rem]">
                              Plateforme <span className="font-editorial text-sunrise pr-1">SamaBoutik</span>
                            </h2>
                            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65">
                              <strong className="text-white">{merchants.length} boutique{merchants.length > 1 ? 's' : ''}</strong> inscrite{merchants.length > 1 ? 's' : ''}, dont <strong className="text-white">{a.located.length}</strong> localisée{a.located.length > 1 ? 's' : ''} et <strong className="text-white">{a.paid.length}</strong> sur un forfait payant.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            <button onClick={() => setTab('map')} className="btn-gold inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-extrabold"><MapIcon className="h-4 w-4" /> Voir la carte</button>
                            <button onClick={() => setTab('merchants')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.07] px-5 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/[0.12]"><Store className="h-4 w-4" /> Tous les marchands</button>
                          </div>
                        </div>
                        <dl className="relative mt-7 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                          {[
                            { l: 'Boutiques', s: 'Boutiques', v: fmt(merchants.length), icon: Store },
                            { l: 'Localisées', s: 'Localisées', v: fmt(a.located.length), icon: MapPin },
                            { l: 'Forfaits payants', s: 'Abonnées', v: fmt(a.paid.length), icon: Crown },
                            { l: 'Revenu mensuel', s: 'Revenu/mois', v: `${compact(a.mrr)} F`, icon: Banknote },
                          ].map((x) => (
                            <div key={x.l} className="min-w-0 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur">
                              <dt className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/50" title={x.l}>
                                <x.icon className="h-3.5 w-3.5 shrink-0 text-[#f6c768]" />
                                <span className="truncate xl:hidden">{x.s}</span>
                                <span className="hidden truncate xl:inline">{x.l}</span>
                              </dt>
                              <dd className="font-editorial mt-1.5 truncate text-[1.75rem] leading-none">{x.v}</dd>
                            </div>
                          ))}
                        </dl>
                      </motion.section>
                      )}

                      <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
                        <div className="relative flex rounded-full border border-[#e8e5dc] bg-white p-1 shadow-sm" role="group" aria-label="Période">
                          {PERIODS.map((p) => (
                            <button key={p.id} onClick={() => setPeriod(p.id)} aria-pressed={period === p.id} className={`relative min-h-9 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${period === p.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                              {period === p.id && <motion.span layoutId="admin-period" className="absolute inset-0 rounded-full bg-[#0c0a24]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                              <span className="relative">{p.label}</span>
                            </button>
                          ))}
                        </div>
                        <span className="text-sm text-slate-500">Les indicateurs d'activité portent sur les {period} derniers jours</span>
                      </motion.div>

                      {!scopeMerchant && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Kpi label="Chiffre d'affaires livré" value={compact(a.revenue)} unit="FCFA" icon={Wallet} gradient="emerald" deltaValue={a.revenueDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.revenue)} accent={BRAND.signature} />
                        <Kpi label="Commandes" value={fmt(a.orders)} icon={ShoppingBag} gradient="sky" deltaValue={a.ordersDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.orders)} accent="#2a78d6" />
                        <Kpi label="Nouvelles boutiques" value={fmt(a.newMerchants)} icon={Store} gradient="violet" deltaValue={a.newMerchantsDelta} deltaLabel={`vs ${period} j préc.`} spark={a.buckets.slice(-12).map((b) => b.newMerchants)} accent="#4a3aa7" />
                        <Kpi label="Revenu mensuel (abonnements)" value={fmt(a.mrr)} unit="FCFA" icon={Crown} gradient="amber" hint={`${a.paid.length} forfait${a.paid.length > 1 ? 's' : ''} payant${a.paid.length > 1 ? 's' : ''} actif${a.paid.length > 1 ? 's' : ''} · ${a.suspended} suspendue${a.suspended > 1 ? 's' : ''}`} />
                      </div>
                      )}

                      {missing.length > 0 && <SetupNotice what="Commandes, clients, produits, livreurs, avis et système" />}

                      {!missing.includes('orders') && (
                        <>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Kpi label="Clients" value={fmt(ov.cs.total)} icon={UserRound} gradient="sky" hint={`${ov.cs.repeat} fidèle${ov.cs.repeat > 1 ? 's' : ''} · ${ov.cs.newLast30} nouveau${ov.cs.newLast30 > 1 ? 'x' : ''} en 30 j`} />
                            <Kpi label="Panier moyen" value={fmt(ov.os.avgBasket)} unit="FCFA" icon={Receipt} gradient="violet" hint={`sur ${ov.os.delivered} commande${ov.os.delivered > 1 ? 's' : ''} livrée${ov.os.delivered > 1 ? 's' : ''} (${period} j)`} />
                            <Kpi label="Taux de livraison" value={ov.os.deliveryRate == null ? '—' : `${Math.round(ov.os.deliveryRate * 100)} %`} icon={Truck} gradient="emerald" hint={`livrées sur (livrées + annulées) · ${Math.round(ov.os.onlineShare * 100)} % payées en ligne`} />
                            <Kpi label="Abonnements encaissés" value={compact(ov.pay.last30)} unit="FCFA" icon={Banknote} gradient="amber" hint={`30 derniers jours · ${compact(ov.pay.total)} F depuis le début`} />
                          </div>

                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                            <motion.div variants={rise}>
                              <ChartCard className="h-full" title="Commandes par statut" subtitle={`${period} derniers jours · ${ov.os.count} commande${ov.os.count > 1 ? 's' : ''}`} table={{ columns: [{ key: 'label', label: 'Statut' }, { key: 'value', label: 'Commandes', align: 'right' }], rows: ov.statusBars }}>
                                <BarList items={ov.statusBars} color="#2a78d6" formatValue={(v) => `${v}`} detail={(b) => `${Math.round((b.value / Math.max(1, ov.os.count)) * 100)} % des commandes`} emptyText="Aucune commande sur la période." animationKey={`status-${period}`} />
                              </ChartCard>
                            </motion.div>
                            <motion.div variants={rise}>
                              <ChartCard className="h-full" title="Moyens de paiement" subtitle={`${period} derniers jours`} table={{ columns: [{ key: 'label', label: 'Paiement' }, { key: 'value', label: 'Commandes', align: 'right' }], rows: ov.paySegments }}>
                                {ov.paySegments.length ? <DonutChart segments={ov.paySegments} centerLabel="Commandes" animationKey={`pay-${period}`} /> : <p className="py-10 text-center text-sm text-slate-500">Aucune commande sur la période.</p>}
                              </ChartCard>
                            </motion.div>
                            <motion.section variants={rise} className={`${CARD} h-full p-5 md:col-span-2 md:p-6 xl:col-span-1`}>
                              <h3 className="text-base font-bold">À surveiller</h3>
                              <p className="mb-3 text-sm text-slate-500">Ce qui demande votre attention</p>
                              {(() => {
                                const watch = [
                                  { n: ov.late.length, label: 'commande(s) à traiter depuis plus de 24 h', tab: 'orders', icon: Clock, tone: 'bg-amber-50 text-amber-700' },
                                  { n: (scopeMerchant ? a.expiringSoon.filter((m) => m.id === scopeMerchant.id) : a.expiringSoon).length, label: 'abonnement(s) expirent dans les 7 jours', tab: 'billing', icon: Crown, tone: 'bg-amber-50 text-amber-700' },
                                  { n: ov.waFailed, label: 'message(s) WhatsApp en échec (30 j)', tab: 'system', icon: MessageCircle, tone: 'bg-red-50 text-red-700' },
                                  { n: ov.negative.length, label: 'avis négatif(s) ces 30 derniers jours', tab: 'reviews', icon: Star, tone: 'bg-red-50 text-red-700' },
                                  { n: ov.outOfStock, label: 'produit(s) en rupture de stock', tab: 'products', icon: PackageX, tone: 'bg-slate-100 text-slate-700' },
                                  { n: scopeMerchant ? (scopeMerchant.latitude == null ? 1 : 0) : merchants.length - a.located.length, label: 'boutique(s) non localisée(s)', tab: 'merchants', icon: MapPin, tone: 'bg-slate-100 text-slate-700' },
                                ].filter((w) => w.n > 0);
                                return watch.length === 0 ? (
                                  <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Tout est en ordre. 👍</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {watch.map((w) => (
                                      <li key={w.label}>
                                        <button onClick={() => setTab(w.tab)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50">
                                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${w.tone}`}><w.icon className="h-4 w-4" /></span>
                                          <span className="min-w-0 flex-1 text-sm"><strong className="font-figures">{w.n}</strong> {w.label}</span>
                                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </motion.section>
                          </div>
                        </>
                      )}

                      {!scopeMerchant && (
                      <>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:gap-6">
                        <motion.div variants={rise} className="lg:col-span-2">
                          <ChartCard
                            className="h-full"
                            title="Chiffre d'affaires livré sur la plateforme"
                            subtitle={period > 31 ? 'Par semaine, toutes boutiques confondues' : 'Par jour, toutes boutiques confondues'}
                            table={{ columns: [{ key: 'longLabel', label: 'Période' }, { key: 'revenue', label: 'CA livré', align: 'right', format: (v) => `${fmt(v)} F` }, { key: 'orders', label: 'Commandes', align: 'right' }, { key: 'newMerchants', label: 'Nouvelles boutiques', align: 'right' }], rows: a.buckets }}
                          >
                            <AreaChart data={a.buckets} valueKey="revenue" color={BRAND.signature} seriesLabel="CA livré" formatValue={(v) => `${fmt(v)} FCFA`} extraRows={(d) => [{ label: 'commande(s)', value: d.orders, color: '#cbd5e1' }]} height={340} animationKey={period} />
                          </ChartCard>
                        </motion.div>
                        <motion.div variants={rise}>
                          <ChartCard className="h-full" title="Répartition des forfaits" subtitle={`${merchants.length} boutiques`} table={{ columns: [{ key: 'label', label: 'Forfait' }, { key: 'value', label: 'Boutiques', align: 'right' }], rows: a.planBreakdown }}>
                            <DonutChart segments={a.planBreakdown} centerLabel="Boutiques" animationKey="plans" />
                          </ChartCard>
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
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
                        <motion.div variants={rise} className="md:col-span-2 xl:col-span-1">
                          <ChartCard className="h-full" title="Meilleures boutiques" subtitle="Chiffre d'affaires livré (depuis l'inscription)" table={{ columns: [{ key: 'label', label: 'Boutique' }, { key: 'orders', label: 'Livrées', align: 'right' }, { key: 'value', label: 'CA', align: 'right', format: (v) => `${fmt(v)} F` }], rows: a.top }}>
                            <BarList items={a.top} color={BRAND.signature} formatValue={(v) => `${compact(v)} F`} detail={(t) => `${t.orders} livraison${t.orders > 1 ? 's' : ''}`} emptyText="Aucune vente livrée pour le moment." animationKey="top" />
                          </ChartCard>
                        </motion.div>
                      </div>

                      <motion.section variants={rise} className={`${CARD} p-5 md:p-6`}>
                        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold">Carte des boutiques</h3>
                            <p className="text-sm text-slate-500">{a.located.length} boutique{a.located.length > 1 ? 's' : ''} localisée{a.located.length > 1 ? 's' : ''} sur {merchants.length}</p>
                          </div>
                          <button onClick={() => setTab('map')} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800">Plein écran <ChevronRight className="h-4 w-4" /></button>
                        </header>
                        <ShopsMap merchants={merchants} height={360} onOpenDetails={(m) => setDetailsId(m.id)} />
                      </motion.section>
                      </>
                      )}
                    </>
                  )}

                  {tab === 'map' && (
                    <motion.div variants={rise} className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr]">
                      <div className={`${CARD} flex max-h-[38vh] flex-col overflow-hidden lg:max-h-[72vh]`}>
                        <div className="border-b border-slate-100 p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <MagicIcon icon={MapPin} gradient="rose" size="sm" />
                            <div>
                              <p className="font-bold">{a.located.length} boutiques localisées</p>
                              <p className="text-xs text-slate-500">{merchants.length - a.located.length} restent à localiser</p>
                            </div>
                          </div>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={mapSearch} onChange={(e) => setMapSearch(e.target.value)} placeholder="Boutique, ville, téléphone…" aria-label="Rechercher une boutique sur la carte" className="w-full rounded-xl border border-[#e8e5dc] bg-[#f7f6f2] py-2.5 pl-9 pr-3 text-base outline-none transition focus:border-[#8a7cf1] focus:bg-white focus:ring-4 focus:ring-[#6a58e8]/10 md:text-sm" />
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                          {mapList.map((m) => (
                            <button key={m.id} onClick={() => setMapSelectedId(m.id)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${mapSelectedId === m.id ? 'bg-[#6a58e8]/[0.07] ring-1 ring-[#8a7cf1]/40' : 'hover:bg-slate-50'}`}>
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
                      <ShopsMap merchants={merchants} selectedId={mapSelectedId} onSelect={(m) => setMapSelectedId(m.id)} onOpenDetails={(m) => setDetailsId(m.id)} height="min(72vh, 760px)" />
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

                      <motion.div variants={rise} className={`${CARD} flex flex-col gap-3 p-3.5 sm:p-4 xl:flex-row xl:items-center`}>
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone, email, adresse, ville…" aria-label="Rechercher une boutique" className="w-full rounded-xl border border-[#e8e5dc] bg-[#f7f6f2] py-3 pl-12 pr-4 text-base font-medium outline-none transition focus:border-[#8a7cf1] focus:bg-white focus:ring-4 focus:ring-[#6a58e8]/10 md:text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                          {[
                            [planFilter, setPlanFilter, [['all', 'Tous les forfaits'], ['debutant', 'Débutant'], ['pro', 'Pro'], ['premium', 'Premium']]],
                            [statusFilter, setStatusFilter, [['all', 'Tous les statuts'], ['active', 'Actives'], ['expired', 'Expirées'], ['suspended', 'Suspendues']]],
                            [locFilter, setLocFilter, [['all', 'Toutes positions'], ['located', 'Localisées'], ['missing', 'Non localisées']]],
                            [sortBy, setSortBy, [['recent', 'Plus récentes'], ['revenue', 'Meilleur CA'], ['orders', 'Plus de commandes'], ['name', 'Nom (A→Z)']]],
                          ].map(([value, setter, options], i) => (
                            <select key={i} value={value} onChange={(e) => setter(e.target.value)} aria-label={['Forfait', 'Statut', 'Position', 'Trier'][i]} className="min-w-0 cursor-pointer truncate rounded-xl border border-[#e8e5dc] bg-white px-3 py-3 text-base font-semibold text-slate-700 outline-none transition focus:border-[#8a7cf1] focus:ring-4 focus:ring-[#6a58e8]/10 md:text-sm">
                              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          ))}
                        </div>
                      </motion.div>

                      <DataTable
                        rows={filtered}
                        rowKey={(m) => m.id}
                        onRowClick={(m) => setDetailsId(m.id)}
                        empty="Aucune boutique ne correspond à ces filtres."
                        minWidth={980}
                        columns={[
                          { key: 'shop', label: 'Boutique', render: (m) => (
                            <div className="flex items-center gap-3">
                              <ShopAvatar merchant={m} />
                              <div className="min-w-0"><p className="truncate font-bold">{m.shop_name || 'Sans nom'}</p><p className="text-xs text-slate-400">Inscrite {relDays(m.created_at)}</p></div>
                            </div>
                          ) },
                          { key: 'contact', label: 'Contact', render: (m) => <><p className="font-semibold text-slate-800">{m.phone_number || '—'}</p><p className="max-w-[220px] truncate text-xs text-slate-500">{m.account_email}</p></> },
                          { key: 'loc', label: 'Localisation', render: (m) => (
                            <>
                              {m.latitude != null
                                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><MapPin className="h-3.5 w-3.5" /> {m.city}</span>
                                : <span className="text-xs text-slate-400">Non localisée</span>}
                              {m.address && <p className="mt-1 max-w-[200px] truncate text-xs text-slate-500">{m.address}</p>}
                            </>
                          ) },
                          { key: 'plan', label: 'Forfait', render: (m) => <PlanBadge plan={planOf(m)} /> },
                          { key: 'activity', label: 'Activité', align: 'right', render: (m) => <><p className="font-bold">{fmt(Number(m.revenue_fcfa))} F</p><p className="text-xs text-slate-500">{m.orders_count} cmd · {m.products_count} produits</p></> },
                          { key: 'status', label: 'Statut', render: (m) => <StatusBadge merchant={m} /> },
                        ]}
                        mobileRow={(m) => (
                          <div className="flex items-center gap-3">
                            <ShopAvatar merchant={m} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">{m.shop_name || 'Sans nom'}</p>
                              <p className="truncate text-xs text-slate-500">{m.phone_number || m.account_email} · {m.city || 'non localisée'}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><PlanBadge plan={planOf(m)} /><StatusBadge merchant={m} /></div>
                            </div>
                            <div className="shrink-0 text-right"><p className="font-figures font-bold">{compact(Number(m.revenue_fcfa))} F</p><p className="text-[11px] text-slate-500">{m.orders_count} cmd</p></div>
                          </div>
                        )}
                      />
                    </>
                  )}

                  {tab === 'billing' && (
                    <>
                      {scopeMerchant && (
                        <motion.section variants={rise} className={`${CARD} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                          <div className="flex items-center gap-3">
                            <ShopAvatar merchant={scopeMerchant} />
                            <div>
                              <p className="font-bold">{scopeMerchant.shop_name}</p>
                              <p className="text-sm text-slate-500">
                                {PLAN_META[planOf(scopeMerchant)].label} · {fmt(PLAN_PRICES[planOf(scopeMerchant)])} FCFA / mois
                                {scopeMerchant.subscription_end_date ? ` · jusqu'au ${dateFr(scopeMerchant.subscription_end_date)}` : ''}
                              </p>
                              <p className="text-xs text-slate-400">Payé par cette boutique : {fmt(paymentsSummary(scoped.payments, loadedAt).total)} FCFA</p>
                            </div>
                          </div>
                          <button onClick={() => setSubscriptionFor(scopeMerchant)} className="btn-gold inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold"><Crown className="h-4 w-4" /> Changer l'offre</button>
                        </motion.section>
                      )}
                      {!scopeMerchant && (
                      <>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        {Object.entries(PLAN_META).map(([id, meta]) => {
                          const count = merchants.filter((m) => planOf(m) === id).length;
                          const active = merchants.filter((m) => planOf(m) === id && isPaidActive(m)).length;
                          return (
                            <motion.div key={id} variants={rise} className={`${CARD} relative overflow-hidden p-6`}>
                              <div className="relative mb-4 flex items-start justify-between gap-2">
                                <MagicIcon icon={id === 'premium' ? Sparkles : id === 'pro' ? TrendingUp : Store} gradient={id === 'premium' ? 'amber' : id === 'pro' ? 'violet' : 'sky'} />
                                <span className="pt-1 text-right text-xs font-semibold leading-tight text-slate-500 lg:text-sm">{fmt(PLAN_PRICES[id])} FCFA<br className="lg:hidden" /><span className="hidden lg:inline"> </span>/ mois</span>
                              </div>
                              <p className="relative flex items-center gap-2 text-lg font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />{meta.label}</p>
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

                      {missing.includes('payments') ? <SetupNotice what="Paiements d'abonnement" /> : (
                        <>
                          {!scopeMerchant && (
                          <StatGrid>
                            <StatTile label="Revenu mensuel récurrent" value={`${fmt(a.mrr)} F`} sub={`${a.paid.length} forfait${a.paid.length > 1 ? 's' : ''} payant${a.paid.length > 1 ? 's' : ''} actif${a.paid.length > 1 ? 's' : ''}`} icon={Crown} gradient="amber" />
                            <StatTile label="Encaissé (30 jours)" value={`${fmt(ov.pay.last30)} F`} sub="paiements PayDunya confirmés" icon={Banknote} gradient="emerald" />
                            <StatTile label="Encaissé au total" value={`${compact(ov.pay.total)} F`} sub={`${ov.pay.count} paiement${ov.pay.count > 1 ? 's' : ''}`} icon={Wallet} gradient="sky" />
                            <StatTile label="À renouveler" value={fmt(a.expired.length + a.expiringSoon.length)} sub={`${a.expiringSoon.length} cette semaine · ${a.expired.length} expiré${a.expired.length > 1 ? 's' : ''}`} icon={Clock} gradient="rose" />
                          </StatGrid>
                          )}
                          <motion.p variants={rise} className="flex items-center gap-2 text-sm text-slate-500">
                            <Crown className="h-4 w-4 text-amber-600" /> Pour offrir ou modifier une offre : ouvrez une boutique, puis « Changer l'offre ». Chaque changement est noté dans le journal.
                          </motion.p>
                          <DataTable
                            rows={scoped.payments}
                            rowKey={(x) => x.invoice_token}
                            onRowClick={(x) => x.merchant_id && openMerchant(x.merchant_id)}
                            empty="Aucun paiement d'abonnement reçu pour le moment."
                            minWidth={720}
                            columns={[
                              { key: 'date', label: 'Date', render: (x) => <span className="text-sm">{dateFr(x.created_at)}</span> },
                              { key: 'shop', label: 'Boutique', render: (x) => <span className="font-semibold">{x.shop_name || '—'}</span> },
                              { key: 'plan', label: 'Forfait', render: (x) => <PlanBadge plan={x.plan} /> },
                              { key: 'amount', label: 'Montant', align: 'right', render: (x) => <span className="font-bold">{fmt(x.amount_fcfa)} F</span> },
                              { key: 'ref', label: 'Référence PayDunya', render: (x) => <span className="font-mono text-xs text-slate-500">{x.invoice_token}</span> },
                            ]}
                            mobileRow={(x) => (
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0"><p className="truncate font-bold">{x.shop_name || '—'}</p><p className="text-xs text-slate-500">{dateFr(x.created_at)}</p></div>
                                <div className="flex shrink-0 flex-col items-end gap-1"><span className="font-figures font-bold">{fmt(x.amount_fcfa)} F</span><PlanBadge plan={x.plan} /></div>
                              </div>
                            )}
                          />
                        </>
                      )}
                    </>
                  )}

                  {tab === 'orders' && (missing.includes('orders') ? <SetupNotice what="Commandes" /> : <OrdersSection orders={scoped.orders} merchants={scopeMerchant ? [scopeMerchant] : merchants} onOpenOrder={openOrder} />)}
                  {tab === 'customers' && (missing.includes('customers') ? <SetupNotice what="Clients" /> : <CustomersSection customers={scoped.customers} onOpenCustomer={openCustomer} />)}
                  {tab === 'products' && (missing.includes('products') ? <SetupNotice what="Produits" /> : <ProductsSection products={scoped.products} onOpenMerchant={openMerchant} />)}
                  {tab === 'drivers' && (missing.includes('drivers') ? <SetupNotice what="Livreurs" /> : <DriversSection drivers={scoped.drivers} onOpenMerchant={openMerchant} />)}
                  {tab === 'reviews' && (missing.includes('reviews') ? <SetupNotice what="Avis clients" /> : <ReviewsSection reviews={scoped.reviews} onDelete={deleteReview} onOpenMerchant={openMerchant} />)}
                  {tab === 'system' && (missing.includes('health') ? <SetupNotice what="Système et journal" /> : <SystemSection health={extra.health} merchants={merchants} />)}
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
        onChangePlan={(m) => setSubscriptionFor(m)}
        onFocusShop={(m) => { setScope(m.id); setDetailsId(null); setTab('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        recentOrders={detailsMerchant ? extra.orders.filter((o) => o.merchant_id === detailsMerchant.id) : []}
        onOpenOrder={openOrder}
      />
      <OrderDrawer
        order={extra.orders.find((o) => o.id === orderId) || null}
        onClose={() => setOrderId(null)}
        onOpenMerchant={openMerchant}
        onOpenCustomer={openCustomer}
      />
      <CustomerDrawer
        customer={scoped.customers.find((c) => c.customer_key === customerKey) || null}
        orders={scoped.orders}
        onClose={() => setCustomerKey(null)}
        onOpenOrder={openOrder}
      />
      {subscriptionFor && (
        <SubscriptionDialog
          key={subscriptionFor.id}
          merchant={merchants.find((m) => m.id === subscriptionFor.id) || subscriptionFor}
          onClose={() => setSubscriptionFor(null)}
          onSave={saveSubscription}
        />
      )}
    </div>
    </MotionConfig>
  );
}
