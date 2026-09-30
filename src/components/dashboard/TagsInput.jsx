import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, X } from 'lucide-react';

// Mots-clés du produit (utilisés par la recherche de la vitrine).
export function TagsInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().toLowerCase();
    if (tag && !value.includes(tag) && value.length < 12) onChange([...value, tag.slice(0, 40)]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
      <AnimatePresence initial={false}>
        {value.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 px-2 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200"
          >
            <Hash className="h-3 w-3 opacity-60" />
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 hover:bg-violet-100" aria-label={`Retirer ${tag}`}>
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
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
