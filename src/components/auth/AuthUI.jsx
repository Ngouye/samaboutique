import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { ParticleField } from '../landing/Magic';

export const EASE = [0.16, 1, 0.3, 1];

// Champ à label flottant, icône animée et halo de focus. `dark` pour les fonds sombres.
export function Field({ id, label, icon: Icon, dark = false, right, className = '', ...inputProps }) {
  const tone = dark
    ? 'border-white/10 bg-white/[0.06] text-white focus:border-emerald-400 focus:bg-white/[0.09] focus:ring-emerald-400/15'
    : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-emerald-400 focus:bg-white focus:ring-emerald-500/15';
  const labelTone = dark
    ? 'text-white/45 peer-focus:text-emerald-300'
    : 'text-slate-400 peer-focus:text-emerald-600';
  return (
    <div className={`group relative ${className}`}>
      <input
        id={id}
        placeholder=" "
        className={`peer w-full rounded-2xl border-2 pb-2.5 pl-12 pr-12 pt-6 text-[15px] font-semibold outline-none ring-0 transition-all duration-300 focus:ring-4 disabled:opacity-60 ${tone}`}
        {...inputProps}
      />
      <Icon className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-all duration-300 group-focus-within:scale-110 ${dark ? 'text-white/40 group-focus-within:text-emerald-300' : 'text-slate-400 group-focus-within:text-emerald-500'}`} />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-12 top-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200
          peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal
          peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider ${labelTone}`}
      >
        {label}
      </label>
      {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
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
          className={`rounded-lg p-1.5 transition-colors ${props.dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      }
    />
  );
}

export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 6) score = 0;
  return { score, label: ['Trop court', 'Faible', 'Moyen', 'Bon', 'Excellent'][score] };
}

export function StrengthMeter({ password }) {
  const { score, label } = passwordStrength(password);
  if (!password) return null;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 px-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              initial={false}
              animate={{ width: score >= i ? '100%' : '0%' }}
              transition={{ duration: 0.4, ease: EASE }}
              className={`h-full rounded-full ${colors[score]}`}
            />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-slate-500">
        Robustesse : <span className="text-slate-800">{label}</span>
        {score < 3 && password.length >= 6 && <span className="font-normal"> — ajoutez majuscules, chiffres ou symboles</span>}
      </p>
    </motion.div>
  );
}

export function SubmitButton({ loading, success, children, loadingText, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={loading || success}
      className={`shine-btn group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 py-4 text-base font-bold text-white shadow-[0_12px_30px_-8px_rgba(16,185,129,0.6)] transition-shadow hover:shadow-[0_18px_40px_-8px_rgba(16,185,129,0.7)] disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {success ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">{success}</motion.span>
      ) : loading ? (
        <span className="flex items-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> {loadingText}
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}

export function ErrorBanner({ message, dark = false }) {
  if (!message) return null;
  return (
    <motion.div
      key={message}
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: [0, -10, 10, -6, 6, 0] }}
      transition={{ duration: 0.45 }}
      role="alert"
      className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold ${dark ? 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-rose-400/20' : 'bg-rose-100'}`}>!</span>
      {message}
    </motion.div>
  );
}

// Mise en page des pages d'authentification : panneau immersif à gauche, formulaire à droite.
export function AuthShell({ side, badge, title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#030a07] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora-blob aurora-1 -left-32 -top-32 h-[30rem] w-[30rem] bg-emerald-500/25" />
          <div className="aurora-blob aurora-2 -right-24 top-1/3 h-96 w-96 bg-cyan-500/15" />
          <div className="aurora-blob aurora-3 -bottom-24 left-1/4 h-80 w-80 bg-amber-400/10" />
          <div className="bg-grid-pattern absolute inset-0" />
          <ParticleField className="absolute inset-0 h-full w-full" density={45} />
        </div>
        <Link to="/" className="relative flex h-12 w-[112px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_0_30px_rgba(52,211,153,0.3)]">
          <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
        </Link>
        <div className="relative">{side}</div>
        <div className="relative flex flex-wrap gap-5 text-sm text-white/60">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Données sécurisées</span>
          <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-sky-400" /> Wave & Orange Money</span>
          <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-amber-300" /> Livraison suivie</span>
        </div>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
          <div className="aurora-blob aurora-1 -left-24 -top-24 h-72 w-72 bg-emerald-300/40" />
          <div className="aurora-blob aurora-2 -right-24 bottom-0 h-72 w-72 bg-cyan-200/50" />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="relative w-full max-w-md">
          <Link to="/" className="mb-8 flex h-14 w-[128px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 lg:hidden">
            <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
          </Link>
          {badge && (
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200">
              {badge}
            </motion.span>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}

// Carte flottante pour les panneaux décoratifs.
export function FloatingCard({ children, delay = 0, float = 10, duration = 6, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.8, ease: EASE }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -float, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
