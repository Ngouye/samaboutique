import { useMemo, useState } from 'react';
import { Bike, Truck, CircleCheck, Banknote, Phone, MessageCircle } from 'lucide-react';
import { StatGrid, StatTile, Toolbar, SearchBox, Select, DataTable } from '../AdminKit';
import { fmt, compact } from '../../dashboard/analytics';
import { whatsappNumber, formatPhone } from '../../../utils/phone';

const VEHICLES = { MOTO: 'Moto', SCOOTER: 'Scooter', VELO: 'Vélo', VOITURE: 'Voiture', PIETON: 'À pied' };
const vehicleLabel = (v) => VEHICLES[String(v || '').toUpperCase()] || v || '—';
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'jamais');

export default function DriversSection({ drivers, onOpenMerchant }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('delivered');

  const totals = useMemo(() => ({
    count: drivers.length,
    onRoad: drivers.filter((d) => Number(d.in_transit_count) > 0).length,
    delivered: drivers.reduce((s, d) => s + Number(d.delivered_count || 0), 0),
    cash: drivers.reduce((s, d) => s + Number(d.cash_collected_fcfa || 0), 0),
    shops: new Set(drivers.map((d) => d.merchant_id)).size,
  }), [drivers]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = drivers.filter((d) => !query || `${d.full_name} ${d.phone_number} ${d.shop_name} ${d.vehicle_type}`.toLowerCase().includes(query));
    const sorters = {
      delivered: (a, b) => Number(b.delivered_count) - Number(a.delivered_count),
      recent: (a, b) => (Date.parse(b.last_delivery_at) || 0) - (Date.parse(a.last_delivery_at) || 0),
      name: (a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'fr'),
    };
    return list.sort(sorters[sort]);
  }, [drivers, q, sort]);

  return (
    <>
      <StatGrid>
        <StatTile label="Livreurs" value={fmt(totals.count)} sub={`dans ${totals.shops} boutique${totals.shops > 1 ? 's' : ''}`} icon={Bike} gradient="sky" />
        <StatTile label="En course maintenant" value={fmt(totals.onRoad)} sub="au moins une livraison en route" icon={Truck} gradient="violet" />
        <StatTile label="Livraisons réalisées" value={fmt(totals.delivered)} sub="depuis le début" icon={CircleCheck} gradient="emerald" />
        <StatTile label="Espèces encaissées" value={`${compact(totals.cash)} F`} sub="paiements à la livraison" icon={Banknote} gradient="amber" />
      </StatGrid>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nom, téléphone, boutique, véhicule…" />
        <div className="sm:w-56">
          <Select label="Trier" value={sort} onChange={setSort} options={[['delivered', 'Plus de livraisons'], ['recent', 'Dernière livraison'], ['name', 'Nom (A→Z)']]} />
        </div>
      </Toolbar>

      <DataTable
        rows={rows}
        rowKey={(d) => d.id}
        onRowClick={(d) => onOpenMerchant(d.merchant_id)}
        empty="Aucun livreur enregistré."
        columns={[
          { key: 'name', label: 'Livreur', render: (d) => <><p className="font-bold text-slate-900">{d.full_name}</p><p className="text-xs text-slate-500">{formatPhone(d.phone_number) || '—'} · {vehicleLabel(d.vehicle_type)}</p></> },
          { key: 'shop', label: 'Boutique', render: (d) => <p className="max-w-[180px] truncate font-semibold">{d.shop_name || '—'}</p> },
          { key: 'delivered', label: 'Livrées', align: 'right', render: (d) => <p className="font-bold">{fmt(d.delivered_count)}</p> },
          { key: 'transit', label: 'En route', align: 'right', render: (d) => (Number(d.in_transit_count) ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{d.in_transit_count}</span> : <span className="text-slate-400">0</span>) },
          { key: 'cash', label: 'Espèces', align: 'right', render: (d) => <p className="font-semibold">{fmt(d.cash_collected_fcfa)} F</p> },
          { key: 'last', label: 'Dernière livraison', render: (d) => <span className="text-xs text-slate-600">{dateFr(d.last_delivery_at)}</span> },
          { key: 'contact', label: '', render: (d) => {
            const wa = whatsappNumber(d.phone_number);
            return d.phone_number ? (
              <span className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                <a href={`tel:${d.phone_number}`} className="rounded-full bg-slate-100 p-2 text-slate-700" aria-label={`Appeler ${d.full_name}`}><Phone className="h-3.5 w-3.5" /></a>
                {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366]/15 p-2 text-green-700" aria-label={`WhatsApp de ${d.full_name}`}><MessageCircle className="h-3.5 w-3.5" /></a>}
              </span>
            ) : null;
          } },
        ]}
        mobileRow={(d) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{d.full_name}</p>
              <p className="truncate text-xs text-slate-500">{d.shop_name} · {vehicleLabel(d.vehicle_type)}</p>
              <p className="mt-1 text-xs text-slate-400">Dernière livraison : {dateFr(d.last_delivery_at)}</p>
            </div>
            <div className="shrink-0 text-right"><p className="font-figures font-bold">{fmt(d.delivered_count)}</p><p className="text-[11px] text-slate-500">livrées</p></div>
          </div>
        )}
      />
    </>
  );
}
