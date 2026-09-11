import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { 
  ShieldAlert, Store, Package, Users, ShieldCheck, Activity, Search, 
  LogOut, LayoutDashboard, CreditCard, TrendingUp, Filter, MoreVertical,
  CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Prix mensuels par abonnement (en FCFA) pour l'estimation du MRR
const TIER_PRICES = {
  free: 0,
  pro: 5000,
  premium: 15000,
  elite: 15000 // Fallback
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState('overview');
  const [merchants, setMerchants] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all'); // all, free, pro, premium

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch all merchants with their tiers
      const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (merchantsError) throw merchantsError;
      setMerchants(merchantsData || []);

      // Fetch total products
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
        
      if (!productsError) {
        setTotalProducts(productsCount || 0);
      }
      
    } catch (error) {
      console.error("Erreur chargement admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMerchantSuspension = async (merchantId, currentStatus) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${currentStatus ? 'débloquer' : 'suspendre'} ce marchand ?`)) return;

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ is_suspended: !currentStatus })
        .eq('id', merchantId);

      if (error) throw error;
      
      // Update local state
      setMerchants(merchants.map(m => 
        m.id === merchantId ? { ...m, is_suspended: !currentStatus } : m
      ));
      
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      alert("Erreur lors de la mise à jour.");
    }
  };

  // KPI Calculations
  const activeMerchants = merchants.filter(m => !m.is_suspended);
  const suspendedMerchants = merchants.filter(m => m.is_suspended);
  
  const estimatedMRR = merchants.reduce((total, m) => {
    const tier = m.tier || 'free';
    return total + (TIER_PRICES[tier] || 0);
  }, 0);

  const tierDistribution = {
    free: merchants.filter(m => (m.tier || 'free') === 'free').length,
    pro: merchants.filter(m => m.tier === 'pro').length,
    premium: merchants.filter(m => m.tier === 'premium' || m.tier === 'elite').length,
  };

  // Filters for table
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = m.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone_number?.includes(searchQuery);
    let mTier = m.tier || 'free';
    if (mTier === 'elite') mTier = 'premium';
    const matchesTier = tierFilter === 'all' || mTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  // TABS CONFIG
  const TABS = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'merchants', label: 'Marchands', icon: Store },
    { id: 'subscriptions', label: 'Finances', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col md:fixed md:inset-y-0 z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">Shopeers</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-semibold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          {/* Upgrade Card inspired by design */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 rounded-2xl p-5 text-white mb-4 shadow-lg shadow-blue-900/20 text-left">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-bold text-sm mb-1">Upgrade to Premium!</h4>
            <p className="text-[10px] text-blue-100 mb-4 opacity-90 leading-tight">Upgrade your account and unlock all of the benefits.</p>
            <button className="w-full bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-blue-400">
              Upgrade premium
            </button>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-red-500 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        
        {/* Top Header */}
        <header className="bg-slate-50 md:bg-transparent px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex-1 w-full md:max-w-md relative">
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full bg-white border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-slate-600 shadow-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button className="hidden md:flex bg-white border border-gray-200 shadow-sm px-3 py-1.5 text-xs font-semibold text-slate-600 rounded-full items-center gap-2 hover:bg-gray-50">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Oct 1, 2023 - Nov 1, 2023
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md px-4 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2 transition-colors">
              <LogOut className="w-3 h-3 rotate-90" />
              Export
            </button>
          </div>
        </header>

        <div className="p-4 sm:px-6 lg:px-8 pb-10 flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</h2>
          </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 gap-4"
            >
              <Activity className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-slate-400">Chargement des données...</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard 
                      title="MRR Estimé" 
                      value={`${estimatedMRR.toLocaleString('fr-FR')} FCFA`} 
                      icon={TrendingUp} 
                      color="blue" 
                      delay={0.1}
                    />
                    <KPICard 
                      title="Boutiques Actives" 
                      value={activeMerchants.length} 
                      icon={Store} 
                      color="blue" 
                      delay={0.2}
                    />
                    <KPICard 
                      title="Total Produits" 
                      value={totalProducts} 
                      icon={Package} 
                      color="blue" 
                      delay={0.3}
                    />
                    <KPICard 
                      title="Boutiques Suspendues" 
                      value={suspendedMerchants.length} 
                      icon={ShieldAlert} 
                      color="blue" 
                      delay={0.4}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Graphique principal style Shopeers */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-500 mb-2">Total Revenus SaaS</h3>
                          <div className="flex items-end gap-3">
                            <span className="text-3xl font-black text-slate-900">{estimatedMRR > 0 ? (estimatedMRR * 12).toLocaleString('fr-FR') : '0'} FCFA</span>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Fake Graph */}
                      <div className="flex-1 min-h-[200px] flex items-end justify-between gap-2 relative mt-4">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <path d="M0 100 L 0 80 C 20 80, 40 90, 60 50 S 80 40, 100 20 L 100 100 Z" fill="rgba(37, 99, 235, 0.1)" />
                          <path d="M0 80 C 20 80, 40 90, 60 50 S 80 40, 100 20" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {/* Axes X */}
                        <div className="absolute -bottom-6 w-full flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>S1</span>
                          <span>S2</span>
                          <span>S3</span>
                          <span>S4</span>
                          <span>S5</span>
                        </div>
                      </div>
                    </div>

                    {/* Distribution des offres */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-900">Abonnements</h3>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="space-y-6">
                        <TierBar label="Débutant (Free)" count={tierDistribution.free} total={merchants.length} color="bg-slate-200" textClass="text-slate-600" />
                        <TierBar label="Pro" count={tierDistribution.pro} total={merchants.length} color="bg-blue-500" textClass="text-blue-600" />
                        <TierBar label="Premium" count={tierDistribution.premium} total={merchants.length} color="bg-amber-400" textClass="text-amber-500" />
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total Marchands</span>
                          <span className="font-bold text-slate-900">{merchants.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* TAB: MERCHANTS */}
              {activeTab === 'merchants' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">Marchands</h2>
                      <p className="text-slate-500 mt-1 text-sm">Gérez tous les utilisateurs inscrits sur la plateforme.</p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    {/* Table Filters */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Rechercher par nom ou téléphone..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full text-slate-600 shadow-sm"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select 
                          value={tierFilter}
                          onChange={(e) => setTierFilter(e.target.value)}
                          className="bg-white border border-gray-200 text-slate-600 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 shadow-sm"
                        >
                          <option value="all">Tous les forfaits</option>
                          <option value="free">Débutant</option>
                          <option value="pro">Pro</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">Boutique</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Forfait</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredMerchants.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Users className="w-8 h-8 text-slate-300 mb-2" />
                                  <p>Aucun marchand trouvé.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredMerchants.map((merchant) => (
                              <tr key={merchant.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                      {merchant.shop_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-800">{merchant.shop_name || 'Sans Nom'}</div>
                                      <div className="text-[11px] text-slate-400 font-medium">ID: #{merchant.id.substring(0, 5)}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {merchant.phone_number || "Non renseigné"}
                                </td>
                                <td className="px-6 py-4">
                                  <TierBadge tier={merchant.tier} />
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    merchant.is_suspended 
                                      ? 'bg-red-50 text-red-600' 
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${merchant.is_suspended ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                    {merchant.is_suspended ? 'Suspendu' : 'Actif'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => toggleMerchantSuspension(merchant.id, merchant.is_suspended)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                                      merchant.is_suspended
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                                    }`}
                                  >
                                    {merchant.is_suspended ? 'Débloquer' : 'Suspendre'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}


              {/* TAB: SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Abonnements SaaS</h2>
                    <p className="text-slate-500 mt-1 text-sm">Gérez la monétisation et vérifiez l'état des forfaits marchands.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PlanSummaryCard 
                      tier="Débutant" 
                      count={tierDistribution.free} 
                      price="0 FCFA" 
                      features={['Jusqu\'à 10 produits', '1 Livreur', 'Vitrine basique']} 
                      color="gray"
                    />
                    <PlanSummaryCard 
                      tier="Pro" 
                      count={tierDistribution.pro} 
                      price={`${TIER_PRICES.pro.toLocaleString('fr-FR')} FCFA/mois`} 
                      features={['Produits illimités', 'Jusqu\'à 5 livreurs', 'Personnalisation avancée', 'Statistiques détaillées']} 
                      color="blue"
                      isPopular
                    />
                    <PlanSummaryCard 
                      tier="Premium" 
                      count={tierDistribution.premium} 
                      price={`${TIER_PRICES.premium.toLocaleString('fr-FR')} FCFA/mois`} 
                      features={['Tout du plan Pro', 'Livreurs illimités', 'Support prioritaire', 'Domaine personnalisé']} 
                      color="amber"
                    />
                  </div>

                  {/* Future enhancements placeholder */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center mt-8 shadow-sm">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Paiements Automatiques à venir</h3>
                    <p className="text-slate-500 text-sm max-w-lg mx-auto">
                      Bientôt, vous pourrez voir l'historique complet des paiements PayDunya des abonnements marchands directement ici. 
                      Les factures seront générées automatiquement.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Subcomponents

function KPICard({ title, value, icon: Icon, color, delay, trend }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  const isPositive = trend?.startsWith('+');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.3 }}
      className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 relative overflow-hidden group hover:border-gray-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <h3 className="text-slate-500 font-semibold text-sm">{title}</h3>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <p className="text-2xl font-black text-slate-800">{value}</p>
        {trend && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TierBar({ label, count, total, color, textClass = "text-slate-500" }) {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold mb-2">
        <span className={textClass}>{label}</span>
        <span className="text-slate-400">{count} boutique(s) - {percentage}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const t = tier || 'free';
  if (t === 'premium' || t === 'elite') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
        Premium
      </span>
    );
  }
  if (t === 'pro') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
        Pro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
      Débutant
    </span>
  );
}

function PlanSummaryCard({ tier, count, price, features, color, isPopular }) {
  const colorStyles = {
    gray: 'border-slate-200 bg-white shadow-sm',
    blue: 'border-blue-200 bg-blue-50/50 shadow-md ring-1 ring-blue-500/10',
    amber: 'border-amber-200 bg-amber-50/50 shadow-sm',
  };

  return (
    <div className={`border rounded-2xl p-6 relative flex flex-col ${colorStyles[color]}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
          Populaire
        </div>
      )}
      
      <h3 className="text-lg font-bold text-slate-800">{tier}</h3>
      <div className="mt-2 text-2xl font-black text-slate-900">{price}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{count} abonnés actifs</div>
      
      <div className="mt-6 flex-1 space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
