import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Package, ShoppingBag, Store, Activity, X, Menu, QrCode, BarChart3, Truck, ExternalLink, Image as ImageIcon, Users, UserPlus, Trash2, BellRing, BellOff, Search, Filter, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MerchantDashboard() {
  const { user, merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_fcfa: '', stock: '', category: '', variants: '', image: null });
  const [uploading, setUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Team (Drivers) State
  const [team, setTeam] = useState([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ full_name: '', phone_number: '', vehicle_type: 'Moto', cni_number: '' });
  const [selectedDriverForStats, setSelectedDriverForStats] = useState(null);
  
  // Audio Notifications & Settings
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef(null);

  // Search & Filters for Orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ description: '', theme_color: '#4F46E5', isSaving: false });

  // Initialize Settings Form when merchant loads
  useEffect(() => {
    if (merchant) {
      setSettingsForm({
        description: merchant.description || '',
        theme_color: merchant.theme_color || '#4F46E5',
        isSaving: false
      });
    }
  }, [merchant]);

  const playNotificationSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log("Erreur audio", e);
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
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
    
    // Subscribe to real-time orders
    const ordersSubscription = supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `merchant_id=eq.${user.id}` }, payload => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
        }
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    if (user) {
      const { data: prodData } = await supabase.from('products').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);
      
      const { data: ordData } = await supabase.from('orders').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (ordData) setOrders(ordData);

      const { data: teamData, error: teamError } = await supabase.from('drivers').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (teamData) setTeam(teamData);
      else if (teamError && teamError.code !== '42P01') console.error(teamError); // Ignore if table doesn't exist yet
    }
    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsForm(prev => ({ ...prev, isSaving: true }));
    try {
      const { error } = await supabase.from('merchants').update({
        description: settingsForm.description,
        theme_color: settingsForm.theme_color
      }).eq('id', user.id);
      
      if (error) throw error;
      alert("Paramètres enregistrés avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement des paramètres.");
    }
    setSettingsForm(prev => ({ ...prev, isSaving: false }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewProduct({ ...newProduct, image: file });
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let image_url = null;
      if (newProduct.image) {
        const fileExt = newProduct.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, newProduct.image);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;
      }

      const variantsArray = newProduct.variants 
        ? newProduct.variants.split(',').map(v => v.trim()).filter(v => v)
        : null;

      const { error } = await supabase.from('products').insert([{
        merchant_id: user.id,
        name: newProduct.name,
        description: newProduct.description,
        price_fcfa: parseInt(newProduct.price_fcfa),
        stock: parseInt(newProduct.stock),
        category: newProduct.category || null,
        variants: variantsArray,
        image_url
      }]);

      if (error) throw error;
      
      setShowProductModal(false);
      setNewProduct({ name: '', description: '', price_fcfa: '', stock: '', category: '', variants: '', image: null });
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'ajout: " + error.message);
    } finally {
      setUploading(false);
    }
  };
  const submitDriver = async (e) => {
    e.preventDefault();
    if (!newDriver.full_name) return;
    try {
      const { error } = await supabase.from('drivers').insert([{
        merchant_id: user.id,
        full_name: newDriver.full_name,
        phone_number: newDriver.phone_number,
        vehicle_type: newDriver.vehicle_type,
        cni_number: newDriver.cni_number
      }]);
      if (error) throw error;
      setShowDriverModal(false);
      setNewDriver({ full_name: '', phone_number: '', vehicle_type: 'Moto', cni_number: '' });
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'ajout du livreur: " + err.message);
    }
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("Supprimer ce livreur ?")) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Erreur de suppression: " + err.message);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert("Erreur de mise à jour");
    else fetchData();
  };

  const generateWhatsAppMessage = (order) => {
    const text = `Bonjour ${order.customer_name},\nVotre commande (Ref: ${order.id.slice(0,6)}) est maintenant ${order.status}.\nTotal: ${order.total_amount_fcfa} FCFA.\nMerci d'avoir choisi ${merchant?.shop_name}!`;
    return `https://wa.me/${order.customer_phone.replace(/\+/g,'')}?text=${encodeURIComponent(text)}`;
  };

  const getShopUrl = () => {
    return `${window.location.origin}/boutique/${encodeURIComponent(merchant?.shop_name || '')}`;
  };

  const getDriverUrl = () => {
    return `${window.location.origin}/livreur/${encodeURIComponent(merchant?.shop_name || '')}`;
  };

  const handleDriverLinkCopy = () => {
    navigator.clipboard.writeText(getDriverUrl());
    alert("Lien Livreur copié dans le presse-papier ! Envoyez-le à vos livreurs.");
  };

  const today = new Date().toDateString();
  const deliveredToday = orders.filter(o => o.status === 'DELIVERED' && new Date(o.created_at).toDateString() === today);
  
  let totalEnbaisse = 0;
  let partLivreur = 0;
  let partMarchand = 0;

  deliveredToday.forEach(order => {
    totalEnbaisse += order.total_amount_fcfa;
    const cartTotal = order.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
    partMarchand += cartTotal;
    partLivreur += (order.total_amount_fcfa - cartTotal);
  });

  const driverBalances = team.map(driver => {
    let dEnbaisse = 0;
    let dPartLivreur = 0;
    let dPartMarchand = 0;
    let count = 0;

    deliveredToday.forEach(order => {
      if (order.driver_name === driver.full_name) {
        count++;
        dEnbaisse += order.total_amount_fcfa;
        const cartTotal = order.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
        dPartMarchand += cartTotal;
        dPartLivreur += (order.total_amount_fcfa - cartTotal);
      }
    });

    return { ...driver, dEnbaisse, dPartLivreur, dPartMarchand, count };
  });

  const stats = {
    revenue: orders.filter(o => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total_amount_fcfa, 0),
    pending: orders.filter(o => o.status === 'PENDING').length,
    totalProducts: products.length
  };

  if (!merchant) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-mesh">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600 border-solid mb-4"></div>
      <p className="text-gray-900 font-medium">Chargement du tableau de bord...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh flex flex-col md:flex-row font-sans selection:bg-indigo-200 relative overflow-hidden">
      {/* Background Decoratives (Aurora) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-2"></div>
      <div className="absolute top-[40%] left-[20%] w-[20%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none animate-aurora-1" style={{animationDelay: '2s'}}></div>
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white/70 backdrop-blur-xl border-b border-white/50 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 text-gray-900">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="SamaBoutik" className="w-full h-full object-cover mix-blend-multiply" />
          </div>
          <span className="font-black text-lg">Admin</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-white/80 backdrop-blur-2xl border-r border-white/50 shadow-2xl">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="SamaBoutik" className="w-full h-full object-cover mix-blend-multiply" />
                </div>
                <h1 className="text-xl font-black text-gray-900">Admin</h1>
              </div>
            </div>
            
            <div className="p-6 pb-0">
              <div className="bg-white/80 rounded-2xl p-4 border border-white shadow-sm flex flex-col gap-2">
                <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white font-bold px-4 py-2.5 rounded-xl hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all text-sm relative overflow-hidden group animate-shine">
                  <div className="bg-indigo-500 rounded-lg p-1"><Store className="w-4 h-4 text-white" /></div> Ma Vitrine
                </a>
                <div className="flex gap-2">
                  <button onClick={() => { setShowQRModal(true); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors text-sm">
                    <QrCode className="w-4 h-4" /> QR
                  </button>
                  <button onClick={() => { handleDriverLinkCopy(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-900 font-bold px-2 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                    <Truck className="w-4 h-4" /> Livreur
                  </button>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-6 space-y-2">
              <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'analytics' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <BarChart3 className="w-5 h-5 mr-3" /> Vue d'ensemble
              </button>
              <button onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'products' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <Package className="w-5 h-5 mr-3" /> Mes Produits
              </button>
              <button onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'orders' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <ShoppingBag className="w-5 h-5 mr-3" /> Commandes
              </button>
              <button onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'drivers' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <Truck className="w-5 h-5 mr-3" /> Historique Livraisons
              </button>
              <button onClick={() => { setActiveTab('team'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'team' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <Users className="w-5 h-5 mr-3" /> Mon Équipe
              </button>
              <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'settings' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
                <Settings className="w-5 h-5 mr-3" /> Paramètres
              </button>
            </nav>
            <div className="p-6 border-t border-gray-100/50">
              <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-bold text-sm">
                <LogOut className="w-5 h-5 mr-3" /> Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white/70 backdrop-blur-2xl border-r border-white/50 flex flex-col hidden md:flex shadow-[4px_0_30px_rgba(79,70,229,0.05)] z-10 relative">
        <div className="p-8 border-b border-gray-100/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="SamaBoutik" className="w-full h-full object-cover mix-blend-multiply" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Admin</h1>
          </div>
          <div className="bg-white/80 rounded-2xl p-4 border border-white shadow-sm flex flex-col gap-2">
            <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white font-bold px-4 py-2.5 rounded-xl hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all text-sm relative overflow-hidden group animate-shine">
              <div className="bg-indigo-500 rounded-lg p-1"><Store className="w-4 h-4 text-white" /></div> Ma Vitrine
            </a>
            <div className="flex gap-2">
              <button onClick={() => setShowQRModal(true)} className="flex-1 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold px-2 py-2.5 rounded-xl hover:bg-[#4338CA] transition-colors text-sm">
                <QrCode className="w-4 h-4" /> QR
              </button>
              <button onClick={handleDriverLinkCopy} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-900 font-bold px-2 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">
                <Truck className="w-4 h-4" /> Livreur
              </button>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'analytics' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <BarChart3 className="w-5 h-5 mr-3" /> Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'products' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <Package className="w-5 h-5 mr-3" /> Mes Produits
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'orders' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <ShoppingBag className="w-5 h-5 mr-3" /> Commandes
            {orders.filter(o => o.status === 'PENDING').length > 0 && (
              <span className="ml-auto bg-emerald-100 text-emerald-700 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {orders.filter(o => o.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('drivers')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'drivers' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <Truck className="w-5 h-5 mr-3" /> Historique Livraisons
          </button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'team' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <Users className="w-5 h-5 mr-3" /> Mon Équipe
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'settings' ? 'bg-indigo-50 text-gray-900 border border-indigo-100 shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'}`}>
            <Settings className="w-5 h-5 mr-3" /> Paramètres
          </button>
        </nav>
        <div className="p-6 border-t border-gray-100/50">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-bold text-sm">
            <LogOut className="w-5 h-5 mr-3" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative bg-mesh">
        
        {/* Mobile Quick Actions (Visible directly without menu) */}
        <div className="md:hidden mb-6 bg-white/80 rounded-2xl p-4 border border-white shadow-sm flex flex-col gap-2">
          <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] text-white font-bold px-4 py-2.5 rounded-xl hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all text-sm relative overflow-hidden group animate-shine">
            <div className="bg-indigo-500 rounded-lg p-1"><Store className="w-4 h-4 text-white" /></div> Ma Vitrine
          </a>
          <div className="flex gap-2">
            <button onClick={() => setShowQRModal(true)} className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors text-sm">
              <QrCode className="w-4 h-4" /> QR
            </button>
            <button onClick={handleDriverLinkCopy} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-900 font-bold px-2 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">
              <Truck className="w-4 h-4" /> Livreur
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Vue d'ensemble</h1>
              <p className="text-gray-500 mt-2 font-medium text-lg">Vos statistiques de vente et performances</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-indigo-50 tracking-wider uppercase text-xs">Revenus (Livrés)</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black relative z-10 tracking-tight">{stats.revenue.toLocaleString('fr-FR')} <span className="text-xl font-bold text-white/70">FCFA</span></div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] flex flex-col justify-center cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border border-white/60 group" onClick={() => setActiveTab('orders')}>
                <div className="flex items-center gap-3 text-gray-900 mb-6">
                  <div className="p-3 bg-orange-100 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-500 tracking-wider uppercase text-xs">Commandes à traiter</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">{stats.pending}</div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] flex flex-col justify-center cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-white/60 group" onClick={() => setActiveTab('products')}>
                <div className="flex items-center gap-3 text-gray-900 mb-6">
                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-gray-500 tracking-wider uppercase text-xs">Produits en vitrine</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">{stats.totalProducts}</div>
              </div>
            </div>

            {/* Bilan Livreur */}
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-indigo-900 px-8 py-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-4 text-white relative z-10">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <Truck className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Bilan Livreur du Jour</h2>
                </div>
                <span className="bg-white/10 text-white backdrop-blur-md text-xs font-bold px-4 py-2 rounded-full border border-white/20 relative z-10">Aujourd'hui</span>
              </div>
              
              <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="pt-4 sm:pt-0 flex flex-col items-center text-center group">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner border border-gray-100">
                     <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-gray-500 font-bold text-xs mb-1 uppercase tracking-widest">Total Encaissé</p>
                  <p className="text-gray-400 text-xs mb-5 font-medium">Argent physique avec le livreur</p>
                  <p className="text-4xl font-black text-gray-800 tracking-tight">{totalEnbaisse.toLocaleString('fr-FR')} <span className="text-xl font-bold opacity-40">F</span></p>
                </div>
                
                <div className="pt-8 sm:pt-0 flex flex-col items-center text-center group">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner border border-orange-100/50">
                     <span className="text-2xl">🛵</span>
                  </div>
                  <p className="text-gray-500 font-bold text-xs mb-1 uppercase tracking-widest">Frais Livreur</p>
                  <p className="text-gray-400 text-xs mb-5 font-medium">Sa part pour les livraisons</p>
                  <p className="text-4xl font-black text-orange-500 tracking-tight">- {partLivreur.toLocaleString('fr-FR')} <span className="text-xl font-bold opacity-50">F</span></p>
                </div>
                
                <div className="pt-8 sm:pt-0 flex flex-col items-center text-center relative group">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner border border-indigo-100/50">
                     <span className="text-2xl">💎</span>
                  </div>
                  <p className="text-indigo-600 font-bold text-xs mb-1 uppercase tracking-widest">À vous reverser</p>
                  <p className="text-indigo-400 text-xs mb-5 font-medium">Prix de vos produits</p>
                  <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">{partMarchand.toLocaleString('fr-FR')} <span className="text-2xl font-bold text-indigo-400">F</span></p>
                </div>
              </div>

              {/* Détail par livreur */}
              {driverBalances.length > 0 && (
                <div className="bg-gray-50/50 p-6 sm:p-8 border-t border-gray-100/50">
                  <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Détail par livreur
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {driverBalances.map(d => (
                      <div 
                        key={d.id} 
                        onClick={() => setSelectedDriverForStats(d)}
                        className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-700 flex items-center justify-center font-black text-xl border border-indigo-100/50 group-hover:scale-110 transition-transform">
                            {d.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-base">{d.full_name}</p>
                            <p className="text-xs text-gray-500 font-medium">{d.count} course(s) aujourd'hui</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 mb-1">À reverser</p>
                          <p className="font-black text-indigo-600 text-xl">{d.dPartMarchand.toLocaleString('fr-FR')} <span className="text-xs font-bold opacity-60">F</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'products' ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catalogue</h1>
                <p className="text-gray-500 mt-2 font-medium text-lg">Gérez votre inventaire et vos prix</p>
              </div>
              <button 
                onClick={() => setShowProductModal(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Ajouter un produit
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <div key={p.id} className="glass-panel group overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 border-white/60">
                  <div className="aspect-[4/3] relative overflow-hidden bg-white/40">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-10 w-10 mb-2 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 text-xs font-black rounded-full shadow-sm backdrop-blur-md border border-white/20 ${p.stock > 0 ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-2">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{p.name}</h3>
                      <p className="text-sm text-gray-500 font-medium mt-1">{p.category || 'Sans catégorie'}</p>
                    </div>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span className="font-black text-indigo-600 text-xl">{p.price_fcfa.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span></span>
                    </div>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="col-span-full glass-panel p-16 text-center border-white/60">
                  <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Catalogue vide</h3>
                  <p className="text-gray-500 font-medium">Vous n'avez pas encore de produits. Ajoutez-en un pour commencer.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Commandes</h1>
                <p className="text-gray-500 mt-2 font-medium text-lg">Suivez et traitez les commandes</p>
              </div>
              <button 
                onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                  soundEnabled 
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
                }`}
              >
                {soundEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                {soundEnabled ? 'Son activé' : 'Activer le son'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom ou numéro..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/80 border border-white/60 rounded-xl py-2.5 pl-12 pr-4 font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-4 top-3 pointer-events-none" />
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/80 border border-white/60 rounded-xl py-2.5 pl-12 pr-10 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="PREPARING">En préparation</option>
                  <option value="IN_TRANSIT">En transit</option>
                  <option value="DELIVERED">Livrée</option>
                  <option value="DISPUTED">Contestée</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
              </div>
            </div>
            
            <div className="glass-panel overflow-hidden border-white/60 p-3 sm:p-6">
              <div className="flex flex-col gap-4">
                {orders
                  .filter(o => 
                    (statusFilter === 'ALL' || o.status === statusFilter) &&
                    ((o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                     (o.customer_phone || '').includes(searchQuery))
                  )
                  .map(order => (
                  <div key={order.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white/40 hover:bg-white/70 border border-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md group gap-5">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-black text-gray-900 text-lg leading-none">{order.customer_name}</h3>
                          {order.delivery_pin && (
                            <span className="bg-orange-100/80 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-200/50 leading-none">
                              PIN: {order.delivery_pin}
                            </span>
                          )}
                          {order.driver_name && order.status === 'IN_TRANSIT' && (
                            <span className="bg-purple-100/80 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-purple-200/50 leading-none">
                              Livreur: {order.driver_name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-600 bg-white/60 px-2.5 py-0.5 rounded-lg border border-white shadow-sm">{order.customer_phone}</span>
                          <span className="text-xs text-gray-400 font-medium px-1 truncate max-w-[200px] sm:max-w-xs">{order.delivery_zone}</span>
                        </div>
                      </div>
                      
                      <div className="sm:text-right mt-2 sm:mt-0">
                        <div className="inline-flex flex-col">
                          <span className="text-lg font-black text-indigo-700 bg-indigo-50/80 px-4 py-2 rounded-xl border border-indigo-100/50 shadow-sm">
                            {order.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-xs font-bold uppercase tracking-wider ml-1">FCFA</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t lg:border-t-0 border-gray-100/50 pt-4 lg:pt-0 mt-2 lg:mt-0 lg:pl-6 lg:border-l">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-sm font-bold rounded-xl px-4 py-2.5 border border-white/50 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none transition-colors flex-1 lg:flex-none shadow-sm
                          ${order.status === 'PENDING' ? 'bg-orange-50 text-orange-700' : ''}
                          ${order.status === 'PREPARING' ? 'bg-blue-50 text-blue-700' : ''}
                          ${order.status === 'IN_TRANSIT' ? 'bg-purple-50 text-purple-700' : ''}
                          ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : ''}
                          ${order.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : ''}
                          ${order.status === 'DISPUTED' ? 'bg-red-50 text-red-700' : ''}
                        `}
                      >
                        <option value="PENDING">À traiter</option>
                        <option value="PREPARING">En préparation</option>
                        <option value="IN_TRANSIT" disabled>En cours de livraison</option>
                        <option value="DELIVERED">Livrée</option>
                        <option value="CANCELLED">Annulée</option>
                        <option value="DISPUTED">En litige</option>
                      </select>

                      <a 
                        href={generateWhatsAppMessage(order)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm hover:shadow-md border border-[#25D366]/20 flex-1 lg:flex-none"
                      >
                        WhatsApp
                      </a>
                    </div>
                    
                  </div>
                ))}
                
                {orders.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/60">
                      <ShoppingBag className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Aucune commande</h3>
                    <p className="text-gray-500 font-medium">Vos futures commandes s'afficheront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'drivers' ? (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historique des Livraisons</h1>
              <p className="text-gray-500 mt-2 font-medium text-lg">Consultez en détail tout ce qui a été livré (produits, client, livreur, heure).</p>
            </div>
            
            <div className="glass-panel overflow-hidden border-white/60 p-3 sm:p-6">
              <div className="flex flex-col gap-4">
                {orders.filter(o => o.status === 'DELIVERED').map(order => (
                  <div key={order.id} className="flex flex-col p-5 bg-white/40 hover:bg-white/70 border border-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md group gap-4">
                    
                    {/* Header: Livreur & Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-white flex items-center justify-center text-indigo-700 font-black text-xl shadow-inner group-hover:scale-105 transition-transform">
                          {order.driver_name ? order.driver_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 text-base">
                            {order.driver_name || 'Livreur Inconnu'}
                          </h3>
                          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Livreur assigné</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 sm:justify-end">
                        <div className="flex flex-col sm:text-right">
                          <span className="text-sm font-bold text-gray-600">
                            {order.delivered_at 
                              ? new Date(order.delivered_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-400 font-bold uppercase mt-0.5">
                            {order.delivered_at 
                              ? new Date(order.delivered_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                              : new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="bg-emerald-50/80 border border-emerald-100 text-emerald-700 font-mono text-sm px-3 py-1.5 rounded-xl font-black shadow-sm flex flex-col items-center justify-center min-w-[4.5rem]">
                          <span className="text-[8px] text-emerald-500 font-sans tracking-widest uppercase leading-none mb-1">PIN VALIDE</span>
                          <span className="leading-none">{order.delivery_pin || '---'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Body: Produits & Client */}
                    <div className="border-t border-white/60 pt-4 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                       <div className="flex-1">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Produits livrés</div>
                          <ul className="space-y-2">
                             {order.cart_items?.map((item, idx) => (
                               <li key={idx} className="text-sm font-bold text-gray-700 flex items-center gap-3">
                                 <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-black text-indigo-600 border border-indigo-50 shadow-sm">{item.quantity}x</span>
                                 <span>{item.name}</span>
                               </li>
                             ))}
                          </ul>
                       </div>

                       <div className="flex-1 lg:text-right flex flex-col lg:items-end justify-center">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Client & Paiement</div>
                          <div className="flex flex-col gap-2 items-start lg:items-end">
                            <span className="text-sm text-gray-700 font-bold bg-white/60 px-3 py-1.5 rounded-xl border border-white shadow-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              {order.customer_name}
                            </span>
                            <span className="text-sm font-black text-indigo-700 bg-indigo-50/80 px-3 py-2 rounded-xl border border-indigo-100/50 shadow-sm">
                               <span className="font-bold text-indigo-500/80 mr-1.5 text-[10px] uppercase tracking-wider">Encaissé :</span>
                               {order.total_amount_fcfa.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                       </div>
                    </div>

                  </div>
                ))}
                
                {orders.filter(o => o.status === 'DELIVERED').length === 0 && (
                  <div className="py-16 text-center">
                    <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/60">
                      <Truck className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Historique vide</h3>
                    <p className="text-gray-500 font-medium">Aucune livraison n'a été effectuée pour le moment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'team' ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mon Équipe</h1>
                <p className="text-gray-500 mt-2 font-medium text-lg">Gérez les livreurs de votre boutique.</p>
              </div>
              <button onClick={() => setShowDriverModal(true)} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5">
                <UserPlus className="w-5 h-5 mr-2" />
                Ajouter un livreur
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map(driver => (
                <div key={driver.id} className="bg-white/60 hover:bg-white/90 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-bl-[100px] -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/30">
                      {driver.full_name.charAt(0).toUpperCase()}
                    </div>
                    <button onClick={() => deleteDriver(driver.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-1">{driver.full_name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                      {driver.vehicle_type}
                    </span>
                  </div>
                  
                  <div className="space-y-3 border-t border-gray-100 pt-4 mt-4 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Téléphone</span>
                      <span className="text-gray-900 font-bold">{driver.phone_number || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">N° Pièce (CNI)</span>
                      <span className="text-gray-900 font-bold">{driver.cni_number || '---'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedDriverForStats(driver)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 rounded-xl font-bold transition-colors border border-indigo-100"
                  >
                    <BarChart3 className="w-4 h-4" /> Bilan du jour
                  </button>
                </div>
              ))}
            </div>
            
            {team.length === 0 && (
              <div className="py-16 text-center glass-panel border-white/60 mt-4">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100/50">
                  <Users className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Aucun livreur</h3>
                <p className="text-gray-500 font-medium">Commencez par ajouter votre premier livreur à l'équipe.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Paramètres</h1>
              <p className="text-gray-500 mt-2 font-medium text-lg">Personnalisez votre vitrine publique</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="glass-panel p-6 border-white/60 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description de la boutique</label>
                <textarea 
                  rows={4}
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                  className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 resize-none font-medium shadow-sm"
                  placeholder="Ex: La meilleure boutique de vêtements de Dakar. Livraison rapide et paiement à la livraison."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Couleur principale</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={settingsForm.theme_color}
                    onChange={e => setSettingsForm({...settingsForm, theme_color: e.target.value})}
                    className="w-16 h-16 rounded-xl cursor-pointer bg-white/80 border border-white/60 p-1 shadow-sm"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">Code couleur (Hex)</p>
                    <input 
                      type="text" 
                      value={settingsForm.theme_color}
                      onChange={e => setSettingsForm({...settingsForm, theme_color: e.target.value})}
                      className="w-full p-3 bg-white/80 border border-white/60 rounded-xl font-mono text-sm text-gray-900 shadow-sm"
                    />
                  </div>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={settingsForm.isSaving}
                className="w-full bg-[#4F46E5] text-white font-bold py-4 rounded-xl hover:bg-[#4338CA] transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {settingsForm.isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </form>
          </div>
        ) : null}
      </main>

      {/* Product Modal - Premium UI */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowProductModal(false)} />
          <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-lg w-full relative z-10 overflow-y-auto max-h-[90vh] border border-white/50">
            
            <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">Nouveau Produit</h2>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={submitProduct} className="p-4 sm:p-8 space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nom du produit</label>
                <input required type="text" placeholder="Ex: Chemise en lin" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea rows="3" placeholder="Détails du produit..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
                  <input type="text" placeholder="Ex: Chaussures, Vêtements" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Variantes (Tailles/Couleurs)</label>
                  <input type="text" placeholder="Ex: S, M, L ou Rouge, Bleu" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newProduct.variants} onChange={e => setNewProduct({...newProduct, variants: e.target.value})} />
                  <p className="text-xs text-gray-400 mt-1">Séparez par des virgules.</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Prix (FCFA)</label>
                  <input required type="number" min="0" placeholder="0" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" value={newProduct.price_fcfa} onChange={e => setNewProduct({...newProduct, price_fcfa: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock initial</label>
                  <input required type="number" min="0" placeholder="10" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Photo du produit</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-white hover:border-emerald-400 hover:text-indigo-600 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-2 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      <p className="text-sm text-gray-500 font-medium group-hover:text-indigo-600">
                        {newProduct.image ? newProduct.image.name : "Cliquez pour importer"}
                      </p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sm:pt-6 mt-2 border-t border-gray-100/50">
                <button type="button" onClick={() => setShowProductModal(false)} className="px-6 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={uploading} className="px-6 py-3 bg-[#4F46E5] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100">
                  {uploading ? 'Enregistrement...' : 'Ajouter le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal - Premium UI */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowQRModal(false)} />
          <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 text-center relative z-10 border border-white/50">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Votre QR Code</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">Faites scanner ce code pour rediriger vers votre vitrine SamaBoutik.</p>
            
            <div className="flex justify-center bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
              <QRCodeSVG value={getShopUrl()} size={200} fgColor="#042f2e" />
            </div>
            
            <button onClick={() => setShowQRModal(false)} className="w-full px-6 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
      {/* Driver Modal - Premium UI */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowDriverModal(false)} />
          <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-lg w-full relative z-10 overflow-y-auto max-h-[90vh] border border-white/50">
            
            <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">Nouveau Livreur</h2>
              <button onClick={() => setShowDriverModal(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={submitDriver} className="p-4 sm:p-8 space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nom complet</label>
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newDriver.full_name} onChange={e => setNewDriver({...newDriver, full_name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de téléphone</label>
                <input required type="text" placeholder="Ex: 01 23 45 67 89" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newDriver.phone_number} onChange={e => setNewDriver({...newDriver, phone_number: e.target.value})} />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type de véhicule</label>
                  <select className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newDriver.vehicle_type} onChange={e => setNewDriver({...newDriver, vehicle_type: e.target.value})}>
                    <option value="Moto">Moto</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Voiture">Voiture</option>
                    <option value="Vélo">Vélo</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de CNI / Pièce</label>
                  <input type="text" placeholder="Optionnel" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" value={newDriver.cni_number} onChange={e => setNewDriver({...newDriver, cni_number: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-gray-100/50">
                <button type="submit" className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40">
                  Enregistrer le livreur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Bilan Livreur */}
      {selectedDriverForStats && (() => {
        const todayStr = new Date().toDateString();
        const driverDeliveries = orders.filter(o => 
          o.driver_name === selectedDriverForStats.full_name && 
          o.status === 'DELIVERED' && 
          new Date(o.created_at).toDateString() === todayStr
        );
        
        let dTotalEnbaisse = 0;
        let dPartLivreur = 0;
        let dPartMarchand = 0;
        
        driverDeliveries.forEach(order => {
          dTotalEnbaisse += order.total_amount_fcfa;
          const cartTotal = order.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
          dPartMarchand += cartTotal;
          dPartLivreur += (order.total_amount_fcfa - cartTotal);
        });

        return (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setSelectedDriverForStats(null)} />
            <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-10 overflow-hidden border border-white/50 flex flex-col max-h-[90vh]">
              
              <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bilan du jour</h2>
                  <p className="text-indigo-600 font-bold text-sm mt-1">{selectedDriverForStats.full_name}</p>
                </div>
                <button onClick={() => setSelectedDriverForStats(null)} className="text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors shadow-sm border border-gray-100">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Encaissé par lui</p>
                    <p className="text-2xl font-black text-gray-900">{dTotalEnbaisse.toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span></p>
                  </div>
                  <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100/50 text-center">
                    <p className="text-orange-600/70 font-bold text-xs uppercase tracking-wider mb-2">Sa part (Frais)</p>
                    <p className="text-2xl font-black text-orange-500">{dPartLivreur.toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span></p>
                  </div>
                  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100/50 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
                    <p className="text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2 relative z-10">Il doit vous verser</p>
                    <p className="text-3xl font-black text-indigo-600 relative z-10">{dPartMarchand.toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span></p>
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400" /> 
                  Courses du jour ({driverDeliveries.length})
                </h3>
                
                {driverDeliveries.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
                    <p className="text-gray-500 font-medium">Ce livreur n'a validé aucune livraison aujourd'hui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {driverDeliveries.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-100 transition-colors">
                        <div>
                          <p className="font-bold text-gray-900 text-sm mb-0.5">{o.customer_name}</p>
                          <p className="text-xs text-gray-500">{o.delivery_zone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">{o.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100/50 bg-gray-50/50">
                <button onClick={() => setSelectedDriverForStats(null)} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-gray-900/20 active:scale-[0.98]">
                  Fermer le bilan
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
