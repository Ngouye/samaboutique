import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SatelliteDish, LoaderCircle, TriangleAlert, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const SEND_EVERY_MS = 8000; // envoi régulier
const HEARTBEAT_MS = 20000; // livreur immobile : on confirme sa position
const MIN_MOVE_M = 25; // déplacement qui déclenche un envoi anticipé

function metersBetween(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

// Partage la position GPS du livreur pendant sa course, pour la carte de suivi du client.
// L'écran reste allumé (si le téléphone le permet) : le navigateur suspend le GPS en arrière-plan.
export default function LiveLocationShare({ token, orderId, onSessionExpired }) {
  const [status, setStatus] = useState('starting'); // starting | live | denied | unavailable | error
  const [detail, setDetail] = useState('');
  const [lastSentAt, setLastSentAt] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const lastSentRef = useRef(null); // { lat, lng, at }
  const latestRef = useRef(null);
  // Référence stable : le parent recrée la fonction à chaque rendu, le GPS ne doit pas redémarrer.
  const expiredRef = useRef(onSessionExpired);
  useEffect(() => {
    expiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  const send = useCallback(async (pos) => {
    const { data, error } = await supabase.rpc('update_driver_position', {
      p_token: token,
      p_order_id: orderId,
      p_latitude: pos.lat,
      p_longitude: pos.lng,
      p_accuracy_m: pos.accuracy != null ? Math.round(pos.accuracy) : null,
      p_heading: pos.heading,
      p_speed_kmh: pos.speed,
    });
    if (error) {
      if (/SESSION_EXPIREE/.test(error.message || '')) return expiredRef.current?.();
      setStatus('error');
      setDetail(/update_driver_position/.test(error.message || '') ? 'Suivi en direct pas encore installé (new_features.sql).' : 'Connexion instable : nouvel essai automatique.');
      return;
    }
    if (data && data.ok === false) {
      setStatus('error');
      setDetail(data.error || 'Position refusée.');
      return;
    }
    lastSentRef.current = { lat: pos.lat, lng: pos.lng, at: Date.now() };
    setLastSentAt(Date.now());
    setStatus('live');
    setDetail('');
  }, [token, orderId]);

  useEffect(() => {
    if (!token || !orderId) return undefined;
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return undefined;
    }
    setStatus('starting');
    lastSentRef.current = null;

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const pos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
          speed: Number.isFinite(p.coords.speed) ? Math.round(p.coords.speed * 3.6 * 10) / 10 : null,
        };
        latestRef.current = pos;
        const last = lastSentRef.current;
        const elapsed = last ? Date.now() - last.at : Infinity;
        if (elapsed >= SEND_EVERY_MS || (elapsed >= 3000 && metersBetween(last, pos) >= MIN_MOVE_M)) send(pos);
      },
      (err) => {
        setStatus(err.code === 1 ? 'denied' : 'error');
        setDetail(err.code === 1 ? '' : 'Signal GPS faible. Recherche en cours…');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );

    const heartbeat = setInterval(() => {
      const last = lastSentRef.current;
      if (latestRef.current && (!last || Date.now() - last.at >= HEARTBEAT_MS)) send(latestRef.current);
      setNow(Date.now());
    }, 5000);

    // Garder l'écran allumé pendant la course.
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
      } catch { /* non pris en charge : sans effet */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    requestWakeLock();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
      wakeLock?.release().catch(() => {});
    };
  }, [token, orderId, send, attempt]);

  const ago = lastSentAt ? Math.max(0, Math.round((now - lastSentAt) / 1000)) : null;

  if (status === 'live') {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-400/10 px-4 py-3 ring-1 ring-emerald-400/25">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <motion.span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/60" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <SatelliteDish className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-bold text-emerald-200">Le client vous suit en direct</p>
          <p className="text-xs text-white/50">Position envoyée {ago < 5 ? "à l'instant" : `il y a ${ago} s`} · gardez cette page ouverte</p>
        </div>
      </div>
    );
  }

  const tone = status === 'starting' ? 'text-white/70 bg-white/5 ring-white/10' : 'text-amber-200 bg-amber-400/10 ring-amber-400/25';
  return (
    <div className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${tone}`}>
      {status === 'starting' ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" /> : <TriangleAlert className="h-5 w-5 shrink-0" />}
      <p className="min-w-0 flex-1 text-sm font-semibold">
        {status === 'starting' && 'Activation du GPS pour le suivi en direct…'}
        {status === 'denied' && 'Autorisez la localisation dans votre navigateur pour que le client vous suive.'}
        {status === 'unavailable' && 'Ce téléphone ne permet pas le suivi en direct.'}
        {status === 'error' && (detail || 'Suivi en direct interrompu.')}
      </p>
      {(status === 'denied' || status === 'error') && (
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">
          <RefreshCw className="h-3.5 w-3.5" /> Réessayer
        </button>
      )}
    </div>
  );
}
