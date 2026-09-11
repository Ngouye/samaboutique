import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Phone, CheckCircle, Navigation, Package, Store, BellRing, BellOff, ShieldCheck, X, Truck, ArrowRight, CheckCircle2, ChevronRight, PhoneCall, User, Activity, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playPop } from '../utils/audio';

export default function DriverDashboard() {
  const { shopName } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pinModal, setPinModal] = useState({ isOpen: false, orderId: null, pinValue: '', error: '', isLoading: false });
  const [driverName, setDriverName] = useState('');
  const [showDriverNameModal, setShowDriverNameModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: '', cni: '', error: '', isLoading: false });
  const [activeTab, setActiveTab] = useState('courses');
  const audioContextRef = useRef(null);

  // Vérifier le nom du livreur au chargement
  useEffect(() => {
    try {
      const savedName = sessionStorage.getItem('samaboutik_driver_name');
      if (savedName) {
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
    if (!soundEnabled) return;
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
      
      if (data) {
        try {
          sessionStorage.setItem('samaboutik_driver_name', data);
        } catch (e) {
          console.error("Storage access error:", e);
        }
        setDriverName(data);
        setShowDriverNameModal(false);
      }
    } catch (err) {
      setLoginForm({ ...loginForm, isLoading: false, error: "Identifiants incorrects ou non enregistrés." });
    }
  };

  const enableSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContextRef.current.resume().then(() => {
      setSoundEnabled(true);
      playNotificationSound();
    });
  };

  useEffect(() => {
    let subscription;
    
    const init = async () => {
      const mData = await fetchDriverOrders();
      
      if (mData) {
        subscription = supabase
          .channel('public:orders')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders', filter: `merchant_id=eq.${mData.id}` },
            (payload) => {
              const newOrder = payload.new;
              if (newOrder.status === 'PREPARING' || newOrder.status === 'IN_TRANSIT' || newOrder.status === 'DELIVERED') {
                if (newOrder.status === 'PREPARING') playNotificationSound();
                fetchDriverOrders();
              }
            }
          )
          .subscribe();
      }
    };

    init();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [shopName, soundEnabled]); 

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
        
        const { data: ordersData, error } = await supabase.rpc('get_driver_orders', {
          p_shop_name: decodedName
        });
        
        if (error) throw error;
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

  // Nouvelle fonction pour accepter une course
  const assignOrder = async (orderId) => {
    try {
      const { error } = await supabase.rpc('assign_order_to_driver', {
        p_order_id: orderId,
        p_driver_name: driverName
      });
      
      if (error) throw error;
      
      fetchDriverOrders();
    } catch (err) {
      alert(err.message);
      fetchDriverOrders(); // Rafraîchir au cas où elle aurait disparu
    }
  };

  const openPinModal = (orderId) => {
    setPinModal({ isOpen: true, orderId, pinValue: '', error: '', isLoading: false });
  };

  const submitPinCode = async (e) => {
    e.preventDefault();
    if (!pinModal.pinValue || pinModal.pinValue.length !== 4) {
      setPinModal(prev => ({ ...prev, error: 'Veuillez entrer les 4 chiffres.' }));
      return;
    }
    
    setPinModal(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const { data: success, error } = await supabase.rpc('mark_order_delivered', {
        p_order_id: pinModal.orderId,
        p_pin: pinModal.pinValue.trim(),
        p_driver_name: driverName
      });
      
      if (error) {
         setPinModal(prev => ({ ...prev, error: error.message, isLoading: false }));
         return;
      }
      
      if (success) {
        // Célébration de la livraison !
        playSuccess();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#10B981', '#3B82F6', '#F59E0B']
        });
        
        setOrders(orders.filter(o => o.id !== pinModal.orderId));
        setPinModal({ isOpen: false, orderId: null, pinValue: '', error: '', isLoading: false });
      } else {
        setPinModal(prev => ({ ...prev, error: 'Code incorrect !', isLoading: false }));
      }
    } catch (err) {
      setPinModal(prev => ({ ...prev, error: "Erreur réseau.", isLoading: false }));
    }
  };

  // Logique de séparation des commandes
  const activeOrder = orders.find(o => o.status === 'IN_TRANSIT' && o.driver_name === driverName);
  // Les commandes disponibles sont celles en PREPARING
  const availableOrders = orders.filter(o => o.status === 'PREPARING');
  // Les commandes livrées aujourd'hui
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' && o.driver_name === driverName);
  const totalGains = deliveredOrders.reduce((sum, o) => sum + (o.total_amount_fcfa || 0), 0);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('samaboutik_driver_name');
    } catch (e) {
      console.error("Storage access error:", e);
    }
    setDriverName('');
    setActiveTab('courses');
    setShowDriverNameModal(true);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600 border-solid mb-4"></div>
      <p className="text-gray-500 font-medium">Chargement des courses...</p>
    </div>
  );

  if (!merchant) return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center mx-4">
        <img src="/logo.jpg" alt="Logo" className="w-24 h-24 mx-auto mb-4 mix-blend-multiply opacity-50" />
        <h2 className="text-xl font-bold text-gray-700">Boutique introuvable</h2>
        <p className="text-gray-500 mt-2">Ce lien livreur est invalide.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans relative overflow-hidden pb-24">
      {/* Background Dark Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0F172A] to-[#0F172A] -z-10"></div>
      
      {/* Header Pro */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 border-2 border-slate-800">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">{driverName}</h1>
              <p className="text-xs text-slate-400 font-medium">En ligne • {shopName}</p>
            </div>
          </div>
          <button 
            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              soundEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 relative z-20 space-y-6">
        
        {/* STATS RAPIDES (Seulement sur l'onglet Courses) */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
               <p className="text-xs font-medium text-slate-400 mb-1">Courses du jour</p>
               <p className="text-2xl font-black text-slate-100">{deliveredOrders.length}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
               <p className="text-xs font-medium text-slate-400 mb-1">Total encaissé</p>
               <p className="text-xl font-black text-emerald-400">
                 {totalGains.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
               </p>
            </div>
          </div>
        )}

        {/* SECTION: Ma course en cours */}
        {activeTab === 'courses' && activeOrder && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               Course en cours
            </h2>
            <div className="bg-slate-800 border-2 border-indigo-500/50 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/10">
              <div className="bg-indigo-500/10 px-6 py-4 border-b border-indigo-500/20 flex justify-between items-center">
                 <span className="text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                   <Navigation className="w-4 h-4" /> En route
                 </span>
                 <span className="text-slate-300 text-xs font-mono bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-700">
                    #{activeOrder.id.slice(0,5).toUpperCase()}
                 </span>
              </div>
              
              <div className="p-6">
                <h3 className="text-2xl font-black text-white mb-6">{activeOrder.customer_name}</h3>
                
                <div className="relative pl-6 border-l-2 border-slate-700 space-y-6 mb-8">
                   <div className="relative">
                      <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-indigo-500 border-[3px] border-slate-800"></div>
                      <p className="text-xs text-slate-400 font-medium mb-1">Point de départ</p>
                      <p className="text-sm font-bold text-slate-200">{shopName}</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-emerald-500 border-[3px] border-slate-800 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <p className="text-xs text-slate-400 font-medium mb-1">Destination ({activeOrder.delivery_zone})</p>
                      <p className="text-base font-bold text-white">{activeOrder.customer_address}</p>
                   </div>
                </div>

                <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Montant à encaisser</p>
                  <p className="text-3xl font-black text-emerald-400">{activeOrder.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-base font-bold opacity-50">FCFA</span></p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <a href={`tel:${activeOrder.customer_phone}`} className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-400 py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                      <PhoneCall className="w-5 h-5" /> Appeler
                    </a>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.customer_address + ', ' + activeOrder.delivery_zone)}`} target="_blank" rel="noreferrer" className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                      <Navigation className="w-5 h-5" /> Navigation
                    </a>
                  </div>
                  
                  <button onClick={() => openPinModal(activeOrder.id)} className="w-full mt-2 flex items-center justify-center gap-2 bg-white text-slate-900 py-4.5 rounded-[1.25rem] font-black text-lg hover:bg-slate-100 active:scale-[0.98] transition-all shadow-xl shadow-white/10" style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Livré & Encaissé
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Nouvelles courses disponibles */}
        {activeTab === 'courses' && (
          <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            Radar des Courses <span className="bg-slate-700 text-slate-300 text-[10px] py-0.5 px-2 rounded-full">{availableOrders.length}</span>
          </h2>
          
          {availableOrders.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center justify-center min-h-[250px]">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping"></div>
                <Navigation className="w-8 h-8 text-indigo-400 opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-2">En recherche...</h3>
              <p className="text-slate-500 text-sm">Aucune nouvelle course dans la zone.</p>
              <button onClick={fetchDriverOrders} className="mt-6 text-indigo-400 font-medium text-sm hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-full">
                Rafraîchir
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-slate-800 rounded-[1.5rem] p-5 shadow-lg border border-slate-700 hover:border-slate-600 transition-all flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="inline-block px-2 py-1 bg-slate-900 rounded-md text-[10px] font-mono text-slate-400 border border-slate-700 mb-2">#{order.id.slice(0,5).toUpperCase()}</span>
                      <h3 className="text-lg font-black text-white mb-1">{order.delivery_zone}</h3>
                      <p className="text-sm text-slate-400 font-medium line-clamp-2 max-w-[80%]">{order.customer_address}</p>
                    </div>
                    <div className="text-right shrink-0 bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Gain/Encaissement</p>
                       <p className="text-lg font-black text-emerald-400">{order.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-[10px] font-bold opacity-70">CFA</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-3 mt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900 py-2 px-3 rounded-lg border border-slate-700">
                      <Package className="w-3.5 h-3.5 text-slate-500" />
                      {order.cart_items?.length || 1} article(s)
                    </div>
                    <button 
                      onClick={() => assignOrder(order.id)}
                      disabled={!!activeOrder}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-500 shadow-lg shadow-indigo-600/20"
                    >
                      {activeOrder ? "Course en cours" : "Accepter la course"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* SECTION: Gains */}
        {activeTab === 'gains' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              Bilan du jour
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 shadow-xl mb-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-400 font-medium mb-1">Total encaissé aujourd'hui</p>
              <h3 className="text-4xl font-black text-white">{totalGains.toLocaleString('fr-FR')} <span className="text-lg opacity-50">CFA</span></h3>
            </div>
            
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              Historique des courses livrées ({deliveredOrders.length})
            </h2>
            {deliveredOrders.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm">Aucune course livrée pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveredOrders.map(order => (
                  <div key={order.id} className="bg-slate-800 rounded-2xl p-4 flex justify-between items-center border border-slate-700/50">
                    <div>
                      <p className="text-white font-bold">{order.delivery_zone}</p>
                      <p className="text-xs text-slate-500 font-mono">#{order.id.slice(0,5).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-black">+{order.total_amount_fcfa.toLocaleString('fr-FR')} CFA</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Profil */}
        {activeTab === 'profil' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              Mon Profil
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-[2rem] p-6 shadow-xl text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-indigo-500/20 mb-4">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-black text-white mb-1">{driverName}</h3>
              <p className="text-slate-400 font-medium mb-6">Livreur partenaire • {shopName}</p>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 py-3.5 rounded-2xl font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20"
              >
                <LogOut className="w-5 h-5" /> Déconnexion
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Barre de navigation bas factice (Bottom Nav) */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 z-40 pb-safe">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('courses')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'courses' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Navigation className="w-6 h-6" />
            <span className="text-[10px] font-bold">Courses</span>
          </button>
          <button 
            onClick={() => setActiveTab('gains')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'gains' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] font-bold">Gains</span>
          </button>
          <button 
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'profil' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profil</span>
          </button>
        </div>
      </nav>

      {/* Modale de Code PIN Moderne */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-700 max-w-sm w-full relative z-10 overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in duration-300 pb-safe">
            <button 
              onClick={() => !pinModal.isLoading && setPinModal({ ...pinModal, isOpen: false })}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Code Client</h3>
              <p className="text-slate-400 text-sm font-medium mb-8">
                Demandez au client son code secret à 4 chiffres pour valider.
              </p>

              <form onSubmit={submitPinCode}>
                <input
                  type="text"
                  pattern="\d*"
                  maxLength="4"
                  required
                  autoFocus
                  placeholder="• • • •"
                  className="w-full text-center text-5xl tracking-[0.3em] font-black text-white bg-slate-900 border-2 border-slate-700 rounded-2xl py-6 focus:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all mb-2"
                  value={pinModal.pinValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinModal({ ...pinModal, pinValue: val, error: '' });
                  }}
                  disabled={pinModal.isLoading}
                />
                
                <div className="h-6 mb-6">
                  {pinModal.error && (
                    <p className="text-sm font-bold text-rose-500 animate-pulse">{pinModal.error}</p>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={pinModal.isLoading || pinModal.pinValue.length !== 4}
                  onMouseEnter={playPop}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-900 py-4 rounded-[1.25rem] font-black text-xl hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:active:scale-100 disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {pinModal.isLoading ? (
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Valider la livraison"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Identification Sécurisée du Livreur (Magique & Pro) */}
      {showDriverNameModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#030712]/90 backdrop-blur-xl">
          {/* Arrière-plan magique avec lumières floues */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/30 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-purple-600/20 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="bg-slate-900/60 backdrop-blur-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 border border-white/10 max-w-sm w-full relative z-10 overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 p-6 sm:p-8 pb-10 sm:pb-8 text-center pb-safe">
            
            {/* Header / Icon */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center border border-white/10 shadow-inner rotate-3 hover:rotate-0 transition-all duration-300">
                <Truck className="w-10 h-10 text-indigo-400 -rotate-3 hover:rotate-0 transition-all duration-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-2 tracking-tight">Espace Livreur</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              Saisissez vos identifiants pour accéder à vos courses.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="text-left group">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1 group-focus-within:text-indigo-400 transition-colors">Téléphone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="01 23 45 67 89"
                    className="w-full text-lg font-bold text-white bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:border-indigo-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                    value={loginForm.phone}
                    onChange={(e) => setLoginForm({...loginForm, phone: e.target.value, error: ''})}
                    disabled={loginForm.isLoading}
                  />
                </div>
              </div>
              
              <div className="text-left group">
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1 group-focus-within:text-indigo-400 transition-colors">Numéro CNI</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="N° de pièce d'identité"
                    className="w-full text-lg font-bold text-white bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:border-indigo-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                    value={loginForm.cni}
                    onChange={(e) => setLoginForm({...loginForm, cni: e.target.value, error: ''})}
                    disabled={loginForm.isLoading}
                  />
                </div>
              </div>
              
              {loginForm.error && (
                <div className="p-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 animate-in slide-in-from-top-2">
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-xs font-bold text-rose-400 text-left">{loginForm.error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={!loginForm.phone.trim() || !loginForm.cni.trim() || loginForm.isLoading}
                className="relative overflow-hidden group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-[1.25rem] font-black text-lg hover:from-indigo-400 hover:to-purple-500 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 mt-8"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                {loginForm.isLoading ? (
                   <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"></div>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">Se Connecter <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
