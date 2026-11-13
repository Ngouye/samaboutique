import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import StoreStories from '../components/StoreStories';
import { getShopTheme, themeStyle } from '../components/shop/themes';
import { thumbUrl, fallbackToFull } from '../utils/imageUpload';
import { friendlyError, isOffline, NETWORK_MESSAGE } from '../utils/networkErrors';
import { whatsappNumber } from '../utils/phone';
import StatusScreen from '../components/StatusScreen';
import { PAYMENT_CHOICES, isMobileChannel } from '../utils/payments';
import { productOptions, needsChoice } from '../utils/productOptions';
import { searchScore, matchesFilters, activeFilterCount, NO_FILTERS } from '../utils/searchText';
import SearchOverlay from '../components/shop/SearchOverlay';
import FilterSheet from '../components/shop/FilterSheet';
import ProductGallery from '../components/shop/ProductGallery';
import DeliverySheet from '../components/shop/DeliverySheet';
import MyOrders from '../components/shop/MyOrders';
// Icônes Phosphor duotone, communes à toute la plateforme (générées par scripts/dashboard-icons.mjs).
import {
  Package, MapPin, Search, Store, Heart, Star, Plus, Minus, X, ArrowRight, ChevronRight, Phone, Mail, ShoppingBag,
  Truck, Eye, MessageCircle, Smartphone, Gamepad2, Laptop, Camera, Headphones, Shirt, Utensils, Tag, Watch,
  Footprints, Gem, Sparkles, Baby, Sofa, Dumbbell, BookOpen, Car, LayoutGrid, ClipboardCheck, PackageOpen, Bike,
  PartyPopper, Info, Lock, ShieldCheck, LocateFixed, House, Flame, Check, CircleCheck, CircleX, TriangleAlert,
  LoaderCircle, User, Send, ChevronDown, Palette, WifiOff, RotateCw, HeartFill, Share2, History,
  WhatsApp, Facebook, Instagram, TikTok, SlidersHorizontal,
} from '../components/dashboard/icons';

// Nom de boutique de l'adresse, lisible même si l'adresse contient un « % » isolé.
const safeDecode = (s) => { try { return decodeURIComponent(s || ''); } catch { return s || ''; } };

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

// Chargés seulement quand on en a besoin : la carte pendant une livraison, les confettis après une commande.
const LiveDeliveryMap = lazy(() => import('../components/shop/LiveDeliveryMap'));

const EASE = [0.16, 1, 0.3, 1];
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');

const SORTS = [
  { id: 'newest', label: 'Nouveautés' },
  { id: 'price_asc', label: 'Prix ↑', full: 'Prix croissant' },
  { id: 'price_desc', label: 'Prix ↓', full: 'Prix décroissant' },
];
const RATING_SORT = { id: 'rating', label: 'Mieux notés' };
const ratingText = (avg) => avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const priceRangeLabel = ({ minPrice, maxPrice }) => (
  minPrice != null && maxPrice != null ? `${fmt(minPrice)} – ${fmt(maxPrice)} F`
    : minPrice != null ? `Dès ${fmt(minPrice)} F` : `Jusqu’à ${fmt(maxPrice)} F`
);

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

// Quantité d'un produit déjà dans le panier, toutes tailles et couleurs confondues.
const quantityInCart = (cart, productId) => Object.values(cart).reduce((n, item) => n + (item.product.id === productId ? item.quantity : 0), 0);
const stockLeft = (product) => (typeof product.stock === 'number' ? product.stock : Infinity);
const stockMessage = (product) => (product.stock <= 0 ? `${product.name} est épuisé` : `Plus que ${product.stock} en stock pour ${product.name}`);


// Mémoire de ce navigateur seulement (panier, favoris, produits vus, coordonnées si le client le demande).
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage bloqué (navigation privée) */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* stockage bloqué */ } },
};
const CLIENT_KEY = 'samaboutik_client';

// Lien direct vers un produit (?produit=…), en gardant les autres paramètres de l'adresse.
function setProductParam(id) {
  const url = new URL(window.location.href);
  if ((url.searchParams.get('produit') || null) === (id || null)) return;
  if (id) url.searchParams.set('produit', id); else url.searchParams.delete('produit');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

// Partage : menu natif du téléphone (WhatsApp, Facebook…), sinon copie du lien.
async function shareLink({ title, text, url }, onCopied) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); onCopied?.(); } catch { window.prompt('Copiez ce lien :', url); }
}

/* ------------------------------------------------------------------ */
/* Petits composants                                                   */
/* ------------------------------------------------------------------ */

