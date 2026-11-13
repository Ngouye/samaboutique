// Assistant IA de la fiche produit :
//  - « Remplir la fiche » : Claude regarde la photo et propose nom, description, catégorie, mots-clés,
//    caractéristiques. Le commerçant relit et corrige avant d'enregistrer.
//  - « Photo studio » : Photoroom pose le vrai produit sur un fond studio ou un décor.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, LoaderCircle, Check, X, CircleAlert, Camera } from './icons';
import { aiRequest, photoToDataUrl, dataUrlToFile } from '../../utils/aiAssistant';

const STYLES = [
  { id: 'studio', label: 'Studio blanc', swatch: 'linear-gradient(135deg, #ffffff, #e9e7f5)' },
  { id: 'marbre', label: 'Marbre', swatch: 'linear-gradient(135deg, #f4f4f2, #d9d6cf 60%, #ffffff)' },
  { id: 'bois', label: 'Bois & plantes', swatch: 'linear-gradient(135deg, #c99a6b, #7c5a3c 60%, #5d7b4f)' },
  { id: 'wax', label: 'Tissu wax', swatch: 'conic-gradient(from 45deg, #e8a33d, #3b2fc9, #d6001c, #1baf7a, #e8a33d)' },
];

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

const TEASER_KEY = 'samaboutik-ai-teaser-hidden';

