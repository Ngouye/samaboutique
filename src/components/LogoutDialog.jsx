// Confirmation de déconnexion : feuille qui monte du bas sur téléphone, fenêtre centrée sur ordinateur.
// « Rester connecté » est le choix par défaut (Échap ou toucher le fond). Option : déconnecter aussi les autres appareils.
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, LoaderCircle, Devices } from './dashboard/icons';

export default function LogoutDialog({ name, detail, avatarUrl, consequence, allowEverywhere = false, tone = 'light', onCancel, onConfirm }) {
  const [everywhere, setEverywhere] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const stayRef = useRef(null);
  const dark = tone === 'dark';

  useEffect(() => {
    stayRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !leaving) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, leaving]);

  const confirm = async () => {
    setLeaving(true);
    try {
      await onConfirm({ everywhere });
    } catch {
      setLeaving(false);
    }
  };

  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0b0a26]/60 backdrop-blur-sm" onClick={() => !leaving && onCancel()} />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-text"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className={`relative w-full overflow-hidden rounded-t-[1.75rem] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-w-sm sm:rounded-[1.75rem] sm:pb-6 sm:pt-6 ${dark ? 'bg-[#14132e] text-white ring-1 ring-white/10' : 'bg-white text-ink'}`}
      >
        <div className={`mx-auto mb-4 h-1.5 w-10 rounded-full sm:hidden ${dark ? 'bg-white/15' : 'bg-black/10'}`} aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col items-center text-center">
          <span className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className={`h-16 w-16 rounded-2xl object-cover ring-4 ${dark ? 'ring-white/10' : 'ring-brand-50'}`} />
            ) : (
              <span className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold ring-4 ${dark ? 'bg-white/10 text-white ring-white/5' : 'bg-gradient-to-br from-brand-600 to-brand-800 text-white ring-brand-50'}`}>{initial}</span>
            )}
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 16 }}
              className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white ring-[3px] ${dark ? 'ring-[#14132e]' : 'ring-white'}`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </motion.span>
          </span>

          <h2 id="logout-title" className="mt-5 font-ledger text-2xl">Se déconnecter ?</h2>
          {(name || detail) && (
            <p className={`mt-1 max-w-full truncate text-sm font-semibold ${dark ? 'text-white/70' : 'text-stone-600'}`}>
              {name}{name && detail ? ' · ' : ''}<span className="font-normal">{detail}</span>
            </p>
          )}
          {consequence && <p id="logout-text" className={`mt-3 text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-stone-500'}`}>{consequence}</p>}
        </div>

        {allowEverywhere && (
          <button
            type="button"
            role="switch"
            aria-checked={everywhere}
            disabled={leaving}
            onClick={() => setEverywhere((v) => !v)}
            className={`relative mt-5 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${dark ? 'bg-white/5 hover:bg-white/10' : 'bg-[#f7f6f2] hover:bg-[#f1efe8]'}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dark ? 'bg-white/10 text-white' : 'bg-white text-brand-700 ring-1 ring-black/5'}`}><Devices className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Aussi sur mes autres appareils</span>
              <span className={`block text-xs ${dark ? 'text-white/50' : 'text-stone-500'}`}>Téléphone perdu, ordinateur partagé : tout fermer</span>
            </span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${everywhere ? 'bg-red-500' : dark ? 'bg-white/15' : 'bg-stone-300'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${everywhere ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>
        )}

        <div className="relative mt-6 grid gap-2.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={confirm}
            disabled={leaving}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition-colors hover:bg-red-700 disabled:opacity-80"
          >
            {leaving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Déconnexion…</> : <><LogOut className="h-4 w-4" /> {everywhere ? 'Déconnecter tous mes appareils' : 'Se déconnecter'}</>}
          </motion.button>
          <button
            ref={stayRef}
            type="button"
            onClick={onCancel}
            disabled={leaving}
            className={`min-h-12 rounded-2xl px-4 text-sm font-bold transition-colors disabled:opacity-50 ${dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-[#f1efe8] text-ink hover:bg-[#e8e5dc]'}`}
          >
            Rester connecté
          </button>
        </div>
      </motion.div>
    </div>
  );
}
