import React from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink } from 'lucide-react';
import { SHOP_THEMES } from '../shop/themes';

// Choix du thème de la vitrine : mini-aperçu (photo, police, couleurs) de chacun des 6 thèmes.
// Choisir un thème applique aussi sa couleur principale, que le marchand peut ensuite modifier.
export default function ThemePicker({ value, onChange, shopUrl }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3" role="radiogroup" aria-label="Thème de la vitrine">
      {SHOP_THEMES.map((t) => {
        const active = value === t.id;
        return (
          <div key={t.id} className={`group relative overflow-hidden rounded-2xl border-2 bg-white transition-colors ${active ? 'border-emerald-600' : 'border-slate-200 hover:border-slate-300'}`}>
            <motion.button
              type="button"
              role="radio"
              aria-checked={active}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(t)}
              className="block w-full text-left"
            >
              <span className="relative block h-24 overflow-hidden sm:h-28" style={{ background: t.preview.panel }}>
                <img src={`/images/themes/${t.id}-640.webp`} alt="" loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${t.light ? '' : 'opacity-60'}`} />
                <span
                  className="absolute inset-0"
                  style={{ background: t.light ? `linear-gradient(90deg, ${t.preview.bg} 15%, transparent 85%)` : `linear-gradient(110deg, ${t.preview.panel} 10%, transparent 90%)` }}
                />
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                  <span
                    className="truncate text-lg leading-none sm:text-xl"
                    style={{
                      fontFamily: `'${t.font}', serif`,
                      fontStyle: t.fontStyle || 'normal',
                      fontWeight: t.font === 'DM Serif Display' ? 400 : 700,
                      textTransform: t.uppercase ? 'uppercase' : 'none',
                      color: t.light ? t.preview.ink : '#ffffff',
                    }}
                  >
                    {t.name}
                  </span>
                  <span className="hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline" style={{ background: t.accent, color: t.id === 'minuit' ? '#111' : '#fff' }}>
                    Acheter
                  </span>
                </span>
                {active && (
                  <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="block px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: t.accent }} />
                  <span className="truncate font-bold text-slate-900">{t.name}</span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{t.style}</span>
                <span className="mt-1 block text-xs font-semibold leading-snug text-slate-700">Idéal : {t.idealFor}</span>
              </span>
            </motion.button>
            {shopUrl && (
              <a
                href={`${shopUrl}?theme=${t.id}`}
                target="_blank"
                rel="noreferrer"
                className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
              >
                Aperçu <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
