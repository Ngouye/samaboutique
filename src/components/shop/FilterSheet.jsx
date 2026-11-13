// Filtrer et trier le catalogue : tri, tranches de prix (ou montants libres), produits en stock.
// Le bouton du bas annonce combien de produits correspondent avant d'appliquer.
import React, { useState } from 'react';
import ShopSheet from './ShopSheet';
import { SlidersHorizontal, Check } from '../dashboard/icons';
import { priceBuckets, NO_FILTERS } from '../../utils/searchText';

const toAmount = (v) => {
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

export default function FilterSheet({ filters, sortBy, sorts, prices, countFor, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const [sort, setSort] = useState(sortBy);
  const buckets = priceBuckets(prices);
  const count = countFor(draft);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <ShopSheet
      title="Filtrer et trier"
      icon={SlidersHorizontal}
      onClose={onClose}
      footer={(
        <div className="flex gap-3">
          <button type="button" onClick={() => { setDraft(NO_FILTERS); setSort('newest'); }} className="sh-chip sh-r-md px-4 py-3.5 text-sm font-bold">
            Tout effacer
          </button>
          <button type="button" onClick={() => onApply(draft, sort)} disabled={count === 0} className="theme-gradient theme-glow sh-r-md flex-1 py-3.5 text-sm font-bold disabled:opacity-50">
            {count ? `Voir ${count} produit${count > 1 ? 's' : ''}` : 'Aucun produit'}
          </button>
        </div>
      )}
    >
      <fieldset className="mb-6">
        <legend className="mb-2.5 text-sm font-bold">Trier par</legend>
        <div className="grid grid-cols-2 gap-2">
          {sorts.map((s) => (
            <button key={s.id} type="button" onClick={() => setSort(s.id)} aria-pressed={sort === s.id} className={`sh-r-md flex items-center justify-between gap-2 px-3.5 py-3 text-left text-sm font-bold transition-colors ${sort === s.id ? 'theme-gradient' : 'sh-chip'}`}>
              {s.full || s.label}
              {sort === s.id && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2.5 text-sm font-bold">Prix</legend>
        {buckets.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {buckets.map((b) => {
              const active = draft.minPrice === b.min && draft.maxPrice === b.max;
              return (
                <button key={b.id} type="button" aria-pressed={active} onClick={() => set(active ? { minPrice: null, maxPrice: null } : { minPrice: b.min, maxPrice: b.max })} className={`sh-r-sm px-3.5 py-2 text-sm font-semibold transition-colors ${active ? 'theme-gradient' : 'sh-chip'}`}>
                  {b.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="shop-label">Minimum (F)</span>
            <input type="text" inputMode="numeric" placeholder="0" value={draft.minPrice ?? ''} onChange={(e) => set({ minPrice: toAmount(e.target.value) })} className="shop-input" />
          </label>
          <label className="block">
            <span className="shop-label">Maximum (F)</span>
            <input type="text" inputMode="numeric" placeholder="Sans limite" value={draft.maxPrice ?? ''} onChange={(e) => set({ maxPrice: toAmount(e.target.value) })} className="shop-input" />
          </label>
        </div>
      </fieldset>

      <button type="button" role="switch" aria-checked={draft.inStock} onClick={() => set({ inStock: !draft.inStock })} className="sh-fill sh-r-md flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span>
          <span className="block text-sm font-bold">En stock uniquement</span>
          <span className="sh-muted block text-xs">Masquer les produits épuisés</span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${draft.inStock ? 'theme-gradient' : 'bg-slate-300/70'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${draft.inStock ? 'translate-x-6' : 'translate-x-1'}`} />
        </span>
      </button>
    </ShopSheet>
  );
}