function FavoriteButton({ active, onToggle, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur ${className}`}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={active}
    >
      <motion.span key={active ? 'on' : 'off'} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
        {active ? <HeartFill className="h-4 w-4 text-rose-500" /> : <Heart className="h-4 w-4 text-slate-500" />}
      </motion.span>
    </motion.button>
  );
}

function ShopProductCard({ product, index, isNew, isFavorite, justAdded, onOpen, onAdd, onToggleFavorite, choose = false, rating = null }) {
  const out = typeof product.stock === 'number' && product.stock <= 0;
  const low = !out && typeof product.stock === 'number' && product.stock <= 5;
  const CatIcon = categoryIcon(product.category || 'Autres');

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06, ease: EASE }}
      className="group"
    >
      <div onClick={onOpen} className="sh-card sh-card-hover relative h-full cursor-pointer overflow-hidden">
        <div className="sh-fill relative aspect-[4/5] overflow-hidden">
          {product.image_url ? (
            <img src={thumbUrl(product.image_url)} onError={fallbackToFull(product.image_url)} alt={product.name} loading="lazy" decoding="async" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${out ? 'grayscale' : ''}`} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="theme-soft theme-text sh-r-md flex h-20 w-20 items-center justify-center">
                {React.createElement(CatIcon, { className: 'h-9 w-9', strokeWidth: 1.6 })}
              </span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {isNew && !out && (
              <span className="theme-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md">
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

          <span className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-2 rounded-xl bg-white/95 py-2.5 text-sm font-bold text-slate-900 opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <Eye className="h-4 w-4" /> Aperçu rapide
          </span>
        </div>

        <div className="p-3.5 md:p-4">
          <p className="sh-faint truncate text-[11px] font-semibold uppercase tracking-wider">{product.category || 'Standard'}</p>
          <h4 className="sh-ink mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight md:text-base">{product.name}</h4>
          {rating?.count > 0 && (
            <p className="sh-muted mt-1 flex items-center gap-1 text-[11px] font-bold" aria-label={`Noté ${ratingText(rating.avg)} sur 5 (${rating.count} avis)`}>
              <Star className="h-3.5 w-3.5 text-amber-400" /> {ratingText(rating.avg)} <span className="sh-faint font-semibold">({rating.count})</span>
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="sh-ink text-base font-extrabold tracking-tight md:text-lg">
              {fmt(product.price_fcfa)} <span className="sh-faint text-[11px] font-semibold">FCFA</span>
            </p>
            <motion.button
              whileTap={{ scale: 0.85 }}
              disabled={out}
              onClick={(e) => { e.stopPropagation(); onAdd(e); }}
              className={`sh-r-sm relative flex h-10 w-10 shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${justAdded ? 'bg-emerald-500 text-white' : 'theme-gradient'}`}
              aria-label={choose ? `Choisir la taille ou la couleur de ${product.name}` : `Ajouter ${product.name} au panier`}
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
    </motion.div>
  );
}

function SocialLinks({ links, dark = false }) {
  const items = [
    { key: 'facebook', label: 'Facebook', cls: 'bg-[#1877F2]', icon: <Facebook className="h-5 w-5" /> },
    { key: 'instagram', label: 'Instagram', cls: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600', icon: <Instagram className="h-5 w-5" /> },
    { key: 'tiktok', label: 'TikTok', cls: dark ? 'bg-white/10' : 'bg-slate-900', icon: <TikTok className="h-5 w-5" /> },
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
          whileHover={{ y: -3 }}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${s.cls}`}
          aria-label={s.label}
        >
          {s.icon}
        </motion.a>
      ))}
    </div>
  );
}

function MiniProduct({ product, onOpen, small = false }) {
  return (
    <button type="button" onClick={onOpen} className={`sh-card sh-card-hover group shrink-0 overflow-hidden text-left ${small ? 'w-32' : 'w-36 md:w-44'}`}>
      <span className="sh-fill block aspect-square overflow-hidden">
        {product.image_url ? (
          <img src={thumbUrl(product.image_url)} onError={fallbackToFull(product.image_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="theme-text flex h-full items-center justify-center">{React.createElement(categoryIcon(product.category || 'Autres'), { className: 'h-8 w-8' })}</span>
        )}
      </span>
      <span className="block p-2.5">
        <span className="sh-ink block truncate text-xs font-bold">{product.name}</span>
        <span className="theme-text block text-sm font-extrabold">{fmt(product.price_fcfa)} F</span>
      </span>
    </button>
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
  // Aperçu d'un thème depuis le tableau de bord (?theme=minuit), sans rien enregistrer.
  const [previewThemeId] = useState(() => new URLSearchParams(window.location.search).get('theme'));

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

  const [productReviews, setProductReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '', customer_name: '', product_id: null });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [loadError, setLoadError] = useState(false); // boutique non chargée à cause du réseau (≠ introuvable)
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [ratings, setRatings] = useState({ byId: {}, shop: null }); // notes des clients, par produit et pour la boutique
  const [flyer, setFlyer] = useState(null); // photo qui « vole » vers le panier
  const flyerCount = useRef(0);
  const [myOrders, setMyOrders] = useState(() => store.get(`orders_${shopName}`, []));
  const [orderStatuses, setOrderStatuses] = useState({});
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeFilters = useCallback(() => setFilterOpen(false), []);
  const closeDelivery = useCallback(() => setDeliveryOpen(false), []);
  const [activeTab, setActiveTab] = useState('home'); // home, profile, order-tracking
  const [recentIds, setRecentIds] = useState(() => store.get(`recent_${shopName}`, []));
  const [rememberClient, setRememberClient] = useState(() => Boolean(store.get(CLIENT_KEY, null)));
  const cartRestored = useRef(false);
  const clientPrefilled = useRef(false);
  const linkedProductId = useRef(new URLSearchParams(window.location.search).get('produit')); // lien direct ?produit=…
  const sheetRef = useRef(null); // fiche produit : défile en entier sur téléphone
  const detailRef = useRef(null); // colonne de détails de la fiche (ordinateur)

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
  // on redemande le statut avec le téléphone et le PIN déjà validés :
  // toutes les 6 s quand le livreur est en route (position sur la carte), sinon toutes les 20 s.
  const trackQueryRef = useRef(null);
  const inTransit = trackResult?.status === 'IN_TRANSIT';
  useEffect(() => {
    if (!trackResult?.id || !trackQueryRef.current) return undefined;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.rpc('track_order', {
        p_phone: trackQueryRef.current.phone,
        p_pin: trackQueryRef.current.pin
      });
      if (data?.ok) setTrackResult(data.order);
    }, inTransit ? 6000 : 20000);
    return () => clearInterval(interval);
  }, [trackResult?.id, inTransit]);

  useEffect(() => {
    fetchShopData();
    setFavorites(store.get(`favs_${shopName}`, []));

    // PayDunya Return
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const orderId = params.get('orderId');
      store.remove(`cart_${shopName}`); // commande payée : on ne rouvre pas l'ancien panier
      if (orderId) {
        setPaymentStatusMessage("Paiement réussi ! Votre commande est validée.");
        fetchOrderData(orderId);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      setPaymentStatusMessage("Paiement annulé. Votre commande n'a pas été confirmée.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.has('suivi')) {
      // Lien du message WhatsApp : ouvre le suivi avec le numéro déjà rempli.
      setTrackPhone(params.get('suivi') || '');
      setActiveTab('order-tracking');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [shopName]);

  useEffect(() => {
    if (selectedProduct) {
      const options = productOptions(selectedProduct);
      setQuickViewSize(options.sizes[0] || null);
      setQuickViewColor(options.colors[0] || null);

      const fetchReviews = async () => {
         const { data } = await supabase.from('reviews').select('id, product_id, rating, comment, customer_name, verified, created_at').eq('product_id', selectedProduct.id).order('created_at', { ascending: false });
         if (data) setProductReviews(data);
      };
      fetchReviews();

      // Lien direct partageable, produits vus récemment, retour en haut de la fiche
      setProductParam(selectedProduct.id);
      setRecentIds((prev) => {
        const next = [selectedProduct.id, ...prev.filter((id) => id !== selectedProduct.id)].slice(0, 12);
        store.set(`recent_${shopName}`, next);
        return next;
      });
      sheetRef.current?.scrollTo({ top: 0 });
      detailRef.current?.scrollTo({ top: 0 });
    } else {
      setProductParam(null);
    }
  }, [selectedProduct, shopName]);

  // Thème de la vitrine : choisi par le marchand (colonne layout_style), ou aperçu demandé dans l'adresse.
  const theme = getShopTheme(previewThemeId || merchant?.layout_style);
  const accent = previewThemeId ? theme.accent : (merchant?.theme_color || theme.accent);

  // Célébration quand la commande est validée
  useEffect(() => {
    if (!orderFinalized?.id) return;
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 150, spread: 85, origin: { y: 0.55 }, colors: [accent, '#fbbf24', '#f472b6', '#ffffff'] });
    });
  }, [orderFinalized?.id, accent]);

  // Notes des clients (avis publiés) : moyenne par produit et pour toute la boutique.
  useEffect(() => {
    if (!products.length) return undefined;
    let alive = true;
    supabase.from('reviews').select('product_id, rating').in('product_id', products.slice(0, 200).map((p) => p.id)).then(({ data }) => {
      if (!alive || !Array.isArray(data)) return;
      const byId = {};
      let sum = 0;
      for (const r of data) {
        const entry = byId[r.product_id] || (byId[r.product_id] = { sum: 0, count: 0 });
        entry.sum += Number(r.rating) || 0;
        entry.count += 1;
        sum += Number(r.rating) || 0;
      }
      for (const entry of Object.values(byId)) entry.avg = entry.sum / entry.count;
      setRatings({ byId, shop: data.length ? { avg: sum / data.length, count: data.length } : null });
    });
    return () => { alive = false; };
  }, [products]);

  // Touche « / » : ouvre la recherche (ordinateur).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Commande validée : rangée dans « Mes commandes » si le client a demandé à être reconnu sur ce téléphone.
  useEffect(() => {
    const o = orderFinalized;
    if (!o?.id || !o.delivery_pin || !o.customer_phone || !store.get(CLIENT_KEY, null)) return;
    setMyOrders((prev) => {
      if (prev.some((x) => x.id === o.id)) return prev;
      const items = (o.cart_items || []).reduce((n, it) => n + (Number(it.quantity) || 0), 0);
      const next = [{ id: o.id, pin: o.delivery_pin, phone: o.customer_phone, total: o.total_amount_fcfa, at: o.created_at || new Date().toISOString(), items }, ...prev].slice(0, 10);
      store.set(`orders_${shopName}`, next);
      return next;
    });
  }, [orderFinalized, shopName]);

  // Mes commandes : état du moment, demandé avec le téléphone et le code de chaque commande.
  useEffect(() => {
    if (activeTab !== 'order-tracking' || !myOrders.length) return undefined;
    let alive = true;
    Promise.all(myOrders.slice(0, 5).map((o) => supabase.rpc('track_order', { p_phone: o.phone, p_pin: o.pin })
      .then(({ data }) => [o.id, data?.ok ? data.order?.status : null], () => [o.id, null])))
      .then((pairs) => { if (alive) setOrderStatuses(Object.fromEntries(pairs.filter(([, st]) => st))); });
    return () => { alive = false; };
  }, [activeTab, myOrders]);

  // Titre de l'onglet : le produit ouvert, sinon la boutique.
  useEffect(() => {
    if (!merchant) return;
    document.title = selectedProduct ? `${selectedProduct.name} · ${merchant.shop_name}` : `${merchant.shop_name} - Boutique en ligne`;
  }, [selectedProduct, merchant]);

  // Lien direct ?produit=… (produit partagé) : sa fiche s'ouvre une fois le catalogue chargé.
  useEffect(() => {
    if (loading || !linkedProductId.current) return;
    const linked = products.find((p) => p.id === linkedProductId.current);
    linkedProductId.current = null;
    if (linked) setSelectedProduct(linked);
  }, [loading, products]);

  // Panier gardé dans ce navigateur : on le retrouve en revenant (prix et stock du jour).
  useEffect(() => {
    if (cartRestored.current || loading || !products.length) return;
    cartRestored.current = true;
    const saved = store.get(`cart_${shopName}`, []);
    const byId = new Map(products.map((p) => [p.id, p]));
    const next = {};
    for (const line of Array.isArray(saved) ? saved : []) {
      const product = byId.get(line?.id);
      if (!product || !(line.quantity > 0)) continue;
      const room = stockLeft(product) - quantityInCart(next, product.id);
      if (room <= 0) continue;
      next[line.key] = { product, variant: line.variant || '', quantity: Math.min(line.quantity, room) };
    }
    if (Object.keys(next).length) setCart((prev) => (Object.keys(prev).length ? prev : next));
  }, [loading, products, shopName]);
  useEffect(() => {
    if (!cartRestored.current) return;
    store.set(`cart_${shopName}`, Object.entries(cart).map(([key, item]) => ({ key, id: item.product.id, variant: item.variant, quantity: item.quantity })));
  }, [cart, shopName]);

  // Données lisibles par Google (boutique et produits) et description de la page.
  useEffect(() => {
    if (!merchant) return undefined;
    const url = `${window.location.origin}/boutique/${encodeURIComponent(merchant.shop_name)}`;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: merchant.shop_name,
      description: merchant.description || undefined,
      url,
      telephone: merchant.phone_number || undefined,
      image: merchant.logo_url || merchant.banner_url || undefined,
      address: merchant.address ? { '@type': 'PostalAddress', streetAddress: merchant.address, addressCountry: 'SN' } : undefined,
      makesOffer: products.slice(0, 30).map((p) => ({
        '@type': 'Offer',
        price: p.price_fcfa,
        priceCurrency: 'XOF',
        availability: `https://schema.org/${typeof p.stock === 'number' && p.stock <= 0 ? 'OutOfStock' : 'InStock'}`,
        url: `${url}?produit=${p.id}`,
        itemOffered: { '@type': 'Product', name: p.name, description: p.description || undefined, image: p.image_url || undefined, category: p.category || undefined },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.head.appendChild(script);
    const meta = document.querySelector('meta[name="description"]');
    const previous = meta?.getAttribute('content');
    meta?.setAttribute('content', (merchant.description || `${merchant.shop_name} : boutique en ligne, livraison et paiement mobile au Sénégal.`).slice(0, 160));
    return () => {
      script.remove();
      if (meta && previous != null) meta.setAttribute('content', previous);
    };
  }, [merchant, products]);

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
    setLoadError(false);
    try {
      const { data: mData, error: mError } = await supabase
        .from('merchants')
        .select('id, shop_name, phone_number, email, address, logo_url, banner_url, description, theme_color, layout_style, social_links, delivery_zones')
        .ilike('shop_name', safeDecode(shopName))
        .single();

      // PGRST116 : aucune boutique de ce nom. Toute autre erreur : réseau ou service indisponible.
      const failed = Boolean(mError && mError.code !== 'PGRST116');
      if (failed) setLoadError(true);

      if (mData) {
        setMerchant(mData);
        document.title = `${mData.shop_name} - Boutique en ligne`;

        const { data: pData } = await supabase
          .from('products')
          .select('*')
          .eq('merchant_id', mData.id)
          .order('created_at', { ascending: false });

        if (pData) setProducts(pData);
      } else {
        document.title = failed ? 'Boutique indisponible · SamaBoutik' : 'Boutique introuvable · SamaBoutik';
      }
    } catch {
      setLoadError(true);
      document.title = 'Boutique indisponible · SamaBoutik';
    }
    setLoading(false);
  };

  const toggleFavorite = (productId) => {
    setFavorites(prev => {
      const newFavs = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      store.set(`favs_${shopName}`, newFavs);
      return newFavs;
    });
  };

  // warn : avertissement (ex. stock atteint) plutôt que confirmation.
  const showToast = (message, { warn = false, cart: toCart = false } = {}) => {
    setToastMessage({ text: message, warn, cart: toCart });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product, size = null, color = null, { openCart = true } = {}) => {
    let variantDesc = '';
    if (size) variantDesc += size;
    if (size && color) variantDesc += ' - ';
    if (color) variantDesc += color;

    const cartKey = variantDesc ? `${product.id}-${variantDesc}` : product.id;

    // Le panier ne dépasse pas le stock (la base refuse de toute façon une commande au-delà).
    if (quantityInCart(cart, product.id) >= stockLeft(product)) {
      showToast(stockMessage(product), { warn: true });
      return false;
    }

    setCart(prev => ({
      ...prev,
      [cartKey]: {
        product,
        variant: variantDesc,
        quantity: (prev[cartKey]?.quantity || 0) + 1
      }
    }));

    showToast(`${product.name} ajouté au panier`, { cart: true });
    if (openCart) setIsCartOpen(true);
    if (selectedProduct) setSelectedProduct(null);
    return true;
  };

  // Ajout depuis la grille : le visiteur continue ses achats (le panier ne s'ouvre pas).
  // Produit à tailles ou couleurs : on ouvre sa fiche pour choisir.
  // Le produit « vole » jusqu'au panier (sauf si le visiteur préfère moins d'animations).
  const flyToCart = (product, button) => {
    if (!product.image_url || !button || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const target = [...document.querySelectorAll('[data-cart-target]')].find((el) => el.offsetParent !== null);
    const source = button.closest('.group')?.querySelector('img') || button;
    if (!target) return;
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    setFlyer({
      key: (flyerCount.current += 1),
      src: thumbUrl(product.image_url),
      from: { x: from.left + from.width / 2 - 28, y: from.top + from.height / 2 - 28 },
      to: { x: to.left + to.width / 2 - 28, y: to.top + to.height / 2 - 28 },
    });
  };

  const quickAdd = (product, event) => {
    if (needsChoice(product)) { setSelectedProduct(product); return; }
    if (!addToCart(product, null, null, { openCart: false })) return;
    flyToCart(product, event?.currentTarget);
    navigator.vibrate?.(12);
    setJustAdded(product.id);
    setTimeout(() => setJustAdded((id) => (id === product.id ? null : id)), 1400);
  };

  const updateQuantity = (cartKey, delta) => {
    const item = cart[cartKey];
    if (item && delta > 0 && quantityInCart(cart, item.product.id) + delta > stockLeft(item.product)) {
      showToast(stockMessage(item.product), { warn: true });
      return;
    }
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
  const contactDone = Boolean(checkoutData.name.trim() && checkoutData.phone.replace(/\D/g, '').length >= 7 && checkoutData.address.trim() && checkoutData.zone);
  const checkoutSteps = [
    { label: 'Articles', done: cartItemsCount > 0 },
    { label: 'Coordonnées', done: contactDone },
    { label: 'Paiement', done: contactDone && Boolean(checkoutData.paymentMethod) },
  ];

  // Coordonnées mémorisées (si le client l'a demandé) : remplies à la première ouverture du panier.
  useEffect(() => {
    if (!isCartOpen || clientPrefilled.current || !activeZones.length) return;
    clientPrefilled.current = true;
    const saved = store.get(CLIENT_KEY, null);
    if (!saved) return;
    setCheckoutData((prev) => (prev.name || prev.phone || prev.address ? prev : {
      ...prev,
      name: saved.name || '',
      phone: saved.phone || '',
      address: saved.address || '',
      zone: activeZones.some((z) => z.name === saved.zone) ? saved.zone : prev.zone,
    }));
  }, [isCartOpen, activeZones]);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) return;

    setIsSubmitting(true);
    if (rememberClient) store.set(CLIENT_KEY, { name: checkoutData.name, phone: checkoutData.phone, address: checkoutData.address, zone: checkoutData.zone });
    try {
      const cartItemsArray = Object.values(cart).map(item => ({
        product_id: item.product.id,
        name: item.variant ? `${item.product.name} (${item.variant})` : item.product.name,
        price: item.product.price_fcfa,
        quantity: item.quantity
      }));

      if (isMobileChannel(checkoutData.paymentMethod)) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // Serveur de paiement injoignable alors qu'internet fonctionne : on propose le paiement à la livraison.
        const paymentDown = "Le paiement en ligne est momentanément indisponible. Réessayez dans un instant ou choisissez le paiement à la livraison.";
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
              cartItems: cartItemsArray,
              channel: checkoutData.paymentMethod, // wave, orange_money, free_money ou wizall
            }
          })
        }).catch(() => { throw new Error(isOffline() ? NETWORK_MESSAGE : paymentDown); });

        const result = await response.json().catch(() => ({}));

        if (result.success && result.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          throw new Error(result.error || paymentDown);
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
      alert(friendlyError(err, "La commande n'a pas pu être validée. Réessayez dans un instant."));
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
    return `https://wa.me/${whatsappNumber(merchant.phone_number)}?text=${encodeURIComponent(text)}`;
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
      alert(friendlyError(err, "Erreur lors de l'envoi de l'avis"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const runTrack = async (phoneValue, pinValue) => {
    setTrackError('');
    setTrackResult(null);
    if (!phoneValue || !pinValue) {
      setTrackError('Veuillez remplir tous les champs');
      return;
    }
    setTrackLoading(true);
    try {
      const query = { phone: String(phoneValue).trim(), pin: String(pinValue).trim().toUpperCase() };
      const { data, error } = await supabase.rpc('track_order', { p_phone: query.phone, p_pin: query.pin });

      if (error) setTrackError(friendlyError(error, 'Erreur de connexion'));
      else if (!data?.ok) setTrackError(data?.error || 'Commande introuvable ou code PIN incorrect');
      else {
        trackQueryRef.current = query;
        setTrackResult(data.order);
      }
    } catch (err) {
      setTrackError(friendlyError(err, 'Erreur de connexion'));
    }
    setTrackLoading(false);
  };
  const handleTrackOrder = (e) => { e.preventDefault(); runTrack(trackPhone, trackPin); };
  const trackSavedOrder = (o) => { setTrackPhone(o.phone); setTrackPin(o.pin); runTrack(o.phone, o.pin); };
  const removeSavedOrder = (id) => setMyOrders((prev) => { const next = prev.filter((o) => o.id !== id); store.set(`orders_${shopName}`, next); return next; });

  // Navigation
  const goHome = () => { setActiveTab('home'); setShowFavoritesOnly(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goToCatalog = () => {
    setActiveTab('home');
    setTimeout(() => document.getElementById('shop-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const openTab = (tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
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
  const categoryCounts = categories.filter((c) => c !== 'Tous').map((name) => ({ name, count: products.filter((p) => (p.category || 'Autres') === name).length }));
  const matchesView = (p, f) => searchScore(p, searchQuery) > 0
    && (selectedCategory === 'Tous' || (p.category || 'Autres') === selectedCategory)
    && (!showFavoritesOnly || favorites.includes(p.id))
    && matchesFilters(p, f);
  let processedProducts = products.filter((p) => matchesView(p, filters));
  const filterCount = activeFilterCount(filters);
  const sorts = ratings.shop ? [...SORTS, RATING_SORT] : SORTS;
  const ratingOf = (p) => ratings.byId[p.id] || { avg: 0, count: 0 };

  if (sortBy === 'price_asc') processedProducts.sort((a,b) => a.price_fcfa - b.price_fcfa);
  if (sortBy === 'price_desc') processedProducts.sort((a,b) => b.price_fcfa - a.price_fcfa);
  if (sortBy === 'rating') processedProducts.sort((a, b) => ratingOf(b).avg - ratingOf(a).avg || ratingOf(b).count - ratingOf(a).count);

  // Recherche plein écran
  const showSearchResults = (q) => { setSearchQuery(q); setSelectedCategory('Tous'); setShowFavoritesOnly(false); setSearchOpen(false); goToCatalog(); };
  const pickCategory = (cat) => { setSearchQuery(''); setSelectedCategory(cat); setShowFavoritesOnly(false); setSearchOpen(false); goToCatalog(); };
  const openFromSearch = (p) => { setSearchOpen(false); setSelectedProduct(p); };
  const resetCatalog = () => { setSearchQuery(''); setSelectedCategory('Tous'); setShowFavoritesOnly(false); setFilters(NO_FILTERS); };

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

  if (!merchant && !loading) {
    if (loadError) return (
      <StatusScreen
        icon={WifiOff}
        kicker="Connexion"
        title="Boutique momentanément indisponible"
        actions={[
          { label: 'Réessayer', icon: RotateCw, onClick: fetchShopData, primary: true },
          { to: '/', label: 'Retour à l’accueil', icon: House },
        ]}
      >
        {isOffline()
          ? 'Vous semblez hors ligne. Vérifiez votre connexion internet, puis réessayez.'
          : 'La boutique n’a pas pu se charger. Réessayez dans un instant.'}
      </StatusScreen>
    );
    const askedName = safeDecode(shopName);
    return (
      <StatusScreen
        icon={Store}
        kicker="Boutique introuvable"
        title={<>Aucune boutique « {askedName.length > 40 ? `${askedName.slice(0, 39)}…` : askedName} »</>}
        actions={[
          { to: '/boutiques', label: 'Chercher dans l’annuaire', icon: Search, primary: true },
          { to: '/', label: 'Retour à l’accueil', icon: House },
        ]}
        footer={<>Vous êtes commerçant ? <Link to="/register">Créez votre boutique gratuitement</Link></>}
      >
        Le lien est peut-être mal écrit, ou la boutique a changé de nom. Vérifiez le lien reçu, ou cherchez-la dans l’annuaire.
      </StatusScreen>
    );
  }

  const socialLinks = merchant?.social_links || {};
  const paymentOk = paymentStatusMessage?.includes('réussi');
  // Bannière du marchand, sinon la photo d'ambiance du thème.
  const heroImage = merchant?.banner_url ? { src: merchant.banner_url } : theme.banner;

  // Partage de la boutique ou d'un produit (le lien ouvre directement sa fiche).
  const shopUrl = `${window.location.origin}/boutique/${encodeURIComponent(merchant?.shop_name || safeDecode(shopName))}`;
  const productUrl = (p) => `${shopUrl}?produit=${p.id}`;
  const shareShop = () => shareLink(
    { title: merchant.shop_name, text: `Découvrez ${merchant.shop_name} : commandez en ligne, livraison et paiement mobile.`, url: shopUrl },
    () => showToast('Lien de la boutique copié'),
  );
  const shareProduct = (p) => shareLink(
    { title: p.name, text: `${p.name} · ${fmt(p.price_fcfa)} FCFA chez ${merchant.shop_name}`, url: productUrl(p) },
    () => showToast('Lien du produit copié'),
  );
  const askOnWhatsApp = (p) => `https://wa.me/${whatsappNumber(merchant.phone_number)}?text=${encodeURIComponent(`Bonjour ${merchant.shop_name}, j'ai une question sur « ${p.name} » (${fmt(p.price_fcfa)} FCFA) : ${productUrl(p)}`)}`;
  const recentProducts = recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const clearRecent = () => { setRecentIds([]); store.remove(`recent_${shopName}`); };
  const sameCategory = (p) => (p.category || 'Autres') === (selectedProduct?.category || 'Autres');
  const similarProducts = selectedProduct
    ? products.filter((p) => p.id !== selectedProduct.id).sort((a, b) => Number(sameCategory(b)) - Number(sameCategory(a))).slice(0, 8)
    : [];
  const selectedOptions = productOptions(selectedProduct);

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="shop-root relative min-h-screen pb-28 font-sans md:pb-0"
      data-shop-theme={theme.id}
      data-shop-tone={theme.light ? 'light' : 'dark'}
      style={themeStyle(theme, accent)}
    >

      {/* TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.button
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => toastMessage.cart && setIsCartOpen(true)}
            className="fixed bottom-28 left-1/2 z-[100] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-slate-900/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-2xl md:bottom-8"
          >
            {toastMessage.warn
              ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-900"><TriangleAlert className="h-4 w-4" strokeWidth={2.5} /></span>
              : <span className="theme-gradient flex h-7 w-7 items-center justify-center rounded-full"><Check className="h-4 w-4" strokeWidth={3} /></span>}
            <span className="text-sm font-bold">{toastMessage.text}</span>
            {toastMessage.cart && !isCartOpen && <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-white/60">Voir <ChevronRight className="h-3.5 w-3.5" /></span>}
          </motion.button>
        )}
      </AnimatePresence>

      {/* PRODUIT QUI VOLE VERS LE PANIER */}
      <AnimatePresence>
        {flyer && (
          <motion.img
            key={flyer.key}
            src={flyer.src}
            alt=""
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[110] h-14 w-14 rounded-full object-cover shadow-2xl ring-4 ring-white"
            initial={{ x: flyer.from.x, y: flyer.from.y, scale: 1.4, opacity: 0 }}
            animate={{ x: [flyer.from.x, (flyer.from.x + flyer.to.x) / 2, flyer.to.x], y: [flyer.from.y, Math.min(flyer.from.y, flyer.to.y) - 140, flyer.to.y], scale: [1.4, 1, 0.35], opacity: [1, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1] }}
            onAnimationComplete={() => setFlyer(null)}
          />
        )}
      </AnimatePresence>

      {/* RECHERCHE, FILTRES, LIVRAISON */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            key="search"
            initialQuery={searchQuery}
            products={products}
            categories={categoryCounts}
            recentKey={`searches_${shopName}`}
            categoryIcon={categoryIcon}
            onClose={closeSearch}
            onOpenProduct={openFromSearch}
            onShowResults={showSearchResults}
            onPickCategory={pickCategory}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {filterOpen && (
          <FilterSheet
            key="filters"
            filters={filters}
            sortBy={sortBy}
            sorts={sorts}
            prices={products.map((p) => p.price_fcfa)}
            countFor={(f) => products.filter((p) => matchesView(p, f)).length}
            onApply={(f, sort) => { setFilters(f); setSortBy(sort); setFilterOpen(false); }}
            onClose={closeFilters}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deliveryOpen && <DeliverySheet key="delivery" zones={activeZones} onClose={closeDelivery} />}
      </AnimatePresence>

      {/* APERÇU D'UN THÈME (lien envoyé depuis le tableau de bord) */}
      {previewThemeId && (
        <div className="theme-gradient flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-bold">
          <Palette className="h-4 w-4 shrink-0" /> Aperçu du thème « {theme.name} » : rien n'est enregistré.
        </div>
      )}

      {/* BANDEAU DÉFILANT */}
      <div className="sh-panel relative overflow-hidden py-2.5 text-xs font-semibold">
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex shrink-0 items-center gap-8 px-4">
                  <span className="flex items-center gap-2"><Truck className="theme-text h-3.5 w-3.5" /> Livraison rapide</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><Smartphone className="theme-text h-3.5 w-3.5" /> Wave, Orange Money, Free Money, Wizall</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><Lock className="theme-text h-3.5 w-3.5" /> Paiement à la livraison</span>
                  <span className="text-white/30">✦</span>
                  <span className="flex items-center gap-2"><ShieldCheck className="theme-text h-3.5 w-3.5" /> Code PIN sécurisé</span>
                  <span className="text-white/30">✦</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* EN-TÊTE */}
      <header className="sh-header sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={goHome} className="group flex min-w-0 items-center gap-3 text-left">
            {merchant?.logo_url ? (
              <span className="sh-border sh-r-sm h-11 w-11 shrink-0 overflow-hidden bg-white">
                <img src={merchant.logo_url} alt={merchant.shop_name} decoding="async" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span className="theme-gradient sh-r-sm flex h-11 w-11 shrink-0 items-center justify-center">
                <Store className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0">
              <span className="sh-display sh-ink block truncate text-lg md:text-xl">{merchant?.shop_name || 'Boutique'}</span>
              <span className="sh-muted flex items-center gap-1.5 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Boutique en ligne
              </span>
            </span>
          </button>

          <button type="button" onClick={() => setSearchOpen(true)} className="sh-search relative mx-auto hidden max-w-xl flex-1 items-center py-3 pl-12 pr-3 text-left text-sm font-medium md:flex" aria-label="Rechercher un produit">
            <Search className="sh-faint pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
            <span className={`truncate ${searchQuery ? 'sh-ink' : 'sh-faint'}`}>{searchQuery || searchPlaceholder}</span>
            <kbd className="sh-fill sh-muted ml-auto hidden shrink-0 rounded-md px-2 py-0.5 font-sans text-[11px] font-bold lg:block" aria-hidden="true">/</kbd>
          </button>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <button onClick={() => openTab('order-tracking')} className={`sh-r-sm flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'order-tracking' ? 'theme-soft theme-text' : 'sh-muted sh-hover'}`}>
              <Package className="h-4 w-4" /> Suivi
            </button>
            <button onClick={() => openTab('profile')} className={`sh-r-sm flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'profile' ? 'theme-soft theme-text' : 'sh-muted sh-hover'}`}>
              <Info className="h-4 w-4" /> À propos
            </button>
            <button onClick={toggleFavoritesView} className="sh-muted sh-hover sh-r-sm relative p-2.5" aria-label="Mes favoris">
              {showFavoritesOnly ? <HeartFill className="h-5 w-5 text-rose-500" /> : <Heart className="h-5 w-5" />}
              {favorites.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{favorites.length}</span>}
            </button>
            <Link to={`/livreur/${encodeURIComponent(shopName)}`} className="sh-muted sh-hover sh-r-sm p-2.5" title="Accès livreur" aria-label="Accès livreur">
              <Bike className="h-5 w-5" />
            </Link>
            <motion.button data-cart-target whileTap={{ scale: 0.95 }} onClick={() => setIsCartOpen(true)} className="theme-gradient theme-glow sh-r-md ml-2 flex items-center gap-2 px-4 py-2.5 text-sm font-bold">
              <ShoppingBag className="h-5 w-5" /> Panier
              <motion.span key={cartItemsCount} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs">
                {cartItemsCount}
              </motion.span>
            </motion.button>
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button onClick={() => setSearchOpen(true)} className="sh-fill sh-ink-2 sh-r-sm p-2.5" aria-label="Rechercher un produit">
              <Search className="h-5 w-5" />
            </button>
            {merchant && (
              <button onClick={shareShop} className="sh-fill sh-ink-2 sh-r-sm p-2.5" aria-label="Partager la boutique">
                <Share2 className="h-5 w-5" />
              </button>
            )}
            {merchant?.phone_number && (
              <a href={`https://wa.me/${whatsappNumber(merchant.phone_number)}`} target="_blank" rel="noreferrer" className="sh-r-sm flex items-center justify-center bg-[#25D366] p-2.5 text-white shadow-md shadow-green-600/25" aria-label="Contacter le vendeur sur WhatsApp">
                <WhatsApp className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

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
              <div className="sh-fill sh-r-lg mb-12 h-[440px] animate-pulse" />
            ) : (
              <section className="sh-hero sh-r-lg relative mb-10 overflow-hidden md:mb-14">
                <img
                  src={heroImage.src}
                  srcSet={heroImage.srcSet}
                  sizes={heroImage.srcSet ? '(min-width: 1280px) 1216px, 100vw' : undefined}
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  className="sh-hero-photo ken-burns absolute inset-0 h-full w-full object-cover"
                />
                <div className="sh-hero-overlay absolute inset-0" />

                <div className="relative grid min-h-[440px] items-center gap-10 p-7 md:min-h-[520px] md:p-12 lg:grid-cols-[1.15fr_1fr]">
                  <div>
                    <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="sh-hero-chip mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur">
                      <Sparkles className="theme-text h-3.5 w-3.5" /> {products.length} article{products.length > 1 ? 's' : ''} en ligne
                    </motion.p>
                    <motion.h1
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.05, ease: EASE }}
                      className="sh-display mb-5 break-words text-[2.75rem] leading-[1.04] sm:text-6xl md:text-7xl"
                    >
                      {merchant?.shop_name}
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE }} className="sh-hero-muted mb-8 max-w-xl text-lg md:text-xl">
                      {merchant?.description || 'Découvrez notre sélection de produits, livrés chez vous.'}
                    </motion.p>
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: EASE }} className="flex flex-wrap gap-3">
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={goToCatalog} className="sh-hero-cta sh-r-md group inline-flex items-center gap-2 px-7 py-4 font-bold shadow-lg">
                        Découvrir la boutique <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </motion.button>
                      <button onClick={() => openTab('order-tracking')} className="sh-hero-chip sh-r-md inline-flex items-center gap-2 px-6 py-4 font-semibold backdrop-blur transition-opacity hover:opacity-90">
                        <Package className="h-5 w-5" /> Suivre ma commande
                      </button>
                      {/* Sur téléphone, le partage est dans l'en-tête */}
                      <button onClick={shareShop} className="sh-hero-chip sh-r-md hidden items-center justify-center px-4 py-4 backdrop-blur transition-opacity hover:opacity-90 sm:inline-flex" aria-label="Partager la boutique" title="Partager la boutique">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-wrap gap-2">
                      {[
                        ratings.shop && { icon: Star, star: true, text: `${ratingText(ratings.shop.avg)}/5 · ${ratings.shop.count} avis` },
                        { icon: Truck, text: `Livraison dans ${activeZones.length} zone${activeZones.length > 1 ? 's' : ''}`, onClick: activeZones.length ? () => setDeliveryOpen(true) : null },
                        { icon: Smartphone, text: 'Paiement mobile ou à la livraison' },
                        { icon: ShieldCheck, text: 'Code PIN à la livraison' },
                      ].filter(Boolean).map((c) => {
                        const content = <><c.icon className={`h-4 w-4 ${c.star ? 'text-amber-400' : 'theme-text'}`} /> {c.text}{c.onClick && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}</>;
                        return c.onClick ? (
                          <button key={c.text} type="button" onClick={c.onClick} className="sh-hero-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur transition-opacity hover:opacity-90">{content}</button>
                        ) : (
                          <span key={c.text} className="sh-hero-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur">{content}</span>
                        );
                      })}
                    </motion.div>
                  </div>

                  {/* Produits vedettes (grand écran) */}
                  <div className="relative hidden h-[400px] lg:block">
                    {featured.map((p, i) => {
                      const pos = [{ left: '0%', top: '0%', zIndex: 10 }, { right: '0%', top: '84px', zIndex: 30 }, { left: 'calc(50% - 96px)', bottom: '0%', zIndex: 20 }][i];
                      const rot = [-5, 4, -2][i];
                      return (
                        <motion.button
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          initial={{ opacity: 0, y: 60, rotate: rot * 2 }}
                          animate={{ opacity: 1, y: 0, rotate: rot }}
                          transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 120, damping: 16 }}
                          whileHover={{ scale: 1.05, rotate: 0, zIndex: 40 }}
                          className="absolute w-44 text-left"
                          style={pos}
                        >
                          <span className="sh-surface sh-r-md block p-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]">
                            <img src={thumbUrl(p.image_url)} onError={fallbackToFull(p.image_url)} alt={p.name} loading="lazy" decoding="async" className="sh-r-sm aspect-square w-full object-cover" />
                            <span className="block px-2 pb-1 pt-2">
                              <span className="sh-ink block truncate text-sm font-bold">{p.name}</span>
                              <span className="theme-text block text-sm font-extrabold">{fmt(p.price_fcfa)} F</span>
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* STORIES */}
            {products.some((p) => p.image_url) && (
              <section className="mb-10">
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="theme-text h-5 w-5" />
                  <h2 className="sh-display sh-ink text-lg">En ce moment</h2>
                </div>
                <StoreStories products={products} onProductClick={(p) => setSelectedProduct(p)} />
              </section>
            )}

            {/* VUS RÉCEMMENT */}
            {!loading && recentProducts.length >= 2 && (
              <section className="mb-10" aria-label="Vus récemment">
                <div className="mb-3 flex items-center gap-2">
                  <History className="theme-text h-5 w-5" />
                  <h2 className="sh-display sh-ink text-lg">Vus récemment</h2>
                  <button type="button" onClick={clearRecent} className="sh-muted ml-auto min-h-9 px-2 text-xs font-semibold hover:underline">Effacer</button>
                </div>
                <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
                  {recentProducts.map((p) => <MiniProduct key={p.id} product={p} onOpen={() => setSelectedProduct(p)} />)}
                </div>
              </section>
            )}

            {/* CATALOGUE */}
            <section id="shop-grid" className="scroll-mt-24">
              <div className="mb-5">
                <p className="theme-text text-sm font-bold uppercase tracking-widest">Catalogue</p>
                <h2 className="sh-display sh-ink text-3xl md:text-4xl">Parcourez nos catégories</h2>
              </div>

              <div className="-mx-4 mb-8 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:flex-wrap md:px-0">
                {categories.map((cat, i) => {
                  const Icon = categoryIcon(cat);
                  const active = selectedCategory === cat;
                  const count = cat === 'Tous' ? products.length : products.filter((p) => (p.category || 'Autres') === cat).length;
                  return (
                    <motion.button
                      key={cat}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedCategory(cat)}
                      aria-pressed={active}
                      className={`sh-r-md flex shrink-0 items-center gap-3 py-2 pl-2 pr-5 transition-colors ${active ? 'theme-gradient theme-glow' : 'sh-surface sh-border sh-ink-2 hover:border-[color:var(--shop-faint)]'}`}
                    >
                      <span className={`sh-r-sm flex h-11 w-11 items-center justify-center ${active ? 'bg-white/20' : 'theme-soft theme-text'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-left">
                        <span className="block text-sm font-bold">{cat}</span>
                        <span className={`block text-[11px] ${active ? 'opacity-75' : 'sh-faint'}`}>{count} article{count > 1 ? 's' : ''}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="sh-display sh-ink text-xl">
                    {showFavoritesOnly ? 'Mes favoris' : selectedCategory === 'Tous' ? 'Tous les produits' : selectedCategory}
                  </h3>
                  <p className="sh-muted text-sm">
                    {processedProducts.length} article{processedProducts.length > 1 ? 's' : ''}{searchQuery && ` pour « ${searchQuery} »`}
                  </p>
                </div>
                <div className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                    aria-pressed={showFavoritesOnly}
                    className={`sh-r-md flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-bold transition-colors ${showFavoritesOnly ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'sh-surface sh-border sh-muted'}`}
                  >
                    {showFavoritesOnly ? <HeartFill className="h-4 w-4" /> : <Heart className="h-4 w-4" />} Favoris
                    {favorites.length > 0 && <span className={`rounded-full px-1.5 text-xs ${showFavoritesOnly ? 'bg-white/25' : 'bg-rose-50 text-rose-600'}`}>{favorites.length}</span>}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilterOpen(true)}
                    className={`sh-r-md flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-bold transition-colors ${filterCount ? 'theme-gradient' : 'sh-surface sh-border sh-muted'}`}
                  >
                    <SlidersHorizontal className="h-4 w-4" /> Filtres
                    {filterCount > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{filterCount}</span>}
                  </motion.button>
                  <div className="sh-surface sh-border sh-r-md flex shrink-0 p-1" role="group" aria-label="Trier">
                    {sorts.map((s) => (
                      <button key={s.id} onClick={() => setSortBy(s.id)} aria-pressed={sortBy === s.id} className={`sh-r-sm relative min-h-9 whitespace-nowrap px-3 py-1.5 text-sm font-semibold transition-colors ${sortBy === s.id ? 'text-[color:var(--shop-bg)]' : 'sh-muted hover:text-[color:var(--shop-ink)]'}`}>
                        {sortBy === s.id && <motion.span layoutId="sort-pill" className="sh-invert sh-r-sm absolute inset-0" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <span className="relative">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(searchQuery || filterCount > 0) && (
                <div className="-mt-2 mb-6 flex flex-wrap gap-2">
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="theme-soft theme-text sh-r-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" aria-label={`Effacer la recherche « ${searchQuery} »`}>
                      <Search className="h-3.5 w-3.5" /> « {searchQuery} » <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(filters.minPrice != null || filters.maxPrice != null) && (
                    <button type="button" onClick={() => setFilters((f) => ({ ...f, minPrice: null, maxPrice: null }))} className="theme-soft theme-text sh-r-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" aria-label="Retirer le filtre de prix">
                      {priceRangeLabel(filters)} <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {filters.inStock && (
                    <button type="button" onClick={() => setFilters((f) => ({ ...f, inStock: false }))} className="theme-soft theme-text sh-r-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold" aria-label="Retirer le filtre « en stock »">
                      En stock <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="sh-card overflow-hidden">
                      <div className="sh-fill aspect-[4/5] animate-pulse" />
                      <div className="space-y-2 p-4">
                        <div className="sh-fill h-3 w-1/3 animate-pulse rounded-full" />
                        <div className="sh-fill h-4 w-2/3 animate-pulse rounded-full" />
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
                      onAdd={(e) => quickAdd(p, e)}
                      rating={ratings.byId[p.id]}
                      choose={needsChoice(p)}
                      onToggleFavorite={() => toggleFavorite(p.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="sh-card px-6 py-20 text-center">
                  <span className="theme-soft theme-text sh-r-md mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                    {showFavoritesOnly ? <Heart className="h-9 w-9" /> : <Search className="h-9 w-9" />}
                  </span>
                  <h3 className="sh-display sh-ink mb-2 text-xl">{showFavoritesOnly ? 'Aucun favori pour le moment' : 'Aucun produit trouvé'}</h3>
                  <p className="sh-muted mb-6">{showFavoritesOnly ? 'Touchez le cœur d\'un produit pour le retrouver ici.' : 'Essayez de modifier vos filtres ou votre recherche.'}</p>
                  <button onClick={resetCatalog} className="sh-invert sh-r-md px-6 py-3 text-sm font-bold">
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
                  { icon: Smartphone, title: 'Paiement mobile', text: 'Wave, Orange Money, Free Money, Wizall ou à la livraison' },
                  { icon: ShieldCheck, title: 'Code PIN', text: 'Votre colis n\'est remis qu\'à vous' },
                  { icon: MessageCircle, title: 'Contact direct', text: 'Une question ? Écrivez-nous sur WhatsApp' },
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
                    className="sh-card p-5 md:p-6"
                  >
                    <span className="theme-soft theme-text sh-r-sm mb-4 flex h-12 w-12 items-center justify-center">
                      <f.icon className="h-6 w-6" />
                    </span>
                    <p className="sh-ink font-bold">{f.title}</p>
                    <p className="sh-muted mt-1 text-sm">{f.text}</p>
                  </motion.div>
                ))}
              </section>
            )}
          </>
        )}

        {/* SUIVI DE COMMANDE */}
        {activeTab === 'order-tracking' && (
          <div className="mx-auto max-w-3xl py-2 md:py-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.6 }} className="sh-panel sh-r-lg relative overflow-hidden p-7 md:p-10">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--shop)' }} aria-hidden="true" />
              <div className="relative">
                <span className="theme-gradient sh-r-sm mb-5 flex h-14 w-14 items-center justify-center shadow-lg">
                  <Package className="h-7 w-7" />
                </span>
                <h2 className="sh-display text-3xl">Suivre ma commande</h2>
                <p className="mt-2 text-white/70">Entrez le téléphone utilisé et le code PIN reçu après votre commande.</p>
                <form onSubmit={handleTrackOrder} className="mt-8 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input type="tel" placeholder="Téléphone" aria-label="Téléphone" value={trackPhone} onChange={e => setTrackPhone(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 py-4 pl-11 pr-4 font-medium text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:bg-white/15" required />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input type="text" placeholder="Code PIN" aria-label="Code PIN" value={trackPin} onChange={e => setTrackPin(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 py-4 pl-11 pr-4 font-extrabold uppercase tracking-[0.3em] text-white outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-white/40 focus:border-white/30 focus:bg-white/15" required />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={trackLoading} className="theme-gradient sh-r-md flex items-center justify-center gap-2 px-6 py-4 font-bold disabled:opacity-60">
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

            <MyOrders orders={myOrders} statuses={orderStatuses} onTrack={trackSavedOrder} onRemove={removeSavedOrder} />

            {trackResult && (() => {
              const stepIndex = TRACK_STEPS.findIndex((s) => s.id === trackResult.status);
              return (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.6 }} className="sh-card mt-6 p-6 md:p-8">
                  <div className="sh-line mb-8 flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
                    <div>
                      <p className="sh-faint text-xs font-bold uppercase tracking-widest">Commande n°</p>
                      <p className="sh-ink font-mono text-xl font-extrabold tracking-widest">{trackResult.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="sh-faint text-xs font-bold uppercase tracking-widest">Montant total</p>
                      <p className="theme-text text-2xl font-extrabold">{fmt(trackResult.total_amount_fcfa)} FCFA</p>
                    </div>
                  </div>

                  {trackResult.status === 'CANCELLED' ? (
                    <div className="py-6 text-center">
                      <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10"><CircleX className="h-10 w-10 text-red-500" /></span>
                      <h4 className="sh-ink mb-2 text-xl font-extrabold">Commande annulée</h4>
                      <p className="sh-muted">Votre commande a été annulée. Contactez la boutique pour plus de détails.</p>
                    </div>
                  ) : trackResult.status === 'DISPUTED' ? (
                    <div className="py-6 text-center">
                      <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10"><TriangleAlert className="h-10 w-10 text-amber-500" /></span>
                      <h4 className="sh-ink mb-2 text-xl font-extrabold">Commande en litige</h4>
                      <p className="sh-muted">La boutique examine votre commande. Contactez-la sur WhatsApp si besoin.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="sh-fill-2 absolute left-[12.5%] right-[12.5%] top-6 h-1.5 rounded-full sm:top-7">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.max(0, stepIndex) / (TRACK_STEPS.length - 1)) * 100}%` }} transition={{ duration: 1.2, ease: EASE }} className="theme-gradient h-full rounded-full" />
                      </div>
                      <div className="relative grid grid-cols-4 gap-1 sm:gap-2">
                        {TRACK_STEPS.map((s, i) => {
                          const done = i <= stepIndex;
                          const current = i === stepIndex;
                          return (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex flex-col items-center text-center">
                              <span className="relative flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
                                {current && trackResult.status !== 'DELIVERED' && <span className="theme-bg sh-r-sm absolute inset-0 animate-ping opacity-25" />}
                                <span className={`sh-r-sm relative flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14 ${done ? 'theme-gradient' : 'sh-fill sh-faint'}`}>
                                  <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                </span>
                              </span>
                              <span className={`mt-2.5 text-[11px] font-extrabold leading-tight sm:text-xs sm:uppercase sm:tracking-wider md:text-sm ${done ? 'sh-ink' : 'sh-faint'}`}>{s.label}</span>
                              <span className="sh-muted hidden text-xs md:block">{s.sub}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {trackResult.status === 'IN_TRANSIT' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="sh-panel sh-r-md mt-8 flex flex-col gap-5 overflow-hidden p-6 sm:flex-row sm:items-center">
                      {trackResult.driver_name && (
                        <div className="flex flex-1 items-center gap-4">
                          <span className="sh-r-sm relative flex h-14 w-14 shrink-0 items-center justify-center bg-white/10 text-xl font-extrabold">
                            {trackResult.driver_name.charAt(0)}
                            <span className="theme-gradient absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-[color:var(--shop-panel)]">
                              <Bike className="h-3.5 w-3.5" />
                            </span>
                          </span>
                          <div>
                            <p className="text-xs text-white/60">Votre livreur est en route</p>
                            <p className="text-lg font-extrabold">{trackResult.driver_name}</p>
                            {trackResult.driver_phone && (
                              <a href={`tel:${trackResult.driver_phone}`} className="theme-text mt-1 inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
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

                  {trackResult.status === 'IN_TRANSIT' && (
                    <Suspense fallback={<div className="sh-fill sh-r-md mt-6 h-72 animate-pulse" />}>
                      <LiveDeliveryMap position={trackResult.driver_position} address={trackResult.customer_address} themeColor={accent} />
                    </Suspense>
                  )}

                  {trackResult.status === 'DELIVERED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
                      <PartyPopper className="h-6 w-6 shrink-0" />
                      <p className="text-sm font-semibold">Commande livrée. Merci pour votre confiance !</p>
                    </motion.div>
                  )}

                  {trackResult.cart_items?.length > 0 && (
                    <div className="sh-line mt-8 border-t pt-6">
                      <p className="sh-faint mb-3 text-xs font-bold uppercase tracking-widest">Articles</p>
                      <div className="flex flex-wrap gap-2">
                        {trackResult.cart_items.map((it, idx) => (
                          <span key={idx} className="sh-fill sh-border sh-ink-2 sh-r-sm inline-flex items-center gap-2 px-3 py-1.5 text-sm">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.6 }} className="mx-auto max-w-4xl py-2 md:py-6">
            <div className="sh-card overflow-hidden">
              <div className="sh-panel relative h-52 overflow-hidden md:h-64">
                <img src={heroImage.src} srcSet={heroImage.srcSet} sizes={heroImage.srcSet ? '(min-width: 896px) 896px, 100vw' : undefined} alt="" loading="lazy" decoding="async" className="ken-burns absolute inset-0 h-full w-full object-cover opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="relative flex flex-col items-center px-6 pb-12 text-center md:px-10">
                <div className="sh-r-lg -mt-16 h-32 w-32 overflow-hidden border-4 bg-white shadow-xl" style={{ borderColor: 'var(--shop-surface)' }}>
                  {merchant?.logo_url ? (
                    <img src={merchant.logo_url} alt="Logo" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <span className="theme-gradient flex h-full w-full items-center justify-center"><Store className="h-14 w-14" /></span>
                  )}
                </div>
                <h2 className="sh-display sh-ink mt-6 text-4xl">{merchant?.shop_name}</h2>
                <p className="sh-muted mt-3 max-w-lg text-lg leading-relaxed">{merchant?.description || "Une boutique d'exception."}</p>

                <div className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3">
                  {[
                    { value: products.length, label: 'Produits' },
                    { value: categories.length - 1, label: 'Catégories' },
                    { value: activeZones.length, label: 'Zones livrées' },
                  ].map((s) => (
                    <div key={s.label} className="theme-soft sh-r-md py-4">
                      <p className="theme-text text-2xl font-extrabold">{s.value}</p>
                      <p className="sh-muted text-xs font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid w-full gap-3 text-left md:grid-cols-2">
                  {merchant?.phone_number && (
                    <a href={`https://wa.me/${whatsappNumber(merchant.phone_number)}`} target="_blank" rel="noreferrer" className="sh-fill sh-border sh-r-md sh-card-hover flex items-center gap-4 p-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md"><img src="/logos/whatsapp.svg" alt="" className="h-6 w-6 brightness-0 invert" /></span>
                      <span><span className="sh-faint block text-xs font-semibold">WhatsApp</span><span className="sh-ink font-bold">{merchant.phone_number}</span></span>
                    </a>
                  )}
                  {merchant?.phone_number && (
                    <a href={`tel:${merchant.phone_number.replace(/\s+/g, '')}`} className="sh-fill sh-border sh-r-md sh-card-hover flex items-center gap-4 p-4">
                      <span className="theme-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md"><Phone className="h-5 w-5" /></span>
                      <span><span className="sh-faint block text-xs font-semibold">Téléphone</span><span className="sh-ink font-bold">{merchant.phone_number}</span></span>
                    </a>
                  )}
                  {merchant?.email && (
                    <a href={`mailto:${merchant.email}`} className="sh-fill sh-border sh-r-md sh-card-hover flex items-center gap-4 p-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md"><Mail className="h-5 w-5" /></span>
                      <span className="min-w-0"><span className="sh-faint block text-xs font-semibold">Email</span><span className="sh-ink block truncate font-bold">{merchant.email}</span></span>
                    </a>
                  )}
                  {merchant?.address && (
                    <div className="sh-fill sh-border sh-r-md flex items-center gap-4 p-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md"><MapPin className="h-5 w-5" /></span>
                      <span><span className="sh-faint block text-xs font-semibold">Adresse</span><span className="sh-ink font-bold">{merchant.address}</span></span>
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
      <footer className="sh-panel relative overflow-hidden pb-10 pt-16">
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 text-white/60 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              {merchant?.logo_url ? (
                <img src={merchant.logo_url} alt={merchant.shop_name} loading="lazy" decoding="async" className="sh-r-sm h-12 w-12 bg-white object-cover" />
              ) : (
                <span className="theme-gradient sh-r-sm flex h-12 w-12 items-center justify-center"><Store className="h-6 w-6" /></span>
              )}
              <span className="sh-display text-2xl text-white">{merchant?.shop_name || 'Boutique'}</span>
            </div>
            <p className="mb-6 max-w-sm">{merchant?.description || 'Découvrez notre sélection de produits. Qualité garantie et livraison rapide.'}</p>
            <SocialLinks links={socialLinks} dark />
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">Boutique</h4>
            <ul className="space-y-3">
              <li><button onClick={goToCatalog} className="inline-flex min-h-9 items-center transition-colors hover:text-white">Nos produits</button></li>
              <li><button onClick={() => openTab('order-tracking')} className="inline-flex min-h-9 items-center transition-colors hover:text-white">Suivre ma commande</button></li>
              <li><button onClick={() => openTab('profile')} className="inline-flex min-h-9 items-center transition-colors hover:text-white">À propos</button></li>
              <li><button onClick={() => setIsCartOpen(true)} className="inline-flex min-h-9 items-center transition-colors hover:text-white">Panier</button></li>
              {activeZones.length > 0 && <li><button onClick={() => setDeliveryOpen(true)} className="inline-flex min-h-9 items-center transition-colors hover:text-white">Zones de livraison</button></li>}
              <li><Link to={`/livreur/${encodeURIComponent(shopName)}`} className="inline-flex min-h-9 items-center transition-colors hover:text-white">Espace livreur</Link></li>
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
        <div className="relative mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 pt-8 text-sm text-white/60 sm:px-6 md:flex-row lg:px-8">
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
              className="sh-bg sh-ink fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Panier"
            >
              <div className="theme-gradient relative overflow-hidden p-5">
                <div className="relative flex items-center gap-3">
                  <span className="sh-r-sm flex h-11 w-11 items-center justify-center bg-white/20">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h2 className="sh-display text-xl">{orderFinalized ? 'Commande confirmée' : 'Mon panier'}</h2>
                    {!orderFinalized && <p className="text-sm opacity-80">{cartItemsCount} article{cartItemsCount > 1 ? 's' : ''}</p>}
                  </div>
                  <motion.button whileHover={{ rotate: 90 }} onClick={() => setIsCartOpen(false)} className="rounded-full bg-white/20 p-2" aria-label="Fermer le panier">
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              {Object.keys(cart).length === 0 && !orderFinalized ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <span className="theme-soft theme-text sh-r-lg mb-6 flex h-24 w-24 items-center justify-center">
                    <ShoppingBag className="h-11 w-11" />
                  </span>
                  <p className="text-lg font-bold">Votre panier est vide</p>
                  <p className="sh-muted mt-1 text-sm">Ajoutez vos coups de cœur pour commander.</p>
                  <button onClick={() => { setIsCartOpen(false); goToCatalog(); }} className="theme-gradient theme-glow sh-r-md mt-6 px-6 py-3 text-sm font-bold">
                    Découvrir les produits
                  </button>
                </div>
              ) : orderFinalized ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="sh-card p-7 text-center">
                    <motion.span initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="theme-gradient theme-glow relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                      <Check className="relative h-10 w-10" strokeWidth={3} />
                    </motion.span>
                    <h3 className="sh-display text-2xl">Commande validée !</h3>
                    <p className="sh-muted mt-2">Numéro de suivi</p>
                    <p className="font-mono text-xl font-extrabold tracking-widest">{orderFinalized.id.split('-')[0].toUpperCase()}</p>
                    <div className="theme-soft sh-r-md mt-6 border-2 border-dashed p-5" style={{ borderColor: 'color-mix(in srgb, var(--shop) 35%, transparent)' }}>
                      <p className="sh-muted flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest"><Lock className="h-3.5 w-3.5" /> Code secret de livraison</p>
                      <p className="theme-text mt-1 font-mono text-4xl font-extrabold tracking-[0.35em]">{orderFinalized.delivery_pin}</p>
                      <p className="sh-muted mt-2 text-xs">Donnez ce code au livreur à la réception de votre colis.</p>
                    </div>
                    <div className="mt-6 space-y-2.5">
                      {orderFinalized.payment_method === 'ON_DELIVERY' && (
                        <a href={getWhatsAppCheckoutLink()} target="_blank" rel="noreferrer" className="sh-r-md flex w-full items-center justify-center gap-2 bg-[#25D366] py-4 font-bold text-white shadow-lg shadow-green-500/25 transition-colors hover:bg-[#1DA851]">
                          <Send className="h-5 w-5" /> Confirmer sur WhatsApp
                        </a>
                      )}
                      <button onClick={trackFinalizedOrder} className="sh-invert sh-r-md flex w-full items-center justify-center gap-2 py-4 font-bold">
                        <Package className="h-5 w-5" /> Suivre ma commande
                      </button>
                      <button onClick={() => { setOrderFinalized(null); setIsCartOpen(false); }} className="sh-muted sh-hover sh-r-md w-full py-3 font-semibold">
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitOrder} className="flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-hide">
                    {/* Progression : articles, coordonnées, paiement */}
                    <ol className="grid grid-cols-3 gap-2" aria-label="Étapes de la commande">
                      {checkoutSteps.map((step, i) => (
                        <li key={step.label} className="flex flex-col gap-1.5" aria-current={!step.done && (i === 0 || checkoutSteps[i - 1].done) ? 'step' : undefined}>
                          <span className={`h-1.5 rounded-full transition-colors duration-500 ${step.done ? 'theme-gradient' : 'sh-fill'}`} />
                          <span className={`flex items-center gap-1 text-[11px] font-bold ${step.done ? 'theme-text' : 'sh-muted'}`}>
                            {step.done ? <CircleCheck className="h-3.5 w-3.5" /> : <span className="sh-line flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]">{i + 1}</span>}
                            {step.label}
                          </span>
                        </li>
                      ))}
                    </ol>

                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {Object.entries(cart).map(([key, item]) => (
                          <motion.div
                            key={key}
                            layout
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }}
                            className="sh-surface sh-border sh-r-md flex gap-3 p-3"
                          >
                            <div className="sh-fill sh-r-sm h-20 w-20 shrink-0 overflow-hidden">
                              {item.product.image_url ? (
                                <img src={thumbUrl(item.product.image_url)} onError={fallbackToFull(item.product.image_url)} alt={item.product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="sh-faint h-full w-full p-5" />
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div>
                                <h4 className="line-clamp-1 text-sm font-bold">{item.product.name}</h4>
                                {item.variant && <p className="sh-muted mt-0.5 text-xs">{item.variant}</p>}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-extrabold">{fmt(item.product.price_fcfa * item.quantity)} F</span>
                                <div className="sh-fill flex items-center gap-1 rounded-full p-1">
                                  <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(key, -1)} className="sh-surface flex h-9 w-9 items-center justify-center rounded-full shadow-sm" aria-label="Retirer un"><Minus className="h-3.5 w-3.5" /></motion.button>
                                  <motion.span key={item.quantity} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="w-6 text-center text-sm font-bold">{item.quantity}</motion.span>
                                  <motion.button type="button" whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(key, 1)} className="theme-gradient flex h-9 w-9 items-center justify-center rounded-full" aria-label="Ajouter un"><Plus className="h-3.5 w-3.5" /></motion.button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="sh-surface sh-border sh-r-md space-y-4 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold"><User className="theme-text h-4 w-4" /> Vos coordonnées</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="checkout-name" className="shop-label">Nom complet</label>
                          <input id="checkout-name" type="text" placeholder="Ex : Fatou Diop" required autoComplete="name" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} className="shop-input" />
                        </div>
                        <div>
                          <label htmlFor="checkout-phone" className="shop-label">Téléphone (WhatsApp)</label>
                          <input id="checkout-phone" type="tel" inputMode="tel" placeholder="77 123 45 67" required autoComplete="tel" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} className="shop-input" />
                        </div>
                      </div>
                      <div>
                      <label htmlFor="checkout-address" className="shop-label">Adresse de livraison</label>
                      <div className="flex gap-2">
                        <input id="checkout-address" type="text" placeholder="Quartier, rue, point de repère" required autoComplete="street-address" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} className="shop-input min-w-0 flex-1" />
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
                          className={`flex w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${checkoutData.gpsLocation ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'sh-line sh-surface sh-muted sh-hover'}`}
                          title="Ajouter ma position GPS exacte"
                          aria-label="Ajouter ma position GPS"
                        >
                          {checkoutData.gpsLocation ? <Check className="h-5 w-5" /> : <LocateFixed className="h-5 w-5" />}
                        </motion.button>
                      </div>
                      {checkoutData.gpsLocation
                        ? <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CircleCheck className="h-3.5 w-3.5" /> Position GPS ajoutée : le livreur vous trouvera plus vite</p>
                        : <p className="sh-muted mt-1.5 text-xs">Astuce : touchez le bouton de localisation pour partager votre position exacte.</p>}
                      </div>
                      <div>
                        <label htmlFor="checkout-zone" className="shop-label">Zone de livraison</label>
                        <div className="relative">
                          <Truck className="sh-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                          <select id="checkout-zone" value={checkoutData.zone} onChange={e => setCheckoutData({...checkoutData, zone: e.target.value})} className="shop-input cursor-pointer appearance-none !pl-10 !pr-10">
                            {activeZones.map(z => <option key={z.name} value={z.name}>{z.name} — {z.price} F</option>)}
                          </select>
                          <ChevronDown className="sh-faint pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed">
                        <input
                          type="checkbox"
                          checked={rememberClient}
                          onChange={(e) => {
                            setRememberClient(e.target.checked);
                            if (!e.target.checked) { store.remove(CLIENT_KEY); store.remove(`orders_${shopName}`); setMyOrders([]); }
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--shop)]"
                        />
                        <span className="sh-muted"><span className="sh-ink font-bold">Se souvenir de moi sur ce téléphone</span> : vos coordonnées seront déjà remplies et vos commandes retrouvées dans « Suivi ». Tout reste sur cet appareil.</span>
                      </label>
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="mb-2 text-sm font-bold">Mode de paiement</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_CHOICES.map((m) => {
                          const active = checkoutData.paymentMethod === m.id;
                          return (
                            <label key={m.id} className={`relative flex cursor-pointer items-center gap-2.5 rounded-2xl p-3 ring-2 transition-all ${m.id === 'ON_DELIVERY' ? 'col-span-2' : ''} ${active ? 'theme-soft ring-[color:var(--shop)]' : 'sh-surface ring-[color:var(--shop-line)] hover:ring-[color:var(--shop-faint)]'}`}>
                              <input type="radio" name="payment" value={m.id} checked={active} onChange={() => setCheckoutData({...checkoutData, paymentMethod: m.id})} className="sr-only" />
                              {active && <span className="theme-gradient absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                              {m.id === 'ON_DELIVERY' ? (
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'theme-text' : 'sh-faint'}`}><Truck className="h-6 w-6" /></span>
                              ) : m.logo ? (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-black/5"><img src={m.logo} alt="" className="max-h-full max-w-full object-contain" /></span>
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold tracking-tight" style={{ background: m.tint, color: m.ink }} aria-hidden="true">{m.monogram}</span>
                              )}
                              <span className="min-w-0 pr-5">
                                <span className="block text-sm font-bold leading-tight [overflow-wrap:anywhere]">{m.label}</span>
                                <span className="sh-muted block text-[11px]">{m.sub}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {isMobileChannel(checkoutData.paymentMethod) && (
                        <p className="sh-muted flex items-start gap-1.5 pt-1 text-xs">
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Vous serez redirigé vers la page sécurisée {PAYMENT_CHOICES.find((c) => c.id === checkoutData.paymentMethod)?.label} (PayDunya) pour payer, puis ramené ici.
                        </p>
                      )}
                    </fieldset>
                  </div>

                  <div className="sh-surface sh-line border-t p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
                    <div className="mb-4 space-y-1.5 text-sm">
                      <div className="sh-muted flex justify-between"><span>Sous-total</span><span className="sh-ink font-semibold">{fmt(getCartTotal())} F</span></div>
                      <div className="sh-muted flex justify-between"><span className="truncate pr-4">Livraison · {checkoutData.zone}</span><span className="sh-ink shrink-0 font-semibold">{fmt(getDeliveryPrice())} F</span></div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="theme-gradient theme-glow sh-r-md flex w-full items-center justify-between px-5 py-4 font-bold disabled:opacity-60"
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
              ref={sheetRef}
              className="sh-surface sh-ink relative flex max-h-[94vh] supports-[height:100dvh]:max-h-[94dvh] w-full max-w-5xl flex-col overflow-y-auto overscroll-contain rounded-t-[var(--shop-r-lg)] shadow-2xl scrollbar-hide sm:rounded-[var(--shop-r-lg)] md:flex-row md:overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={selectedProduct.name}
            >
              <motion.button whileHover={{ rotate: 90 }} onClick={() => setSelectedProduct(null)} className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md backdrop-blur" aria-label="Fermer">
                <X className="h-5 w-5" />
              </motion.button>

              <div className="sh-fill relative flex w-full shrink-0 flex-col items-center justify-center gap-3 p-4 md:w-1/2 md:gap-4 md:p-10">
                <ProductGallery key={selectedProduct.id} images={gallery} alt={selectedProduct.name} />
              </div>

              <div ref={detailRef} className="flex w-full flex-col p-6 pb-0 scrollbar-hide md:w-1/2 md:overflow-y-auto md:p-10 md:pb-0">
                <span className="theme-soft theme-text mb-3 inline-flex w-max items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                  {React.createElement(categoryIcon(selectedProduct.category || 'Autres'), { className: 'h-3.5 w-3.5' })} {selectedProduct.category || 'Standard'}
                </span>
                <h3 className="sh-display text-3xl leading-tight">{selectedProduct.name}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {productReviews.length > 0 ? (
                    <>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviewAverage) ? 'fill-amber-400 text-amber-400' : 'sh-faint'}`} />)}
                      </div>
                      <span className="font-bold">{reviewAverage.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>
                      <span className="sh-muted">({productReviews.length} avis)</span>
                    </>
                  ) : (
                    <span className="sh-muted">Pas encore d'avis</span>
                  )}
                </div>
                <p className="theme-text mt-5 text-4xl font-extrabold tracking-tight">{fmt(selectedProduct.price_fcfa)} <span className="text-lg">FCFA</span></p>
                {typeof selectedProduct.stock === 'number' && (
                  <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${selectedOut ? 'sh-muted' : selectedProduct.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedOut ? <CircleX className="h-4 w-4" /> : selectedProduct.stock <= 5 ? <Flame className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                    {selectedOut ? 'Épuisé pour le moment' : selectedProduct.stock <= 5 ? `Plus que ${selectedProduct.stock} en stock` : 'En stock'}
                  </p>
                )}
                <p className="sh-muted mt-6 leading-relaxed">{selectedProduct.description || 'Aucune description disponible pour ce produit.'}</p>

                {selectedOptions.features.length > 0 && (
                  <dl className="sh-fill sh-r-md mt-6 grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
                    {selectedOptions.features.map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="sh-muted text-xs font-semibold">{k}</dt>
                        <dd className="sh-ink font-bold [overflow-wrap:anywhere]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {(selectedOptions.sizes.length > 0 || selectedOptions.colors.length > 0) && (
                  <div className="mt-6 space-y-5">
                    {selectedOptions.sizes.length > 0 && (
                      <div>
                        <p className="mb-2.5 text-sm font-bold">{selectedOptions.legacyList ? 'Option' : 'Taille'}</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOptions.sizes.map(s => (
                            <motion.button whileTap={{ scale: 0.92 }} key={s} onClick={() => setQuickViewSize(s)} aria-pressed={quickViewSize === s} className={`sh-r-sm min-w-12 px-4 py-2 text-sm font-bold transition-all ${quickViewSize === s ? 'theme-gradient' : 'sh-chip'}`}>
                              {s}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedOptions.colors.length > 0 && (
                      <div>
                        <p className="mb-2.5 text-sm font-bold">Couleur</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOptions.colors.map(c => (
                            <motion.button whileTap={{ scale: 0.92 }} key={c} onClick={() => setQuickViewColor(c)} aria-pressed={quickViewColor === c} className={`sh-r-sm px-4 py-2 text-sm font-bold transition-all ${quickViewColor === c ? 'theme-gradient' : 'sh-chip'}`}>
                              {c}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                  {[{ icon: Truck, t: 'Livraison rapide' }, { icon: Lock, t: 'Code PIN' }, { icon: Smartphone, t: 'Paiement mobile' }].map((b) => (
                    <span key={b.t} className="sh-fill sh-ink-2 sh-r-md flex flex-col items-center gap-1.5 py-3"><b.icon className="theme-text h-5 w-5" /> {b.t}</span>
                  ))}
                </div>

                {merchant?.phone_number && (
                  <a href={askOnWhatsApp(selectedProduct)} target="_blank" rel="noreferrer" className="sh-muted mt-4 inline-flex min-h-9 items-center gap-2 text-sm font-semibold hover:underline">
                    <WhatsApp className="h-4 w-4 text-[#25D366]" /> Une question sur ce produit ? Écrivez-nous
                  </a>
                )}

                <button onClick={() => { setSelectedProduct(null); setReviewData({...reviewData, product_id: selectedProduct.id}); setReviewModalOpen(true); }} className="sh-chip sh-r-md group mt-6 flex w-full items-center justify-between p-4 text-left">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Star className="h-5 w-5 fill-amber-400" /></span>
                    <span>
                      <span className="sh-ink block text-sm font-bold">{productReviews.length} avis client{productReviews.length > 1 ? 's' : ''}</span>
                      <span className="sh-muted block text-xs">Lire les avis ou donner le vôtre</span>
                    </span>
                  </span>
                  <ChevronRight className="sh-faint h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>

                {similarProducts.length > 0 && (
                  <section className="mt-8" aria-label="Vous aimerez aussi">
                    <p className="mb-3 text-sm font-bold">Vous aimerez aussi</p>
                    <div className="scrollbar-hide -mx-6 flex gap-3 overflow-x-auto px-6 pb-1 md:-mx-10 md:px-10">
                      {similarProducts.map((p) => <MiniProduct key={p.id} product={p} onOpen={() => setSelectedProduct(p)} small />)}
                    </div>
                  </section>
                )}

                {/* Barre d'achat : reste visible en bas de la fiche */}
                <div className="sh-surface sh-line sticky bottom-0 z-10 -mx-6 mt-auto flex gap-2.5 border-t px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:-mx-10 md:gap-3 md:px-10 md:pb-6 md:pt-4">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={selectedOut}
                    onClick={() => addToCart(selectedProduct, quickViewSize, quickViewColor)}
                    className="theme-gradient theme-glow sh-r-md flex min-w-0 flex-1 items-center justify-center gap-2 py-4 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag className="h-5 w-5 shrink-0" /> <span className="truncate">{selectedOut ? 'Épuisé' : `Ajouter · ${fmt(selectedProduct.price_fcfa)} F`}</span>
                  </motion.button>
                  <FavoriteButton active={favorites.includes(selectedProduct.id)} onToggle={() => toggleFavorite(selectedProduct.id)} className="sh-border !h-14 !w-14 shrink-0 !rounded-2xl" />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => shareProduct(selectedProduct)} className="sh-border sh-surface flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" aria-label="Partager ce produit">
                    <Share2 className="h-5 w-5" />
                  </motion.button>
                </div>
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
            <motion.div initial={{ opacity: 0, y: 60, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="sh-surface sh-ink relative w-full max-w-md rounded-t-[var(--shop-r-lg)] p-7 shadow-2xl sm:rounded-[var(--shop-r-lg)]" role="dialog" aria-modal="true" aria-label="Avis clients">
              <motion.button whileHover={{ rotate: 90 }} onClick={() => setReviewModalOpen(false)} className="sh-fill absolute right-4 top-4 rounded-full p-2" aria-label="Fermer"><X className="h-4 w-4" /></motion.button>
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-amber-500/30"><Star className="h-6 w-6 fill-white" /></span>
                <h3 className="sh-display text-2xl">Avis clients</h3>
              </div>

              <form onSubmit={submitReview} className="sh-fill sh-r-md mb-6 p-5">
                <p className="sh-ink-2 mb-3 text-sm font-bold">Votre note</p>
                <div className="mb-4 flex gap-1.5">
                  {[1,2,3,4,5].map(star => (
                    <motion.button type="button" key={star} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setReviewData({...reviewData, rating: star})} aria-label={`${star} étoile${star > 1 ? 's' : ''}`}>
                      <Star className={`h-9 w-9 transition-colors ${star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'sh-faint'}`} />
                    </motion.button>
                  ))}
                </div>
                <label htmlFor="review-name" className="shop-label">Votre prénom <span className="sh-faint font-normal">(facultatif)</span></label>
                <input id="review-name" type="text" placeholder="Ex : Awa" maxLength={80} value={reviewData.customer_name} onChange={e => setReviewData({...reviewData, customer_name: e.target.value})} className="shop-input mb-3" />
                <label htmlFor="review-comment" className="shop-label">Votre avis</label>
                <textarea id="review-comment" placeholder="Qualité, livraison, accueil…" required minLength={3} maxLength={1000} value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} className="shop-input mb-4 h-28 resize-none" />
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={reviewSubmitting} className="theme-gradient sh-r-md flex w-full items-center justify-center gap-2 py-3 font-bold disabled:opacity-50">
                  {reviewSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer
                </motion.button>
              </form>

              <div className="max-h-64 space-y-3 overflow-y-auto scrollbar-hide">
                {productReviews.length === 0 ? (
                  <p className="sh-muted py-4 text-center text-sm">Soyez le premier à donner votre avis !</p>
                ) : (
                  productReviews.map((rev, i) => (
                    <motion.div key={rev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="sh-border sh-r-md flex gap-3 p-3">
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
                            {[...Array(5)].map((_, s) => <Star key={s} className={`h-3 w-3 ${s < rev.rating ? 'fill-amber-400 text-amber-400' : 'sh-faint'}`} />)}
                          </div>
                        </div>
                        <p className="sh-muted mt-0.5 text-sm">{rev.comment}</p>
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
          transition={{ delay: 1, type: 'spring' }}
          whileHover={{ scale: 1.08 }}
          href={`https://wa.me/${whatsappNumber(merchant.phone_number)}`}
          target="_blank"
          rel="noreferrer"
          className="group fixed bottom-6 right-6 z-[45] hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-green-600/30 md:flex"
          aria-label="Contacter le vendeur sur WhatsApp"
        >
          <img src="/logos/whatsapp.svg" alt="" className="h-6 w-6 brightness-0 invert md:h-7 md:w-7" />
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100 md:block">
            Besoin d'aide ?
          </span>
        </motion.a>
      )}

      {/* NAVIGATION MOBILE */}
      <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Navigation de la boutique">
        <div className="sh-header sh-r-lg flex items-end justify-around border px-2 pb-2 pt-2 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          {[
            { id: 'home', label: 'Accueil', icon: House, onClick: goHome, active: activeTab === 'home' && !showFavoritesOnly },
            { id: 'fav', label: 'Favoris', icon: Heart, iconOn: HeartFill, onClick: toggleFavoritesView, active: activeTab === 'home' && showFavoritesOnly, badge: favorites.length },
            { id: 'cart' },
            { id: 'track', label: 'Suivi', icon: Package, onClick: () => openTab('order-tracking'), active: activeTab === 'order-tracking' },
            { id: 'profile', label: 'Boutique', icon: Store, onClick: () => openTab('profile'), active: activeTab === 'profile' },
          ].map((item) => item.id === 'cart' ? (
            <motion.button key="cart" data-cart-target whileTap={{ scale: 0.9 }} onClick={() => setIsCartOpen(true)} className="theme-gradient sh-ring-bg sh-r-md relative -mt-8 flex h-16 w-16 flex-col items-center justify-center" aria-label="Panier">
              <ShoppingBag className="h-6 w-6" />
              <span className="text-[11px] font-bold">Panier</span>
              {cartItemsCount > 0 && (
                <motion.span key={cartItemsCount} initial={{ scale: 1.8 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white">
                  {cartItemsCount}
                </motion.span>
              )}
            </motion.button>
          ) : (
            <button key={item.id} onClick={item.onClick} className="relative flex w-14 flex-col items-center gap-0.5 py-1" aria-current={item.active ? 'page' : undefined}>
              {item.active && <motion.span layoutId="mobile-nav" className="theme-soft sh-r-sm absolute inset-0" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">
                {React.createElement(item.active && item.iconOn ? item.iconOn : item.icon, { className: `h-5 w-5 ${item.active ? 'theme-text' : 'sh-muted'}` })}
                {item.badge > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-rose-500" />}
              </span>
              <span className={`relative text-[11px] font-bold ${item.active ? 'sh-ink' : 'sh-muted'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </MotionConfig>
  );
}
