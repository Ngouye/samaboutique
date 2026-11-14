import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TriangleAlert, ChevronDown } from 'lucide-react';
import { MagicIcon, CARD, rise } from '../dashboard/ui';

// Briques communes des sections de l'administration : chiffres clés, filtres, tableau, panneau latéral.

export function StatTile({ label, value, sub, icon, gradient = 'emerald' }) {
  return (
    <motion.div variants={rise} className={`${CARD} flex items-center gap-3 p-4`}>
      {icon && <MagicIcon icon={icon} gradient={gradient} size="sm" />}
      <div className="min-w-0">
        <p className="truncate font-figures text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </motion.div>
  );
}

export function StatGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function Toolbar({ children }) {
  return <motion.div variants={rise} className={`${CARD} flex flex-col gap-3 p-4 lg:flex-row lg:items-center`}>{children}</motion.div>;
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
      />
    </div>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

// Pastilles de filtre avec compteur (défilement horizontal sur téléphone)
export function Chips({ options, value, onChange, label }) {
  return (
    <motion.div variants={rise} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label={label}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-ink text-white' : 'border border-[#e8e5dc] bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
            {o.label}
            {o.count != null && <span className={`font-figures text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{o.count}</span>}
          </button>
        );
      })}
    </motion.div>
  );
}

// Tableau sur grand écran, cartes sur téléphone ; affichage par pages de `pageSize` lignes.
export function DataTable({ columns, rows, rowKey, onRowClick, mobileRow, empty = 'Aucun résultat.', pageSize = 50, minWidth = 900 }) {
  const [shown, setShown] = useState(pageSize);
  const visible = rows.slice(0, shown);
  return (
    <motion.div variants={rise} className={`${CARD} overflow-hidden`}>
      {rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm" style={{ minWidth }}>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((c) => <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'cursor-pointer transition-colors hover:bg-brand-50/40' : ''}>
                    {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.render(r)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((r) => (
              <li key={rowKey(r)}>
                {onRowClick ? (
                  <button type="button" onClick={() => onRowClick(r)} className="w-full p-4 text-left active:bg-slate-50">{mobileRow(r)}</button>
                ) : (
                  <div className="p-4">{mobileRow(r)}</div>
                )}
              </li>
            ))}
          </ul>
          {rows.length > shown && (
            <div className="border-t border-slate-100 p-3 text-center">
              <button type="button" onClick={() => setShown((s) => s + pageSize)} className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:border-slate-300">
                Afficher {Math.min(pageSize, rows.length - shown)} de plus · {rows.length - shown} restant{rows.length - shown > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// Panneau latéral de détail (fermeture : fond, croix, touche Échap)
export function Drawer({ open, onClose, header, children, footer, label }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            className="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-[#f7f6f2] shadow-2xl"
          >
            <div className="relative overflow-hidden bg-ink p-5 text-white sm:p-6">
              <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
              <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Fermer"><X className="h-5 w-5" /></button>
              <div className="relative pr-10">{header}</div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>
            {footer && <div className="border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Panel({ title, icon: Icon, children, right }) {
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">{Icon && <Icon className="h-4 w-4 text-brand-600" />} {title}</p>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// Fonction d'administration absente de la base : script SQL à exécuter
export function SetupNotice({ what }) {
  return (
    <motion.div variants={rise} className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <p><strong>{what} : données pas encore disponibles.</strong> Exécutez <code className="rounded bg-white/70 px-1">admin_complet.sql</code> dans Supabase (SQL Editor → coller → Run), puis actualisez cette page.</p>
    </motion.div>
  );
}
