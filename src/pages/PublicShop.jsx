import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import confetti from 'canvas-confetti';
import SocialProofToast from '../components/SocialProofToast';
import StoreStories from '../components/StoreStories';
import { BlurWords } from '../components/landing/Magic';
import {
  Package, MapPin, Search, Store, Heart, Star, Plus, Minus, X, ArrowRight, ChevronRight,
  Phone, Mail, ShoppingBag, Truck, Eye, MessageCircle, Smartphone, Gamepad2, Laptop, Camera, Headphones, Shirt,
  Utensils, Tag, Watch, Footprints, Gem, Sparkles, Baby, Sofa, Dumbbell, BookOpen, Car, LayoutGrid, ClipboardCheck,
  PackageOpen, Bike, PartyPopper, Info, Lock, ShieldCheck, LocateFixed, House, Flame, Check, CircleCheck, CircleX,
  TriangleAlert, Music2, LoaderCircle, User, Send,
} from 'lucide-react';

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

const EASE = [0.16, 1, 0.3, 1];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const SORTS = [
  { id: 'newest', label: 'Nouveautés' },
  { id: 'price_asc', label: 'Prix ↑' },
  { id: 'price_desc', label: 'Prix ↓' },
];

const TRACK_STEPS = [
  { id: 'PENDING', label: 'Reçue', sub: 'Confirmation', icon: ClipboardCheck },
  { id: 'PREPARING', label: 'Préparation', sub: 'Emballage', icon: PackageOpen },
  { id: 'IN_TRANSIT', label: 'En route', sub: 'Vers vous', icon: Bike },
  { id: 'DELIVERED', label: 'Livrée', sub: 'Terminé', icon: PartyPopper },
];

// Icône adaptée au nom de la catégorie.
function categoryIcon(cat) {
  if (cat === 'Tous') return LayoutGrid;
  const c = cat.toLowerCase();
  const has = (...words) => words.some((w) => c.includes(w));
  if (has('chaussure', 'basket', 'sneaker', 'sandale')) return Footprints;
  if (has('bijou', 'bague', 'collier', 'or ')) return Gem;
  if (has('montre', 'watch')) return Watch;
  if (has('beauté', 'cosmét', 'parfum', 'maquillage', 'soin')) return Sparkles;
  if (has('vêtement', 'habit', 't-shirt', 'mode', 'chemise', 'robe', 'boubou', 'tissu', 'wax')) return Shirt;
  if (has('phone', 'téléphone', 'mobile')) return Smartphone;
  if (has('laptop', 'pc', 'ordinateur', 'mac', 'informatique')) return Laptop;
  if (has('audio', 'casque', 'écouteur', 'son')) return Headphones;
  if (has('camera', 'caméra', 'photo')) return Camera;
  if (has('console', 'jeu', 'game')) return Gamepad2;
  if (has('nourriture', 'aliment', 'food', 'restaurant', 'épicerie', 'cuisine')) return Utensils;
  if (has('bébé', 'enfant', 'jouet')) return Baby;
  if (has('maison', 'déco', 'meuble')) return Sofa;
  if (has('sport', 'fitness')) return Dumbbell;
  if (has('livre', 'papeterie')) return BookOpen;
  if (has('auto', 'voiture', 'moto')) return Car;
  if (has('accessoire', 'sac')) return ShoppingBag;
  return Tag;
}

/* ------------------------------------------------------------------ */
/* Petits composants                                                   */
/* ------------------------------------------------------------------ */

