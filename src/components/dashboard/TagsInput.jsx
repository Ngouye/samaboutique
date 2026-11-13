import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, X } from './icons';

// Mots-clés du produit (utilisés par la recherche de la vitrine).
export function TagsInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !value.includes(tag) && value.length < 12) onChange([...value, tag.slice(0, 40)]);
    setDraft('');
  };
  return (
    <div className="flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
      <AnimatePresence initial={false}>
        {value.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-200"
          >
            <Hash className="h-3 w-3 opacity-60" />
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 hover:bg-brand-100" aria-label={`Retirer ${tag}`}>
              <X className="h-3 w-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? 'Ajouter…' : 'Ex : boubou, tabaski, bazin'}
        className="min-h-9 min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-base outline-none placeholder:text-slate-400 md:text-sm"
      />
    </div>
  );
}
