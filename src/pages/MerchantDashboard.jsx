import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Package, ShoppingBag, Store, X, QrCode, Truck, Users, UserPlus, Trash2, BellRing, BellOff, Search,
  Settings, CreditCard, ShieldCheck, Bell, Crown, Sparkles, Boxes, CircleCheck, CircleX, TriangleAlert, Coins,
  ImageOff, Pencil, Tag, Layers, Phone, MapPin, Smartphone, Bike, Car, ChevronDown, MessageCircle, CalendarDays,
  Check, Copy, ExternalLink, IdCard, TrendingUp, Rocket, Zap, Gem, LoaderCircle, Eye, Palette, ImagePlus, Upload,
  Mail, Wallet, Globe, Save, Download, Banknote, HandCoins, LocateFixed, House, ArrowUpRight, LayoutGrid, Minus,
  Navigation, Megaphone, Motorcycle, Moped, Bicycle, Facebook, Instagram, TikTok, HouseFill, ShoppingBagFill, PackageFill,
  TruckFill, UsersFill, SettingsFill, CreditCardFill, LayoutGridFill,
} from '../components/dashboard/icons';
import { parseOrderAddress, orderMapsUrl } from '../utils/orderAddress';
import LogoutDialog from '../components/LogoutDialog';
import { showFarewell, markLoggedOut } from '../utils/farewell';
import { getCurrentPosition, googleMapsUrl } from '../utils/geolocation';
import { friendlyError } from '../utils/networkErrors';
import { uploadShopImage, savingsMessage, thumbUrl, fallbackToFull } from '../utils/imageUpload';
import ThemePicker from '../components/dashboard/ThemePicker';
import { getShopTheme, isThemeId, DEFAULT_THEME_ID, PENDING_THEME_KEY } from '../components/shop/themes';
import { QRCodeSVG } from 'qrcode.react';
import { SHOP_CATEGORIES, CATEGORY_FEATURES } from '../utils/categories';
import { motion, AnimatePresence } from 'framer-motion';
import Overview from '../components/dashboard/Overview';
import { PageHeader, PrimaryButton, StatPill, EmptyState, Modal, FilePreview, Toggle, SectionCard, LogoutButton, rise, CARD, INPUT, LABEL, EASE } from '../components/dashboard/ui';
import { ORDER_STATUSES, statusMeta, timeAgo, dayLabel } from '../components/dashboard/status';
import { fmt } from '../components/dashboard/analytics';
import { TagsInput } from '../components/dashboard/TagsInput';
import { WhatsAppSettingsCard, DirectoryToggle } from '../components/dashboard/SmartSettings';
import { PLAN_FEATURES } from '../utils/plans';
import { BRAND } from '../utils/brand';
import { paymentLabel } from '../utils/payments';
import AiProductAssistant, { AiTeaser } from '../components/dashboard/AiProductAssistant';
import ProductPoster from '../components/dashboard/ProductPoster';
import { celebrate } from '../utils/motion';
import RollingNumber from '../components/motion/RollingNumber';
import Logo from '../components/brand/Logo';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};


