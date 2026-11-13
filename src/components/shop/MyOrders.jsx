// « Mes commandes » : les commandes passées depuis ce téléphone (si le client a demandé à être reconnu),
// avec leur état du moment et un bouton pour les suivre sans retaper le téléphone et le code.
import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, X, ChevronRight } from '../dashboard/icons';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const STATUS = {
  PENDING: ['Reçue', 'bg-amber-100 text-amber-800'],
  PREPARING: ['En préparation', 'bg-sky-100 text-sky-800'],
  IN_TRANSIT: ['En route', 'bg-violet-100 text-violet-800'],
  DELIVERED: ['Livrée', 'bg-emerald-100 text-emerald-800'],
  CANCELLED: ['Annulée', 'bg-slate-200 text-slate-700'],
  DISPUTED: ['En litige', 'bg-red-100 text-red-800'],
};
const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function MyOrders({ orders, statuses, onTrack, onRemove }) {
  if (!orders.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="sh-card mt-6 p-5 md:p-6" aria-label="Mes commandes">
      <div className="mb-4 flex items-center gap-3">
        <span className="theme-soft theme-text sh-r-sm flex h-10 w-10 items-center justify-center"><Receipt className="h-5 w-5" /></span>
        <div>
          <h3 className="sh-ink font-bold">Mes commandes</h3>
          <p className="sh-muted text-xs">Passées depuis ce téléphone</p>
        </div>
      </div>
      <ul className="space-y-2">
        {orders.map((o) => {
          const st = STATUS[statuses[o.id]];
          return (
            <li key={o.id} className="sh-fill sh-r-md flex items-center gap-2 p-2 pl-4">
              <button type="button" onClick={() => onTrack(o)} className="group flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="sh-ink flex flex-wrap items-center gap-2 text-sm font-bold">
                    <span className="font-mono tracking-wider">{o.id.split('-')[0].toUpperCase()}</span>
                    {st && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st[1]}`}>{st[0]}</span>}
                  </span>
                  <span className="sh-muted block text-xs">{[day(o.at), `${fmt(o.total)} F`, o.items ? `${o.items} article${o.items > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="theme-text flex shrink-0 items-center gap-0.5 text-xs font-bold">Suivre <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </button>
              <button type="button" onClick={() => onRemove(o.id)} className="sh-muted sh-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-label="Retirer cette commande de la liste">
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
