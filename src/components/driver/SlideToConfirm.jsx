import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowRight, ShieldCheck } from '../dashboard/icons';

const KNOB = 52;
const PAD = 4;

// Bouton « glisser pour valider », comme dans les applications de livraison :
// évite les validations par erreur dans la poche. Un appui ou la touche Entrée marchent aussi.
export default function SlideToConfirm({ label, shortLabel = label, ariaLabel = label, onConfirm, icon: Icon = ShieldCheck }) {
  const trackRef = useRef(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(0, width - KNOB - PAD * 2);
  const labelOpacity = useTransform(x, [0, Math.max(1, max * 0.55)], [1, 0]);
  const fillWidth = useTransform(x, (v) => v + KNOB + PAD * 2);

  const confirm = () => {
    onConfirm();
    animate(x, 0, { type: 'spring', stiffness: 380, damping: 30, delay: 0.35 });
  };
  const onDragEnd = () => {
    if (max && x.get() >= max * 0.72) {
      animate(x, max, { duration: 0.12 });
      confirm();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 32 });
    }
  };

  return (
    <div ref={trackRef} className="relative h-[60px] touch-pan-y select-none overflow-hidden rounded-full bg-brand-50 ring-1 ring-inset ring-brand-200">
      <motion.div aria-hidden="true" style={{ width: fillWidth }} className="absolute inset-y-0 left-0 rounded-full bg-brand-100" />
      <motion.span aria-hidden="true" style={{ opacity: labelOpacity }} className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 whitespace-nowrap pl-14 pr-3 text-sm font-bold text-brand-800">
        <span className="min-[400px]:hidden">{shortLabel}</span>
        <span className="hidden min-[400px]:inline">{label}</span>
        <ArrowRight className="h-4 w-4 shrink-0 animate-pulse" />
      </motion.span>
      <motion.button
        type="button"
        aria-label={ariaLabel}
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.04}
        dragMomentum={false}
        style={{ x, width: KNOB, height: KNOB, top: PAD, left: PAD }}
        onDragEnd={onDragEnd}
        onTap={confirm}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            confirm();
          }
        }}
        whileTap={{ scale: 0.96 }}
        className="absolute z-10 flex cursor-grab items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_20px_-8px_color-mix(in_srgb,_var(--color-ink)_80%,_transparent)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
      >
        <Icon className="h-[22px] w-[22px]" />
      </motion.button>
    </div>
  );
}
