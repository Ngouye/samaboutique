// Panneau de la vitrine : feuille qui monte du bas sur téléphone (on la ferme en la glissant vers le bas),
// fenêtre centrée sur ordinateur. Aux couleurs du thème de la boutique.
import React, { useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X } from '../dashboard/icons';

export default function ShopSheet({ title, icon: Icon, onClose, children, footer }) {
  const drag = useDragControls();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) onClose(); }}
        className="sh-surface sh-ink relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[var(--shop-r-lg)] shadow-2xl supports-[height:100dvh]:max-h-[88dvh] sm:max-w-md sm:rounded-[var(--shop-r-lg)]"
      >
        <div onPointerDown={(e) => drag.start(e)} className="shrink-0 cursor-grab touch-none active:cursor-grabbing">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-current opacity-15 sm:hidden" aria-hidden="true" />
          <div className="flex items-center gap-3 px-5 pb-3 pt-3 sm:pt-5">
            {Icon && <span className="theme-soft theme-text sh-r-sm flex h-10 w-10 shrink-0 items-center justify-center"><Icon className="h-5 w-5" /></span>}
            <h2 className="sh-display min-w-0 flex-1 text-xl">{title}</h2>
            <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} className="sh-fill flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 scrollbar-hide">{children}</div>
        {footer && <div className="sh-line shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>}
      </motion.div>
    </div>
  );
}