function FavoriteButton({ active, onToggle, className = '' }) {
  const [burst, setBurst] = useState(0);
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => { e.stopPropagation(); if (!active) setBurst((b) => b + 1); onToggle(); }}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur ${className}`}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={active}
    >
      <motion.span key={active ? 'on' : 'off'} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
        <Heart className={`h-4 w-4 ${active ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
      </motion.span>
      {active && burst > 0 && [...Array(6)].map((_, i) => (
        <motion.span
          key={`${burst}-${i}`}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-rose-400"
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 22, y: Math.sin((i / 6) * Math.PI * 2) * 22, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </motion.button>
  );
}

function ShopProductCard({ product, index, isNew, isFavorite, justAdded, onOpen, onAdd, onToggleFavorite }) {
  const out = typeof product.stock === 'number' && product.stock <= 0;
  const low = !out && typeof product.stock === 'number' && product.stock <= 5;
  const CatIcon = categoryIcon(product.category || 'Autres');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.08, ease: EASE }}
      className="group"
    >
      <Tilt
        tiltEnable={CAN_HOVER}
        tiltMaxAngleX={6}
        tiltMaxAngleY={6}
        glareEnable={CAN_HOVER}
        glareMaxOpacity={0.2}
        glareBorderRadius="1.5rem"
        scale={CAN_HOVER ? 1.02 : 1}
        transitionSpeed={1500}
        className="rounded-3xl"
      >
        <div
          onClick={onOpen}
          className="relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/70 transition-shadow duration-300 group-hover:shadow-[0_28px_60px_-24px_rgba(15,23,42,0.35)]"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} loading="lazy" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 ${out ? 'grayscale' : ''}`} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="theme-soft theme-text flex h-20 w-20 items-center justify-center rounded-3xl">
                  {React.createElement(CatIcon, { className: 'h-9 w-9', strokeWidth: 1.6 })}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {isNew && !out && (
                <span className="theme-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                  <Sparkles className="h-3 w-3" /> Nouveau
                </span>
              )}
              {low && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-md">
                  <Flame className="h-3 w-3" /> Plus que {product.stock}
                </span>
              )}
              {out && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                  <CircleX className="h-3 w-3" /> Épuisé
                </span>
              )}
            </div>
            <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} className="absolute right-3 top-3" />

            <span className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-2 rounded-2xl bg-white/95 py-2.5 text-sm font-bold text-slate-900 opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
              <Eye className="h-4 w-4" /> Aperçu rapide
            </span>
          </div>

          <div className="p-3.5 md:p-4">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">{product.category || 'Standard'}</p>
            <h4 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-slate-900 md:text-base">{product.name}</h4>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">
                {fmt(product.price_fcfa)} <span className="text-[11px] font-semibold text-slate-400">FCFA</span>
              </p>
              <motion.button
                whileTap={{ scale: 0.85 }}
                disabled={out}
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${justAdded ? 'bg-emerald-500' : 'theme-gradient theme-glow'}`}
                aria-label={`Ajouter ${product.name} au panier`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {justAdded ? (
                    <motion.span key="ok" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="add" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Plus className="h-5 w-5" strokeWidth={2.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
}

function SocialLinks({ links, dark = false }) {
  const items = [
    { key: 'facebook', label: 'Facebook', cls: 'bg-[#1877F2]', icon: <span className="text-base font-black">f</span> },
    { key: 'instagram', label: 'Instagram', cls: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600', icon: <Camera className="h-4 w-4" /> },
    { key: 'tiktok', label: 'TikTok', cls: dark ? 'bg-white/10' : 'bg-slate-900', icon: <Music2 className="h-4 w-4" /> },
  ].filter((s) => links?.[s.key]);
  if (!items.length) return null;
  return (
    <div className="flex gap-2">
      {items.map((s) => (
        <motion.a
          key={s.key}
          href={links[s.key]}
          target="_blank"
          rel="noreferrer"
          whileHover={{ y: -3, rotate: -6 }}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${s.cls}`}
          aria-label={s.label}
        >
          {s.icon}
        </motion.a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PublicShop() {
  const { shopName } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // E-commerce States
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
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

  // Suivi en direct : la table des commandes n'est plus lisible publiquement,
  // on redemande le statut toutes les 20 s avec le téléphone et le PIN déjà validés.
  const trackQueryRef = useRef(null);
  useEffect(() => {
    if (!trackResult?.id || !trackQueryRef.current) return undefined;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.rpc('track_order', {
        p_phone: trackQueryRef.current.phone,
        p_pin: trackQueryRef.current.pin
      });
      if (data?.ok) setTrackResult(data.order);
    }, 20000);
    return () => clearInterval(interval);
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

  // Célébration quand la commande est validée
  useEffect(() => {
    if (!orderFinalized?.id) return;
    confetti({ particleCount: 150, spread: 85, origin: { y: 0.55 }, colors: [merchant?.theme_color || '#059669', '#fbbf24', '#f472b6', '#ffffff'] });
  }, [orderFinalized?.id, merchant?.theme_color]);

  const fetchOrderData = async (orderId) => {
    const { data } = await supabase.rpc('get_order_receipt', { p_order_id: orderId });
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

  const quickAdd = (product) => {
    addToCart(product);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 1400);
  };

  const updateQuantity = (cartKey, delta) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (!newCart[cartKey]) return prev;

      newCart[cartKey] = { ...newCart[cartKey], quantity: newCart[cartKey].quantity + delta };
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
              cartItems: cartItemsArray
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
        const pinCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000);
        const { data, error } = await supabase.rpc('place_order', {
          p_merchant_id: merchant.id,
          p_customer_name: checkoutData.name,
          p_customer_phone: checkoutData.phone,
          p_customer_address: checkoutData.address + (checkoutData.gpsLocation ? ' || GPS: ' + checkoutData.gpsLocation : ''),
          p_delivery_zone: checkoutData.zone,
          p_cart_items: cartItemsArray,
          p_delivery_pin: pinCode
        });

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
      const { data: result, error } = await supabase.rpc('submit_review', {
        p_product_id: reviewData.product_id,
        p_rating: reviewData.rating,
        p_comment: reviewData.comment,
        p_customer_name: reviewData.customer_name || 'Client anonyme',
        p_order_id: orderFinalized?.id || null
      });
      if (error) throw error;
      if (!result?.ok) {
        alert(result?.error || "Erreur lors de l'envoi de l'avis");
        return;
      }
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
      const query = { phone: trackPhone.trim(), pin: trackPin.trim().toUpperCase() };
      const { data, error } = await supabase.rpc('track_order', { p_phone: query.phone, p_pin: query.pin });

      if (error) setTrackError('Erreur de connexion');
      else if (!data?.ok) setTrackError(data?.error || 'Commande introuvable ou code PIN incorrect');
      else {
        trackQueryRef.current = query;
        setTrackResult(data.order);
      }
    } catch {
      setTrackError('Erreur de connexion');
    }
    setTrackLoading(false);
  };

  // Navigation
  const goHome = () => { setActiveTab('home'); setShowFavoritesOnly(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goToCatalog = () => {
    setActiveTab('home');
    setTimeout(() => document.getElementById('shop-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const openTab = (tab) => { setActiveTab(tab); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleFavoritesView = () => { setShowFavoritesOnly((v) => !v); goToCatalog(); };
  const trackFinalizedOrder = () => {
    setTrackPhone(orderFinalized.customer_phone);
    setTrackPin(orderFinalized.delivery_pin);
    setOrderFinalized(null);
    setIsCartOpen(false);
    openTab('order-tracking');
  };

  // Filtrage
  const categories = ['Tous', ...new Set(products.map(p => p.category || 'Autres'))];
  let processedProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'Tous' || (p.category || 'Autres') === selectedCategory;
    const matchesFav = !showFavoritesOnly || favorites.includes(p.id);
    return matchesSearch && matchesCat && matchesFav;
  });

  if (sortBy === 'price_asc') processedProducts.sort((a,b) => a.price_fcfa - b.price_fcfa);
  if (sortBy === 'price_desc') processedProducts.sort((a,b) => b.price_fcfa - a.price_fcfa);

  const newestIds = products.slice(0, 3).map((p) => p.id);
  const featured = products.filter((p) => p.image_url).slice(0, 3);
  const reviewAverage = productReviews.length ? productReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / productReviews.length : 0;
  const gallery = selectedProduct
    ? [...new Set([
        selectedProduct.image_url,
        ...(Array.isArray(selectedProduct.images) ? selectedProduct.images : []),
        ...(selectedProduct.variants && typeof selectedProduct.variants === 'object' && Array.isArray(selectedProduct.variants.images) ? selectedProduct.variants.images : []),
      ].filter(Boolean))]
    : [];
  const selectedOut = selectedProduct && typeof selectedProduct.stock === 'number' && selectedProduct.stock <= 0;

  if (!merchant && !loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="aurora-blob aurora-1 -left-20 top-10 h-96 w-96 bg-emerald-500/20" />
        <div className="aurora-blob aurora-2 -right-20 bottom-10 h-96 w-96 bg-violet-500/20" />
      </div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center text-white backdrop-blur-xl">
        <motion.div animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_40px_rgba(52,211,153,0.5)]">
          <Store className="h-10 w-10" />
        </motion.div>
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight">Boutique introuvable</h2>
        <p className="mb-8 text-slate-400">Ce lien est expiré ou n'existe pas.</p>
        <Link to="/" className="block rounded-full bg-white px-8 py-4 font-bold text-slate-900 transition-transform hover:-translate-y-0.5">Retour à l'accueil</Link>
      </motion.div>
    </div>
  );

  const themeColor = merchant?.theme_color || '#059669';
  const socialLinks = merchant?.social_links || {};
  const paymentOk = paymentStatusMessage?.includes('réussi');

  return (
    <MotionConfig reducedMotion="user">
    <div className="shop-root relative min-h-screen bg-[#f7f8f7] pb-28 font-sans text-slate-900 selection:bg-slate-900 selection:text-white md:pb-0" style={{ '--shop': themeColor }}>

      {/* TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.button
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-28 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-slate-900/90 px-5 py-3.5 text-white shadow-2xl backdrop-blur-2xl md:bottom-8"
          >
            <span className="theme-gradient flex h-7 w-7 items-center justify-center rounded-full"><Check className="h-4 w-4" strokeWidth={3} /></span>
            <span className="text-sm font-bold">{toastMessage}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* BANDEAU DÉFILANT */}
      <div className="relative overflow-hidden bg-slate-950 py-2.5 text-xs font-semibold text-white">
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex shrink-0 items-center gap-8 px-4">
                  <span className="flex items-center gap-2"><Truck className="theme-text h-3.5 w-3.5" /> Livraison rapide</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-sky-400" /> Wave & Orange Money</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-amber-300" /> Paiement à la livraison</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Code PIN sécurisé</span>
                  <span className="text-white/30">✦</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* EN-TÊTE */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={goHome} className="group flex min-w-0 items-center gap-3 text-left">
            {merchant?.logo_url ? (
              <motion.span whileHover={{ rotate: -6, scale: 1.05 }} className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
                <img src={merchant.logo_url} alt={merchant.shop_name} className="h-full w-full object-cover" />
              </motion.span>
            ) : (
              <motion.span whileHover={{ rotate: -6, scale: 1.05 }} className="theme-gradient theme-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
                <Store className="h-5 w-5" />
              </motion.span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold tracking-tight md:text-xl">{merchant?.shop_name || 'Boutique'}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
                Boutique en ligne
              </span>
            </span>
          </button>

          <div className="relative mx-auto hidden max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (activeTab !== 'home') setActiveTab('home'); }}
              className="theme-ring w-full rounded-2xl border border-transparent bg-slate-100/80 py-3 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-slate-200 focus:bg-white focus:ring-2"
            />
          </div>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <button onClick={() => openTab('order-tracking')} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'order-tracking' ? 'theme-soft theme-text' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Package className="h-4 w-4" /> Suivi
            </button>
            <button onClick={() => openTab('profile')} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'profile' ? 'theme-soft theme-text' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Info className="h-4 w-4" /> À propos
            </button>
            <button onClick={toggleFavoritesView} className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100" aria-label="Mes favoris">
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`} />
              {favorites.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{favorites.length}</span>}
            </button>
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100" title="Accès livreur" aria-label="Accès livreur">
              <Bike className="h-5 w-5" />
            </Link>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCartOpen(true)} className="theme-gradient theme-glow ml-2 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white">
              <ShoppingBag className="h-5 w-5" /> Panier
              <motion.span key={cartItemsCount} initial={{ scale: 1.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs">
                {cartItemsCount}
              </motion.span>
            </motion.button>
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-xl bg-slate-100 p-2.5 text-slate-700" aria-label="Rechercher et menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="rounded-xl bg-slate-100 p-2.5 text-slate-700" aria-label="Accès livreur">
              <Bike className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 md:hidden">
              <div className="space-y-3 p-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); if (activeTab !== 'home') setActiveTab('home'); }}
                    className="theme-ring w-full rounded-2xl bg-slate-100 py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Catalogue', icon: LayoutGrid, onClick: () => { setMobileMenuOpen(false); goToCatalog(); } },
                    { label: 'Suivi', icon: Package, onClick: () => openTab('order-tracking') },
                    { label: 'À propos', icon: Info, onClick: () => openTab('profile') },
                  ].map((l) => (
                    <button key={l.label} onClick={l.onClick} className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-3 text-xs font-bold text-slate-700">
                      <l.icon className="theme-text h-5 w-5" /> {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pt-10 lg:px-8">
        {/* Retour de paiement */}
        <AnimatePresence>
          {paymentStatusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`mb-6 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold ${paymentOk ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'}`}
            >
              {paymentOk ? <CircleCheck className="h-5 w-5 shrink-0" /> : <TriangleAlert className="h-5 w-5 shrink-0" />}
              <span className="flex-1">{paymentStatusMessage}</span>
              <button onClick={() => setPaymentStatusMessage(null)} className="rounded-lg p-1 hover:bg-black/5" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'home' && (
          <>
            {/* HÉROS */}
            {loading ? (
              <div className="mb-12 h-[460px] animate-pulse rounded-[2.5rem] bg-slate-200/70" />
            ) : (
              <section className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-2xl md:mb-14">
                {merchant?.banner_url && (
                  <img src={merchant.banner_url} alt="" className="ken-burns absolute inset-0 h-full w-full object-cover opacity-50" />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, color-mix(in srgb, var(--shop) 80%, black) 0%, rgba(2,6,23,0.88) 55%, rgba(2,6,23,0.55) 100%)' }} />
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                  <div className="aurora-blob aurora-1 -left-24 -top-24 h-96 w-96" style={{ background: 'color-mix(in srgb, var(--shop) 55%, transparent)' }} />
                  <div className="aurora-blob aurora-2 -bottom-24 right-0 h-80 w-80 bg-amber-400/20" />
                  <div className="bg-grid-pattern absolute inset-0" />
                </div>

                <div className="relative grid min-h-[460px] items-center gap-10 p-7 md:min-h-[520px] md:p-12 lg:grid-cols-[1.15fr_1fr]">
                  <div>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="mb-6 flex flex-wrap items-center gap-3">
                      <span className="conic-border inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Nouvelle collection
                      </span>
                    </motion.div>
                    <h1 className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
                      <BlurWords text={merchant?.shop_name || ''} delay={0.15} />
                    </h1>
                    <motion.p initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }} className="mb-8 max-w-xl text-lg text-white/80 md:text-xl">
                      {merchant?.description || 'Découvrez notre sélection exclusive de produits haut de gamme.'}
                    </motion.p>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7, ease: EASE }} className="flex flex-wrap gap-3">
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={goToCatalog} className="shine-btn group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-bold text-slate-900 shadow-[0_0_40px_rgba(255,255,255,0.25)]">
                        Découvrir la boutique <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </motion.button>
                      <button onClick={() => openTab('order-tracking')} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-4 font-semibold backdrop-blur transition-colors hover:bg-white/15">
                        <Package className="h-5 w-5" /> Suivre ma commande
                      </button>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 flex flex-wrap gap-2">
                      {[
                        { icon: Truck, text: `Livraison dans ${activeZones.length} zone${activeZones.length > 1 ? 's' : ''}` },
                        { icon: Smartphone, text: 'Wave & Orange Money' },
                        { icon: ShieldCheck, text: 'Code PIN à la livraison' },
                      ].map((c) => (
                        <span key={c.text} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 backdrop-blur">
                          <c.icon className="h-4 w-4 text-amber-300" /> {c.text}
                        </span>
                      ))}
                    </motion.div>
                  </div>

                  {/* Produits vedettes flottants */}
                  <div className="relative hidden h-[400px] lg:block">
                    {featured.length > 0 ? featured.map((p, i) => {
                      const pos = [{ left: '0%', top: '0%', zIndex: 10 }, { right: '0%', top: '84px', zIndex: 30 }, { left: 'calc(50% - 96px)', bottom: '0%', zIndex: 20 }][i];
                      const rot = [-6, 5, -2][i];
                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          initial={{ opacity: 0, y: 80, rotate: rot * 3 }}
                          animate={{ opacity: 1, y: 0, rotate: rot }}
                          transition={{ delay: 0.5 + i * 0.18, type: 'spring', stiffness: 110, damping: 14 }}
                          whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }}
                          className="absolute w-44 text-left"
                          style={pos}
                        >
                          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }} className="rounded-3xl bg-white p-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]">
                            <img src={p.image_url} alt={p.name} className="aspect-square w-full rounded-2xl object-cover" />
                            <div className="px-2 pb-1 pt-2">
                              <p className="truncate text-sm font-bold text-slate-900">{p.name}</p>
                              <p className="theme-text text-sm font-extrabold">{fmt(p.price_fcfa)} F</p>
                            </div>
                          </motion.div>
                        </motion.button>
                      );
                    }) : (
                      <motion.div animate={{ y: [0, -14, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 6, repeat: Infinity }} className="theme-gradient absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.5rem] shadow-[0_0_80px_rgba(255,255,255,0.15)]">
                        <ShoppingBag className="h-20 w-20 text-white" strokeWidth={1.4} />
                      </motion.div>
                    )}
                    {products.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: 'spring' }} className="absolute right-0 top-0 z-40 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                        <Sparkles className="h-5 w-5 text-amber-300" />
                        <span className="text-sm font-bold">{products.length} article{products.length > 1 ? 's' : ''} disponibles</span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* STORIES */}
            {products.some((p) => p.image_url) && (
              <section className="mb-10">
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-extrabold">En ce moment</h2>
                </div>
                <StoreStories products={products} onProductClick={(p) => setSelectedProduct(p)} />
              </section>
            )}

            {/* CATALOGUE */}
            <section id="shop-grid" className="scroll-mt-24">
              <div className="mb-5">
                <p className="theme-text text-sm font-bold uppercase tracking-widest">Catalogue</p>
                <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Parcourez nos catégories</h2>
              </div>

              <div className="-mx-4 mb-8 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:flex-wrap md:px-0">
                {categories.map((cat, i) => {
                  const Icon = categoryIcon(cat);
                  const active = selectedCategory === cat;
                  const count = cat === 'Tous' ? products.length : products.filter((p) => (p.category || 'Autres') === cat).length;
                  return (
                    <motion.button
                      key={cat}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCategory(cat)}
                      className={`group flex shrink-0 items-center gap-3 rounded-2xl py-2 pl-2 pr-5 transition-colors ${active ? 'theme-gradient theme-glow text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:ring-slate-300'}`}
                    >
                      <motion.span
                        whileHover={{ rotate: [0, -15, 15, -8, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${active ? 'bg-white/20 text-white' : 'theme-soft theme-text'}`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.span>
                      <span className="text-left">
                        <span className="block text-sm font-bold">{cat}</span>
                        <span className={`block text-[11px] ${active ? 'text-white/75' : 'text-slate-400'}`}>{count} article{count > 1 ? 's' : ''}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold">
                    {showFavoritesOnly ? 'Mes favoris' : selectedCategory === 'Tous' ? 'Tous les produits' : selectedCategory}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {processedProducts.length} article{processedProducts.length > 1 ? 's' : ''}{searchQuery && ` pour « ${searchQuery} »`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${showFavoritesOnly ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                  >
                    <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-white' : ''}`} /> Favoris
                    {favorites.length > 0 && <span className={`rounded-full px-1.5 text-xs ${showFavoritesOnly ? 'bg-white/25' : 'bg-rose-50 text-rose-600'}`}>{favorites.length}</span>}
                  </motion.button>
                  <div className="flex rounded-2xl bg-white p-1 ring-1 ring-slate-200" role="group" aria-label="Trier">
                    {SORTS.map((s) => (
                      <button key={s.id} onClick={() => setSortBy(s.id)} aria-pressed={sortBy === s.id} className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${sortBy === s.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                        {sortBy === s.id && <motion.span layoutId="sort-pill" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <span className="relative">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70">
                      <div className="aspect-[4/5] animate-pulse bg-slate-100" />
                      <div className="space-y-2 p-4">
                        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
                        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : processedProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {processedProducts.map((p, idx) => (
                    <ShopProductCard
                      key={p.id}
                      product={p}
                      index={idx}
                      isNew={newestIds.includes(p.id)}
                      isFavorite={favorites.includes(p.id)}
                      justAdded={justAdded === p.id}
                      onOpen={() => setSelectedProduct(p)}
                      onAdd={() => quickAdd(p)}
                      onToggleFavorite={() => toggleFavorite(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[2rem] bg-white px-6 py-20 text-center ring-1 ring-slate-200/70">
                  <motion.div animate={{ y: [0, -10, 0], rotate: [0, -8, 8, 0] }} transition={{ duration: 4, repeat: Infinity }} className="theme-gradient theme-glow mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-white">
                    {showFavoritesOnly ? <Heart className="h-9 w-9" /> : <Search className="h-9 w-9" />}
                  </motion.div>
                  <h3 className="mb-2 text-xl font-bold">{showFavoritesOnly ? 'Aucun favori pour le moment' : 'Aucun produit trouvé'}</h3>
                  <p className="mb-6 text-slate-500">{showFavoritesOnly ? 'Touchez le cœur d\'un produit pour le retrouver ici.' : 'Essayez de modifier vos filtres ou votre recherche.'}</p>
                  <button onClick={() => { setSearchQuery(''); setSelectedCategory('Tous'); setShowFavoritesOnly(false); }} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white">
                    Voir tous les produits
                  </button>
                </div>
              )}
            </section>

            {/* POURQUOI NOUS */}
            {!loading && (
              <section className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                {[
                  { icon: Truck, title: 'Livraison rapide', text: `${activeZones.length} zone${activeZones.length > 1 ? 's' : ''} desservie${activeZones.length > 1 ? 's' : ''}` },
                  { icon: Smartphone, title: 'Paiement mobile', text: 'Wave, Orange Money ou à la livraison' },
                  { icon: ShieldCheck, title: 'Code PIN', text: 'Votre colis n\'est remis qu\'à vous' },
                  { icon: MessageCircle, title: 'Contact direct', text: 'Une question ? Écrivez-nous sur WhatsApp' },
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: EASE }}
                    whileHover={{ y: -6 }}
                    className="group rounded-3xl bg-white p-5 ring-1 ring-slate-200/70 transition-shadow hover:shadow-xl md:p-6"
                  >
                    <motion.span whileHover={{ rotate: [0, -12, 12, 0] }} className="theme-gradient theme-glow mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                      <f.icon className="h-6 w-6" />
                    </motion.span>
                    <p className="font-bold">{f.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{f.text}</p>
                  </motion.div>
                ))}
              </section>
            )}
          </>
        )}

        {/* SUIVI DE COMMANDE */}
        {activeTab === 'order-tracking' && (
          <div className="mx-auto max-w-3xl py-2 md:py-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white md:p-10">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="aurora-blob aurora-1 -left-20 -top-24 h-72 w-72" style={{ background: 'color-mix(in srgb, var(--shop) 50%, transparent)' }} />
                <div className="aurora-blob aurora-2 -bottom-24 right-0 h-72 w-72 bg-amber-400/15" />
              </div>
              <div className="relative">
                <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }} className="theme-gradient mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">
                  <Package className="h-7 w-7" />
                </motion.span>
                <h2 className="text-3xl font-extrabold tracking-tight">Suivre ma commande</h2>
                <p className="mt-2 text-white/70">Entrez le téléphone utilisé et le code PIN reçu après votre commande.</p>
                <form onSubmit={handleTrackOrder} className="mt-8 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input type="tel" placeholder="Téléphone" value={trackPhone} onChange={e => setTrackPhone(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/10 py-4 pl-11 pr-4 font-medium text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:bg-white/15" required />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input type="text" placeholder="Code PIN" value={trackPin} onChange={e => setTrackPin(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/10 py-4 pl-11 pr-4 font-extrabold uppercase tracking-[0.3em] text-white outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-white/40 focus:border-white/30 focus:bg-white/15" required />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={trackLoading} className="shine-btn theme-gradient flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold disabled:opacity-60">
                    {trackLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Suivre
                  </motion.button>
                </form>
                <AnimatePresence>
                  {trackError && (
                    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-200">
                      <TriangleAlert className="h-4 w-4" /> {trackError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {trackResult && (() => {
              const stepIndex = TRACK_STEPS.findIndex((s) => s.id === trackResult.status);
              return (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.6 }} className="mt-6 rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200/70 md:p-8">
                  <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Commande n°</p>
                      <p className="font-mono text-xl font-extrabold tracking-widest">{trackResult.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Montant total</p>
                      <p className="theme-text text-2xl font-extrabold">{fmt(trackResult.total_amount_fcfa)} FCFA</p>
                    </div>
                  </div>

                  {trackResult.status === 'CANCELLED' ? (
                    <div className="py-6 text-center">
                      <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50"><CircleX className="h-10 w-10 text-red-500" /></span>
                      <h4 className="mb-2 text-xl font-extrabold">Commande annulée</h4>
                      <p className="text-slate-500">Votre commande a été annulée. Contactez la boutique pour plus de détails.</p>
                    </div>
                  ) : trackResult.status === 'DISPUTED' ? (
                    <div className="py-6 text-center">
                      <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50"><TriangleAlert className="h-10 w-10 text-amber-500" /></span>
                      <h4 className="mb-2 text-xl font-extrabold">Commande en litige</h4>
                      <p className="text-slate-500">La boutique examine votre commande. Contactez-la sur WhatsApp si besoin.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[12.5%] right-[12.5%] top-7 h-1.5 rounded-full bg-slate-100">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.max(0, stepIndex) / (TRACK_STEPS.length - 1)) * 100}%` }} transition={{ duration: 1.2, ease: EASE }} className="theme-gradient h-full rounded-full" />
                      </div>
                      <div className="relative grid grid-cols-4 gap-2">
                        {TRACK_STEPS.map((s, i) => {
                          const done = i <= stepIndex;
                          const current = i === stepIndex;
                          return (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex flex-col items-center text-center">
                              <span className="relative flex h-14 w-14 items-center justify-center">
                                {current && trackResult.status !== 'DELIVERED' && <span className="theme-bg absolute inset-0 animate-ping rounded-2xl opacity-25" />}
                                <motion.span
                                  animate={current ? { y: [0, -4, 0] } : {}}
                                  transition={{ duration: 1.6, repeat: Infinity }}
                                  className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${done ? 'theme-gradient theme-glow text-white' : 'bg-slate-100 text-slate-400'}`}
                                >
                                  <s.icon className="h-6 w-6" />
                                </motion.span>
                              </span>
                              <span className={`mt-3 text-xs font-extrabold uppercase tracking-wider md:text-sm ${done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                              <span className="hidden text-xs text-slate-500 md:block">{s.sub}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {trackResult.status === 'IN_TRANSIT' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 flex flex-col gap-5 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center">
                      {trackResult.driver_name && (
                        <div className="flex flex-1 items-center gap-4">
                          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-extrabold">
                            {trackResult.driver_name.charAt(0)}
                            <motion.span animate={{ x: [-2, 2, -2] }} transition={{ duration: 0.6, repeat: Infinity }} className="theme-gradient absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-slate-950">
                              <Bike className="h-3.5 w-3.5" />
                            </motion.span>
                          </span>
                          <div>
                            <p className="text-xs text-white/60">Votre livreur est en route</p>
                            <p className="text-lg font-extrabold">{trackResult.driver_name}</p>
                            {trackResult.driver_phone && (
                              <a href={`tel:${trackResult.driver_phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300 hover:underline">
                                <Phone className="h-4 w-4" /> Appeler le livreur
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="rounded-2xl border border-dashed border-white/25 px-5 py-3 text-center">
                        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60"><Lock className="h-3 w-3" /> Préparez ce code</p>
                        <p className="font-mono text-3xl font-extrabold tracking-[0.35em]">{trackResult.delivery_pin}</p>
                      </div>
                    </motion.div>
                  )}

                  {trackResult.status === 'DELIVERED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
                      <PartyPopper className="h-6 w-6 shrink-0" />
                      <p className="text-sm font-semibold">Commande livrée. Merci pour votre confiance !</p>
                    </motion.div>
                  )}

                  {trackResult.cart_items?.length > 0 && (
                    <div className="mt-8 border-t border-slate-100 pt-6">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Articles</p>
                      <div className="flex flex-wrap gap-2">
                        {trackResult.cart_items.map((it, idx) => (
                          <span key={idx} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm ring-1 ring-slate-200/70">
                            <span className="theme-text font-extrabold">{it.quantity}×</span> {it.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}

        {/* À PROPOS */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl py-2 md:py-6">
            <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-xl ring-1 ring-slate-200/70">
              <div className="relative h-52 overflow-hidden bg-slate-950 md:h-64">
                {merchant?.banner_url ? (
                  <img src={merchant.banner_url} alt="" className="ken-burns absolute inset-0 h-full w-full object-cover opacity-70" />
                ) : (
                  <div className="theme-gradient absolute inset-0" />
                )}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="aurora-blob aurora-1 -left-10 -top-20 h-72 w-72 bg-white/20" />
                  <div className="bg-grid-pattern absolute inset-0" />
                </div>
              </div>
              <div className="relative flex flex-col items-center px-6 pb-12 text-center md:px-10">
                <motion.div whileHover={{ rotate: 0, scale: 1.05 }} initial={{ rotate: -4 }} className="-mt-16 h-32 w-32 overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-xl">
                  {merchant?.logo_url ? (
                    <img src={merchant.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="theme-gradient flex h-full w-full items-center justify-center text-white"><Store className="h-14 w-14" /></span>
                  )}
                </motion.div>
                <h2 className="mt-6 text-4xl font-extrabold tracking-tight">{merchant?.shop_name}</h2>
                <p className="mt-3 max-w-lg text-lg leading-relaxed text-slate-500">{merchant?.description || "Une boutique d'exception."}</p>

                <div className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3">
                  {[
                    { value: products.length, label: 'Produits' },
                    { value: categories.length - 1, label: 'Catégories' },
                    { value: activeZones.length, label: 'Zones livrées' },
                  ].map((s) => (
                    <div key={s.label} className="theme-soft rounded-2xl py-4">
                      <p className="theme-text text-2xl font-extrabold">{s.value}</p>
                      <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid w-full gap-3 text-left md:grid-cols-2">
                  {merchant?.phone_number && (
                    <a href={`https://wa.me/${merchant.phone_number.replace(/\s+/g, '').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md transition-transform group-hover:rotate-[-8deg]"><MessageCircle className="h-5 w-5" /></span>
                      <span><span className="block text-xs font-semibold text-slate-400">WhatsApp</span><span className="font-bold">{merchant.phone_number}</span></span>
                    </a>
                  )}
                  {merchant?.phone_number && (
                    <a href={`tel:${merchant.phone_number.replace(/\s+/g, '')}`} className="group flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <span className="theme-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:rotate-[-8deg]"><Phone className="h-5 w-5" /></span>
                      <span><span className="block text-xs font-semibold text-slate-400">Téléphone</span><span className="font-bold">{merchant.phone_number}</span></span>
                    </a>
                  )}
                  {merchant?.email && (
                    <a href={`mailto:${merchant.email}`} className="group flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md transition-transform group-hover:rotate-[-8deg]"><Mail className="h-5 w-5" /></span>
                      <span className="min-w-0"><span className="block text-xs font-semibold text-slate-400">Email</span><span className="block truncate font-bold">{merchant.email}</span></span>
                    </a>
                  )}
                  {merchant?.address && (
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md"><MapPin className="h-5 w-5" /></span>
                      <span><span className="block text-xs font-semibold text-slate-400">Adresse</span><span className="font-bold">{merchant.address}</span></span>
                    </div>
                  )}
                </div>
                <div className="mt-8"><SocialLinks links={socialLinks} /></div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* PIED DE PAGE */}
      <footer className="relative overflow-hidden bg-slate-950 pb-10 pt-16 text-slate-400">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="aurora-blob aurora-1 -left-24 top-0 h-72 w-72" style={{ background: 'color-mix(in srgb, var(--shop) 30%, transparent)' }} />
        </div>
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              {merchant?.logo_url ? (
                <img src={merchant.logo_url} alt={merchant.shop_name} className="h-12 w-12 rounded-2xl bg-white object-cover" />
              ) : (
                <span className="theme-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white"><Store className="h-6 w-6" /></span>
              )}
              <span className="text-2xl font-extrabold tracking-tight text-white">{merchant?.shop_name || 'Boutique'}</span>
            </div>
            <p className="mb-6 max-w-sm">{merchant?.description || 'Découvrez notre sélection exclusive de produits. Qualité garantie et livraison rapide.'}</p>
            <SocialLinks links={socialLinks} dark />
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">Boutique</h4>
            <ul className="space-y-3">
              <li><button onClick={goToCatalog} className="transition-colors hover:text-white">Nos produits</button></li>
              <li><button onClick={() => openTab('order-tracking')} className="transition-colors hover:text-white">Suivre ma commande</button></li>
              <li><button onClick={() => openTab('profile')} className="transition-colors hover:text-white">À propos</button></li>
              <li><button onClick={() => setIsCartOpen(true)} className="transition-colors hover:text-white">Panier</button></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">Contact</h4>
            <ul className="space-y-3">
              {merchant?.phone_number && <li className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0" /> {merchant.phone_number}</li>}
              {merchant?.email && <li className="flex items-start gap-3 break-all"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> {merchant.email}</li>}
              {merchant?.address && <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {merchant.address}</li>}
            </ul>
          </div>
        </div>
        <div className="relative mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 pt-8 text-sm sm:px-6 md:flex-row lg:px-8">
          <p>&copy; {new Date().getFullYear()} {merchant?.shop_name || 'Boutique'}. Tous droits réservés.</p>
          <a href="/" className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 transition-colors hover:bg-white/10">
            Propulsé par <span className="font-extrabold text-white">SamaBoutik</span>
          </a>
        </div>
      </footer>

      {/* PANIER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col bg-[#f7f8f7] shadow-2xl"
            >
              <div className="theme-gradient relative overflow-hidden p-5 text-white">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                    <ShoppingBag className="h-5 w-5" />
                  </motion.span>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold">{orderFinalized ? 'Commande confirmée' : 'Mon panier'}</h2>
                    {!orderFinalized && <p className="text-sm text-white/80">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</p>}
                  </div>
                  <motion.button whileHover={{ rotate: 90 }} onClick={() => setIsCartOpen(false)} className="rounded-full bg-white/20 p-2" aria-label="Fermer le panier">
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              {Object.keys(cart).length === 0 && !orderFinalized ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <motion.span animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }} className="theme-soft theme-text mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem]">
                    <ShoppingBag className="h-11 w-11" />
                  </motion.span>
                  <p className="text-lg font-bold">Votre panier est vide</p>
                  <p className="mt-1 text-sm text-slate-500">Ajoutez vos coups de cœur pour commander.</p>
                  <button onClick={() => { setIsCartOpen(false); goToCatalog(); }} className="theme-gradient theme-glow mt-6 rounded-full px-6 py-3 text-sm font-bold text-white">
                    Découvrir les produits
                  </button>
                </div>
              ) : orderFinalized ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="rounded-[2rem] bg-white p-7 text-center shadow-sm ring-1 ring-slate-200/70">
                    <motion.span initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="theme-gradient theme-glow relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-white">
                      <span className="theme-bg absolute inset-0 animate-ping rounded-full opacity-20" />
                      <Check className="relative h-10 w-10" strokeWidth={3} />
                    </motion.span>
                    <h3 className="text-2xl font-extrabold">Commande validée !</h3>
                    <p className="mt-2 text-slate-500">Numéro de suivi</p>
                    <p className="font-mono text-xl font-extrabold tracking-widest">{orderFinalized.id.split('-')[0].toUpperCase()}</p>
                    <div className="theme-soft mt-6 rounded-2xl border-2 border-dashed p-5" style={{ borderColor: 'color-mix(in srgb, var(--shop) 35%, transparent)' }}>
                      <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500"><Lock className="h-3.5 w-3.5" /> Code secret de livraison</p>
                      <p className="theme-text mt-1 font-mono text-4xl font-extrabold tracking-[0.35em]">{orderFinalized.delivery_pin}</p>
                      <p className="mt-2 text-xs text-slate-500">Donnez ce code au livreur à la réception de votre colis.</p>
                    </div>
                    <div className="mt-6 space-y-2.5">
                      {orderFinalized.payment_method === 'ON_DELIVERY' && (
                        <a href={getWhatsAppCheckoutLink()} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 font-bold text-white shadow-lg shadow-green-500/25 transition-colors hover:bg-[#1DA851]">
                          <Send className="h-5 w-5" /> Confirmer sur WhatsApp
                        </a>
                      )}
                      <button onClick={trackFinalizedOrder} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white">
                        <Package className="h-5 w-5" /> Suivre ma commande
                      </button>
                      <button onClick={() => { setOrderFinalized(null); setIsCartOpen(false); }} className="w-full rounded-2xl py-3 font-semibold text-slate-500 hover:bg-slate-100">
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitOrder} className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-hide">
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {Object.entries(cart).map(([key, item]) => (
                          <motion.div
                            key={key}
                            layout
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }}
                            className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"
                          >
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                              {item.product.image_url ? (
                                <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-full w-full p-5 text-slate-300" />
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div>
                                <h4 className="line-clamp-1 text-sm font-bold">{item.product.name}</h4>
                                {item.variant && <p className="mt-0.5 text-xs text-slate-500">{item.variant}</p>}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold">{fmt(item.product.price_fcfa * item.quantity)} F</span>
                                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                                  <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(key, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Retirer un"><Minus className="h-3.5 w-3.5" /></motion.button>
                                  <motion.span key={item.quantity} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="w-6 text-center text-sm font-bold">{item.quantity}</motion.span>
                                  <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(key, 1)} className="theme-gradient flex h-7 w-7 items-center justify-center rounded-full text-white" aria-label="Ajouter un"><Plus className="h-3.5 w-3.5" /></motion.button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                      <p className="flex items-center gap-2 text-sm font-bold"><User className="theme-text h-4 w-4" /> Vos coordonnées</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nom complet" required value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} className="theme-ring w-full rounded-xl bg-slate-50 px-3.5 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2" />
                        <input type="tel" placeholder="Téléphone" required value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} className="theme-ring w-full rounded-xl bg-slate-50 px-3.5 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2" />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Adresse précise (ex : Médina rue 11)" required value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="theme-ring min-w-0 flex-1 rounded-xl bg-slate-50 px-3.5 py-3 text-sm outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2" />
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if ('geolocation' in navigator) {
                              navigator.geolocation.getCurrentPosition((position) => {
                                const lat = position.coords.latitude;
                                const lng = position.coords.longitude;
                                setCheckoutData({...checkoutData, gpsLocation: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`});
                              }, () => {
                                alert("Impossible d'obtenir votre position. Veuillez vérifier vos permissions GPS.");
                              });
                            } else {
                              alert("La géolocalisation n'est pas supportée par votre navigateur.");
                            }
                          }}
                          className={`flex w-12 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors ${checkoutData.gpsLocation ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100'}`}
                          title="Ajouter ma position GPS exacte"
                          aria-label="Ajouter ma position GPS"
                        >
                          {checkoutData.gpsLocation ? <Check className="h-5 w-5" /> : <LocateFixed className="h-5 w-5" />}
                        </motion.button>
                      </div>
                      {checkoutData.gpsLocation && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CircleCheck className="h-3.5 w-3.5" /> Position GPS ajoutée</p>}
                      <div className="relative">
                        <Truck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select value={checkoutData.zone} onChange={e => setCheckoutData({...checkoutData, zone: e.target.value})} className="theme-ring w-full appearance-none rounded-xl bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2">
                          {activeZones.map(z => <option key={z.name} value={z.name}>{z.name} — {z.price} F</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-bold">Mode de paiement</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'ON_DELIVERY', label: 'À la livraison', sub: 'Espèces au livreur', icon: Truck },
                          { id: 'MOBILE_MONEY', label: 'Wave / OM', sub: 'Paiement sécurisé', icon: Smartphone },
                        ].map((m) => {
                          const active = checkoutData.paymentMethod === m.id;
                          return (
                            <label key={m.id} className={`relative cursor-pointer rounded-2xl p-3.5 ring-2 transition-all ${active ? 'theme-soft theme-border ring-[color:var(--shop)]' : 'bg-white ring-slate-200 hover:ring-slate-300'}`}>
                              <input type="radio" name="payment" value={m.id} checked={active} onChange={() => setCheckoutData({...checkoutData, paymentMethod: m.id})} className="sr-only" />
                              {active && <span className="theme-gradient absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                              <m.icon className={`mb-2 h-6 w-6 ${active ? 'theme-text' : 'text-slate-400'}`} />
                              <span className="block text-sm font-bold">{m.label}</span>
                              <span className="block text-[11px] text-slate-500">{m.sub}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/70 bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
                    <div className="mb-4 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-500"><span>Sous-total</span><span className="font-semibold text-slate-900">{fmt(getCartTotal())} F</span></div>
                      <div className="flex justify-between text-slate-500"><span className="truncate pr-4">Livraison · {checkoutData.zone}</span><span className="shrink-0 font-semibold text-slate-900">{fmt(getDeliveryPrice())} F</span></div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="shine-btn theme-gradient theme-glow flex w-full items-center justify-between rounded-2xl px-5 py-4 font-bold text-white disabled:opacity-60"
                    >
                      <span className="flex items-center gap-2">
                        {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                        {isSubmitting ? 'Traitement...' : 'Commander'}
                      </span>
                      <span className="flex items-center gap-1 text-lg font-extrabold">{fmt(getCartTotal() + getDeliveryPrice())} F <ChevronRight className="h-5 w-5" /></span>
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* APERÇU RAPIDE */}
      <AnimatePresence>
        {selectedProduct && !isCartOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] md:flex-row"
            >
              <motion.button whileHover={{ rotate: 90 }} onClick={() => setSelectedProduct(null)} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur" aria-label="Fermer">
                <X className="h-5 w-5" />
              </motion.button>

              <div className="relative flex w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-slate-100 p-5 md:w-1/2 md:p-10">
                <div className="group relative w-full max-w-sm overflow-hidden rounded-3xl shadow-xl">
                  {quickViewImage ? (
                    <motion.img key={quickViewImage} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} src={quickViewImage} alt={selectedProduct.name} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="theme-soft theme-text flex aspect-[4/5] w-full items-center justify-center"><Package className="h-24 w-24" strokeWidth={1.2} /></div>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {gallery.map((img) => (
                      <button key={img} onClick={() => setQuickViewImage(img)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${quickViewImage === img ? 'ring-[color:var(--shop)] scale-105' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col overflow-y-auto bg-white p-6 scrollbar-hide md:w-1/2 md:p-10">
                <span className="theme-soft theme-text mb-3 inline-flex w-max items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                  {React.createElement(categoryIcon(selectedProduct.category || 'Autres'), { className: 'h-3.5 w-3.5' })} {selectedProduct.category || 'Standard'}
                </span>
                <h3 className="text-3xl font-extrabold leading-tight tracking-tight">{selectedProduct.name}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {productReviews.length > 0 ? (
                    <>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviewAverage) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                      </div>
                      <span className="font-bold">{reviewAverage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>
                      <span className="text-slate-500">({productReviews.length} avis)</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Pas encore d'avis</span>
                  )}
                </div>
                <p className="theme-text mt-5 text-4xl font-extrabold tracking-tight">{fmt(selectedProduct.price_fcfa)} <span className="text-lg">FCFA</span></p>
                {typeof selectedProduct.stock === 'number' && (
                  <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${selectedOut ? 'text-slate-500' : selectedProduct.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedOut ? <CircleX className="h-4 w-4" /> : selectedProduct.stock <= 5 ? <Flame className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                    {selectedOut ? 'Épuisé pour le moment' : selectedProduct.stock <= 5 ? `Plus que ${selectedProduct.stock} en stock` : 'En stock'}
                  </p>
                )}
                <p className="mt-6 leading-relaxed text-slate-600">{selectedProduct.description || 'Aucune description disponible pour ce produit.'}</p>

                {selectedProduct.variants && typeof selectedProduct.variants === 'object' && !Array.isArray(selectedProduct.variants) && (
                  <div className="mt-6 space-y-5">
                    {selectedProduct.variants.sizes?.length > 0 && (
                      <div>
                        <p className="mb-2.5 text-sm font-bold">Taille</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants.sizes.map(s => (
                            <motion.button whileTap={{ scale: 0.92 }} key={s} onClick={() => setQuickViewSize(s)} className={`min-w-12 rounded-xl px-4 py-2 text-sm font-bold transition-all ${quickViewSize === s ? 'theme-gradient theme-glow text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {s}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedProduct.variants.colors?.length > 0 && (
                      <div>
                        <p className="mb-2.5 text-sm font-bold">Couleur</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.variants.colors.map(c => (
                            <motion.button whileTap={{ scale: 0.92 }} key={c} onClick={() => setQuickViewColor(c)} className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${quickViewColor === c ? 'theme-gradient theme-glow text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {c}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedProduct.variants && Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-2.5 text-sm font-bold">Option</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map(v => (
                        <motion.button whileTap={{ scale: 0.92 }} key={v} onClick={() => setQuickViewSize(v)} className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${quickViewSize === v ? 'theme-gradient theme-glow text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {v}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
                  {[{ icon: Truck, t: 'Livraison rapide' }, { icon: Lock, t: 'Code PIN' }, { icon: Smartphone, t: 'Wave / OM' }].map((b) => (
                    <span key={b.t} className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 py-3"><b.icon className="theme-text h-5 w-5" /> {b.t}</span>
                  ))}
                </div>

                <div className="mt-6 flex gap-3 md:mt-auto md:pt-6">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={selectedOut}
                    onClick={() => addToCart(selectedProduct, quickViewSize, quickViewColor)}
                    className="shine-btn theme-gradient theme-glow flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="h-5 w-5" /> {selectedOut ? 'Épuisé' : 'Ajouter au panier'}
                  </motion.button>
                  <FavoriteButton active={favorites.includes(selectedProduct.id)} onToggle={() => toggleFavorite(selectedProduct.id)} className="!h-14 !w-14 !rounded-2xl ring-1 ring-slate-200" />
                </div>

                <button onClick={() => { setSelectedProduct(null); setReviewData({...reviewData, product_id: selectedProduct.id}); setReviewModalOpen(true); }} className="group mt-6 flex w-full items-center justify-between rounded-2xl bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Star className="h-5 w-5 fill-amber-400" /></span>
                    <span>
                      <span className="block text-sm font-bold">{productReviews.length} avis client{productReviews.length > 1 ? 's' : ''}</span>
                      <span className="block text-xs text-slate-500">Lire les avis ou donner le vôtre</span>
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-900" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AVIS */}
      <AnimatePresence>
        {reviewModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setReviewModalOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 60, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="relative w-full max-w-md rounded-t-[2rem] bg-white p-7 shadow-2xl sm:rounded-[2rem]">
              <motion.button whileHover={{ rotate: 90 }} onClick={() => setReviewModalOpen(false)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-2" aria-label="Fermer"><X className="h-4 w-4" /></motion.button>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-amber-500/30"><Star className="h-6 w-6 fill-white" /></span>
                <h3 className="text-2xl font-extrabold">Avis clients</h3>
              </div>

              <form onSubmit={submitReview} className="mb-6 rounded-2xl bg-slate-50 p-5">
                <p className="mb-3 text-sm font-bold text-slate-600">Votre note</p>
                <div className="mb-4 flex gap-1.5">
                  {[1,2,3,4,5].map(star => (
                    <motion.button type="button" key={star} whileHover={{ scale: 1.25, rotate: -10 }} whileTap={{ scale: 0.9 }} onClick={() => setReviewData({...reviewData, rating: star})} aria-label={`${star} étoile${star > 1 ? 's' : ''}`}>
                      <Star className={`h-9 w-9 transition-colors ${star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </motion.button>
                  ))}
                </div>
                <input type="text" placeholder="Votre nom" value={reviewData.customer_name} onChange={e => setReviewData({...reviewData, customer_name: e.target.value})} className="theme-ring mb-3 w-full rounded-xl bg-white p-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2" />
                <textarea placeholder="Votre commentaire..." required value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} className="theme-ring mb-4 h-24 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2" />
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={reviewSubmitting} className="theme-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white disabled:opacity-50">
                  {reviewSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                </motion.button>
              </form>

              <div className="max-h-64 space-y-3 overflow-y-auto scrollbar-hide">
                {productReviews.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Soyez le premier à donner votre avis !</p>
                ) : (
                  productReviews.map((rev, i) => (
                    <motion.div key={rev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 rounded-2xl p-3 ring-1 ring-slate-100">
                      <span className="theme-soft theme-text flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">{(rev.customer_name || '?').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-bold">{rev.customer_name}</span>
                            {rev.verified && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <CircleCheck className="h-3 w-3" /> Achat vérifié
                              </span>
                            )}
                          </span>
                          <div className="flex shrink-0">
                            {[...Array(5)].map((_, s) => <Star key={s} className={`h-3 w-3 ${s < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                          </div>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600">{rev.comment}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOUTON WHATSAPP FLOTTANT */}
      {merchant?.phone_number && (
        <motion.a
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, type: 'spring' }}
          whileHover={{ scale: 1.1, rotate: -8 }}
          href={`https://wa.me/${merchant.phone_number.replace(/\s+/g, '').replace(/\+/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="group fixed bottom-28 right-4 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-green-500/40 md:bottom-6 md:right-6 md:h-16 md:w-16"
          aria-label="Contacter le vendeur sur WhatsApp"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
          <MessageCircle className="relative h-7 w-7 md:h-8 md:w-8" />
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100 md:block">
            Besoin d'aide ?
          </span>
        </motion.a>
      )}

      <SocialProofToast products={products} />

      {/* NAVIGATION MOBILE */}
      <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-end justify-around rounded-3xl border border-white/70 bg-white/85 px-2 pb-2 pt-2 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {[
            { id: 'home', label: 'Accueil', icon: House, onClick: goHome, active: activeTab === 'home' && !showFavoritesOnly },
            { id: 'fav', label: 'Favoris', icon: Heart, onClick: toggleFavoritesView, active: activeTab === 'home' && showFavoritesOnly, badge: favorites.length },
            { id: 'cart' },
            { id: 'track', label: 'Suivi', icon: Package, onClick: () => openTab('order-tracking'), active: activeTab === 'order-tracking' },
            { id: 'profile', label: 'Boutique', icon: Store, onClick: () => openTab('profile'), active: activeTab === 'profile' },
          ].map((item) => item.id === 'cart' ? (
            <motion.button key="cart" whileTap={{ scale: 0.9 }} onClick={() => setIsCartOpen(true)} className="theme-gradient theme-glow relative -mt-8 flex h-16 w-16 flex-col items-center justify-center rounded-[1.4rem] text-white ring-4 ring-[#f7f8f7]" aria-label="Panier">
              <ShoppingBag className="h-6 w-6" />
              <span className="text-[10px] font-bold">Panier</span>
              {cartItemsCount > 0 && (
                <motion.span key={cartItemsCount} initial={{ scale: 1.8 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold ring-2 ring-white">
                  {cartItemsCount}
                </motion.span>
              )}
            </motion.button>
          ) : (
            <button key={item.id} onClick={item.onClick} className="relative flex w-14 flex-col items-center gap-0.5 py-1">
              {item.active && <motion.span layoutId="mobile-nav" className="theme-soft absolute inset-0 rounded-2xl" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">
                <item.icon className={`h-5 w-5 ${item.active ? 'theme-text' : 'text-slate-500'} ${item.id === 'fav' && item.active ? 'fill-current' : ''}`} />
                {item.badge > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-rose-500" />}
              </span>
              <span className={`relative text-[10px] font-bold ${item.active ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </MotionConfig>
  );
}
