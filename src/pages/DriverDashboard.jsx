import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Phone, CheckCircle, Navigation, Package, Store, BellRing, BellOff, ShieldCheck, X, Truck, ArrowRight, CheckCircle2, ChevronRight, PhoneCall } from 'lucide-react';
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
  const audioContextRef = useRef(null);

  // Vérifier le nom du livreur au chargement
  useEffect(() => {
    const savedName = localStorage.getItem('samaboutik_driver_name');
    if (savedName) {
      setDriverName(savedName);
    } else {
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
        localStorage.setItem('samaboutik_driver_name', data);
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
    <div className="min-h-screen bg-mesh pb-24 font-sans selection:bg-indigo-200 relative overflow-hidden">
      {/* Background Decoratives (Aurora) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-2"></div>

      <header className="relative bg-white/80 backdrop-blur-2xl text-gray-900 pt-16 pb-12 px-6 rounded-b-[2.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border-b border-white/50 overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-teal-50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-indigo-50 rounded-full blur-2xl"></div>
        
        <div className="relative max-w-md mx-auto z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-xs font-black tracking-widest text-indigo-600 uppercase">
                  Livreur: {driverName}
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">{shopName}</h1>
            </div>
            <div className="p-3 bg-gray-100 text-gray-900 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
          </div>
          
          <div className="relative overflow-hidden bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Courses disponibles</p>
              <p className="text-4xl font-black text-gray-900">{availableOrders.length}</p>
            </div>
            
            <button 
              onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                soundEnabled 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                  : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
              }`}
            >
              {soundEnabled ? <BellRing className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
            </button>
          </div>
          
          {!soundEnabled && (
            <p className="text-center text-gray-500 mt-4 text-xs font-medium">
              Cliquez sur la cloche pour activer la sonnerie des nouvelles commandes 🔔
            </p>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-6 relative z-20 space-y-8">
        
        {/* SECTION: Ma course en cours */}
        {activeOrder && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Ma course en cours
            </h2>
            <div className="glass-panel overflow-hidden border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-colors shadow-xl shadow-indigo-500/10">
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-indigo-50/50">
                 <span className="text-indigo-700 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                   <Truck className="w-4 h-4" /> En route
                 </span>
                 <span className="text-gray-400 text-xs font-bold font-mono bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                    #{activeOrder.id.slice(0,5).toUpperCase()}
                 </span>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-1">{activeOrder.customer_name}</h3>
                <div className="flex items-start gap-3 text-gray-600 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                  <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-gray-900 mb-0.5">{activeOrder.delivery_zone}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{activeOrder.customer_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-indigo-50/50 rounded-2xl p-5 mb-6 border border-indigo-100/50">
                  <div>
                    <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-1">Montant à encaisser</p>
                    <p className="text-3xl font-black text-gray-900">{activeOrder.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-lg font-bold text-indigo-700/50">FCFA</span></p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <a href={`tel:${activeOrder.customer_phone}`} className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-gray-50 text-gray-700 py-3.5 rounded-[1.25rem] font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all border border-gray-200/50">
                      <Phone className="w-5 h-5" /> Appeler
                    </a>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.customer_address + ', ' + activeOrder.delivery_zone)}`} target="_blank" rel="noreferrer" className="flex-[2] flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-3.5 rounded-[1.25rem] font-bold text-sm hover:bg-indigo-100 active:scale-95 transition-all border border-indigo-100">
                      <Navigation className="w-5 h-5" /> Lancer le GPS
                    </a>
                  </div>
                  
                  <button onClick={() => openPinModal(activeOrder.id)} className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4.5 rounded-[1.25rem] font-black text-lg hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/25" style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}>
                    <CheckCircle className="w-6 h-6" /> Colis Livré & Encaissé
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Nouvelles courses disponibles */}
        <div>
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            Courses disponibles <span className="bg-gray-200 text-gray-700 text-xs py-0.5 px-2 rounded-full">{availableOrders.length}</span>
          </h2>
          
          {availableOrders.length === 0 ? (
            <div className="glass-panel p-10 text-center mt-4 border border-white/60">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Tout est calme</h3>
              <p className="text-gray-500 font-medium">Aucune nouvelle course pour le moment.</p>
              <button onClick={fetchDriverOrders} className="mt-8 w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold hover:bg-gray-100 active:scale-95 transition-all">
                Rafraîchir
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                        <MapPin className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-gray-900 leading-tight mb-0.5">{order.delivery_zone}</h3>
                        <p className="text-sm text-gray-500 font-medium line-clamp-2">{order.customer_address}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">À encaisser</p>
                       <p className="text-lg font-black text-indigo-600">{order.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-[10px] font-bold opacity-70">FCFA</span></p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-4 mt-1">
                    <div className="flex-1 flex items-center gap-2 text-sm font-bold text-gray-600 bg-gray-50/50 py-2.5 px-3 rounded-xl border border-gray-100/50">
                      <Package className="w-4 h-4 text-gray-400" />
                      {order.cart_items?.length || 1} article(s)
                    </div>
                    <button 
                      onClick={() => assignOrder(order.id)}
                      disabled={!!activeOrder}
                      className="flex-[1.5] flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-[#4F46E5] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-md shadow-gray-900/10"
                    >
                      {activeOrder ? "Course en cours" : "Accepter"}
                      {!activeOrder && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modale de Code PIN Moderne */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => !pinModal.isLoading && setPinModal({ ...pinModal, isOpen: false })}></div>
          
          <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-sm w-full relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/50">
            <button 
              onClick={() => !pinModal.isLoading && setPinModal({ ...pinModal, isOpen: false })}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 pt-10 text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Vérification</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">
                Demandez au client son code secret à <span className="font-bold text-orange-600">4 chiffres</span> pour valider cette livraison.
              </p>

              <form onSubmit={submitPinCode}>
                <input
                  type="text"
                  pattern="\d*"
                  maxLength="4"
                  required
                  autoFocus
                  placeholder="• • • •"
                  className="w-full text-center text-4xl tracking-[0.5em] font-black text-gray-900 bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all mb-2"
                  value={pinModal.pinValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinModal({ ...pinModal, pinValue: val, error: '' });
                  }}
                  disabled={pinModal.isLoading}
                />
                
                <div className="h-6 mb-6">
                  {pinModal.error && (
                    <p className="text-sm font-bold text-red-500 animate-pulse">{pinModal.error}</p>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={pinModal.isLoading || pinModal.pinValue.length !== 4}
                  onMouseEnter={playPop}
                  className="relative overflow-hidden group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 rounded-[1.25rem] font-black text-lg hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:active:scale-100 animate-shine"
                >
                  {pinModal.isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Valider la livraison"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Identification Sécurisée du Livreur */}
      {showDriverNameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
          <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/50 max-w-sm w-full relative z-10 overflow-hidden animate-in zoom-in duration-300 p-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Accès Sécurisé</h3>
            <p className="text-gray-500 text-sm font-medium mb-8">
              Veuillez saisir vos identifiants de livreur enregistrés.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-2">N° Téléphone</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: 01 23 45 67 89"
                  className="w-full text-center text-lg font-bold text-gray-900 bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                  value={loginForm.phone}
                  onChange={(e) => setLoginForm({...loginForm, phone: e.target.value, error: ''})}
                  disabled={loginForm.isLoading}
                />
              </div>
              
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider ml-2">N° Pièce (CNI)</label>
                <input
                  type="text"
                  required
                  placeholder="Numéro de votre pièce d'identité"
                  className="w-full text-center text-lg font-bold text-gray-900 bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                  value={loginForm.cni}
                  onChange={(e) => setLoginForm({...loginForm, cni: e.target.value, error: ''})}
                  disabled={loginForm.isLoading}
                />
              </div>
              
              {loginForm.error && (
                <p className="text-sm font-bold text-red-500 mt-2 bg-red-50 py-2 rounded-lg border border-red-100">{loginForm.error}</p>
              )}

              <button 
                type="submit"
                disabled={!loginForm.phone.trim() || !loginForm.cni.trim() || loginForm.isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 rounded-[1.25rem] font-black text-lg hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 mt-4"
              >
                {loginForm.isLoading ? (
                   <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Se Connecter <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
