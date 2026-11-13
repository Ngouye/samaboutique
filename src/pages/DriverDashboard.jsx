import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  MapPin, Phone, Navigation, Package, BellRing, BellOff, ShieldCheck, X, ArrowRight, CheckCircle2,
  PhoneCall, User, LogOut, MessageCircle, Bike, Radar, Wallet, Coins, HandCoins, Store, RefreshCw, Check,
  Clock, IdCard, Flag, LoaderCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playPop } from '../utils/audio';
import { CountUp } from '../components/landing/Magic';
import { Field, ErrorBanner, EASE } from '../components/auth/AuthUI';
import { friendlyError } from '../utils/networkErrors';
import LiveLocationShare from '../components/driver/LiveLocationShare';
import { parseOrderAddress, orderMapsUrl } from '../utils/orderAddress';
import { BRAND } from '../utils/brand';
import { paymentLabel } from '../utils/payments';
import LogoutDialog from '../components/LogoutDialog';
import { showFarewell } from '../utils/farewell';
import Logo from '../components/brand/Logo';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const addressOf = (o) => parseOrderAddress(o.customer_address).address;
const hasGps = (o) => Boolean(parseOrderAddress(o.customer_address).coords);
const EMPTY_PIN = { isOpen: false, orderId: null, pinValue: '', error: '', isLoading: false, success: false, shake: 0 };

function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,_var(--color-brand-300)_8%,_transparent)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
    </div>
  );
}

