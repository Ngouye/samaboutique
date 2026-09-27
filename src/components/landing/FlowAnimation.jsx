import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useInView, useReducedMotion } from 'framer-motion';
import { ShoppingCart, Store, Scooter, Check } from 'lucide-react';

/*
 * Parcours d'une commande SamaBoutik : Client → Marchand → Livreur.
 * SVG + Framer Motion, sans dépendance supplémentaire. Deux dispositions :
 * horizontale (≥ 768 px) et verticale (mobile) pour garder les textes lisibles.
 */

const ACTORS = [
  { id: 'client', label: 'Client', sub: 'Commande', icon: ShoppingCart, color: '#38bdf8', deep: '#0c4a6e' },
  { id: 'merchant', label: 'Marchand', sub: 'Validation', icon: Store, color: '#34d399', deep: '#064e3b' },
  { id: 'driver', label: 'Livreur', sub: 'Livraison', icon: Scooter, color: '#fbbf24', deep: '#78350f' },
];

const CARD = 150; // côté des cartes (unités SVG)
const HALF = CARD / 2;

const LAYOUTS = {
  wide: {
    viewBox: '0 0 1000 400',
    nodes: [{ x: 170, y: 200 }, { x: 500, y: 170 }, { x: 830, y: 200 }],
    // Client → Marchand (arc vers le haut), Marchand → Livreur (arc vers le bas)
    paths: ['M 250 200 C 330 90, 380 90, 420 170', 'M 580 170 C 640 280, 700 290, 750 200'],
    font: 1,
  },
  tall: {
    viewBox: '0 0 400 1000',
    nodes: [{ x: 200, y: 110 }, { x: 200, y: 480 }, { x: 200, y: 850 }],
    paths: ['M 200 250 C 60 300, 60 360, 200 400', 'M 200 620 C 340 670, 340 730, 200 770'],
    font: 1.25,
  },
};

const STEPS = {
  order: 'Le client commande depuis la vitrine',
  validate: 'Le marchand valide la commande',
  ship: 'Le livreur récupère le colis et part',
  delivered: 'Livré : le client donne son code PIN',
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function useIsWide() {
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

// Faisceau : piste discrète, tracé qui se dessine, comète lumineuse et point qui suit la courbe.
function Beam({ d, progress, gradientId, glowId }) {
  const pathRef = useRef(null);
  const SEG = 0.14;
  const dashOffset = useTransform(progress, (p) => SEG - p);
  const point = (p, axis) => {
    const el = pathRef.current;
    if (!el) return -100;
    const pt = el.getPointAtLength(el.getTotalLength() * p);
    return axis === 'x' ? pt.x : pt.y;
  };
  const cx = useTransform(progress, (p) => point(p, 'x'));
  const cy = useTransform(progress, (p) => point(p, 'y'));
  const dotOpacity = useTransform(progress, [0, 0.02, 0.97, 1], [0, 1, 1, 0]);

  return (
    <g>
      <path ref={pathRef} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      <motion.path d={d} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" style={{ pathLength: progress }} opacity={0.55} />
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="7"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray={`${SEG} 2`}
        style={{ strokeDashoffset: dashOffset }}
        filter={`url(#${glowId})`}
      />
      <motion.circle r="7" fill="#fff" cx={cx} cy={cy} style={{ opacity: dotOpacity }} filter={`url(#${glowId})`} />
    </g>
  );
}

function Node({ actor, pos, index, active, badge, font }) {
  const Icon = actor.icon;
  const x = pos.x - HALF;
  const y = pos.y - HALF;
  return (
    <g>
      {/* Ombre au sol : se contracte quand la carte monte */}
      <motion.ellipse
        cx={pos.x}
        cy={pos.y + HALF + 34}
        rx={HALF * 0.85}
        ry="10"
        fill={actor.color}
        animate={{ opacity: [0.22, 0.1, 0.22], rx: [HALF * 0.85, HALF * 0.65, HALF * 0.85] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.7 }}
        style={{ filter: 'blur(8px)' }}
      />

      {/* Lévitation */}
      <motion.g animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.7 }}>
        {/* Halo : s'intensifie quand l'acteur est actif */}
        <motion.rect
          x={x - 6}
          y={y - 6}
          width={CARD + 12}
          height={CARD + 12}
          rx="40"
          fill={actor.color}
          animate={{ opacity: active ? 0.55 : 0.18 }}
          transition={{ duration: 0.5 }}
          style={{ filter: 'blur(22px)' }}
        />
        {/* Épaisseur (effet isométrique) */}
        <rect x={x} y={y + 12} width={CARD} height={CARD} rx="34" fill={actor.deep} />
        {/* Face */}
        <rect x={x} y={y} width={CARD} height={CARD} rx="34" fill={`url(#face-${actor.id})`} stroke={actor.color} strokeOpacity={active ? 0.9 : 0.35} strokeWidth="2" />
        <rect x={x + 10} y={y + 8} width={CARD - 20} height={CARD / 2.6} rx="24" fill="#fff" opacity="0.07" />

        {/* Onde de validation */}
        <AnimatePresence>
          {active && (
            <motion.rect
              key="pulse"
              x={x}
              y={y}
              width={CARD}
              height={CARD}
              rx="34"
              fill="none"
              stroke={actor.color}
              strokeWidth="2"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          )}
        </AnimatePresence>

        <motion.g
          animate={actor.id === 'driver' && active ? { x: [0, 6, -2, 0] } : { x: 0 }}
          transition={{ duration: 0.6, repeat: actor.id === 'driver' && active ? Infinity : 0 }}
        >
          <Icon x={pos.x - 32} y={pos.y - 32} size={64} color="#ffffff" strokeWidth={1.6} />
        </motion.g>

        {/* Badge de validation */}
        <AnimatePresence>
          {badge && (
            <motion.g
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle cx={x + CARD - 6} cy={y + 6} r="20" fill={actor.color} stroke="#030a07" strokeWidth="4" />
              <Check x={x + CARD - 18} y={y - 6} size={24} color="#030a07" strokeWidth={3.5} />
            </motion.g>
          )}
        </AnimatePresence>
      </motion.g>

      <text x={pos.x} y={pos.y + HALF + 70} textAnchor="middle" fill="#fff" fontSize={22 * font} fontWeight="800" fontFamily="Montserrat, sans-serif">
        {actor.label}
      </text>
      <text x={pos.x} y={pos.y + HALF + 70 + 26 * font} textAnchor="middle" fill={actor.color} fontSize={15 * font} fontWeight="600" letterSpacing="2" fontFamily="Poppins, sans-serif">
        {actor.sub.toUpperCase()}
      </text>
    </g>
  );
}

