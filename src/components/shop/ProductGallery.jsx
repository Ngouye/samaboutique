// Galerie de la fiche produit : on fait glisser les photos du doigt ; flèches et miniatures sur ordinateur.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package } from '../dashboard/icons';

const slide = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0, opacity: dir ? 1 : 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 1 }),
};

export default function ProductGallery({ images, alt }) {
  const [[index, dir], setState] = useState([0, 0]);
  const count = images.length;
  const go = (d) => { if (count > 1) setState(([i]) => [(i + d + count) % count, d]); };
  const show = (i) => setState(([cur]) => [i, i > cur ? 1 : -1]);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 md:max-w-md">
      <div className="sh-r-md group relative w-full overflow-hidden shadow-xl" aria-roledescription="carrousel" aria-label={`Photos de ${alt}`}>
        {count === 0 ? (
          <div className="theme-soft theme-text flex aspect-[4/5] max-h-[50vh] w-full items-center justify-center md:max-h-none"><Package className="h-24 w-24" /></div>
        ) : (
          <div className="relative aspect-[4/5] max-h-[50vh] w-full md:max-h-none">
            <AnimatePresence initial={false} custom={dir}>
              <motion.img
                key={images[index]}
                src={images[index]}
                alt={count > 1 ? `${alt} (photo ${index + 1} sur ${count})` : alt}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 34 }}
                drag={count > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50 || info.velocity.x < -400) go(1);
                  else if (info.offset.x > 50 || info.velocity.x > 400) go(-1);
                }}
                draggable={false}
                decoding="async"
                className={`absolute inset-0 h-full w-full select-none object-cover ${count > 1 ? 'cursor-grab touch-pan-y active:cursor-grabbing' : ''}`}
              />
            </AnimatePresence>
          </div>
        )}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:flex" aria-label="Photo précédente">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow-md backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:flex" aria-label="Photo suivante">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur" aria-hidden="true">{index + 1}/{count}</span>
            <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1.5 backdrop-blur" aria-hidden="true">
              {images.map((img, i) => <span key={img} className={`h-1.5 rounded-full bg-white transition-all duration-300 ${i === index ? 'w-5' : 'w-1.5 opacity-60'}`} />)}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="scrollbar-hide flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
          {images.map((img, i) => (
            <button key={img} type="button" onClick={() => show(i)} aria-label={`Voir la photo ${i + 1}`} aria-current={i === index} className={`sh-r-sm h-14 w-14 shrink-0 overflow-hidden ring-2 transition-all ${i === index ? 'scale-105 ring-[color:var(--shop)]' : 'opacity-70 ring-transparent hover:opacity-100'}`}>
              <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
