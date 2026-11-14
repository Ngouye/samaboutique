import { useMemo, useState } from 'react';
import { Users, Repeat, UserPlus, Wallet, Phone, MessageCircle, ShoppingBag, Store, MapPin } from 'lucide-react';
import { StatGrid, StatTile, Toolbar, SearchBox, Select, Chips, DataTable, Drawer, Panel } from '../AdminKit';
import { StatusChip } from './OrdersSection';
import { fmt, compact } from '../../dashboard/analytics';
import { whatsappNumber, formatPhone } from '../../../utils/phone';
import { customersSummary, shortRef, DAY } from '../../../utils/adminData';

const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function CustomersSection({ customers, onOpenCustomer }) {
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState('recent');
  // Instant de référence figé à l'ouverture de la section (segments « nouveaux » stables).
  const [now] = useState(() => Date.now());

  const s = useMemo(() => customersSummary(customers, now), [customers, now]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (segment === 'loyal' && Number(c.orders_count) < 2) return false;
      if (segment === 'new' && now - Date.parse(c.first_order_at) > 30 * DAY) return false;
      if (segment === 'multi' && Number(c.shops_count) < 2) return false;
      if (segment === 'inactive' && now - Date.parse(c.last_order_at) <= 90 * DAY) return false;
      if (query && !`${c.customer_name} ${c.customer_phone} ${c.customer_key} ${(c.shops || []).join(' ')} ${(c.zones || []).join(' ')}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const sorters = {
      recent: (a, b) => Date.parse(b.last_order_at) - Date.parse(a.last_order_at),
      spent: (a, b) => Number(b.total_spent_fcfa) - Number(a.total_spent_fcfa),
      orders: (a, b) => Number(b.orders_count) - Number(a.orders_count),
    };
    return list.sort(sorters[sort]);
  }, [customers, q, segment, sort, now]);

  const inactive = customers.filter((c) => now - Date.parse(c.last_order_at) > 90 * DAY).length;

  return (
    <>
      <StatGrid>
        <StatTile label="Clients" value={fmt(s.total)} sub="numéros de téléphone distincts" icon={Users} gradient="sky" />
        <StatTile label="Clients fidèles" value={fmt(s.repeat)} sub={`${Math.round(s.repeatRate * 100)} % ont commandé 2 fois ou plus`} icon={Repeat} gradient="emerald" />
        <StatTile label="Nouveaux (30 jours)" value={fmt(s.newLast30)} sub={`${s.multiShop} achètent dans plusieurs boutiques`} icon={UserPlus} gradient="violet" />
        <StatTile label="Dépense moyenne" value={`${compact(s.avgSpent)} F`} sub="par client ayant reçu une commande" icon={Wallet} gradient="amber" />
      </StatGrid>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nom, téléphone, boutique, quartier…" />
        <div className="sm:w-56">
          <Select label="Trier" value={sort} onChange={setSort} options={[['recent', 'Dernière commande'], ['spent', 'Plus grosse dépense'], ['orders', 'Plus de commandes']]} />
        </div>
      </Toolbar>

      <Chips
        label="Segments de clients"
        value={segment}
        onChange={setSegment}
        options={[
          { id: 'all', label: 'Tous', count: s.total },
          { id: 'loyal', label: 'Fidèles', count: s.repeat, dot: 'bg-emerald-500' },
          { id: 'new', label: 'Nouveaux', count: s.newLast30, dot: 'bg-brand-500' },
          { id: 'multi', label: 'Plusieurs boutiques', count: s.multiShop, dot: 'bg-sky-500' },
          { id: 'inactive', label: 'Inactifs (+90 j)', count: inactive, dot: 'bg-slate-400' },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(c) => c.customer_key}
        onRowClick={(c) => onOpenCustomer(c.customer_key)}
        empty="Aucun client ne correspond."
        columns={[
          { key: 'name', label: 'Client', render: (c) => <><p className="max-w-[200px] truncate font-bold text-slate-900">{c.customer_name}</p><p className="text-xs text-slate-500">{formatPhone(c.customer_phone)}</p></> },
          { key: 'orders', label: 'Commandes', align: 'right', render: (c) => <><p className="font-bold">{c.orders_count}</p><p className="text-xs text-slate-500">{c.delivered_count} livrée{c.delivered_count > 1 ? 's' : ''}{c.cancelled_count ? ` · ${c.cancelled_count} annulée${c.cancelled_count > 1 ? 's' : ''}` : ''}</p></> },
          { key: 'spent', label: 'Dépensé', align: 'right', render: (c) => <p className="font-bold">{fmt(c.total_spent_fcfa)} F</p> },
          { key: 'shops', label: 'Boutiques', render: (c) => <p className="max-w-[220px] truncate text-xs text-slate-600"><span className="font-bold text-slate-800">{c.shops_count}</span> · {(c.shops || []).join(', ')}</p> },
          { key: 'zone', label: 'Quartier', render: (c) => <p className="max-w-[160px] truncate text-xs text-slate-600">{(c.zones || [])[0] || '—'}</p> },
          { key: 'last', label: 'Dernière commande', render: (c) => <span className="text-xs text-slate-600">{dateFr(c.last_order_at)}</span> },
        ]}
        mobileRow={(c) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{c.customer_name}</p>
              <p className="text-xs text-slate-500">{formatPhone(c.customer_phone)}</p>
              <p className="mt-1 truncate text-xs text-slate-400">{(c.shops || []).join(', ')}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-figures font-bold">{fmt(c.total_spent_fcfa)} F</p>
              <p className="text-xs text-slate-500">{c.orders_count} commande{c.orders_count > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      />
    </>
  );
}

export function CustomerDrawer({ customer, orders, onClose, onOpenOrder }) {
  const wa = whatsappNumber(customer?.customer_phone);
  const history = useMemo(
    () => (customer ? orders.filter((o) => o.customer_key === customer.customer_key) : []),
    [customer, orders],
  );
  return (
    <Drawer
      open={Boolean(customer)}
      onClose={onClose}
      label={customer ? `Client ${customer.customer_name}` : 'Client'}
      header={customer && (
        <>
          <p className="text-sm text-white/60">Client depuis le {dateFr(customer.first_order_at)}</p>
          <h2 className="mt-1 truncate text-2xl font-extrabold">{customer.customer_name}</h2>
          <p className="text-white/70">{formatPhone(customer.customer_phone)}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { l: 'Commandes', v: customer.orders_count },
              { l: 'Livrées', v: customer.delivered_count },
              { l: 'Dépensé', v: `${compact(customer.total_spent_fcfa)} F` },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-white/[0.07] p-3 text-center"><p className="font-figures text-lg font-bold">{x.v}</p><p className="text-[11px] text-white/60">{x.l}</p></div>
            ))}
          </div>
        </>
      )}
      footer={customer && (
        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${customer.customer_phone}`} className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-700"><Phone className="h-4 w-4" /> Appeler</a>
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
        </div>
      )}
    >
      {customer && (
        <>
          <Panel title="Boutiques et quartiers" icon={Store}>
            <div className="flex flex-wrap gap-1.5">
              {(customer.shops || []).map((sh) => <span key={sh} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{sh}</span>)}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500"><MapPin className="mt-px h-3.5 w-3.5 shrink-0" /> {(customer.zones || []).join(' · ') || '—'}</p>
          </Panel>
          <Panel title={`Commandes (${history.length})`} icon={ShoppingBag}>
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Les commandes de plus de 12 mois ne sont pas affichées ici.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((o) => (
                  <li key={o.id}>
                    <button onClick={() => onOpenOrder(o.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{o.shop_name} · <span className="font-mono text-xs">#{shortRef(o.id)}</span></span>
                        <span className="block text-xs text-slate-500">{dateFr(o.created_at)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1"><span className="font-figures text-sm font-bold">{fmt(o.total_amount_fcfa)} F</span><StatusChip status={o.status} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </Drawer>
  );
}
