import { useMemo, useState } from 'react';
import { Wallet, ShoppingBag, Receipt, Truck, CreditCard, Phone, MessageCircle, MapPin, Navigation, Store, UserRound, Package, Clock } from 'lucide-react';
import { StatGrid, StatTile, Toolbar, SearchBox, Select, Chips, DataTable, Drawer, Panel } from '../AdminKit';
import { ORDER_STATUSES, statusMeta } from '../../dashboard/status';
import { fmt, compact } from '../../dashboard/analytics';
import { paymentLabel } from '../../../utils/payments';
import { parseOrderAddress, orderMapsUrl } from '../../../utils/orderAddress';
import { whatsappNumber, formatPhone } from '../../../utils/phone';
import { filterOrders, ordersSummary, shortRef, isOnline } from '../../../utils/adminData';

const PERIOD_OPTIONS = [['7', '7 derniers jours'], ['30', '30 derniers jours'], ['90', '90 derniers jours'], ['365', '12 derniers mois']];
const dateTime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)} %`);

export function StatusChip({ status }) {
  const s = statusMeta(status);
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.chip}`}><s.icon className="h-3.5 w-3.5" /> {s.label}</span>;
}

function PaymentChip({ order }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${isOnline(order) ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>
      {isOnline(order) ? <CreditCard className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />} {paymentLabel(order)}
    </span>
  );
}