// Bandeau de la page Produits : fait connaître l'assistant, qui n'apparaît sinon que dans la fiche produit.
export function AiTeaser({ onTry }) {
  const [enabled, setEnabled] = useState(null); // { product_sheet, studio_photo } ou false
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(TEASER_KEY) === '1'; } catch { return false; } });

  useEffect(() => {
    if (hidden) return undefined;
    let alive = true;
    aiRequest('quota').then((d) => alive && setEnabled(d.enabled || false)).catch(() => alive && setEnabled(false));
    return () => { alive = false; };
  }, [hidden]);

  const active = enabled && (enabled.product_sheet || enabled.studio_photo);
  // Les commerçants ne voient le bandeau que si l'assistant marche ; en local, on le montre aussi pour expliquer.
  if (hidden || enabled === null || (!active && !import.meta.env.DEV)) return null;
  const sheet = !active || enabled.product_sheet;
  const studio = !active || enabled.studio_photo;
  const close = () => { setHidden(true); try { localStorage.setItem(TEASER_KEY, '1'); } catch { /* stockage bloqué */ } };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-amber-50/70 p-4 pr-12 sm:flex-row sm:items-center sm:p-5 sm:pr-14">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25"><Sparkles className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">Assistant IA</p>
        <p className="mt-0.5 text-sm text-stone-600">
          Ajoutez la photo d’un produit :
          {sheet && ' l’IA rédige la fiche (nom, description, caractéristiques, mots-clés)'}
          {sheet && studio && ' et'}
          {studio && ' pose votre produit sur un fond studio'}
          . Aussi disponible avec le crayon d’un produit existant.
        </p>
        {!active && (
          <p className="mt-2 text-xs text-brand-900">
            <span className="font-bold">Pas encore activé</span> (message visible seulement en local) : ajoutez ANTHROPIC_API_KEY et/ou PHOTOROOM_API_KEY dans server/.env, puis redémarrez le serveur.
          </p>
        )}
      </div>
      <button type="button" onClick={onTry} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-brand-800">
        <Wand2 className="h-4 w-4" /> Essayer
      </button>
      <button type="button" onClick={close} className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-white hover:text-stone-700" aria-label="Masquer ce message">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export default function AiProductAssistant({ imageSource, onSheet, onStudioPhoto }) {
  const [status, setStatus] = useState(null); // { enabled, quota } renvoyé par le serveur
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(null); // 'sheet' | 'studio'
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [style, setStyle] = useState('studio');
  const [preview, setPreview] = useState(null); // photo studio proposée (data URL)
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let alive = true;
    aiRequest('quota')
      .then((data) => alive && setStatus(data))
      .catch(() => { if (alive) { setStatus(null); setUnreachable(true); } });
    return () => { alive = false; };
  }, []);

  const updateQuota = (kind, quota) => quota && setStatus((s) => (s ? { ...s, quota: { ...s.quota, [kind]: quota } } : s));

  const fillSheet = async () => {
    setBusy('sheet'); setError(''); setDone('');
    try {
      const image = await photoToDataUrl(imageSource);
      const data = await aiRequest('product-sheet', { image, hint: hint.trim() || undefined });
      onSheet(data.sheet);
      updateQuota('product_sheet', data.quota);
      setDone('Fiche remplie : relisez et corrigez si besoin, puis ajoutez le prix et le stock.');
    } catch (e) {
      setError(e.message);
      updateQuota('product_sheet', e.quota);
    } finally {
      setBusy(null);
    }
  };

  const makeStudio = async () => {
    setBusy('studio'); setError(''); setDone('');
    try {
      const image = await photoToDataUrl(imageSource, 1600);
      const data = await aiRequest('studio-photo', { image, style });
      setPreview(data.image);
      updateQuota('studio_photo', data.quota);
    } catch (e) {
      setError(e.message);
      updateQuota('studio_photo', e.quota);
    } finally {
      setBusy(null);
    }
  };

  const useStudio = () => {
    onStudioPhoto(dataUrlToFile(preview, `photo-studio-${style}.webp`));
    setPreview(null);
    setDone('Photo studio choisie : elle sera enregistrée avec le produit.');
  };

  // Serveur sans assistant (clés non configurées) ou injoignable : les commerçants ne voient rien.
  // En local (npm run dev) seulement, on explique pourquoi au propriétaire du site.
  if (!status || (!status.enabled?.product_sheet && !status.enabled?.studio_photo)) {
    if (!import.meta.env.DEV || (!status && !unreachable)) return null;
    return (
      <p className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 text-xs leading-relaxed text-brand-900">
        <span className="font-bold">Assistant IA caché</span> (message visible seulement en local) :{' '}
        {unreachable
          ? 'le serveur ne répond pas sur /api/ai (arrêté ou ancienne version). Redémarrez-le : dans le dossier server, npm start.'
          : 'ajoutez ANTHROPIC_API_KEY et/ou PHOTOROOM_API_KEY dans server/.env, puis redémarrez le serveur.'}
      </p>
    );
  }
  const sheetQuota = status.quota?.product_sheet;
  const studioQuota = status.quota?.studio_photo;

  return (
    <section aria-label="Assistant IA" className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-amber-50/60">
      <div className="flex items-center gap-2.5 border-b border-brand-100 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Assistant IA</p>
          <p className="text-xs text-stone-500">{imageSource ? 'À partir de votre photo' : 'Ajoutez d’abord une photo du produit'}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {status.enabled.product_sheet && (
          <div>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={300}
              placeholder="Précision facultative : bazin riche, taille 42, parfum vanille…"
              className="mb-2 w-full rounded-xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              aria-label="Précision pour l’assistant"
            />
            <button
              type="button"
              onClick={fillSheet}
              disabled={!imageSource || busy !== null || sheetQuota?.remaining === 0}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'sheet' ? <><LoaderCircle className="h-4 w-4 animate-spin" /> L’IA observe votre photo…</> : <><Wand2 className="h-4 w-4" /> Remplir la fiche avec l’IA</>}
            </button>
            {sheetQuota && <p className="mt-1.5 text-center text-[11px] text-stone-500">{plural(sheetQuota.remaining, 'fiche')} restante{sheetQuota.remaining > 1 ? 's' : ''} ce mois-ci</p>}
          </div>
        )}

        {status.enabled.studio_photo && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Photo studio</p>
            <div className="mb-2.5 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Fond de la photo">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={style === s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-1.5 text-[11px] font-semibold transition-colors ${style === s.id ? 'bg-white text-ink ring-2 ring-brand-500' : 'text-stone-600 ring-1 ring-brand-100 hover:bg-white'}`}
                >
                  <span className="h-8 w-full rounded-lg ring-1 ring-black/5" style={{ background: s.swatch }} />
                  <span className="leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={makeStudio}
              disabled={!imageSource || busy !== null || studioQuota?.remaining === 0}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-300 bg-white px-4 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'studio' ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Création de la photo (≈ 10 s)…</> : <><Camera className="h-4 w-4" /> Créer la photo studio</>}
            </button>
            {studioQuota && <p className="mt-1.5 text-center text-[11px] text-stone-500">{plural(studioQuota.remaining, 'photo')} studio restante{studioQuota.remaining > 1 ? 's' : ''} ce mois-ci · votre produit reste tel quel, seul le fond change</p>}
          </div>
        )}

        <AnimatePresence>
          {preview && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-white p-3 ring-1 ring-brand-100">
              <img src={preview} alt="Photo studio proposée" className="mx-auto aspect-square w-full max-w-[260px] rounded-xl object-cover" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPreview(null)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-stone-200 text-sm font-semibold text-stone-600"><X className="h-4 w-4" /> Garder l’originale</button>
                <button type="button" onClick={useStudio} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-sm font-bold text-white"><Check className="h-4 w-4" /> Utiliser</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
        {done && !error && <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {done}</p>}
      </div>
    </section>
  );
}
