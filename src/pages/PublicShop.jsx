import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, MapPin, Search, Menu, Store, Grid, ShoppingCart, Heart, User, 
  Star, Plus, Minus, X, CheckCircle, Bell, ArrowRight, ChevronRight,
  Shirt, Watch, Smartphone, Laptop, Headphones, Tag, Footprints, ShoppingBag, Utensils, Dumbbell, Sofa,
  Phone, Image as ImageIcon, TrendingUp, Truck, ShieldCheck, Zap, Mail, Globe, ChevronDown
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { StarRating } from '../components/StarRating';

const DELIVERY_ZONES = [
  { name: 'Dakar Plateau / Medina', price: 1000 },
  { name: 'Point E / Fann / Almadies', price: 1500 },
  { name: 'Ouakam / Mamelles', price: 1500 },
  { name: 'Yoff / Parcelles Assainies', price: 2000 },
  { name: 'Pikine / Guédiawaye', price: 2500 },
  { name: 'Rufisque / Keur Massar', price: 3000 },
];

// Composant Skeleton pour le chargement
const ProductSkeleton = () => (
  <div className="bg-white rounded-3xl p-4 flex flex-col border border-gray-100 shadow-sm animate-pulse">
    <div className="w-full aspect-[4/5] bg-gray-200 rounded-2xl mb-4"></div>
    <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-3"></div>
    <div className="flex gap-1 mb-4">
      {[1,2,3,4,5].map(i => <div key={i} className="w-3 h-3 bg-gray-200 rounded-full"></div>)}
    </div>
    <div className="h-6 bg-gray-200 rounded-full w-1/3 mb-4"></div>
    <div className="h-10 bg-gray-200 rounded-xl w-full mt-auto"></div>
  </div>
);

