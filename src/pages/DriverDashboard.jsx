import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  Phone, Navigation, BellRing, BellOff, ShieldCheck, X, ArrowRight, CircleCheck, User, Moped, Wallet, Store,
  RotateCw, Check, IdCard, LoaderCircle, Banknote, CreditCard,
} from '../components/dashboard/icons';
import confetti from 'canvas-confetti';
import { playSuccess, playPop } from '../utils/audio';
import { Field, ErrorBanner, EASE } from '../components/auth/AuthUI';
import { friendlyError } from '../utils/networkErrors';
import { BRAND } from '../utils/brand';
import { paymentLabel } from '../utils/payments';
import LogoutDialog from '../components/LogoutDialog';
import { showFarewell } from '../utils/farewell';
import Logo from '../components/brand/Logo';
import { fmt, daySummary, isPrepaid, cashToCollect, orderRef } from '../utils/delivery';
import { TodayStrip, ActiveDelivery, AvailableCourses, EarningsView, ProfileView } from '../components/driver/DriverViews';

const EMPTY_PIN = { isOpen: false, orderId: null, pinValue: '', error: '', isLoading: false, success: false, shake: 0 };

// Fond papier de la plateforme, avec un voile indigo très léger en haut.
function Aurora() {
  return <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-brand-50 to-transparent" aria-hidden="true" />;
}