export default function OrdersSection({ orders, merchants, onOpenOrder }) {
  const [days, setDays] = useState('30');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [shop, setShop] = useState('all');
  const [q, setQ] = useState('');

  const base = useMemo(() => filterOrders(orders, { days: Number(days), payment, shop: shop === 'all' ? null : shop, q }), [orders, days, payment, shop, q]);
  const rows = useMemo(() => filterOrders(base, { status }), [base, status]);
  const s = useMemo(() => ordersSummary(base), [base]);
  const shops = useMemo(() => [['all', 'Toutes les boutiques'], ...[...merchants].sort((a, b) => (a.shop_name || '').localeCompare(b.shop_name || '', 'fr')).map((m) => [m.id, m.shop_name || 'Sans nom'])], [merchants]);

  return (
    <>
      <StatGrid>
        <StatTile label="Commandes" value={fmt(s.count)} sub={`${s.inProgress} en cours`} icon={ShoppingBag} gradient="sky" />
        <StatTile label="Chiffre d'affaires livré" value={`${compact(s.gmv)} F`} sub={`${s.delivered} livrée${s.delivered > 1 ? 's' : ''}`} icon={Wallet} gradient="emerald" />
        <StatTile label="Panier moyen" value={`${fmt(s.avgBasket)} F`} sub="commandes livrées" icon={Receipt} gradient="violet" />
        <StatTile label="Taux de livraison" value={pct(s.deliveryRate)} sub={`paiement en ligne : ${pct(s.onlineShare)}`} icon={Truck} gradient="amber" />
      </StatGrid>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Client, téléphone, boutique, zone, référence…" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select label="Période" value={days} onChange={setDays} options={PERIOD_OPTIONS} />
          <Select label="Paiement" value={payment} onChange={setPayment} options={[['all', 'Tous les paiements'], ['cod', 'À la livraison'], ['online', 'Paiement en ligne']]} />
          <Select label="Boutique" value={shop} onChange={setShop} options={shops} />
        </div>
      </Toolbar>

      <Chips
        label="Statut des commandes"
        value={status}
        onChange={setStatus}
        options={[
          { id: 'all', label: 'Toutes', count: base.length },
          { id: 'active', label: 'En cours', count: s.inProgress },
          ...ORDER_STATUSES.filter((st) => st.id !== 'DISPUTED' || s.byStatus.DISPUTED).map((st) => ({ id: st.id, label: st.label, count: s.byStatus[st.id] || 0, dot: st.dot })),
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(o) => o.id}
        onRowClick={(o) => onOpenOrder(o.id)}
        empty="Aucune commande ne correspond à ces filtres."
        columns={[
          { key: 'ref', label: 'Commande', render: (o) => <><p className="font-mono text-xs font-bold text-slate-900">#{shortRef(o.id)}</p><p className="text-xs text-slate-500">{dateTime(o.created_at)}</p></> },
          { key: 'shop', label: 'Boutique', render: (o) => <p className="max-w-[180px] truncate font-semibold">{o.shop_name || '—'}</p> },
          { key: 'client', label: 'Client', render: (o) => <><p className="max-w-[180px] truncate font-semibold text-slate-800">{o.customer_name}</p><p className="text-xs text-slate-500">{formatPhone(o.customer_phone)}</p></> },
          { key: 'amount', label: 'Montant', align: 'right', render: (o) => <><p className="font-bold">{fmt(o.total_amount_fcfa)} F</p><p className="text-xs text-slate-500">{o.items_count} article{o.items_count > 1 ? 's' : ''}</p></> },
          { key: 'pay', label: 'Paiement', render: (o) => <PaymentChip order={o} /> },
          { key: 'status', label: 'Statut', render: (o) => <StatusChip status={o.status} /> },
          { key: 'driver', label: 'Livreur', render: (o) => <span className="text-xs text-slate-600">{o.driver_name || '—'}</span> },
        ]}
        mobileRow={(o) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{o.customer_name}</p>
              <p className="truncate text-xs text-slate-500">{o.shop_name} · #{shortRef(o.id)}</p>
              <p className="mt-1.5 text-xs text-slate-400">{dateTime(o.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <p className="font-figures font-bold">{fmt(o.total_amount_fcfa)} F</p>
              <StatusChip status={o.status} />
            </div>
          </div>
        )}
      />
    </>
  );
}

// Détail d'une commande (ouvert depuis les commandes, un client ou une boutique)
export function OrderDrawer({ order, onClose, onOpenMerchant, onOpenCustomer }) {
  const address = order ? parseOrderAddress(order.customer_address) : null;
  const items = Array.isArray(order?.cart_items) ? order.cart_items : [];
  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const wa = whatsappNumber(order?.customer_phone);
  return (
    <Drawer
      open={Boolean(order)}
      onClose={onClose}
      label={order ? `Commande ${shortRef(order.id)}` : 'Commande'}
      header={order && (
        <>
          <p className="text-sm text-white/60">{dateTime(order.created_at)}</p>
          <h2 className="mt-1 font-mono text-2xl font-extrabold">#{shortRef(order.id)}</h2>
          <div className="mt-3 flex flex-wrap gap-2"><StatusChip status={order.status} /><PaymentChip order={order} /></div>
          <p className="mt-4 font-figures text-3xl font-bold">{fmt(order.total_amount_fcfa)} <span className="text-base text-white/60">FCFA</span></p>
        </>
      )}
    >
      {order && (
        <>
          <Panel title="Client" icon={UserRound} right={onOpenCustomer && order.customer_key && <button onClick={() => onOpenCustomer(order.customer_key)} className="text-xs font-bold text-brand-700 hover:underline">Fiche client</button>}>
            <p className="font-bold text-slate-900">{order.customer_name}</p>
            <p className="text-sm text-slate-600">{formatPhone(order.customer_phone)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"><Phone className="h-3.5 w-3.5" /> Appeler</a>
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/15 px-3 py-1.5 text-xs font-bold text-green-700"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
            </div>
          </Panel>

          <Panel title="Livraison" icon={MapPin}>
            <p className="text-sm font-semibold text-slate-800">{address?.address || 'Adresse non précisée'}</p>
            <p className="mt-0.5 text-xs text-slate-500">Zone : {order.delivery_zone || '—'}{address?.coords ? ' · position GPS partagée' : ''}</p>
            <a href={orderMapsUrl(order)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"><Navigation className="h-3.5 w-3.5" /> Voir sur la carte</a>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Livreur</p><p className="font-bold">{order.driver_name || '—'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Livrée le</p><p className="font-bold">{order.delivered_at ? dateTime(order.delivered_at) : '—'}</p></div>
            </div>
          </Panel>

          <Panel title={`Articles (${order.items_count})`} icon={Package}>
            <ul className="divide-y divide-slate-100">
              {items.map((it, i) => (
                <li key={`${it.product_id || i}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0"><span className="font-bold">{Number(it.quantity) || 1}×</span> {it.name}</span>
                  <span className="shrink-0 font-figures text-slate-700">{fmt((Number(it.price) || 0) * (Number(it.quantity) || 1))} F</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-dashed border-slate-200 pt-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Articles</dt><dd className="font-figures">{fmt(itemsTotal)} F</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd className="font-figures">{fmt(Math.max(0, order.total_amount_fcfa - itemsTotal))} F</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd className="font-figures">{fmt(order.total_amount_fcfa)} F</dd></div>
            </dl>
          </Panel>

          <Panel title="Boutique" icon={Store}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">{order.shop_name || '—'}</p>
              {onOpenMerchant && order.merchant_id && <button onClick={() => onOpenMerchant(order.merchant_id)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">Voir la boutique</button>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> Paiement : {order.payment_status || (isOnline(order) ? 'en ligne' : 'à la livraison')}</p>
          </Panel>
        </>
      )}
    </Drawer>
  );
}
