// Logo SamaBoutik (« Sama » = « ma » en wolof : « ma boutique »).
// Symbole sans arrière-plan : sac de boutique indigo marqué d'un « S » blanc, anse dorée et étincelle.
// Les couleurs viennent de src/utils/brand.js : changer la palette change aussi le logo.
import React, { useId } from 'react';
import { BRAND } from '../../utils/brand';

// onDark : sac un peu plus clair, pour bien ressortir sur un fond sombre.
export function LogoMark({ className = 'h-9 w-9', title, onDark = false }) {
  const uid = useId().replace(/:/g, '');
  const bag = `sb-bag-${uid}`;
  const gold = `sb-gold-${uid}`;
  const stops = onDark ? ['#aea6f7', BRAND.light, BRAND.vivid] : [BRAND.vivid, BRAND.signature, '#2a2580'];
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 overflow-visible ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={bag} x1="12" y1="20" x2="50" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="0.6" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
        <linearGradient id={gold} x1="22" y1="9" x2="42" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor={BRAND.gold} />
        </linearGradient>
      </defs>
      <path d="M22 25v-6a10 10 0 0 1 20 0v6" fill="none" stroke={`url(#${gold})`} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M12 22.5h40l3 30a6.5 6.5 0 0 1-6.47 7.15H15.47A6.5 6.5 0 0 1 9 52.5z" fill={`url(#${bag})`} />
      <path d="M12 22.5h40l.42 4.2H11.58z" fill="#000" opacity="0.18" />
      <path
        transform="translate(32 42.6) scale(1.38) translate(-32 -38.6)"
        d="M37.2 31.6c-1.4-1.3-3.2-1.9-5.3-1.9-3.4 0-5.7 1.8-5.7 4.3 0 5.8 11.6 3.1 11.6 8.6 0 2.6-2.5 4.3-6 4.3-2.6 0-4.7-.9-6.1-2.4"
        fill="none" stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M54.5 5.5l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9-3.9-1.5 3.9-1.5z" fill={onDark ? '#fde68a' : BRAND.gold} />
    </svg>
  );
}

// Logo complet : symbole + nom. variant « light » sur fond clair, « dark » sur fond sombre.
export default function Logo({ variant = 'light', className = '', markClassName = 'h-9 w-9', textClassName = 'text-xl', showText = true }) {
  const dark = variant === 'dark';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} onDark={dark} title={showText ? undefined : 'SamaBoutik'} />
      {showText && (
        <span className={`whitespace-nowrap font-extrabold leading-none tracking-[-0.035em] ${textClassName}`}>
          <span className={dark ? 'text-white' : 'text-ink'}>Sama</span>
          <span className={dark ? 'text-brand-300' : 'text-brand-700'}>Boutik</span>
        </span>
      )}
    </span>
  );
}
