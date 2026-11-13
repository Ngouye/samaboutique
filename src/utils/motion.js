// Outils d'animation partagés : effets « souris » réservés aux ordinateurs, célébrations légères.
// Règle commune : rien ne bouge si l'utilisateur a demandé moins d'animations (réglage du téléphone
// ou de l'ordinateur), et les effets qui suivent le curseur sont coupés sur les écrans tactiles.
import { useEffect, useState } from 'react';
import { useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { BRAND } from './brand';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

// Vrai sur un ordinateur avec souris, quand les animations sont autorisées.
export function useFinePointer() {
  const reduce = useReducedMotion();
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(FINE_POINTER).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(FINE_POINTER);
    if (!mq) return undefined;
    const onChange = () => setFine(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return Boolean(fine) && !reduce;
}

// Inclinaison 3D qui suit le curseur (cartes). À poser sur un élément motion.* :
//   const tilt = useTilt(); <motion.div style={tilt.style} {...tilt.handlers}>
export function useTilt({ max = 7, glare = true } = {}) {
  const enabled = useFinePointer();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.5 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  if (!enabled) return { enabled, style: {}, handlers: {} };
  return {
    enabled,
    style: { rotateX, rotateY, transformPerspective: 900, ...(glare ? { '--glare-x': glareX, '--glare-y': glareY } : {}) },
    handlers: {
      onMouseMove: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      },
      onMouseLeave: () => { px.set(0.5); py.set(0.5); },
    },
  };
}

// Petite pluie de confettis aux couleurs de la marque, partant d'un élément (ex. bouton « Accepter »).
// La bibliothèque n'est chargée qu'au premier usage.
export async function celebrate(element, { particles = 70 } = {}) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    const r = element?.getBoundingClientRect?.();
    const origin = r
      ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
      : { x: 0.5, y: 0.6 };
    confetti({
      particleCount: particles, spread: 75, startVelocity: 30, gravity: 1.1, scalar: 0.85, ticks: 160, origin,
      colors: [BRAND.signature, BRAND.light, BRAND.gold, '#ffffff'], disableForReducedMotion: true, zIndex: 120,
    });
  } catch { /* décoratif : sans conséquence */ }
}