function AmountBadge({ order, large = false }) {
  if (order.payment_method === 'MOBILE_MONEY') {
    return (
      <div className={large ? '' : 'text-right'}>
        <span className="inline-flex items-center gap-1 rounded-lg bg-sky-400/15 px-2 py-1 text-[11px] font-extrabold text-sky-300">
          <Check className="h-3 w-3" strokeWidth={3} /> DÉJÀ PAYÉ ({paymentLabel(order)})
        </span>
        <p className={`mt-1 font-bold text-white/40 line-through ${large ? 'text-xl' : 'text-sm'}`}>{fmt(order.total_amount_fcfa)} FCFA</p>
      </div>
    );
  }
  return (
    <div className={large ? '' : 'text-right'}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">À encaisser</p>
      <p className={`font-extrabold text-brand-300 ${large ? 'text-4xl' : 'text-xl'}`}>
        {fmt(order.total_amount_fcfa)} <span className="text-xs font-bold text-brand-300/60">FCFA</span>
      </p>
    </div>
  );
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
  const audioContextRef = useRef(null);
  const pinInputRef = useRef(null);
  // Session du livreur : jeton délivré par le serveur (valable 12 h). La CNI n'est jamais conservée.
  const tokenRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const knownOrderIdsRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

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

  // Fonction pour jouer un petit son "Ding"
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

        // Son quand une nouvelle course apparaît sur le radar
        const available = (ordersData || []).filter((o) => o.status === 'PREPARING').map((o) => o.id);
        if (knownOrderIdsRef.current && available.some((id) => !knownOrderIdsRef.current.has(id))) {
          playNotificationSound();
        }
        knownOrderIdsRef.current = new Set(available);

        setOrders(ordersData || []);
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
      fetchDriverOrders();
    } catch (err) {
      alert(friendlyError(err, "La course n'a pas pu être acceptée. Réessayez."));
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
        }, 1500);
      } else {
        setPinModal(prev => ({ ...prev, error: result?.error || 'Code incorrect !', isLoading: false, pinValue: '', shake: prev.shake + 1 }));
      }
    } catch {
      setPinModal(prev => ({ ...prev, error: "Erreur réseau.", isLoading: false, shake: prev.shake + 1 }));
    }
  };

  // Logique de séparation des commandes
  const activeOrder = orders.find(o => o.status === 'IN_TRANSIT' && o.driver_name === driverName);
  const availableOrders = orders.filter(o => o.status === 'PREPARING');
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' && o.driver_name === driverName);
  const totalGains = deliveredOrders.reduce((sum, o) => sum + (o.payment_method === 'MOBILE_MONEY' ? 0 : (o.total_amount_fcfa || 0)), 0);
  const totalDeliveryFees = deliveredOrders.reduce((sum, o) => {
    const cartTotal = o.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
    return sum + (o.total_amount_fcfa - cartTotal);
  }, 0);
  const amountToReturn = totalGains - totalDeliveryFees;

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

  const shopLabel = decodeURIComponent(shopName);

  // Écran de chargement uniquement au premier chargement (les rafraîchissements gardent l'affichage).
  if (loading && !merchant) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-night text-white">
      <Aurora />
      <motion.span animate={{ x: [-30, 30, -30] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-400 shadow-[0_0_40px_color-mix(in_srgb,_var(--color-brand-400)_50%,_transparent)]">
        <Bike className="h-8 w-8" />
      </motion.span>
      <p className="font-semibold text-white/70">Chargement des courses…</p>
    </div>
  );

  if (!merchant) return (
    <div className="flex min-h-screen items-center justify-center bg-night p-4 text-white">
      <Aurora />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-xl">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15"><Store className="h-8 w-8 text-rose-300" /></span>
        <h2 className="text-2xl font-extrabold">Boutique introuvable</h2>
        <p className="mt-2 text-white/60">Ce lien livreur est invalide. Demandez un nouveau lien au marchand.</p>
      </motion.div>
    </div>
  );

  const tabs = [
    { id: 'courses', label: 'Courses', icon: Navigation, badge: availableOrders.length },
    { id: 'gains', label: 'Gains', icon: Wallet },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen bg-night pb-32 font-sans text-white">
      <Aurora />
      <AnimatePresence>
        {logoutOpen && (
          <LogoutDialog
            key="logout"
            tone="dark"
            name={driverName}
            detail={`Livreur · ${shopLabel}`}
            consequence="Vos courses restent enregistrées. Pour revenir, il faudra votre téléphone et votre numéro de CNI."
            onCancel={() => setLogoutOpen(false)}
            onConfirm={confirmLogout}
          />
        )}
      </AnimatePresence>

      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-400 text-xl font-extrabold text-night shadow-[0_0_24px_color-mix(in_srgb,_var(--color-brand-400)_40%,_transparent)]">
                {driverName.charAt(0).toUpperCase() || '?'}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-night bg-brand-400" />
              </span>
            </span>
            <div>
              <h1 className="font-bold leading-tight">{driverName || 'Livreur'}</h1>
              <p className="text-xs text-white/50">En ligne · {shopLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9, rotate: -10 }} onClick={fetchDriverOrders} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70" aria-label="Rafraîchir">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${soundEnabled ? 'bg-brand-400/20 text-brand-300' : 'bg-white/5 text-white/50'}`}
              aria-label={soundEnabled ? 'Couper le son' : 'Activer le son'}
            >
              {soundEnabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-md space-y-6 px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'courses' && (
            <motion.div key="courses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }} className="space-y-6">
              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Livrées', value: deliveredOrders.length, icon: CheckCircle2, cls: 'from-emerald-400/20 text-emerald-300' },
                  { label: 'Encaissé', value: `${fmt(totalGains)}`, icon: Coins, cls: 'from-amber-400/20 text-amber-300' },
                  { label: 'Mes gains', value: `${fmt(totalDeliveryFees)}`, icon: HandCoins, cls: 'from-sky-400/20 text-sky-300' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${s.cls} to-transparent p-3.5`}>
                    <s.icon className="mb-2 h-5 w-5" />
                    <p className="text-lg font-extrabold text-white">{s.value}</p>
                    <p className="text-[11px] font-medium text-white/50">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Course en cours */}
              {activeOrder && (
                <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" /> Course en cours
                  </h2>
                  <div className="rounded-[2rem] border border-brand-400/25">
                    <div className="overflow-hidden rounded-[2rem] bg-night">
                      <div className="flex items-center justify-between border-b border-white/5 bg-brand-400/10 px-5 py-3.5">
                        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-300">
                          <Bike className="h-4 w-4" /> En route
                        </span>
                        <span className="rounded-lg bg-white/5 px-2.5 py-1 font-mono text-xs text-white/60">#{activeOrder.id.slice(0, 5).toUpperCase()}</span>
                      </div>

                      <div className="p-5">
                        <h3 className="mb-5 text-2xl font-extrabold">{activeOrder.customer_name}</h3>

                        <LiveLocationShare token={tokenRef.current} orderId={activeOrder.id} onSessionExpired={expireSession} />

                        {/* Trajet */}
                        <div className="relative mb-6 pl-8">
                          <div className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-gradient-to-b from-brand-400 to-amber-300" />
                          <motion.span initial={{ top: '8%' }} animate={{ top: '40%' }} transition={{ duration: 1.2, ease: EASE }} className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-night shadow-[0_0_16px_rgba(255,255,255,0.6)]">
                            <Bike className="h-3.5 w-3.5" />
                          </motion.span>
                          <div className="mb-5">
                            <p className="text-xs text-white/40">Départ</p>
                            <p className="flex items-center gap-1.5 font-bold"><Store className="h-4 w-4 text-brand-300" /> {shopLabel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40">Destination · {activeOrder.delivery_zone}</p>
                            <p className="flex items-start gap-1.5 text-lg font-bold"><Flag className="mt-1 h-4 w-4 shrink-0 text-amber-300" /> {addressOf(activeOrder)}</p>
                          </div>
                        </div>

                        <div className="mb-5 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                          <AmountBadge order={activeOrder} large />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <motion.a whileTap={{ scale: 0.94 }} href={`tel:${activeOrder.customer_phone}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-brand-400/10 py-3.5 text-sm font-bold text-brand-300 ring-1 ring-brand-400/20">
                            <PhoneCall className="h-5 w-5" /> Appeler
                          </motion.a>
                          <motion.a whileTap={{ scale: 0.94 }} href={`https://wa.me/${activeOrder.customer_phone?.replace(/\+/g, '')}?text=${encodeURIComponent(`Bonjour ${activeOrder.customer_name},\n\n🚚 C'est votre livreur. J'arrive avec votre commande.\n\n🔒 N'oubliez pas de préparer votre code PIN pour valider la livraison.\n\nÀ tout de suite !`)}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#25D366]/10 py-3.5 text-sm font-bold text-[#4ade80] ring-1 ring-[#25D366]/25">
                            <MessageCircle className="h-5 w-5" /> WhatsApp
                          </motion.a>
                          <motion.a whileTap={{ scale: 0.94 }} href={orderMapsUrl(activeOrder)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-sky-400/10 py-3.5 text-sm font-bold text-sky-300 ring-1 ring-sky-400/20">
                            {hasGps(activeOrder) ? <MapPin className="h-5 w-5" /> : <Navigation className="h-5 w-5" />} Itinéraire
                          </motion.a>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => openPinModal(activeOrder.id)}
                          className="relative mt-4 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-brand-400 hover:bg-brand-300 py-5 text-lg font-extrabold text-night shadow-[0_0_40px_color-mix(in_srgb,_var(--color-brand-400)_35%,_transparent)]"
                        >
                          <ShieldCheck className="h-6 w-6" /> Livré & encaissé
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Radar des courses */}
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
                  <Radar className="h-4 w-4 text-brand-300" /> Radar des courses
                  <span className="rounded-full bg-brand-400/15 px-2 py-0.5 text-[10px] text-brand-300">{availableOrders.length}</span>
                </h2>

                {availableOrders.length === 0 ? (
                  <div className="flex flex-col items-center rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                    <div className="relative mb-6 h-40 w-40">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="absolute rounded-full border border-brand-400/20" style={{ inset: `${i * 22}px` }} />
                      ))}
                      <span className="absolute inset-0 animate-spin rounded-full" style={{ background: 'conic-gradient(from 0deg, color-mix(in srgb, var(--color-brand-400) 35%, transparent), transparent 28%)', animationDuration: '3s' }} />
                      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-400 text-night shadow-[0_0_24px_color-mix(in_srgb,_var(--color-brand-400)_70%,_transparent)]">
                        <Bike className="h-5 w-5" />
                      </span>
                      <motion.span animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="absolute left-[22%] top-[26%] h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <motion.span animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: 1.4 }} className="absolute bottom-[24%] right-[20%] h-2 w-2 rounded-full bg-sky-300" />
                    </div>
                    <h3 className="text-lg font-bold">En recherche de courses…</h3>
                    <p className="mt-1 text-sm text-white/50">Aucune nouvelle course pour le moment. Activez le son pour être alerté.</p>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={fetchDriverOrders} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-400/15 px-5 py-2.5 text-sm font-bold text-brand-300">
                      <RefreshCw className="h-4 w-4" /> Rafraîchir
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {availableOrders.map((order, i) => (
                        <motion.article
                          key={order.id}
                          layout
                          initial={{ opacity: 0, x: 40 }}
                          animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}
                          exit={{ opacity: 0, x: -60 }}
                          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                        >
                          <span className="absolute inset-y-0 left-0 w-1 bg-brand-400" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/50">#{order.id.slice(0, 5).toUpperCase()}</span>
                              <h3 className="text-lg font-extrabold">{order.delivery_zone}</h3>
                              <p className="mt-0.5 line-clamp-2 flex items-start gap-1 text-sm text-white/60"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {addressOf(order)}</p>
                            </div>
                            <AmountBadge order={order} />
                          </div>
                          <div className="mt-4 flex items-center gap-2.5">
                            <span className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-white/70">
                              <Package className="h-3.5 w-3.5" /> {order.cart_items?.length || 1} art.
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => assignOrder(order.id)}
                              disabled={!!activeOrder || assigningId === order.id}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-400 hover:bg-brand-300 py-3 font-extrabold text-night shadow-[0_8px_24px_-8px_color-mix(in_srgb,_var(--color-brand-400)_60%,_transparent)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
                            >
                              {assigningId === order.id ? <LoaderCircle className="h-5 w-5 animate-spin" /> : activeOrder ? <><Clock className="h-4 w-4" /> Course en cours</> : <>Accepter <ArrowRight className="h-4 w-4" /></>}
                            </motion.button>
                          </div>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'gains' && (
            <motion.div key="gains" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }} className="space-y-6">
              <div className="relative overflow-hidden rounded-[2rem] bg-brand-700 p-6 shadow-[0_24px_48px_-20px_color-mix(in_srgb,_var(--color-brand-500)_60%,_transparent)]">
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
                <p className="relative text-sm font-medium text-brand-50/90">Total encaissé aujourd'hui (espèces)</p>
                <p className="relative mt-1 text-5xl font-extrabold tracking-tight">
                  <CountUp to={totalGains} /> <span className="text-lg font-semibold text-brand-100/70">FCFA</span>
                </p>
                <div className="relative mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <p className="text-xs text-brand-50/80">Mes frais (gains)</p>
                    <p className="text-lg font-extrabold">+{fmt(totalDeliveryFees)} F</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <p className="text-xs text-brand-50/80">{amountToReturn < 0 ? 'Le marchand vous doit' : 'À reverser'}</p>
                    <p className="text-lg font-extrabold">{fmt(Math.abs(amountToReturn))} F</p>
                  </div>
                </div>
              </div>

              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">Courses livrées ({deliveredOrders.length})</h2>
                {deliveredOrders.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
                    Aucune course livrée pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deliveredOrders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-400/15 text-brand-300"><Check className="h-5 w-5" strokeWidth={3} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{order.delivery_zone}</p>
                          <p className="font-mono text-xs text-white/40">#{order.id.slice(0, 5).toUpperCase()}</p>
                        </div>
                        <p className="font-extrabold text-brand-300">+{fmt(order.total_amount_fcfa)} F</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'profil' && (
            <motion.div key="profil" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: EASE }}>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-400/20 to-transparent" />
                <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-brand-400 text-4xl font-extrabold text-night shadow-[0_0_40px_color-mix(in_srgb,_var(--color-brand-400)_40%,_transparent)]">
                  {driverName.charAt(0).toUpperCase() || '?'}
                </motion.span>
                <h3 className="relative text-2xl font-extrabold">{driverName}</h3>
                <p className="relative mt-1 text-white/50">Livreur partenaire · {shopLabel}</p>
                <div className="relative mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-extrabold">{deliveredOrders.length}</p><p className="text-xs text-white/50">Livrées</p></div>
                  <div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-extrabold">{availableOrders.length}</p><p className="text-xs text-white/50">Disponibles</p></div>
                </div>
                {merchant?.phone_number && (
                  <a href={`tel:${merchant.phone_number}`} className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-3.5 font-bold text-white/80 ring-1 ring-white/10">
                    <Phone className="h-5 w-5" /> Appeler la boutique
                  </a>
                )}
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout} className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 py-3.5 font-bold text-rose-300 ring-1 ring-rose-400/20">
                  <LogOut className="h-5 w-5" /> Déconnexion
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation basse */}
      <nav className="fixed inset-x-3 bottom-3 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md items-center justify-around rounded-3xl border border-white/10 bg-night/85 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5">
                {active && <motion.span layoutId="driver-tab" className="absolute inset-0 rounded-2xl bg-brand-400/15 ring-1 ring-brand-400/25" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative">
                  <t.icon className={`h-6 w-6 transition-colors ${active ? 'text-brand-300' : 'text-white/40'}`} />
                  {t.badge > 0 && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-night">{t.badge}</span>}
                </span>
                <span className={`relative text-[11px] font-bold ${active ? 'text-white' : 'text-white/40'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modale code PIN */}
      <AnimatePresence>
        {pinModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closePinModal} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="relative w-full max-w-sm overflow-hidden rounded-t-[2rem] border border-white/10 bg-night p-7 pb-10 text-center sm:rounded-[2rem]"
            >
              <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-brand-400/25 blur-3xl" />
              <button onClick={closePinModal} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/60" aria-label="Fermer"><X className="h-5 w-5" /></button>

              <AnimatePresence mode="wait">
                {pinModal.success ? (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative py-8">
                    <motion.span initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-night shadow-[0_0_60px_color-mix(in_srgb,_var(--color-brand-400)_60%,_transparent)]">
                      <Check className="h-12 w-12" strokeWidth={3} />
                    </motion.span>
                    <h3 className="text-2xl font-extrabold">Livraison validée !</h3>
                    <p className="mt-1 text-white/60">Bravo, course terminée 🎉</p>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={submitPinCode} className="relative">
                    <motion.span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-400/15 text-brand-300">
                      <ShieldCheck className="h-8 w-8" />
                    </motion.span>
                    <h3 className="text-2xl font-extrabold">Code client</h3>
                    <p className="mb-7 mt-1 text-sm text-white/60">Demandez au client son code secret à 4 chiffres.</p>

                    <div className="relative mb-3" onClick={() => pinInputRef.current?.focus()}>
                      <input
                        ref={pinInputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        autoFocus
                        aria-label="Code PIN à 4 chiffres"
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
                              className={`flex h-[4.5rem] items-center justify-center rounded-2xl border-2 text-4xl font-extrabold transition-colors ${
                                pinModal.error ? 'border-rose-400/60 bg-rose-400/10' : ch ? 'border-brand-400 bg-brand-400/10' : current ? 'border-brand-400/50 bg-white/5' : 'border-white/10 bg-white/5'
                              }`}
                            >
                              {ch ? (
                                <motion.span initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>{ch}</motion.span>
                              ) : current ? (
                                <span className="h-8 w-0.5 animate-pulse rounded bg-brand-400" />
                              ) : null}
                            </div>
                          );
                        })}
                      </motion.div>
                    </div>

                    <div className="mb-5 h-6">
                      {pinModal.error && <p className="text-sm font-bold text-rose-300">{pinModal.error}</p>}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={pinModal.isLoading || pinModal.pinValue.length !== 4}
                      onMouseEnter={playPop}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-400 hover:bg-brand-300 py-4 text-lg font-extrabold text-night shadow-[0_0_30px_color-mix(in_srgb,_var(--color-brand-400)_35%,_transparent)] transition-opacity disabled:opacity-30 disabled:shadow-none"
                    >
                      {pinModal.isLoading ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <><CheckCircle2 className="h-6 w-6" /> Valider la livraison</>}
                    </motion.button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-jakarta fixed inset-0 z-[100] overflow-y-auto bg-night">
            <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[640px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" aria-hidden="true" />
            <div className="relative mx-auto flex min-h-full max-w-[420px] flex-col px-5 py-6">
              <a href="/" className="flex w-max items-center self-start" aria-label="SamaBoutik">
                <Logo variant="dark" markClassName="h-9 w-9" textClassName="text-lg" />
              </a>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-1 flex-col justify-center py-10">
                <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-400 text-night">
                  <Bike className="h-7 w-7" />
                </span>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-300">
                  <Store className="h-4 w-4" /> {shopLabel}
                </p>
                <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-white">Espace livreur</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">Connectez-vous avec le téléphone et le numéro de CNI enregistrés par la boutique.</p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
                  <ErrorBanner message={loginForm.error} dark />
                  <Field
                    dark
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
                    dark
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-400 text-[15px] font-bold text-night transition-colors hover:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loginForm.isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <>Commencer ma tournée <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
                <p className="mt-6 flex items-center gap-2 text-sm text-white/45">
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
