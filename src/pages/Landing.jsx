import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Truck, BarChart3, ArrowRight, ShieldCheck, ShoppingBag, Check, Users, MapPin, Bell, Sparkles } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { playPop } from '../utils/audio';

const FAKE_NOTIFICATIONS = [
  { name: "Fatou D.", city: "Dakar", action: "vient de créer sa boutique", time: "à l'instant" },
  { name: "Mamadou N.", city: "Thiès", action: "a reçu 3 commandes", time: "il y a 5 min" },
  { name: "Awa S.", city: "Saint-Louis", action: "vient de s'inscrire", time: "il y a 12 min" },
  { name: "Boutique Chez Ali", city: "Dakar", action: "a validé une livraison", time: "il y a 20 min" },
];

export default function Landing() {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const yDashboard = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const yIcons = useTransform(scrollYProgress, [0, 1], [0, -150]);


  useEffect(() => {
    const cycleNotification = () => {
      const randomNotif = FAKE_NOTIFICATIONS[Math.floor(Math.random() * FAKE_NOTIFICATIONS.length)];
      setCurrentNotification(randomNotif);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 4000);
    };

    const initialTimer = setTimeout(cycleNotification, 3000);
    const interval = setInterval(cycleNotification, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Framer Motion Variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const bentoCardClass = "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 rounded-[2rem] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all duration-500 overflow-hidden relative group";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans overflow-hidden selection:bg-indigo-500/30 relative">
      
      {/* Background Decoratives */}
      <div className="absolute inset-0 bg-grid-pattern-light opacity-60 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[40%] right-[-20%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[160px] pointer-events-none animate-aurora-2"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none animate-aurora-1" style={{animationDelay: '2s'}}></div>
      
      {/* Top Urgency Banner */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-indigo-600 backdrop-blur-xl text-indigo-50 border-b border-indigo-500/20 text-center py-2.5 px-4 text-xs font-bold z-50 relative flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-indigo-200" />
        Offre de lancement : 100% Gratuit pour les 100 premiers inscrits ! 
        <Link to="/register" className="text-white hover:text-indigo-200 underline underline-offset-4 decoration-indigo-400 transition-colors ml-2">
          Profitez-en vite
        </Link>
      </motion.div>
      
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="SamaBoutik Logo" className="h-12 md:h-24 object-contain" />
          </Link>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Se connecter
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/register" className="relative group overflow-hidden bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl whitespace-nowrap flex items-center gap-2">
              <span className="relative z-10">Démarrer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        
        {/* Floating 3D Elements */}
        <motion.div style={{ y: yIcons }} className="hidden md:flex absolute top-10 left-[5%] md:left-[10%] w-16 md:w-20 h-16 md:h-20 bg-indigo-100 rounded-2xl rotate-12 items-center justify-center opacity-70 pointer-events-none shadow-2xl blur-[1px] z-0 animate-bounce" style={{animationDuration: '4s'}}>
          <Store className="w-8 md:w-10 h-8 md:h-10 text-indigo-500" />
        </motion.div>
        <motion.div style={{ y: yIcons }} className="hidden md:flex absolute top-40 right-[5%] md:right-[15%] w-12 md:w-16 h-12 md:h-16 bg-pink-100 rounded-full -rotate-12 items-center justify-center opacity-70 pointer-events-none shadow-2xl blur-[2px] z-0 animate-bounce" style={{animationDuration: '5s', animationDelay: '1s'}}>
          <Sparkles className="w-6 md:w-8 h-6 md:h-8 text-pink-500" />
        </motion.div>
        <motion.div style={{ y: yIcons }} className="hidden md:flex absolute bottom-40 left-[10%] md:left-[20%] w-20 md:w-24 h-20 md:h-24 bg-emerald-100 rounded-3xl rotate-45 items-center justify-center opacity-60 pointer-events-none shadow-2xl z-0 animate-bounce" style={{animationDuration: '6s', animationDelay: '2s'}}>
          <ShoppingBag className="w-10 md:w-12 h-10 md:h-12 text-emerald-500" />
        </motion.div>

        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={staggerContainer}
          className="flex flex-col items-center relative z-10"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-xs mb-8 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
            Lancement de la nouvelle plateforme v2.0
          </motion.div>
          
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.05] max-w-5xl mx-auto">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Créez votre e-commerce en</span> <br className="hidden md:block"/>
            <span className="text-gradient-glow animate-text-gradient">2 minutes chrono.</span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            La plateforme tout-en-un pour les vendeurs ambitieux. Gérez vos produits, encaissez via Wave/Orange Money, et expédiez avec vos livreurs.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto mb-20">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
              <Link 
                to="/register" 
                onMouseEnter={playPop}
                className="relative flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg overflow-hidden shadow-xl"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                Créer ma boutique <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Link to="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-8 py-4 rounded-2xl font-bold text-lg transition-colors shadow-sm">
                Espace Marchand
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 3D Dashboard Preview */}
        <motion.div 
          style={{ y: yDashboard }}
          initial={{ opacity: 0, scale: 0.8, y: 80 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.4, type: "spring", bounce: 0.4 }}
          className="relative max-w-6xl mx-auto z-20 w-full group perspective-1000"
        >
          <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} perspective={2000} scale={1.01} transitionSpeed={2000} className="relative mx-auto w-full aspect-[16/9] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 bg-white flex items-center justify-center">
            
             <motion.img 
               src="/hero-ecommerce.jpg" 
               alt="SamaBoutik Dashboard Interface" 
               className="w-full h-full object-cover"
               animate={{ scale: [1, 1.05, 1] }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
             />
             
             {/* Gradient Overlay for blending */}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 via-transparent to-transparent"></div>
             
             {/* Floating Stats */}
             <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-10 bg-white/90 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl flex items-center gap-4 hidden md:flex shadow-xl"
             >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                   <BarChart3 className="w-6 h-6" />
                </div>
                <div className="text-left">
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Ventes du jour</p>
                   <p className="text-xl font-black text-slate-900">+ 450 000 FCFA</p>
                </div>
             </motion.div>

             <motion.div 
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/4 right-10 bg-white/90 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl flex items-center gap-4 hidden md:flex shadow-xl"
             >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                   <Truck className="w-6 h-6" />
                </div>
                <div className="text-left">
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Livreur assigné</p>
                   <p className="text-xl font-black text-slate-900">En route (5 min)</p>
                </div>
             </motion.div>
             
          </Tilt>
        </motion.div>
      </section>

      {/* Infinite Marquee */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="w-full border-y border-slate-200 bg-white overflow-hidden py-6 mt-12 mb-24 relative z-20 shadow-sm"
      >
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
        <div className="animate-marquee flex gap-16 whitespace-nowrap text-lg md:text-2xl font-black uppercase tracking-widest items-center text-slate-400">
          {Array(8).fill(0).map((_, i) => (
            <React.Fragment key={i}>
              <span className="hover:text-slate-800 transition-colors cursor-default">Zéro Commission</span>
              <span className="text-indigo-400">✦</span>
              <span className="hover:text-slate-800 transition-colors cursor-default">Boutique Instantanée</span>
              <span className="text-indigo-400">✦</span>
              <span className="hover:text-slate-800 transition-colors cursor-default">100% Sécurisé</span>
              <span className="text-indigo-400">✦</span>
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* Bento Grid Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">Pensé pour la performance.</h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">Tout ce dont vous avez besoin pour exploser vos ventes, réuni dans une interface fluide et ultra-rapide.</p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]"
        >
          {/* Feature 1 - Large Span */}
          <motion.div variants={fadeInUp} className={`md:col-span-2 flex flex-col md:flex-row ${bentoCardClass}`}>
             <div className="relative z-10 p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 group-hover:scale-125 transition-all duration-700"></div>
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                   <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-3xl font-black text-slate-900 mb-3">Catalogue Illimité</h3>
                   <p className="text-slate-600 font-medium text-lg max-w-md">Ajoutez vos articles, variantes, et photos en quelques secondes. Votre vitrine se met à jour instantanément avec une esthétique sublime.</p>
                </div>
             </div>
             <div className="w-full md:w-1/2 h-64 md:h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white via-transparent to-transparent z-10 pointer-events-none"></div>
                <img src="/feature-catalog.jpg" alt="Catalogue" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
             </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={fadeInUp} className={`flex flex-col ${bentoCardClass}`}>
             <div className="w-full h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white z-10 pointer-events-none"></div>
                <img src="/feature-design.jpg" alt="Design Premium" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
             </div>
             <div className="relative z-10 p-8 flex flex-col h-full justify-between -mt-8">
                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-[80px] group-hover:bg-emerald-500/20 group-hover:scale-150 transition-all duration-700"></div>
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 relative z-20 shadow-sm">
                   <Store className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3">Design Premium</h3>
                   <p className="text-slate-600 font-medium">Une boutique magnifique et optimisée sur mobile comme sur ordinateur.</p>
                </div>
             </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={fadeInUp} className={`flex flex-col ${bentoCardClass}`}>
             <div className="relative z-10 p-8 flex flex-col h-full justify-between pb-0">
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-pink-500/10 blur-[80px] group-hover:bg-pink-500/20 group-hover:scale-150 transition-all duration-700"></div>
                <div className="w-14 h-14 bg-pink-50 border border-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-6">
                   <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3">Analytics Pro</h3>
                   <p className="text-slate-600 font-medium mb-6">Suivez vos ventes et revenus en temps réel.</p>
                </div>
             </div>
             <div className="w-full h-48 mt-auto relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white z-10 pointer-events-none"></div>
                <img src="/feature-analytics.jpg" alt="Analytics" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" />
             </div>
          </motion.div>

          {/* Feature 4 - Large Span */}
          <motion.div variants={fadeInUp} className={`md:col-span-2 flex flex-col-reverse md:flex-row ${bentoCardClass}`}>
             <div className="w-full md:w-1/2 h-64 md:h-full relative overflow-hidden bg-white">
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-white via-transparent to-transparent z-10 pointer-events-none"></div>
                <img src="/delivery-scooter.png" alt="Livreurs" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-all duration-700" />
             </div>
             <div className="relative z-10 p-8 md:p-12 md:w-1/2 flex flex-col justify-center text-right md:items-end">
                <div className="absolute left-1/4 top-1/4 w-64 h-64 bg-orange-500/10 blur-[80px] group-hover:bg-orange-500/20 group-hover:scale-125 transition-all duration-700"></div>
                <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 ml-auto">
                   <Truck className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-3xl font-black text-slate-900 mb-3">Flotte de Livreurs</h3>
                   <p className="text-slate-600 font-medium text-lg max-w-md ml-auto">Gérez et assignez vos propres livreurs. Interface sécurisée avec validation des livraisons par code secret (PIN).</p>
                </div>
             </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-slate-900">Tarifs transparents.</h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">Zéro frais d'installation. Choisissez le plan adapté à votre croissance.</p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center"
        >
          {/* Gratuit */}
          <motion.div variants={fadeInUp} className={`${bentoCardClass} p-10 flex flex-col`}>
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Débutant</h3>
              <p className="text-slate-500 font-medium text-sm">Pour se lancer rapidement.</p>
            </div>
            <div className="mb-10 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">0</span>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">FCFA / mois</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {['Jusqu\'à 10 produits', '1 Livreur assigné', 'Vitrine standard'].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-600 font-medium text-sm">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"><Check className="w-3 h-3 text-slate-600" /></div>
                  {feature}
                </li>
              ))}
            </ul>
            <Link to="/register" className="w-full block text-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-all shadow-sm">
              Commencer
            </Link>
          </motion.div>

          {/* Pro - Highlighted */}
          <motion.div variants={fadeInUp} className={`relative bg-gradient-to-b from-indigo-50 to-white border border-indigo-200 rounded-[2.5rem] p-10 py-14 flex flex-col z-10 shadow-[0_20px_60px_rgba(79,70,229,0.15)] hover:shadow-[0_20px_80px_rgba(79,70,229,0.2)] transition-all duration-500`}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent"></div>
            <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
              Le plus populaire
            </div>
            <div className="mb-8 mt-4">
              <h3 className="text-3xl font-black text-slate-900 mb-2">Pro</h3>
              <p className="text-indigo-600/80 font-medium text-sm">Pour les marchands actifs.</p>
            </div>
            <div className="mb-10 flex items-baseline gap-2">
              <span className="text-6xl font-black text-slate-900 tracking-tighter">5 000</span>
              <span className="text-indigo-400 font-bold uppercase tracking-wider text-xs">FCFA / mois</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {['Produits illimités', 'Jusqu\'à 5 livreurs', 'Personnalisation poussée', 'Support prioritaire'].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.3)]"><Check className="w-3 h-3 text-white" /></div>
                  {feature}
                </li>
              ))}
            </ul>
            <Link to="/register?plan=pro" className="w-full block text-center bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg hover:shadow-xl transition-all">
              S'inscrire
            </Link>
          </motion.div>

          {/* Premium */}
          <motion.div variants={fadeInUp} className={`${bentoCardClass} p-10 flex flex-col`}>
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 mb-2">Premium</h3>
              <p className="text-slate-500 font-medium text-sm">L'expérience ultime.</p>
            </div>
            <div className="mb-10 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">15 000</span>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">FCFA / mois</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              {['Tout du plan Pro', 'Livreurs illimités', 'Gestionnaire de compte', 'Domaine personnalisé'].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-slate-600 font-medium text-sm">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200"><Check className="w-3 h-3 text-slate-600" /></div>
                  {feature}
                </li>
              ))}
            </ul>
            <Link to="/register?plan=premium" className="w-full block text-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-all shadow-sm">
              S'inscrire
            </Link>
          </motion.div>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SamaBoutik Logo" className="h-10 md:h-20 object-contain" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            © {new Date().getFullYear()} SamaBoutik.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Plateforme Sécurisée
          </div>
        </div>
      </footer>

      {/* Live Toast Notification */}
      <div className="fixed bottom-6 left-6 z-50 pointer-events-none">
        <AnimatePresence>
          {isVisible && currentNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(5px)" }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-slate-200 flex items-start gap-4 max-w-sm pointer-events-auto"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center shrink-0 border border-indigo-100">
                <Bell className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {currentNotification.name} <span className="text-xs font-normal text-slate-500">({currentNotification.city})</span>
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{currentNotification.action}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">{currentNotification.time}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