export default function PublicShop() {
  const { shopName } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States E-commerce
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('newest'); // newest, price_asc, price_desc
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [modalMainImage, setModalMainImage] = useState(null);

  // Order Tracking States
  const [trackPhone, setTrackPhone] = useState('');
  const [trackPin, setTrackPin] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // UI States
  const [selectedProduct, setSelectedProduct] = useState(null); // Pour le Quick View Modal
  const [productReviews, setProductReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '', customer_name: '', product_id: null });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      const v = selectedProduct.variants;
      const isObj = v && typeof v === 'object' && !Array.isArray(v);
      setSelectedSize(isObj ? (v.sizes?.[0] || null) : (Array.isArray(v) ? v[0] : null));
      setSelectedColor(isObj ? (v.colors?.[0] || null) : null);
      setModalMainImage(selectedProduct.image_url);

      const fetchReviews = async () => {
         const { data } = await supabase.from('reviews').select('*').eq('product_id', selectedProduct.id).order('created_at', { ascending: false });
         if (data) setProductReviews(data);
      };
      fetchReviews();
    }
  }, [selectedProduct]);

  const [toastMessage, setToastMessage] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // home, categories, cart, profile
  
  // Checkout States
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '', zone: DELIVERY_ZONES[0].name, paymentMethod: 'ON_DELIVERY' });
  const [orderFinalized, setOrderFinalized] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(null);

  useEffect(() => {
    fetchShopData();
    // Charger les favoris depuis le localStorage
    const savedFavs = localStorage.getItem(`favs_${shopName}`);
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    // Gestion du retour PayDunya
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

  const fetchOrderData = async (orderId) => {
    const { data } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (data) {
      setOrderFinalized(data);
      setCart({});
      setActiveTab('cart');
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

  const addToCart = (product) => {
    const v = product.variants;
    const isObj = v && typeof v === 'object' && !Array.isArray(v);
    const defaultSize = isObj ? (v.sizes?.[0] || null) : (Array.isArray(v) ? v[0] : null);
    const defaultColor = isObj ? (v.colors?.[0] || null) : null;
    
    // Use selected states if added from modal, else defaults
    const size = (selectedProduct && selectedProduct.id === product.id) ? selectedSize : defaultSize;
    const color = (selectedProduct && selectedProduct.id === product.id) ? selectedColor : defaultColor;
    
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
    if(selectedProduct) setSelectedProduct(null); // Fermer le modal si ouvert
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
  const getDeliveryPrice = () => DELIVERY_ZONES.find(z => z.name === checkoutData.zone)?.price || 0;
  const cartItemsCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

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
        
      if (error || !data) {
        setTrackError('Commande introuvable ou code PIN incorrect');
      } else {
        setTrackResult(data);
      }
    } catch (err) {
      setTrackError('Erreur de connexion');
    }
    setTrackLoading(false);
  };

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
        // Logique de paiement en ligne via le Backend Node.js
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/payments/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
          // Rediriger vers l'URL PayDunya
          window.location.href = result.paymentUrl;
        } else {
          throw new Error(result.error || "Erreur lors de l'initialisation du paiement");
        }
      } else {
        // Logique de Paiement à la livraison classique
        const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
        const { data, error } = await supabase.from('orders').insert([{
          merchant_id: merchant.id,
          customer_name: checkoutData.name,
          customer_phone: checkoutData.phone,
          customer_address: checkoutData.address,
          delivery_zone: checkoutData.zone,
          total_amount_fcfa: totalAmount,
          cart_items: cartItemsArray,
          delivery_pin: pinCode,
          payment_method: 'ON_DELIVERY',
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

  // Filtrage & Tri
  const categories = ['Tous', ...new Set(products.map(p => p.category || 'Autres'))];
  
  let processedProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || (p.category || 'Autres') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (sortBy === 'price_asc') processedProducts.sort((a,b) => a.price_fcfa - b.price_fcfa);
  if (sortBy === 'price_desc') processedProducts.sort((a,b) => b.price_fcfa - a.price_fcfa);
  // newest is already sorted by fetch

  if (!merchant && !loading) return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm w-full mx-4">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Boutique introuvable</h2>
        <p className="text-gray-500 mb-6">Le lien que vous avez suivi semble incorrect ou expiré.</p>
        <Link to="/" className="theme-bg text-white text-white font-bold py-3 px-6 rounded-xl block hover:theme-bg text-white transition-colors">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );

  const themeColor = merchant?.theme_color || '#000000'; // Par défaut noir et blanc pour le style minimaliste premium

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 pb-20 md:pb-0 relative selection:bg-orange-100 selection:text-orange-900">
      
      {/* INJECT DYNAMIC THEME STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .theme-bg { background-color: ${themeColor} !important; }
        .theme-text { color: ${themeColor} !important; }
        .theme-border { border-color: ${themeColor} !important; }
        .theme-ring { --tw-ring-color: ${themeColor} !important; }
        .theme-gradient { background: linear-gradient(135deg, ${themeColor}, #000000) !important; }
      `}} />

      {/* Toast Notification */}
      <div className="z-50">
        {toastMessage && (
          <div 
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}
        {paymentStatusMessage && (
          <div 
            className="fixed bottom-36 md:bottom-20 left-1/2 -translate-x-1/2 z-50 theme-bg text-white text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <Bell className="w-5 h-5 text-white" />
            <span className="text-sm font-medium">{paymentStatusMessage}</span>
            <button onClick={() => setPaymentStatusMessage(null)} className="ml-2 bg-white/20 rounded-full p-1"><X className="w-4 h-4"/></button>
          </div>
        )}
      </div>

      {/* TOP PROMO BAR (MAGICAL MARQUEE) */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white text-xs md:text-sm font-bold overflow-hidden py-2 w-full relative z-50 border-b border-yellow-400/30 shadow-[0_0_15px_rgba(0,112,74,0.5)]"
      >
        <div className="absolute inset-0 bg-white/5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay pointer-events-none"></div>
        <div className="animate-marquee flex items-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 shrink-0 w-1/2 justify-around">
              <span className="flex items-center gap-2"><Star className="w-3 h-3 text-yellow-300 animate-spin-slow" style={{animationDuration: '3s'}} /> Obtenez 30% de réduction sur votre première commande !</span>
              <span className="text-yellow-400 animate-pulse">✦</span>
              <span>Commandez et faites-vous livrer en 20 minutes au Sénégal</span>
              <span className="text-yellow-400 animate-pulse">✦</span>
              <span className="flex items-center gap-2">Paiement à la livraison <CheckCircle className="w-3 h-3 text-green-300" /></span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* HEADER DESKTOP & MOBILE TOP */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {merchant?.logo_url ? (
                <img src={merchant.logo_url} alt={merchant.shop_name} className="w-10 h-10 md:w-14 md:h-14 object-cover rounded-xl border border-gray-100 shadow-sm" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 md:w-6 md:h-6 theme-text" />
                </div>
              )}
              <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter" style={{ color: themeColor }}>
                {merchant?.shop_name || "TazajMart"}
              </h1>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center gap-3 md:hidden">
              <Link to={`/livreur/${encodeURIComponent(shopName)}`} title="Espace Livreur" className="bg-indigo-50 p-2 rounded-full text-indigo-700 hover:bg-indigo-100">
                <Truck className="w-5 h-5" />
              </Link>
              <button onClick={() => setActiveTab('profile')} className="bg-gray-50 p-2 rounded-full theme-text hover:bg-orange-100">
                <User className="w-5 h-5" />
              </button>
              <button onClick={() => setIsCartOpen(true)} className="relative theme-bg text-white p-2 rounded-full text-white">
                <ShoppingCart className="w-5 h-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 theme-bg text-white text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Location & Search */}
          <div className="flex flex-1 items-center gap-4 w-full">
            <div className="hidden lg:flex items-center gap-2 shrink-0 border-r border-gray-200 pr-4">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col text-xs">
                <span className="text-gray-500">Livraison à</span>
                <span className="font-bold text-gray-900">Dakar</span>
              </div>
            </div>

            <div className="flex-1 relative" onFocus={() => setIsSearchFocused(true)} onBlur={(e) => {
              // Petit délai pour permettre le clic sur un résultat
              setTimeout(() => setIsSearchFocused(false), 200);
            }}>
              <input 
                type="text"
                placeholder="Rechercher des produits, catégories ou marques"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                className="w-full bg-gray-100 border-transparent rounded-full py-2.5 md:py-3 pl-12 pr-4 text-sm focus:bg-white focus:theme-border focus:ring-1 focus:theme-ring outline-none transition-all"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              
              {/* LIVE SEARCH DROPDOWN */}
              {isSearchFocused && searchQuery.trim() !== '' && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setSelectedProduct(p);
                        setSearchQuery('');
                        setIsSearchFocused(false);
                      }}
                      className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-full h-full p-2 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{p.name}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">{p.category || 'Autres'}</span>
                      </div>
                      <div className="font-black theme-text text-sm whitespace-nowrap">
                        {p.price_fcfa.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  ))}
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      Aucun produit trouvé pour "{searchQuery}"
                    </div>
                  )}
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 5 && (
                    <div 
                      onClick={() => {
                        document.getElementById('shop-section')?.scrollIntoView({behavior: 'smooth'});
                        setIsSearchFocused(false);
                      }}
                      className="p-3 bg-gray-50 text-center text-sm font-bold theme-text hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      Voir tous les résultats
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
              <Truck className="w-4 h-4" /> Livreur
            </Link>
            <button onClick={() => setActiveTab('profile')} className={`p-2.5 rounded-full transition-colors ${activeTab === 'profile' ? 'theme-bg text-white text-white' : 'bg-gray-50 theme-text hover:bg-orange-100'}`}>
              <User className="w-5 h-5" />
            </button>
            <button onClick={() => setIsCartOpen(true)} className="relative theme-bg text-white p-2.5 rounded-full text-white hover:bg-[#003820] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 theme-bg text-white text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sub navigation */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 items-center justify-between text-sm border-t border-gray-50">
          <div className="flex items-center gap-6 font-medium text-gray-700">
            <button onClick={() => { setActiveTab('home'); document.getElementById('shop-section')?.scrollIntoView({behavior: 'smooth'}); }} className="flex items-center gap-1 hover:theme-text transition-colors">
              Produits <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => { setActiveTab('home'); setSortBy('newest'); document.getElementById('shop-section')?.scrollIntoView({behavior: 'smooth'}); }} className="hover:theme-text transition-colors">Nouveautés</button>
            <button onClick={() => setActiveTab('profile')} className="hover:theme-text transition-colors">Livraison</button>
            <button onClick={() => { setActiveTab('home'); document.getElementById('shop-section')?.scrollIntoView({behavior: 'smooth'}); }} className="flex items-center gap-1 hover:theme-text transition-colors">
              Offres & Promos <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => setActiveTab('profile')} className="hover:theme-text transition-colors">Support</button>
          </div>
          <div className="flex items-center gap-6 font-medium text-gray-500">
            <button onClick={() => setActiveTab('profile')} className="hover:text-gray-900 transition-colors">Retours</button>
            <button onClick={() => setActiveTab('profile')} className="hover:text-gray-900 transition-colors">FAQs</button>
            <button onClick={() => { if(merchant?.email) window.location.href = `mailto:${merchant.email}`; else setActiveTab('profile'); }} className="flex items-center gap-2 theme-text bg-gray-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors">
              <span className="w-2 h-2 theme-bg text-white rounded-full animate-pulse"></span>
              Support Email
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'profile' ? (
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-20 mb-20 md:mb-0">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="h-32 md:h-48" style={{ backgroundColor: themeColor }}></div>
            <div className="px-6 pb-6 md:px-12 md:pb-12 relative flex flex-col items-center text-center">
              {merchant?.logo_url ? (
                <img src={merchant.logo_url} alt="Logo" className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg -mt-12 md:-mt-16 bg-white" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg -mt-12 md:-mt-16 bg-orange-100 flex items-center justify-center">
                  <Store className="w-10 h-10 md:w-14 md:h-14 theme-text" />
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-4">{merchant?.shop_name}</h2>
              <p className="text-gray-500 mt-2 max-w-lg">{merchant?.description || "Bienvenue dans notre boutique."}</p>
              
              <div className="w-full mt-8 space-y-4">
                {merchant?.phone_number && (
                  <a href={`tel:${merchant.phone_number.replace(/\s+/g, '')}`} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Téléphone</p>
                      <p className="font-medium text-gray-900">{merchant.phone_number}</p>
                    </div>
                  </a>
                )}
                
                {merchant?.email && (
                  <a href={`mailto:${merchant.email}`} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</p>
                      <p className="font-medium text-gray-900">{merchant.email}</p>
                    </div>
                  </a>
                )}

                {merchant?.address && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adresse</p>
                      <p className="font-medium text-gray-900">{merchant.address}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Réseaux Sociaux */}
              {(merchant?.social_links?.facebook || merchant?.social_links?.instagram || merchant?.social_links?.tiktok) && (
                <div className="mt-8 pt-8 border-t border-gray-100 w-full flex justify-center gap-4">
                  {merchant.social_links.facebook && (
                    <a href={merchant.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {merchant.social_links.instagram && (
                    <a href={merchant.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {merchant.social_links.tiktok && (
                    <a href={merchant.social_links.tiktok} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors">
                      <strong className="text-xl">𝕏</strong>
                    </a>
                  )}
                </div>
              )}

              {/* Suivi de Commande */}
              <div className="mt-12 pt-12 border-t border-gray-100 w-full text-left">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 theme-text rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Suivre ma commande</h3>
                </div>
                
                <form onSubmit={handleTrackOrder} className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-6">Saisissez votre numéro de téléphone et le code secret (PIN) reçu lors de votre commande pour voir son état.</p>
                  
                  {trackError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl mb-4 font-medium border border-red-100">{trackError}</div>}
                  
                  <div className="space-y-4 mb-6">
                    <input type="tel" value={trackPhone} onChange={e => setTrackPhone(e.target.value)} placeholder="Votre numéro de téléphone" className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                    <input type="text" value={trackPin} onChange={e => setTrackPin(e.target.value)} placeholder="Code secret (ex: AB12C)" className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm uppercase tracking-widest focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                  </div>
                  
                  <button type="submit" disabled={trackLoading} className="w-full bg-black text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {trackLoading ? 'Recherche...' : 'Rechercher'}
                  </button>
                  
                  {trackResult && (
                    <div className="mt-6 p-5 bg-white rounded-2xl border-2 border-orange-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">État</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          trackResult.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          trackResult.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          trackResult.status === 'confirmed' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {trackResult.status === 'delivered' ? 'Livrée' :
                           trackResult.status === 'shipped' ? 'En livraison' :
                           trackResult.status === 'confirmed' ? 'Confirmée' :
                           'En attente'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">Montant total</span>
                        <span className="text-lg font-black theme-text">{trackResult.total_amount_fcfa.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* HERO SECTION DYNAMIQUE */}
          {loading ? (
            <div className="max-w-7xl mx-auto px-4 mt-6"><div className="w-full h-[50vh] bg-gray-200 animate-pulse rounded-3xl"></div></div>
          ) : (
            <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 mt-4 md:mt-8">
              {merchant?.layout_style === 'classic' ? (
                // CLASSIC STYLE
                <div className="relative w-full rounded-[2rem] overflow-hidden bg-gray-900 flex flex-col items-center justify-center p-8 md:p-16 min-h-[300px] shadow-2xl text-center">
                  {merchant?.banner_url && (
                    <img src={merchant.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />
                  )}
                  {!merchant?.banner_url && (
                    <div className="absolute inset-0 theme-gradient opacity-20"></div>
                  )}
                  <div className="relative z-10 max-w-2xl text-white">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                      <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-4">
                        {merchant?.shop_name || "Bienvenue"}
                      </h2>
                      <p className="text-gray-200 text-sm md:text-lg mb-8 font-medium">
                        {merchant?.description || "Des produits d'exception, juste pour vous."}
                      </p>
                      <button 
                        onClick={() => window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 50, behavior: 'smooth' })}
                        className="theme-bg text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        Découvrir la collection <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  </div>
                </div>
              ) : merchant?.layout_style === 'minimalist' ? (
                // MINIMALIST STYLE
                <div className="relative w-full rounded-[2rem] overflow-hidden bg-white border-2 border-gray-100 flex flex-col md:flex-row items-center justify-between p-8 md:p-16 min-h-[350px]">
                  <div className="relative z-10 max-w-xl text-gray-900 text-left">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                      <h2 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-4">
                        <strong className="font-black">{merchant?.shop_name || "Bienvenue"}</strong>
                      </h2>
                      <p className="text-gray-500 text-sm md:text-base mb-8 max-w-sm leading-relaxed">
                        {merchant?.description || "L'élégance dans la simplicité."}
                      </p>
                      <button 
                        onClick={() => window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 50, behavior: 'smooth' })}
                        className="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-full text-sm font-bold hover:bg-gray-900 hover:text-white transition-colors inline-flex items-center gap-2"
                      >
                        Explorer <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  </div>
                  {merchant?.banner_url && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8 }}
                      className="mt-8 md:mt-0 w-full md:w-1/2 h-64 md:h-80 rounded-2xl overflow-hidden shadow-xl"
                    >
                      <img src={merchant.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    </motion.div>
                  )}
                </div>
              ) : (
                // MODERN STYLE (Default)
                <div className="relative w-full rounded-[2rem] overflow-hidden bg-gradient-to-br from-gray-900 to-[#003820] flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 md:p-12 min-h-[350px] shadow-2xl">
                  {merchant?.banner_url && (
                    <img src={merchant.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
                  )}
                  {/* Dynamic Slanted Background */}
                  <div className="absolute top-0 right-0 w-[120%] md:w-2/3 h-[150%] theme-gradient origin-bottom-right -rotate-12 translate-x-20 md:translate-x-10 translate-y-10 opacity-90 rounded-tl-[100px]"></div>
                  
                  {/* Magical Background Effects */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] rounded-full bg-white/5 blur-[100px] animate-aurora-1 mix-blend-screen"></div>
                  </div>

                  <div className="relative z-10 max-w-xl text-white text-center md:text-left mt-8 md:mt-0">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                      <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-none mb-4">
                        BOOSTEZ<br/><span className="text-white/80">VOTRE STYLE</span>
                      </h2>
                      <p className="text-gray-200 text-sm md:text-base mb-8 max-w-sm mx-auto md:mx-0 font-medium">
                        {merchant?.description || "Des équipements premium pour une expérience d'achat unique."}
                      </p>
                      <button 
                        onClick={() => window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 50, behavior: 'smooth' })}
                        className="bg-white theme-text px-8 py-3 rounded-full text-sm font-black hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto md:mx-0 shadow-lg"
                      >
                        Acheter maintenant <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  </div>

                  {!merchant?.banner_url && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
                      className="relative z-10 w-full md:w-1/2 h-56 sm:h-72 md:h-[400px] mt-10 md:mt-0 flex justify-center md:justify-end"
                    >
                      <motion.img 
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        src="/hero-ecommerce.jpg" 
                        alt="Hero" 
                        className="object-contain h-full w-full drop-shadow-[0_30px_30px_rgba(0,0,0,0.6)] scale-125 origin-center" 
                        onError={(e) => e.target.style.display = 'none'} 
                      />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SHOP SECTION */}
          <main id="shop-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            
            {/* SPORTECH-style Categories (Circular) */}
            <div className="flex items-start gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <button 
                onClick={() => setSelectedCategory('Tous')}
                className="flex flex-col items-center gap-2 min-w-[72px] group"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${selectedCategory === 'Tous' ? 'theme-bg text-white text-white scale-110 shadow-orange-500/30' : 'bg-gray-50 text-gray-700 group-hover:bg-gray-100'}`}>
                  <Grid className="w-6 h-6" />
                </div>
                <span className={`text-[11px] font-bold text-center ${selectedCategory === 'Tous' ? 'text-gray-900' : 'text-gray-500'}`}>Tous</span>
              </button>
              
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex flex-col items-center gap-2 min-w-[72px] group"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${selectedCategory === cat ? 'theme-bg text-white text-white scale-110 shadow-orange-500/30' : 'bg-gray-50 text-gray-700 group-hover:bg-gray-100'}`}>
                    {(() => {
                      const c = cat.toLowerCase();
                      if (c.includes('chaussure') || c.includes('sneaker')) return <Footprints className="w-6 h-6" />;
                      if (c.includes('vêtement') || c.includes('vetement') || c.includes('costume') || c.includes('t-shirt') || c.includes('robe') || c.includes('chemise')) return <Shirt className="w-6 h-6" />;
                      if (c.includes('montre') || c.includes('bijou')) return <Watch className="w-6 h-6" />;
                      if (c.includes('téléphone') || c.includes('smartphone') || c.includes('portable')) return <Smartphone className="w-6 h-6" />;
                      if (c.includes('ordi') || c.includes('laptop') || c.includes('pc')) return <Laptop className="w-6 h-6" />;
                      if (c.includes('audio') || c.includes('écouteur') || c.includes('ecouteur') || c.includes('casque')) return <Headphones className="w-6 h-6" />;
                      if (c.includes('sport')) return <Dumbbell className="w-6 h-6" />;
                      if (c.includes('meuble') || c.includes('maison')) return <Sofa className="w-6 h-6" />;
                      if (c.includes('nourriture') || c.includes('aliment')) return <Utensils className="w-6 h-6" />;
                      if (c.includes('sac')) return <ShoppingBag className="w-6 h-6" />;
                      return <Tag className="w-6 h-6" />;
                    })()}
                  </div>
                  <span className={`text-[11px] font-bold text-center line-clamp-1 ${selectedCategory === cat ? 'text-gray-900' : 'text-gray-500'}`}>{cat}</span>
                </button>
              ))}
            </div>

            {/* Filters (Pills) */}
            <div className="flex items-center gap-2 mt-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => setSortBy('newest')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${sortBy === 'newest' ? 'theme-bg text-white text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Nouveautés
              </button>
              <button onClick={() => setSortBy('price_asc')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${sortBy === 'price_asc' ? 'theme-bg text-white text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Moins chers
              </button>
              <button onClick={() => setSortBy('price_desc')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${sortBy === 'price_desc' ? 'theme-bg text-white text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Premium
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {[1,2,3,4,5,6,7,8].map(i => <ProductSkeleton key={i} />)}
              </div>
            ) : processedProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
                <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700">Aucun produit trouvé</h3>
                <p className="text-gray-500 mt-2">Essayez de modifier vos filtres ou de faire une autre recherche.</p>
                <button onClick={() => {setSearchQuery(''); setSelectedCategory('Tous');}} className="mt-6 theme-text font-bold hover:underline">
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-in fade-in duration-500">
                {processedProducts.map((p, index) => (
                  <ProductCard 
                    key={p.id} 
                    p={p} 
                    index={index}
                    favorites={favorites} 
                    toggleFavorite={toggleFavorite} 
                    setSelectedProduct={setSelectedProduct} 
                    addToCart={addToCart} 
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* FOOTER ULTRA-MODERN SPORTECH STYLE */}
      <footer className="bg-white pt-16 pb-32 md:pb-12 mt-12 border-t border-gray-100 relative overflow-hidden">
        {/* Soft geometric background elements */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 opacity-60 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gray-50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-80 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Section: Tagline & Icons */}
          <div className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-gray-300"></div>
              <div className="flex gap-4 text-gray-800">
                <Store className="w-6 h-6" />
                <Grid className="w-6 h-6" />
                <ShoppingCart className="w-6 h-6" />
                <Heart className="w-6 h-6" />
              </div>
              <div className="w-12 h-[1px] bg-gray-300"></div>
            </div>
            <h3 className="text-gray-500 font-bold tracking-[0.2em] text-xs uppercase mb-2">Plus qu'une simple boutique</h3>
            <h2 className="text-gray-900 font-black text-xl md:text-2xl tracking-tight uppercase">Une expérience d'achat inégalée</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-16">
            {/* Brand Column */}
            <div className="col-span-1 lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                {merchant?.logo_url ? (
                  <img src={merchant.logo_url} alt={merchant.shop_name} className="w-8 h-8 object-cover rounded-lg" />
                ) : (
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 theme-text" />
                  </div>
                )}
                <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase">{merchant?.shop_name}</h1>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
                Votre destination premium pour des produits de qualité, livrés rapidement et en toute sécurité.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:theme-text transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:theme-text transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Découvrir</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-500">
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Nouveautés</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Meilleures Ventes</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Promotions</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Cartes Cadeaux</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Service Client</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-500">
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Suivre ma commande</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Livraison & Retours</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Centre d'aide (FAQ)</a></li>
                <li><a href="#" className="hover:theme-text transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3 theme-text"/> Nous contacter</a></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Newsletter</h4>
              <p className="text-gray-500 text-sm mb-4 font-medium">Inscrivez-vous pour recevoir des offres exclusives et nos dernières actualités.</p>
              <form className="relative" onSubmit={e => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Votre email" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:theme-border focus:bg-white transition-all font-medium"
                />
                <button type="submit" className="absolute right-1 top-1 bottom-1 bg-gray-900 text-white px-4 rounded-lg font-bold text-xs hover:theme-bg text-white transition-colors">
                  OK
                </button>
              </form>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
              <span>Paiement sécurisé</span>
              <div className="flex gap-2">
                <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-600 font-bold tracking-wider">WAVE</div>
                <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[9px] text-gray-600 font-bold tracking-wider">OM</div>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs text-center md:text-left font-medium">
              © {new Date().getFullYear()} {merchant?.shop_name}. Tous droits réservés.
            </p>
            
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest">Propulsé par</span>
              <span className="font-black text-sm tracking-tight text-gray-900">SamaBoutik</span>
            </a>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button onClick={() => {setActiveTab('home'); window.scrollTo(0,0);}} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'home' ? 'theme-text scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
          <Store className={`w-6 h-6 ${activeTab === 'home' ? 'fill-orange-500' : ''}`} />
          <span className="text-[10px] font-bold">Accueil</span>
        </button>
        <button onClick={() => {setActiveTab('categories'); document.getElementById('shop-section').scrollIntoView();}} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'categories' ? 'theme-text scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
          <Grid className={`w-6 h-6 ${activeTab === 'categories' ? 'fill-orange-500' : ''}`} />
          <span className="text-[10px] font-bold">Catégories</span>
        </button>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 relative text-gray-400 group">
          <div className="w-14 h-14 theme-bg text-white text-white rounded-full flex items-center justify-center -mt-8 shadow-xl shadow-orange-500/30 relative border-4 border-white group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-6 h-6" />
            {cartItemsCount > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-gray-900 rounded-full border-2 border-white"></span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-900">Panier</span>
        </button>
        <button onClick={() => setActiveTab('favs')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'favs' ? 'theme-text scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
          <Heart className={`w-6 h-6 ${activeTab === 'favs' ? 'fill-orange-500 theme-text' : ''}`} />
          <span className="text-[10px] font-bold">Favoris</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'profile' ? 'theme-text scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
          <User className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-orange-500' : ''}`} />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>

      {/* PRODUCT QUICK VIEW MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedProduct(null)}></div>
          <div 
            className="bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-300"
          >
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full md:w-1/2 h-[35vh] md:h-auto bg-gray-100 relative flex flex-col shrink-0">
              <div className="flex-1 relative">
                  {modalMainImage ? (
                    <img src={modalMainImage} alt={selectedProduct.name} className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center absolute inset-0">
                      <ImageIcon className="w-20 h-20 text-gray-300" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="theme-bg text-white text-white px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">Top Vente</span>
                  </div>
                </div>
                {/* Thumbnails */}
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <div className="h-24 bg-white border-t border-gray-100 flex p-3 gap-3 overflow-x-auto">
                    <button 
                      onClick={() => setModalMainImage(selectedProduct.image_url)}
                      className={`h-full aspect-square rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${modalMainImage === selectedProduct.image_url ? 'theme-border' : 'border-transparent'}`}
                    >
                      <img src={selectedProduct.image_url} className="w-full h-full object-cover" alt="Main" />
                    </button>
                    {selectedProduct.images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setModalMainImage(img)}
                        className={`h-full aspect-square rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${modalMainImage === img ? 'theme-border' : 'border-transparent'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">{selectedProduct.category || 'Standard'}</p>
                <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedProduct.name}</h2>
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex theme-text">
                    <StarRating rating={productReviews.length > 0 ? (productReviews.reduce((a,b)=>a+b.rating,0)/productReviews.length) : 5} />
                  </div>
                  <span className="text-sm font-medium text-gray-500 text-underline">{productReviews.length} Avis</span>
                </div>
                
                <p className="text-3xl font-black text-gray-900 mb-6">{selectedProduct.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                
                <div className="prose prose-sm text-gray-500 mb-8 border-t border-b border-gray-100 py-6">
                  <p>{selectedProduct.description || "Un produit d'exception, conçu avec des matériaux de haute qualité pour garantir durabilité et style. Parfait pour toutes les occasions."}</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Disponible immédiatement</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Livraison sous 24h</li>
                  </ul>
                </div>

                {/* Avis Clients */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Avis Clients</h3>
                  {productReviews.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Aucun avis pour le moment.</p>
                  ) : (
                    <div className="space-y-4">
                      {productReviews.map(rev => (
                         <div key={rev.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <div className="flex items-center justify-between mb-2">
                             <span className="font-bold text-sm text-gray-900">{rev.customer_name || 'Client'}</span>
                             <StarRating rating={rev.rating} size={12} />
                           </div>
                           {rev.comment && <p className="text-sm text-gray-600">{rev.comment}</p>}
                         </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variantes Intelligentes (Tailles & Couleurs) */}
                {(() => {
                  const v = selectedProduct.variants;
                  const isObj = v && typeof v === 'object' && !Array.isArray(v);
                  const sizes = isObj ? (v.sizes || []) : (Array.isArray(v) ? v : []);
                  const colors = isObj ? (v.colors || []) : [];
                  
                  return (
                    <div className="mb-8 space-y-6">
                      {sizes.length > 0 && (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Taille</label>
                          <div className="flex flex-wrap gap-2">
                            {sizes.map(s => (
                              <button 
                                key={s}
                                onClick={() => setSelectedSize(s)}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                  selectedSize === s 
                                    ? 'border-black bg-black text-white' 
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-900'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {colors.length > 0 && (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Couleur</label>
                          <div className="flex flex-wrap gap-3">
                            {colors.map(c => (
                              <button 
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                title={c}
                                className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                                  selectedColor === c ? 'theme-border scale-110' : 'border-gray-200 hover:scale-105'
                                }`}
                                style={{ backgroundColor: c.toLowerCase() === 'noir' ? '#000' : c.toLowerCase() === 'blanc' ? '#fff' : c.toLowerCase() === 'gris' ? '#9ca3af' : c }}
                              >
                                {selectedColor === c && <CheckCircle className={`w-5 h-5 ${c.toLowerCase() === 'blanc' ? 'text-black' : 'text-white'}`} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Produits Similaires */}
                {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).length > 0 && (
                  <div className="mb-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Vous aimerez aussi</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                      {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4).map(sim => (
                        <div key={sim.id} onClick={() => setSelectedProduct(sim)} className="w-24 shrink-0 cursor-pointer group">
                          <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden mb-2">
                            {sim.image_url ? (
                              <img src={sim.image_url} alt={sim.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            ) : (
                              <Package className="w-full h-full p-6 text-gray-300" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate">{sim.name}</p>
                          <p className="text-[10px] theme-text font-black">{sim.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-4 pb-safe md:pb-0 flex gap-4">
                  <button 
                    onClick={() => addToCart(selectedProduct)}
                    disabled={selectedProduct.stock <= 0}
                    className="flex-1 theme-bg text-white text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:theme-bg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" /> Ajouter au panier
                  </button>
                  <button 
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="w-14 h-14 shrink-0 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-600 hover:border-black hover:text-black transition-colors"
                  >
                    <Heart className={`w-6 h-6 ${favorites.includes(selectedProduct.id) ? 'fill-red-500 text-red-500 border-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsCartOpen(false)} 
          />
          <div 
            className="absolute inset-y-0 right-0 max-w-md w-full flex bg-white shadow-2xl flex-col animate-in slide-in-from-right duration-300"
          >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Mon Panier
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {orderFinalized ? (
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center overflow-y-auto">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 border-4 border-green-100">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">C'est validé !</h3>
                  <p className="text-gray-500 mb-8">Votre commande a été préparée. Il ne vous reste plus qu'à confirmer l'envoi avec le marchand.</p>
                  
                  <div className="w-full bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total à payer</div>
                    <div className="text-4xl font-black text-black mb-6">{orderFinalized.total_amount_fcfa.toLocaleString('fr-FR')} FCFA</div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Code de Livraison</p>
                      <p className="text-3xl font-black text-black tracking-[0.3em]">{orderFinalized.delivery_pin}</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-3 uppercase">À donner uniquement contre le colis</p>
                    </div>
                  </div>

                  <a 
                    href={getWhatsAppCheckoutLink()} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-3 theme-bg text-white text-white py-5 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:theme-bg text-white hover:scale-[1.02] transition-all mb-3"
                  >
                    Confirmer via WhatsApp
                    <ChevronRight className="w-5 h-5" />
                  </a>

                  {orderFinalized.cart_items && orderFinalized.cart_items.length > 0 && (
                    <button 
                      onClick={() => {
                         setReviewData({...reviewData, product_id: orderFinalized.cart_items[0].product_id, customer_name: orderFinalized.customer_name});
                         setReviewModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      Donner un avis
                    </button>
                  )}
                </div>
              ) : Object.keys(cart).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Panier vide</h3>
                  <p className="text-gray-500 mb-8">Il est temps de remplir ce panier avec nos nouveautés !</p>
                  <button onClick={() => setIsCartOpen(false)} className="theme-bg text-white text-white px-8 py-4 hover:theme-bg text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
                    Découvrir la collection
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <ul className="space-y-6">
                      {Object.entries(cart).map(([cartKey, item]) => (
                        <li key={cartKey} className="flex gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="w-24 h-32 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                             {item.product.image_url ? 
                              <img src={item.product.image_url} alt="" loading="lazy" className="w-full h-full object-cover" /> :
                              <ImageIcon className="w-8 h-8 m-auto mt-12 text-gray-300" />
                             }
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                              <h4 className="font-bold text-gray-900 leading-tight">
                                {item.product.name}
                              </h4>
                              {item.variant && <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mt-1">Taille: {item.variant}</span>}
                              <p className="font-black text-gray-900 mt-2">{item.product.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
                                <button onClick={() => updateQuantity(cartKey, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-full font-bold transition-all">-</button>
                                <span className="font-bold text-sm w-8 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(cartKey, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-full font-bold transition-all">+</button>
                              </div>
                              <button onClick={() => updateQuantity(cartKey, -item.quantity)} className="text-xs font-bold text-red-500 uppercase tracking-wider hover:underline">Supprimer</button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Checkout Form */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                      <h3 className="font-black text-gray-900 mb-6 uppercase tracking-wider text-sm">Informations de Livraison</h3>
                      <form id="checkout-form" onSubmit={submitOrder} className="space-y-4">
                        <input required type="text" placeholder="Nom complet" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} />
                        <div className="relative">
                          <input required type="tel" placeholder="Téléphone (WhatsApp)" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 pl-12 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                          <Phone className="w-4 h-4 text-gray-400 absolute left-5 top-[18px]" />
                        </div>
                        <input required type="text" placeholder="Adresse complète" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                        <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none" value={checkoutData.zone} onChange={e => setCheckoutData({...checkoutData, zone: e.target.value})}>
                          {DELIVERY_ZONES.map(z => (
                            <option key={z.name} value={z.name}>{z.name} (+{z.price} FCFA)</option>
                          ))}
                        </select>
                        
                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Mode de Paiement</h4>
                          <div className="space-y-3">
                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${checkoutData.paymentMethod === 'ON_DELIVERY' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                              <input type="radio" name="paymentMethod" value="ON_DELIVERY" checked={checkoutData.paymentMethod === 'ON_DELIVERY'} onChange={() => setCheckoutData({...checkoutData, paymentMethod: 'ON_DELIVERY'})} className="hidden" />
                              <div className={`w-5 h-5 rounded-full border-2 flex flex-shrink-0 items-center justify-center ${checkoutData.paymentMethod === 'ON_DELIVERY' ? 'border-orange-500' : 'border-gray-300'}`}>
                                {checkoutData.paymentMethod === 'ON_DELIVERY' && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>}
                              </div>
                              <span className="font-bold text-gray-900 text-sm">Payer à la livraison</span>
                            </label>

                            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${checkoutData.paymentMethod === 'MOBILE_MONEY' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                              <input type="radio" name="paymentMethod" value="MOBILE_MONEY" checked={checkoutData.paymentMethod === 'MOBILE_MONEY'} onChange={() => setCheckoutData({...checkoutData, paymentMethod: 'MOBILE_MONEY'})} className="hidden" />
                              <div className={`w-5 h-5 rounded-full border-2 flex flex-shrink-0 items-center justify-center ${checkoutData.paymentMethod === 'MOBILE_MONEY' ? 'border-blue-500' : 'border-gray-300'}`}>
                                {checkoutData.paymentMethod === 'MOBILE_MONEY' && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm">Payer en ligne (Wave / Orange Money)</span>
                                <span className="text-[10px] text-gray-500 font-medium">Paiement 100% sécurisé</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Cart Footer */}
                  <div className="border-t border-gray-100 p-6 bg-gray-50">
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm font-medium text-gray-500">
                        <span>Sous-total</span>
                        <span className="text-gray-900">{getCartTotal().toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-gray-500">
                        <span>Livraison</span>
                        <span className="text-gray-900">{getDeliveryPrice().toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between items-end pt-4 mt-4 border-t border-gray-200">
                        <span className="font-bold text-gray-900 uppercase tracking-widest text-xs">Total</span>
                        <span className="text-3xl font-black text-black">
                          {(getCartTotal() + getDeliveryPrice()).toLocaleString('fr-FR')} <span className="text-xl">FCFA</span>
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      form="checkout-form"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 theme-bg text-white text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:theme-bg text-white hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-black/20"
                    >
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Commander"}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">Paiement 100% sécurisé à la livraison</p>
                  </div>
                </>
              )}
          </div>
        </div>
      )}

      {/* FLOATING WHATSAPP BUTTON */}
      {merchant?.phone_number && (
        <a 
          href={`https://wa.me/${merchant.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent("Bonjour, j'ai une question concernant votre boutique.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform group"
        >
          <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <svg className="w-8 h-8 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.425-10.416c-4.289 0-7.774 3.486-7.776 7.774-.001 1.368.358 2.705 1.042 3.882l-1.107 4.041 4.135-1.085c1.135.619 2.417.945 3.704.945h.003c4.286 0 7.772-3.485 7.774-7.774.002-4.288-3.485-7.783-7.775-7.783z"/></svg>
        </a>
      )}

      {/* REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-md relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              
              <h2 className="text-2xl font-black text-gray-900 mb-2">Votre avis compte</h2>
              <p className="text-gray-500 text-sm mb-6">Comment s'est passée votre expérience avec ce produit ?</p>
              
              <form onSubmit={submitReview} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <StarRating 
                     rating={reviewData.rating} 
                     size={32} 
                     interactive={true} 
                     onRate={(r) => setReviewData({...reviewData, rating: r})} 
                  />
                </div>
                
                <input 
                  type="text" 
                  placeholder="Votre prénom" 
                  required
                  value={reviewData.customer_name}
                  onChange={(e) => setReviewData({...reviewData, customer_name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-black focus:ring-1 outline-none"
                />
                
                <textarea 
                  placeholder="Écrivez votre commentaire (optionnel)" 
                  rows={4}
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-black focus:ring-1 outline-none resize-none"
                />
                
                <button 
                  type="submit" 
                  disabled={reviewSubmitting}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Envoi...' : 'Envoyer mon avis'}
                </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
