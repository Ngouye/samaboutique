import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

// Bandeau affiché sur toutes les pages quand la connexion internet est coupée,
// puis bref message « Connexion rétablie » à son retour.
export default function NetworkStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [backOnline, setBackOnline] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const goOffline = () => { setOnline(false); setBackOnline(false); clearTimeout(timer.current); };
    const goOnline = () => {
      setOnline(true);
      setBackOnline(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBackOnline(false), 3500);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      clearTimeout(timer.current);
    };
  }, []);

  const visible = !online || backOnline;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[300] flex justify-center px-3" aria-live="polite" role="status">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={online ? 'online' : 'offline'}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex max-w-lg items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${online ? 'bg-emerald-600 text-white' : 'bg-[#0b1f17] text-white'}`}
          >
            {online ? <Wifi className="mt-0.5 h-4 w-4 shrink-0" /> : <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
            <span>
              {online
                ? 'Connexion rétablie.'
                : <>Pas de connexion internet. <span className="font-normal text-white/75">Vos actions ne peuvent pas être envoyées pour l’instant ; tout reprendra dès le retour du réseau.</span></>}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
