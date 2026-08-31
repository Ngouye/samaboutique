import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Truck, BarChart3, ArrowRight, ShieldCheck, ShoppingBag, Check, Users, MapPin, Bell } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';
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
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const glassmorphismClass = "bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl shadow-indigo-900/5";
  const darkGlassmorphismClass = "bg-gray-900/90 backdrop-blur-2xl border border-gray-700 shadow-2xl shadow-indigo-500/20";

  return (
    <div className="min-h-screen bg-mesh font-sans overflow-hidden selection:bg-indigo-200 relative">
      
      {/* Top Urgency Banner */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white text-center py-2 px-4 text-sm font-bold z-50 relative shadow-md"
      >
        🚀 Offre spéciale de lancement : 100% Gratuit pour les 100 premiers inscrits ! 
        <span className="underline ml-2 cursor-pointer opacity-90 hover:opacity-100"><Link to="/register">Profitez-en vite</Link></span>
      </motion.div>
      
      {/* Enhanced Background Decoratives (Aurora) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[140px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[50%] bg-purple-500/30 rounded-full blur-[140px] pointer-events-none animate-aurora-2"></div>
      <div className="absolute top-[40%] left-[20%] w-[30%] h-[40%] bg-pink-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-1" style={{animationDelay: '2s'}}></div>
      
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.jpg" alt="SamaBoutik Logo" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight hidden sm:block">SamaBoutik</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link to="/login" className="text-gray-600 font-bold hover:text-gray-900 transition-colors hidden sm:block">
            Se connecter
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/register" className="bg-[#4F46E5] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold hover:bg-[#4338CA] transition-colors shadow-lg shadow-indigo-500/30 whitespace-nowrap">
              Démarrer
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={staggerContainer}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-indigo-100 text-indigo-700 font-bold text-sm mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Lancement de la nouvelle plateforme
          </motion.div>
          
          <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-8 leading-[1.1]">
            Créez votre vitrine en <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-text-gradient">2 minutes</span>
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-xl text-gray-600 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            Gérez vos produits, recevez des commandes sur WhatsApp et suivez vos livraisons en temps réel. La solution tout-en-un pour les e-commerçants.
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-20">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Link 
                to="/register" 
                onMouseEnter={playPop}
                className="relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4F46E5] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/30 group animate-shine"
              >
                <span className="relative z-10">Créer ma boutique</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Link to="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gray-200/50">
                Espace Marchand
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Floating iPhone Presentation */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, type: "spring", bounce: 0.4 }}
          className="relative max-w-sm mx-auto z-20 mt-4"
        >
          <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-[80px] opacity-40 animate-pulse"></div>
          
          <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} perspective={1000} scale={1.02} transitionSpeed={1000} className="relative mx-auto w-[300px] sm:w-[320px] h-[600px] sm:h-[650px]">
            <div className="w-full h-full bg-black rounded-[3rem] border-[8px] border-gray-900 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.6)] animate-float overflow-hidden flex flex-col relative z-10">
              {/* iPhone Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
                <div className="w-32 h-6 bg-gray-900 rounded-b-2xl"></div>
              </div>
              
              {/* Fake App Header */}
              <div className="bg-white pt-10 pb-4 px-6 shadow-sm z-40 relative flex justify-between items-center">
                <span className="text-xl font-black tracking-tight">SamaBoutik<span className="text-pink-500">.</span></span>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-gray-900"/>
                </div>
              </div>
              
              {/* App Content (Scrolling Screenshot) */}
              <div className="flex-1 bg-gray-50 overflow-hidden relative">
               <img 
                 src="/mobile-preview.png" 
                 alt="Aperçu mobile du tableau de bord" 
                 className="absolute top-0 left-0 w-full h-auto object-top animate-scroll-y"
               />
              </div>
            </div>
          </Tilt>
        </motion.div>
      </section>

      {/* Infinite Marquee */}
      <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white overflow-hidden py-4 transform -rotate-1 scale-[1.02] my-12 shadow-2xl z-20 relative border-y border-white/20">
        <div className="animate-marquee flex gap-8 whitespace-nowrap text-sm sm:text-lg font-black uppercase tracking-widest items-center">
          {Array(10).fill(0).map((_, i) => (
            <React.Fragment key={i}>
              <span>0% Commission</span>
              <span className="text-pink-300">✦</span>
              <span>Intégration WhatsApp</span>
              <span className="text-pink-300">✦</span>
              <span>Boutique Gratuite</span>
              <span className="text-pink-300">✦</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Social Proof Stats Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className={glassmorphismClass + " p-8 md:p-12"}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="flex flex-col items-center p-4">
              <div className="w-16 h-16 bg-indigo-100/80 text-[#4F46E5] rounded-2xl flex items-center justify-center mb-4 shadow-inner"><Store className="w-8 h-8" /></div>
              <h3 className="text-5xl font-black text-gray-900 mb-2">+150</h3>
              <p className="text-gray-500 font-medium text-lg">Boutiques créées</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="w-16 h-16 bg-emerald-100/80 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><ShoppingBag className="w-8 h-8" /></div>
              <h3 className="text-5xl font-black text-gray-900 mb-2">+5 000</h3>
              <p className="text-gray-500 font-medium text-lg">Commandes gérées</p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="w-16 h-16 bg-orange-100/80 text-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><Users className="w-8 h-8" /></div>
              <h3 className="text-5xl font-black text-gray-900 mb-2">0 FCFA</h3>
              <p className="text-gray-500 font-medium text-lg">Frais d'installation</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Video & Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
            Découvrez en <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">1 minute</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
            Voyez comment SamaBoutik va transformer votre façon de vendre en ligne.
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto mb-24"
        >
          {/* Glowing Background Effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[3rem] blur-2xl opacity-30"></div>
          
          {/* Video Container */}
          <div className="relative bg-black rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl aspect-video group">
            <iframe 
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/YE7VzlLtp-4?autoplay=1&loop=1&mute=1&playlist=YE7VzlLtp-4" 
              title="Comment fonctionne SamaBoutik" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen>
            </iframe>
          </div>
        </motion.div>

        {/* Features - Glassmorphism Cards */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div variants={fadeInUp} className={`group relative overflow-hidden ${glassmorphismClass} p-8 rounded-[2rem] hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.2)]`}>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-colors duration-500"></div>
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <ShoppingBag className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 relative z-10">Catalogue en ligne</h3>
            <p className="text-gray-600 font-medium leading-relaxed relative z-10">
              Ajoutez vos produits en quelques clics. Partagez le lien de votre vitrine sur les réseaux sociaux et commencez à vendre instantanément.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className={`group relative overflow-hidden ${glassmorphismClass} p-8 rounded-[2rem] hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.2)]`}>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl group-hover:bg-orange-500/40 transition-colors duration-500"></div>
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <Truck className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 relative z-10">Gestion des Livraisons</h3>
            <p className="text-gray-600 font-medium leading-relaxed relative z-10">
              Assignez vos commandes à vos livreurs (Tiak-tiak). Ils ont leur propre interface pour valider les livraisons avec code secret.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className={`group relative overflow-hidden ${glassmorphismClass} p-8 rounded-[2rem] hover:-translate-y-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(236,72,153,0.2)]`}>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/40 transition-colors duration-500"></div>
            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-inner">
              <BarChart3 className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 relative z-10">Suivi des Commandes</h3>
            <p className="text-gray-600 font-medium leading-relaxed relative z-10">
              Fini les messages WhatsApp perdus. Chaque commande de client atterrit directement dans votre tableau de bord marchand.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 w-full py-24 bg-gradient-to-b from-transparent to-gray-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
              Des tarifs <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-purple-600">transparents</span>
            </h2>
            <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Choisissez le plan parfait pour développer votre activité en ligne, sans frais cachés.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center"
          >
            {/* Gratuit */}
            <motion.div variants={fadeInUp} className={`${glassmorphismClass} p-10 rounded-[2.5rem] hover:-translate-y-2 transition-all duration-500 flex flex-col group`}>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Débutant</h3>
                <p className="text-gray-500 font-medium">Pour lancer votre première boutique</p>
              </div>
              <div className="mb-10 flex items-baseline gap-2">
                <span className="text-6xl font-black text-gray-900 tracking-tighter">0</span>
                <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">FCFA / mois</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                {['Jusqu\'à 10 produits', '1 Livreur', 'Vitrine basique'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-4 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors"><Check className="w-4 h-4 text-emerald-600" /></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className="w-full block text-center bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-gray-900/20">
                  Commencer gratuitement
                </Link>
              </motion.div>
            </motion.div>

            {/* Pro - Dark Glassmorphism */}
            <motion.div variants={fadeInUp} className={`relative ${darkGlassmorphismClass} p-10 md:py-14 rounded-[3rem] hover:-translate-y-2 transition-all duration-500 flex flex-col z-10 group`}>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#4F46E5]/40 rounded-full blur-[80px] pointer-events-none group-hover:bg-[#4F46E5]/60 transition-colors duration-700"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#4F46E5] to-purple-500 text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">
                Le plus populaire
              </div>

              <div className="mb-8 mt-4 relative z-10">
                <h3 className="text-3xl font-black text-white mb-2">Pro</h3>
                <p className="text-gray-400 font-medium">Pour les marchands réguliers</p>
              </div>
              <div className="mb-10 flex items-baseline gap-2 relative z-10">
                <span className="text-6xl font-black text-white tracking-tighter">5 000</span>
                <span className="text-gray-400 font-bold uppercase tracking-wider text-sm">FCFA / mois</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1 relative z-10">
                {['Produits illimités', 'Jusqu\'à 5 livreurs', 'Personnalisation avancée', 'Statistiques détaillées'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-4 text-gray-200 font-medium">
                    <div className="w-6 h-6 rounded-full bg-[#4F46E5] flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/50"><Check className="w-4 h-4 text-white" /></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative z-10">
                <Link to="/register" className="w-full block text-center bg-white text-gray-900 font-black py-4 rounded-2xl shadow-xl shadow-white/20">
                  Démarrer l'essai
                </Link>
              </motion.div>
            </motion.div>

            {/* Premium */}
            <motion.div variants={fadeInUp} className={`${glassmorphismClass} p-10 rounded-[2.5rem] hover:-translate-y-2 transition-all duration-500 flex flex-col group`}>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Premium</h3>
                <p className="text-gray-500 font-medium">Pour les grandes boutiques</p>
              </div>
              <div className="mb-10 flex items-baseline gap-2">
                <span className="text-6xl font-black text-gray-900 tracking-tighter">15 000</span>
                <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">FCFA / mois</span>
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                {['Tout du plan Pro', 'Livreurs illimités', 'Support prioritaire WhatsApp', 'Domaine personnalisé'].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-4 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors"><Check className="w-4 h-4 text-indigo-600" /></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className="w-full block text-center bg-gray-100 text-gray-900 font-bold py-4 rounded-2xl shadow-md">
                  Nous contacter
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-indigo-100/50 bg-white/60 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-indigo-600" />
            <span className="font-black text-gray-900 text-lg tracking-tight">SamaBoutik</span>
          </div>
          <p className="text-sm font-medium text-gray-500">
            © {new Date().getFullYear()} SamaBoutik. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Paiement sécurisé à la livraison
          </div>
        </div>
      </footer>

      {/* Live Toast Notification */}
      <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {currentNotification && (
          <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-indigo-900/10 border border-white/50 flex items-start gap-4 max-w-sm">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {currentNotification.name} <span className="text-xs font-normal text-gray-500">({currentNotification.city})</span>
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{currentNotification.action}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{currentNotification.time}</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