export default function DriverDashboard() {
  const { shopName } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pinModal, setPinModal] = useState(EMPTY_PIN);
  const [driverName, setDriverName] = useState('');
  const [showDriverNameModal, setShowDriverNameModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '', cni: '', error: '', isLoading: false });
  const [activeTab, setActiveTab] = useState('courses');
  const [assigningId, setAssigningId] = useState(null);
  const [courierPos, setCourierPos] = useState(null); // position GPS du livreur pendant une course
  const [lastSync, setLastSync] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [alert, setAlert] = useState(null); // bandeau « nouvelle course »
  const audioContextRef = useRef(null);
  const pinInputRef = useRef(null);
  // Session du livreur : jeton délivré par le serveur (valable 12 h). La CNI n'est jamais conservée.
  const tokenRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const knownOrderIdsRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Horloge des libellés « il y a 5 min »
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Le bandeau « nouvelle course » disparaît tout seul
  useEffect(() => {
    if (!alert) return undefined;
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [alert]);

  // Vérifier la session du livreur au chargement
  useEffect(() => {
    try {
      sessionStorage.removeItem('samaboutik_driver_auth'); // ancienne version : ne plus garder téléphone/CNI
      const savedName = sessionStorage.getItem('samaboutik_driver_name');
      const savedToken = sessionStorage.getItem('samaboutik_driver_token');
      if (savedName && savedToken) {
        tokenRef.current = savedToken;
        setDriverName(savedName);
      } else {
        setShowDriverNameModal(true);
      }
    } catch (e) {
      console.error("Storage access error:", e);
      setShowDriverNameModal(true);
    }
  }, []);

  // Petit son « ding » pour une nouvelle course
  const playNotificationSound = () => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      navigator.vibrate?.([120, 60, 120]);
    } catch (e) {
      console.log("Erreur audio", e);
    }
  };

  const clearSession = () => {
    try {
      sessionStorage.removeItem('samaboutik_driver_name');
      sessionStorage.removeItem('samaboutik_driver_token');
    } catch (e) {
      console.error("Storage access error:", e);
    }
    tokenRef.current = null;
    knownOrderIdsRef.current = null;
    setDriverName('');
    setOrders([]);
    setActiveTab('courses');
  };

  // Session expirée ou révoquée (livreur supprimé par le marchand) : retour à l'écran de connexion.
  const expireSession = () => {
    clearSession();
    setPinModal(EMPTY_PIN);
    setLoginForm({ phone: '', cni: '', error: 'Votre session a expiré. Reconnectez-vous.', isLoading: false });
    setShowDriverNameModal(true);
  };

  const isSessionError = (error) => String(error?.message || '').includes('SESSION_EXPIREE');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.phone.trim() || !loginForm.cni.trim()) return;

    setLoginForm({ ...loginForm, isLoading: true, error: '' });

    try {
      const { data, error } = await supabase.rpc('authenticate_driver', {
        p_shop_name: decodeURIComponent(shopName),
        p_phone: loginForm.phone.trim(),
        p_cni: loginForm.cni.trim()
      });

      if (error) throw error;
      if (!data?.ok) {
        setLoginForm({ ...loginForm, isLoading: false, error: data?.error || "Identifiants incorrects ou non enregistrés." });
        return;
      }

      tokenRef.current = data.token;
      try {
        sessionStorage.setItem('samaboutik_driver_name', data.name);
        sessionStorage.setItem('samaboutik_driver_token', data.token);
      } catch (e) {
        console.error("Storage access error:", e);
      }
      setDriverName(data.name);
      setShowDriverNameModal(false);
      setLoginForm({ phone: '', cni: '', error: '', isLoading: false });
      fetchDriverOrders();
    } catch {
      setLoginForm({ ...loginForm, isLoading: false, error: "Connexion impossible. Vérifiez votre réseau." });
    }
  };

  const enableSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContextRef.current.resume().then(() => {
      soundEnabledRef.current = true;
      setSoundEnabled(true);
      playNotificationSound();
    });
  };
  const toggleSound = () => (soundEnabled ? setSoundEnabled(false) : enableSound());

  // Les commandes ne sont plus lisibles publiquement (pas de temps réel anonyme) :
  // on interroge le serveur toutes les 15 s tant que la page est visible.
  useEffect(() => {
    fetchDriverOrders();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchDriverOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [shopName]);

  const fetchDriverOrders = async () => {
    setLoading(true);
    const decodedName = decodeURIComponent(shopName);

    try {
      const { data: mData } = await supabase
        .from('merchants')
        .select('id, shop_name, phone_number')
        .ilike('shop_name', decodedName)
        .single();

      if (mData) {
        setMerchant(mData);

        if (!tokenRef.current) {
          setOrders([]);
          setLoading(false);
          return mData;
        }

        const { data: ordersData, error } = await supabase.rpc('get_driver_orders', { p_token: tokenRef.current });
        if (error) {
          if (isSessionError(error)) {
            expireSession();
            setLoading(false);
            return mData;
          }
          throw error;
        }

        // Nouvelle course sur le radar : son, vibration et bandeau
        const available = (ordersData || []).filter((o) => o.status === 'PREPARING');
        const fresh = knownOrderIdsRef.current ? available.filter((o) => !knownOrderIdsRef.current.has(o.id)) : [];
        if (fresh.length) {
          playNotificationSound();
          setAlert({
            id: fresh[0].id,
            text: fresh.length > 1 ? `${fresh.length} nouvelles courses disponibles` : `Nouvelle course · ${fresh[0].delivery_zone || 'à proximité'}`,
          });
        }
        knownOrderIdsRef.current = new Set(available.map((o) => o.id));

        setOrders(ordersData || []);
        setLastSync(new Date().toISOString());
        setLoading(false);
        return mData;
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des commandes:", err);
    }
    setLoading(false);
    return null;
  };

  // Accepter une course
  const assignOrder = async (orderId) => {
    setAssigningId(orderId);
    try {
      const { error } = await supabase.rpc('assign_order_to_driver', {
        p_token: tokenRef.current,
        p_order_id: orderId
      });

      if (error) {
        if (isSessionError(error)) return expireSession();
        throw error;
      }

      playPop();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchDriverOrders();
    } catch (err) {
      window.alert(friendlyError(err, "La course n'a pas pu être acceptée. Réessayez."));
      fetchDriverOrders(); // Rafraîchir au cas où elle aurait disparu
    } finally {
      setAssigningId(null);
    }
  };

  const openPinModal = (orderId) => {
    setPinModal({ ...EMPTY_PIN, isOpen: true, orderId });
  };

  const closePinModal = () => {
    if (!pinModal.isLoading && !pinModal.success) setPinModal(EMPTY_PIN);
  };

  const submitPinCode = async (e) => {
    e.preventDefault();
    if (!pinModal.pinValue || pinModal.pinValue.length !== 4) {
      setPinModal(prev => ({ ...prev, error: 'Veuillez entrer les 4 chiffres.', shake: prev.shake + 1 }));
      return;
    }

    setPinModal(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const { data: result, error } = await supabase.rpc('mark_order_delivered', {
        p_token: tokenRef.current,
        p_order_id: pinModal.orderId,
        p_pin: pinModal.pinValue.trim()
      });

      if (error) {
        if (isSessionError(error)) return expireSession();
        setPinModal(prev => ({ ...prev, error: friendlyError(error, 'Validation impossible. Réessayez.'), isLoading: false, shake: prev.shake + 1 }));
        return;
      }

      if (result?.ok) {
        // Célébration de la livraison !
        playSuccess();
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.5 },
          colors: [BRAND.vivid, BRAND.light, BRAND.gold, '#ffffff']
        });
        setPinModal(prev => ({ ...prev, isLoading: false, success: true }));
        setTimeout(() => {
          setPinModal(EMPTY_PIN);
          fetchDriverOrders();
        }, 1600);
      } else {
        setPinModal(prev => ({ ...prev, error: result?.error || 'Code incorrect !', isLoading: false, pinValue: '', shake: prev.shake + 1 }));
      }
    } catch {
      setPinModal(prev => ({ ...prev, error: "Erreur réseau.", isLoading: false, shake: prev.shake + 1 }));
    }
  };

  const handlePosition = useCallback((p) => setCourierPos({ lat: p.lat, lng: p.lng }), []);

  // Répartition des commandes
  const activeOrder = orders.find(o => o.status === 'IN_TRANSIT' && o.driver_name === driverName);
  const availableOrders = orders.filter(o => o.status === 'PREPARING');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' && o.driver_name === driverName);
  const summary = daySummary(deliveredOrders);
  const pinOrder = orders.find((o) => o.id === pinModal.orderId);

  // Déconnexion : confirmation d'abord, puis écran d'au revoir et retour à l'écran de connexion du livreur.
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleLogout = () => setLogoutOpen(true);
  const confirmLogout = async () => {
    showFarewell({ name: driverName });
    if (tokenRef.current) supabase.rpc('logout_driver', { p_token: tokenRef.current });
    clearSession();
    setLogoutOpen(false);
    setShowDriverNameModal(true);
  };

  const shopLabel = merchant?.shop_name || decodeURIComponent(shopName);

  // Écran de chargement uniquement au premier chargement (les rafraîchissements gardent l'affichage).
  if (loading && !merchant) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f6f2] text-ink">
      <Aurora />
      <motion.span animate={{ x: [-30, 30, -30] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white shadow-lg">
        <Moped className="h-8 w-8" />
      </motion.span>
      <p className="text-sm font-semibold text-stone-500">Chargement des courses…</p>
    </div>
  );

  if (!merchant) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] p-4 text-ink">
      <Aurora />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-2xl border border-[#e8e5dc] bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50"><Store className="h-7 w-7 text-rose-600" /></span>
        <h2 className="font-ledger text-2xl text-ink">Boutique introuvable</h2>
        <p className="mt-2 text-sm text-stone-500">Ce lien livreur est invalide. Demandez un nouveau lien au marchand.</p>
      </motion.div>
    </div>
  );

  const tabs = [
    { id: 'courses', label: 'Courses', icon: Moped, badge: availableOrders.length },
    { id: 'gains', label: 'Gains', icon: Wallet },
    { id: 'profil', label: 'Profil', icon: User },
  ];
  const openTab = (id) => { setActiveTab(id); window.scrollTo({ top: 0 }); };
  const view = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35, ease: EASE } };

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen bg-[#f7f6f2] pb-[calc(5.5rem+env(safe-area-inset-bottom))] font-sans text-ink">
      <Aurora />
      <AnimatePresence>
        {logoutOpen && (
          <LogoutDialog
            key="logout"
            name={driverName}
            detail={`Livreur · ${shopLabel}`}
            consequence="Vos courses restent enregistrées. Pour revenir, il faudra votre téléphone et votre numéro de CNI."
            onCancel={() => setLogoutOpen(false)}
            onConfirm={confirmLogout}
          />
        )}
      </AnimatePresence>

      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-[#e8e5dc] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-base font-bold text-white">
                {driverName.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold leading-tight text-ink">{driverName || 'Livreur'}</h1>
              <p className="flex items-center gap-1.5 truncate text-xs text-stone-500">
                <span className="font-semibold text-emerald-700">En service</span> · {shopLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleSound}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${soundEnabled ? 'bg-brand-100 text-brand-800' : 'bg-[#f7f6f2] text-stone-600 ring-1 ring-black/[0.05]'}`}
              aria-label={soundEnabled ? 'Couper les alertes' : 'Activer les alertes'}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span className="hidden min-[380px]:inline">{soundEnabled ? 'Alertes' : 'Muet'}</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9, rotate: -20 }} onClick={fetchDriverOrders} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f6f2] text-stone-600 ring-1 ring-black/[0.05]" aria-label="Actualiser">
              <RotateCw className={`h-[18px] w-[18px] ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Nouvelle course */}
      <AnimatePresence>
        {alert && (
          <motion.button
            key={alert.id}
            type="button"
            onClick={() => { setAlert(null); openTab('courses'); }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-3 top-[4.1rem] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_18px_36px_-14px_rgba(18,16,58,0.55)]"
            role="status"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15"><Moped className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1 truncate">{alert.text}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>

      <main className="relative mx-auto max-w-md px-4 py-4">
        <AnimatePresence mode="wait">
          {activeTab === 'courses' && (
            <motion.div key="courses" {...view} className="space-y-5">
              <TodayStrip summary={summary} />
              {activeOrder && (
                <ActiveDelivery
                  order={activeOrder}
                  token={tokenRef.current}
                  now={now}
                  courier={courierPos}
                  onPosition={handlePosition}
                  onSessionExpired={expireSession}
                  onValidate={() => openPinModal(activeOrder.id)}
                />
              )}
              <AvailableCourses
                orders={availableOrders}
                now={now}
                busy={Boolean(activeOrder)}
                assigningId={assigningId}
                onAccept={assignOrder}
                lastSync={lastSync}
                soundEnabled={soundEnabled}
                onEnableSound={enableSound}
                onRefresh={fetchDriverOrders}
              />
            </motion.div>
          )}

          {activeTab === 'gains' && (
            <motion.div key="gains" {...view}>
              <EarningsView summary={summary} delivered={deliveredOrders} />
            </motion.div>
          )}

          {activeTab === 'profil' && (
            <motion.div key="profil" {...view}>
              <ProfileView
                driverName={driverName}
                shopLabel={shopLabel}
                merchantPhone={merchant?.phone_number}
                summary={summary}
                available={availableOrders.length}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation basse */}
      {/* Collée au bas de l'écran, sur toute la largeur, comme une application ; la zone du geste
          d'accueil des iPhone (safe area) reste libre. */}
      <nav aria-label="Espace livreur" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8e5dc] bg-white/95 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md items-stretch">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => openTab(t.id)} aria-current={active ? 'page' : undefined} className="relative flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-0.5 pb-1.5 pt-2 active:bg-stone-50">
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {active && <motion.span layoutId="driver-tab" className="absolute inset-0 rounded-full bg-brand-100" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <t.icon className={`relative h-5 w-5 transition-colors ${active ? 'text-brand-800' : 'text-stone-500'}`} />
                  {t.badge > 0 && <span className="absolute -top-0.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{t.badge}</span>}
                </span>
                <span className={`text-[11px] font-semibold leading-none ${active ? 'text-ink' : 'text-stone-500'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Code PIN de remise */}
      <AnimatePresence>
        {pinModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={closePinModal} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pin-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="relative w-full max-w-sm overflow-hidden rounded-t-[1.75rem] border border-[#e8e5dc] bg-white p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-ink sm:rounded-[1.75rem] sm:pb-7"
            >
              <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-100 blur-3xl" />
              <button onClick={closePinModal} className="absolute right-4 top-4 rounded-full bg-stone-100 p-2 text-stone-600 hover:bg-stone-200" aria-label="Fermer"><X className="h-4 w-4" /></button>

              <AnimatePresence mode="wait">
                {pinModal.success ? (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative py-8">
                    <motion.span initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_14px_36px_-12px_rgba(16,185,129,0.7)]">
                      <Check className="h-10 w-10" />
                    </motion.span>
                    <h3 className="font-ledger text-2xl text-ink">Livraison validée !</h3>
                    <p className="mt-1 text-sm text-stone-500">Bravo, course terminée 🎉</p>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={submitPinCode} className="relative">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <ShieldCheck className="h-7 w-7" />
                    </span>
                    <h3 id="pin-title" className="font-ledger text-2xl text-ink">Code du client</h3>
                    <p className="mt-1 text-sm text-stone-500">Demandez au client son code secret à 4 chiffres.</p>
                    {pinOrder && (
                      <p className={`mx-auto mb-5 mt-4 flex w-max max-w-full items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${isPrepaid(pinOrder) ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-900'}`}>
                        {isPrepaid(pinOrder)
                          ? <><CreditCard className="h-4 w-4 shrink-0" /> Déjà payée ({paymentLabel(pinOrder)}) : n'encaissez rien</>
                          : <><Banknote className="h-4 w-4 shrink-0" /> Encaissez {fmt(cashToCollect(pinOrder))} FCFA avant de valider</>}
                      </p>
                    )}
                    {!pinOrder && <div className="mb-7" />}

                    <div className="relative mb-3" onClick={() => pinInputRef.current?.focus()}>
                      <input
                        ref={pinInputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        autoFocus
                        aria-label="Code à 4 chiffres"
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        value={pinModal.pinValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPinModal({ ...pinModal, pinValue: val, error: '' });
                        }}
                        disabled={pinModal.isLoading}
                      />
                      <motion.div key={pinModal.shake} animate={pinModal.shake ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.5 }} className="grid grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map((i) => {
                          const ch = pinModal.pinValue[i];
                          const current = i === pinModal.pinValue.length;
                          return (
                            <div
                              key={i}
                              className={`flex h-16 items-center justify-center rounded-2xl border-2 font-figures text-3xl font-bold transition-colors ${
                                pinModal.error ? 'border-rose-400 bg-rose-50 text-rose-700' : ch ? 'border-brand-500 bg-brand-50 text-ink' : current ? 'border-brand-300 bg-white' : 'border-[#e8e5dc] bg-[#faf9f6]'
                              }`}
                            >
                              {ch ? (
                                <motion.span initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>{ch}</motion.span>
                              ) : current ? (
                                <span className="h-7 w-0.5 animate-pulse rounded bg-brand-600" />
                              ) : null}
                            </div>
                          );
                        })}
                      </motion.div>
                    </div>

                    <div className="mb-5 h-6">
                      {pinModal.error && <p className="text-sm font-semibold text-rose-600" role="alert">{pinModal.error}</p>}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={pinModal.isLoading || pinModal.pinValue.length !== 4}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {pinModal.isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><CircleCheck className="h-5 w-5" /> Valider la livraison</>}
                    </motion.button>
                    {pinOrder && <p className="mt-3 font-mono text-xs text-stone-400">Commande #{orderRef(pinOrder)}</p>}
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connexion du livreur */}
      <AnimatePresence>
        {showDriverNameModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-jakarta fixed inset-0 z-[100] overflow-y-auto bg-[#f7f6f2]">
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[560px] -translate-x-1/2 rounded-full bg-brand-100/70 blur-[110px]" aria-hidden="true" />
            <div className="relative mx-auto flex min-h-full max-w-[420px] flex-col px-5 py-6">
              <a href="/" className="flex w-max items-center self-start" aria-label="SamaBoutik">
                <Logo markClassName="h-9 w-9" textClassName="text-lg" />
              </a>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-1 flex-col justify-center py-10">
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white shadow-lg">
                  <Moped className="h-6 w-6" />
                </span>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-700">
                  <Store className="h-4 w-4" /> {shopLabel}
                </p>
                <h2 className="font-ledger text-[2rem] leading-tight text-ink">Espace livreur</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Connectez-vous avec le téléphone et le numéro de CNI enregistrés par la boutique.</p>

                <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-stone-600">
                  {[
                    { icon: Navigation, label: 'Courses en direct' },
                    { icon: ShieldCheck, label: 'Remise par code' },
                    { icon: Wallet, label: 'Gains du jour' },
                  ].map((f) => (
                    <li key={f.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e8e5dc] bg-white px-2 py-3">
                      <f.icon className="h-4 w-4 text-brand-700" /> {f.label}
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
                  <ErrorBanner message={loginForm.error} />
                  <Field
                    id="driver-phone"
                    type="tel"
                    inputMode="tel"
                    label="Numéro de téléphone"
                    icon={Phone}
                    placeholder="77 000 00 00"
                    autoComplete="tel"
                    required
                    value={loginForm.phone}
                    onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value, error: '' })}
                    disabled={loginForm.isLoading}
                  />
                  <Field
                    id="driver-cni"
                    label="Numéro de CNI"
                    icon={IdCard}
                    placeholder="Tel qu'enregistré par la boutique"
                    required
                    value={loginForm.cni}
                    onChange={(e) => setLoginForm({ ...loginForm, cni: e.target.value, error: '' })}
                    disabled={loginForm.isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!loginForm.phone.trim() || !loginForm.cni.trim() || loginForm.isLoading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-bold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loginForm.isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <>Commencer ma tournée <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                <p className="mt-6 flex items-center gap-2 text-sm text-stone-500">
                  <ShieldCheck className="h-4 w-4 shrink-0" /> Vos identifiants vous sont donnés par la boutique.
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
