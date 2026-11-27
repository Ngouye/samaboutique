import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, ArrowRight } from './icons';
import { BRAND } from '../../utils/brand';

// Kit d'interface du tableau de bord : style « carnet » clair.
// Fond papier (#f7f6f2), cartes blanches à filet chaud, encre bleu nuit (BRAND.ink),
// accents émeraude, ambre pour ce qui demande une action. Titres en DM Serif Display
// (font-ledger), chiffres en Space Grotesk (font-figures).

export const EASE = [0.16, 1, 0.3, 1];
export const INK = BRAND.ink;
export const PAPER = '#f7f6f2';

// Variantes alignées sur celles de la page (initial / animate) pour profiter du décalage en cascade.
export const rise = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export const CARD = 'rounded-[1.35rem] border border-[#e8e5dc] bg-white shadow-[0_1px_2px_rgba(18,16,58,0.04),0_18px_40px_-32px_rgba(18,16,58,0.28)]';
export const INPUT = 'w-full rounded-xl border border-[#dcd8cd] bg-white px-4 py-3 text-base text-slate-900 md:text-[15px] placeholder:text-stone-400 outline-none transition duration-200 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:opacity-60';
export const LABEL = 'mb-1.5 block text-sm font-semibold text-slate-800';

// Bouton de déconnexion des espaces commerçant et administrateur : icône, libellé, compte, flèche qui glisse.
// Il passe au rouge au survol ; la confirmation s'ouvre ensuite (LogoutDialog).
export function LogoutButton({ onClick, detail, tone = 'light', className = '' }) {
  const dark = tone === 'dark';
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl p-2 pr-3 text-left transition-all duration-300 ${dark
        ? 'bg-white/[0.04] ring-1 ring-white/10 hover:bg-red-500/10 hover:ring-red-400/30'
        : 'border border-[#ebe8e0] bg-white shadow-[0_1px_2px_rgba(18,16,58,0.04)] hover:border-red-200 hover:bg-red-50/70 hover:shadow-[0_10px_24px_-14px_rgba(220,38,38,0.45)]'} ${className}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-600/30 ${dark ? 'bg-white/10 text-slate-300' : 'bg-red-50 text-red-600'}`}>
        <LogOut className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold transition-colors ${dark ? 'text-slate-200 group-hover:text-red-200' : 'text-ink group-hover:text-red-700'}`}>Se déconnecter</span>
        {detail && <span className={`block truncate text-[11px] ${dark ? 'text-slate-500' : 'text-stone-500'}`}>{detail}</span>}
      </span>
      <ArrowRight className={`h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${dark ? 'text-red-300' : 'text-red-600'}`} />
    </motion.button>
  );
}

// Teintes des pastilles d'icônes. Les anciens noms (« violet », « ink »…) restent acceptés.
export const TONES = {
  emerald: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  slate: 'bg-stone-100 text-stone-700 ring-stone-900/10',
};
TONES.violet = TONES.emerald;
TONES.ink = TONES.emerald;
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

// En-tête de page : bannière « nuit de Dakar » (titre à empattements, sous-titre, actions à droite).
// Les actions posées dedans utilisent les variantes sombres (PrimaryButton tone="gold", HeaderMeter…).
export function PageHeader({ title, subtitle, children }) {
  return (
    <motion.div variants={rise} className="relative isolate mb-6 overflow-hidden rounded-[1.75rem] bg-[#0c0a24] px-6 py-6 text-white shadow-[0_30px_60px_-36px_rgba(12,10,36,0.9)] md:mb-8 md:px-8 md:py-7">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(55%_120%_at_95%_0%,rgba(106,88,232,0.55),transparent_70%),radial-gradient(40%_90%_at_0%_100%,rgba(246,199,104,0.13),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(174,166,247,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(174,166,247,0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
        <div className="hero-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-ledger text-[2rem] leading-[1.05] tracking-[-0.01em] md:text-[2.6rem]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-white/60">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
      </div>
    </motion.div>
  );
}

// Jauge d'un forfait dans l'en-tête de page (ex. « 6 / 10 produits »).
export function HeaderMeter({ label, value, ratio }) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const bar = ratio >= 1 ? 'bg-red-400' : ratio >= 0.8 ? 'bg-amber-400' : 'bg-gradient-to-r from-brand-300 to-[#f6c768]';
  return (
    <div className="min-w-[190px] rounded-2xl bg-white/[0.07] px-4 py-2.5 ring-1 ring-white/15 backdrop-blur">
      <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold text-white/60">
        <span>{label}</span>
        <span className="font-figures tabular-nums text-white">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }} className={`h-full rounded-full ${bar}`} />
      </div>
    </div>
  );
}

// Bouton principal : pilule encre (tone="gold" : pilule dorée, sur fond sombre).
export function PrimaryButton({ children, className = '', tone = 'ink', ...props }) {
  const look = tone === 'gold' ? 'btn-gold font-extrabold' : 'bg-ink font-bold text-white hover:bg-brand-800';
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#dcd8cd] bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Tuile de statistique compacte (et filtre cliquable si onClick est fourni).
export function StatPill({ icon: Icon, label, value, tone = 'slate', active = false, onClick }) {
  const tones = {
    slate: 'bg-stone-100 text-stone-600',
    emerald: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-brand-50 text-brand-700',
    success: 'bg-emerald-50 text-emerald-700',
  };
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      variants={rise}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`${CARD} group relative flex flex-col items-start gap-3 overflow-hidden p-4 text-left transition-[border-color,box-shadow,transform] duration-200 ${onClick ? 'hover:-translate-y-0.5 hover:border-stone-300' : ''} ${active ? '!border-transparent ring-2 ring-brand-500' : ''}`}
    >
      {active && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-[#f6c768] to-[#ef8f5b]" aria-hidden="true" />}
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${tones[tone] || tones.slate}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="whitespace-nowrap font-figures text-[1.65rem] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</span>
      <span className="-mt-1 text-xs font-semibold leading-snug text-stone-500">{label}</span>
    </Tag>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <motion.div variants={rise} className={`${CARD} px-6 py-14 text-center`}>
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1efe8] text-stone-500">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-ledger text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-stone-500">{text}</p>
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`relative flex max-h-[92vh] supports-[height:100dvh]:max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem] ${maxWidth}`}
          >
            <div className="border-b border-[#efece4] px-6 py-5">
              <div className="flex items-center gap-4">
                {icon && <MagicIcon icon={icon} gradient={gradient} />}
                <div className="min-w-0 flex-1">
                  <h2 className="font-ledger text-2xl leading-tight text-ink">{title}</h2>
                  {subtitle && <p className="mt-0.5 truncate text-sm text-stone-500">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="rounded-full bg-[#f1efe8] p-2 text-stone-500 transition-colors hover:bg-[#e8e5dc] hover:text-slate-900" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-6">{children}</div>
            {footer && <div className="border-t border-[#efece4] bg-[#faf9f6] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] ${checked ? 'bg-brand-600' : 'bg-stone-300'}`}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

export function SectionCard({ icon, gradient, title, subtitle, children }) {
  return (
    <motion.section variants={rise} className={`${CARD} p-5 md:p-7`}>
      <header className="mb-6 flex items-center gap-3.5">
        <MagicIcon icon={icon} gradient={gradient} size="sm" />
        <div>
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}
