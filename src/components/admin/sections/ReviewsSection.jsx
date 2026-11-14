import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, BadgeCheck, MessageCircle, Trash2, LoaderCircle, TriangleAlert } from 'lucide-react';
import { StatGrid, StatTile, Toolbar, SearchBox, Chips } from '../AdminKit';
import { CARD, rise } from '../../dashboard/ui';
import { fmt } from '../../dashboard/analytics';

const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
    </span>
  );
}

export default function ReviewsSection({ reviews, onDelete, onOpenMerchant }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [shown, setShown] = useState(40);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / total : 0;
    return {
      total,
      avg,
      verified: reviews.filter((r) => r.verified).length,
      negative: reviews.filter((r) => Number(r.rating) <= 2).length,
      five: reviews.filter((r) => Number(r.rating) === 5).length,
      four: reviews.filter((r) => Number(r.rating) === 4).length,
      unverified: reviews.filter((r) => !r.verified).length,
    };
  }, [reviews]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === '5' && Number(r.rating) !== 5) return false;
      if (filter === '4' && Number(r.rating) !== 4) return false;
      if (filter === 'neg' && Number(r.rating) > 2) return false;
      if (filter === 'unverified' && r.verified) return false;
      if (query && !`${r.comment} ${r.customer_name} ${r.product_name} ${r.shop_name}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [reviews, q, filter]);

  const remove = async (r) => {
    if (!window.confirm(`Supprimer définitivement l'avis de « ${r.customer_name || 'client'} » sur « ${r.product_name || 'produit'} » ?`)) return;
    setBusy(r.id);
    await onDelete(r);
    setBusy(null);
  };

  return (
    <>
      <StatGrid>
        <StatTile label="Avis" value={fmt(stats.total)} sub={`${stats.five} avis 5 étoiles`} icon={MessageCircle} gradient="sky" />
        <StatTile label="Note moyenne" value={stats.total ? stats.avg.toFixed(1).replace('.', ',') : '—'} sub="sur 5, toutes boutiques" icon={Star} gradient="amber" />
        <StatTile label="Achats vérifiés" value={fmt(stats.verified)} sub={stats.total ? `${Math.round((stats.verified / stats.total) * 100)} % des avis` : '—'} icon={BadgeCheck} gradient="emerald" />
        <StatTile label="Avis négatifs" value={fmt(stats.negative)} sub="1 ou 2 étoiles : à surveiller" icon={TriangleAlert} gradient="rose" />
      </StatGrid>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Commentaire, client, produit, boutique…" />
      </Toolbar>

      <Chips
        label="Filtre des avis"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'Tous', count: stats.total },
          { id: '5', label: '5 étoiles', count: stats.five },
          { id: '4', label: '4 étoiles', count: stats.four },
          { id: 'neg', label: '1 à 2 étoiles', count: stats.negative, dot: 'bg-red-500' },
          { id: 'unverified', label: 'Non vérifiés', count: stats.unverified, dot: 'bg-slate-400' },
        ]}
      />

      {rows.length === 0 ? (
        <motion.p variants={rise} className={`${CARD} p-10 text-center text-sm text-slate-500`}>Aucun avis ne correspond.</motion.p>
      ) : (
        <motion.div variants={rise} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {rows.slice(0, shown).map((r) => (
              <motion.article key={r.id} layout exit={{ opacity: 0, scale: 0.96 }} className={`${CARD} flex flex-col p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Stars value={Number(r.rating)} />
                    <p className="mt-1 text-sm font-bold text-slate-900">{r.customer_name || 'Client'}
                      {r.verified && <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 align-middle text-[10px] font-bold text-emerald-700"><BadgeCheck className="h-3 w-3" /> Achat vérifié</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{dateFr(r.created_at)}</span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{r.comment || <span className="italic text-slate-400">Sans commentaire</span>}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <button onClick={() => r.merchant_id && onOpenMerchant(r.merchant_id)} className="min-w-0 text-left text-xs text-slate-500 hover:text-slate-800">
                    <span className="block truncate font-semibold text-slate-700">{r.product_name || 'Produit supprimé'}</span>
                    <span className="block truncate">{r.shop_name || '—'}</span>
                  </button>
                  <button onClick={() => remove(r)} disabled={busy === r.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    {busy === r.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Supprimer
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {rows.length > shown && (
        <div className="text-center">
          <button onClick={() => setShown((s) => s + 40)} className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700">Afficher plus d'avis ({rows.length - shown})</button>
        </div>
      )}
    </>
  );
}