export default function FlowAnimation({ className = '' }) {
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { margin: '-80px' });
  const reduce = useReducedMotion();
  const wide = useIsWide();
  const layout = wide ? LAYOUTS.wide : LAYOUTS.tall;
  const progressA = useMotionValue(0);
  const progressB = useMotionValue(0);
  const [step, setStep] = useState('order');

  useEffect(() => {
    if (reduce) {
      progressA.set(1);
      progressB.set(1);
      setStep('delivered');
      return undefined;
    }
    if (!inView) return undefined;
    let cancelled = false;
    let controls = null;
    const run = async () => {
      while (!cancelled) {
        progressA.set(0);
        progressB.set(0);
        setStep('order');
        await wait(400);
        if (cancelled) break;
        controls = animate(progressA, 1, { duration: 1.8, ease: [0.65, 0, 0.35, 1] });
        await controls;
        if (cancelled) break;
        setStep('validate');
        await wait(1100);
        if (cancelled) break;
        setStep('ship');
        controls = animate(progressB, 1, { duration: 1.8, ease: [0.65, 0, 0.35, 1] });
        await controls;
        if (cancelled) break;
        setStep('delivered');
        await wait(1800);
      }
    };
    run();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [inView, reduce, progressA, progressB]);

  const activeId = { order: 'client', validate: 'merchant', ship: 'driver', delivered: 'driver' }[step];
  const badges = {
    client: step !== 'order',
    merchant: step === 'validate' || step === 'ship' || step === 'delivered',
    driver: step === 'delivered',
  };

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <svg viewBox={layout.viewBox} className="h-auto w-full overflow-visible" role="img" aria-label="Parcours d'une commande : le client commande, le marchand valide, le livreur livre.">
        <defs>
          {ACTORS.map((a) => (
            <linearGradient key={a.id} id={`face-${a.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0b1a14" stopOpacity="0.95" />
            </linearGradient>
          ))}
          <linearGradient id="beam-a" gradientUnits="userSpaceOnUse" x1={layout.nodes[0].x} y1={layout.nodes[0].y} x2={layout.nodes[1].x} y2={layout.nodes[1].y}>
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="beam-b" gradientUnits="userSpaceOnUse" x1={layout.nodes[1].x} y1={layout.nodes[1].y} x2={layout.nodes[2].x} y2={layout.nodes[2].y}>
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Beam d={layout.paths[0]} progress={progressA} gradientId="beam-a" glowId="beam-glow" />
        <Beam d={layout.paths[1]} progress={progressB} gradientId="beam-b" glowId="beam-glow" />

        {ACTORS.map((a, i) => (
          <Node key={a.id} actor={a} pos={layout.nodes[i]} index={i} active={activeId === a.id} badge={badges[a.id]} font={layout.font} />
        ))}
      </svg>

      <div className="mt-6 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: ACTORS.find((a) => a.id === activeId).color, boxShadow: `0 0 10px ${ACTORS.find((a) => a.id === activeId).color}` }} />
            {STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
