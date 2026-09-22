import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Truck, BarChart3, ArrowRight, ShieldCheck, ShoppingBag, Check, Users, MapPin, Bell, Sparkles, Smartphone, CreditCard, LayoutDashboard } from 'lucide-react';
import Tilt from 'react-parallax-tilt';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { playPop } from '../utils/audio';

const FAKE_NOTIFICATIONS = [
  { name: "Fatou D.", city: "Dakar", action: "vient de créer sa boutique", time: "à l'instant" },
  { name: "Mamadou N.", city: "Thiès", action: "a reçu 3 commandes", time: "il y a 5 min" },
  { name: "Awa S.", city: "Saint-Louis", action: "vient de s'inscrire", time: "il y a 12 min" },
  { name: "Boutique Chez Ali", city: "Dakar", action: "a validé une livraison", time: "il y a 20 min" },
];

const TABS = [
  { id: '01', title: 'Vendeurs', description: 'Gérez votre catalogue, suivez vos commandes et encaissez vos paiements en un seul endroit.', icon: <Store className="w-5 h-5" /> },
  { id: '02', title: 'Livreurs', description: 'Une application dédiée pour vos livreurs avec suivi GPS et validation par code PIN.', icon: <Truck className="w-5 h-5" /> },
  { id: '03', title: 'Clients', description: 'Une expérience d\'achat fluide, optimisée pour mobile avec paiement Wave ou Orange Money.', icon: <Users className="w-5 h-5" /> },
];

