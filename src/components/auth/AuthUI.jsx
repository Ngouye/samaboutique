import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CircleAlert, LoaderCircle, Check } from 'lucide-react';
import Logo from '../brand/Logo';

export const EASE = [0.16, 1, 0.3, 1];

// Champ de formulaire : label au-dessus, icône, aide ou erreur en dessous.
// `prefix` affiche un indicatif fixe (ex. +221) ; `dark` pour les fonds sombres.
export function Field({ id, label, icon: Icon, dark = false, right, prefix, hint, error, labelAside, className = '', ...inputProps }) {
  const invalid = Boolean(error);
  const base = dark
    ? 'border-white/15 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-brand-400 focus:ring-brand-400/20'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:ring-brand-600/15';
  const errorTone = dark ? 'border-rose-400/70 focus:border-rose-400 focus:ring-rose-400/20' : 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className={`text-sm font-semibold ${dark ? 'text-white/85' : 'text-slate-800'}`}>{label}</label>
        {labelAside}
      </div>
      <div className="relative">
        {Icon && (
          <Icon className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${invalid ? 'text-rose-500' : dark ? 'text-white/40' : 'text-slate-400'}`} />
        )}
        {prefix && (
          <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 border-r pr-3 text-[15px] font-semibold ${Icon ? 'left-10' : 'left-3.5'} ${dark ? 'border-white/15 text-white/70' : 'border-slate-200 text-slate-600'}`}>
            {prefix}
          </span>
        )}
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-xl border text-base sm:text-[15px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${invalid ? errorTone : base} ${prefix ? (Icon ? 'pl-[5.25rem]' : 'pl-[4.25rem]') : Icon ? 'pl-11' : 'pl-4'} ${right ? 'pr-12' : 'pr-4'}`}
          {...inputProps}
        />
        {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p key="error" id={`${id}-error`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-1.5 flex items-start gap-1.5 text-sm font-medium ${dark ? 'text-rose-300' : 'text-rose-600'}`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={`${id}-hint`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-1.5 text-sm ${dark ? 'text-white/50' : 'text-slate-500'}`}>
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      type={visible ? 'text' : 'password'}
      right={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${props.dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) score = 0;
  return { score, label: ['Trop court', 'Faible', 'Moyen', 'Bon', 'Excellent'][score] };
}

export function StrengthMeter({ password }) {
  const { score, label } = passwordStrength(password);
  if (!password) return null;
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-brand-500', 'bg-brand-600'];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <motion.div initial={false} animate={{ width: score >= i ? '100%' : '0%' }} transition={{ duration: 0.35, ease: EASE }} className={`h-full rounded-full ${colors[score]}`} />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Sécurité du mot de passe : <span className="font-semibold text-slate-800">{label}</span>
        {score < 3 && password.length >= 8 && ' · ajoutez majuscules, chiffres ou symboles'}
      </p>
    </motion.div>
  );
}

export function SubmitButton({ loading, success, children, loadingText, className = '', disabled = false, ...props }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading || Boolean(success)}
      className={`group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white shadow-[0_8px_20px_-10px_color-mix(in_srgb,_var(--color-ink)_70%,_transparent)] transition-all hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 active:scale-[0.99] disabled:cursor-not-allowed ${success ? 'bg-brand-700' : ''} ${loading ? 'opacity-80' : ''} ${className}`}
      {...props}
    >
      {success ? (
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">{success}</motion.span>
      ) : loading ? (
        <span className="flex items-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin" /> {loadingText}</span>
      ) : (
        children
      )}
    </button>
  );
}

// Message d'erreur (ou de réussite avec tone="success") en tête de formulaire.
export function ErrorBanner({ message, dark = false, tone = 'error' }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role={tone === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm font-medium ${
            tone === 'success'
              ? dark ? 'border-brand-400/30 bg-brand-400/10 text-brand-200' : 'border-brand-200 bg-brand-50 text-brand-800'
              : dark ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {tone === 'success' ? <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Divider({ children }) {
  return (
    <div className="my-7 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{children}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// Lien de l'en-tête (« Déjà inscrit ? Se connecter ») : sur téléphone, seul un bouton compact
// est affiché, sur une ligne ; la question complète revient sur les écrans plus larges.
export function HeaderLink({ prompt, to, children }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {prompt && <span className="hidden sm:inline">{prompt}</span>}
      <Link
        to={to}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50 sm:border-0 sm:bg-transparent sm:p-0 sm:text-sm sm:hover:bg-transparent sm:hover:underline"
      >
        {children}
      </Link>
    </span>
  );
}

// Pages d'authentification : formulaire à gauche, photo à droite (grand écran).
export function AuthShell({ title, subtitle, headerAction, photo, photoAlt, side, children }) {
  return (
    <div className="font-jakarta grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <main className="flex min-h-screen flex-col px-5 py-5 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center" aria-label="SamaBoutik, accueil">
            <Logo markClassName="h-9 w-9" textClassName="text-xl" />
          </Link>
          {headerAction && <div className="shrink-0 text-sm text-slate-500">{headerAction}</div>}
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-[420px]">
            <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} SamaBoutik</span>
          <span>Paiements sécurisés par PayDunya</span>
        </footer>
      </main>

      <aside className="relative hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] bg-ink">
          <motion.img
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
            src={photo}
            srcSet={photo?.endsWith('.webp') ? `${photo.replace(/\.webp$/, '-1024.webp')} 1024w, ${photo} 1400w` : undefined}
            sizes="50vw"
            alt={photoAlt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/35 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-10 text-white xl:p-14">{side}</div>
        </div>
      </aside>
    </div>
  );
}
