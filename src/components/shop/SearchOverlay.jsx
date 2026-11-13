// Recherche plein écran de la vitrine : résultats immédiats (sans accents ni majuscules),
// recherches récentes, catégories et nouveautés quand le champ est vide.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, ArrowLeft, History, ChevronRight, Sparkles } from '../dashboard/icons';
import { thumbUrl, fallbackToFull } from '../../utils/imageUpload';
import { searchProducts } from '../../utils/searchText';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const readRecent = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; } };
const writeRecent = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* stockage bloqué */ } };

function ResultRow({ product, onOpen, categoryIcon }) {
  const out = typeof product.stock === 'number' && product.stock <= 0;
  return (
    <button type="button" onClick={onOpen} className="sh-hover sh-r-md group flex w-full items-center gap-3 p-2 text-left">
      <span className="sh-fill sh-r-sm h-14 w-14 shrink-0 overflow-hidden">
        {product.image_url ? (
          <img src={thumbUrl(product.image_url)} onError={fallbackToFull(product.image_url)} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover ${out ? 'grayscale' : ''}`} />
        ) : (
          <span className="theme-text flex h-full items-center justify-center">{React.createElement(categoryIcon(product.category || 'Autres'), { className: 'h-6 w-6' })}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sh-ink block truncate text-sm font-bold">{product.name}</span>
        <span className="sh-muted block truncate text-xs">{product.category || 'Autres'}{out ? ' · Épuisé' : ''}</span>
      </span>
      <span className="theme-text shrink-0 text-sm font-extrabold">{fmt(product.price_fcfa)} F</span>
      <ChevronRight className="sh-faint h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function SearchOverlay({ initialQuery = '', products, categories, recentKey, categoryIcon, onClose, onOpenProduct, onShowResults, onPickCategory }) {
  const [query, setQuery] = useState(initialQuery);
  const [recent, setRecent] = useState(() => readRecent(recentKey));
  const inputRef = useRef(null);

  useEffect(() => {
    const focus = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(focus); window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const found = useMemo(() => (query.trim() ? searchProducts(products, query) : []), [products, query]);
  const remember = (q) => {
    const v = q.trim();
    if (!v) return;
    const next = [v, ...recent.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6);
    setRecent(next);
    writeRecent(recentKey, next);
  };
  const showResults = () => { remember(query); onShowResults(query.trim()); };
  const open = (p) => { remember(query); onOpenProduct(p); };
  const clearRecent = () => { setRecent([]); writeRecent(recentKey, []); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="sh-bg sh-ink fixed inset-0 z-[90] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher dans la boutique"
    >
      <motion.form
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={(e) => { e.preventDefault(); showResults(); }}
        role="search"
        className="sh-header sh-line flex shrink-0 items-center gap-2 border-b px-3 py-3 sm:px-6"
      >
        <button type="button" onClick={onClose} className="sh-hover sh-r-sm flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Fermer la recherche">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative mx-auto w-full max-w-2xl">
          <Search className="sh-faint pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Robe, sac, parfum…"
            className="sh-search w-full py-3 pl-12 pr-11 text-base font-medium [&::-webkit-search-cancel-button]:hidden"
            aria-label="Rechercher un produit"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="sh-fill absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full" aria-label="Effacer la recherche">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="hidden w-11 shrink-0 sm:block" aria-hidden="true" />
      </motion.form>

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 sm:px-6">
          {!query.trim() ? (
            <>
              {recent.length > 0 && (
                <section className="mb-7">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="sh-muted text-xs font-bold uppercase tracking-widest">Recherches récentes</p>
                    <button type="button" onClick={clearRecent} className="sh-muted min-h-9 px-2 text-xs font-semibold hover:underline">Effacer</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} type="button" onClick={() => setQuery(r)} className="sh-chip sh-r-sm inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold">
                        <History className="sh-faint h-4 w-4" /> {r}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {categories.length > 1 && (
                <section className="mb-7">
                  <p className="sh-muted mb-2.5 text-xs font-bold uppercase tracking-widest">Catégories</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((c, i) => (
                      <motion.button
                        key={c.name}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.03 }}
                        onClick={() => onPickCategory(c.name)}
                        className="sh-card sh-card-hover flex items-center gap-3 p-3 text-left"
                      >
                        <span className="theme-soft theme-text sh-r-sm flex h-10 w-10 shrink-0 items-center justify-center">{React.createElement(categoryIcon(c.name), { className: 'h-5 w-5' })}</span>
                        <span className="min-w-0">
                          <span className="sh-ink block truncate text-sm font-bold">{c.name}</span>
                          <span className="sh-faint block text-[11px]">{c.count} article{c.count > 1 ? 's' : ''}</span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {products.length > 0 && (
                <section>
                  <p className="sh-muted mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"><Sparkles className="theme-text h-4 w-4" /> Nouveautés</p>
                  {products.slice(0, 4).map((p) => <ResultRow key={p.id} product={p} onOpen={() => open(p)} categoryIcon={categoryIcon} />)}
                </section>
              )}
            </>
          ) : found.length ? (
            <>
              <p className="sh-muted mb-1.5 text-xs font-bold uppercase tracking-widest" aria-live="polite">{found.length} résultat{found.length > 1 ? 's' : ''}</p>
              {found.slice(0, 8).map((p) => <ResultRow key={p.id} product={p} onOpen={() => open(p)} categoryIcon={categoryIcon} />)}
              {found.length > 1 && (
                <button type="button" onClick={showResults} className="theme-gradient theme-glow sh-r-md mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold">
                  Voir les {found.length} résultats dans le catalogue <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <div className="py-14 text-center" aria-live="polite">
              <span className="theme-soft theme-text sh-r-md mx-auto mb-4 flex h-16 w-16 items-center justify-center"><Search className="h-7 w-7" /></span>
              <p className="sh-ink font-bold">Aucun résultat pour « {query.trim()} »</p>
              <p className="sh-muted mt-1 text-sm">Vérifiez l’orthographe, ou parcourez les catégories.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
