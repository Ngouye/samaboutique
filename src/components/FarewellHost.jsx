// Écran d'au revoir après une déconnexion, au-dessus de toute l'application (monté une fois dans App).
// Il couvre le passage vers la page de connexion, puis s'efface tout seul.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { onFarewell } from '../utils/farewell';
import { LogoMark } from './brand/Logo';
import { ShieldCheck, HandWaving } from './dashboard/icons';

const DURATION = 1700;

export default function FarewellHost() {
  const [info, setInfo] = useState(null);
  const reduce = useReducedMotion();

  useEffect(() => onFarewell((next) => setInfo({ ...next, key: Date.now() })), []);
  useEffect(() => {
    if (!info) return undefined;
    const t = setTimeout(() => setInfo(null), DURATION);
    return () => clearTimeout(t);
  }, [info]);

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          key={info.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden bg-[#0b0a26] px-6 text-white"
          role="status"
          aria-live="assertive"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="relative">
              <LogoMark className="h-16 w-16" onDark />
              <motion.span
                initial={{ rotate: 0 }}
                animate={reduce ? {} : { rotate: [0, 18, -8, 18, 0] }}
                transition={{ delay: 0.35, duration: 0.9 }}
                style={{ transformOrigin: '70% 80%' }}
                className="absolute -right-4 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-[#0b0a26] shadow-lg"
              >
                <HandWaving className="h-5 w-5" />
              </motion.span>
            </motion.div>
            <motion.h2 initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mt-7 font-ledger text-4xl leading-tight sm:text-5xl">
              À bientôt{info.name ? <>,<br className="sm:hidden" /> <span className="text-brand-300">{info.name}</span></> : ''}
            </motion.h2>
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-3 flex items-center gap-2 text-sm font-medium text-white/60">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Vous êtes déconnecté en toute sécurité
            </motion.p>
            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: DURATION / 1000, ease: 'linear' }} className="h-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-amber-400" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
