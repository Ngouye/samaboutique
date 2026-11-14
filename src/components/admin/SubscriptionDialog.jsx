import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Store, TrendingUp, Sparkles, LoaderCircle, CalendarDays, Gift } from 'lucide-react';
import { PLAN_META } from './ShopsMap';

const PLANS = [
  { id: 'debutant', icon: Store, price: 0, text: '10 produits, 1 livreur' },
  { id: 'pro', icon: TrendingUp, price: 5000, text: 'Produits illimités, 5 livreurs, « À la une »' },
  { id: 'premium', icon: Sparkles, price: 15000, text: 'Tout Pro, livreurs illimités, support prioritaire' },
];
const MONTHS = [1, 3, 6, 12];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

// Nouvelle date de fin : ajoutée à la fin actuelle si elle est à venir, sinon à aujourd'hui (même règle que la base).
function nextEndDate(currentEnd, months, now = Date.now()) {
  const start = new Date(Math.max(Date.parse(currentEnd || '') || 0, now));
  start.setMonth(start.getMonth() + months);
  return start;
}

// Changer l'offre d'une boutique (cadeau, geste commercial, régularisation)
export default function SubscriptionDialog({ merchant, onClose, onSave }) {
  const [plan, setPlan] = useState(merchant?.subscription_plan === 'debutant' ? 'pro' : merchant?.subscription_plan || 'pro');
  const [months, setMonths] = useState(1);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const end = plan === 'debutant' ? null : nextEndDate(merchant.subscription_end_date, months, now);
  const value = plan === 'debutant' ? 0 : PLANS.find((p) => p.id === plan).price * months;

  const submit = async () => {
    const summary = plan === 'debutant'
      ? `Remettre « ${merchant.shop_name} » sur le forfait gratuit Débutant ?`
      : `Passer « ${merchant.shop_name} » en ${PLAN_META[plan].label} jusqu'au ${dateFr(end)} ?\n\nAucun paiement n'est demandé à la boutique.`;
    if (!window.confirm(summary)) return;
    setSaving(true);
    const ok = await onSave(merchant, plan, months);
    setSaving(false);
    if (ok !== false) onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && onClose()} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sub-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Crown className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="sub-title" className="font-ledger text-2xl leading-tight text-ink">Changer l'offre</h2>
              <p className="truncate text-sm text-slate-500">{merchant.shop_name} · actuellement {PLAN_META[merchant.subscription_plan]?.label || 'Débutant'}{merchant.subscription_end_date ? ` jusqu'au ${dateFr(merchant.subscription_end_date)}` : ''}</p>
            </div>
            <button onClick={onClose} disabled={saving} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">Forfait</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={active} onClick={() => setPlan(p.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="flex items-center gap-2 text-sm font-bold text-ink"><p.icon className="h-4 w-4" style={{ color: PLAN_META[p.id].color }} /> {PLAN_META[p.id].label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{p.price ? `${fmt(p.price)} F / mois` : 'Gratuit'} · {p.text}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {plan !== 'debutant' && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-800">Durée ajoutée</legend>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((m) => (
                    <button key={m} type="button" onClick={() => setMonths(m)} aria-pressed={months === m}
                      className={`rounded-xl border py-2.5 text-sm font-bold transition-colors ${months === m ? 'border-ink bg-ink text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                      {m} mois
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              {plan === 'debutant' ? (
                <p className="text-slate-700">La boutique repasse sur le forfait gratuit, sans date de fin. Au-delà de 10 produits, elle ne pourra plus en ajouter.</p>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-semibold text-slate-800"><CalendarDays className="h-4 w-4 text-brand-600" /> Nouvelle fin : {dateFr(end)}</p>
                  <p className="mt-1 flex items-center gap-2 text-slate-600"><Gift className="h-4 w-4 text-amber-600" /> Offert : {fmt(value)} FCFA de forfait, sans paiement de la boutique.</p>
                </>
              )}
              <p className="mt-2 text-xs text-slate-400">L'action est notée dans le journal de l'administration.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <button onClick={onClose} disabled={saving} className="rounded-full px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">Annuler</button>
            <button onClick={submit} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} Appliquer l'offre
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