export default function MerchantDashboard() {
  const { user, merchant, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // Après le premier chargement, les rafraîchissements (temps réel) gardent l'affichage en place.
  const [hasLoaded, setHasLoaded] = useState(false);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, tags: [], image: null });
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

  // Réassort rapide : numéro du dernier clic par produit (les réponses peuvent arriver dans le désordre).
  const stockSeq = useRef({});
  // Commande dont le détail est déplié
  const [expandedOrder, setExpandedOrder] = useState(null);
  // Produit dont on crée l'affiche (statut WhatsApp, publication)
  const [posterProduct, setPosterProduct] = useState(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Commandes arrivées pendant que la page est ouverte (mises en lumière quelques secondes)
  const knownOrderIds = useRef(null);
  const [freshOrderIds, setFreshOrderIds] = useState([]);
  useEffect(() => {
    if (!hasLoaded) return undefined;
    const ids = orders.map((o) => o.id);
    if (knownOrderIds.current === null) {
      knownOrderIds.current = new Set(ids);
      return undefined;
    }
    const arrived = orders.filter((o) => !knownOrderIds.current.has(o.id));
    ids.forEach((id) => knownOrderIds.current.add(id));
    if (arrived.length === 0) return undefined;
    setFreshOrderIds((list) => [...list, ...arrived.map((o) => o.id)]);
    const first = arrived[0];
    setToastMessage(arrived.length > 1
      ? `${arrived.length} nouvelles commandes !`
      : `Nouvelle commande : ${first.customer_name} · ${fmt(first.total_amount_fcfa)} F`);
    const timer = setTimeout(() => setFreshOrderIds((list) => list.filter((id) => !arrived.some((o) => o.id === id))), 6000);
    return () => clearTimeout(timer);
  }, [orders, hasLoaded]);

  // Search & Filters for Orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  // Position de la boutique (visible uniquement par le marchand et l'administrateur)
  const [shopLocation, setShopLocation] = useState(null);
  const [locating, setLocating] = useState(false);

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
    layout_style: DEFAULT_THEME_ID,
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
        layout_style: getShopTheme(merchant.layout_style).id,
        social_facebook: merchant.social_links?.facebook || '',
        social_instagram: merchant.social_links?.instagram || '',
        social_tiktok: merchant.social_links?.tiktok || '',
        payout_provider: merchant.payout_provider || 'WAVE',
        payout_phone_number: merchant.payout_phone_number || '',
        delivery_zones: merchant.delivery_zones || DEFAULT_DELIVERY_ZONES,
        isSaving: false
      });

      // Thème choisi sur la page d'accueil avant l'inscription : appliqué une seule fois,
      // si la boutique n'a pas encore de thème.
      let pendingTheme = null;
      try { pendingTheme = localStorage.getItem(PENDING_THEME_KEY); } catch { /* stockage indisponible */ }
      if (pendingTheme) {
        try { localStorage.removeItem(PENDING_THEME_KEY); } catch { /* idem */ }
        if (isThemeId(pendingTheme) && !isThemeId(merchant.layout_style)) {
          const theme = getShopTheme(pendingTheme);
          supabase.from('merchants').update({ layout_style: theme.id, theme_color: theme.accent }).eq('id', merchant.id).then(({ error }) => {
            if (!error) setSettingsForm((prev) => ({ ...prev, layout_style: theme.id, theme_color: theme.accent }));
          });
        }
      }

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
      alert(`Paiement impossible : ${friendlyError(err, 'impossible de contacter PayDunya. Réessayez.')}`);
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
    let paymentPoll = null;
    if (params.get('payment') === 'success') {
      // L'abonnement est activé uniquement par le webhook PayDunya (côté serveur), jamais par le navigateur.
      // On attend ici que l'activation soit visible, puis on recharge le profil.
      const plan = params.get('plan') || 'pro';
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchData();
      showToast('Paiement reçu ! Activation de votre forfait en cours…');
      let attempts = 0;
      paymentPoll = setInterval(async () => {
        attempts += 1;
        const { data } = await supabase.rpc('get_my_merchant');
        if (data?.subscription_status === 'active' && data?.subscription_plan === plan) {
          clearInterval(paymentPoll);
          window.location.reload(); // Pour recharger le contexte `merchant`
        } else if (attempts >= 10) {
          clearInterval(paymentPoll);
          showToast('Paiement en cours de validation. Actualisez la page dans quelques instants.');
        }
      }, 3000);
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
      if (paymentPoll) clearInterval(paymentPoll);
      supabase.removeChannel(ordersSubscription);
    };
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    if (user) {
      // Les quatre lectures partent en même temps au lieu de s'attendre l'une l'autre.
      const [
        { data: prodData },
        { data: ordData },
        { data: teamData, error: teamError },
        { data: locationData },
      ] = await Promise.all([
        supabase.from('products').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }),
        supabase.from('merchant_locations').select('*').eq('merchant_id', user.id).maybeSingle(),
      ]);

      if (prodData) setProducts(prodData);
      if (ordData) setOrders(ordData);
      if (teamData) setTeam(teamData);
      else if (teamError && teamError.code !== '42P01') console.error(teamError); // Ignore if table doesn't exist yet
      setShopLocation(locationData || null);
    }
    setLoading(false);
    setHasLoaded(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsForm(prev => ({ ...prev, isSaving: true }));
    try {
      let finalLogoUrl = settingsForm.logo_url;
      let finalBannerUrl = settingsForm.banner_url;

      if (settingsForm.logoFile) {
        const logo = await uploadShopImage(user.id, settingsForm.logoFile, { prefix: 'logo_', maxSize: 512, keepTransparency: true });
        finalLogoUrl = logo.url;
      }

      if (settingsForm.bannerFile) {
        const banner = await uploadShopImage(user.id, settingsForm.bannerFile, { prefix: 'banner_', maxSize: 1920 });
        finalBannerUrl = banner.url;
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
      showToast(friendlyError(err, "Erreur lors de l'enregistrement des paramètres."));
    }
    setSettingsForm(prev => ({ ...prev, isSaving: false }));
  };

  // Déconnexion : confirmation d'abord, puis écran d'au revoir pendant le retour à la page de connexion.
  const [logoutOpen, setLogoutOpen] = useState(false);
  const handleLogout = () => { setIsMobileMenuOpen(false); setLogoutOpen(true); };
  const confirmLogout = async ({ everywhere }) => {
    const name = merchant?.shop_name || '';
    showFarewell({ name });
    const { error } = await logout({ everywhere });
    markLoggedOut({ name, everywhere, partial: Boolean(error && everywhere) });
    navigate('/login', { replace: true });
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
        const uploaded = await uploadShopImage(user.id, newProduct.image, { maxSize: 1400, thumbSize: 480 });
        image_url = uploaded.url;
        const saved = savingsMessage(uploaded);
        if (saved) showToast(saved);
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
      // Mots-clés (colonne ajoutée par new_features.sql) : envoyés seulement s'il y en a.
      if (newProduct.tags?.length || products.find((p) => p.id === editingProductId)?.tags?.length) {
        productData.tags = newProduct.tags || [];
      }

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
      setNewProduct({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, tags: [], image: null });
      fetchData();
    } catch (error) {
      alert(friendlyError(error, "Le produit n'a pas pu être enregistré. Réessayez."));
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
      alert(friendlyError(err, "Le produit n'a pas pu être supprimé. Réessayez."));
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
      alert(friendlyError(err, "Le livreur n'a pas pu être ajouté. Réessayez."));
    }
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("Supprimer ce livreur ?")) return;
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert(friendlyError(err, "Le livreur n'a pas pu être supprimé. Réessayez."));
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert(friendlyError(error, "Le statut n'a pas pu être mis à jour. Réessayez."));
      return false;
    }
    fetchData();
    return true;
  };

  // « Accepter la commande » : pluie de confettis depuis le bouton, puis message de confirmation.
  const acceptOrder = async (order, button) => {
    if (await updateOrderStatus(order.id, 'PREPARING')) {
      celebrate(button);
      showToast(`Commande de ${order.customer_name} acceptée : à préparer.`);
    }
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

  const handleDriverLinkCopy = async () => {
    try {
      await navigator.clipboard.writeText(getDriverUrl());
      showToast('Lien livreur copié : envoyez-le à vos livreurs.');
    } catch {
      window.prompt('Copiez ce lien et envoyez-le à vos livreurs :', getDriverUrl());
    }
  };

  // Partage de la vitrine : menu de partage du téléphone (WhatsApp, statut, SMS…), sinon WhatsApp.
  const shareShop = async () => {
    const url = getShopUrl();
    const text = `Découvrez ma boutique ${merchant?.shop_name || ''} : commandez en ligne, payez à la livraison, par Wave, Orange Money, Free Money ou Wizall.`;
    if (navigator.share) {
      try { await navigator.share({ title: merchant?.shop_name, text, url }); } catch { /* partage annulé */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  // Réassort rapide (+1 / −1) sans ouvrir la fiche produit. La base applique un changement relatif
  // (adjust_product_stock) : une vente passée au même moment n'est pas écrasée.
  const adjustStock = async (product, delta) => {
    const seq = (stockSeq.current[product.id] || 0) + 1;
    stockSeq.current[product.id] = seq;
    const nextLocal = (stock) => (delta > 0 ? stock + delta : Math.max(stock + delta, Math.min(stock, 0)));
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, stock: nextLocal(p.stock) } : p)));

    let { data, error } = await supabase.rpc('adjust_product_stock', { p_product_id: product.id, p_delta: delta });
    if (error?.code === 'PGRST202') {
      // Fonction absente tant que stock_et_annuaire.sql n'est pas exécuté : mise à jour directe.
      data = nextLocal(product.stock);
      ({ error } = await supabase.from('products').update({ stock: data }).eq('id', product.id));
    }
    if (stockSeq.current[product.id] !== seq) return; // un clic plus récent fera foi
    if (error) {
      showToast("Le stock n'a pas pu être modifié. Réessayez.");
      fetchData();
      return;
    }
    if (typeof data === 'number') setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, stock: data } : p)));
  };

  const today = new Date().toDateString();
  const deliveredToday = orders.filter(o => o.status === 'DELIVERED' && new Date(o.delivered_at || o.created_at).toDateString() === today);

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

  // --- Aides d'affichage des onglets ---
  const updateShopLocation = async () => {
    setLocating(true);
    try {
      const position = await getCurrentPosition();
      const { error } = await supabase.rpc('set_merchant_location', {
        p_latitude: position.lat,
        p_longitude: position.lng,
        p_accuracy_m: Math.round(position.accuracy || 0),
      });
      if (error) throw error;
      setShopLocation((prev) => ({ ...prev, latitude: position.lat, longitude: position.lng, accuracy_m: Math.round(position.accuracy || 0), updated_at: new Date().toISOString() }));
      showToast('Position de la boutique enregistrée !');
    } catch (err) {
      showToast(err.message || "Impossible d'enregistrer la position.");
    } finally {
      setLocating(false);
    }
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setNewProduct({ name: '', description: '', price_fcfa: '', stock: '', category: 'Vêtements', features: {}, tags: [], image: null });
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProductId(p.id);
    const existingFeatures = {};
    if (Array.isArray(p.variants)) {
      // Format actuel : ["Taille: M", "Couleur: Bleu"]
      p.variants.forEach(v => {
        if (typeof v === 'string' && v.includes(':')) {
          const parts = v.split(':');
          existingFeatures[parts[0].trim()] = parts.slice(1).join(':').trim();
        }
      });
    } else if (p.variants && typeof p.variants === 'object') {
      // Ancien format (add_advanced_features.sql) : { sizes: [...], colors: [...] }
      if (p.variants.sizes?.length) existingFeatures.Taille = p.variants.sizes.join(', ');
      if (p.variants.colors?.length) existingFeatures.Couleur = p.variants.colors.join(', ');
    }
    setNewProduct({
      name: p.name,
      description: p.description,
      price_fcfa: p.price_fcfa,
      stock: p.stock,
      category: p.category || 'Vêtements',
      features: existingFeatures,
      tags: Array.isArray(p.tags) ? p.tags : [],
      image: null
    });
    setShowProductModal(true);
  };

  const productStats = {
    inStock: products.filter((p) => p.stock > 5).length,
    low: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
    out: products.filter((p) => p.stock <= 0).length,
    value: products.reduce((acc, p) => acc + (p.price_fcfa || 0) * Math.max(0, p.stock || 0), 0),
  };

  const visibleProducts = products.filter((p) => {
    const matchesSearch = `${p.name} ${p.category || ''}`.toLowerCase().includes(productSearch.toLowerCase());
    const matchesStock = productFilter === 'ALL'
      || (productFilter === 'IN_STOCK' && p.stock > 5)
      || (productFilter === 'LOW' && p.stock > 0 && p.stock <= 5)
      || (productFilter === 'OUT' && p.stock <= 0);
    return matchesSearch && matchesStock;
  });

  const orderQuery = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter(o =>
    (statusFilter === 'ALL' || o.status === statusFilter) &&
    ((o.customer_name || '').toLowerCase().includes(orderQuery) ||
     (o.customer_phone || '').replace(/\s/g, '').includes(orderQuery.replace(/\s/g, '')) ||
     (orderQuery.replace('#', '').length >= 3 && o.id.toLowerCase().startsWith(orderQuery.replace('#', ''))))
  );
  // Commandes regroupées par jour (la liste arrive déjà triée de la plus récente à la plus ancienne).
  const orderGroups = filteredOrders.reduce((groups, o) => {
    const label = dayLabel(o.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.orders.push(o);
    else groups.push({ label, orders: [o] });
    return groups;
  }, []);

  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const getDriverDayStats = (driver) => {
    const todayStr = new Date().toDateString();
    const driverDeliveries = orders.filter(o =>
      o.driver_name === driver.full_name &&
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

    return { driverDeliveries, dTotalEnbaisse, dPartLivreur, aReverser };
  };
  const driverDayStats = selectedDriverForStats ? getDriverDayStats(selectedDriverForStats) : null;

  const vehicleIcon = (type) => ({ moto: Motorcycle, scooter: Moped, 'vélo': Bicycle, velo: Bicycle, voiture: Car, autre: Truck }[String(type || '').toLowerCase()] || Bike);

  const copyShopLink = () => {
    navigator.clipboard.writeText(getShopUrl());
    showToast('Lien de la vitrine copié !');
  };

  const downloadQR = () => {
    const svg = document.getElementById('shop-qr');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `qr-${merchant?.shop_name || 'boutique'}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const PLAN_LABELS = { debutant: 'Débutant', pro: 'Pro', premium: 'Premium' };
  const planId = merchant?.subscription_plan || 'debutant';

  const NAV_SECTIONS = [
    {
      title: 'Au quotidien',
      items: [
        { id: 'analytics', label: 'Accueil', icon: House, iconOn: HouseFill },
        { id: 'orders', label: 'Commandes', icon: ShoppingBag, iconOn: ShoppingBagFill, badge: stats.pending },
        { id: 'products', label: 'Produits', icon: Package, iconOn: PackageFill },
        { id: 'drivers', label: 'Livraisons', icon: Truck, iconOn: TruckFill },
        { id: 'team', label: 'Équipe', icon: Users, iconOn: UsersFill },
      ],
    },
    {
      title: 'Boutique',
      items: [
        { id: 'settings', label: 'Paramètres', icon: Settings, iconOn: SettingsFill },
        { id: 'billing', label: 'Facturation', icon: CreditCard, iconOn: CreditCardFill },
      ],
    },
  ];
  const currentNav = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeTab);
  // Téléphone : 4 onglets principaux en bas de l'écran, le reste dans « Plus ».
  const MOBILE_TABS = [
    { id: 'analytics', label: 'Accueil', icon: House, iconOn: HouseFill },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag, iconOn: ShoppingBagFill, badge: stats.pending },
    { id: 'products', label: 'Produits', icon: Package, iconOn: PackageFill },
    { id: 'drivers', label: 'Livraisons', icon: Truck, iconOn: TruckFill },
    { id: 'more', label: 'Plus', icon: LayoutGrid, iconOn: LayoutGridFill },
  ];
  const inMoreTabs = ['team', 'settings', 'billing'].includes(activeTab);

  // Ouvre un onglet, éventuellement filtré (ex. commandes « À traiter », produits en rupture).
  const openTab = (id, { status, productFilter: filter } = {}) => {
    if (status) setStatusFilter(status);
    if (filter) setProductFilter(filter);
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  if (!merchant) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f6f2]">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-brand-600/20 border-t-brand-600"></div>
      <p className="font-medium text-stone-500">Chargement du tableau de bord…</p>
    </div>
  );

  const shopInitial = merchant.shop_name?.charAt(0).toUpperCase() || 'M';
  const shopAvatar = (size) => (merchant.logo_url ? (
    <img src={merchant.logo_url} alt="" className={`${size} shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-[#e8e5dc]`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900`}>{shopInitial}</span>
  ));
  const planChip = (
    <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${planId === 'debutant' ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-800'}`}>
      {planId !== 'debutant' && <Crown className="h-3 w-3" />} Forfait {PLAN_LABELS[planId] || planId}
    </span>
  );
  const toggleSound = soundEnabled ? () => setSoundEnabled(false) : enableSound;

  // Barre latérale (ordinateur et tablette). Tout défile d'un bloc si l'écran est petit :
  // le menu n'est jamais écrasé dans une petite zone.
  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain border-r border-[#e8e5dc] bg-white [scrollbar-width:thin]">
      {/* Marque */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <Logo markClassName="h-9 w-9" textClassName="text-lg" />
      </div>

      {/* Boutique */}
      <div className="mx-3 flex items-center gap-3 rounded-2xl bg-[#f8f7f3] p-2.5 ring-1 ring-[#ebe8e0]">
        {shopAvatar('h-10 w-10 text-base')}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-ink">{merchant.shop_name}</p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${planId === 'debutant' ? 'text-stone-500' : 'text-amber-700'}`}>
            {planId !== 'debutant' && <Crown className="h-3 w-3" />} Forfait {PLAN_LABELS[planId] || planId}
          </p>
        </div>
        <a
          href={getShopUrl()}
          target="_blank"
          rel="noreferrer"
          title="Voir ma vitrine"
          aria-label="Voir ma vitrine"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 ring-1 ring-[#e3dfd5] transition-colors hover:text-brand-700 hover:ring-brand-200"
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      {/* Menu */}
      <nav className="mt-5 space-y-5 px-3" aria-label="Navigation du tableau de bord">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-stone-400">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map(({ id, label, icon, iconOn, badge }) => {
                const active = activeTab === id;
                const Icon = active ? iconOn : icon; // page ouverte : icône pleine
                return (
                  <button
                    key={id}
                    onClick={() => openTab(id)}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14.5px] font-semibold transition-colors ${active ? 'text-brand-800' : 'text-stone-600 hover:bg-[#f8f7f3] hover:text-ink'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-brand-50"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      >
                        <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-600" />
                      </motion.span>
                    )}
                    <Icon className={`relative h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-700' : 'text-stone-400 group-hover:text-stone-600'}`} />
                    <span className="relative flex-1 text-left">{label}</span>
                    {badge > 0 && (
                      <span className="relative min-w-[22px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bas de barre : toujours en bas quand il y a de la place, à la suite sinon */}
      <div className="mt-auto space-y-2 px-3 pb-3 pt-6">
        {planId === 'debutant' && (
          <button
            onClick={() => openTab('billing')}
            className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-brand-50 px-3 py-2.5 text-left ring-1 ring-amber-200/70 transition-shadow hover:ring-amber-300"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 ring-1 ring-amber-200"><Sparkles className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Passer au Pro</span>
              <span className="block truncate text-xs text-stone-500">Produits illimités, 5 livreurs</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-400" />
          </button>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-[#ebe8e0] pt-3">
          <button onClick={() => setShowQRModal(true)} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#f7f6f2] px-2 py-2.5 text-xs font-bold text-stone-700 ring-1 ring-black/[0.04] transition-all hover:bg-white hover:text-ink hover:shadow-sm">
            <QrCode className="h-4 w-4 text-brand-700" /> QR code
          </button>
          <button onClick={handleDriverLinkCopy} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#f7f6f2] px-2 py-2.5 text-xs font-bold text-stone-700 ring-1 ring-black/[0.04] transition-all hover:bg-white hover:text-ink hover:shadow-sm">
            <Truck className="h-4 w-4 text-brand-700" /> Lien livreur
          </button>
        </div>
        <LogoutButton onClick={handleLogout} detail={user?.email} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f6f2] font-sans selection:bg-brand-200">
      {/* Message de confirmation (au-dessus de la barre d'onglets sur téléphone) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 md:inset-x-auto md:bottom-6 md:right-6">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-2xl"
              role="status"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Barre latérale (ordinateur et tablette) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] md:block">{sidebar}</aside>

      {/* Téléphone : barre d'onglets en bas de l'écran */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8e5dc] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map(({ id, label, icon, iconOn, badge }) => {
            const active = id === 'more' ? (isMobileMenuOpen || inMoreTabs) : (activeTab === id && !isMobileMenuOpen);
            const Icon = active ? iconOn : icon; // onglet ouvert : icône pleine
            const onClick = () => (id === 'more' ? setIsMobileMenuOpen(true) : openTab(id));
            return (
              <button key={id} type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-0.5 pb-2 pt-2 text-[11px] font-semibold">
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-brand-100" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon className={`relative h-5 w-5 ${active ? 'text-brand-800' : 'text-stone-500'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{badge}</span>
                  )}
                </span>
                <span className={active ? 'text-ink' : 'text-stone-500'}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Téléphone : panneau « Plus » */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-ink/35 md:hidden"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Plus d'options"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[1.75rem] bg-[#f7f6f2] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="mx-auto block h-1 w-10 rounded-full bg-stone-300" />
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#e8e5dc]">
                {shopAvatar('h-11 w-11 text-lg')}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{merchant.shop_name}</p>
                  {planChip}
                </div>
                <a href={getShopUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#f6f4ee] px-3 py-2 text-xs font-bold text-slate-700">
                  Vitrine <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Équipe', icon: Users, onClick: () => openTab('team'), active: activeTab === 'team' },
                  { label: 'Paramètres', icon: Settings, onClick: () => openTab('settings'), active: activeTab === 'settings' },
                  { label: 'Facturation', icon: CreditCard, onClick: () => openTab('billing'), active: activeTab === 'billing' },
                  { label: 'QR code', icon: QrCode, onClick: () => { setShowQRModal(true); setIsMobileMenuOpen(false); } },
                  { label: 'Lien livreur', icon: Truck, onClick: () => { handleDriverLinkCopy(); setIsMobileMenuOpen(false); } },
                  { label: soundEnabled ? 'Son activé' : 'Son coupé', icon: soundEnabled ? BellRing : BellOff, onClick: toggleSound, active: soundEnabled },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={t.onClick}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-xs font-semibold ring-1 transition-colors ${t.active ? 'bg-brand-50 text-brand-900 ring-brand-200' : 'bg-white text-slate-700 ring-[#e8e5dc]'}`}
                  >
                    <t.icon className={`h-5 w-5 ${t.active ? 'text-brand-700' : 'text-ink'}`} />
                    {t.label}
                  </button>
                ))}
              </div>

              {planId === 'debutant' && (
                <button onClick={() => openTab('billing')} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200/70">
                  <Sparkles className="h-5 w-5 shrink-0 text-amber-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-amber-900">Passez au forfait Pro</span>
                    <span className="block text-xs text-amber-800/80">Produits illimités et jusqu'à 5 livreurs.</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-amber-700" />
                </button>
              )}

              <LogoutButton onClick={handleLogout} detail={user?.email} className="mt-3 p-2.5" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="md:pl-[252px]">
        {/* En-tête */}
        <header className="sticky top-0 z-30 border-b border-[#e8e5dc]/80 bg-[#f7f6f2]/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-2.5 md:px-8 md:py-3">
            <span className="md:hidden">{shopAvatar('h-9 w-9 text-sm')}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">{merchant.shop_name}</p>
              <p className="truncate text-sm font-bold text-ink">{currentNav?.label}</p>
            </div>
            <button
              onClick={toggleSound}
              className={`flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full border px-2.5 py-2 text-sm font-semibold transition-colors md:px-3.5 ${soundEnabled ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-[#e8e5dc] bg-white text-stone-600 hover:border-stone-300'}`}
              title="Son des nouvelles commandes"
              aria-label={soundEnabled ? 'Couper le son des nouvelles commandes' : 'Activer le son des nouvelles commandes'}
            >
              {soundEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span className="hidden lg:inline">{soundEnabled ? 'Son activé' : 'Son coupé'}</span>
            </button>
            <button onClick={() => openTab('orders', { status: 'PENDING' })} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e5dc] bg-white text-stone-600 transition-colors hover:border-stone-300" aria-label={`${stats.pending} commande(s) à traiter`}>
              <Bell className="h-[18px] w-[18px]" />
              {stats.pending > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#f7f6f2]">
                  {stats.pending}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-3 border-l border-[#e8e5dc] pl-3 md:flex">
              <div className="text-right">
                <p className="max-w-[180px] truncate text-sm font-bold text-ink">{merchant.shop_name}</p>
                <p className="max-w-[180px] truncate text-[11px] text-stone-500">{user?.email}</p>
              </div>
              {shopAvatar('h-9 w-9 text-sm')}
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full h-full"
            >
        {loading && !hasLoaded ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand-600/20 border-t-brand-600"></div>
          </div>
        ) : activeTab === 'analytics' ? (
          <Overview
            merchant={merchant}
            orders={orders}
            products={products}
            driverBalances={driverBalances}
            today={{ totalEnbaisse, partLivreur, partMarchand }}
            shopUrl={getShopUrl()}
            inDirectory={Boolean(shopLocation?.is_public)}
            onNavigate={openTab}
            onAddProduct={openNewProduct}
            onOpenQR={() => setShowQRModal(true)}
            onShare={shareShop}
            onSelectDriver={setSelectedDriverForStats}
          />
        ) : activeTab === 'products' ? (
          <div className="mx-auto max-w-7xl">
            <PageHeader title="Produits" subtitle="Vos articles, leurs prix et leur stock.">
              {planId === 'debutant' && (
                <div className="min-w-[190px] rounded-2xl border border-[#e8e5dc] bg-white px-4 py-2.5">
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold text-stone-500">
                    <span>Forfait Débutant</span>
                    <span className="font-figures text-ink tabular-nums">{products.length} / 10 produits</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, products.length * 10)}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className={`h-full rounded-full ${products.length >= 10 ? 'bg-red-500' : products.length >= 8 ? 'bg-amber-500' : 'bg-brand-500'}`}
                    />
                  </div>
                </div>
              )}
              <PrimaryButton onClick={openNewProduct}>
                <Plus className="h-5 w-5" /> Ajouter un produit
              </PrimaryButton>
            </PageHeader>

            <AiTeaser onTry={openNewProduct} />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatPill icon={Boxes} label="Tous les produits" value={products.length} active={productFilter === 'ALL'} onClick={() => setProductFilter('ALL')} />
              <StatPill icon={CircleCheck} label="Bien en stock" value={productStats.inStock} tone="success" active={productFilter === 'IN_STOCK'} onClick={() => setProductFilter('IN_STOCK')} />
              <StatPill icon={TriangleAlert} label="Stock faible (≤ 5)" value={productStats.low} tone="amber" active={productFilter === 'LOW'} onClick={() => setProductFilter('LOW')} />
              <StatPill icon={CircleX} label="En rupture" value={productStats.out} tone="red" active={productFilter === 'OUT'} onClick={() => setProductFilter('OUT')} />
            </div>

            <motion.div variants={rise} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  type="search"
                  aria-label="Rechercher un produit"
                  placeholder="Rechercher un produit ou une catégorie…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={`${INPUT} pl-12`}
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#e8e5dc] bg-white px-4 py-3 text-sm">
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="text-stone-500">Valeur du stock</span>
                <span className="font-figures font-semibold text-ink tabular-nums">{fmt(productStats.value)} F</span>
              </div>
            </motion.div>

            {products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Votre catalogue est vide"
                text="Ajoutez votre premier produit : il apparaîtra instantanément sur votre vitrine."
                action={<PrimaryButton onClick={openNewProduct}><Plus className="h-5 w-5" /> Ajouter un produit</PrimaryButton>}
              />
            ) : visibleProducts.length === 0 ? (
              <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre mot-clé ou un autre filtre de stock." />
            ) : (
              <motion.div layout className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {visibleProducts.map((p, i) => {
                    const tone = p.stock <= 0
                      ? { label: 'Rupture', icon: CircleX, badge: 'bg-red-500/90 text-white', fill: 'bg-red-500', track: 'bg-red-100' }
                      : p.stock <= 5
                        ? { label: `Plus que ${p.stock}`, icon: TriangleAlert, badge: 'bg-amber-400/95 text-slate-900', fill: 'bg-amber-500', track: 'bg-amber-100' }
                        : { label: `${p.stock} en stock`, icon: CircleCheck, badge: 'bg-white/90 text-emerald-700', fill: 'bg-emerald-500', track: 'bg-emerald-100' };
                    const ToneIcon = tone.icon;
                    return (
                      <motion.article
                        layout
                        key={p.id}
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 12) * 0.04, duration: 0.5, ease: EASE } }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`${CARD} group flex flex-col overflow-hidden transition-colors hover:border-stone-300`}
                      >
                        <div className="relative aspect-square overflow-hidden bg-[#f1efe8] sm:aspect-[4/3]">
                          {p.image_url ? (
                            <img src={thumbUrl(p.image_url)} onError={fallbackToFull(p.image_url)} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageOff className="h-10 w-10 text-stone-300" />
                            </div>
                          )}
                                                    <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur sm:bottom-auto sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${tone.badge}`}>
                            <ToneIcon className="h-3.5 w-3.5" /> {tone.label}
                          </span>
                          <div className="absolute right-2 top-2 flex gap-1.5 sm:right-3 sm:top-3 sm:gap-2">
                            <button onClick={() => setPosterProduct(p)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition-colors hover:text-brand-600" aria-label={`Créer une affiche pour ${p.name}`} title="Créer une affiche">
                              <Megaphone className="h-4 w-4" />
                            </button>
                            <button onClick={() => openEditProduct(p)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition-colors hover:text-brand-600" aria-label={`Modifier ${p.name}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteProduct(p.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition-colors hover:text-red-500" aria-label={`Supprimer ${p.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-3 sm:p-5">
                          <span className="mb-1.5 inline-flex w-max max-w-full items-center gap-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 sm:text-xs">
                            <Tag className="h-3 w-3 shrink-0" /> <span className="truncate">{p.category || 'Sans catégorie'}</span>
                          </span>
                          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink sm:line-clamp-1 sm:text-lg">{p.name}</h3>
                          {p.description && <p className="mt-1 hidden text-sm text-stone-500 sm:line-clamp-2">{p.description}</p>}
                          <div className="mt-auto pt-3 sm:pt-4">
                            <p className="font-figures text-lg font-semibold tracking-tight text-ink tabular-nums sm:text-2xl">
                              {fmt(p.price_fcfa)} <span className="text-xs font-medium text-stone-400 sm:text-sm">FCFA</span>
                            </p>
                            {/* Réassort rapide */}
                            <div className={`mt-3 flex items-center justify-between gap-1 rounded-full p-1 ring-1 ${p.stock <= 0 ? 'bg-red-50 ring-red-200' : p.stock <= 5 ? 'bg-amber-50 ring-amber-200' : 'bg-[#f6f4ee] ring-[#e8e5dc]'}`}>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => adjustStock(p, -1)}
                                disabled={p.stock <= 0}
                                aria-label={`Retirer une pièce du stock de ${p.name}`}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-[#e8e5dc] transition-colors hover:ring-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Minus className="h-4 w-4" />
                              </motion.button>
                              <span className="min-w-0 text-center leading-tight" aria-live="polite">
                                <span className="block font-figures text-base font-semibold text-ink tabular-nums"><RollingNumber value={p.stock} format={(n) => String(n)} /></span>
                                <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-stone-500 min-[360px]:block">en stock</span>
                              </span>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => adjustStock(p, 1)}
                                aria-label={`Ajouter une pièce au stock de ${p.name}`}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-brand-800"
                              >
                                <Plus className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : activeTab === 'orders' ? (
          <div className="mx-auto max-w-[1240px]">
            <PageHeader title="Commandes" subtitle="Acceptez les nouvelles commandes et suivez leur livraison." />

            {/* Filtres par statut (avec compteurs) */}
            <motion.div variants={rise} className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              {[{ id: 'ALL', label: 'Toutes', icon: Layers }, ...ORDER_STATUSES].map((s) => {
                const count = s.id === 'ALL' ? orders.length : orders.filter((o) => o.status === s.id).length;
                const active = statusFilter === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    aria-pressed={active}
                    className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'text-white' : 'bg-white text-stone-600 ring-1 ring-[#e8e5dc] hover:text-ink hover:ring-stone-300'}`}
                  >
                    {active && <motion.span layoutId="order-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{s.label}</span>
                    <span className={`relative font-figures text-xs font-semibold tabular-nums ${active ? 'text-white/70' : 'text-stone-400'}`}>{count}</span>
                  </button>
                );
              })}
            </motion.div>

            <motion.div variants={rise} className="relative mb-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                placeholder="Client, téléphone ou n° de commande…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${INPUT} pl-12`}
                aria-label="Rechercher une commande"
              />
            </motion.div>

            {orders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Aucune commande" text="Partagez le lien de votre vitrine : vos futures commandes s'afficheront ici en direct." />
            ) : filteredOrders.length === 0 ? (
              <EmptyState icon={Search} title="Aucune commande ne correspond" text="Changez de statut ou de mot-clé." />
            ) : (
              <motion.div layout className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {orderGroups.flatMap((group) => [
                    <motion.h2
                      layout
                      key={`jour-${group.label}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="col-span-full mt-3 flex items-baseline justify-between gap-3 first:mt-0"
                    >
                      <span className="inline-block font-ledger text-xl text-ink first-letter:uppercase md:text-2xl">{group.label}</span>
                      <span className="text-xs font-semibold text-stone-500">
                        {group.orders.length} commande{group.orders.length > 1 ? 's' : ''} · <span className="font-figures tabular-nums">{fmt(group.orders.reduce((sum, o) => sum + (o.total_amount_fcfa || 0), 0))} F</span>
                      </span>
                    </motion.h2>,
                    ...group.orders.map((order) => {
                    const i = filteredOrders.indexOf(order);
                    const meta = statusMeta(order.status);
                    const StatusIcon = meta.icon;
                    const { address, coords } = parseOrderAddress(order.customer_address);
                    const open = expandedOrder === order.id;
                    const subtotal = (order.cart_items || []).reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
                    // Étape suivante proposée en grand : seulement l'acceptation. La suite est faite par le
                    // livreur dans son application (prise de la course, puis validation avec le code PIN du client).
                    const hint = order.status === 'PREPARING'
                      ? 'Visible par vos livreurs : le premier disponible prend la course.'
                      : order.status === 'IN_TRANSIT'
                        ? `${order.driver_name || 'Le livreur'} valide la livraison avec le code PIN du client.`
                        : order.status === 'DELIVERED'
                          ? `Livrée ${timeAgo(order.delivered_at || order.created_at)}.`
                          : null;
                    return (
                      <motion.article
                        layout
                        key={order.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.035, duration: 0.4, ease: EASE } }}
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                        className={`${CARD} flex flex-col p-4 md:p-5 ${order.status === 'PENDING' ? '!border-amber-300 ring-1 ring-amber-200' : ''} ${freshOrderIds.includes(order.id) ? 'fresh-order' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ring-1 ${meta.chip}`}>
                                <StatusIcon className="h-3.5 w-3.5" /> {meta.label}
                              </span>
                              <span className="text-stone-400">{timeAgo(order.created_at)}</span>
                              <span className="font-mono text-stone-400">#{order.id.slice(0, 6).toUpperCase()}</span>
                            </p>
                            <h3 className="mt-2 truncate text-lg font-bold text-ink">{order.customer_name}</h3>
                          </div>
                          <p className="shrink-0 font-figures text-2xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                            {fmt(order.total_amount_fcfa)}<span className="ml-1 text-xs font-medium text-stone-400">F</span>
                          </p>
                        </div>

                        {order.cart_items?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedOrder(open ? null : order.id)}
                            aria-expanded={open}
                            className="mt-1 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg py-1.5 text-left text-sm text-slate-700"
                          >
                            <span className={open ? '' : 'line-clamp-2'}>{order.cart_items.map((it) => `${it.quantity}× ${it.name}`).join(' · ')}</span>
                            <span className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-xs font-bold text-brand-700">
                              {open ? 'Masquer' : 'Détails'} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </span>
                          </button>
                        )}
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-xl bg-[#faf9f6] p-3.5 ring-1 ring-[#efece4]">
                                <ul className="space-y-1.5 text-sm">
                                  {order.cart_items.map((it, idx) => (
                                    <li key={idx} className="flex justify-between gap-3">
                                      <span className="min-w-0 text-slate-700">
                                        <span className="font-figures font-semibold tabular-nums">{it.quantity}×</span> {it.name}
                                        <span className="text-stone-400"> · {fmt(it.price)} F</span>
                                      </span>
                                      <span className="shrink-0 font-figures text-slate-800 tabular-nums">{fmt((it.price || 0) * (it.quantity || 0))} F</span>
                                    </li>
                                  ))}
                                </ul>
                                <dl className="mt-3 space-y-1 border-t border-dashed border-stone-300 pt-3 text-sm">
                                  <div className="flex justify-between gap-3"><dt className="text-stone-500">Articles</dt><dd className="font-figures tabular-nums">{fmt(subtotal)} F</dd></div>
                                  <div className="flex justify-between gap-3"><dt className="min-w-0 truncate text-stone-500">Livraison · {order.delivery_zone}</dt><dd className="shrink-0 font-figures tabular-nums">{fmt(Math.max(0, (order.total_amount_fcfa || 0) - subtotal))} F</dd></div>
                                  <div className="flex justify-between gap-3 font-bold text-ink"><dt>Total</dt><dd className="font-figures tabular-nums">{fmt(order.total_amount_fcfa)} F</dd></div>
                                </dl>
                                <p className="mt-2 text-xs text-stone-500">
                                  Passée le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="mt-3 space-y-2 text-sm">
                          <a href={`tel:${order.customer_phone}`} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-slate-700 underline decoration-stone-300 underline-offset-4 hover:text-brand-700">
                            <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                          </a>
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-slate-700">{address || 'Adresse non précisée'}</span>
                              <span className="block text-xs text-stone-500">{order.delivery_zone}{coords ? ' · position GPS partagée' : ''}</span>
                            </span>
                            <a
                              href={orderMapsUrl(order)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
                            >
                              <Navigation className="h-3 w-3" /> Itinéraire
                            </a>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {order.delivery_pin && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200"><ShieldCheck className="h-3 w-3" /> PIN {order.delivery_pin}</span>
                          )}
                          {order.payment_method === 'ON_DELIVERY' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#f1efe8] px-2 py-0.5 text-xs font-semibold text-stone-700"><Banknote className="h-3 w-3" /> À la livraison</span>
                          )}
                          {order.payment_method === 'MOBILE_MONEY' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"><Smartphone className="h-3 w-3" /> {paymentLabel(order)}</span>
                          )}
                          {order.payment_method === 'DEPOSIT' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CreditCard className="h-3 w-3" /> Acompte : {order.payment_deposit_amount} FCFA</span>
                          )}
                          {order.payment_method === 'FULL_UPFRONT' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CircleCheck className="h-3 w-3" /> Intégral payé</span>
                          )}
                          {order.driver_name && order.status === 'IN_TRANSIT' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"><Bike className="h-3 w-3" /> {order.driver_name}</span>
                          )}
                        </div>

                        <div className="mt-auto pt-4">
                          <div className="flex flex-wrap items-center gap-2 border-t border-[#efece4] pt-4">
                            {order.status === 'PENDING' ? (
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={(e) => acceptOrder(order, e.currentTarget)}
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
                              >
                                <Check className="h-4 w-4" /> Accepter la commande
                              </motion.button>
                            ) : (
                              <p className="min-w-0 flex-1 text-sm text-stone-500">{hint}</p>
                            )}
                            <a
                              href={generateWhatsAppMessage(order)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Écrire à ${order.customer_name} sur WhatsApp`}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1fb957]"
                            >
                              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                            <div className="relative">
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className="min-h-11 cursor-pointer appearance-none rounded-full bg-white py-2 pl-4 pr-9 text-base font-semibold md:text-sm text-slate-700 ring-1 ring-[#dcd8cd] outline-none transition-shadow hover:ring-stone-400 focus:ring-2 focus:ring-brand-600"
                                aria-label="Changer le statut de la commande"
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })])}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        ) : activeTab === 'drivers' ? (
          <div className="mx-auto max-w-5xl">
            <PageHeader title="Livraisons" subtitle="Tout ce qui a été livré : produits, client, livreur, heure et code PIN validé." />

            <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatPill icon={Truck} label="Livraisons effectuées" value={deliveredOrders.length} tone="violet" />
              <StatPill icon={Coins} label="Montant encaissé" value={`${fmt(deliveredOrders.reduce((acc, o) => acc + (o.total_amount_fcfa || 0), 0))} F`} tone="emerald" />
              <StatPill icon={Users} label="Livreurs mobilisés" value={new Set(deliveredOrders.map((o) => o.driver_name).filter(Boolean)).size} tone="sky" />
              <StatPill icon={CalendarDays} label="Livrées aujourd'hui" value={deliveredOrders.filter((o) => new Date(o.delivered_at || o.created_at).toDateString() === today).length} tone="amber" />
            </div>

            {deliveredOrders.length === 0 ? (
              <EmptyState icon={Truck} title="Historique vide" text="Aucune livraison n'a encore été validée. Elles apparaîtront ici dès que vos livreurs saisiront le code PIN." />
            ) : (
              <div className="relative">
                <div className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-brand-300 via-[#e8e5dc] to-transparent" />
                {deliveredOrders.map((order, i) => {
                  const when = new Date(order.delivered_at || order.created_at);
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.05, duration: 0.5, ease: EASE }}
                      className="relative mb-4 pl-14"
                    >
                      <span className="absolute left-2 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-[#f7f6f2]">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <div className={`${CARD} p-4 transition-colors hover:border-stone-300 md:p-5`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1efe8] text-lg font-bold text-ink">
                              {order.driver_name ? order.driver_name.charAt(0).toUpperCase() : '?'}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{order.driver_name || 'Livreur inconnu'}</p>
                              <p className="flex items-center gap-1 text-xs text-slate-500"><Bike className="h-3 w-3" /> Livreur assigné</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">{when.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <p className="text-xs text-slate-400">{when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <span className="flex flex-col items-center rounded-xl bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200">
                              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"><ShieldCheck className="h-3 w-3" /> PIN validé</span>
                              <span className="font-mono text-sm font-extrabold text-emerald-800">{order.delivery_pin || '---'}</span>
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-4 border-t border-[#efece4] pt-4 lg:flex-row lg:items-end lg:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {order.cart_items?.map((item, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f6f4ee] px-2.5 py-1 text-sm text-slate-700 ring-1 ring-[#e8e5dc]">
                                <span className="rounded-md bg-white px-1.5 text-xs font-extrabold text-brand-700 shadow-sm">{item.quantity}×</span>
                                {item.name}
                              </span>
                            ))}
                          </div>
                          <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-end lg:gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> {order.customer_name}</span>
                            <span className="font-figures text-lg font-semibold text-ink tabular-nums">{fmt(order.total_amount_fcfa)} <span className="font-sans text-xs font-medium text-stone-400">FCFA encaissés</span></span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'team' ? (
          <div className="mx-auto max-w-7xl">
            <PageHeader title="Équipe" subtitle="Vos livreurs, leurs courses et leur solde du jour.">
              {(planId === 'debutant' || planId === 'pro') && (
                <div className="min-w-[180px] rounded-2xl border border-[#e8e5dc] bg-white px-4 py-2.5">
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold text-stone-500">
                    <span>Forfait {PLAN_LABELS[planId]}</span>
                    <span className="text-slate-900">{team.length} / {planId === 'debutant' ? 1 : 5} livreur{planId === 'pro' ? 's' : ''}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-amber-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (team.length / (planId === 'debutant' ? 1 : 5)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className="h-full rounded-full bg-amber-500"
                    />
                  </div>
                </div>
              )}
              <PrimaryButton onClick={() => setShowDriverModal(true)}>
                <UserPlus className="h-5 w-5" /> Ajouter un livreur
              </PrimaryButton>
            </PageHeader>

            {/* Lien de l'application livreur */}
            <motion.div variants={rise} className="mb-8 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-200"><Smartphone className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">Application livreur</p>
                  <p className="mt-0.5 text-sm text-stone-600">Envoyez ce lien à vos livreurs : ils se connectent avec leur téléphone et leur numéro de CNI.</p>
                  <p className="mt-2 truncate font-mono text-xs text-brand-800">{getDriverUrl()}</p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleDriverLinkCopy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800 md:flex-none">
                    <Copy className="h-4 w-4" /> Copier le lien
                  </motion.button>
                  <a href={getDriverUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3.5 py-3 text-brand-800 transition-colors hover:border-brand-300" aria-label="Ouvrir l'application livreur">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.div>

            {team.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun livreur"
                text="Ajoutez votre premier livreur pour lui confier des courses et suivre son solde."
                action={<PrimaryButton onClick={() => setShowDriverModal(true)}><UserPlus className="h-5 w-5" /> Ajouter un livreur</PrimaryButton>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {team.map((driver, i) => {
                  const balance = driverBalances.find((b) => b.id === driver.id) || { count: 0, aReverser: 0 };
                  const VehicleIcon = vehicleIcon(driver.vehicle_type);
                  return (
                    <motion.article
                      key={driver.id}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(i, 9) * 0.06, duration: 0.5, ease: EASE }}
                      className={`${CARD} group overflow-hidden transition-colors hover:border-stone-300`}
                    >
                      <div className="relative h-20 overflow-hidden bg-[#f1efe8]">
                        <div className="absolute inset-0 bg-[radial-gradient(color-mix(in_srgb,_var(--color-ink)_9%,_transparent)_1px,transparent_1px)] [background-size:14px_14px]" />
                        <button onClick={() => deleteDriver(driver.id)} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-500 ring-1 ring-[#e8e5dc] transition-colors hover:bg-red-600 hover:text-white" aria-label={`Supprimer ${driver.full_name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-6 pb-6">
                        <div className="-mt-9 mb-3 flex items-end justify-between">
                          <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white font-ledger text-4xl text-brand-800 shadow-sm ring-4 ring-white">
                            {driver.full_name.charAt(0).toUpperCase()}
                            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white ring-2 ring-white">
                              <VehicleIcon className="h-3.5 w-3.5" />
                            </span>
                          </span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">{driver.vehicle_type}</span>
                        </div>
                        <h3 className="text-xl font-bold text-ink">{driver.full_name}</h3>
                        <div className="mt-3 space-y-2 text-sm">
                          <a href={driver.phone_number ? `tel:${driver.phone_number}` : undefined} className="flex min-h-9 items-center gap-2 text-slate-600 hover:text-brand-700">
                            <Phone className="h-4 w-4 text-slate-400" /> {driver.phone_number || '---'}
                          </a>
                          <p className="flex items-center gap-2 text-slate-600">
                            <IdCard className="h-4 w-4 text-slate-400" /> {driver.cni_number || 'CNI non renseignée'}
                          </p>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-[#f6f4ee] p-3">
                            <p className="text-xs text-stone-500">Courses aujourd'hui</p>
                            <p className="font-figures text-lg font-semibold text-ink tabular-nums">{balance.count}</p>
                          </div>
                          <div className="rounded-xl bg-[#f6f4ee] p-3">
                            <p className="text-xs text-stone-500">{balance.aReverser < 0 ? 'Vous lui devez' : 'À vous reverser'}</p>
                            <p className={`font-figures text-lg font-semibold tabular-nums ${balance.aReverser < 0 ? 'text-red-700' : 'text-ink'}`}>{fmt(Math.abs(balance.aReverser))} F</p>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedDriverForStats(driver)}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
                        >
                          <TrendingUp className="h-4 w-4" /> Bilan du jour
                        </motion.button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="mx-auto max-w-4xl">
            <PageHeader title="Paramètres" subtitle="Les informations et l’apparence de votre vitrine.">
              <a href={getShopUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#dcd8cd] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-stone-400">
                <Eye className="h-4 w-4" /> Voir la vitrine
              </a>
            </PageHeader>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <SectionCard icon={Store} gradient="emerald" title="Identité" subtitle="Les informations principales de votre boutique">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={LABEL}>Nom de la boutique</label>
                    <input type="text" value={settingsForm.shop_name} onChange={(e) => setSettingsForm({ ...settingsForm, shop_name: e.target.value })} className={INPUT} placeholder="Ma Super Boutique" required />
                  </div>
                  <div>
                    <label className={LABEL}>Téléphone (WhatsApp)</label>
                    <input type="tel" value={settingsForm.phone_number} onChange={(e) => setSettingsForm({ ...settingsForm, phone_number: e.target.value })} className={INPUT} placeholder="+221 77..." required />
                  </div>
                </div>
                <div className="mt-5">
                  <label className={LABEL}>Description de la boutique</label>
                  <textarea rows={4} value={settingsForm.description} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} className={`${INPUT} resize-none`} placeholder="Ex : La meilleure boutique de vêtements de Dakar. Livraison rapide et paiement à la livraison." />
                </div>
              </SectionCard>

              <SectionCard icon={Palette} gradient="violet" title="Apparence de la vitrine" subtitle="Thème, bannière et couleur principale">
                <label className={LABEL}>Thème de la vitrine</label>
                <p className="-mt-1 mb-3 text-xs text-slate-500">Chaque thème a ses couleurs, sa police et une photo de bannière (utilisée si vous n'importez pas la vôtre). « Aperçu » ouvre votre vitrine avec ce thème, sans rien enregistrer.</p>
                <div className="mb-6">
                  <ThemePicker
                    value={settingsForm.layout_style}
                    shopUrl={merchant?.shop_name ? getShopUrl() : null}
                    onChange={(t) => setSettingsForm({ ...settingsForm, layout_style: t.id, theme_color: t.accent })}
                  />
                </div>

                <label className={LABEL}>Bannière d'accueil</label>
                {settingsForm.banner_url && !settingsForm.bannerFile ? (
                  <div className="group relative mb-6 overflow-hidden rounded-2xl">
                    <img src={settingsForm.banner_url} alt="Bannière" className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <button type="button" onClick={() => setSettingsForm({ ...settingsForm, banner_url: '', bannerFile: null })} className="absolute right-3 top-3 rounded-full bg-red-500 p-2 text-white shadow-lg transition-colors hover:bg-red-600" title="Supprimer la bannière">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="group relative mb-6 flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-brand-500 hover:bg-brand-50/40">
                    {settingsForm.bannerFile ? (
                      <FilePreview file={settingsForm.bannerFile} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <motion.span whileHover={{ scale: 1.1, rotate: -6 }}><ImagePlus className="mb-2 h-8 w-8 text-slate-400 transition-colors group-hover:text-brand-600" /></motion.span>
                        <p className="text-sm font-semibold text-slate-600">Cliquez pour importer une bannière</p>
                        <p className="text-xs text-slate-400">Format paysage recommandé (ex : 1920 × 1080 px)</p>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setSettingsForm({ ...settingsForm, bannerFile: e.target.files[0] })} className="hidden" />
                  </label>
                )}

                <label className={LABEL}>Couleur principale</label>
                <p className="-mt-1 mb-3 text-xs text-slate-500">Proposée par le thème. Vous pouvez la remplacer par la couleur de votre marque.</p>
                <div className="flex flex-wrap items-center gap-3">
                  {[...new Set([getShopTheme(settingsForm.layout_style).accent, '#059669', '#0ea5e9', '#6366f1', '#db2777', '#f97316', '#ca8a04', '#0f172a'])].map((c) => (
                    <motion.button
                      type="button"
                      key={c}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSettingsForm({ ...settingsForm, theme_color: c })}
                      className={`h-10 w-10 rounded-full shadow-md ring-offset-2 transition-shadow ${settingsForm.theme_color?.toLowerCase() === c ? 'ring-2 ring-slate-900' : ''}`}
                      style={{ background: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                  <label className="relative h-10 w-10 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] shadow-md" title="Couleur personnalisée">
                    <input type="color" value={settingsForm.theme_color} onChange={(e) => setSettingsForm({ ...settingsForm, theme_color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                  <input type="text" value={settingsForm.theme_color} onChange={(e) => setSettingsForm({ ...settingsForm, theme_color: e.target.value })} className={`${INPUT} w-32 font-mono`} aria-label="Code couleur" />
                  <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md" style={{ background: settingsForm.theme_color }}>
                    <ShoppingBag className="h-4 w-4" /> Aperçu du bouton
                  </span>
                </div>
              </SectionCard>

              <SectionCard icon={Mail} gradient="sky" title="Contact" subtitle="Affichés sur votre vitrine">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={LABEL}>Email de contact</label>
                    <input type="email" value={settingsForm.email} onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })} className={INPUT} placeholder="contact@maboutique.com" />
                  </div>
                  <div>
                    <label className={LABEL}>Adresse physique</label>
                    <input type="text" value={settingsForm.address} onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} className={INPUT} placeholder="Dakar, Sénégal" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={MapPin} gradient="rose" title="Localisation de la boutique" subtitle="Visible par vous et l'équipe SamaBoutik, et sur la carte publique seulement si vous l'activez">
                {shopLocation ? (
                  <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
                      <iframe
                        title="Position de la boutique"
                        className="h-56 w-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${shopLocation.longitude - 0.008}%2C${shopLocation.latitude - 0.005}%2C${shopLocation.longitude + 0.008}%2C${shopLocation.latitude + 0.005}&layer=mapnik&marker=${shopLocation.latitude}%2C${shopLocation.longitude}`}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CircleCheck className="h-4 w-4" /> Boutique localisée</p>
                        <p className="mt-1 font-mono text-xs text-emerald-900/70">{shopLocation.latitude.toFixed(5)}, {shopLocation.longitude.toFixed(5)}</p>
                        {shopLocation.accuracy_m != null && <p className="text-xs text-emerald-900/70">Précision ± {shopLocation.accuracy_m} m</p>}
                        <p className="mt-1 text-xs text-emerald-900/60">Mise à jour le {new Date(shopLocation.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <a href={googleMapsUrl(shopLocation.latitude, shopLocation.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                        <ExternalLink className="h-4 w-4" /> Ouvrir dans Google Maps
                      </a>
                      <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={updateShopLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60">
                        {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Mettre à jour ma position
                      </motion.button>
                    </div>
                    <div className="md:col-span-2">
                      <DirectoryToggle location={shopLocation} onChange={setShopLocation} showToast={showToast} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-8 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      <MapPin className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">Votre boutique n'est pas encore localisée</p>
                      <p className="mt-1 text-sm text-slate-500">Rendez-vous dans votre boutique, puis appuyez sur le bouton : votre téléphone donnera la position exacte.</p>
                    </div>
                    <PrimaryButton type="button" onClick={updateShopLocation} disabled={locating}>
                      {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Localiser ma boutique
                    </PrimaryButton>
                  </div>
                )}
              </SectionCard>

              <WhatsAppSettingsCard merchant={merchant} userId={user?.id} showToast={showToast} />

              <SectionCard icon={Wallet} gradient="amber" title="Réception des paiements" subtitle="Le compte qui reçoit l'argent de vos ventes">
                <label className={LABEL}>Méthode de réception</label>
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: 'WAVE', label: 'Wave', color: 'bg-sky-400' },
                    { id: 'ORANGE_MONEY', label: 'Orange Money', color: 'bg-orange-500' },
                    { id: 'FREE_MONEY', label: 'Free Money', color: 'bg-red-500' },
                  ].map((p) => {
                    const active = settingsForm.payout_provider === p.id;
                    return (
                      <motion.button
                        type="button"
                        key={p.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSettingsForm({ ...settingsForm, payout_provider: p.id })}
                        className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-bold transition-colors ${active ? 'border-amber-500 bg-amber-50/60 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        <span className={`h-3 w-3 rounded-full ${p.color}`} />
                        <span className="flex-1">{p.label}</span>
                        {active && <Check className="h-4 w-4 text-amber-600" strokeWidth={3} />}
                      </motion.button>
                    );
                  })}
                </div>
                <label className={LABEL}>Numéro de téléphone (Wave / OM)</label>
                <input type="tel" value={settingsForm.payout_phone_number} onChange={(e) => setSettingsForm({ ...settingsForm, payout_phone_number: e.target.value })} className={INPUT} placeholder="Ex : 77 123 45 67" />
                <p className="mt-2 text-xs text-slate-500">Vous recevrez l'argent de vos ventes sur ce compte (moins la commission de 5 %).</p>
              </SectionCard>

              <SectionCard icon={ImagePlus} gradient="rose" title="Logo de la boutique" subtitle="Format carré recommandé, idéalement un PNG à fond transparent">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-inner">
                    {settingsForm.logoFile ? (
                      <FilePreview file={settingsForm.logoFile} className="h-full w-full object-contain" />
                    ) : settingsForm.logo_url ? (
                      <img src={settingsForm.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Store className="h-8 w-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800">
                      <Upload className="h-4 w-4" /> Importer un logo
                      <input type="file" accept="image/*" onChange={(e) => setSettingsForm({ ...settingsForm, logoFile: e.target.files[0] })} className="hidden" />
                    </label>
                    {(settingsForm.logo_url || settingsForm.logoFile) && (
                      <button type="button" onClick={() => setSettingsForm({ ...settingsForm, logo_url: '', logoFile: null })} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Globe} gradient="slate" title="Réseaux sociaux" subtitle="Liens affichés sur votre vitrine">
                <div className="space-y-3">
                  {[
                    { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/...', badge: <Facebook className="h-5 w-5" />, cls: 'bg-[#1877F2]' },
                    { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/...', badge: <Instagram className="h-5 w-5" />, cls: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600' },
                    { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...', badge: <TikTok className="h-5 w-5" />, cls: 'bg-slate-900' },
                  ].map((s) => (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${s.cls}`} title={s.label}>{s.badge}</span>
                      <input type="url" value={settingsForm[s.key]} onChange={(e) => setSettingsForm({ ...settingsForm, [s.key]: e.target.value })} placeholder={s.placeholder} className={INPUT} aria-label={s.label} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={Truck} gradient="emerald" title="Zones et frais de livraison" subtitle={`${settingsForm.delivery_zones?.filter((z) => z.active).length || 0} zone(s) active(s) — activez celles où vous livrez`}>
                <div className="grid max-h-[440px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2">
                  {settingsForm.delivery_zones?.map((zone, index) => (
                    <div key={zone.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${zone.active ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200 bg-white'}`}>
                      <Toggle
                        checked={zone.active}
                        label={zone.name}
                        onChange={(checked) => {
                          const newZones = [...settingsForm.delivery_zones];
                          newZones[index] = { ...zone, active: checked };
                          setSettingsForm({ ...settingsForm, delivery_zones: newZones });
                        }}
                      />
                      <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${zone.active ? 'text-slate-900' : 'text-slate-500'}`}>{zone.name}</span>
                      {zone.active && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={zone.price}
                            onChange={(e) => {
                              const newZones = [...settingsForm.delivery_zones];
                              newZones[index] = { ...zone, price: parseInt(e.target.value) || 0 };
                              setSettingsForm({ ...settingsForm, delivery_zones: newZones });
                            }}
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                            aria-label={`Prix pour ${zone.name}`}
                          />
                          <span className="text-xs font-bold text-slate-500">F</span>
                        </div>
                      )}
                      {zone.id.startsWith('custom-') && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm({ ...settingsForm, delivery_zones: settingsForm.delivery_zones.filter((_z, i) => i !== index) })}
                          className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Supprimer ${zone.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    id="newZoneName"
                    placeholder="Ajouter une zone personnalisée (ex : Thiès - Mbour)"
                    className={INPUT}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.target.value.trim()) {
                          setSettingsForm({
                            ...settingsForm,
                            delivery_zones: [...settingsForm.delivery_zones, { id: 'custom-' + Date.now(), name: e.target.value.trim(), price: 1000, active: true }],
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('newZoneName');
                      if (input.value.trim()) {
                        setSettingsForm({
                          ...settingsForm,
                          delivery_zones: [...settingsForm.delivery_zones, { id: 'custom-' + Date.now(), name: input.value.trim(), price: 1000, active: true }],
                        });
                        input.value = '';
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-50 px-4 text-sm font-bold text-brand-700 ring-1 ring-brand-200 transition-colors hover:bg-brand-100"
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </SectionCard>

              {/* Barre d'enregistrement collante */}
              <motion.div variants={rise} className="sticky bottom-24 z-10 md:bottom-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/85 p-3 pl-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                  <p className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Sparkles className="h-4 w-4 text-brand-600" /> Les changements s'appliquent à votre vitrine dès l'enregistrement.</p>
                  <PrimaryButton type="submit" disabled={settingsForm.isSaving} className="w-full sm:w-auto">
                    {settingsForm.isSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Save className="h-4 w-4" /> Enregistrer les paramètres</>}
                  </PrimaryButton>
                </div>
              </motion.div>
            </form>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="mx-auto max-w-[1100px]">
            <PageHeader title="Facturation" subtitle="Votre forfait et les forfaits disponibles." />

            <motion.div variants={rise} className={`${CARD} mb-8 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6`}>
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Crown className="h-6 w-6" /></span>
                <div>
                  <p className="text-sm text-stone-500">Votre forfait actuel</p>
                  <p className="font-ledger text-3xl leading-tight text-ink">{PLAN_LABELS[planId] || planId}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {merchant?.subscription_status === 'expired' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 ring-1 ring-red-200"><CircleX className="h-4 w-4" /> Expiré</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200"><CircleCheck className="h-4 w-4" /> Actif</span>
                )}
                {merchant?.subscription_end_date && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f4ee] px-3 py-1.5 text-sm text-stone-600 ring-1 ring-[#e8e5dc]">
                    <CalendarDays className="h-4 w-4" /> Jusqu'au {new Date(merchant.subscription_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-5">
              {[
                { id: 'debutant', name: 'Débutant', price: '0', desc: 'Pour lancer votre première boutique', icon: Rocket, features: PLAN_FEATURES.debutant },
                { id: 'pro', name: 'Pro', price: '5 000', desc: 'Pour les marchands réguliers', icon: Zap, popular: true, features: PLAN_FEATURES.pro },
                { id: 'premium', name: 'Premium', price: '15 000', desc: 'Pour les grandes boutiques', icon: Gem, features: PLAN_FEATURES.premium },
              ].map((plan, i) => {
                const current = planId === plan.id;
                const highlight = plan.popular;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.08, duration: 0.5, ease: EASE }}
                    className={`relative flex h-full flex-col rounded-2xl border p-6 md:p-7 ${current ? 'border-ink bg-white ring-1 ring-ink' : highlight ? 'border-brand-300 bg-brand-50/50' : 'border-[#e8e5dc] bg-white'}`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ${highlight ? 'bg-white text-brand-700 ring-brand-200' : 'bg-[#f6f4ee] text-ink ring-[#e8e5dc]'}`}>
                        <plan.icon className="h-5 w-5" />
                      </span>
                      {current ? (
                        <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Votre forfait</span>
                      ) : highlight ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Le plus choisi</span>
                      ) : null}
                    </div>
                    <h3 className="font-ledger text-3xl leading-tight text-ink">{plan.name}</h3>
                    <p className="mt-1 text-sm text-stone-500">{plan.desc}</p>
                    <p className="my-6 flex items-baseline gap-2">
                      <span className="font-figures text-5xl font-semibold tracking-tight text-ink tabular-nums">{plan.price}</span>
                      <span className="text-sm font-semibold text-stone-500">FCFA / mois</span>
                    </p>
                    <ul className="mb-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                          <span className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${highlight ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'}`}>
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.id === 'debutant' ? (
                      <button disabled className="w-full cursor-not-allowed rounded-full bg-[#f1efe8] py-3.5 text-sm font-bold text-stone-500">
                        {current ? 'Forfait actuel' : 'Gratuit à vie'}
                      </button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePaySubscription(plan.id)}
                        disabled={current || isProcessingPayment}
                        className={`w-full rounded-full py-3.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                          current
                            ? 'bg-[#f1efe8] text-stone-500'
                            : highlight
                              ? 'bg-brand-600 text-white hover:bg-brand-700'
                              : 'bg-ink text-white hover:bg-brand-800'
                        }`}
                      >
                        {isProcessingPayment
                          ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Patientez…</span>
                          : current ? 'Forfait actuel' : `Passer au forfait ${plan.name}`}
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <motion.p variants={rise} className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-stone-500">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Paiements sécurisés par PayDunya (Wave, Orange Money, carte bancaire)
            </motion.p>
          </div>
        ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modale produit */}
      <Modal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        icon={editingProductId ? Pencil : Package}
        gradient="emerald"
        title={editingProductId ? 'Modifier le produit' : 'Nouveau produit'}
        subtitle="Les changements apparaissent aussitôt sur votre vitrine"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowProductModal(false)} className="rounded-2xl px-6 py-3 font-bold text-slate-500 transition-colors hover:bg-slate-100">Annuler</button>
            <PrimaryButton type="submit" form="product-form" disabled={uploading}>
              {uploading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Check className="h-4 w-4" /> {editingProductId ? 'Enregistrer' : 'Ajouter le produit'}</>}
            </PrimaryButton>
          </div>
        }
      >
        <form id="product-form" onSubmit={submitProduct} className="space-y-5">
          <label className="group relative flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-brand-400 hover:bg-brand-50/40">
            {newProduct.image ? (
              <FilePreview file={newProduct.image} className="absolute inset-0 h-full w-full object-cover" />
            ) : editingProductId && products.find((p) => p.id === editingProductId)?.image_url ? (
              <img src={products.find((p) => p.id === editingProductId).image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus className="mb-2 h-9 w-9 text-slate-400 transition-colors group-hover:text-brand-600" />
                <p className="text-sm font-semibold text-slate-600">Cliquez pour importer une photo</p>
                <p className="text-xs text-slate-400">JPG, PNG ou WebP</p>
              </>
            )}
            {(newProduct.image || editingProductId) && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow backdrop-blur">
                <Upload className="h-3.5 w-3.5" /> Changer la photo
              </span>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <AiProductAssistant
            imageSource={newProduct.image || (editingProductId ? products.find((p) => p.id === editingProductId)?.image_url : null) || null}
            onSheet={(sheet) => setNewProduct((prev) => ({
              ...prev,
              name: sheet.name || prev.name,
              description: sheet.description || prev.description,
              category: sheet.category || prev.category,
              features: { ...sheet.features },
              tags: [...new Set([...(prev.tags || []), ...sheet.tags])].slice(0, 12),
            }))}
            onStudioPhoto={(file) => setNewProduct((prev) => ({ ...prev, image: file }))}
          />

          <div>
            <label className={LABEL}>Nom du produit</label>
            <input required type="text" placeholder="Ex : Chemise en lin" className={INPUT} value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea rows="3" placeholder="Détails du produit..." className={`${INPUT} resize-none`} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Mots-clés <span className="font-normal text-slate-400">(aident vos clients à trouver le produit)</span></label>
            <TagsInput value={newProduct.tags || []} onChange={(tags) => setNewProduct((prev) => ({ ...prev, tags }))} />
          </div>
          <div>
            <label className={LABEL}>Catégorie</label>
            <div className="relative">
              <select className={`${INPUT} cursor-pointer appearance-none pr-10`} value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value, features: {} })}>
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {(CATEGORY_FEATURES[newProduct.category] || []).length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-900">
                <Sparkles className="h-4 w-4 text-brand-500" /> Caractéristiques spécifiques (optionnel)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(CATEGORY_FEATURES[newProduct.category] || []).map((feature) => (
                  <div key={feature}>
                    <label className="mb-1 block text-xs font-bold text-slate-700">{feature}</label>
                    <input
                      type="text"
                      placeholder="Valeur..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                      value={newProduct.features[feature] || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, features: { ...newProduct.features, [feature]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Prix (FCFA)</label>
              <input required type="number" min="0" placeholder="0" className={INPUT} value={newProduct.price_fcfa} onChange={(e) => setNewProduct({ ...newProduct, price_fcfa: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Stock</label>
              <input required type="number" min="0" placeholder="10" className={INPUT} value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Affiche produit (statut WhatsApp, publication) */}
      <ProductPoster product={posterProduct} merchant={merchant} shopUrl={getShopUrl()} onClose={() => setPosterProduct(null)} />

      <AnimatePresence>
        {logoutOpen && (
          <LogoutDialog
            key="logout"
            name={merchant?.shop_name}
            detail={user?.email}
            avatarUrl={merchant?.logo_url}
            consequence="Votre boutique reste en ligne et continue de recevoir des commandes. Reconnectez-vous pour les traiter."
            allowEverywhere
            onCancel={() => setLogoutOpen(false)}
            onConfirm={confirmLogout}
          />
        )}
      </AnimatePresence>

      {/* Modale QR code */}
      <Modal open={showQRModal} onClose={() => setShowQRModal(false)} icon={QrCode} gradient="slate" title="Votre QR code" subtitle="Scannez-le pour ouvrir votre vitrine" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
            className="mb-5 rounded-[2rem]"
          >
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-16px_color-mix(in_srgb,_var(--color-ink)_35%,_transparent)]">
              <QRCodeSVG id="shop-qr" value={getShopUrl()} size={200} fgColor={BRAND.night} />
            </div>
          </motion.div>
          <p className="mb-5 max-w-full truncate rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">{getShopUrl()}</p>
          <div className="grid w-full grid-cols-2 gap-2">
            <button onClick={copyShopLink} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200">
              <Copy className="h-4 w-4" /> Copier le lien
            </button>
            <button onClick={downloadQR} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800">
              <Download className="h-4 w-4" /> Télécharger
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale nouveau livreur */}
      <Modal
        open={showDriverModal}
        onClose={() => setShowDriverModal(false)}
        icon={UserPlus}
        gradient="amber"
        title="Nouveau livreur"
        subtitle="Il pourra se connecter à l'application livreur"
        footer={
          <PrimaryButton type="submit" form="driver-form" className="w-full">
            <Check className="h-4 w-4" /> Enregistrer le livreur
          </PrimaryButton>
        }
      >
        <form id="driver-form" onSubmit={submitDriver} className="space-y-5">
          <div>
            <label className={LABEL}>Nom complet</label>
            <input required type="text" placeholder="Ex : Mamadou Diallo" className={INPUT} value={newDriver.full_name} onChange={(e) => setNewDriver({ ...newDriver, full_name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Numéro de téléphone</label>
            <input required type="text" placeholder="Ex : 77 123 45 67" className={INPUT} value={newDriver.phone_number} onChange={(e) => setNewDriver({ ...newDriver, phone_number: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Type de véhicule</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {['Moto', 'Scooter', 'Voiture', 'Vélo', 'Autre'].map((v) => {
                const Icon = vehicleIcon(v);
                const active = newDriver.vehicle_type === v;
                return (
                  <motion.button
                    type="button"
                    key={v}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewDriver({ ...newDriver, vehicle_type: v })}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-bold transition-colors ${active ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <Icon className="h-5 w-5" /> {v}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={LABEL}>Numéro de CNI / pièce d'identité</label>
            <input type="text" placeholder="Optionnel" className={INPUT} value={newDriver.cni_number} onChange={(e) => setNewDriver({ ...newDriver, cni_number: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Modale bilan livreur */}
      <Modal
        open={!!selectedDriverForStats}
        onClose={() => setSelectedDriverForStats(null)}
        icon={TrendingUp}
        gradient="violet"
        title="Bilan du jour"
        subtitle={selectedDriverForStats?.full_name}
        maxWidth="max-w-2xl"
        footer={
          <button onClick={() => setSelectedDriverForStats(null)} className="w-full rounded-2xl bg-slate-900 py-3.5 font-bold text-white transition-colors hover:bg-slate-800">
            Fermer le bilan
          </button>
        }
      >
        {driverDayStats && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5 text-center">
                <Banknote className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500">Encaissé (cash)</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmt(driverDayStats.dTotalEnbaisse)} <span className="text-sm text-slate-400">F</span></p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-5 text-center">
                <Bike className="mx-auto mb-2 h-5 w-5 text-amber-500" />
                <p className="text-xs font-semibold text-amber-700">Sa part (frais)</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-700">{fmt(driverDayStats.dPartLivreur)} <span className="text-sm opacity-60">F</span></p>
              </div>
              <div className={`relative overflow-hidden rounded-2xl p-5 text-center ${driverDayStats.aReverser < 0 ? 'bg-red-50' : 'bg-brand-50'}`}>
                <HandCoins className={`mx-auto mb-2 h-5 w-5 ${driverDayStats.aReverser < 0 ? 'text-red-500' : 'text-brand-600'}`} />
                <p className={`text-xs font-semibold ${driverDayStats.aReverser < 0 ? 'text-red-700' : 'text-brand-700'}`}>
                  {driverDayStats.aReverser < 0 ? 'Vous lui devez' : 'Il doit vous verser'}
                </p>
                <p className={`mt-1 text-3xl font-extrabold ${driverDayStats.aReverser < 0 ? 'text-red-700' : 'text-brand-700'}`}>
                  {fmt(Math.abs(driverDayStats.aReverser))} <span className="text-sm opacity-60">F</span>
                </p>
              </div>
            </div>

            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Package className="h-5 w-5 text-slate-400" /> Courses du jour ({driverDayStats.driverDeliveries.length})
            </h3>
            {driverDayStats.driverDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                Ce livreur n'a validé aucune livraison aujourd'hui.
              </div>
            ) : (
              <div className="space-y-2">
                {driverDayStats.driverDeliveries.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition-colors hover:border-brand-200"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{o.customer_name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {o.delivery_zone}</p>
                    </div>
                    <p className="font-extrabold text-slate-900">{fmt(o.total_amount_fcfa)} <span className="text-xs font-normal text-slate-400">FCFA</span></p>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
