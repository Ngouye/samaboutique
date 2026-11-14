import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, CalendarDays, Pencil, CircleCheck, TriangleAlert, LoaderCircle, ImageOff, Rocket } from './icons';
import { Modal, PrimaryButton, INPUT } from './ui';
import { thumbUrl, fallbackToFull } from '../../utils/imageUpload';
import {
  productState, publishChecklist, missingEssentials, defaultSchedule, scheduleError, formatSchedule,
  visibilityPayload, visibilityChoice, toLocalInput,
} from '../../utils/productVisibility';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');

const OPTIONS = [
  { id: 'published', icon: Eye, title: 'Publier maintenant', text: 'Visible tout de suite sur votre vitrine' },
  { id: 'scheduled', icon: CalendarDays, title: 'Programmer', text: 'Mise en ligne automatique à l’heure choisie' },
  { id: 'draft', icon: Pencil, title: 'Brouillon', text: 'Enregistré, invisible pour vos clients' },
];

const ACTION_LABEL = { published: 'Publier maintenant', scheduled: 'Programmer la mise en ligne', draft: 'Enregistrer en brouillon' };

// État d'un produit dans le catalogue du commerçant
export function VisibilityBadge({ product, className = '' }) {
  const state = productState(product);
  if (state === 'live') {
    return <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En ligne</span>;
  }
  if (state === 'scheduled') {
    return <span className={`inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ${className}`}><CalendarDays className="h-3 w-3" /> {formatSchedule(product.publish_at)}</span>;
  }
  return <span className={`inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 ${className}`}><Pencil className="h-3 w-3" /> Brouillon</span>;
}

// Choix de visibilité : publier, programmer ou garder en brouillon.
export function VisibilityPicker({ value, schedule, onChange, onScheduleChange, error }) {
  // Heure minimale proposée par le sélecteur : calculée une fois à l'ouverture.
  const [minValue] = useState(() => toLocalInput(Date.now() + 5 * 60000));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-800">Visibilité sur la vitrine</legend>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
        {OPTIONS.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors sm:flex-col sm:gap-2 ${active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-[#e8e5dc] bg-white hover:border-stone-300'}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-[#f7f6f2] text-stone-600'}`}>
                <o.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${active ? 'text-brand-900' : 'text-ink'}`}>{o.title}</span>
                <span className="block text-xs leading-snug text-stone-500">{o.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      {value === 'scheduled' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <label htmlFor="publish-at" className="mb-1.5 mt-3 block text-sm font-semibold text-slate-800">Date et heure de mise en ligne</label>
          <input
            id="publish-at"
            type="datetime-local"
            value={schedule}
            min={minValue}
            onChange={(e) => onScheduleChange(e.target.value)}
            className={`${INPUT} ${error ? 'border-rose-400' : ''}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'publish-at-error' : undefined}
          />
          {error
            ? <p id="publish-at-error" className="mt-1.5 text-sm font-medium text-rose-600">{error}</p>
            : schedule && <p className="mt-1.5 text-xs text-stone-500">Le produit apparaîtra automatiquement le {formatSchedule(schedule)}.</p>}
        </motion.div>
      )}
    </fieldset>
  );
}

// Fenêtre « Publier » : vérifications avant mise en ligne, puis publier, programmer ou garder en brouillon.
export default function PublishDialog({ product, onClose, onSave, onEdit }) {
  const [choice, setChoice] = useState(() => (product && productState(product) === 'live' ? 'draft' : 'published'));
  const [schedule, setSchedule] = useState(() => (product?.visibility === 'scheduled' && product.publish_at ? toLocalInput(product.publish_at) : defaultSchedule()));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!product) return <Modal open={false} onClose={onClose} />;

  const state = productState(product);
  const checklist = publishChecklist(product);
  const missing = missingEssentials(checklist);
  const error = choice === 'scheduled' && touched ? scheduleError(schedule) : '';
  const unchanged = choice === visibilityChoice(product) && choice !== 'scheduled';
  // Un produit sans prix ne peut pas être mis en vente (il peut rester en brouillon).
  const noPrice = choice !== 'draft' && missing.some((c) => c.id === 'price');

  const submit = async () => {
    setTouched(true);
    if (choice === 'scheduled' && scheduleError(schedule)) return;
    setSaving(true);
    const ok = await onSave(product, visibilityPayload(choice, schedule, product));
    setSaving(false);
    if (ok !== false) onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Rocket}
      gradient="violet"
      title={state === 'live' ? 'Visibilité du produit' : 'Publier le produit'}
      subtitle={state === 'live' ? 'Ce produit est visible par vos clients' : 'Vérifiez-le, puis choisissez quand le montrer'}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full px-6 py-3 text-sm font-bold text-stone-500 transition-colors hover:bg-stone-100">Annuler</button>
          <PrimaryButton type="button" onClick={submit} disabled={saving || unchanged || noPrice}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : choice === 'published' ? <Eye className="h-4 w-4" /> : choice === 'scheduled' ? <CalendarDays className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {ACTION_LABEL[choice]}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-[#efece4] bg-[#faf9f6] p-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f1efe8]">
            {product.image_url
              ? <img src={thumbUrl(product.image_url)} onError={fallbackToFull(product.image_url)} alt="" className="h-full w-full object-cover" />
              : <ImageOff className="h-6 w-6 text-stone-300" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{product.name}</p>
            <p className="font-figures text-sm text-stone-600">{fmt(product.price_fcfa)} FCFA · stock {product.stock}</p>
          </div>
          <VisibilityBadge product={product} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Avant de publier</p>
          <ul className="space-y-1.5">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                {c.ok
                  ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <TriangleAlert className={`h-4 w-4 shrink-0 ${c.essential ? 'text-amber-600' : 'text-stone-400'}`} />}
                <span className={c.ok ? 'text-stone-700' : c.essential ? 'font-semibold text-amber-800' : 'text-stone-500'}>{c.label}</span>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
              <span>{missing[0].id === 'photo' ? 'Sans photo, un produit se vend beaucoup moins.' : 'Ajoutez un prix avant de publier.'}</span>
              {onEdit && <button type="button" onClick={() => onEdit(product)} className="font-bold underline underline-offset-2">Compléter le produit</button>}
            </div>
          )}
        </div>

        <VisibilityPicker value={choice} schedule={schedule} onChange={(v) => { setChoice(v); setTouched(false); }} onScheduleChange={(v) => { setSchedule(v); setTouched(true); }} error={error} />
      </div>
    </Modal>
  );
}
