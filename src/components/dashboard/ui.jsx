import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Kit d'interface « SamaBoutik Pro » : mêmes codes que la page d'accueil
// (vert profond #0b1f17, accents émeraude, mises en valeur ambre, cartes blanches à fine bordure).

export const EASE = [0.16, 1, 0.3, 1];
export const INK = '#0b1f17';

// Variantes alignées sur celles de la page (initial / animate) pour profiter du décalage en cascade.
export const rise = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export const CARD = 'rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(15,23,42,0.14)]';
export const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 outline-none transition duration-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:opacity-60';
export const LABEL = 'mb-1.5 block text-sm font-semibold text-slate-800';

// Teintes des pastilles d'icônes. Les anciens noms (« violet »…) restent acceptés
// et retombent sur la palette de la marque.
export const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  slate: 'bg-slate-100 text-slate-700 ring-slate-900/10',
  ink: 'bg-[#0b1f17] text-emerald-300 ring-black/10',
};
TONES.violet = TONES.emerald;
export const GRADIENTS = TONES;

// Pastille d'icône sobre (nom historique conservé : MagicIcon).
export function MagicIcon({ icon: Icon, gradient = 'emerald', size = 'md', className = '' }) {
  const dims = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-2xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const icon = { sm: 'h-[18px] w-[18px]', md: 'h-5 w-5', lg: 'h-6 w-6' }[size];
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ring-1 ring-inset ${TONES[gradient] || TONES.emerald} ${dims} ${className}`}>
      <Icon className={icon} strokeWidth={2} />
    </span>
  );
}
export const IconBadge = MagicIcon;

export function PageHeader({ icon, title, subtitle, children }) {
  return (
    <motion.div variants={rise} className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <MagicIcon icon={icon} gradient="ink" size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1f17] md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </motion.div>
  );
}

// Bouton principal : pilule vert profond, comme les boutons de la page d'accueil.
export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1f17] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(11,31,23,0.6)] transition-all hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Bouton secondaire : pilule blanche bordée.
export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Tuile de statistique compacte (et filtre cliquable si onClick est fourni).
export function StatPill({ icon: Icon, label, value, tone = 'slate', active = false, onClick }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-emerald-50 text-emerald-700',
  };
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      variants={rise}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`${CARD} flex flex-col items-start gap-2.5 p-4 text-left transition-[border-color,box-shadow,transform] duration-200 sm:flex-row sm:items-center sm:gap-3 ${onClick ? 'hover:-translate-y-0.5 hover:border-slate-300' : ''} ${active ? '!border-emerald-600 ring-4 ring-emerald-600/10' : ''}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${tones[tone] || tones.slate}`}>
        <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-lg font-bold leading-tight text-[#0b1f17] sm:text-xl">{value}</span>
        <span className="block text-xs font-medium leading-snug text-slate-500">{label}</span>
      </span>
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <motion.div variants={rise} className={`${CARD} px-6 py-16 text-center`}>
      <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-xl font-bold text-[#0b1f17]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-slate-500">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function Modal({ open, onClose, icon, gradient, title, subtitle, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] ${maxWidth}`}
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-4">
                {icon && <MagicIcon icon={icon} gradient={gradient} />}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-[#0b1f17]">{title}</h2>
                  {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-6">{children}</div>
            {footer && <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Aperçu d'un fichier image local (l'URL temporaire est libérée au démontage).
export function FilePreview({ file, className = '' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!file || !url) return null;
  return <img src={url} alt="Aperçu" className={className} />;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

export function SectionCard({ icon, gradient, title, subtitle, children }) {
  return (
    <motion.section variants={rise} className={`${CARD} p-6 md:p-7`}>
      <header className="mb-6 flex items-center gap-4">
        <MagicIcon icon={icon} gradient={gradient} size="sm" />
        <div>
          <h3 className="text-lg font-bold text-[#0b1f17]">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
