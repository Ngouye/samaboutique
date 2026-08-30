import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShoppingCart, Store, X, CheckCircle, Image as ImageIcon, MapPin, Phone, CreditCard, ChevronRight, ArrowRight, Search, Package } from 'lucide-react';

const DELIVERY_ZONES = [
  { name: 'Dakar Plateau / Medina', price: 1000 },
  { name: 'Point E / Fann / Almadies', price: 1500 },
  { name: 'Ouakam / Mamelles', price: 1500 },
  { name: 'Yoff / Parcelles Assainies', price: 2000 },
  { name: 'Pikine / Guédiawaye', price: 2500 },
  { name: 'Rufisque / Keur Massar', price: 3000 },
];

export default function PublicShop() {
  const { shopName } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '', zone: DELIVERY_ZONES[0].name });
  const [orderFinalized, setOrderFinalized] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nouvelles fonctionnalités
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [productVariants, setProductVariants] = useState({});

  useEffect(() => {
    fetchShopData();
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
      const { data: pData } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', mData.id)
        .order('created_at', { ascending: false });
        
      if (pData) setProducts(pData);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    const variant = productVariants[product.id] || (product.variants?.[0]) || '';
    const cartKey = variant ? `${product.id}-${variant}` : product.id;

    setCart(prev => ({
      ...prev,
      [cartKey]: {
        product,
        variant,
        quantity: (prev[cartKey]?.quantity || 0) + 1
      }
    }));
    setIsCartOpen(true);
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

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => total + (item.product.price_fcfa * item.quantity), 0);
  };

  const getDeliveryPrice = () => {
    const zone = DELIVERY_ZONES.find(z => z.name === checkoutData.zone);
    return zone ? zone.price : 0;
  };

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

  if (loading) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-600 border-solid mb-4"></div>
      <p className="text-gray-500 font-medium tracking-wide">Chargement de la vitrine...</p>
    </div>
  );
  
  if (!merchant) return (
    <div className="min-h-screen flex justify-center items-center bg-white">
      <div className="text-center">
        <img src="/logo.jpg" alt="Logo" className="w-24 h-24 mx-auto mb-4 mix-blend-multiply opacity-50" />
        <h2 className="text-2xl font-bold text-gray-700">Boutique introuvable</h2>
        <p className="text-gray-500">L'URL semble incorrecte.</p>
      </div>
    </div>
  );

  const cartItemsCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  const themeColor = merchant?.theme_color || '#4F46E5';

  const categories = ['Tous', ...new Set(products.map(p => p.category || 'Autres'))];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || (p.category || 'Autres') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-mesh font-sans text-gray-800 pb-20 relative overflow-hidden">
      {/* Background Decoratives (Aurora) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-2"></div>
      <div className="absolute top-[60%] left-[10%] w-[30%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none animate-aurora-1" style={{animationDelay: '2s'}}></div>

      {/* Header Minimaliste */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {merchant.shop_name.split(' ').map((word, idx) => 
                idx === 0 ? <span key={idx} style={{ color: themeColor }}>{word} </span> : <span key={idx}>{word} </span>
              )}
            </h1>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
             <input 
               type="text"
               placeholder="Rechercher des produits..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#4F46E5] outline-none"
             />
             <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3" />
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 p-2 text-gray-600 transition-colors hover:opacity-80"
          >
            <ShoppingCart className="h-6 w-6" />
            {cartItemsCount > 0 && (
              <span 
                style={{ backgroundColor: themeColor }}
                className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center"
              >
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Banner Fashion */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
        <div className="bg-white/60 backdrop-blur-2xl border border-white shadow-2xl shadow-indigo-900/10 rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row items-center justify-between p-10 md:p-20 relative">
          <div className="flex-1 md:pr-12 relative z-10 text-center md:text-left">
            <p style={{ color: themeColor }} className="font-semibold text-sm mb-4 tracking-wider uppercase">Le Meilleur de la Tendance</p>
            <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight mb-6">
              Nouvelle <span className="font-serif italic" style={{ color: themeColor }}>Collection</span> Pour <br/>
              <span className="font-bold">Tous Vos Besoins</span>
            </h2>
            <p className="text-gray-500 max-w-md mx-auto md:mx-0 mb-8 text-sm leading-relaxed">
              {merchant.description || "Vêtements, chaussures, accessoires et dernières technologies. Commandez facilement en ligne et payez à la livraison en toute sécurité."}
            </p>
            <button 
              onClick={() => window.scrollTo({ top: document.getElementById('products-section').offsetTop - 100, behavior: 'smooth' })}
              style={{ backgroundColor: themeColor }}
              className="text-white px-8 py-3.5 rounded-full font-bold text-sm transition-colors shadow-lg shadow-indigo-500/30 hover:opacity-90"
            >
              VOIR LA BOUTIQUE
            </button>
          </div>
          
          <div className="flex-1 w-full mt-12 md:mt-0 relative hidden md:flex justify-center items-center">
             {/* Composition of floating elements */}
             <div className="relative w-72 h-80">
               {/* Element 1: Main central card */}
               <div 
                 style={{ background: `linear-gradient(to top right, ${themeColor}, #818cf8)` }}
                 className="absolute inset-0 rounded-[2rem] shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 flex flex-col items-center justify-center text-white overflow-hidden border-4 border-white/20"
               >
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                 <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
                 <ShoppingCart className="w-20 h-20 mb-4 text-white drop-shadow-md" />
                 <span className="font-bold text-2xl tracking-wider uppercase text-white drop-shadow-md">{merchant.shop_name}</span>
                 <span className="text-indigo-100 text-sm mt-1 font-medium bg-white/10 px-4 py-1 rounded-full backdrop-blur-md">Shopping en ligne</span>
               </div>
               
               {/* Element 2: Floating price tag / badge */}
               <div className="absolute -top-6 -right-6 bg-white p-3.5 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                     <CheckCircle className="w-5 h-5 text-amber-600" />
                   </div>
                   <div className="pr-2">
                     <p className="text-xs text-gray-500 font-medium leading-tight">Qualité</p>
                     <p className="text-sm font-bold text-gray-900 leading-tight">Garantie</p>
                   </div>
                 </div>
               </div>

               {/* Element 3: Floating discount / alert */}
               <div className="absolute -bottom-6 -left-6 bg-white p-3.5 rounded-2xl shadow-xl animate-pulse" style={{ animationDuration: '4s' }}>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                     <Package className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div className="pr-2">
                     <p className="text-sm font-bold text-gray-900 leading-tight">Livraison</p>
                     <p className="text-xs text-emerald-600 font-bold leading-tight">Rapide & Sûre</p>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main content - Product Grid */}
      <main id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Categories Header */}
        <div className="flex flex-col items-center mb-12 text-center">
          <p className="text-[#4F46E5] text-sm font-semibold mb-2 uppercase tracking-wide">Nos Rayons</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Explorer par Catégorie</h2>
          
          <div className="flex items-center gap-8 overflow-x-auto w-full justify-start md:justify-center pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap pb-2 text-sm sm:text-base font-medium transition-colors border-b-2 ${
                  selectedCategory === cat 
                    ? 'border-[#4F46E5] text-[#4F46E5]' 
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-16 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700">Aucun produit</h3>
            <p className="text-gray-500 mt-2">Le catalogue est en cours de mise à jour.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white rounded-[1.5rem] p-3 sm:p-4 flex flex-col group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-gray-100">
                
                {/* Image */}
                <div className="relative aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden mb-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  {p.stock <= 0 && (
                    <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-0.5 text-[10px] font-bold rounded uppercase">
                      Épuisé
                    </div>
                  )}
                  {p.stock > 0 && (
                    <div className="absolute top-2 left-2 bg-[#4F46E5] text-white px-2 py-0.5 text-[10px] font-bold rounded uppercase shadow-sm">
                      Nouveau
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-tight mb-1 line-clamp-1">{p.name}</h3>
                  
                  {/* Fake Stars */}
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <svg key={star} className={`w-2.5 h-2.5 ${star === 5 ? 'text-gray-300' : 'text-yellow-400'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <p className="font-bold text-gray-900 text-sm sm:text-base">{p.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                    <p className="text-gray-400 line-through text-[10px] sm:text-xs font-medium">
                      {Math.round(p.price_fcfa * 1.15).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  {p.variants && p.variants.length > 0 && (
                    <div className="w-full mb-4">
                      <select 
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                        value={productVariants[p.id] || p.variants[0]}
                        onChange={(e) => setProductVariants({...productVariants, [p.id]: e.target.value})}
                      >
                        {p.variants.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button 
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="w-full bg-[#4F46E5] text-white font-bold py-2 rounded-xl text-[11px] sm:text-xs hover:bg-[#4338CA] transition-colors disabled:opacity-50 mt-auto shadow-md shadow-indigo-500/20 tracking-wide"
                  >
                    AJOUTER AU PANIER
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer "Propulsé par SamaBoutik" */}
      <footer className="mt-12 py-8 text-center border-t border-gray-100 bg-white">
        <p className="text-gray-400 text-sm font-medium mb-3">Boutique en ligne sécurisée</p>
        <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full hover:bg-gray-100 hover:shadow-sm transition-all group">
          <span className="text-gray-500 text-sm">Propulsé par</span>
          <span className="font-black text-gray-900 tracking-tight group-hover:text-[#4F46E5] transition-colors">SamaBoutik</span>
          <span className="text-[#4F46E5] text-[10px] font-bold uppercase bg-indigo-100 px-2 py-0.5 rounded-full">Gratuit</span>
        </a>
      </footer>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-teal-950/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full flex transform transition-transform duration-300">
            <div className="w-full h-full bg-white/95 backdrop-blur-2xl shadow-2xl flex flex-col border-l border-white/50">
              
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-teal-900">Mon Panier</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:text-teal-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {orderFinalized ? (
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-teal-900 mb-3">Commande validée</h3>
                  <p className="text-gray-600 mb-8">Votre commande a été enregistrée avec succès. Confirmez maintenant l'envoi avec le marchand via WhatsApp.</p>
                  
                  <div className="w-full bg-gray-50 p-6 rounded-2xl mb-8">
                    <div className="text-sm text-gray-500 mb-1">Total à payer à la livraison</div>
                    <div className="text-3xl font-black text-teal-900 mb-4">{orderFinalized.total_amount_fcfa.toLocaleString('fr-FR')} FCFA</div>
                    
                    <div className="bg-orange-100 p-4 rounded-xl border border-orange-200">
                      <p className="text-xs font-bold text-orange-800 uppercase mb-1">Code Secret de Livraison</p>
                      <p className="text-2xl font-black text-orange-900 tracking-[0.5em]">{orderFinalized.delivery_pin}</p>
                      <p className="text-xs text-orange-700 mt-2">À donner au livreur uniquement contre le colis.</p>
                    </div>
                  </div>

                  <a 
                    href={getWhatsAppCheckoutLink()} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#25D366] to-[#1ebd5a] shadow-lg shadow-[#25D366]/30 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:scale-[1.02] transition-all"
                  >
                    Confirmer sur WhatsApp
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>
              ) : Object.keys(cart).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-200 mb-6" />
                  <h3 className="text-xl font-bold text-teal-900 mb-2">Votre panier est vide</h3>
                  <p className="text-gray-500">Ajoutez des articles pour commencer.</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-8 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-full font-bold hover:bg-emerald-100 transition-colors">
                    Continuer mes achats
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6">
                    <ul className="space-y-6">
                      {Object.entries(cart).map(([cartKey, item]) => (
                        <li key={cartKey} className="flex items-center gap-4">
                          <div className="w-20 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                             {item.product.image_url ? 
                              <img src={item.product.image_url} alt="" loading="lazy" className="w-full h-full object-cover" /> :
                              <ImageIcon className="w-6 h-6 m-auto mt-8 text-gray-300" />
                             }
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col h-24 justify-between py-1">
                            <div>
                              <h4 className="font-bold text-teal-900 truncate">
                                {item.product.name}
                                {item.variant && <span className="text-gray-500 ml-1 text-sm block md:inline">({item.variant})</span>}
                              </h4>
                              <p className="text-gray-500 font-medium text-sm mt-1">{item.product.price_fcfa.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                                <button onClick={() => updateQuantity(cartKey, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-teal-900 font-medium">-</button>
                                <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(cartKey, 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-teal-900 font-medium">+</button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-10 pt-8 border-t border-gray-100">
                      <h3 className="font-bold text-teal-900 mb-6 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        Détails de livraison
                      </h3>
                      <form id="checkout-form" onSubmit={submitOrder} className="space-y-5">
                        <div>
                          <input required type="text" placeholder="Nom complet" className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3.5 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} />
                        </div>
                        <div>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input required type="tel" placeholder="Téléphone (WhatsApp)" className="w-full bg-gray-50 border-transparent rounded-xl pl-12 pr-4 py-3.5 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <input required type="text" placeholder="Adresse complète" className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3.5 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                        </div>
                        <div>
                          <select className="w-full bg-gray-50 border-transparent rounded-xl px-4 py-3.5 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all appearance-none font-medium text-gray-700" value={checkoutData.zone} onChange={e => setCheckoutData({...checkoutData, zone: e.target.value})}>
                            {DELIVERY_ZONES.map(z => (
                              <option key={z.name} value={z.name}>{z.name} (+{z.price} FCFA)</option>
                            ))}
                          </select>
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-6 bg-white">
                    <div className="space-y-3 mb-6 text-gray-500 text-sm">
                      <div className="flex justify-between">
                        <span>Sous-total</span>
                        <span className="font-medium text-teal-900">{getCartTotal().toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frais de livraison</span>
                        <span className="font-medium text-teal-900">{getDeliveryPrice().toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-100">
                      <span className="font-bold text-gray-500">Total</span>
                      <span className="text-2xl font-black text-teal-900">
                        {(getCartTotal() + getDeliveryPrice()).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <button 
                      type="submit" 
                      form="checkout-form"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>Valider la commande</>
                      )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-4 font-medium uppercase tracking-widest">Paiement à la livraison</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
