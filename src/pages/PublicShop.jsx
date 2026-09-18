import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import FortuneWheel from '../components/FortuneWheel';
import SocialProofToast from '../components/SocialProofToast';
import { 
  Package, MapPin, Search, Menu, Store, ShoppingCart, Heart, User, 
  Star, Plus, Minus, X, CheckCircle, Bell, ArrowRight, ChevronRight,
  Filter, Phone, Mail, Globe, ChevronDown, ShoppingBag, Truck, CreditCard,
  Eye, ThumbsUp, MessageCircle
} from 'lucide-react';
import Icon3D from '../components/Icon3D';
import StoreStories from '../components/StoreStories';

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

export default function PublicShop() {
  const { shopName } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // E-commerce States
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [searchPlaceholder, setSearchPlaceholder] = useState("Rechercher un produit...");

  // Effet machine à écrire pour la recherche
  useEffect(() => {
    const texts = ["Rechercher des articles...", "Rechercher par catégorie...", "Rechercher une nouveauté..."];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setSearchPlaceholder(texts[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const [sortBy, setSortBy] = useState('newest'); // newest, price_asc, price_desc
  
  // UI States
  const [selectedProduct, setSelectedProduct] = useState(null); // Quick View Modal
  const [quickViewSize, setQuickViewSize] = useState(null);
  const [quickViewColor, setQuickViewColor] = useState(null);
  const [quickViewImage, setQuickViewImage] = useState(null);
  
  const [productReviews, setProductReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '', customer_name: '', product_id: null });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // home, profile, order-tracking
  
  // Order & Checkout States
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '', zone: '', paymentMethod: 'ON_DELIVERY', gpsLocation: null });
  const [orderFinalized, setOrderFinalized] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(null);

  // Tracking States
  const [trackPhone, setTrackPhone] = useState('');
  const [trackPin, setTrackPin] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Real-time Order Tracking Subscription
  useEffect(() => {
    if (!trackResult || !trackResult.id) return;

    const subscription = supabase
      .channel(`public:orders:id=eq.${trackResult.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `id=eq.${trackResult.id}` 
      }, (payload) => {
        setTrackResult(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [trackResult?.id]);

  useEffect(() => {
    fetchShopData();
    const savedFavs = localStorage.getItem(`favs_${shopName}`);
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    // PayDunya Return
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const orderId = params.get('orderId');
      if (orderId) {
        setPaymentStatusMessage("Paiement réussi ! Votre commande est validée.");
        fetchOrderData(orderId);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      setPaymentStatusMessage("Paiement annulé. Votre commande n'a pas été confirmée.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [shopName]);

  useEffect(() => {
    if (selectedProduct) {
      const v = selectedProduct.variants;
      const isObj = v && typeof v === 'object' && !Array.isArray(v);
      setQuickViewSize(isObj ? (v.sizes?.[0] || null) : (Array.isArray(v) ? v[0] : null));
      setQuickViewColor(isObj ? (v.colors?.[0] || null) : null);
      setQuickViewImage(selectedProduct.image_url);

      const fetchReviews = async () => {
         const { data } = await supabase.from('reviews').select('*').eq('product_id', selectedProduct.id).order('created_at', { ascending: false });
         if (data) setProductReviews(data);
      };
      fetchReviews();
    }
  }, [selectedProduct]);

  const fetchOrderData = async (orderId) => {
    const { data } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (data) {
      setOrderFinalized(data);
      setCart({});
      setIsCartOpen(true);
    }
  };

  const fetchShopData = async () => {
    setLoading(true);
    const decodedName = decodeURIComponent(shopName);
    
    const { data: mData } = await supabase
      .from('merchants')
      .select('*')
      .ilike('shop_name', decodedName)
      .single();
      
    if (mData) {
      setMerchant(mData);
      document.title = `${mData.shop_name} - Boutique en ligne`;
      
      const { data: pData } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', mData.id)
        .order('created_at', { ascending: false });
        
      if (pData) setProducts(pData);
    }
    setLoading(false);
  };

  const toggleFavorite = (productId) => {
    setFavorites(prev => {
      const newFavs = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem(`favs_${shopName}`, JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product, size = null, color = null) => {
    let variantDesc = '';
    if (size) variantDesc += size;
    if (size && color) variantDesc += ' - ';
    if (color) variantDesc += color;
    
    const cartKey = variantDesc ? `${product.id}-${variantDesc}` : product.id;

    setCart(prev => ({
      ...prev,
      [cartKey]: {
        product,
        variant: variantDesc,
        quantity: (prev[cartKey]?.quantity || 0) + 1
      }
    }));
    
    showToast(`${product.name} ajouté au panier`);
    setIsCartOpen(true);
    if(selectedProduct) setSelectedProduct(null); 
  };

  const updateQuantity = (cartKey, delta) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (!newCart[cartKey]) return prev;
      
      newCart[cartKey].quantity += delta;
      if (newCart[cartKey].quantity <= 0) {
        delete newCart[cartKey];
      }
      return newCart;
    });
  };

  const getCartTotal = () => Object.values(cart).reduce((t, item) => t + (item.product.price_fcfa * item.quantity), 0);
  const activeZones = merchant?.delivery_zones?.length 
    ? merchant.delivery_zones.filter(z => z.active) 
    : DEFAULT_DELIVERY_ZONES.filter(z => z.active);

  useEffect(() => {
    if (merchant && activeZones.length > 0 && !checkoutData.zone) {
      setCheckoutData(prev => ({ ...prev, zone: activeZones[0].name }));
    }
  }, [merchant, activeZones, checkoutData.zone]);

  const getDeliveryPrice = () => activeZones.find(z => z.name === checkoutData.zone)?.price || 0;
  const cartItemsCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) return;
    
    setIsSubmitting(true);
    try {
      const totalAmount = getCartTotal() + getDeliveryPrice();
      const cartItemsArray = Object.values(cart).map(item => ({
        product_id: item.product.id,
        name: item.variant ? `${item.product.name} (${item.variant})` : item.product.name,
        price: item.product.price_fcfa,
        quantity: item.quantity
      }));

      if (checkoutData.paymentMethod === 'MOBILE_MONEY') {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/payments/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderDetails: {
              merchant_id: merchant.id,
              name: checkoutData.name,
              phone: checkoutData.phone,
              address: checkoutData.address,
              zone: checkoutData.zone,
              totalAmount: totalAmount,
              cartItems: cartItemsArray
            },
            merchantInfo: {
              shop_name: merchant.shop_name,
              payout_provider: merchant.payout_provider,
              payout_phone: merchant.payout_phone_number
            }
          })
        });

        const result = await response.json();
        
        if (result.success && result.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          throw new Error(result.error || "Erreur lors de l'initialisation du paiement");
        }
      } else {
        const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        const { data, error } = await supabase.from('orders').insert([{
          merchant_id: merchant.id,
          customer_name: checkoutData.name,
          customer_phone: checkoutData.phone,
          customer_address: checkoutData.address + (checkoutData.gpsLocation ? ' || GPS: ' + checkoutData.gpsLocation : ''),
          delivery_zone: checkoutData.zone,
          total_amount_fcfa: totalAmount,
          cart_items: cartItemsArray,
          delivery_pin: pinCode,
          payment_method: checkoutData.paymentMethod || 'ON_DELIVERY',
          status: 'PENDING'
        }]).select().single();

        if (error) throw error;
        
        setOrderFinalized(data);
        setCart({});
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Erreur lors de la validation de la commande");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppCheckoutLink = () => {
    if (!orderFinalized || !merchant) return '#';
    let text = `👋 Bonjour ${merchant.shop_name},\n\n🛒 Je viens de passer une commande (Réf: *${orderFinalized.id.slice(0,6)}*).\n`;
    text += `\n📦 *Produits :*\n`;
    orderFinalized.cart_items.forEach(item => {
      text += `- ${item.quantity}x ${item.name} (${item.price} FCFA)\n`;
    });
    text += `\n🚚 *Livraison :* ${orderFinalized.delivery_zone} (${getDeliveryPrice()} FCFA)\n`;
    text += `💰 *Total à payer :* *${orderFinalized.total_amount_fcfa} FCFA*\n\n`;
    text += `📍 *Mes coordonnées :*\n👤 Nom: ${orderFinalized.customer_name}\n📞 Tél: ${orderFinalized.customer_phone}\n🏠 Adresse: ${orderFinalized.customer_address}\n\n`;
    text += `🔐 *Code Secret de Livraison :* ${orderFinalized.delivery_pin}`;
    return `https://wa.me/${merchant.phone_number.replace(/\+/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewData.product_id) return;
    setReviewSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert([{
        product_id: reviewData.product_id,
        order_id: orderFinalized?.id || null,
        rating: reviewData.rating,
        comment: reviewData.comment,
        customer_name: reviewData.customer_name || 'Client anonyme'
      }]);
      if (error) throw error;
      showToast("Merci pour votre avis !");
      setReviewModalOpen(false);
      setReviewData({ rating: 5, comment: '', customer_name: '', product_id: null });
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de l'avis");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);
    if (!trackPhone || !trackPin) {
      setTrackError('Veuillez remplir tous les champs');
      return;
    }
    setTrackLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', trackPhone)
        .eq('delivery_pin', trackPin.toUpperCase())
        .single();
        
      if (error || !data) setTrackError('Commande introuvable ou code PIN incorrect');
      else setTrackResult(data);
    } catch (err) {
      setTrackError('Erreur de connexion');
    }
    setTrackLoading(false);
  };

  // Filtrage
  const categories = ['Tous', ...new Set(products.map(p => p.category || 'Autres'))];
  let processedProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || (p.category || 'Autres') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (sortBy === 'price_asc') processedProducts.sort((a,b) => a.price_fcfa - b.price_fcfa);
  if (sortBy === 'price_desc') processedProducts.sort((a,b) => b.price_fcfa - a.price_fcfa);

  if (!merchant && !loading) return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="text-center p-12 bg-white rounded-[2rem] shadow-2xl max-w-sm w-full mx-4 border border-gray-100">
        <Icon3D name="package" className="w-24 h-24 mx-auto mb-6 opacity-70" />
        <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Boutique introuvable</h2>
        <p className="text-gray-500 mb-8 font-medium">Ce lien est expiré ou n'existe pas.</p>
        <Link to="/" className="bg-black text-white font-bold py-4 px-8 rounded-full block hover:bg-gray-800 transition-colors">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );

  const themeColor = merchant?.theme_color || '#000000'; 

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20 md:pb-0 relative selection:bg-gray-900 selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        .theme-bg { background-color: ${themeColor} !important; }
        .theme-text { color: ${themeColor} !important; }
        .theme-border { border-color: ${themeColor} !important; }
        .theme-ring { --tw-ring-color: ${themeColor} !important; }
      `}} />

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-2xl border border-white/20 hover:scale-105 transition-transform cursor-pointer"
            onClick={() => setIsCartOpen(true)}
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAGICAL MARQUEE PROMO BAR */}
      <div className="bg-gray-900 text-white text-xs font-bold overflow-hidden py-2.5 w-full relative z-50">
        <div className="animate-marquee flex items-center tracking-widest uppercase">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-8 shrink-0 justify-around">
              <span className="flex items-center gap-2"><Star className="w-3 h-3 theme-text animate-pulse" /> Livraison Express</span>
              <span className="text-gray-600">✦</span>
              <span>Paiement Sécurisé</span>
              <span className="text-gray-600">✦</span>
              <span className="flex items-center gap-2">Support 24/7</span>
              <span className="text-gray-600">✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-8">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            {merchant?.logo_url ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
                <img src={merchant.logo_url} alt={merchant.shop_name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-gray-100 transition-colors">
                <Icon3D name="store" className="w-8 h-8" />
              </div>
            )}
            <h1 className="text-2xl font-black text-gray-900 tracking-tight hidden md:block">
              {merchant?.shop_name || "TazajMart"}
            </h1>
          </div>
          
          {/* Central Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:theme-text transition-colors" />
            </div>
            <input 
              type="text"
              placeholder="Rechercher des produits de qualité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-full py-3 pl-12 pr-4 text-sm focus:bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setActiveTab('order-tracking')} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors px-2">Suivi</button>
            <button onClick={() => setActiveTab('profile')} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors px-2">À propos</button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="p-2.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="Accès Livreur">
              <Truck className="w-5 h-5" />
            </Link>
            <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors flex items-center gap-2 px-5">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm font-bold">{cartItemsCount}</span>
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="p-2 text-gray-600 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors" title="Accès Livreur">
              <Truck className="w-5 h-5" />
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => setIsCartOpen(true)} className="relative bg-gray-900 text-white p-2 rounded-full">
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 theme-bg text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search & Menu Expand */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-12 pr-4 text-sm focus:border-gray-900 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} className="p-3 bg-gray-50 rounded-2xl text-sm font-bold text-center">Boutique</button>
                  <button onClick={() => { setActiveTab('order-tracking'); setMobileMenuOpen(false); }} className="p-3 bg-gray-50 rounded-2xl text-sm font-bold text-center">Suivi commande</button>
                  <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="p-3 bg-gray-50 rounded-2xl text-sm font-bold text-center col-span-2">À propos du marchand</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <StoreStories products={products} onProductClick={(p) => { setSelectedProduct(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-32">
        {activeTab === 'home' && (
          <>
            {/* HERO SECTION */}
            {!loading && (
              <div className="relative w-full rounded-[2.5rem] overflow-hidden bg-gray-900 mb-12 md:mb-20 min-h-[400px] md:min-h-[500px] flex items-center justify-center p-8 shadow-2xl group">
                {merchant?.banner_url ? (
                  <img src={merchant.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-900"></div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>

                <div className="relative z-10 max-w-3xl text-center text-white">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-bold uppercase tracking-widest mb-6">Nouvelle Collection</span>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
                      {merchant?.shop_name}
                    </h2>
                    <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium">
                      {merchant?.description || "Découvrez notre sélection exclusive de produits haut de gamme."}
                    </p>
                    <button 
                      onClick={() => document.getElementById('shop-grid').scrollIntoView({ behavior: 'smooth' })}
                      className="bg-white text-gray-900 px-8 py-4 rounded-full text-base font-bold shadow-xl hover:scale-105 transition-transform inline-flex items-center gap-3"
                    >
                      Explorer le catalogue <ArrowRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                </div>
              </div>
            )}

            {/* SHOP GRID SECTION */}
            <div id="shop-grid" className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              
              {/* SIDEBAR FILTERS (Desktop) */}
              <div className="hidden lg:block w-64 shrink-0 sticky top-32">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-6 text-gray-900">
                    <Filter className="w-5 h-5" />
                    <h3 className="font-black uppercase tracking-widest text-sm">Filtres</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Catégories</h4>
                      <div className="space-y-2">
                        {categories.map(cat => (
                          <button 
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trier par</h4>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-gray-900 outline-none appearance-none"
                      >
                        <option value="newest">Nouveautés</option>
                        <option value="price_asc">Prix croissant</option>
                        <option value="price_desc">Prix décroissant</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE FILTERS */}
              <div className="lg:hidden w-full flex items-center justify-between gap-4 mb-6">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                >
                  <option value="newest">Nouveautés</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                </select>
              </div>

              {/* PRODUCTS GRID */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900">
                    {selectedCategory === 'Tous' ? 'Tous les produits' : selectedCategory}
                  </h3>
                  <span className="text-sm font-bold text-gray-400">{processedProducts.length} articles</span>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-100 aspect-[3/4] rounded-2xl mb-4"></div>
                        <div className="h-4 bg-gray-100 rounded-full w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-100 rounded-full w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : processedProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
                    {processedProducts.map((p, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: (idx % 4) * 0.1 }}
                        key={p.id} 
                        className="group relative cursor-pointer"
                      >
                        {/* Image Box */}
                        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 mb-4 isolate">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-12 h-12" />
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end p-4 gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); }}
                              className="w-full bg-white/90 backdrop-blur text-gray-900 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-white transition-colors"
                            >
                              <Eye className="w-4 h-4" /> Aperçu rapide
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                addToCart(p); 
                                const btn = e.currentTarget;
                                const originalHtml = btn.innerHTML;
                                btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Ajouté!';
                                btn.classList.add('bg-green-500', 'scale-95');
                                setTimeout(() => {
                                  btn.innerHTML = originalHtml;
                                  btn.classList.remove('bg-green-500', 'scale-95');
                                }, 1000);
                              }}
                              className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-black transition-all"
                            >
                              <ShoppingCart className="w-4 h-4" /> Ajouter
                            </button>
                          </div>

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 right-3 flex justify-between z-20">
                            {idx < 3 && <span className="bg-white text-gray-900 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">New</span>}
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                              className="ml-auto w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Heart className={`w-4 h-4 ${favorites.includes(p.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div onClick={() => setSelectedProduct(p)}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-900 text-sm md:text-base leading-tight group-hover:theme-text transition-colors">{p.name}</h4>
                          </div>
                          <p className="text-gray-500 text-xs mb-2 truncate">{p.category || 'Standard'}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-gray-900 text-base md:text-lg">{p.price_fcfa.toLocaleString('fr-FR')} FCFA</span>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                addToCart(p); 
                              }}
                              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full transition-colors flex-shrink-0"
                              title="Ajouter au panier"
                            >
                              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <Icon3D name="package" className="w-20 h-20 mx-auto mb-4 opacity-70" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun produit trouvé</h3>
                    <p className="text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ORDER TRACKING TAB */}
        {activeTab === 'order-tracking' && (
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-gray-50 p-8 md:p-12 rounded-[2rem] border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Package className="w-6 h-6 theme-text" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Suivre ma commande</h2>
                  <p className="text-gray-500 text-sm">Entrez vos informations de suivi ci-dessous.</p>
                </div>
              </div>

              <form onSubmit={handleTrackOrder}>
                {trackError && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl mb-6">{trackError}</div>}
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Téléphone</label>
                    <input type="tel" value={trackPhone} onChange={e => setTrackPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-medium focus:border-gray-900 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Code Secret (PIN)</label>
                    <input type="text" value={trackPin} onChange={e => setTrackPin(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-black uppercase tracking-[0.3em] focus:border-gray-900 outline-none" required />
                  </div>
                </div>
                
                <button type="submit" disabled={trackLoading} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50">
                  {trackLoading ? 'Recherche en cours...' : 'Voir le statut'}
                </button>
              </form>

              {trackResult && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 md:p-8 bg-white rounded-3xl border-2 theme-border shadow-2xl relative overflow-hidden">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-100 pb-6 gap-4">
                    <div>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Commande N°</span>
                      <span className="text-xl font-black text-gray-900 tracking-widest">{trackResult.id.split('-')[0].toUpperCase()}</span>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Montant Total</span>
                      <span className="text-xl font-black theme-text">{trackResult.total_amount_fcfa.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>

                  {trackResult.status === 'CANCELLED' ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-10 h-10 text-red-500" />
                      </div>
                      <h4 className="text-xl font-black text-gray-900 mb-2">Commande Annulée</h4>
                      <p className="text-gray-500 font-medium">Votre commande a été annulée. Veuillez contacter le support pour plus de détails.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute top-6 left-6 md:top-1/2 md:-translate-y-1/2 md:left-10 md:right-10 w-1 md:w-auto md:h-1 bg-gray-100 rounded-full h-full md:h-2 z-0"></div>
                      
                      {/* Timeline Steps */}
                      <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8 md:gap-4">
                        
                        {/* Step 1: Pending */}
                        <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm
                            ${['PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'].includes(trackResult.status) ? 'theme-bg text-white shadow-lg' : 'bg-white border-2 border-gray-200 text-gray-300'}
                          `}>
                            <ShoppingCart className="w-5 h-5" />
                          </div>
                          <div>
                            <span className={`block text-sm font-black uppercase tracking-widest mb-1 ${['PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'].includes(trackResult.status) ? 'text-gray-900' : 'text-gray-400'}`}>En attente</span>
                            <span className="text-xs font-medium text-gray-500 hidden md:block">Confirmation</span>
                          </div>
                        </div>

                        {/* Step 2: Preparing */}
                        <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm
                            ${['PREPARING', 'IN_TRANSIT', 'DELIVERED'].includes(trackResult.status) ? 'theme-bg text-white shadow-lg' : 'bg-white border-2 border-gray-200 text-gray-300'}
                          `}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <span className={`block text-sm font-black uppercase tracking-widest mb-1 ${['PREPARING', 'IN_TRANSIT', 'DELIVERED'].includes(trackResult.status) ? 'text-gray-900' : 'text-gray-400'}`}>Préparation</span>
                            <span className="text-xs font-medium text-gray-500 hidden md:block">Emballage</span>
                          </div>
                        </div>

                        {/* Step 3: In Transit */}
                        <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm
                            ${trackResult.status === 'IN_TRANSIT' ? 'bg-orange-500 text-white shadow-xl animate-bounce' : ['DELIVERED'].includes(trackResult.status) ? 'theme-bg text-white' : 'bg-white border-2 border-gray-200 text-gray-300'}
                          `}>
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className={`block text-sm font-black uppercase tracking-widest mb-1 ${['IN_TRANSIT', 'DELIVERED'].includes(trackResult.status) ? 'text-gray-900' : 'text-gray-400'}`}>En Route</span>
                            <span className="text-xs font-medium text-gray-500 hidden md:block">Vers vous</span>
                          </div>
                        </div>

                        {/* Step 4: Delivered */}
                        <div className="flex md:flex-col items-center md:text-center gap-4 md:gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-sm
                            ${trackResult.status === 'DELIVERED' ? 'bg-green-500 text-white shadow-xl scale-110' : 'bg-white border-2 border-gray-200 text-gray-300'}
                          `}>
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <span className={`block text-sm font-black uppercase tracking-widest mb-1 ${trackResult.status === 'DELIVERED' ? 'text-green-600' : 'text-gray-400'}`}>Livré</span>
                            <span className="text-xs font-medium text-gray-500 hidden md:block">Terminé</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Driver Info Block (if IN_TRANSIT) */}
                  {trackResult.status === 'IN_TRANSIT' && trackResult.driver_name && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                        <span className="text-xl font-black text-gray-900">{trackResult.driver_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Votre livreur est en route</span>
                        <span className="text-lg font-black text-gray-900 block">{trackResult.driver_name}</span>
                        {trackResult.driver_phone && (
                          <a href={`tel:${trackResult.driver_phone}`} className="inline-flex items-center gap-2 mt-2 text-sm font-bold theme-text hover:underline">
                            <Phone className="w-4 h-4" /> Appeler le livreur
                          </a>
                        )}
                      </div>
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Préparez le PIN</span>
                        <span className="text-2xl font-black text-gray-900 tracking-[0.3em]">{trackResult.delivery_pin}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  {trackResult.status === 'IN_TRANSIT' && (
                    <div className="md:hidden mt-4 text-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Préparez le PIN</span>
                      <span className="text-2xl font-black text-gray-900 tracking-[0.3em] bg-gray-50 px-6 py-2 rounded-xl inline-block border border-gray-200">{trackResult.delivery_pin}</span>
                    </div>
                  )}

                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE/ABOUT TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto py-12">
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100">
              <div className="h-48 theme-bg relative">
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <div className="px-8 pb-12 relative flex flex-col items-center text-center">
                {merchant?.logo_url ? (
                  <img src={merchant.logo_url} alt="Logo" className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl -mt-16 bg-white rotate-[-3deg]" />
                ) : (
                  <div className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-xl -mt-16 bg-gray-50 flex items-center justify-center rotate-[-3deg]">
                    <Icon3D name="store" className="w-16 h-16" />
                  </div>
                )}
                <h2 className="text-4xl font-black text-gray-900 mt-6 tracking-tight">{merchant?.shop_name}</h2>
                <p className="text-gray-500 mt-3 max-w-lg text-lg leading-relaxed">{merchant?.description || "Une boutique d'exception."}</p>
                
                <div className="w-full mt-12 grid gap-4 md:grid-cols-2 text-left">
                  {merchant?.phone_number && (
                    <a href={`tel:${merchant.phone_number.replace(/\s+/g, '')}`} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Téléphone</p>
                        <p className="font-bold text-gray-900">{merchant.phone_number}</p>
                      </div>
                    </a>
                  )}
                  {merchant?.email && (
                    <a href={`mailto:${merchant.email}`} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                        <p className="font-bold text-gray-900 truncate">{merchant.email}</p>
                      </div>
                    </a>
                  )}
                  {merchant?.address && (
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 md:col-span-2">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adresse</p>
                        <p className="font-bold text-gray-900">{merchant.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 mt-20 pt-16 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                {merchant?.logo_url ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-lg shrink-0">
                    <img src={merchant.logo_url} alt={merchant.shop_name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl theme-bg flex items-center justify-center shrink-0 shadow-lg">
                    <Icon3D name="store" className="w-8 h-8" />
                  </div>
                )}
                <span className="text-2xl font-black tracking-tight text-gray-900">{merchant?.shop_name || 'Boutique'}</span>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed max-w-sm mb-8">
                {merchant?.bio || "Découvrez notre sélection exclusive de produits premium. Qualité garantie et livraison rapide."}
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-sm">Liens Rapides</h4>
              <ul className="space-y-4">
                <li><button onClick={() => setActiveTab('products')} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Nos Produits</button></li>
                <li><button onClick={() => setActiveTab('profile')} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">À Propos</button></li>
                <li><button onClick={() => setIsCartOpen(true)} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Panier</button></li>
                <li><button onClick={() => setReviewModalOpen(true)} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Avis Clients</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-widest text-sm">Contact</h4>
              <ul className="space-y-4">
                {merchant?.phone_number && (
                  <li className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500 font-medium">{merchant.phone_number}</span>
                  </li>
                )}
                {merchant?.email && (
                  <li className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500 font-medium break-all">{merchant.email}</span>
                  </li>
                )}
                {merchant?.address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500 font-medium">{merchant.address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400 font-medium text-center md:text-left">
              &copy; {new Date().getFullYear()} {merchant?.shop_name || 'Boutique'}. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium bg-gray-50 px-4 py-2 rounded-full">
              Propulsé par <span className="font-black text-gray-900 tracking-tight">SamaBoutik</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <h2 className="text-2xl font-black text-gray-900">Panier</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gray-50">
                {Object.keys(cart).length === 0 && !orderFinalized ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <Icon3D name="bags" className="w-24 h-24 mb-4 drop-shadow-xl" />
                    <p className="font-medium text-lg">Votre panier est vide</p>
                    <button onClick={() => setIsCartOpen(false)} className="text-gray-900 font-bold underline">Continuer les achats</button>
                  </div>
                ) : orderFinalized ? (
                  <div className="bg-white p-8 rounded-3xl text-center shadow-sm border border-green-100">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon3D name="party" className="w-16 h-16 drop-shadow-xl" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Commande Valdée</h3>
                    <p className="text-gray-500 mb-6 font-medium">Votre numéro de suivi est : <br/><span className="text-xl font-black text-gray-900 tracking-widest">{orderFinalized.id.split('-')[0]}</span></p>
                    <div className="bg-gray-50 p-4 rounded-2xl text-left mb-6">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Code Secret de Livraison</p>
                      <p className="text-3xl font-black text-gray-900 tracking-[0.3em]">{orderFinalized.delivery_pin}</p>
                    </div>
                    {orderFinalized.payment_method === 'ON_DELIVERY' && (
                      <a href={getWhatsAppCheckoutLink()} target="_blank" rel="noreferrer" className="block w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#1DA851] transition-colors mb-3">
                        Confirmer sur WhatsApp
                      </a>
                    )}
                    <button onClick={() => { setOrderFinalized(null); setIsCartOpen(false); }} className="block w-full bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors">
                      Fermer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(cart).map(([key, item]) => (
                      <div key={key} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-full h-full p-4 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{item.product.name}</h4>
                            {item.variant && <p className="text-xs text-gray-500 mt-1 font-medium">{item.variant}</p>}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-black text-gray-900 text-sm">{item.product.price_fcfa.toLocaleString('fr-FR')} FCFA</span>
                            <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                              <button onClick={() => updateQuantity(key, -1)} className="text-gray-400 hover:text-gray-900"><Minus className="w-4 h-4" /></button>
                              <span className="text-sm font-bold text-gray-900 w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(key, 1)} className="text-gray-400 hover:text-gray-900"><Plus className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!orderFinalized && Object.keys(cart).length > 0 && (
                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                  <div className="space-y-3 mb-6 text-sm font-medium">
                    <div className="flex justify-between text-gray-500">
                      <span>Sous-total</span>
                      <span className="text-gray-900 font-bold">{getCartTotal().toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Livraison ({checkoutData.zone})</span>
                      <span className="text-gray-900 font-bold">{getDeliveryPrice().toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-between text-lg">
                      <span className="font-black text-gray-900">Total</span>
                      <span className="font-black theme-text">{(getCartTotal() + getDeliveryPrice()).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>

                  <form onSubmit={submitOrder} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Nom complet" required value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-900 outline-none" />
                      <input type="tel" placeholder="Téléphone" required value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-900 outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Adresse précise (ex: Médina rue 11)" required value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-900 outline-none" />
                      <button 
                        type="button"
                        onClick={() => {
                          if ('geolocation' in navigator) {
                            navigator.geolocation.getCurrentPosition((position) => {
                              const lat = position.coords.latitude;
                              const lng = position.coords.longitude;
                              setCheckoutData({...checkoutData, gpsLocation: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`});
                            }, (error) => {
                              alert("Impossible d'obtenir votre position. Veuillez vérifier vos permissions GPS.");
                            });
                          } else {
                            alert("La géolocalisation n'est pas supportée par votre navigateur.");
                          }
                        }}
                        className={`px-4 rounded-xl border flex items-center justify-center transition-colors ${checkoutData.gpsLocation ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                        title="Ajouter ma position GPS exacte"
                      >
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>
                    {checkoutData.gpsLocation && <p className="text-xs text-emerald-600 font-medium">Position GPS ajoutée avec succès !</p>}
                    <select value={checkoutData.zone} onChange={e => setCheckoutData({...checkoutData, zone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-gray-900 outline-none appearance-none">
                      {activeZones.map(z => <option key={z.name} value={z.name}>{z.name} - {z.price}F</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${checkoutData.paymentMethod === 'ON_DELIVERY' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                        <input type="radio" name="payment" value="ON_DELIVERY" checked={checkoutData.paymentMethod === 'ON_DELIVERY'} onChange={() => setCheckoutData({...checkoutData, paymentMethod: 'ON_DELIVERY'})} className="hidden" />
                        <Truck className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-bold uppercase tracking-wider block">À la livraison</span>
                      </label>
                      <label className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${checkoutData.paymentMethod === 'MOBILE_MONEY' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                        <input type="radio" name="payment" value="MOBILE_MONEY" checked={checkoutData.paymentMethod === 'MOBILE_MONEY'} onChange={() => setCheckoutData({...checkoutData, paymentMethod: 'MOBILE_MONEY'})} className="hidden" />
                        <CreditCard className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-bold uppercase tracking-wider block">Wave / OM</span>
                      </label>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? 'Traitement...' : 'Commander'} <ChevronRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {selectedProduct && !isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl z-[70] overflow-hidden flex flex-col md:flex-row"
            >
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-900 shadow-sm hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>

              {/* Image Section */}
              <div className="w-full md:w-1/2 bg-gray-50 p-6 md:p-12 flex items-center justify-center relative">
                {quickViewImage ? (
                  <motion.img 
                    key={quickViewImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={quickViewImage} 
                    alt={selectedProduct.name} 
                    className="w-full max-w-sm rounded-2xl shadow-xl object-cover aspect-[4/5]" 
                  />
                ) : (
                  <Package className="w-32 h-32 text-gray-300" />
                )}
                {/* Thumbnails if multiple images exist */}
                {selectedProduct.variants && typeof selectedProduct.variants === 'object' && selectedProduct.variants.images && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-6">
                     <button onClick={() => setQuickViewImage(selectedProduct.image_url)} className={`w-12 h-12 rounded-lg border-2 overflow-hidden ${quickViewImage === selectedProduct.image_url ? 'border-gray-900' : 'border-transparent'}`}>
                        <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
                     </button>
                    {selectedProduct.variants.images.map((img, i) => (
                      <button key={i} onClick={() => setQuickViewImage(img)} className={`w-12 h-12 rounded-lg border-2 overflow-hidden ${quickViewImage === img ? 'border-gray-900' : 'border-transparent'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto scrollbar-hide bg-white flex flex-col">
                <div className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedProduct.category || 'Standard'}</div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{selectedProduct.name}</h3>
                <div className="text-3xl font-black theme-text mb-6">{selectedProduct.price_fcfa.toLocaleString('fr-FR')} FCFA</div>
                
                <p className="text-gray-500 font-medium leading-relaxed mb-8">{selectedProduct.description || "Aucune description disponible pour ce produit premium."}</p>

                {/* Variants Selection */}
                {selectedProduct.variants && typeof selectedProduct.variants === 'object' && !Array.isArray(selectedProduct.variants) && (
                  <div className="space-y-6 mb-8">
                    {selectedProduct.variants.sizes?.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-gray-900">Sélectionner la taille</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants.sizes.map(s => (
                            <button key={s} onClick={() => setQuickViewSize(s)} className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all ${quickViewSize === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedProduct.variants.colors?.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-gray-900">Sélectionner la couleur</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants.colors.map(c => (
                            <button key={c} onClick={() => setQuickViewColor(c)} className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all ${quickViewColor === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Old Array format fallback */}
                {selectedProduct.variants && Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0 && (
                   <div className="mb-8">
                      <span className="text-sm font-bold text-gray-900 mb-3 block">Sélectionner une option</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map(v => (
                          <button key={v} onClick={() => setQuickViewSize(v)} className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all ${quickViewSize === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                   </div>
                )}

                <div className="mt-auto flex gap-4">
                  <button onClick={() => addToCart(selectedProduct, quickViewSize, quickViewColor)} className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Ajouter
                  </button>
                  <button onClick={() => toggleFavorite(selectedProduct.id)} className={`w-14 shrink-0 rounded-xl border-2 flex items-center justify-center transition-colors ${favorites.includes(selectedProduct.id) ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
                    <Heart className={`w-6 h-6 ${favorites.includes(selectedProduct.id) ? 'fill-red-500' : ''}`} />
                  </button>
                </div>

                {/* Reviews Section Trigger */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <button onClick={() => { setSelectedProduct(null); setReviewData({...reviewData, product_id: selectedProduct.id}); setReviewModalOpen(true); }} className="w-full flex items-center justify-between text-left group">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex text-yellow-400">
                          <Star className="w-4 h-4 fill-yellow-400" /><Star className="w-4 h-4 fill-yellow-400" /><Star className="w-4 h-4 fill-yellow-400" /><Star className="w-4 h-4 fill-yellow-400" /><Star className="w-4 h-4 fill-yellow-400" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{productReviews.length} Avis</span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium group-hover:text-gray-900 transition-colors">Voir les avis ou laisser un commentaire</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* REVIEWS MODAL */}
      <AnimatePresence>
        {reviewModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={() => setReviewModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-[2rem] shadow-2xl z-[90] p-8">
               <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 bg-gray-50 rounded-full p-2 hover:bg-gray-100"><X className="w-4 h-4" /></button>
               <h3 className="text-2xl font-black text-gray-900 mb-6">Avis Clients</h3>
               
               <form onSubmit={submitReview} className="mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                 <h4 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-500">Donner votre avis</h4>
                 <div className="flex gap-2 mb-4">
                   {[1,2,3,4,5].map(star => (
                     <Star key={star} onClick={() => setReviewData({...reviewData, rating: star})} className={`w-8 h-8 cursor-pointer transition-colors ${star <= reviewData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                   ))}
                 </div>
                 <input type="text" placeholder="Votre nom" value={reviewData.customer_name} onChange={e => setReviewData({...reviewData, customer_name: e.target.value})} className="w-full mb-3 p-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm font-medium" />
                 <textarea placeholder="Votre commentaire..." required value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} className="w-full mb-4 p-3 rounded-xl border border-gray-200 outline-none focus:border-gray-900 text-sm font-medium resize-none h-24" />
                 <button type="submit" disabled={reviewSubmitting} className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl uppercase tracking-widest hover:bg-black disabled:opacity-50">Envoyer</button>
               </form>

               <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-4">
                 {productReviews.length === 0 ? (
                   <p className="text-center text-gray-500 text-sm font-medium py-4">Soyez le premier à donner votre avis !</p>
                 ) : (
                   productReviews.map(rev => (
                     <div key={rev.id} className="border-b border-gray-100 pb-4 last:border-0">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-gray-900 text-sm">{rev.customer_name}</span>
                         <div className="flex text-yellow-400">
                           {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-yellow-400' : 'text-gray-200'}`} />)}
                         </div>
                       </div>
                       <p className="text-gray-500 text-sm">{rev.comment}</p>
                     </div>
                   ))
                 )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FLOATING WHATSAPP BUTTON */}
      {merchant?.phone_number && (
        <a 
          href={`https://wa.me/${merchant.phone_number.replace(/\s+/g, '').replace(/\+/g, '')}`} 
          target="_blank" 
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-[45] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:bg-[#1EBE5D] hover:scale-110 transition-all duration-300 group flex items-center justify-center"
          title="Contacter le vendeur"
        >
          <MessageCircle className="w-8 h-8" />
          <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Besoin d'aide ?
          </span>
        </a>
      )}

      {/* Wow Features */}
      <FortuneWheel merchantName={merchant?.shop_name || 'notre boutique'} />
      <SocialProofToast products={products} />

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-100 z-50 px-6 py-2 flex justify-between items-center pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <button onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex flex-col items-center gap-1 group">
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-[#cce312]' : 'group-hover:bg-gray-50'}`}>
            <Store className={`w-5 h-5 ${activeTab === 'home' ? 'text-black' : 'text-gray-500'}`} />
          </div>
          <span className={`text-[10px] font-bold ${activeTab === 'home' ? 'text-gray-900' : 'text-gray-500'}`}>Home</span>
        </button>
        
        <button onClick={() => { setActiveTab('home'); setTimeout(() => document.getElementById('shop-grid')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="flex flex-col items-center gap-1 group">
          <div className="p-1.5 rounded-xl transition-colors group-hover:bg-gray-50">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <span className="text-[10px] font-bold text-gray-500">Catalog</span>
        </button>

        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 group relative">
          <div className="p-1.5 rounded-xl transition-colors group-hover:bg-gray-50 relative">
            <ShoppingCart className="w-5 h-5 text-gray-500" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
                {cartItemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-gray-500">Cart</span>
        </button>

        <button onClick={() => { /* TODO: Filter favorites */ }} className="flex flex-col items-center gap-1 group">
          <div className="p-1.5 rounded-xl transition-colors group-hover:bg-gray-50 relative">
            <Heart className="w-5 h-5 text-gray-500" />
            {favorites.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </div>
          <span className="text-[10px] font-bold text-gray-500">Favorites</span>
        </button>

        <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center gap-1 group">
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-[#cce312]' : 'group-hover:bg-gray-50'}`}>
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-black' : 'text-gray-500'}`} />
          </div>
          <span className={`text-[10px] font-bold ${activeTab === 'profile' ? 'text-gray-900' : 'text-gray-500'}`}>Profile</span>
        </button>
      </div>

    </div>
  );
}
