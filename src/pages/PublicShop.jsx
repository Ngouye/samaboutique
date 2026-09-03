import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, X, CheckCircle, Image as ImageIcon, MapPin, 
  Phone, ChevronRight, ArrowRight, Search, Package, Heart, Star, 
  TrendingUp, Truck, ShieldCheck, Zap, Menu, User, Grid, Store
} from 'lucide-react';
import { SHOP_CATEGORIES } from '../utils/categories';
import ProductCard from '../components/ProductCard';

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
  const [productVariants, setProductVariants] = useState({});
  
  // UI States
  const [selectedProduct, setSelectedProduct] = useState(null); // Pour le Quick View Modal
  const [toastMessage, setToastMessage] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // home, categories, cart, profile
  
  // Checkout States
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '', zone: DELIVERY_ZONES[0].name });
  const [orderFinalized, setOrderFinalized] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchShopData();
    // Charger les favoris depuis le localStorage
    const savedFavs = localStorage.getItem(`favs_${shopName}`);
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, [shopName]);

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

  const addToCart = (product, variantOverride = null) => {
    let variantStr = variantOverride;
    
    if (!variantStr) {
      const selections = productVariants[product.id] || {};
      const selectedParts = [];
      
      // Auto-select first option for comma-separated features if not selected
      if (product.variants) {
        product.variants.forEach(vString => {
          if (vString.includes(':')) {
            const parts = vString.split(':');
            const key = parts[0].trim();
            const vals = parts.slice(1).join(':').trim();
            if (vals.includes(',')) {
              const firstOpt = vals.split(',')[0].trim();
              selectedParts.push(`${key}: ${selections[key] || firstOpt}`);
            }
          } else if (vString.includes(',')) {
             const firstOpt = vString.split(',')[0].trim();
             selectedParts.push(selections['Variante'] || firstOpt);
          }
        });
      }
      variantStr = selectedParts.join(' | ');
    }

    const cartKey = variantStr ? `${product.id}-${variantStr}` : product.id;

    setCart(prev => ({
      ...prev,
      [cartKey]: {
        product,
        variant: variantStr,
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

  const submitOrder = async (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) return;
    
    setIsSubmitting(true);
    try {
      const totalAmount = getCartTotal() + getDeliveryPrice();
      const pinCode = Math.floor(1000 + Math.random() * 9000).toString();

      const cartItemsArray = Object.values(cart).map(item => ({
        product_id: item.product.id,
        name: item.variant ? `${item.product.name} (${item.variant})` : item.product.name,
        price: item.product.price_fcfa,
        quantity: item.quantity
      }));

      const { data, error } = await supabase.from('orders').insert([{
        merchant_id: merchant.id,
        customer_name: checkoutData.name,
        customer_phone: checkoutData.phone,
        customer_address: checkoutData.address,
        delivery_zone: checkoutData.zone,
        total_amount_fcfa: totalAmount,
        cart_items: cartItemsArray,
        delivery_pin: pinCode,
        status: 'PENDING'
      }]).select().single();

      if (error) throw error;
      
      setOrderFinalized(data);
      setCart({});
    } catch (err) {
      alert("Erreur lors de la validation de la commande");
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

  // Filtrage & Tri
  const activeCategoryNames = [...new Set(products.map(p => p.category || 'Autres'))];
  const activeCategories = SHOP_CATEGORIES.filter(c => activeCategoryNames.includes(c.name));
  
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
        <Link to="/" className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl block hover:bg-indigo-700 transition-colors">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );

  if (merchant?.subscription_status === 'expired') return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm w-full mx-4 border border-gray-100">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Boutique en pause</h2>
        <p className="text-gray-500 mb-6">Cette boutique est momentanément indisponible. Veuillez repasser plus tard.</p>
        <a href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700">
          Créer ma propre boutique <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );

  const themeColor = merchant?.theme_color || '#000000'; // Par défaut noir et blanc pour le style minimaliste premium

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 pb-20 md:pb-0 relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER DESKTOP & MOBILE TOP */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter" style={{ color: themeColor }}>
              {merchant?.shop_name.toUpperCase()}
            </h1>
          </div>
          
          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => {
                setSelectedCategory('Tous');
                window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 100, behavior: 'smooth' });
              }}
              className={`text-sm font-semibold uppercase tracking-widest transition-colors ${selectedCategory === 'Tous' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}
            >
              Tous
            </button>
            {activeCategories.slice(0, 3).map(cat => (
              <button 
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 100, behavior: 'smooth' });
                }}
                className={`text-sm font-semibold uppercase tracking-widest transition-colors ${selectedCategory === cat.name ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative group">
              <input 
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-100 border-transparent rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:w-64 transition-all duration-300 focus:bg-white focus:border-gray-300 outline-none"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-4 top-2.5" />
            </div>
            
            <button className="hidden md:flex relative p-2 text-gray-600 hover:text-black transition-colors">
              <Heart className="h-6 w-6" />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-900 transition-colors hover:opacity-70 flex items-center gap-2"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION MODERN */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 mt-6"><div className="w-full h-[60vh] bg-gray-200 animate-pulse rounded-3xl"></div></div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8 relative z-10">
          <div className="relative w-full h-[50vh] md:h-[70vh] rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-gray-900 flex items-center">
            {/* Image de fond abstraite ou image de la boutique */}
            <div className="absolute inset-0 opacity-40">
              <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000" alt="Cover" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
            
            <div className="relative z-10 p-8 md:p-16 max-w-2xl text-white">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-block py-1 px-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-widest mb-6">
                  Nouvelle Collection
                </span>
                <h2 className="text-5xl md:text-7xl font-black leading-[1.1] mb-6 tracking-tighter">
                  Le Style <br /> <span className="font-serif italic font-light text-gray-300">Réinventé.</span>
                </h2>
                <p className="text-gray-300 text-lg md:text-xl mb-8 font-light max-w-md">
                  {merchant.description || "Découvrez notre dernière sélection de produits tendance, pensés pour vous."}
                </p>
                <button 
                  onClick={() => window.scrollTo({ top: document.getElementById('shop-section').offsetTop - 100, behavior: 'smooth' })}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-wide hover:scale-105 transition-transform flex items-center gap-2"
                >
                  Découvrir <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </div>
          
          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 py-8 border-b border-gray-200">
            <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left justify-center md:justify-start">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Truck className="w-5 h-5 text-black" /></div>
              <div><p className="font-bold text-sm">Livraison Rapide</p><p className="text-xs text-gray-500 hidden md:block">Partout au Sénégal</p></div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left justify-center md:justify-center border-l border-r border-gray-200">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-black" /></div>
              <div><p className="font-bold text-sm">Paiement Sécurisé</p><p className="text-xs text-gray-500 hidden md:block">À la livraison</p></div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left justify-center md:justify-end">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Zap className="w-5 h-5 text-black" /></div>
              <div><p className="font-bold text-sm">Qualité Garantie</p><p className="text-xs text-gray-500 hidden md:block">Satisfait ou remboursé</p></div>
            </div>
          </div>
        </div>
      )}

      {/* SHOP SECTION */}
      <main id="shop-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            Notre Catalogue <span className="text-gray-400 font-medium text-lg">({processedProducts.length})</span>
          </h2>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {/* Mobile Category Select */}
            <select 
              className="md:hidden bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium outline-none"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="Tous">Tous les produits</option>
              {activeCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            
            <select 
              className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium outline-none shrink-0"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Trier par: Nouveautés</option>
              <option value="price_asc">Prix: Croissant</option>
              <option value="price_desc">Prix: Décroissant</option>
            </select>
          </div>
        </div>

        {/* Modern Categories Marquee */}
        <div className="mb-12 overflow-hidden relative w-full max-w-full rounded-[1.5rem]">
          <div className="absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#f8f9fa] to-transparent z-20 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-[#f8f9fa] to-transparent z-20 pointer-events-none"></div>
          
          <div className="flex animate-marquee hover:[animation-play-state:paused] w-max py-2">
            {[1, 2].map((setIndex) => (
              <div key={setIndex} className="flex items-center gap-4 pr-4 shrink-0" aria-hidden={setIndex === 2 ? "true" : undefined}>
                <button 
                  onClick={() => setSelectedCategory('Tous')}
                  className={`flex items-center gap-2 px-6 py-4 rounded-[1.5rem] font-bold transition-all shrink-0 ${selectedCategory === 'Tous' ? 'bg-black text-white shadow-xl scale-105' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:scale-105'}`}
                >
                  <Grid className="w-5 h-5" /> Tous les produits
                </button>
                
                {SHOP_CATEGORIES.map(cat => {
                   const count = products.filter(p => (p.category || 'Autres') === cat.name).length;
                   if (count === 0) return null;

                   const Icon = cat.icon;
                   const isSelected = selectedCategory === cat.name;

                   return (
                     <button 
                       key={`${setIndex}-${cat.id}`}
                       onClick={() => setSelectedCategory(cat.name)}
                       className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] font-bold transition-all relative overflow-hidden group border shrink-0 ${isSelected ? 'border-transparent text-white shadow-xl scale-105' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50 hover:scale-105'}`}
                     >
                       {isSelected && <div className={`absolute inset-0 bg-gradient-to-r ${cat.color} opacity-100`}></div>}
                       <div className="relative z-10 flex items-center gap-3">
                         <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} /> 
                         <span>{cat.name}</span>
                         <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>{count}</span>
                       </div>
                     </button>
                   )
                })}
              </div>
            ))}
          </div>
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
            <button onClick={() => {setSearchQuery(''); setSelectedCategory('Tous');}} className="mt-6 text-indigo-600 font-bold hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {selectedCategory === 'Tous' ? (
               activeCategories.map(cat => {
                 const catProducts = processedProducts.filter(p => (p.category || 'Autres') === cat.name);
                 if (catProducts.length === 0) return null;
                 const Icon = cat.icon;
                 return (
                   <div key={cat.id} className="space-y-6">
                     <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
                       <div className={`p-4 rounded-[1.2rem] bg-gradient-to-br ${cat.color} text-white shadow-lg`}>
                         <Icon className="w-7 h-7" />
                       </div>
                       <div>
                         <h3 className="text-2xl font-black text-gray-900 leading-tight">{cat.name}</h3>
                         <span className="text-sm font-bold text-gray-500">{catProducts.length} produits</span>
                       </div>
                     </div>
                     <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                       <AnimatePresence>
                         {catProducts.map(p => (
                            <ProductCard key={p.id} p={p} toggleFavorite={toggleFavorite} favorites={favorites} setSelectedProduct={setSelectedProduct} addToCart={addToCart} />
                         ))}
                       </AnimatePresence>
                     </motion.div>
                   </div>
                 )
               })
            ) : (
               <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                 <AnimatePresence>
                   {processedProducts.map(p => (
                      <ProductCard key={p.id} p={p} toggleFavorite={toggleFavorite} favorites={favorites} setSelectedProduct={setSelectedProduct} addToCart={addToCart} />
                   ))}
                 </AnimatePresence>
               </motion.div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER ULTRA-MODERN */}
      <footer className="bg-gray-950 text-white pt-20 pb-32 md:pb-12 mt-20 rounded-t-[3rem] relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            
            {/* Brand Column */}
            <div className="col-span-1 lg:col-span-1">
              <h1 className="text-3xl font-black tracking-tighter mb-6 text-white">{merchant?.shop_name.toUpperCase()}</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                L'expérience e-commerce réinventée. Qualité premium, livraison ultra-rapide et paiement sécurisé.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white hover:text-black transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white hover:text-black transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white hover:text-black transition-all hover:scale-110">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Découvrir</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Nouveautés</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Meilleures Ventes</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Promotions</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Cartes Cadeaux</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Service Client</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Suivre ma commande</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Livraison & Retours</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Centre d'aide (FAQ)</a></li>
                <li><a href="#" className="hover:text-white transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3"/> Nous contacter</a></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Newsletter</h4>
              <p className="text-gray-400 text-sm mb-4">Inscrivez-vous pour recevoir des offres exclusives et nos dernières actualités.</p>
              <form className="relative" onSubmit={e => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Votre adresse email" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
                <button type="submit" className="absolute right-2 top-2 bottom-2 bg-white text-black px-4 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors">
                  S'INSCRIRE
                </button>
              </form>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span>Paiement sécurisé</span>
              <div className="flex gap-2">
                <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold">WAVE</div>
                <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold">OM</div>
                <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-bold">CASH</div>
              </div>
            </div>
            
            <p className="text-gray-500 text-xs text-center md:text-left">
              © {new Date().getFullYear()} {merchant?.shop_name}. Tous droits réservés.
            </p>
            
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
              <span className="text-xs">Propulsé par</span>
              <span className="font-black text-sm tracking-tight text-white">SamaBoutik</span>
            </a>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 px-6 py-4 flex justify-between items-center z-40 pb-safe">
        <button onClick={() => {setActiveTab('home'); window.scrollTo(0,0);}} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-black' : 'text-gray-400'}`}>
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-bold">Accueil</span>
        </button>
        <button onClick={() => {setActiveTab('search'); document.getElementById('shop-section').scrollIntoView();}} className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-black' : 'text-gray-400'}`}>
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">Recherche</span>
        </button>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 relative text-gray-400">
          <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center -mt-6 shadow-xl shadow-black/20 relative border-4 border-[#F8F9FA]">
            <ShoppingCart className="w-5 h-5" />
            {cartItemsCount > 0 && (
              <span className="absolute 0 top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-black"></span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 text-black">Panier</span>
        </button>
        <button onClick={() => setActiveTab('favs')} className={`flex flex-col items-center gap-1 ${activeTab === 'favs' ? 'text-black' : 'text-gray-400'}`}>
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Favoris</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-black' : 'text-gray-400'}`}>
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>

      {/* PRODUCT QUICK VIEW MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="bg-white w-full h-full sm:h-auto max-w-4xl max-h-[100vh] sm:max-h-[90vh] rounded-none sm:rounded-[2rem] shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden"
            >
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-full md:w-1/2 h-[40vh] md:h-auto bg-gray-100 relative">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-20 h-20 text-gray-300" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-black text-white px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">Top Vente</span>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">{selectedProduct.category || 'Standard'}</p>
                <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedProduct.name}</h2>
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex text-black"><Star className="w-4 h-4 fill-black"/><Star className="w-4 h-4 fill-black"/><Star className="w-4 h-4 fill-black"/><Star className="w-4 h-4 fill-black"/><Star className="w-4 h-4 fill-black"/></div>
                  <span className="text-sm font-medium text-gray-500 text-underline">12 Avis</span>
                </div>
                
                <p className="text-3xl font-black text-gray-900 mb-6">{(selectedProduct.price_fcfa || 0).toLocaleString('fr-FR')} FCFA</p>
                
                <div className="prose prose-sm text-gray-500 mb-8 border-t border-b border-gray-100 py-6">
                  <p>{selectedProduct.description || "Un produit d'exception, conçu avec des matériaux de haute qualité pour garantir durabilité et style. Parfait pour toutes les occasions."}</p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Disponible immédiatement</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Livraison sous 24h</li>
                  </ul>
                </div>

                {/* Fiche Technique & Variantes */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="mb-8">
                    <h3 className="block text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Fiche Technique</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedProduct.variants.map((vString, idx) => {
                        let key = `Spécification ${idx + 1}`;
                        let valsStr = vString;
                        if (vString.includes(':')) {
                          const parts = vString.split(':');
                          key = parts[0].trim();
                          valsStr = parts.slice(1).join(':').trim();
                        }

                        const hasOptions = valsStr.includes(',');
                        const options = valsStr.split(',').map(v => v.trim()).filter(v => v);

                        return (
                          <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">{key}</label>
                            {hasOptions ? (
                              <div className="flex flex-wrap gap-2">
                                {options.map(opt => {
                                  const currentSelections = productVariants[selectedProduct.id] || {};
                                  const isSelected = (currentSelections[key] || options[0]) === opt;
                                  return (
                                    <button 
                                      key={opt}
                                      onClick={() => setProductVariants({
                                        ...productVariants, 
                                        [selectedProduct.id]: { ...currentSelections, [key]: opt }
                                      })}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                        isSelected 
                                          ? 'border-black bg-black text-white' 
                                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-900'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="font-bold text-gray-900 text-sm">
                                {valsStr}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="mt-auto pt-4 flex gap-4">
                  <button 
                    onClick={() => addToCart(selectedProduct)}
                    disabled={selectedProduct.stock <= 0}
                    className="flex-1 bg-black text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" /> Ajouter au panier
                  </button>
                  <button 
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="w-14 h-14 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-600 hover:border-black hover:text-black transition-colors"
                  >
                    <Heart className={`w-6 h-6 ${favorites.includes(selectedProduct.id) ? 'fill-red-500 text-red-500 border-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsCartOpen(false)} 
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="absolute inset-y-0 right-0 max-w-md w-full flex bg-white shadow-2xl flex-col"
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
                    className="w-full flex items-center justify-center gap-3 bg-black text-white py-5 px-6 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 hover:scale-[1.02] transition-all"
                  >
                    Confirmer via WhatsApp
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>
              ) : Object.keys(cart).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Panier vide</h3>
                  <p className="text-gray-500 mb-8">Il est temps de remplir ce panier avec nos nouveautés !</p>
                  <button onClick={() => setIsCartOpen(false)} className="bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform">
                    Découvrir la collection
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <ul className="space-y-6">
                      <AnimatePresence>
                        {Object.entries(cart).map(([cartKey, item]) => (
                          <motion.li layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={cartKey} className="flex gap-4">
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
                                {item.variant && <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mt-1 leading-tight">{item.variant}</span>}
                                <p className="font-black text-gray-900 mt-2">{(item.product.price_fcfa || 0).toLocaleString('fr-FR')} FCFA</p>
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
                          </motion.li>
                        ))}
                      </AnimatePresence>
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
                      className="w-full flex items-center justify-center gap-2 bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-black/20"
                    >
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Commander"}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">Paiement 100% sécurisé à la livraison</p>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
