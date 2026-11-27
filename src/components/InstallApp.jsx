// Bouton « Installer l'application » : ouvre la fenêtre d'installation du système quand le navigateur
// le permet (Android, Chrome, Edge), sinon explique comment faire (iPhone : Safari > Partager > Sur l'écran d'accueil).
// Masqué quand le site est déjà ouvert comme une application installée.
import React, { useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X, Check } from './dashboard/icons';
import { LogoMark } from './brand/Logo';
import { canPromptInstall, promptInstall, subscribeInstall, isStandalone, installPlatform } from '../utils/installPrompt';

const VARIANTS = {
  // Barre de navigation sombre de la page d'accueil
  nav: 'inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2.5 text-[14px] font-semibold text-white/85 ring-1 ring-white/15 transition-colors hover:bg-white/15 hover:text-white',
  // Bouton pleine largeur sur fond sombre (barre latérale, menus)
  glass: 'flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs font-bold text-white/85 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white',
  // Bouton pleine largeur sur fond clair
  light: 'flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-ink ring-1 ring-[#e8e5dc] transition-colors hover:ring-stone-300',
  // Lien discret
  link: 'inline-flex items-center gap-2 text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline',
  // Bouton doré
  gold: 'btn-gold inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold',
};

// Icône « Partager » de Safari (carré et flèche vers le haut)
function IosShareIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

const STEPS = {
  ios: [
    { title: 'Touchez le bouton Partager', text: 'Le carré avec une flèche, en bas de l’écran dans Safari.', icon: <IosShareIcon /> },
    { title: 'Choisissez « Sur l’écran d’accueil »', text: 'Faites défiler la liste vers le bas si besoin.' },
    { title: 'Touchez « Ajouter »', text: 'SamaBoutik apparaît avec vos autres applications.' },
  ],
  'ios-other': [
    { title: 'Ouvrez cette page dans Safari', text: 'Sur iPhone, l’installation se fait depuis Safari : copiez le lien et collez-le dans Safari.' },
    { title: 'Touchez le bouton Partager', text: 'Le carré avec une flèche, en bas de l’écran.', icon: <IosShareIcon /> },
    { title: 'Choisissez « Sur l’écran d’accueil »', text: 'Puis touchez « Ajouter ».' },
  ],
  android: [
    { title: 'Ouvrez le menu du navigateur', text: 'Les trois petits points, en haut à droite.' },
    { title: 'Touchez « Installer l’application »', text: 'Ou « Ajouter à l’écran d’accueil », selon le navigateur.' },
    { title: 'Confirmez', text: 'L’icône SamaBoutik apparaît sur votre écran d’accueil.' },
  ],
  desktop: [
    { title: 'Cliquez sur l’icône d’installation', text: 'À droite de la barre d’adresse, dans Chrome ou Edge.' },
    { title: 'Ou ouvrez le menu (les trois petits points)', text: 'Puis « Installer SamaBoutik » (parfois dans « Caster, enregistrer et partager »).' },
    { title: 'C’est prêt', text: 'SamaBoutik s’ouvre dans sa propre fenêtre, comme un logiciel.' },
  ],
};

function InstallHelp({ open, onClose }) {
  const platform = installPlatform(undefined, typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const steps = STEPS[platform];
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  // Affichée à la racine de la page : les barres sombres (flou, déplacement) enfermeraient sinon la fenêtre.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0a0820]/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative isolate w-full max-w-md overflow-hidden rounded-t-[2rem] bg-[#0c0a24] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-left text-white shadow-2xl ring-1 ring-white/10 sm:rounded-[2rem]"
          >
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
              <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-600/45 blur-[70px]" />
              <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-400/10 blur-[70px]" />
            </div>
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white" aria-label="Fermer"><X className="h-4 w-4" /></button>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/15"><LogoMark className="h-9 w-9" onDark /></span>
            <h2 id="install-title" className="mt-4 text-2xl font-extrabold tracking-tight">Installer SamaBoutik</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/60">Gratuit, sans passer par un magasin d’applications. Ouvrez-la ensuite d’un geste depuis votre écran d’accueil.</p>
            <ol className="mt-6 space-y-3">
              {steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-white/10">
                  <span className="btn-gold flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[15px] font-bold">{s.title}{s.icon && <span className="text-sky-300">{s.icon}</span>}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-white/55">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={onClose} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-extrabold">
              <Check className="h-4 w-4" strokeWidth={3} /> J’ai compris
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// Bandeau « Installez l'application » (style nuit), fermable : il ne revient pas une fois fermé.
export function InstallBanner({ storageKey, title, text }) {
  const [hidden, setHidden] = useState(() => {
    if (isStandalone()) return true;
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  if (hidden) return null;
  const close = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* mémoire du navigateur indisponible */ }
    setHidden(true);
  };
  return (
    <section aria-label="Installer l’application" className="relative isolate overflow-hidden rounded-[1.4rem] bg-[#0c0a24] p-4 text-white ring-1 ring-white/10">
      <div className="pointer-events-none absolute -right-10 -top-14 -z-10 h-40 w-40 rounded-full bg-brand-600/40 blur-3xl" aria-hidden="true" />
      <button type="button" onClick={close} className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Ne plus afficher"><X className="h-4 w-4" /></button>
      <div className="flex items-center gap-3 pr-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/15"><LogoMark className="h-7 w-7" onDark /></span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">{text}</p>
        </div>
      </div>
      <div className="mt-3"><InstallAppButton variant="gold" className="w-full" /></div>
    </section>
  );
}

export default function InstallAppButton({ variant = 'glass', label = 'Installer l’application', labelClassName = '', className = '' }) {
  const [, refresh] = useReducer((n) => n + 1, 0);
  useEffect(() => subscribeInstall(refresh), []);
  const [standalone] = useState(isStandalone);
  const [help, setHelp] = useState(false);
  if (standalone) return null;

  const onClick = async () => {
    if (canPromptInstall()) {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') setHelp(true);
    } else {
      setHelp(true);
    }
  };

  return (
    <>
      <button type="button" onClick={onClick} title={label} className={`${VARIANTS[variant] || VARIANTS.glass} ${className}`}>
        <Download className="h-4 w-4 shrink-0" />
        <span className={labelClassName}>{label}</span>
      </button>
      <InstallHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}
