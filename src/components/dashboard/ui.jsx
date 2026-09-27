import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const EASE = [0.16, 1, 0.3, 1];

// Variantes alignées sur celles de la page (initial / animate) pour profiter du décalage en cascade.
export const rise = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE } },
};

export const CARD = 'rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)]';
export const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10';
export const LABEL = 'mb-1.5 block text-sm font-semibold text-slate-700';

export const GRADIENTS = {
  emerald: 'from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/40',
  sky: 'from-sky-400 via-blue-500 to-indigo-600 shadow-blue-500/40',
  amber: 'from-amber-300 via-amber-400 to-orange-500 shadow-amber-500/40',
  violet: 'from-violet-400 via-purple-500 to-fuchsia-600 shadow-purple-500/40',
  rose: 'from-rose-400 via-pink-500 to-red-500 shadow-rose-500/40',
  slate: 'from-slate-500 via-slate-700 to-slate-900 shadow-slate-500/40',
};

// Icône « magique » : pastille en dégradé, reflet, halo, étincelles, et petite danse au survol.
export function MagicIcon({ icon: Icon, gradient = 'emerald', size = 'md', sparkle = false, className = '' }) {
  const dims = { sm: 'h-9 w-9 rounded-xl', md: 'h-12 w-12 rounded-2xl', lg: 'h-14 w-14 rounded-2xl' }[size];
  const icon = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }[size];
  return (
    <motion.span
      whileHover={{ rotate: [0, -10, 10, -4, 0], scale: 1.08 }}
      transition={{ duration: 0.5 }}
      className={`relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-lg ${GRADIENTS[gradient]} ${dims} ${className}`}
    >
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/40 to-transparent opacity-60" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 55%)' }} />
      <Icon className={`relative ${icon} drop-shadow-sm`} strokeWidth={2.2} />
      {sparkle && (
        <>
          <motion.span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.9)]" animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
          <motion.span className="absolute -bottom-0.5 -left-1 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_6px_2px_rgba(253,230,138,0.9)]" animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.3 }} />
        </>
      )}
    </motion.span>
  );
}

export function PageHeader({ icon, gradient, title, subtitle, children }) {
  return (
    <motion.div variants={rise} className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <MagicIcon icon={icon} gradient={gradient} size="lg" sparkle />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </motion.div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`shine-btn inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-shadow hover:shadow-xl hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
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
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      variants={rise}
      onClick={onClick}
      whileHover={onClick ? { y: -3 } : undefined}
      className={`${CARD} flex items-center gap-3 p-4 text-left transition-colors ${active ? '!border-emerald-400 ring-4 ring-emerald-500/10' : ''}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-tight text-slate-900">{value}</span>
        <span className="block truncate text-xs font-medium text-slate-500">{label}</span>
      </span>
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <motion.div variants={rise} className={`${CARD} relative overflow-hidden px-6 py-16 text-center`}>
      <div className="pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
        <span className="orbit orbit-slow h-24 w-24 border border-dashed border-emerald-300/60">
          <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
        </span>
        <motion.span animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <MagicIcon icon={Icon} size="lg" sparkle />
        </motion.span>
      </div>
      <h3 className="relative text-xl font-bold text-slate-900">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-sm text-slate-500">{text}</p>
      {action && <div className="relative mt-6">{action}</div>}
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
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] ${maxWidth}`}
          >
            <div className="relative overflow-hidden border-b border-slate-100 px-6 py-5">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" />
              <div className="relative flex items-center gap-4">
                {icon && <MagicIcon icon={icon} gradient={gradient} sparkle />}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
                  {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
                </div>
                <motion.button whileHover={{ rotate: 90 }} onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </motion.button>
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
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
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
