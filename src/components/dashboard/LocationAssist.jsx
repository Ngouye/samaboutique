import React, { useEffect, useState } from 'react';
import { LockKey, LocateFixed, LoaderCircle, MapPin, CircleCheck, TriangleAlert, ExternalLink, ChevronDown } from './icons';
import { INPUT } from './ui';
import { parseCoordinates, isShortMapsLink, googleMapsUrl } from '../../utils/geolocation';

// Zone large autour du Sénégal : au-delà, on prévient (chiffres inversés, mauvais lieu…).
const inSenegal = ({ lat, lng }) => lat > 12 && lat < 17 && lng > -18 && lng < -11;

function device() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac/i.test(ua)) return 'mac';
  return 'windows';
}

const STEPS = {
  windows: [
    <>Cliquez sur l'icône à gauche de l'adresse du site (cadenas ou réglages), puis mettez <b>Position</b> sur <b>Autoriser</b>.</>,
    <>Dans Windows : <b>Paramètres → Confidentialité et sécurité → Localisation</b>. Activez « Services de localisation » et « Autoriser les applications de bureau à accéder à votre emplacement ».</>,
    <>Rechargez la page, puis appuyez sur <b>Réessayer</b>.</>,
  ],
  mac: [
    <>Cliquez sur l'icône à gauche de l'adresse du site, puis mettez <b>Position</b> sur <b>Autoriser</b>.</>,
    <>Sur le Mac : <b>Réglages Système → Confidentialité et sécurité → Service de localisation</b>, puis autorisez votre navigateur.</>,
    <>Rechargez la page, puis appuyez sur <b>Réessayer</b>.</>,
  ],
  android: [
    <>Activez la localisation du téléphone : faites glisser le menu du haut, puis touchez <b>Position</b>.</>,
    <>Dans le navigateur : touchez l'icône à gauche de l'adresse → <b>Autorisations</b> → <b>Position</b> → <b>Autoriser</b>.</>,
    <>Rechargez la page, puis touchez <b>Réessayer</b>.</>,
  ],
  iphone: [
    <><b>Réglages → Confidentialité et sécurité → Service de localisation</b> : activez-le.</>,
    <>Dans la même page, touchez votre navigateur (Safari, Chrome…) et choisissez <b>Lorsque l'app est active</b>.</>,
    <>Revenez ici, rechargez la page, puis touchez <b>Réessayer</b>.</>,
  ],
};

// Aide à la localisation de la boutique : explique comment débloquer la position
// et propose une saisie à la main (coordonnées ou lien Google Maps).
// `proactive` : l'aide s'affiche dès l'ouverture si la position est déjà bloquée pour ce site
// (boutique pas encore localisée) ; sinon, seulement après un essai qui a échoué.
export default function LocationAssist({ issue, locating, onRetry, onSave, proactive = false }) {
  const [permission, setPermission] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  // État de l'autorisation, quand le navigateur sait le donner.
  useEffect(() => {
    let status = null;
    let alive = true;
    navigator.permissions?.query({ name: 'geolocation' })
      .then((s) => {
        if (!alive) return;
        status = s;
        setPermission(s.state);
        s.onchange = () => setPermission(s.state);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (status) status.onchange = null;
    };
  }, []);

  const kind = device();
  const blocked = issue === 'denied' || (proactive && permission === 'denied');
  const parsed = parseCoordinates(text);

  const save = async () => {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      const ok = await onSave({ lat: parsed.lat, lng: parsed.lng, accuracy: null });
      if (ok !== false) {
        setText('');
        setManualOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-3 text-left">
      {blocked && (
        <div role="alert" className="rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-600/20">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <LockKey className="h-4 w-4 shrink-0" /> La localisation est bloquée sur cet appareil
          </p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-amber-950/80">
            {STEPS[kind].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-[11px] font-bold text-amber-900">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {(kind === 'windows' || kind === 'mac') && (
            <p className="mt-3 text-xs text-amber-900/70">
              Astuce : la position d'un ordinateur est souvent approximative. Le plus précis est de le faire depuis votre téléphone, dans la boutique, ou de saisir la position à la main.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onRetry} disabled={locating} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-950 disabled:opacity-60">
              {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Réessayer
            </button>
            {!manualOpen && (
              <button type="button" onClick={() => setManualOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-900 ring-1 ring-inset ring-amber-600/30 transition-colors hover:bg-amber-100/60">
                <MapPin className="h-4 w-4" /> Saisir la position à la main
              </button>
            )}
          </div>
        </div>
      )}

      {!blocked && !manualOpen && (
        <button type="button" onClick={() => setManualOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 underline-offset-4 transition-colors hover:text-slate-800 hover:underline">
          <ChevronDown className="h-4 w-4" /> Ou saisir la position à la main
        </button>
      )}

      {manualOpen && (
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <label htmlFor="manual-location" className="text-sm font-bold text-slate-900">Saisir la position à la main</label>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Dans Google Maps, faites un appui long (ou un clic droit) sur votre boutique : des chiffres s'affichent, par exemple <span className="font-mono">14.69282, -17.44670</span>. Copiez-les ici. Un lien Google Maps complet fonctionne aussi.
          </p>
          <input
            id="manual-location"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            placeholder="14.69282, -17.44670"
            className={`${INPUT} mt-3 font-mono`}
          />
          {text.trim() && (
            parsed ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-emerald-700">
                <CircleCheck className="h-4 w-4" /> Position reconnue : <span className="font-mono">{parsed.lat}, {parsed.lng}</span>
                <a href={googleMapsUrl(parsed.lat, parsed.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-600 underline underline-offset-2 hover:text-slate-900">
                  Vérifier sur la carte <ExternalLink className="h-3 w-3" />
                </a>
                {!inSenegal(parsed) && (
                  <span className="flex w-full items-center gap-1.5 font-medium text-amber-700">
                    <TriangleAlert className="h-3.5 w-3.5" /> Cette position est hors du Sénégal : vérifiez l'ordre des chiffres (la latitude d'abord).
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                {isShortMapsLink(text)
                  ? "Ce lien court ne contient pas la position. Ouvrez-le, faites un appui long sur la boutique, puis copiez les chiffres affichés."
                  : 'Format non reconnu. Exemple : 14.69282, -17.44670'}
              </p>
            )
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={!parsed || saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Enregistrer cette position
            </button>
            <button type="button" onClick={() => { setManualOpen(false); setText(''); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
