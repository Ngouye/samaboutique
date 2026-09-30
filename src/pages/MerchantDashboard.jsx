import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Plus, LogOut, Package, ShoppingBag, Store, X, Menu, QrCode, Truck, Users, UserPlus, Trash2, BellRing, BellOff, Search,
  Settings, CreditCard, ShieldCheck, Bell, LayoutDashboard, Crown, Sparkles, Boxes, CircleCheck, CircleX, TriangleAlert,
  Coins, ImageOff, Pencil, Tag, Layers, Phone, MapPin, Clock, Smartphone, Bike, Car, ChevronDown, MessageCircle, Route,
  CalendarDays, Check, Copy, ExternalLink, IdCard, TrendingUp, Rocket, Zap, Gem, LoaderCircle, Eye, Palette,
  LayoutTemplate, LayoutGrid, ImagePlus, Upload, Mail, Wallet, Globe, Camera, Music2, Save, Download, Banknote, HandCoins,
  LocateFixed,
} from 'lucide-react';
import { getCurrentPosition, googleMapsUrl } from '../utils/geolocation';
import { QRCodeSVG } from 'qrcode.react';
import { SHOP_CATEGORIES, CATEGORY_FEATURES } from '../utils/categories';
import { motion, AnimatePresence } from 'framer-motion';
import Overview from '../components/dashboard/Overview';
import { PageHeader, PrimaryButton, StatPill, EmptyState, Modal, FilePreview, Toggle, SectionCard, MagicIcon, rise, CARD, INPUT, LABEL, EASE } from '../components/dashboard/ui';
import { ORDER_STATUSES, statusMeta, timeAgo } from '../components/dashboard/status';
import { fmt } from '../components/dashboard/analytics';
import { TagsInput } from '../components/dashboard/TagsInput';
import { WhatsAppSettingsCard, DirectoryToggle } from '../components/dashboard/SmartSettings';

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

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
        const { data } = await supabase
          .from('merchants')
          .select('subscription_plan, subscription_status')
          .eq('id', user.id)
          .single();
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
      const { data: prodData } = await supabase.from('products').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);
      
      const { data: ordData } = await supabase.from('orders').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (ordData) setOrders(ordData);

      const { data: teamData, error: teamError } = await supabase.from('drivers').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false });
      if (teamData) setTeam(teamData);
      else if (teamError && teamError.code !== '42P01') console.error(teamError); // Ignore if table doesn't exist yet

      const { data: locationData } = await supabase.from('merchant_locations').select('*').eq('merchant_id', user.id).maybeSingle();
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

  const filteredOrders = orders.filter(o =>
    (statusFilter === 'ALL' || o.status === statusFilter) &&
    ((o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (o.customer_phone || '').includes(searchQuery))
  );

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

  const vehicleIcon = (type) => (type === 'Voiture' ? Car : type === 'Autre' ? Truck : Bike);

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
      title: 'Pilotage',
      items: [
        { id: 'analytics', label: "Vue d'ensemble", icon: LayoutDashboard },
        { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: stats.pending },
        { id: 'products', label: 'Produits', icon: Package },
        { id: 'drivers', label: 'Livraisons', icon: Truck },
        { id: 'team', label: 'Équipe', icon: Users },
      ],
    },
    {
      title: 'Boutique',
      items: [
        { id: 'settings', label: 'Paramètres', icon: Settings },
        { id: 'billing', label: 'Facturation', icon: CreditCard },
      ],
    },
  ];
  const currentNav = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeTab);

  if (!merchant) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#06150f]">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-400/20 border-t-emerald-400 mb-4"></div>
      <p className="text-emerald-50/80 font-medium">Chargement du tableau de bord...</p>
    </div>
  );

  // Rendu partagé entre la barre latérale bureau et le tiroir mobile (préfixe = layoutId unique).
  const renderSidebar = (prefix) => (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#06150f] text-slate-300">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="aurora-blob aurora-1 -left-32 -top-32 h-80 w-80 bg-emerald-500/20" />
        <div className="aurora-blob aurora-2 -right-40 bottom-10 h-72 w-72 bg-cyan-500/10" />
      </div>

      <div className="relative flex items-center justify-between px-5 pt-6">
        <div className="flex h-11 w-[104px] items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_24px_rgba(52,211,153,0.25)]">
          <img src="/logo.png" alt="SamaBoutik" className="h-full w-full scale-[1.6] object-contain" />
        </div>
        {prefix === 'mobile' && (
          <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Fermer le menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative mx-4 mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-3">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-lg font-extrabold text-[#06150f]">
              {merchant.shop_name?.charAt(0).toUpperCase() || 'M'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{merchant.shop_name}</p>
            <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${planId === 'debutant' ? 'bg-white/10 text-slate-300' : 'bg-amber-300/15 text-amber-200'}`}>
              {planId !== 'debutant' && <Crown className="h-3 w-3" />} Forfait {PLAN_LABELS[planId] || planId}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <a href={getShopUrl()} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-emerald-400/10 py-2 text-[11px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/20">
            <Store className="h-4 w-4" /> Vitrine
          </a>
          <button onClick={() => { setShowQRModal(true); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
            <QrCode className="h-4 w-4" /> QR code
          </button>
          <button onClick={handleDriverLinkCopy} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
            <Truck className="h-4 w-4" /> Livreur
          </button>
        </div>
      </div>

      <nav className="relative mt-6 flex-1 space-y-6 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
            <div className="space-y-1">
              {section.items.map(({ id, label, icon: Icon, badge }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${prefix}-nav-active`}
                        className="absolute inset-0 rounded-xl border border-emerald-400/20 bg-gradient-to-r from-emerald-400/15 to-emerald-400/[0.03]"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />}
                    <Icon className={`relative h-[18px] w-[18px] transition-transform group-hover:scale-110 ${active ? 'text-emerald-300' : ''}`} />
                    <span className="relative flex-1 text-left">{label}</span>
                    {badge > 0 && (
                      <span className="relative rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-extrabold text-[#06150f]">{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {planId === 'debutant' && (
        <div className="relative mx-4 mb-3 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/15 to-transparent p-4">
          <Sparkles className="mb-2 h-5 w-5 text-amber-300" />
          <p className="text-sm font-bold text-white">Passez au forfait Pro</p>
          <p className="mt-1 text-xs text-slate-400">Produits illimités et jusqu'à 5 livreurs.</p>
          <button onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }} className="mt-3 w-full rounded-xl bg-amber-300 py-2 text-xs font-extrabold text-[#06150f] transition-transform hover:-translate-y-0.5">
            Découvrir les forfaits
          </button>
        </div>
      )}

      <div className="relative border-t border-white/5 p-3">
        <button onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f4] font-sans selection:bg-emerald-200">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-2xl bg-[#06150f] px-5 py-4 font-semibold text-white shadow-2xl"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre latérale bureau */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] md:block">{renderSidebar('desktop')}</aside>

      {/* Tiroir mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-[284px] md:hidden"
            >
              {renderSidebar('mobile')}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="md:pl-[268px]">
        {/* En-tête */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-[#f3f5f4]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-8">
            <button onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-white md:hidden" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Tableau de bord</p>
              <h2 className="truncate text-lg font-bold text-slate-900">{currentNav?.label}</h2>
            </div>
            <button
              onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${soundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Son des nouvelles commandes"
            >
              {soundEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span className="hidden lg:inline">{soundEnabled ? 'Son activé' : 'Son coupé'}</span>
            </button>
            <button onClick={() => setActiveTab('orders')} className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50" aria-label={`${stats.pending} commande(s) à traiter`}>
              <Bell className="h-5 w-5" />
              {stats.pending > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#f3f5f4]">
                  {stats.pending}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
              <div className="text-right">
                <p className="max-w-[160px] truncate text-sm font-bold text-slate-900">{merchant.shop_name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 font-bold text-[#06150f]">
                {merchant.shop_name?.charAt(0).toUpperCase() || 'M'}
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
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
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-600/20 border-t-emerald-600"></div>
          </div>
        ) : activeTab === 'analytics' ? (
          <Overview
            merchant={merchant}
            orders={orders}
            products={products}
            driverBalances={driverBalances}
            today={{ totalEnbaisse, partLivreur, partMarchand }}
            shopUrl={getShopUrl()}
            onNavigate={setActiveTab}
            onOpenQR={() => setShowQRModal(true)}
            onCopyDriverLink={handleDriverLinkCopy}
            onSelectDriver={setSelectedDriverForStats}
          />
        ) : activeTab === 'products' ? (
          <div className="mx-auto max-w-7xl">
            <PageHeader icon={Package} gradient="emerald" title="Catalogue" subtitle="Gérez votre inventaire, vos prix et vos stocks">
              {planId === 'debutant' && (
                <div className="min-w-[190px] rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5">
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold text-slate-500">
                    <span>Forfait Débutant</span>
                    <span className="text-slate-900">{products.length} / 10 produits</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, products.length * 10)}%` }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className={`h-full rounded-full ${products.length >= 10 ? 'bg-red-500' : products.length >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                </div>
              )}
              <PrimaryButton onClick={openNewProduct}>
                <Plus className="h-5 w-5" /> Ajouter un produit
              </PrimaryButton>
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatPill icon={Boxes} label="Tous les produits" value={products.length} active={productFilter === 'ALL'} onClick={() => setProductFilter('ALL')} />
              <StatPill icon={CircleCheck} label="Bien en stock" value={productStats.inStock} tone="emerald" active={productFilter === 'IN_STOCK'} onClick={() => setProductFilter('IN_STOCK')} />
              <StatPill icon={TriangleAlert} label="Stock faible (≤ 5)" value={productStats.low} tone="amber" active={productFilter === 'LOW'} onClick={() => setProductFilter('LOW')} />
              <StatPill icon={CircleX} label="En rupture" value={productStats.out} tone="red" active={productFilter === 'OUT'} onClick={() => setProductFilter('OUT')} />
            </div>

            <motion.div variants={rise} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un produit ou une catégorie…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className={`${INPUT} bg-white pl-12`}
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-slate-500">Valeur du stock</span>
                <span className="font-bold text-slate-900">{fmt(productStats.value)} F</span>
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
              <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
                        whileHover={{ y: -6 }}
                        className={`${CARD} group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_24px_48px_-20px_rgba(15,23,42,0.3)]`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageOff className="h-10 w-10 text-slate-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur ${tone.badge}`}>
                            <ToneIcon className="h-3.5 w-3.5" /> {tone.label}
                          </span>
                          <div className="absolute right-3 top-3 flex gap-2 transition-all duration-300 md:translate-y-[-6px] md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                            <button onClick={() => openEditProduct(p)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition-colors hover:text-emerald-600" aria-label={`Modifier ${p.name}`}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteProduct(p.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition-colors hover:text-red-500" aria-label={`Supprimer ${p.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <span className="mb-2 inline-flex w-max items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            <Tag className="h-3 w-3" /> {p.category || 'Sans catégorie'}
                          </span>
                          <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{p.name}</h3>
                          {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                          <div className="mt-auto pt-4">
                            <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                              {fmt(p.price_fcfa)} <span className="text-sm font-semibold text-slate-400">FCFA</span>
                            </p>
                            <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${tone.track}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(p.stock > 0 ? 6 : 0, Math.min(100, (p.stock / 20) * 100))}%` }}
                                transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                                className={`h-full rounded-full ${tone.fill}`}
                              />
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
          <div className="mx-auto max-w-7xl">
            <PageHeader icon={ShoppingBag} gradient="sky" title="Commandes" subtitle="Suivez et traitez vos commandes en temps réel">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${soundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {soundEnabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                {soundEnabled ? 'Son activé' : 'Activer le son'}
              </motion.button>
            </PageHeader>

            {/* Filtres par statut (avec compteurs) */}
            <motion.div variants={rise} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0">
              {[{ id: 'ALL', label: 'Toutes', icon: Layers }, ...ORDER_STATUSES].map((s) => {
                const count = s.id === 'ALL' ? orders.length : orders.filter((o) => o.status === s.id).length;
                const active = statusFilter === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id)}
                    className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white' : 'border border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                  >
                    {active && <motion.span layoutId="order-filter" className="absolute inset-0 rounded-2xl bg-slate-900 shadow-lg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{s.label}</span>
                    <span className={`relative rounded-full px-1.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  </button>
                );
              })}
            </motion.div>

            <motion.div variants={rise} className="relative mb-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou numéro de téléphone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${INPUT} bg-white pl-12`}
              />
            </motion.div>

            {orders.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Aucune commande" text="Partagez le lien de votre vitrine : vos futures commandes s'afficheront ici en direct." />
            ) : filteredOrders.length === 0 ? (
              <EmptyState icon={Search} title="Aucune commande ne correspond" text="Changez de statut ou de mot-clé." />
            ) : (
              <motion.div layout className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order, i) => {
                    const meta = statusMeta(order.status);
                    const StatusIcon = meta.icon;
                    return (
                      <motion.article
                        layout
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.04, duration: 0.45, ease: EASE } }}
                        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                        className={`${CARD} group relative overflow-hidden p-5 pl-6 transition-shadow hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)]`}
                      >
                        <span className={`absolute inset-y-0 left-0 w-1.5 ${meta.dot}`} />
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-lg font-extrabold text-indigo-700">
                              {(order.customer_name || '?').charAt(0).toUpperCase()}
                              {order.status === 'PENDING' && (
                                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
                                </span>
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">{order.customer_name}</h3>
                                <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 6).toUpperCase()}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1.5 hover:text-emerald-700"><Phone className="h-3.5 w-3.5" /> {order.customer_phone}</a>
                                <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{order.delivery_zone}</span></span>
                                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {timeAgo(order.created_at)}</span>
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {order.delivery_pin && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200"><ShieldCheck className="h-3 w-3" /> PIN {order.delivery_pin}</span>
                                )}
                                {order.payment_method === 'ON_DELIVERY' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"><Truck className="h-3 w-3" /> À la livraison</span>
                                )}
                                {order.payment_method === 'MOBILE_MONEY' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"><Smartphone className="h-3 w-3" /> Mobile Money</span>
                                )}
                                {order.payment_method === 'DEPOSIT' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CreditCard className="h-3 w-3" /> Acompte : {order.payment_deposit_amount} FCFA</span>
                                )}
                                {order.payment_method === 'FULL_UPFRONT' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"><CircleCheck className="h-3 w-3" /> Intégral payé</span>
                                )}
                                {order.driver_name && order.status === 'IN_TRANSIT' && (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"><Bike className="h-3 w-3" /> {order.driver_name}</span>
                                )}
                              </div>
                              {order.cart_items?.length > 0 && (
                                <p className="mt-2 line-clamp-1 text-sm text-slate-600">
                                  {order.cart_items.map((it) => `${it.quantity}× ${it.name}`).join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:w-[340px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                            <div className="flex items-center justify-between gap-3">
                              {meta.step >= 0 ? (
                                <div className="flex items-center gap-1" aria-label={`Étape ${meta.step + 1} sur 4`}>
                                  {[0, 1, 2, 3].map((s) => (
                                    <motion.span
                                      key={s}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ delay: 0.2 + s * 0.08 }}
                                      className={`h-1.5 w-6 origin-left rounded-full ${s <= meta.step ? meta.dot : 'bg-slate-200'}`}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${meta.chip}`}><StatusIcon className="h-3.5 w-3.5" /> {meta.label}</span>
                              )}
                              <p className="text-2xl font-extrabold tracking-tight text-slate-900">
                                {fmt(order.total_amount_fcfa)} <span className="text-xs font-semibold text-slate-400">FCFA</span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <StatusIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`w-full cursor-pointer appearance-none rounded-xl py-2.5 pl-9 pr-8 text-sm font-bold ring-1 outline-none transition-shadow focus:ring-2 ${meta.chip}`}
                                  aria-label="Statut de la commande"
                                >
                                  {ORDER_STATUSES.map((s) => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                              </div>
                              <motion.a
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.96 }}
                                href={generateWhatsAppMessage(order)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-colors hover:bg-[#1fb957]"
                              >
                                <MessageCircle className="h-4 w-4" /> WhatsApp
                              </motion.a>
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
        ) : activeTab === 'drivers' ? (
          <div className="mx-auto max-w-5xl">
            <PageHeader icon={Route} gradient="violet" title="Historique des livraisons" subtitle="Tout ce qui a été livré : produits, client, livreur et heure" />

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
                <div className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-violet-300 via-slate-200 to-transparent" />
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
                      <span className="absolute left-2 top-6 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-[#f3f5f4]">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <div className={`${CARD} p-5 transition-shadow hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)]`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-lg font-extrabold text-violet-700">
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
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600"><ShieldCheck className="h-3 w-3" /> PIN validé</span>
                              <span className="font-mono text-sm font-extrabold text-emerald-800">{order.delivery_pin || '---'}</span>
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {order.cart_items?.map((item, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1 text-sm text-slate-700 ring-1 ring-slate-200/70">
                                <span className="rounded-md bg-white px-1.5 text-xs font-extrabold text-emerald-700 shadow-sm">{item.quantity}×</span>
                                {item.name}
                              </span>
                            ))}
                          </div>
                          <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-end lg:gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {order.customer_name}</span>
                            <span className="text-lg font-extrabold text-slate-900">{fmt(order.total_amount_fcfa)} <span className="text-xs font-semibold text-slate-400">FCFA encaissés</span></span>
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
            <PageHeader icon={Users} gradient="amber" title="Mon équipe" subtitle="Vos livreurs, leurs courses et leur solde du jour">
              {(planId === 'debutant' || planId === 'pro') && (
                <div className="min-w-[180px] rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5">
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-semibold text-slate-500">
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
            <motion.div variants={rise} className="relative mb-8 overflow-hidden rounded-3xl bg-[#06150f] p-6 text-white">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="aurora-blob aurora-1 -left-20 -top-24 h-64 w-64 bg-emerald-500/30" />
                <div className="aurora-blob aurora-2 -right-10 -bottom-24 h-64 w-64 bg-amber-400/15" />
              </div>
              <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
                <MagicIcon icon={Smartphone} gradient="emerald" size="lg" sparkle />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Application livreur</p>
                  <p className="mt-0.5 text-sm text-emerald-50/70">Envoyez ce lien à vos livreurs : ils se connectent avec leur téléphone et leur numéro de CNI.</p>
                  <p className="mt-2 truncate font-mono text-xs text-emerald-200">{getDriverUrl()}</p>
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleDriverLinkCopy} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#06150f]">
                    <Copy className="h-4 w-4" /> Copier le lien
                  </motion.button>
                  <a href={getDriverUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 hover:bg-white/10" aria-label="Ouvrir l'application livreur">
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
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {team.map((driver, i) => {
                  const balance = driverBalances.find((b) => b.id === driver.id) || { count: 0, aReverser: 0 };
                  const VehicleIcon = vehicleIcon(driver.vehicle_type);
                  return (
                    <motion.article
                      key={driver.id}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(i, 9) * 0.06, duration: 0.5, ease: EASE }}
                      whileHover={{ y: -6 }}
                      className={`${CARD} group overflow-hidden transition-shadow hover:shadow-[0_24px_48px_-20px_rgba(15,23,42,0.3)]`}
                    >
                      <div className="relative h-20 overflow-hidden bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400">
                        <div className="bg-grid-pattern absolute inset-0 opacity-60" />
                        <motion.div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 5, repeat: Infinity }} />
                        <button onClick={() => deleteDriver(driver.id)} className="absolute right-3 top-3 rounded-full bg-white/20 p-2 text-white backdrop-blur transition-colors hover:bg-red-500" aria-label={`Supprimer ${driver.full_name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-6 pb-6">
                        <div className="-mt-9 mb-3 flex items-end justify-between">
                          <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-white text-3xl font-extrabold text-orange-600 shadow-xl ring-4 ring-white">
                            {driver.full_name.charAt(0).toUpperCase()}
                            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white ring-2 ring-white">
                              <VehicleIcon className="h-3.5 w-3.5" />
                            </span>
                          </span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">{driver.vehicle_type}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{driver.full_name}</h3>
                        <div className="mt-3 space-y-2 text-sm">
                          <a href={driver.phone_number ? `tel:${driver.phone_number}` : undefined} className="flex items-center gap-2 text-slate-600 hover:text-emerald-700">
                            <Phone className="h-4 w-4 text-slate-400" /> {driver.phone_number || '---'}
                          </a>
                          <p className="flex items-center gap-2 text-slate-600">
                            <IdCard className="h-4 w-4 text-slate-400" /> {driver.cni_number || 'CNI non renseignée'}
                          </p>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Courses aujourd'hui</p>
                            <p className="text-lg font-bold text-slate-900">{balance.count}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">{balance.aReverser < 0 ? 'Vous lui devez' : 'À vous reverser'}</p>
                            <p className={`text-lg font-bold ${balance.aReverser < 0 ? 'text-red-700' : 'text-slate-900'}`}>{fmt(Math.abs(balance.aReverser))} F</p>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedDriverForStats(driver)}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
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
            <PageHeader icon={Store} gradient="violet" title="Ma boutique" subtitle="Personnalisez votre vitrine publique">
              <a href={getShopUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
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

              <SectionCard icon={Palette} gradient="violet" title="Apparence de la vitrine" subtitle="Style d'affichage, bannière et couleur principale">
                <label className={LABEL}>Style d'affichage</label>
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: 'modern', label: 'Moderne', desc: 'Formes obliques, très visuel', icon: Sparkles },
                    { id: 'classic', label: 'Classique', desc: 'Bannière droite, rassurant', icon: LayoutTemplate },
                    { id: 'minimalist', label: 'Minimaliste', desc: 'Épuré, focus produits', icon: LayoutGrid },
                  ].map((opt) => {
                    const active = settingsForm.layout_style === opt.id;
                    const Icon = opt.icon;
                    return (
                      <motion.button
                        type="button"
                        key={opt.id}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSettingsForm({ ...settingsForm, layout_style: opt.id })}
                        className={`relative rounded-2xl border-2 p-4 text-left transition-colors ${active ? 'border-violet-500 bg-violet-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        {active && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                        <Icon className={`mb-2 h-6 w-6 ${active ? 'text-violet-600' : 'text-slate-400'}`} />
                        <p className="font-bold text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </motion.button>
                    );
                  })}
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
                  <label className="group relative mb-6 flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-violet-400 hover:bg-violet-50/40">
                    {settingsForm.bannerFile ? (
                      <FilePreview file={settingsForm.bannerFile} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <motion.span whileHover={{ scale: 1.1, rotate: -6 }}><ImagePlus className="mb-2 h-8 w-8 text-slate-400 transition-colors group-hover:text-violet-500" /></motion.span>
                        <p className="text-sm font-semibold text-slate-600">Cliquez pour importer une bannière</p>
                        <p className="text-xs text-slate-400">Format paysage recommandé (ex : 1920 × 1080 px)</p>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setSettingsForm({ ...settingsForm, bannerFile: e.target.files[0] })} className="hidden" />
                  </label>
                )}

                <label className={LABEL}>Couleur principale</label>
                <div className="flex flex-wrap items-center gap-3">
                  {['#059669', '#0ea5e9', '#6366f1', '#db2777', '#f97316', '#ca8a04', '#0f172a'].map((c) => (
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
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-lg shadow-rose-500/30">
                      <MapPin className="h-7 w-7" />
                    </motion.span>
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
                    { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/...', badge: <span className="text-lg font-black">f</span>, cls: 'bg-[#1877F2]' },
                    { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/...', badge: <Camera className="h-4 w-4" />, cls: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600' },
                    { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...', badge: <Music2 className="h-4 w-4" />, cls: 'bg-slate-900' },
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
                    <div key={zone.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${zone.active ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
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
                            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
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
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100"
                  >
                    <Plus className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </SectionCard>

              {/* Barre d'enregistrement collante */}
              <motion.div variants={rise} className="sticky bottom-4 z-10">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/85 p-3 pl-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.3)] backdrop-blur-xl">
                  <p className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><Sparkles className="h-4 w-4 text-violet-500" /> Les changements s'appliquent à votre vitrine dès l'enregistrement.</p>
                  <PrimaryButton type="submit" disabled={settingsForm.isSaving} className="w-full sm:w-auto">
                    {settingsForm.isSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Save className="h-4 w-4" /> Enregistrer les paramètres</>}
                  </PrimaryButton>
                </div>
              </motion.div>
            </form>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="mx-auto max-w-6xl">
            <PageHeader icon={Crown} gradient="amber" title="Abonnement & facturation" subtitle="Choisissez le forfait qui accompagne votre croissance" />

            <motion.div variants={rise} className="relative mb-10 overflow-hidden rounded-3xl bg-[#06150f] p-6 text-white md:p-8">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="aurora-blob aurora-1 -left-24 -top-24 h-72 w-72 bg-amber-400/20" />
                <div className="aurora-blob aurora-2 -right-10 -bottom-24 h-72 w-72 bg-emerald-500/25" />
              </div>
              <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <MagicIcon icon={Crown} gradient="amber" size="lg" sparkle />
                  <div>
                    <p className="text-sm text-emerald-100/70">Votre forfait actuel</p>
                    <p className="text-3xl font-extrabold">{PLAN_LABELS[planId] || planId}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {merchant?.subscription_status === 'expired' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/15 px-3 py-1.5 text-sm font-bold text-red-200"><CircleX className="h-4 w-4" /> Expiré</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-bold text-emerald-200"><CircleCheck className="h-4 w-4" /> Actif</span>
                  )}
                  {merchant?.subscription_end_date && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80">
                      <CalendarDays className="h-4 w-4" /> Jusqu'au {new Date(merchant.subscription_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
              {[
                { id: 'debutant', name: 'Débutant', price: '0', desc: 'Pour lancer votre première boutique', icon: Rocket, gradient: 'emerald', features: ["Jusqu'à 10 produits", '1 livreur', 'Vitrine basique'] },
                { id: 'pro', name: 'Pro', price: '5 000', desc: 'Pour les marchands réguliers', icon: Zap, gradient: 'violet', popular: true, features: ['Produits illimités', "Jusqu'à 5 livreurs", 'Personnalisation avancée', 'Statistiques détaillées'] },
                { id: 'premium', name: 'Premium', price: '15 000', desc: 'Pour les grandes boutiques', icon: Gem, gradient: 'amber', features: ['Tout du plan Pro', 'Livreurs illimités', 'Support prioritaire', 'Domaine personnalisé'] },
              ].map((plan, i) => {
                const current = merchant?.subscription_plan === plan.id;
                const dark = plan.popular;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.6, ease: EASE }}
                    whileHover={{ y: -8 }}
                    className={`relative rounded-[2rem] ${dark ? 'conic-border md:-translate-y-3' : ''}`}
                  >
                    <div className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] p-7 ${dark ? 'bg-gradient-to-b from-[#12291f] to-[#06150f] text-white shadow-[0_30px_80px_-20px_rgba(124,58,237,0.35)]' : `${CARD} ${current ? '!border-emerald-400 ring-4 ring-emerald-500/10' : ''}`}`}>
                      {dark && <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />}
                      <div className="relative mb-5 flex items-center justify-between">
                        <MagicIcon icon={plan.icon} gradient={plan.gradient} sparkle={dark} />
                        {current ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${dark ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Plan actuel</span>
                        ) : plan.popular ? (
                          <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1 text-xs font-extrabold text-slate-900">Le plus populaire</span>
                        ) : null}
                      </div>
                      <h3 className={`relative text-2xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                      <p className={`relative mt-1 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>
                      <p className="relative my-6">
                        <span className={`text-5xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                        <span className={`ml-2 text-sm font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>FCFA / mois</span>
                      </p>
                      <ul className="relative mb-8 flex-1 space-y-3.5">
                        {plan.features.map((f) => (
                          <li key={f} className={`flex items-center gap-3 text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-emerald-400 text-[#06150f]' : 'bg-emerald-50 text-emerald-600'}`}>
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      {plan.id === 'debutant' ? (
                        <button disabled className="relative w-full cursor-not-allowed rounded-2xl bg-slate-100 py-4 font-bold text-slate-500">
                          {current ? 'Déjà actif' : 'Gratuit à vie'}
                        </button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handlePaySubscription(plan.id)}
                          disabled={current || isProcessingPayment}
                          className={`relative w-full rounded-2xl py-4 font-bold transition-all disabled:cursor-not-allowed ${
                            current
                              ? dark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
                              : dark
                                ? 'shine-btn bg-gradient-to-r from-emerald-400 to-teal-400 text-[#06150f] shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isProcessingPayment
                            ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Patientez...</span>
                            : current ? 'Déjà actif' : `Mettre à niveau (${plan.name})`}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.p variants={rise} className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Paiements sécurisés par PayDunya (Wave, Orange Money, carte bancaire)
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
          <label className="group relative flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-emerald-400 hover:bg-emerald-50/40">
            {newProduct.image ? (
              <FilePreview file={newProduct.image} className="absolute inset-0 h-full w-full object-cover" />
            ) : editingProductId && products.find((p) => p.id === editingProductId)?.image_url ? (
              <img src={products.find((p) => p.id === editingProductId).image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <ImagePlus className="mb-2 h-9 w-9 text-slate-400 transition-colors group-hover:text-emerald-500" />
                </motion.span>
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-900">
                <Sparkles className="h-4 w-4 text-emerald-500" /> Caractéristiques spécifiques (optionnel)
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(CATEGORY_FEATURES[newProduct.category] || []).map((feature) => (
                  <div key={feature}>
                    <label className="mb-1 block text-xs font-bold text-slate-700">{feature}</label>
                    <input
                      type="text"
                      placeholder="Valeur..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
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

      {/* Modale QR code */}
      <Modal open={showQRModal} onClose={() => setShowQRModal(false)} icon={QrCode} gradient="slate" title="Votre QR code" subtitle="Scannez-le pour ouvrir votre vitrine" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
            className="conic-border mb-5 rounded-[2rem]"
          >
            <div className="rounded-[2rem] bg-white p-5 shadow-[0_20px_50px_-12px_rgba(5,150,105,0.35)]">
              <QRCodeSVG id="shop-qr" value={getShopUrl()} size={200} fgColor="#06150f" />
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
              <div className={`relative overflow-hidden rounded-2xl p-5 text-center ${driverDayStats.aReverser < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <HandCoins className={`mx-auto mb-2 h-5 w-5 ${driverDayStats.aReverser < 0 ? 'text-red-500' : 'text-emerald-600'}`} />
                <p className={`text-xs font-semibold ${driverDayStats.aReverser < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {driverDayStats.aReverser < 0 ? 'Vous lui devez' : 'Il doit vous verser'}
                </p>
                <p className={`mt-1 text-3xl font-extrabold ${driverDayStats.aReverser < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
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
                    className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition-colors hover:border-emerald-200"
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
