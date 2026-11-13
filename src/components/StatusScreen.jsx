// Écran plein aux couleurs de SamaBoutik : page introuvable, boutique introuvable, chargement impossible.
// actions : [{ label, icon, to } ou { label, icon, onClick }], la première avec primary: true est mise en avant.
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import Logo from './brand/Logo';

const EASE = [0.16, 1, 0.3, 1];
const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300';
const PRIMARY = `${BUTTON} bg-brand-400 font-extrabold text-night shadow-lg shadow-brand-400/20 hover:bg-brand-300`;
const SECONDARY = `${BUTTON} border border-white/15 bg-white/5 font-bold text-white hover:bg-white/10`;

function Action({ label, icon: Icon, to, onClick, primary }) {
  const content = <>{Icon && <Icon className="h-4 w-4" aria-hidden="true" />}{label}</>;
  const className = primary ? PRIMARY : SECONDARY;
  return to
    ? <Link to={to} className={className}>{content}</Link>
    : <button type="button" onClick={onClick} className={className}>{content}</button>;
}

export default function StatusScreen({ icon: Icon, code, kicker, title, children, actions = [], footer }) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-night text-white">
        {/* Lueurs, quadrillage et grand code en filigrane */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,_var(--color-brand-500)_22%,_transparent),transparent_70%),radial-gradient(40%_35%_at_100%_100%,rgba(245,158,11,0.10),transparent_70%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_42%,black,transparent)]" />
        {code && (
          <motion.p
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ease: EASE, duration: 1.2 }}
            className="pointer-events-none absolute left-1/2 top-[46%] -z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[44vw] font-black leading-none tracking-tighter text-transparent [-webkit-text-stroke:1.5px_color-mix(in_srgb,_var(--color-brand-400)_24%,_transparent)] sm:text-[30vw] lg:text-[22rem]"
          >
            {code}
          </motion.p>
        )}

        <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 lg:px-8">
          <Link to="/" aria-label="SamaBoutik, accueil" className="flex items-center transition hover:scale-[1.03]">
            <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-xl" />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-20 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: EASE, duration: 0.7 }}
            className="w-full max-w-xl text-center"
          >
            {Icon && (
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-400/25 bg-brand-400/10 text-brand-300 shadow-[0_0_40px_color-mix(in_srgb,_var(--color-brand-400)_25%,_transparent)]">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
            )}
            {kicker && <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand-300/85">{kicker}</p>}
            <h1 className="mt-3 text-balance break-words text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
            {children && <div className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-white/65">{children}</div>}
            {actions.length > 0 && (
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                {actions.map((a) => <Action key={a.label} {...a} />)}
              </div>
            )}
            {footer && <p className="mt-8 text-sm text-white/50 [&_a]:font-bold [&_a]:text-brand-300 [&_a:hover]:text-brand-200">{footer}</p>}
          </motion.div>
        </div>
      </main>
    </MotionConfig>
  );
}
