// Chiffres qui défilent comme sur un compteur mécanique : à l'apparition, puis à chaque changement
// de valeur (ex. stock +1, nouvelle vente). Le nombre reste lisible par les lecteurs d'écran.
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROW = 1.15; // hauteur d'une ligne de chiffres, en em

function Digit({ digit, delay, reduce }) {
  return (
    <span aria-hidden="true" className="relative inline-block overflow-hidden align-baseline" style={{ height: `${ROW}em`, lineHeight: `${ROW}em` }}>
      <span className="invisible">0</span>
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={reduce ? false : { y: 0 }}
        animate={{ y: `${-digit * ROW}em` }}
        transition={{ type: 'spring', stiffness: 140, damping: 20, mass: 0.9, delay }}
      >
        {DIGITS.map((d) => <span key={d} style={{ height: `${ROW}em` }}>{d}</span>)}
      </motion.span>
    </span>
  );
}

export default function RollingNumber({ value, format = (n) => Math.round(n || 0).toLocaleString('fr-FR'), className = '' }) {
  const reduce = useReducedMotion();
  const text = format(value);
  const chars = text.split('');
  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i; // la clé suit la position depuis la droite : les unités restent les unités
        return /\d/.test(ch)
          ? <Digit key={`d${fromRight}`} digit={Number(ch)} delay={Math.min(i, 6) * 0.04} reduce={reduce} />
          : <span key={`s${fromRight}`} aria-hidden="true" style={{ whiteSpace: 'pre' }}>{ch}</span>;
      })}
    </span>
  );
}
