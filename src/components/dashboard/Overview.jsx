import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, Minus, QrCode, Truck, Store, ShoppingBag,
  AlertCircle, Users, Wallet, Package, CalendarDays,
} from 'lucide-react';
import { ChartCard, AreaChart, ColumnChart, DonutChart, BarList, Sparkline } from './Charts';
import { computeAnalytics, PERIODS, CHART_COLORS, statusGroupOf, fmt } from './analytics';

const EASE = [0.16, 1, 0.3, 1];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

/* ------------------------------------------------------------------ */

function DeltaBadge({ value, periodLabel, points = false, dark = false }) {
  if (value === null || value === undefined) {
    return <span className={`text-xs ${dark ? 'text-emerald-100/60' : 'text-slate-400'}`}>Pas de comparaison</span>;
  }
  const up = value > 0.0005;
  const down = value < -0.0005;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  const text = points
    ? `${value > 0 ? '+' : ''}${Math.round(value * 100)} pt`
    : `${value > 0 ? '+' : ''}${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
  const tone = dark
    ? (up ? 'bg-emerald-300/15 text-emerald-200' : down ? 'bg-red-300/15 text-red-200' : 'bg-white/10 text-white/70')
    : (up ? 'bg-emerald-50 text-emerald-700' : down ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600');
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} /> {text}
      </span>
      <span className={`text-xs ${dark ? 'text-emerald-100/60' : 'text-slate-400'}`}>vs {periodLabel} préc.</span>
    </span>
  );
}

function StatTile({ label, value, unit, deltaValue, periodLabel, points, spark, accent, icon: Icon, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <motion.div variants={item} className="h-full">
      <Tag
        onClick={onClick}
        className="group flex h-full w-full flex-col rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(15,23,42,0.2)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
          {unit && <span className="ml-1 text-base font-semibold text-slate-400">{unit}</span>}
        </p>
        <div className="mt-2 min-h-[22px]">
          <DeltaBadge value={deltaValue} periodLabel={periodLabel} points={points} />
        </div>
        <div className="mt-auto pt-3">
          <Sparkline values={spark} accent={accent} />
        </div>
      </Tag>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

export default function Overview({
  merchant, orders, products, driverBalances, today, shopUrl,
  onNavigate, onOpenQR, onCopyDriverLink, onSelectDriver,
}) {
  const [period, setPeriod] = useState(30);
  const a = useMemo(() => computeAnalytics(orders, products, period), [orders, products, period]);
  const periodLabel = `${period} j`;
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const rangeText = `du ${new Date(a.range.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(a.range.end - 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

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
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* Bandeau d'accueil */}
      <motion.section variants={item} className="relative overflow-hidden rounded-[2rem] bg-[#06150f] p-6 text-white md:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora-blob aurora-1 -left-24 -top-32 h-96 w-96 bg-emerald-500/30" />
          <div className="aurora-blob aurora-2 -right-20 top-0 h-80 w-80 bg-cyan-400/20" />
          <div className="aurora-blob aurora-3 bottom-[-8rem] left-1/3 h-72 w-72 bg-amber-300/10" />
          <div className="bg-grid-pattern absolute inset-0" />
        </div>
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium capitalize text-emerald-200/80">
              <CalendarDays className="h-4 w-4" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {greeting}, <span className="text-shimmer">{merchant?.shop_name || 'Marchand'}</span>
            </h1>
            <p className="mt-3 max-w-xl text-emerald-50/80">
              {pending > 0
                ? <>Vous avez <strong className="text-white">{pending} commande{pending > 1 ? 's' : ''} à traiter</strong>{outOfStock > 0 && <> et <strong className="text-white">{outOfStock} produit{outOfStock > 1 ? 's' : ''} en rupture</strong></>}.</>
                : <>Tout est à jour. Aucune commande en attente{outOfStock > 0 && <>, mais <strong className="text-white">{outOfStock} produit{outOfStock > 1 ? 's' : ''} en rupture</strong></>}.</>}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={shopUrl} target="_blank" rel="noreferrer" className="shine-btn inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#06150f] shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform hover:-translate-y-0.5">
                <Store className="h-4 w-4" /> Ouvrir ma vitrine
              </a>
              {pending > 0 && (
                <button onClick={() => onNavigate('orders')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#06150f] transition-transform hover:-translate-y-0.5">
                  Traiter les commandes <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button onClick={onOpenQR} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                <QrCode className="h-4 w-4" /> QR code
              </button>
              <button onClick={onCopyDriverLink} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/10">
                <Truck className="h-4 w-4" /> Lien livreur
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl sm:min-w-[420px]">
            {[
              { label: 'Encaissé aujourd\'hui', value: today.totalEnbaisse },
              { label: 'Frais livreurs', value: today.partLivreur },
              { label: 'Votre part', value: today.partMarchand },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl px-3 py-3">
                <p className="text-[11px] font-medium text-emerald-100/70">{s.label}</p>
                <p className="mt-1 text-lg font-bold md:text-xl">{fmt(s.value)} <span className="text-xs font-medium text-emerald-100/60">F</span></p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {merchant?.subscription_status === 'expired' && (
        <motion.div variants={item} className="flex items-start gap-4 rounded-3xl border border-red-100 bg-red-50 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600"><AlertCircle className="h-5 w-5" /></span>
          <div className="flex-1">
            <h3 className="font-bold text-red-900">Abonnement expiré</h3>
            <p className="mt-0.5 text-sm text-red-700">Votre boutique est actuellement fermée au public. Renouvelez votre abonnement pour la rouvrir.</p>
          </div>
          <button onClick={() => onNavigate('billing')} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">Renouveler</button>
        </motion.div>
      )}

      {/* Filtre de période : une seule ligne, au-dessus de tout ce qu'il contrôle */}
      <motion.div variants={item} className="flex flex-wrap items-center gap-3">
        <div className="relative flex rounded-2xl border border-slate-200/70 bg-white p-1 shadow-sm" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${period === p.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {period === p.id && (
                <motion.span layoutId="period-pill" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              <span className="relative">{p.label}</span>
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">{rangeText}</span>
      </motion.div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <motion.div variants={item} className="sm:col-span-2 xl:col-span-2">
          <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-[0_24px_48px_-20px_rgba(5,150,105,0.6)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-50/90">Chiffre d'affaires livré</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Wallet className="h-[18px] w-[18px]" /></span>
            </div>
            <p className="relative text-5xl font-bold tracking-tight">
              {fmt(a.revenue)}<span className="ml-2 text-xl font-semibold text-emerald-100/70">FCFA</span>
            </p>
            <div className="relative mt-3"><DeltaBadge value={a.revenueDelta} periodLabel={periodLabel} dark /></div>
            <div className="relative mt-auto pt-4"><Sparkline values={a.spark.map((s) => s.revenue)} accent="#fde68a" height={44} dark /></div>
          </div>
        </motion.div>
        <StatTile label="Commandes" value={fmt(a.ordersCount)} deltaValue={a.ordersDelta} periodLabel={periodLabel} spark={a.spark.map((s) => s.orders)} accent={CHART_COLORS.orders} icon={ShoppingBag} onClick={() => onNavigate('orders')} />
        <StatTile label="Panier moyen" value={fmt(a.avgBasket)} unit="F" deltaValue={a.avgBasketDelta} periodLabel={periodLabel} spark={a.spark.map((s) => (s.delivered ? s.revenue / s.delivered : 0))} accent={CHART_COLORS.revenue} icon={Package} />
        <StatTile label="Taux de livraison" value={Math.round(a.deliveryRate * 100)} unit="%" deltaValue={a.deliveryRateDelta} points periodLabel={periodLabel} spark={a.spark.map((s) => (s.orders ? s.delivered / s.orders : 0))} accent="#1baf7a" icon={Truck} />
      </div>

      {/* Évolution + statuts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
              height={400}
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.div variants={item}>
          <ChartCard
            title="Commandes reçues"
            subtitle={period > 31 ? 'Par semaine' : 'Par jour'}
            className="h-full"
            table={{ columns: [{ key: 'longLabel', label: 'Période' }, { key: 'orders', label: 'Commandes', align: 'right' }], rows: a.series }}
          >
            <ColumnChart data={a.series} valueKey="orders" color={CHART_COLORS.orders} seriesLabel="commande(s)" formatValue={(v) => fmt(v)} height={300} animationKey={period} />
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.section variants={item} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] md:p-6 xl:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Commandes récentes</h3>
              <p className="mt-0.5 text-sm text-slate-500">Les 6 dernières commandes reçues</p>
            </div>
            <button onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800">
              Tout voir <ArrowRight className="h-4 w-4" />
            </button>
          </header>
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-500">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-2 pb-3 font-semibold">Client</th>
                    <th className="px-2 pb-3 font-semibold">Statut</th>
                    <th className="px-2 pb-3 font-semibold">Date</th>
                    <th className="px-2 pb-3 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => {
                    const g = statusGroupOf(o.status);
                    return (
                      <tr key={o.id} onClick={() => onNavigate('orders')} className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50">
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-800">
                              {(o.customer_name || '?').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{o.customer_name}</p>
                              <p className="truncate text-xs text-slate-500">{o.delivery_zone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <span className="h-2 w-2 rounded-full" style={{ background: g.color }} /> {g.label}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-slate-500">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-2 py-3 text-right font-bold text-slate-900 tabular-nums">{fmt(o.total_amount_fcfa)} F</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <motion.section variants={item} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] md:p-6">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mon équipe</h3>
              <p className="mt-0.5 text-sm text-slate-500">Solde des livreurs aujourd'hui</p>
            </div>
            <button onClick={() => onNavigate('team')} className="text-sm font-bold text-emerald-700 hover:text-emerald-800">Gérer</button>
          </header>
          <div className="flex flex-col gap-1">
            {driverBalances.slice(0, 6).map((d) => (
              <button key={d.id} onClick={() => onSelectDriver(d)} className="flex items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-slate-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-sm font-bold text-orange-700">
                  {d.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{d.full_name}</span>
                  <span className="block text-xs text-slate-500">{d.count} course{d.count > 1 ? 's' : ''} · {d.vehicle_type}</span>
                </span>
                <span className="text-right">
                  <span className={`block text-sm font-bold tabular-nums ${d.aReverser < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                    {d.aReverser < 0 ? '−' : '+'}{fmt(Math.abs(d.aReverser))} F
                  </span>
                  <span className="block text-[11px] text-slate-400">{d.aReverser < 0 ? 'vous lui devez' : 'à vous reverser'}</span>
                </span>
              </button>
            ))}
            {driverBalances.length === 0 && (
              <div className="py-10 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Aucun livreur dans l'équipe.</p>
                <button onClick={() => onNavigate('team')} className="mt-3 text-sm font-bold text-emerald-700">Ajouter un livreur</button>
              </div>
            )}
          </div>
          <a href={shopUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800">
            Voir ma boutique en ligne <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.section>
      </div>
    </motion.div>
  );
}
