import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TriangleAlert, ChevronDown } from 'lucide-react';
import { MagicIcon, CARD, rise } from '../dashboard/ui';

// Briques communes des sections de l'administration : chiffres clés, filtres, tableau, panneau latéral.

// Décor des bandeaux sombres : lueur indigo, reflet doré, quadrillage discret et grain photo.
export function NightFx({ grid = true }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(60%_90%_at_95%_0%,rgba(106,88,232,0.55),transparent_70%),radial-gradient(45%_70%_at_0%_100%,rgba(246,199,104,0.14),transparent_70%)]" />
      {grid && <div className="absolute inset-0 bg-[linear-gradient(rgba(174,166,247,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(174,166,247,0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_left,black,transparent_75%)]" />}
      <div className="hero-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
    </div>
  );
}

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

// Barre de recherche et filtres : passe sur une ligne selon la place réelle du contenu
// (requête de conteneur), pas selon la largeur de l'écran : la barre latérale en prend une partie.
export function Toolbar({ children }) {
  return (
    <motion.div variants={rise} className="@container">
      <div className={`${CARD} flex flex-col gap-3 p-3.5 sm:p-4 @min-[840px]:flex-row @min-[840px]:items-center`}>{children}</div>
    </motion.div>
  );
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
        className="w-full rounded-xl border border-[#e8e5dc] bg-[#f7f6f2] py-3 pl-12 pr-4 text-base font-medium outline-none transition focus:border-[#8a7cf1] focus:bg-white focus:ring-4 focus:ring-[#6a58e8]/10 md:text-sm"
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
        className="w-full cursor-pointer appearance-none truncate rounded-xl border border-[#e8e5dc] bg-white py-3 pl-3 pr-9 text-base font-semibold text-slate-700 outline-none transition focus:border-[#8a7cf1] focus:ring-4 focus:ring-[#6a58e8]/10 md:text-sm"
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
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-[#0c0a24] text-white shadow-[0_10px_22px_-12px_rgba(12,10,36,0.7)]' : 'border border-[#e8e5dc] bg-white text-slate-600 hover:border-slate-300'}`}
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

// Largeur de contenu à partir de laquelle le tableau tient sans défilement. En dessous (téléphone,
// tablette en portrait, menu ouvert), les lignes deviennent des fiches, sur deux colonnes dès que
// la place le permet. Classes écrites en entier pour que Tailwind les génère.
const TABLE_FROM = {
  sm: ['hidden @min-[700px]:block', '@min-[700px]:hidden'],
  md: ['hidden @min-[860px]:block', '@min-[860px]:hidden'],
  lg: ['hidden @min-[960px]:block', '@min-[960px]:hidden'],
};

// Tableau quand la place le permet, fiches sinon ; affichage par pages de `pageSize` lignes.
export function DataTable({ columns, rows, rowKey, onRowClick, mobileRow, empty = 'Aucun résultat.', pageSize = 50, minWidth = 900 }) {
  const [shown, setShown] = useState(pageSize);
  const visible = rows.slice(0, shown);
  const [tableClass, cardsClass] = TABLE_FROM[minWidth > 900 ? 'lg' : minWidth > 760 ? 'md' : 'sm'];
  return (
    <motion.div variants={rise} className="@container">
      <div className={`${CARD} overflow-hidden`}>
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">{empty}</p>
        ) : (
          <>
            <div className={`${tableClass} overflow-x-auto`}>
              <table className="w-full text-sm" style={{ minWidth }}>
                <thead className="border-b border-[#efece4] bg-[#faf9f6] text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {columns.map((c) => <th key={c.key} className={`px-4 py-3.5 font-bold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1efe9]">
                  {visible.map((r) => (
                    <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'cursor-pointer transition-colors hover:bg-[#6a58e8]/[0.04]' : ''}>
                      {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.render(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={`${cardsClass} grid grid-cols-1 @min-[600px]:grid-cols-2`}>
              {visible.map((r) => (
                <li key={rowKey(r)} className="min-w-0 border-b border-[#f1efe9] @min-[600px]:odd:border-r">
                  {onRowClick ? (
                    <button type="button" onClick={() => onRowClick(r)} className="h-full w-full p-4 text-left transition-colors hover:bg-[#6a58e8]/[0.04] active:bg-slate-50">{mobileRow(r)}</button>
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
      </div>
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
            <div className="relative isolate overflow-hidden bg-[#0c0a24] p-5 text-white sm:p-6">
              <NightFx />
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
