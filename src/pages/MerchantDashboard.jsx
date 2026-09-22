import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Package, ShoppingBag, Store, Activity, X, Menu, QrCode, BarChart3, Truck, ExternalLink, Image as ImageIcon, Users, UserPlus, Trash2, BellRing, BellOff, Search, Filter, Settings, CreditCard, AlertCircle, ShieldCheck, Edit2, ArrowRight, Bell } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SHOP_CATEGORIES, CATEGORY_FEATURES } from '../utils/categories';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function MerchantDashboard() {
  const { user, merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, image: null });
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

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Search & Filters for Orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

const DEFAULT_DELIVERY_ZONES = [
  { id: 'dk-plateau', name: 'Dakar Plateau / Médina', price: 1000, active: true },
  { id: 'dk-almadies', name: 'Almadies / Ngor / Ouakam', price: 1500, active: true },
  { id: 'dk-mermoz', name: 'Mermoz / Sacré-Cœur / Point E', price: 1500, active: true },
  { id: 'dk-yoff', name: 'Yoff / Parcelles Assainies', price: 2000, active: true },
  { id: 'dk-pikine', name: 'Pikine / Guédiawaye', price: 2500, active: true },
  { id: 'dk-rufisque', name: 'Rufisque / Keur Massar / Diamniadio', price: 3000, active: true },
  { id: 'dk-sebi', name: 'Sébikotane / Pout', price: 3500, active: false },
  { id: 'rg-thies', name: 'Thiès (Région)', price: 3000, active: false },
  { id: 'rg-mbour', name: 'Mbour / Saly', price: 3000, active: false },
  { id: 'rg-sl', name: 'Saint-Louis (Région)', price: 4000, active: false },
  { id: 'rg-zg', name: 'Ziguinchor (Région)', price: 4000, active: false },
  { id: 'rg-diourbel', name: 'Diourbel / Touba / Mbacké', price: 3500, active: false },
  { id: 'rg-kaolack', name: 'Kaolack (Région)', price: 3500, active: false },
  { id: 'rg-louga', name: 'Louga (Région)', price: 3500, active: false },
  { id: 'rg-fatick', name: 'Fatick (Région)', price: 3500, active: false },
  { id: 'rg-tambacounda', name: 'Tambacounda (Région)', price: 4500, active: false },
  { id: 'rg-kolda', name: 'Kolda (Région)', price: 4500, active: false }
];

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ 
    shop_name: '',
    phone_number: '',
    description: '', 
    theme_color: '#059669', 
    email: '',
    address: '',
    logo_url: '',
    logoFile: null,
    banner_url: '',
    bannerFile: null,
    layout_style: 'modern',
    social_facebook: '',
    social_instagram: '',
    social_tiktok: '',
    payout_provider: 'WAVE',
    payout_phone_number: '',
    delivery_zones: [],
    isSaving: false 
  });

  // Initialize Settings Form when merchant loads
  useEffect(() => {
    if (merchant) {
      setSettingsForm({
        shop_name: merchant.shop_name || '',
        phone_number: merchant.phone_number || '',
        description: merchant.description || '',
        theme_color: merchant.theme_color || '#ff6b00',
        email: merchant.email || '',
        address: merchant.address || '',
        logo_url: merchant.logo_url || '',
        logoFile: null,
        banner_url: merchant.banner_url || '',
        bannerFile: null,
        layout_style: merchant.layout_style || 'modern',
        social_facebook: merchant.social_links?.facebook || '',
        social_instagram: merchant.social_links?.instagram || '',
        social_tiktok: merchant.social_links?.tiktok || '',
        payout_provider: merchant.payout_provider || 'WAVE',
        payout_phone_number: merchant.payout_phone_number || '',
        delivery_zones: merchant.delivery_zones || DEFAULT_DELIVERY_ZONES,
        isSaving: false
      });
      
      // Force Billing tab if expired
      if (merchant.subscription_status === 'expired') {
        setActiveTab('billing');
      }
    }
  }, [merchant]);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePaySubscription = async (plan) => {
    setIsProcessingPayment(true);
    try {
      // VRAIE LOGIQUE PAYDUNYA (Activée !)
      const { data, error: invokeError } = await supabase.functions.invoke('paydunya-checkout', {
        body: { merchantId: user.id, email: user.email, shopName: merchant.shop_name, plan: plan }
      });
      
      if (invokeError) {
        throw invokeError;
      }
      
      if (!data.success) {
        throw new Error(data.error || "Erreur inconnue renvoyée par PayDunya");
      }
      
      if (data && data.invoice_url) {
        // Redirige vers la page sécurisée de PayDunya
        window.location.href = data.invoice_url; 
      } else {
        alert("Erreur de communication avec PayDunya. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Erreur de paiement PayDunya:", err);
      alert(`Erreur de paiement : ${err.message || "Impossible de contacter PayDunya"}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (merchant) {
      const params = new URLSearchParams(window.location.search);
      const checkoutPlan = params.get('checkout');
      if (checkoutPlan === 'pro' || checkoutPlan === 'premium') {
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setActiveTab('billing');
        handlePaySubscription(checkoutPlan);
      }
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
    
    // Vérification du retour PayDunya
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const plan = params.get('plan') || 'pro';
      
      // On met à jour l'abonnement du marchand
      supabase.from('merchants').update({
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }).eq('id', user.id).then(({ error }) => {
        if (!error) {
          alert(`Paiement réussi ! Bienvenue dans le forfait ${plan.toUpperCase()} 🎉`);
          // Nettoyer l'URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Forcer le rechargement des infos
          fetchData();
          window.location.reload(); // Pour recharger le contexte `merchant`
        }
      });
    } else {
      fetchData();
    }
    
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
      let finalLogoUrl = settingsForm.logo_url;
      let finalBannerUrl = settingsForm.banner_url;
      
      if (settingsForm.logoFile) {
        const fileExt = settingsForm.logoFile.name.split('.').pop();
        const fileName = `logo_${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, settingsForm.logoFile);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        finalLogoUrl = publicUrlData.publicUrl;
      }

      if (settingsForm.bannerFile) {
        const fileExt = settingsForm.bannerFile.name.split('.').pop();
        const fileName = `banner_${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, settingsForm.bannerFile);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        finalBannerUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('merchants').update({
        shop_name: settingsForm.shop_name,
        phone_number: settingsForm.phone_number,
        description: settingsForm.description,
        theme_color: settingsForm.theme_color,
        email: settingsForm.email,
        address: settingsForm.address,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        layout_style: settingsForm.layout_style,
        payout_provider: settingsForm.payout_provider,
        payout_phone_number: settingsForm.payout_phone_number,
        social_links: {
          facebook: settingsForm.social_facebook,
          instagram: settingsForm.social_instagram,
          tiktok: settingsForm.social_tiktok
        },
        delivery_zones: settingsForm.delivery_zones
      }).eq('id', user.id);
      
      if (error) throw error;
      showToast("Paramètres enregistrés avec succès !");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement des paramètres.");
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
    
    // VERIFICATION DES LIMITES (Seulement pour la création)
    if (!editingProductId && merchant?.subscription_plan === 'debutant' && products.length >= 10) {
      alert("Vous avez atteint la limite de 10 produits du forfait Débutant. Veuillez passer au forfait Pro ou Premium pour ajouter plus de produits.");
      setActiveTab('billing');
      setShowProductModal(false);
      return;
    }

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

      let variantsArray = null;
      if (newProduct.features && Object.keys(newProduct.features).length > 0) {
        variantsArray = Object.entries(newProduct.features)
          .filter(([_, val]) => val && val.trim() !== '')
          .map(([key, val]) => `${key}: ${val.trim()}`);
        if (variantsArray.length === 0) variantsArray = null;
      }

      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price_fcfa: parseInt(newProduct.price_fcfa),
        stock: parseInt(newProduct.stock),
        category: newProduct.category || null,
        variants: variantsArray,
      };

      if (image_url) {
        productData.image_url = image_url;
      }

      if (editingProductId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProductId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([{
          merchant_id: user.id,
          ...productData
        }]);
        if (error) throw error;
      }
      
      setShowProductModal(false);
      setEditingProductId(null);
      setNewProduct({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, image: null });
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'ajout: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };
  
  const submitDriver = async (e) => {
    e.preventDefault();
    if (!newDriver.full_name) return;
    
    // VERIFICATION DES LIMITES
    if (merchant?.subscription_plan === 'debutant' && team.length >= 1) {
      alert("Le forfait Débutant est limité à 1 livreur. Passez au forfait Pro ou Premium pour agrandir votre équipe.");
      setActiveTab('billing');
      setShowDriverModal(false);
      return;
    }
    if (merchant?.subscription_plan === 'pro' && team.length >= 5) {
      alert("Le forfait Pro est limité à 5 livreurs. Passez au forfait Premium pour une équipe illimitée.");
      setActiveTab('billing');
      setShowDriverModal(false);
      return;
    }

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
    let statusText = "";
    switch(order.status) {
      case 'PREPARING': statusText = "est en cours de préparation"; break;
      case 'IN_TRANSIT': statusText = "est en route vers vous (préparez votre PIN)"; break;
      case 'DELIVERED': statusText = "a été livrée avec succès"; break;
      case 'CANCELLED': statusText = "a été annulée"; break;
      default: statusText = "a bien été enregistrée"; break;
    }
    
    const shopUrl = `${window.location.origin}/boutique/${encodeURIComponent(merchant?.shop_name || '')}`;
    
    const text = `Bonjour ${order.customer_name},

📦 Votre commande N° ${order.id.slice(0,6).toUpperCase()} chez *${merchant?.shop_name}* ${statusText}.

💳 Total: ${order.total_amount_fcfa.toLocaleString('fr-FR')} FCFA
📍 Suivez votre commande en direct ici : ${shopUrl}

Merci de votre confiance ! 🙏`;
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
    const deliveryFee = order.total_amount_fcfa - cartTotal;
    
    if (order.driver_name) {
      partMarchand += cartTotal;
      partLivreur += deliveryFee;
    } else {
      // Merchant managed it themselves, they get everything
      partMarchand += order.total_amount_fcfa;
    }
  });

  const driverBalances = team.map(driver => {
    let dEnbaisse = 0;
    let dPartLivreur = 0;
    let aReverser = 0;
    let count = 0;

    deliveredToday.forEach(order => {
      if (order.driver_name === driver.full_name) {
        count++;
        const cartTotal = order.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
        const deliveryFee = order.total_amount_fcfa - cartTotal;
        const collectedCash = order.payment_method === 'MOBILE_MONEY' ? 0 : order.total_amount_fcfa;
        
        dEnbaisse += collectedCash;
        dPartLivreur += deliveryFee;
        aReverser += (collectedCash - deliveryFee);
      }
    });

    return { ...driver, dEnbaisse, dPartLivreur, aReverser, count };
  });

  const stats = {
    revenue: orders.filter(o => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total_amount_fcfa, 0),
    pending: orders.filter(o => o.status === 'PENDING').length,
    totalProducts: products.length
  };

  if (!merchant) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-mesh">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-600 border-solid mb-4"></div>
      <p className="text-gray-900 font-medium">Chargement du tableau de bord...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-emerald-200 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-emerald-300/20 rounded-full blur-3xl mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-fuchsia-300/20 rounded-full blur-3xl mix-blend-multiply"></div>
      </div>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <div className="md:hidden bg-[#0f1f17]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 text-white">
          <div className="h-10 md:h-16 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="SamaBoutik" className="h-full w-auto object-contain" />
          </div>
          <span className="font-black text-lg">Admin</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0f1f17]/95 backdrop-blur-2xl border-r border-white/5 shadow-2xl">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-12 md:h-20 flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="SamaBoutik" className="h-full w-auto object-contain" />
                </div>
                <h1 className="text-xl font-black text-white">Admin</h1>
              </div>
            </div>
            
            <div className="p-6 pb-0">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
                <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#3E5C46] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#4E6C56] transition-all text-sm relative overflow-hidden group">
                  <div className="bg-transparent rounded-lg p-1"><Store className="w-4 h-4 text-white" /></div> Ma Vitrine
                </a>
                <div className="flex gap-2">
                  <button onClick={() => { setShowQRModal(true); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1 bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white font-bold px-2 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors text-sm">
                    <QrCode className="w-4 h-4" /> QR
                  </button>
                  <button onClick={() => { handleDriverLinkCopy(); setIsMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white font-bold px-2 py-2.5 rounded-xl hover:bg-white/20 transition-colors text-sm">
                    <Truck className="w-4 h-4" /> Livreur
                  </button>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-1 mt-2">
              <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'analytics' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <BarChart3 className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'analytics' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Vue d'ensemble</span>
              </button>
              <button onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'products' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <Package className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'products' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Mes Produits</span>
              </button>
              <button onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'orders' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <ShoppingBag className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'orders' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Commandes</span>
              </button>
              <button onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'drivers' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <Truck className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'drivers' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Livraisons</span>
              </button>
              <button onClick={() => { setActiveTab('team'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'team' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <Users className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'team' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Mon Équipe</span>
              </button>
              
              <div className="pt-4 pb-2 px-4 flex items-center gap-2">
                 <div className="h-px bg-white/10 flex-1"></div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paramètres</p>
                 <div className="h-px bg-white/10 flex-1"></div>
              </div>
              
              <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'settings' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <Settings className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:rotate-90 ${activeTab === 'settings' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Paramètres</span>
              </button>
              <button onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'billing' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
                
                <CreditCard className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'billing' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
                <span className="relative z-10">Facturation</span>
              </button>
            </nav>
            <div className="p-4 m-4 mt-0 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-sm">
              <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2.5 text-red-600 hover:bg-red-500/20 rounded-xl transition-all font-bold text-sm group">
                <LogOut className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" /> Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-[#14261e] border-r border-white/5 flex flex-col hidden md:flex z-20 relative">
        <div className="p-8">
          <div className="flex items-center justify-center mb-8 bg-white p-4 rounded-3xl mx-2">
            <img src="/logo.png" alt="SamaBoutik" className="h-24 md:h-32 object-contain hover:scale-105 transition-transform duration-500" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Aperçu</p>
          <div className="bg-white/5 rounded-2xl flex flex-col gap-2 mb-4 border border-white/10 p-2">
            <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#3E5C46] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#4E6C56] transition-all text-sm relative overflow-hidden group">
              <Store className="w-4 h-4 text-white" /> Ma Vitrine
            </a>
            <div className="flex gap-2">
              <button onClick={() => setShowQRModal(true)} className="flex-1 flex items-center justify-center bg-[#F3F6F4] text-slate-800 font-bold px-2 py-2.5 rounded-xl hover:bg-white transition-colors text-sm">
                <QrCode className="w-4 h-4" /> QR
              </button>
              <button onClick={handleDriverLinkCopy} className="flex-1 flex items-center justify-center gap-1 bg-[#354A40] text-slate-200 font-bold px-2 py-2.5 rounded-xl hover:bg-[#455A50] hover:text-white transition-colors text-sm">
                <Truck className="w-4 h-4" /> Livreur
              </button>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2">
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'analytics' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <BarChart3 className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'analytics' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Vue d'ensemble</span>
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'products' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <Package className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'products' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Mes Produits</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'orders' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <ShoppingBag className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'orders' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Commandes</span>
            {orders.filter(o => o.status === 'PENDING').length > 0 && (
              <span className="ml-auto bg-[#00E58F]/20 text-[#00E58F] text-[11px] px-2 py-0.5 rounded-full font-black relative z-10 border border-[#00E58F]/30">
                {orders.filter(o => o.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('drivers')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'drivers' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <Truck className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'drivers' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Livraisons</span>
          </button>
          <button onClick={() => setActiveTab('team')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'team' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <Users className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'team' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Mon Équipe</span>
          </button>
          
          <div className="pt-6 pb-2 px-4 flex items-center gap-2">
             <div className="h-px bg-white/10 flex-1"></div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paramètres</p>
             <div className="h-px bg-white/10 flex-1"></div>
          </div>
          
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'settings' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <Settings className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:rotate-90 ${activeTab === 'settings' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Boutique</span>
          </button>
          <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-bold text-sm group relative overflow-hidden ${activeTab === 'billing' ? 'text-[#00E58F] bg-white/5 shadow-sm border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/50 border border-transparent'}`}>
            
            <CreditCard className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === 'billing' ? 'text-[#00E58F]' : 'text-slate-400 group-hover:text-[#00E58F]'}`} />
            <span className="relative z-10">Facturation</span>
          </button>
        </nav>
        <div className="p-4 m-4 mt-0 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-sm">
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2.5 text-red-600 hover:bg-red-500/20 rounded-xl transition-all font-bold text-sm group">
            <LogOut className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto z-10 relative w-full">
        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
              {/* Mobile Quick Actions (Visible directly without menu) */}
              <div className="md:hidden mb-6 bg-white/80 rounded-2xl p-4 border border-white shadow-sm flex flex-col gap-2">
                <a href={getShopUrl()} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-[#059669] text-white font-bold px-4 py-2.5 rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all text-sm relative overflow-hidden group animate-shine">
            <div className="bg-emerald-500 rounded-lg p-1"><Store className="w-4 h-4 text-white" /></div> Ma Vitrine
          </a>
          <div className="flex gap-2">
            <button onClick={() => setShowQRModal(true)} className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors text-sm">
              <QrCode className="w-4 h-4" /> QR
            </button>
            <button onClick={handleDriverLinkCopy} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-900 font-bold px-2 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm">
              <Truck className="w-4 h-4" /> Livreur
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-600"></div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-8 w-full">
            {/* Center Content */}
            <div className="flex-1 flex flex-col gap-8">
              
              {/* Top Header (Search & Profile) */}
              <div className="hidden md:flex justify-between items-center bg-white rounded-full px-6 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
                <div className="flex items-center gap-3 text-gray-400">
                  <Search className="w-5 h-5" />
                  <input type="text" placeholder="Rechercher..." className="bg-transparent border-none outline-none text-sm w-64 text-gray-700 placeholder-gray-400" />
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-2 text-gray-400 hover:text-emerald-600 transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  </button>
                  <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{merchant?.shop_name || 'Boutique'}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Marchand</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {merchant?.shop_name?.charAt(0).toUpperCase() || 'M'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ultra Modern Hero Banner for E-Commerce */}
              <div className="relative rounded-[2.5rem] p-8 sm:p-12 flex justify-between items-center shadow-2xl overflow-hidden group bg-[#0f1f17]">
                {/* Animated Background Mesh */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#11241B] via-emerald-950 to-[#0A1813] opacity-90 group-hover:scale-105 transition-transform duration-1000"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay opacity-20"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 animate-pulse" style={{animationDelay: '1s'}}></div>
                
                {/* Floating E-commerce Elements */}
                <div className="absolute top-10 right-[20%] w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center rotate-12 animate-[bounce_4s_infinite] shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div className="absolute bottom-12 right-[35%] w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center -rotate-12 animate-[bounce_5s_infinite_0.5s] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <Package className="w-6 h-6 text-emerald-200" />
                </div>
                
                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6 tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> E-Commerce Pro
                  </div>
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-200">
                    Boostez vos ventes.<br/>Dominez le marché.
                  </h2>
                  <p className="text-emerald-100/90 mb-8 font-medium text-lg sm:text-xl max-w-lg leading-relaxed">
                    Votre tableau de bord intelligent. Suivez vos commandes en temps réel et développez votre empire.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <a href={getShopUrl()} target="_blank" rel="noreferrer" className="bg-white text-emerald-950 font-black px-8 py-4 rounded-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all inline-flex items-center gap-3 text-base">
                      Ouvrir ma vitrine <ArrowRight className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                
                {/* Large Decorative Icon */}
                <div className="hidden lg:flex relative z-10 w-64 h-64 mr-10">
                   <div className="absolute inset-0 bg-white/5 rounded-[3rem] rotate-12 backdrop-blur-sm border border-white/10"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                     <Store className="w-32 h-32 text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]" />
                   </div>
                </div>
              </div>

              {/* Lock Overlay if Expired (Kept for logic) */}
              {merchant?.subscription_status === 'expired' && (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-red-900 mb-1">Abonnement Expiré</h3>
                    <p className="text-red-700 text-sm mb-4">Votre boutique est actuellement fermée au public. Veuillez renouveler votre abonnement.</p>
                    <button onClick={() => setActiveTab('billing')} className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
                      Gérer la facturation
                    </button>
                  </div>
                </div>
              )}

              {/* Ultra Modern KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Revenu */}
                <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.15)] hover:-translate-y-2 hover:border-emerald-100 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 group-hover:scale-150 transition-all duration-700"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      <Activity className="w-6 h-6" />
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">+12% ce mois</span>
                  </div>
                  <div className="relative z-10">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenus Générés</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">{stats.revenue.toLocaleString('fr-FR')} <span className="text-lg font-bold text-gray-400">FCFA</span></p>
                  </div>
                </motion.div>

                {/* Commandes */}
                <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(249,115,22,0.15)] hover:-translate-y-2 hover:border-orange-100 transition-all duration-300 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('orders')}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 group-hover:scale-150 transition-all duration-700"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    {stats.pending > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span></span>}
                  </div>
                  <div className="relative z-10">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Commandes en cours</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">{stats.pending} <span className="text-lg font-bold text-gray-400">À traiter</span></p>
                  </div>
                </motion.div>

                {/* Produits */}
                <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] hover:-translate-y-2 hover:border-teal-100 transition-all duration-300 relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('products')}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-500/20 group-hover:scale-150 transition-all duration-700"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all shadow-sm">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Catalogue Produits</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight">{stats.totalProducts} <span className="text-lg font-bold text-gray-400">En ligne</span></p>
                  </div>
                </motion.div>
              </div>

              {/* Recent Orders */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Commandes Récentes</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">Voir tout <ArrowRight className="w-4 h-4"/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.slice(0, 3).map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer" onClick={() => setActiveTab('orders')}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">#{order.id.slice(0, 6)}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                          order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {order.status === 'DELIVERED' ? 'LIVRÉ' : order.status === 'CANCELLED' ? 'ANNULÉ' : 'EN COURS'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm mb-1">{order.customer_name}</p>
                        <p className="text-xs text-gray-500 truncate">{order.customer_address?.split(' || GPS: ')[0]}</p>
                      </div>
                      <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                        <p className="text-xs text-gray-400 font-medium">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                        <p className="text-base font-black text-emerald-600 tracking-tight">{order.total_amount_fcfa.toLocaleString('fr-FR')} F</p>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="col-span-full bg-white p-8 rounded-2xl border border-gray-100 border-dashed text-center">
                       <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                       <p className="text-gray-500 font-medium">Aucune commande pour le moment.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bilan Livreur (Legacy) modified to fit center column */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm mt-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Bilan Financier Livreur</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aujourd'hui</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-gray-50 p-5 rounded-2xl">
                    <p className="text-gray-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Total Encaissé</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight mb-2">{totalEnbaisse.toLocaleString('fr-FR')} <span className="text-sm font-bold opacity-40">F</span></p>
                    <p className="text-gray-400 text-xs font-medium">Argent physique avec le livreur</p>
                  </div>
                  
                  <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-50">
                    <p className="text-orange-600 font-bold text-[10px] mb-1 uppercase tracking-widest">Frais Livreur</p>
                    <p className="text-2xl font-black text-orange-600 tracking-tight mb-2">- {partLivreur.toLocaleString('fr-FR')} <span className="text-sm font-bold opacity-50">F</span></p>
                    <p className="text-orange-400/80 text-xs font-medium">Sa part pour les livraisons</p>
                  </div>
                  
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-50">
                    <p className="text-emerald-600 font-bold text-[10px] mb-1 uppercase tracking-widest">À vous reverser</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tight mb-2">{partMarchand.toLocaleString('fr-FR')} <span className="text-sm font-bold opacity-50">F</span></p>
                    <p className="text-emerald-400 text-xs font-medium">Prix de vos produits</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-full xl:w-80 flex flex-col gap-6">
              
              {/* Profile / Goal Card */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-white pointer-events-none"></div>
                <div className="w-24 h-24 rounded-full bg-white text-emerald-600 flex items-center justify-center text-3xl font-black mb-4 border-4 border-white shadow-xl relative z-10">
                  {merchant?.shop_name?.charAt(0).toUpperCase() || 'M'}
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight relative z-10">Bonjour, {merchant?.shop_name || 'Marchand'}</h3>
                <p className="text-sm text-gray-500 mb-8 relative z-10">Prêt pour une belle journée de ventes !</p>
                
                <div className="w-full bg-gray-50 rounded-2xl p-5 text-left relative z-10 border border-gray-100">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                     Objectif Ventes 
                     <span className="text-emerald-600">65%</span>
                   </p>
                   <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: '65%'}}></div>
                   </div>
                </div>
              </div>

              {/* Team / Mentors (Détail par livreur) */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-gray-100 shadow-sm flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-gray-900 tracking-tight">Mon Équipe</h3>
                  <button onClick={() => setActiveTab('team')} className="text-emerald-600 text-xs font-bold hover:underline">Gérer</button>
                </div>
                <div className="flex flex-col gap-4">
                  {driverBalances.slice(0, 5).map(d => (
                     <div key={d.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer" onClick={() => setSelectedDriverForStats(d)}>
                       <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                         {d.full_name.charAt(0).toUpperCase()}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-gray-900 truncate">{d.full_name}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.count} course(s)</p>
                       </div>
                       <div className="text-right shrink-0">
                         <p className={`text-sm font-black ${d.aReverser < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                           {d.aReverser < 0 ? '-' : '+'}{Math.abs(d.aReverser).toLocaleString('fr-FR')} <span className="text-[10px]">F</span>
                         </p>
                       </div>
                     </div>
                  ))}
                  {driverBalances.length === 0 && (
                     <div className="text-center py-8">
                       <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                       <p className="text-xs text-gray-500 font-medium">Aucun livreur actif aujourd'hui.</p>
                     </div>
                  )}
                </div>
              </div>

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
                onClick={() => {
                  setEditingProductId(null);
                  setNewProduct({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, image: null });
                  setShowProductModal(true);
                }}
                className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Ajouter un produit
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <motion.div variants={itemVariants} key={p.id} className="bg-white/90 backdrop-blur-sm group overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 border border-white rounded-[2rem] relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-50/50 rounded-t-[2rem]">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="h-10 w-10 mb-2 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingProductId(p.id);
                          const existingFeatures = {};
                          if (p.variants) {
                            p.variants.forEach(v => {
                              if (v.includes(':')) {
                                const parts = v.split(':');
                                existingFeatures[parts[0].trim()] = parts.slice(1).join(':').trim();
                              }
                            });
                          }
                          setNewProduct({ 
                            name: p.name, 
                            description: p.description, 
                            price_fcfa: p.price_fcfa, 
                            stock: p.stock, 
                            category: p.category || 'Vêtements', 
                            features: existingFeatures, 
                            image: null 
                          });
                          setShowProductModal(true);
                        }}
                        className="w-8 h-8 bg-white/90 text-gray-700 hover:text-emerald-600 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="w-8 h-8 bg-white/90 text-gray-700 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm backdrop-blur-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col relative">
                    <div className="absolute -top-4 right-4">
                      <span className={`px-3 py-1 text-xs font-black rounded-full shadow-sm backdrop-blur-md border border-white/20 ${p.stock > 0 ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{p.name}</h3>
                      <p className="text-sm text-gray-500 font-medium mt-1">{p.category || 'Sans catégorie'}</p>
                    </div>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span className="font-black text-emerald-600 text-xl">{p.price_fcfa.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span></span>
                    </div>
                  </div>
                </motion.div>
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
                  className="w-full bg-white/80 border border-white/60 rounded-xl py-2.5 pl-12 pr-4 font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                />
              </div>
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-4 top-3 pointer-events-none" />
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/80 border border-white/60 rounded-xl py-2.5 pl-12 pr-10 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm cursor-pointer"
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
                  <motion.div variants={itemVariants} key={order.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white/80 hover:bg-white/95 border border-white rounded-[1.5rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 group gap-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 group-hover:scale-150 transition-all duration-700 pointer-events-none"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-black text-gray-900 text-lg leading-none">{order.customer_name}</h3>
                          {order.delivery_pin && (
                            <span className="bg-orange-100/80 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-200/50 leading-none">
                              PIN: {order.delivery_pin}
                            </span>
                          )}
                          {order.payment_method === 'ON_DELIVERY' && (
                            <span className="bg-gray-100/80 text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-gray-200/50 leading-none flex items-center gap-1">
                              🚚 À la livraison
                            </span>
                          )}
                          {order.payment_method === 'DEPOSIT' && (
                            <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/50 leading-none flex items-center gap-1">
                              💳 Acompte: {order.payment_deposit_amount} FCFA
                            </span>
                          )}
                          {order.payment_method === 'FULL_UPFRONT' && (
                            <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/50 leading-none flex items-center gap-1">
                              💳 Intégral Payé
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
                          <span className="text-lg font-black text-emerald-700 bg-emerald-50/80 px-4 py-2 rounded-xl border border-emerald-100/50 shadow-sm">
                            {order.total_amount_fcfa.toLocaleString('fr-FR')} <span className="text-xs font-bold uppercase tracking-wider ml-1">FCFA</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t lg:border-t-0 border-gray-100/50 pt-4 lg:pt-0 mt-2 lg:mt-0 lg:pl-6 lg:border-l">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-sm font-bold rounded-xl px-4 py-2.5 border border-white/50 focus:ring-2 focus:ring-emerald-500 cursor-pointer outline-none transition-colors flex-1 lg:flex-none shadow-sm
                          ${order.status === 'PENDING' ? 'bg-orange-50 text-orange-700' : ''}
                          ${order.status === 'PREPARING' ? 'bg-teal-50 text-teal-700' : ''}
                          ${order.status === 'IN_TRANSIT' ? 'bg-purple-50 text-purple-700' : ''}
                          ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : ''}
                          ${order.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : ''}
                          ${order.status === 'DISPUTED' ? 'bg-red-50 text-red-700' : ''}
                        `}
                      >
                        <option value="PENDING">À traiter</option>
                        <option value="PREPARING">En préparation</option>
                        <option value="IN_TRANSIT">En cours de livraison</option>
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
                    
                  </motion.div>
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
                  <motion.div variants={itemVariants} key={order.id} className="flex flex-col p-5 bg-white/80 hover:bg-white/95 border border-white rounded-[1.5rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 group gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 group-hover:scale-150 transition-all duration-700 pointer-events-none"></div>
                    
                    {/* Header: Livreur & Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-purple-100 border border-white flex items-center justify-center text-emerald-700 font-black text-xl shadow-inner group-hover:scale-105 transition-transform">
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
                                 <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-black text-emerald-600 border border-emerald-50 shadow-sm">{item.quantity}x</span>
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
                            <span className="text-sm font-black text-emerald-700 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-100/50 shadow-sm">
                               <span className="font-bold text-emerald-500/80 mr-1.5 text-[10px] uppercase tracking-wider">Encaissé :</span>
                               {order.total_amount_fcfa.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                       </div>
                    </div>

                  </motion.div>
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
              <button onClick={() => setShowDriverModal(true)} className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-3 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5">
                <UserPlus className="w-5 h-5 mr-2" />
                Ajouter un livreur
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map(driver => (
                  <motion.div variants={itemVariants} key={driver.id} className="bg-white/80 hover:bg-white/95 backdrop-blur-xl border border-white rounded-[2rem] p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-purple-50 rounded-bl-[100px] -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-500/30">
                      {driver.full_name.charAt(0).toUpperCase()}
                    </div>
                    <button onClick={() => deleteDriver(driver.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 mb-1">{driver.full_name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
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
                    className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold transition-colors border border-emerald-100"
                  >
                    <BarChart3 className="w-4 h-4" /> Bilan du jour
                  </button>
                  </motion.div>
              ))}
            </div>
            
            {team.length === 0 && (
              <div className="py-16 text-center glass-panel border-white/60 mt-4">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100/50">
                  <Users className="w-10 h-10 text-emerald-400" />
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
            
            <motion.form variants={itemVariants} onSubmit={handleSaveSettings} className="glass-panel p-6 border-white/60 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nom de la boutique</label>
                  <input 
                    type="text" 
                    value={settingsForm.shop_name}
                    onChange={e => setSettingsForm({...settingsForm, shop_name: e.target.value})}
                    className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium shadow-sm"
                    placeholder="Ma Super Boutique"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone (WhatsApp)</label>
                  <input 
                    type="tel" 
                    value={settingsForm.phone_number}
                    onChange={e => setSettingsForm({...settingsForm, phone_number: e.target.value})}
                    className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium shadow-sm"
                    placeholder="+221 77..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description de la boutique</label>
                <textarea 
                  rows={4}
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                  className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 resize-none font-medium shadow-sm"
                  placeholder="Ex: La meilleure boutique de vêtements de Dakar. Livraison rapide et paiement à la livraison."
                />
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Apparence de la vitrine</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Style d'affichage (Layout)</label>
                    <select 
                      value={settingsForm.layout_style}
                      onChange={e => setSettingsForm({...settingsForm, layout_style: e.target.value})}
                      className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium shadow-sm appearance-none"
                    >
                      <option value="modern">Moderne (Formes obliques, très visuel)</option>
                      <option value="classic">Classique (Bannière droite, rassurant)</option>
                      <option value="minimalist">Minimaliste (Epuré, focus sur les produits)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bannière d'accueil (Hero Image)</label>
                    {settingsForm.banner_url && !settingsForm.bannerFile && (
                      <div className="mb-4 relative group">
                        <img src={settingsForm.banner_url} alt="Bannière" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                        <button 
                          type="button" 
                          onClick={() => setSettingsForm({...settingsForm, banner_url: '', bannerFile: null})}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          title="Supprimer la bannière"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setSettingsForm({...settingsForm, bannerFile: e.target.files[0]})}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <p className="text-xs text-gray-400 mt-2">Format paysage recommandé (ex: 1920x1080px).</p>
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email de contact</label>
                  <input 
                    type="email" 
                    value={settingsForm.email}
                    onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                    className="w-full p-3 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 shadow-sm"
                    placeholder="contact@maboutique.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Adresse physique</label>
                  <input 
                    type="text" 
                    value={settingsForm.address}
                    onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
                    className="w-full p-3 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 shadow-sm"
                    placeholder="Dakar, Sénégal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Méthode de réception des paiements</label>
                  <select 
                    value={settingsForm.payout_provider}
                    onChange={e => setSettingsForm({...settingsForm, payout_provider: e.target.value})}
                    className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium shadow-sm appearance-none"
                  >
                    <option value="WAVE">Wave</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="FREE_MONEY">Free Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de téléphone (Wave/OM)</label>
                  <input 
                    type="tel" 
                    value={settingsForm.payout_phone_number}
                    onChange={e => setSettingsForm({...settingsForm, payout_phone_number: e.target.value})}
                    className="w-full p-4 bg-white/80 border border-white/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 font-medium shadow-sm"
                    placeholder="Ex: 77 123 45 67"
                  />
                  <p className="text-xs text-gray-500 mt-2 font-medium">Vous recevrez l'argent de vos ventes sur ce compte (moins la commission de 5%).</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Logo de la boutique</label>
                {settingsForm.logo_url && !settingsForm.logoFile && (
                  <div className="mb-4 relative inline-block group">
                    <img src={settingsForm.logo_url} alt="Logo" className="w-24 h-24 object-contain rounded-xl border border-gray-200 bg-white" />
                    <button 
                      type="button" 
                      onClick={() => setSettingsForm({...settingsForm, logo_url: '', logoFile: null})}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      title="Supprimer le logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setSettingsForm({...settingsForm, logoFile: e.target.files[0]})}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-xs text-gray-400 mt-2">Format carré recommandé. Le fond transparent (PNG) est idéal.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Réseaux Sociaux</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 font-medium">Facebook</span>
                    <input type="url" value={settingsForm.social_facebook} onChange={e => setSettingsForm({...settingsForm, social_facebook: e.target.value})} placeholder="https://facebook.com/..." className="flex-1 p-3 bg-white/80 border border-white/60 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 font-medium">Instagram</span>
                    <input type="url" value={settingsForm.social_instagram} onChange={e => setSettingsForm({...settingsForm, social_instagram: e.target.value})} placeholder="https://instagram.com/..." className="flex-1 p-3 bg-white/80 border border-white/60 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 font-medium">TikTok</span>
                    <input type="url" value={settingsForm.social_tiktok} onChange={e => setSettingsForm({...settingsForm, social_tiktok: e.target.value})} placeholder="https://tiktok.com/@..." className="flex-1 p-3 bg-white/80 border border-white/60 rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-gray-800">Zones et Frais de Livraison</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Activez les zones où vous livrez et définissez vos tarifs.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50/50">
                  {settingsForm.delivery_zones?.map((zone, index) => (
                    <div key={zone.id} className={`flex items-center justify-between p-3 rounded-lg border ${zone.active ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'} transition-colors`}>
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={zone.active}
                          onChange={(e) => {
                            const newZones = [...settingsForm.delivery_zones];
                            newZones[index].active = e.target.checked;
                            setSettingsForm({ ...settingsForm, delivery_zones: newZones });
                          }}
                          className="w-4 h-4 flex-shrink-0 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className={`text-sm font-medium truncate ${zone.active ? 'text-emerald-900' : 'text-gray-600'}`}>
                          {zone.name}
                        </span>
                      </label>
                      <div className="flex items-center gap-2 ml-2">
                        {zone.active && (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={zone.price}
                              onChange={(e) => {
                                const newZones = [...settingsForm.delivery_zones];
                                newZones[index].price = parseInt(e.target.value) || 0;
                                setSettingsForm({ ...settingsForm, delivery_zones: newZones });
                              }}
                              className="w-20 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-right"
                              placeholder="Prix"
                            />
                            <span className="text-xs font-bold text-gray-500">F</span>
                          </div>
                        )}
                        {zone.id.startsWith('custom-') && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setSettingsForm({
                                ...settingsForm,
                                delivery_zones: settingsForm.delivery_zones.filter((_, i) => i !== index)
                              });
                            }} 
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    id="newZoneName" 
                    placeholder="Ajouter une zone personnalisée (ex: Thiès - Mbour)" 
                    className="flex-1 p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.target.value.trim()) {
                          setSettingsForm({
                            ...settingsForm,
                            delivery_zones: [
                              ...settingsForm.delivery_zones,
                              { id: 'custom-' + Date.now(), name: e.target.value.trim(), price: 1000, active: true }
                            ]
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={(e) => {
                      const input = document.getElementById('newZoneName');
                      if (input.value.trim()) {
                        setSettingsForm({
                          ...settingsForm,
                          delivery_zones: [
                            ...settingsForm.delivery_zones,
                            { id: 'custom-' + Date.now(), name: input.value.trim(), price: 1000, active: true }
                          ]
                        });
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={settingsForm.isSaving}
                className="w-full bg-[#059669] text-white font-bold py-4 rounded-xl hover:bg-[#047857] transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {settingsForm.isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </motion.form>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="space-y-8 max-w-7xl mx-auto">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Abonnement & Facturation</h2>
              <p className="text-gray-500 mt-2 font-medium text-lg">Choisissez le forfait qui correspond à vos besoins</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Plan Débutant */}
              <div className={`bg-white p-8 rounded-[2rem] border-2 transition-all flex flex-col ${merchant?.subscription_plan === 'debutant' ? 'border-emerald-500 shadow-xl shadow-emerald-500/10' : 'border-gray-100 shadow-sm hover:shadow-lg'}`}>
                {merchant?.subscription_plan === 'debutant' && (
                  <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-xs w-max mb-4">Plan Actuel</span>
                )}
                <h3 className="text-2xl font-black text-gray-900 mb-2">Débutant</h3>
                <p className="text-gray-500 text-sm h-10">Pour lancer votre première boutique</p>
                <div className="my-6">
                  <span className="text-5xl font-black text-gray-900">0</span>
                  <span className="text-gray-500 font-bold text-sm ml-2">FCFA / MOIS</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShieldCheck className="w-4 h-4"/></div> Jusqu'à 10 produits
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShieldCheck className="w-4 h-4"/></div> 1 Livreur
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShieldCheck className="w-4 h-4"/></div> Vitrine basique
                  </li>
                </ul>
                <button disabled className="w-full py-4 rounded-xl font-bold bg-gray-100 text-gray-500 cursor-not-allowed">
                  {merchant?.subscription_plan === 'debutant' ? 'Déjà actif' : 'Gratuit à vie'}
                </button>
              </div>

              {/* Plan Pro */}
              <div className={`bg-gray-900 p-8 rounded-[2rem] border-2 transition-all flex flex-col relative overflow-hidden ${merchant?.subscription_plan === 'pro' ? 'border-purple-500 shadow-2xl shadow-purple-500/20' : 'border-gray-800 shadow-xl'}`}>
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500/30 blur-3xl rounded-full"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  {merchant?.subscription_plan === 'pro' ? (
                    <span className="bg-purple-500 text-white font-bold px-3 py-1 rounded-full text-xs">Plan Actuel</span>
                  ) : (
                    <span className="bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-bold px-3 py-1 rounded-full text-xs">Le plus populaire</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white mb-2 relative z-10">Pro</h3>
                <p className="text-gray-400 text-sm h-10 relative z-10">Pour les marchands réguliers</p>
                <div className="my-6 relative z-10">
                  <span className="text-5xl font-black text-white">5 000</span>
                  <span className="text-gray-400 font-bold text-sm ml-2">FCFA / MOIS</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1 relative z-10">
                  <li className="flex items-center gap-3 text-gray-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><ShieldCheck className="w-4 h-4"/></div> Produits illimités
                  </li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><ShieldCheck className="w-4 h-4"/></div> Jusqu'à 5 livreurs
                  </li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><ShieldCheck className="w-4 h-4"/></div> Personnalisation avancée
                  </li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><ShieldCheck className="w-4 h-4"/></div> Statistiques détaillées
                  </li>
                </ul>
                <button 
                  onClick={() => handlePaySubscription('pro')}
                  disabled={merchant?.subscription_plan === 'pro' || isProcessingPayment}
                  className={`relative z-10 w-full py-4 rounded-xl font-bold transition-all ${merchant?.subscription_plan === 'pro' ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900 hover:bg-gray-100 hover:scale-[1.02]'}`}
                >
                  {isProcessingPayment ? 'Patientez...' : merchant?.subscription_plan === 'pro' ? 'Déjà actif' : 'Mettre à niveau (Pro)'}
                </button>
              </div>

              {/* Plan Premium */}
              <div className={`bg-white p-8 rounded-[2rem] border-2 transition-all flex flex-col ${merchant?.subscription_plan === 'premium' ? 'border-orange-500 shadow-xl shadow-orange-500/10' : 'border-gray-100 shadow-sm hover:shadow-lg'}`}>
                {merchant?.subscription_plan === 'premium' && (
                  <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-xs w-max mb-4">Plan Actuel</span>
                )}
                <h3 className="text-2xl font-black text-gray-900 mb-2">Premium</h3>
                <p className="text-gray-500 text-sm h-10">Pour les grandes boutiques</p>
                <div className="my-6">
                  <span className="text-5xl font-black text-gray-900">15 000</span>
                  <span className="text-gray-500 font-bold text-sm ml-2">FCFA / MOIS</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-4 h-4"/></div> Tout du plan Pro
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-4 h-4"/></div> Livreurs illimités
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-4 h-4"/></div> Support prioritaire
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-4 h-4"/></div> Domaine personnalisé
                  </li>
                </ul>
                <button 
                  onClick={() => handlePaySubscription('premium')}
                  disabled={merchant?.subscription_plan === 'premium' || isProcessingPayment}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${merchant?.subscription_plan === 'premium' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:scale-[1.02]'}`}
                >
                  {isProcessingPayment ? 'Patientez...' : merchant?.subscription_plan === 'premium' ? 'Déjà actif' : 'Mettre à niveau (Premium)'}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-center text-gray-400 mt-8 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Paiements sécurisés par PayDunya (Wave, Orange Money, Carte Bancaire)
            </p>
          </div>
        ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
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
                <input required type="text" placeholder="Ex: Chemise en lin" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea rows="3" placeholder="Détails du produit..." className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all cursor-pointer"
                    value={newProduct.category} 
                    onChange={e => setNewProduct({...newProduct, category: e.target.value, features: {}})}
                  >
                    {SHOP_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Dynamic Features based on Category */}
              {(CATEGORY_FEATURES[newProduct.category] || []).length > 0 && (
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" /> Caractéristiques spécifiques (Optionnel)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(CATEGORY_FEATURES[newProduct.category] || []).map(feature => (
                      <div key={feature}>
                        <label className="block text-xs font-bold text-gray-700 mb-1">{feature}</label>
                        <input 
                          type="text" 
                          placeholder="Valeur..." 
                          className="w-full px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                          value={newProduct.features[feature] || ''} 
                          onChange={e => setNewProduct({
                            ...newProduct, 
                            features: { ...newProduct.features, [feature]: e.target.value }
                          })} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Prix (FCFA)</label>
                  <input required type="number" min="0" placeholder="0" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium" value={newProduct.price_fcfa} onChange={e => setNewProduct({...newProduct, price_fcfa: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock initial</label>
                  <input required type="number" min="0" placeholder="10" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Photo du produit</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-white hover:border-emerald-400 hover:text-emerald-600 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-2 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      <p className="text-sm text-gray-500 font-medium group-hover:text-emerald-600">
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
                <button type="submit" disabled={uploading} className="px-6 py-3 bg-[#059669] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100">
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
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={newDriver.full_name} onChange={e => setNewDriver({...newDriver, full_name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de téléphone</label>
                <input required type="text" placeholder="Ex: 01 23 45 67 89" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={newDriver.phone_number} onChange={e => setNewDriver({...newDriver, phone_number: e.target.value})} />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type de véhicule</label>
                  <select className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={newDriver.vehicle_type} onChange={e => setNewDriver({...newDriver, vehicle_type: e.target.value})}>
                    <option value="Moto">Moto</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Voiture">Voiture</option>
                    <option value="Vélo">Vélo</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de CNI / Pièce</label>
                  <input type="text" placeholder="Optionnel" className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={newDriver.cni_number} onChange={e => setNewDriver({...newDriver, cni_number: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-gray-100/50">
                <button type="submit" className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40">
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
        let aReverser = 0;
        
        driverDeliveries.forEach(order => {
          const cartTotal = order.cart_items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
          const deliveryFee = order.total_amount_fcfa - cartTotal;
          const collectedCash = order.payment_method === 'MOBILE_MONEY' ? 0 : order.total_amount_fcfa;
          
          dTotalEnbaisse += collectedCash;
          dPartLivreur += deliveryFee;
          aReverser += (collectedCash - deliveryFee);
        });

        return (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setSelectedDriverForStats(null)} />
            <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl max-w-2xl w-full relative z-10 overflow-hidden border border-white/50 flex flex-col max-h-[90vh]">
              
              <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bilan du jour</h2>
                  <p className="text-emerald-600 font-bold text-sm mt-1">{selectedDriverForStats.full_name}</p>
                </div>
                <button onClick={() => setSelectedDriverForStats(null)} className="text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors shadow-sm border border-gray-100">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-center">
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Encaissé (Cash)</p>
                    <p className="text-2xl font-black text-gray-900">{dTotalEnbaisse.toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span></p>
                  </div>
                  <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100/50 text-center">
                    <p className="text-orange-600/70 font-bold text-xs uppercase tracking-wider mb-2">Sa part (Frais)</p>
                    <p className="text-2xl font-black text-orange-500">{dPartLivreur.toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span></p>
                  </div>
                  <div className={`p-5 rounded-2xl border text-center relative overflow-hidden ${aReverser < 0 ? 'bg-red-50 border-red-100/50' : 'bg-emerald-50 border-emerald-100/50'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent"></div>
                    <p className={`font-bold text-xs uppercase tracking-wider mb-2 relative z-10 ${aReverser < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {aReverser < 0 ? 'Vous lui devez' : 'Il doit vous verser'}
                    </p>
                    <p className={`text-3xl font-black relative z-10 ${aReverser < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {Math.abs(aReverser).toLocaleString('fr-FR')} <span className="text-sm opacity-50">F</span>
                    </p>
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
                      <div key={o.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-100 transition-colors">
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
