import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Eye, PackageX, TrendingUp, ImageOff, Star, Pencil, CalendarDays } from 'lucide-react';
import { StatGrid, StatTile, Toolbar, SearchBox, Select, Chips, DataTable } from '../AdminKit';
import { ChartCard, BarList } from '../../dashboard/Charts';
import { rise } from '../../dashboard/ui';
import { fmt, compact } from '../../dashboard/analytics';
import { BRAND } from '../../../utils/brand';
import { productState, formatSchedule } from '../../../utils/productVisibility';
import { thumbUrl, fallbackToFull } from '../../../utils/imageUpload';
import { productsSummary } from '../../../utils/adminData';

function Visibility({ product }) {
  const st = productState(product);
  if (st === 'live') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En ligne</span>;
  if (st === 'scheduled') return <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800"><CalendarDays className="h-3 w-3" /> {formatSchedule(product.publish_at)}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><Pencil className="h-3 w-3" /> Brouillon</span>;
}

function Thumb({ product }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      {product.image_url
        ? <img src={thumbUrl(product.image_url)} onError={fallbackToFull(product.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <ImageOff className="h-5 w-5 text-slate-300" />}
    </span>
  );
}

function StockTag({ stock }) {
  const n = Number(stock) || 0;
  const cls = n <= 0 ? 'bg-red-50 text-red-700' : n <= 5 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{n <= 0 ? 'Rupture' : n}</span>;
}

export default function ProductsSection({ products, onOpenMerchant }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('sold');

  const s = useMemo(() => productsSummary(products), [products]);
  const categories = useMemo(() => [['all', 'Toutes les catégories'], ...[...new Set(products.map((p) => p.category || 'Sans catégorie'))].sort((a, b) => a.localeCompare(b, 'fr')).map((c) => [c, c])], [products]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = products.filter((p) => {
      const st = productState(p);
      if (filter === 'live' && st !== 'live') return false;
      if (filter === 'draft' && st !== 'draft') return false;
      if (filter === 'scheduled' && st !== 'scheduled') return false;
      if (filter === 'out' && Number(p.stock) > 0) return false;
      if (filter === 'never' && Number(p.units_sold) > 0) return false;
      if (category !== 'all' && (p.category || 'Sans catégorie') !== category) return false;
      if (query && !`${p.name} ${p.shop_name} ${p.category}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const sorters = {
      sold: (a, b) => Number(b.units_sold) - Number(a.units_sold),
      revenue: (a, b) => Number(b.revenue_fcfa) - Number(a.revenue_fcfa),
      recent: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      price: (a, b) => Number(b.price_fcfa) - Number(a.price_fcfa),
      stock: (a, b) => Number(a.stock) - Number(b.stock),
    };
    return list.sort(sorters[sort]);
  }, [products, q, filter, category, sort]);

  return (
    <>
      <StatGrid>
        <StatTile label="Produits" value={fmt(s.total)} sub={`${s.draft} brouillon${s.draft > 1 ? 's' : ''} · ${s.scheduled} programmé${s.scheduled > 1 ? 's' : ''}`} icon={Package} gradient="sky" />
        <StatTile label="En ligne" value={fmt(s.live)} sub="visibles par les clients" icon={Eye} gradient="emerald" />
        <StatTile label="En rupture" value={fmt(s.outOfStock)} sub={`${s.lowStock} presque épuisé${s.lowStock > 1 ? 's' : ''} (≤ 5)`} icon={PackageX} gradient="rose" />
        <StatTile label="Articles vendus" value={fmt(s.unitsSold)} sub={`${s.neverSold} produit${s.neverSold > 1 ? 's' : ''} jamais vendu${s.neverSold > 1 ? 's' : ''}`} icon={TrendingUp} gradient="amber" />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={rise}>
          <ChartCard className="h-full" title="Produits les plus vendus" subtitle="Articles livrés, toutes boutiques" table={{ columns: [{ key: 'label', label: 'Produit' }, { key: 'shop', label: 'Boutique' }, { key: 'value', label: 'Vendus', align: 'right' }], rows: s.topSold }}>
            <BarList items={s.topSold} color={BRAND.signature} formatValue={(v) => `${v}`} detail={(p) => `${p.shop} · ${compact(p.revenue)} F`} emptyText="Aucune vente livrée pour le moment." animationKey="top-products" />
          </ChartCard>
        </motion.div>
        <motion.div variants={rise}>
          <ChartCard className="h-full" title="Catégories" subtitle="Nombre de produits" table={{ columns: [{ key: 'label', label: 'Catégorie' }, { key: 'value', label: 'Produits', align: 'right' }], rows: s.categories }}>
            <BarList items={s.categories} color="#2a78d6" formatValue={(v) => `${v}`} detail={(c) => `${Math.round((c.value / Math.max(1, s.total)) * 100)} % du catalogue`} emptyText="Aucun produit." animationKey="categories" />
          </ChartCard>
        </motion.div>
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Produit, boutique, catégorie…" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select label="Catégorie" value={category} onChange={setCategory} options={categories} />
          <Select label="Trier" value={sort} onChange={setSort} options={[['sold', 'Plus vendus'], ['revenue', 'Meilleur chiffre'], ['recent', 'Plus récents'], ['price', 'Prix décroissant'], ['stock', 'Stock le plus bas']]} />
        </div>
      </Toolbar>

      <Chips
        label="Filtre des produits"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'Tous', count: s.total },
          { id: 'live', label: 'En ligne', count: s.live, dot: 'bg-emerald-500' },
          { id: 'draft', label: 'Brouillons', count: s.draft, dot: 'bg-slate-400' },
          { id: 'scheduled', label: 'Programmés', count: s.scheduled, dot: 'bg-brand-500' },
          { id: 'out', label: 'En rupture', count: s.outOfStock, dot: 'bg-red-500' },
          { id: 'never', label: 'Jamais vendus', count: s.neverSold },
        ]}
      />

      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => onOpenMerchant(p.merchant_id)}
        empty="Aucun produit ne correspond."
        columns={[
          { key: 'name', label: 'Produit', render: (p) => <div className="flex items-center gap-3"><Thumb product={p} /><div className="min-w-0"><p className="max-w-[220px] truncate font-bold text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.category || 'Sans catégorie'}</p></div></div> },
          { key: 'shop', label: 'Boutique', render: (p) => <p className="max-w-[160px] truncate text-sm font-semibold">{p.shop_name}</p> },
          { key: 'price', label: 'Prix', align: 'right', render: (p) => <p className="font-semibold">{fmt(p.price_fcfa)} F</p> },
          { key: 'stock', label: 'Stock', align: 'right', render: (p) => <StockTag stock={p.stock} /> },
          { key: 'sold', label: 'Ventes', align: 'right', render: (p) => <><p className="font-bold">{fmt(p.units_sold)}</p><p className="text-xs text-slate-500">{compact(p.revenue_fcfa)} F</p></> },
          { key: 'rating', label: 'Avis', align: 'right', render: (p) => (Number(p.reviews_count) ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><Star className="h-3.5 w-3.5 fill-current" /> {Number(p.rating).toFixed(1).replace('.', ',')} <span className="font-normal text-slate-400">({p.reviews_count})</span></span> : <span className="text-xs text-slate-400">—</span>) },
          { key: 'vis', label: 'Visibilité', render: (p) => <Visibility product={p} /> },
        ]}
        mobileRow={(p) => (
          <div className="flex items-center gap-3">
            <Thumb product={p} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{p.name}</p>
              <p className="truncate text-xs text-slate-500">{p.shop_name} · {fmt(p.price_fcfa)} F</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><Visibility product={p} /><StockTag stock={p.stock} /></div>
            </div>
            <div className="shrink-0 text-right"><p className="font-figures font-bold">{fmt(p.units_sold)}</p><p className="text-[11px] text-slate-500">vendus</p></div>
          </div>
        )}
      />
    </>
  );
}