export default function Landing() {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0].id);

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
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } // Custom easing for that premium feel
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-primary-200">
      
      {/* Navigation - Ultra Modern Floating Pill */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 inset-x-0 z-50 flex justify-center px-4"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="SamaBoutik Logo" className="h-7 md:h-8 object-contain" />
            </Link>
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
              <a href="#fonctionnalites" className="hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-all duration-300">Produit</a>
              <a href="#tarifs" className="hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-all duration-300">Tarifs</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-full transition-all duration-300 hidden sm:block">
              Se connecter
            </Link>
            <Link to="/register" className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-md shadow-primary-600/20 hover:shadow-primary-600/30 transform hover:-translate-y-0.5">
              Créer ma boutique
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden flex items-center min-h-[90vh] bg-slate-50">
        {/* Background Gradients instead of image */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -left-32 w-[40rem] h-[40rem] bg-emerald-200/50 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-10 -right-32 w-[30rem] h-[30rem] bg-teal-300/40 rounded-full blur-[120px]"
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column: Text */}
            <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } }} className="flex flex-col items-start text-left">
              
              <motion.div variants={fadeInUp} className="flex items-center gap-2 bg-white/80 backdrop-blur text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest border border-emerald-100 shadow-sm mb-8 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Nouveau : SamaBoutik v2.0
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1] drop-shadow-sm">
                La plateforme e-commerce <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">des vendeurs ambitieux.</span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-lg md:text-xl text-slate-600 font-medium max-w-xl mb-10 leading-relaxed">
                Sécurisez vos paiements, gérez vos stocks en temps réel et coordonnez vos livraisons grâce à notre solution tout-en-un.
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <Link to="/register" onMouseEnter={playPop} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-bold text-[16px] transition-all duration-300 shadow-[0_10px_30px_rgba(5,150,105,0.3)] hover:shadow-[0_15px_40px_rgba(5,150,105,0.5)] transform hover:-translate-y-1 flex items-center justify-center gap-2">
                  Commencer gratuitement
                </Link>
                <Link to="/login" className="w-full sm:w-auto bg-white/90 backdrop-blur hover:bg-white text-slate-800 border border-slate-200 px-8 py-4 rounded-full font-bold text-[16px] transition-all duration-300 hover:border-slate-300 shadow-sm hover:shadow-md transform hover:-translate-y-1 flex items-center justify-center">
                  Réserver une démo
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column: Image */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-md mx-auto lg:max-w-none"
            >
              {/* Decorative elements behind image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-full blur-3xl opacity-50 transform scale-110"></div>
              
              <img 
                src="/hero-ecommerce.jpg" 
                alt="Tous nos produits" 
                className="relative z-10 w-full h-auto object-contain hover:scale-105 transition-transform duration-700" 
                style={{ 
                  mixBlendMode: 'multiply',
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)', 
                  maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)' 
                }}
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Social Proof Marquee */}
      <section className="py-16 border-y border-slate-200/50 bg-slate-50/50 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Intégrations & Partenaires de confiance</p>
        </div>

        <div className="flex animate-marquee whitespace-nowrap items-center gap-6">
          {Array(3).fill([
            { name: 'Wave', icon: <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" /> },
            { name: 'Orange Money', icon: <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" /> },
            { name: 'Free Money', icon: <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" /> },
            { name: 'DHL Express', icon: <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]" /> },
            { name: 'La Poste SN', icon: <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]" /> },
            { name: 'PayDunya', icon: <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" /> }
          ]).flat().map((brand, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm opacity-80 hover:opacity-100 hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-default group">
              {brand.icon}
              <span className="text-lg font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{brand.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Showcase Section */}
      <section className="py-24 bg-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
              Gardez le contrôle total sur <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-500">votre activité.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Un tableau de bord puissant, conçu pour vous donner une vue d'ensemble instantanée sur vos ventes, vos livraisons et vos performances.
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-6xl mx-auto"
          >
            <Tilt tiltMaxAngleX={2} tiltMaxAngleY={2} perspective={2000} scale={1.01} transitionSpeed={2000} className="relative rounded-[2rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-slate-200/80 bg-slate-50/50 p-2">
              <div className="rounded-[1.5rem] overflow-hidden border border-slate-200 bg-white relative">
                {/* Window Controls */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-5 gap-2 z-10">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="mx-auto flex items-center gap-2 bg-slate-100/80 px-4 py-1.5 rounded-full text-xs text-slate-500 font-medium font-mono shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> admin.samaboutik.sn
                  </div>
                </div>
                {/* 48px is the height of the window controls (h-12) */}
                <img src="/dashboard-preview.png" alt="Interface Dashboard" className="w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-1000" style={{ marginTop: '48px' }} />
              </div>
            </Tilt>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="fonctionnalites" className="py-24 max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            <div className="w-2 h-2 bg-primary-500"></div>
            Comment ça marche
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
            Un processus simple, qui sécurise <br className="hidden md:block" />
            vos ventes à chaque étape.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Création Instantanée", desc: "Ajoutez vos produits et générez une vitrine en quelques clics.", image: "/card-creation.jpg" },
            { title: "Paiement Sécurisé", desc: "Encaissez via Mobile Money. Chaque transaction est vérifiée.", image: "/card-payment.jpg" },
            { title: "Livraison Suivie", desc: "Assignez vos livreurs et suivez l'acheminement en temps réel.", image: "/card-delivery.jpg" }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}}}
              whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.1)" }}
              className="bg-white p-4 pb-8 rounded-[2rem] border border-slate-200/60 shadow-sm group transition-all duration-300 flex flex-col"
            >
              <div className="w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden mb-6 bg-slate-100 relative">
                <div className="absolute inset-0 bg-primary-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 mix-blend-overlay"></div>
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="px-4">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 font-normal leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive Tabs Section */}
      <section className="py-24 bg-white border-y border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              <div className="w-2 h-2 bg-primary-500"></div>
              Cas d'usage
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 max-w-xl">
              Un impact direct sur toutes les strates de votre entreprise.
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-12">
            {/* Tabs Sidebar */}
            <div className="w-full md:w-1/3 flex flex-col gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left p-6 rounded-2xl transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-[#F8FAFC] border border-slate-200/60 shadow-sm' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                      {tab.icon}
                    </div>
                    <h3 className={`text-lg font-semibold ${activeTab === tab.id ? 'text-primary-900' : 'text-slate-700'}`}>
                      {tab.title}
                    </h3>
                  </div>
                  {activeTab === tab.id && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-slate-600 text-sm mt-2 leading-relaxed"
                    >
                      {tab.description}
                    </motion.p>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content Graphic */}
            <div className="w-full md:w-2/3">
              <div className="bg-[#F8FAFC] border border-slate-200/60 rounded-[2rem] p-8 md:p-12 h-[400px] relative overflow-hidden flex items-center justify-center">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/50 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-200/50 rounded-full blur-[80px]"></div>
                
                <AnimatePresence mode="wait">
                  {activeTab === '01' && (
                    <motion.div key="01" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl w-full max-w-md">
                      <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full"></div>
                        <div>
                          <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-10 w-full bg-slate-50 rounded border border-slate-100 flex items-center px-4"><div className="h-2 w-32 bg-slate-200 rounded"></div></div>
                        <div className="h-10 w-full bg-slate-50 rounded border border-slate-100 flex items-center px-4"><div className="h-2 w-24 bg-slate-200 rounded"></div></div>
                        <div className="h-10 w-full bg-slate-50 rounded border border-slate-100 flex items-center px-4"><div className="h-2 w-40 bg-slate-200 rounded"></div></div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === '02' && (
                    <motion.div key="02" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10 w-full max-w-sm">
                      <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-2xl relative">
                         {/* Map mockup */}
                         <div className="w-full h-40 bg-slate-100 rounded-xl mb-4 overflow-hidden relative">
                           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #64748b 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary-600 border-2 border-white rounded-full shadow-lg"></div>
                           <div className="absolute top-1/2 left-1/2 w-24 h-0.5 bg-primary-600/50 -rotate-45 origin-left"></div>
                           <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg"></div>
                         </div>
                         <div className="flex items-center justify-between mb-4">
                           <div>
                             <p className="text-sm font-bold text-slate-800">Livraison #4029</p>
                             <p className="text-xs text-slate-500">En cours d'acheminement</p>
                           </div>
                           <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded">Actif</div>
                         </div>
                         <div className="h-10 bg-slate-900 rounded-xl w-full flex items-center justify-center text-white text-sm font-medium">Valider la livraison</div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === '03' && (
                    <motion.div key="03" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex gap-4">
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-lg w-48 -rotate-6 transform translate-y-4">
                        <div className="w-full h-32 bg-slate-100 rounded-lg mb-3"></div>
                        <div className="h-3 w-3/4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-1/2 bg-primary-100 rounded mb-4"></div>
                        <div className="h-8 bg-slate-900 rounded-lg w-full"></div>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl w-48 rotate-3 z-10">
                        <div className="w-full h-32 bg-slate-100 rounded-lg mb-3"></div>
                        <div className="h-3 w-3/4 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-1/2 bg-primary-100 rounded mb-4"></div>
                        <div className="h-8 bg-primary-600 rounded-lg w-full flex items-center justify-center text-white text-xs font-medium">Ajouter au panier</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics / Outcomes Section */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-12 justify-center"
        >
          <div className="w-2 h-2 bg-primary-500"></div>
          Résultats mesurables
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white border border-slate-200/60 p-3 rounded-[2.5rem] shadow-xl shadow-slate-200/50"
        >
          <div className="bg-[#0A0A0A] rounded-[2rem] p-12 text-white h-full relative overflow-hidden flex flex-col justify-center transform transition-transform hover:scale-[0.98] duration-500 cursor-pointer">
            {/* Dark background details */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-gradient-to-br from-primary-500/20 to-emerald-500/20 rounded-full blur-[80px]"
            />
            <ShieldCheck className="w-12 h-12 text-primary-400 mb-6 relative z-10" />
            <h3 className="text-6xl md:text-8xl font-bold tracking-tight mb-4 relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">99.9%</h3>
            <p className="text-slate-400 text-lg relative z-10">Fiabilité des transactions et disponibilité de la plateforme.</p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} viewport={{ once: true }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CROISSANCE</p>
              <p className="text-4xl font-semibold text-slate-900 mb-2">3x plus rapide</p>
              <p className="text-slate-600">En moyenne, nos marchands voient leurs ventes tripler grâce à la simplification du processus d'achat.</p>
            </motion.div>
            <div className="w-full h-px bg-slate-100"></div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} viewport={{ once: true }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">DÉPLOIEMENT</p>
              <p className="text-4xl font-semibold text-slate-900 mb-2">&lt; 2 minutes</p>
              <p className="text-slate-600">Le temps moyen nécessaire pour créer une boutique complète et encaisser sa première vente.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-24 bg-white border-t border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 justify-center">
              <div className="w-2 h-2 bg-primary-500"></div>
              Tarifs simples et transparents
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 max-w-2xl mx-auto">
              Payez uniquement quand vous encaissez.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Plan 1 */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}}}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-[#F8FAFC] p-8 rounded-2xl border border-slate-200/60 shadow-sm relative group transition-all duration-300 hover:shadow-xl hover:border-slate-300"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Débutant</h3>
              <p className="text-sm text-slate-500 mb-6">Pour lancer votre première boutique.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors duration-300">0 FCFA</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Jusqu'à 50 produits</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Frais de transaction : 2%</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Boutique personnalisée</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Support par email</span></li>
              </ul>
              <Link to="/register" className="block w-full text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 py-3 rounded-xl font-medium transition-colors text-sm">
                Commencer gratuitement
              </Link>
            </motion.div>

            {/* Plan 2 - Popular */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}}}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="bg-[#0A0A0A] p-8 rounded-2xl shadow-2xl relative transform md:-translate-y-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(5,150,105,0.2)]"
            >
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/30 transition-colors duration-500"></div>
              </div>
              <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center z-20">
                <span className="bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-[0_0_15px_rgba(5,150,105,0.5)]">Le plus populaire</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 relative z-10">Professionnel</h3>
              <p className="text-sm text-slate-400 mb-6 relative z-10">Pour les vendeurs en pleine croissance.</p>
              <div className="mb-6 relative z-10">
                <span className="text-4xl font-bold text-white">5 000 FCFA</span>
                <span className="text-slate-400">/mois</span>
              </div>
              <ul className="space-y-4 mb-8 relative z-10">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /><span className="text-slate-300 text-sm">Produits illimités</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /><span className="text-slate-300 text-sm">Frais de transaction : 1%</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /><span className="text-slate-300 text-sm">Nom de domaine personnalisé</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 shrink-0" /><span className="text-slate-300 text-sm">Support prioritaire</span></li>
              </ul>
              <Link to="/register" className="relative z-10 block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-medium transition-colors text-sm shadow-lg shadow-emerald-500/20">
                Essai gratuit de 14 jours
              </Link>
            </motion.div>

            {/* Plan 3 */}
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}}}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-[#F8FAFC] p-8 rounded-2xl border border-slate-200/60 shadow-sm relative group transition-all duration-300 hover:shadow-xl hover:border-slate-300"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Premium</h3>
              <p className="text-sm text-slate-500 mb-6">Pour les grandes boutiques et agences.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors duration-300">15 000 FCFA</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Tout du forfait Pro</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Frais de transaction : 0.5%</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Gestion multi-boutiques</span></li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /><span className="text-slate-600 text-sm">Account manager dédié</span></li>
              </ul>
              <Link to="/register" className="block w-full text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 py-3 rounded-xl font-medium transition-colors text-sm">
                Contacter les ventes
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-8">
            L'innovation e-commerce <br/> au rythme de votre ambition.
          </h2>
          <Link to="/register" className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-full font-medium text-lg transition-colors">
            Réserver une démo
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#111111] text-slate-400 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-white font-bold text-xl tracking-tight">SamaBoutik.</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs mb-8">
              La plateforme e-commerce moderne pour les entrepreneurs sénégalais.
            </p>
            <div className="flex items-center gap-4">
              {/* Social Icons Placeholder */}
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">in</div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">tw</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Produit</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tarifs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sécurité</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Ressources</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Légal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Conditions</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SamaBoutik. Tous droits réservés.</p>
          <div className="flex items-center gap-2 font-mono">
             Statut: Tous les systèmes sont opérationnels
             <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2"></span>
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
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center shrink-0 border border-primary-100">
                <Bell className="w-5 h-5 text-primary-500" />
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
