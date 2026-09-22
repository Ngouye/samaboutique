import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapPin, Phone, CheckCircle, Navigation, Package, Store, BellRing, BellOff, ShieldCheck, X, Truck, ArrowRight, CheckCircle2, ChevronRight, PhoneCall, User, Activity, LogOut, MessageCircle } from 'lucide-react';
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
  const totalGains = deliveredOrders.reduce((sum, o) => sum + (o.payment_method === 'MOBILE_MONEY' ? 0 : (o.total_amount_fcfa || 0)), 0);
  const totalDeliveryFees = deliveredOrders.reduce((sum, o) => {
    const cartTotal = o.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
    return sum + (o.total_amount_fcfa - cartTotal);
  }, 0);
  const amountToReturn = totalGains - totalDeliveryFees;

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
        <img src="/logo.png" alt="Logo" className="w-48 md:w-64 mx-auto mb-6 object-contain opacity-70" />
        <h2 className="text-xl font-bold text-gray-700">Boutique introuvable</h2>
        <p className="text-gray-500 mt-2">Ce lien livreur est invalide.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative overflow-hidden pb-24">
      {/* Background Dark Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-gray-50 -z-10"></div>
      
      {/* Header Pro */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 border-2 border-white">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">{driverName}</h1>
              <p className="text-xs text-gray-500 font-medium">En ligne • {shopName}</p>
            </div>
          </div>
          <button 
            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              soundEnabled ? 'bg-indigo-500/20 text-indigo-600' : 'bg-white text-gray-400'
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
            <div className="bg-white shadow-sm backdrop-blur-sm border border-gray-100 rounded-2xl p-4">
               <p className="text-xs font-medium text-gray-500 mb-1">Courses du jour</p>
               <p className="text-2xl font-black text-gray-900">{deliveredOrders.length}</p>
            </div>
            <div className="bg-white shadow-sm backdrop-blur-sm border border-gray-100 rounded-2xl p-4">
               <p className="text-xs font-medium text-gray-500 mb-1">Total encaissé</p>
               <p className="text-xl font-black text-emerald-600">
                 {totalGains.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span>
               </p>
            </div>
          </div>
        )}

        {/* SECTION: Ma course en cours */}
        {activeTab === 'courses' && activeOrder && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               Course en cours
            </h2>
            <div className="bg-white border-2 border-indigo-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-500/5">
              <div className="bg-indigo-500/10 px-6 py-4 border-b border-indigo-500/20 flex justify-between items-center">
                 <span className="text-indigo-600 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                   <Navigation className="w-4 h-4" /> En route
                 </span>
                 <span className="text-gray-700 text-xs font-mono bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                    #{activeOrder.id.slice(0,5).toUpperCase()}
                 </span>
              </div>
              
              <div className="p-6">
                <h3 className="text-2xl font-black text-gray-900 mb-6">{activeOrder.customer_name}</h3>
                
                <div className="relative pl-6 border-l-2 border-gray-100 space-y-6 mb-8">
                   <div className="relative">
                      <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-indigo-500 border-[3px] border-gray-100"></div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Point de départ</p>
                      <p className="text-sm font-bold text-gray-800">{shopName}</p>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full bg-emerald-500 border-[3px] border-gray-100 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Destination ({activeOrder.delivery_zone})</p>
                      <p className="text-base font-bold text-gray-900">{activeOrder.customer_address.split(' || GPS: ')[0]}</p>
                      {activeOrder.customer_address.includes(' || GPS: ') && (
                        <a href={activeOrder.customer_address.split(' || GPS: ')[1]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100">
                          <MapPin className="w-4 h-4" /> Itinéraire GPS
                        </a>
                      )}
                   </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Montant à encaisser</p>
                          {activeOrder.payment_method === 'MOBILE_MONEY' ? (
                            <div className="flex flex-col">
                              <span className="text-[12px] font-black bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg mb-1 self-start">DÉJÀ PAYÉ (Wave/OM)</span>
                              <p className="text-xl font-bold text-gray-400 line-through">{activeOrder.total_amount_fcfa.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                          ) : (
                            <p className="text-3xl font-black text-emerald-600">{activeOrder.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-base font-bold opacity-50">FCFA</span></p>
                          )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <a href={`tel:${activeOrder.customer_phone}`} className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-500/20 transition-all border border-emerald-100">
                      <PhoneCall className="w-5 h-5" /> Appeler
                    </a>
                    <a href={`https://wa.me/${activeOrder.customer_phone?.replace(/\+/g, '')}?text=${encodeURIComponent(`Bonjour ${activeOrder.customer_name},\n\n🚚 C'est votre livreur. J'arrive avec votre commande.\n\n🔒 N'oubliez pas de préparer votre code PIN pour valider la livraison.\n\nÀ tout de suite !`)}`} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#25D366] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20">
                      <MessageCircle className="w-5 h-5" /> WhatsApp
                    </a>
                  </div>
                  <a href={activeOrder.customer_address?.includes('|| GPS: ') ? activeOrder.customer_address.split('|| GPS: ')[1].trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.customer_address + ', ' + activeOrder.delivery_zone)}`} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                    <Navigation className="w-5 h-5" /> Navigation Google Maps
                  </a>
                  
                  <button onClick={() => openPinModal(activeOrder.id)} className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 text-white py-4.5 rounded-[1.25rem] font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/20" style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}>
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
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Radar des Courses <span className="bg-gray-100 text-gray-700 text-[10px] py-0.5 px-2 rounded-full">{availableOrders.length}</span>
          </h2>
          
          {availableOrders.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center justify-center min-h-[250px]">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping"></div>
                <Navigation className="w-8 h-8 text-indigo-600 opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">En recherche...</h3>
              <p className="text-gray-400 text-sm">Aucune nouvelle course dans la zone.</p>
              <button onClick={fetchDriverOrders} className="mt-6 text-indigo-600 font-medium text-sm hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-full">
                Rafraîchir
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-[1.5rem] p-5 shadow-lg border border-gray-100 hover:border-gray-200 transition-all flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="inline-block px-2 py-1 bg-white rounded-md text-[10px] font-mono text-gray-500 border border-gray-100 mb-2">#{order.id.slice(0,5).toUpperCase()}</span>
                      <h3 className="text-lg font-black text-gray-900 mb-1">{order.delivery_zone}</h3>
                      <p className="text-sm text-gray-500 font-medium line-clamp-2 max-w-[80%]">{order.customer_address.split(' || GPS: ')[0]}</p>
                    </div>
                        {order.payment_method === 'MOBILE_MONEY' ? (
                           <div className="text-right shrink-0 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                             <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-1 rounded block mb-1">DÉJÀ PAYÉ</span>
                             <span className="text-sm font-bold text-gray-400 line-through">{order.total_amount_fcfa.toLocaleString('fr-FR')} CFA</span>
                           </div>
                        ) : (
                           <div className="text-right shrink-0 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">À encaisser</p>
                              <p className="text-lg font-black text-emerald-600">{order.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-[10px] font-bold opacity-70">CFA</span></p>
                           </div>
                        )}
                  </div>
                  
                  <div className="flex items-center gap-3 pt-3 mt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white py-2 px-3 rounded-lg border border-gray-100">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      {order.cart_items?.length || 1} article(s)
                    </div>
                    <button 
                      onClick={() => assignOrder(order.id)}
                      disabled={!!activeOrder}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-30 disabled:bg-gray-100 disabled:text-gray-400 shadow-lg shadow-indigo-600/20"
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
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              Bilan du jour
            </h2>
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl mb-6 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-gray-500 font-medium mb-1">Total encaissé (espèces)</p>
              <h3 className="text-4xl font-black text-gray-900">{totalGains.toLocaleString('fr-FR')} <span className="text-lg opacity-50">CFA</span></h3>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 font-bold mb-1">Mes Frais (Gains)</p>
                  <p className="text-lg font-black text-emerald-600">+{totalDeliveryFees.toLocaleString('fr-FR')} CFA</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 font-bold mb-1">À reverser</p>
                  <p className={`text-lg font-black ${amountToReturn < 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                    {amountToReturn < 0 ? 'Le marchand doit' : ''} {Math.abs(amountToReturn).toLocaleString('fr-FR')} CFA
                  </p>
                </div>
              </div>
            </div>
            
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              Historique des courses livrées ({deliveredOrders.length})
            </h2>
            {deliveredOrders.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 border-dashed rounded-2xl p-8 text-center">
                <p className="text-gray-400 text-sm">Aucune course livrée pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                    <div>
                      <p className="text-white font-bold">{order.delivery_zone}</p>
                      <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0,5).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-600 font-black">+{order.total_amount_fcfa.toLocaleString('fr-FR')} CFA</p>
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
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              Mon Profil
            </h2>
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-indigo-500/20 mb-4">
                {driverName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">{driverName}</h3>
              <p className="text-gray-500 font-medium mb-6">Livreur partenaire • {shopName}</p>
              
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
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 z-40 pb-safe">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('courses')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'courses' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <Navigation className="w-6 h-6" />
            <span className="text-[10px] font-bold">Courses</span>
          </button>
          <button 
            onClick={() => setActiveTab('gains')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'gains' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] font-bold">Gains</span>
          </button>
          <button 
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'profil' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profil</span>
          </button>
        </div>
      </nav>

      {/* Modale de Code PIN Moderne */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-white/90 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-sm w-full relative z-10 overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in duration-300 pb-safe">
            <button 
              onClick={() => !pinModal.isLoading && setPinModal({ ...pinModal, isOpen: false })}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Code Client</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">
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
                  className="w-full text-center text-5xl tracking-[0.3em] font-black text-gray-900 bg-white border-2 border-gray-100 rounded-2xl py-6 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all mb-2"
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
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-[1.25rem] font-black text-xl hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:active:scale-100 disabled:bg-gray-100 disabled:text-gray-400"
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

      {/* Modale d'Identification Sécurisée du Livreur (Claire & Ultra Moderne) */}
      {showDriverNameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/90 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 max-w-4xl w-full relative z-10 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row">
            
            {/* Image / Illustration Section (Hidden on small mobile, visible on tablet+) */}
            <div className="hidden md:flex md:w-1/2 relative bg-indigo-50 p-8 flex-col justify-center items-center overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-80 mix-blend-multiply"></div>
               <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-indigo-900/20"></div>
               <div className="relative z-10 text-center text-white p-6">
                 <Truck className="w-16 h-16 mx-auto mb-6 text-indigo-300" />
                 <h2 className="text-3xl font-black mb-4">Portail Livreur</h2>
                 <p className="text-indigo-100 text-lg font-medium">Accédez à vos courses, suivez vos gains et livrez en toute simplicité.</p>
               </div>
            </div>

            {/* Form Section */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 pb-safe bg-white">
              <div className="md:hidden flex justify-center mb-6">
                 <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Truck className="w-10 h-10 text-indigo-600" />
                 </div>
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight text-center md:text-left">Bienvenue</h3>
              <p className="text-gray-400 font-medium mb-8 text-center md:text-left">
                Saisissez vos identifiants pour commencer.
              </p>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors">Numéro de Téléphone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 01 23 45 67 89"
                      className="w-full text-lg font-bold text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 pl-12 pr-4 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all placeholder:text-gray-500"
                      value={loginForm.phone}
                      onChange={(e) => setLoginForm({...loginForm, phone: e.target.value, error: ''})}
                      disabled={loginForm.isLoading}
                    />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest group-focus-within:text-indigo-600 transition-colors">Numéro CNI</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ShieldCheck className="w-5 h-5 text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Votre pièce d'identité"
                      className="w-full text-lg font-bold text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 pl-12 pr-4 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all placeholder:text-gray-500"
                      value={loginForm.cni}
                      onChange={(e) => setLoginForm({...loginForm, cni: e.target.value, error: ''})}
                      disabled={loginForm.isLoading}
                    />
                  </div>
                </div>
                
                {loginForm.error && (
                  <div className="p-4 mt-2 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                       <X className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-sm font-bold text-rose-600">{loginForm.error}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={!loginForm.phone.trim() || !loginForm.cni.trim() || loginForm.isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-[1.25rem] font-black text-lg hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 mt-8"
                  style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}
                >
                  {loginForm.isLoading ? (
                     <div className="w-6 h-6 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Se Connecter <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
