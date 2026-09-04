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
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'merchants', label: 'Marchands', icon: Users },
    { id: 'subscriptions', label: 'SaaS & Revenus', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col md:fixed md:inset-y-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SuperAdmin</h1>
            <p className="text-xs text-indigo-400">SamaBoutik SaaS</p>
          </div>
        </div>

        <nav className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">
        
        {/* Header mobile (invisible on desktop if we want, but nice for context) */}
        <div className="md:hidden mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black capitalize">{TABS.find(t => t.id === activeTab)?.label}</h2>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 gap-4"
            >
              <Activity className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-gray-400">Chargement des données critiques...</p>
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
                  <div>
                    <h2 className="text-3xl font-black text-white">Vue d'ensemble</h2>
                    <p className="text-gray-400 mt-1">Les métriques clés de votre plateforme SaaS.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                      title="MRR Estimé" 
                      value={`${estimatedMRR.toLocaleString('fr-FR')} FCFA`} 
                      icon={TrendingUp} 
                      color="emerald" 
                      delay={0.1}
                    />
                    <KPICard 
                      title="Boutiques Actives" 
                      value={activeMerchants.length} 
                      icon={Store} 
                      color="indigo" 
                      delay={0.2}
                    />
                    <KPICard 
                      title="Total Produits" 
                      value={totalProducts} 
                      icon={Package} 
                      color="purple" 
                      delay={0.3}
                    />
                    <KPICard 
                      title="Boutiques Suspendues" 
                      value={suspendedMerchants.length} 
                      icon={ShieldAlert} 
                      color="red" 
                      delay={0.4}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Distribution des offres */}
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                      
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-400" />
                        Répartition des Abonnements
                      </h3>
                      
                      <div className="space-y-4">
                        <TierBar label="Débutant" count={tierDistribution.free} total={merchants.length} color="bg-gray-500" />
                        <TierBar label="Pro" count={tierDistribution.pro} total={merchants.length} color="bg-indigo-500" />
                        <TierBar label="Premium" count={tierDistribution.premium} total={merchants.length} color="bg-amber-500" />
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
                      <h2 className="text-3xl font-black text-white">Marchands</h2>
                      <p className="text-gray-400 mt-1">Gérez tous les utilisateurs inscrits sur la plateforme.</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col">
                    {/* Table Filters */}
                    <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/50">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="Rechercher par nom ou téléphone..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select 
                          value={tierFilter}
                          onChange={(e) => setTierFilter(e.target.value)}
                          className="bg-gray-950 border border-gray-800 text-gray-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
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
                      <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-950/50 text-gray-500 uppercase text-xs font-bold">
                          <tr>
                            <th className="px-6 py-4">Boutique</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Forfait</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {filteredMerchants.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Users className="w-8 h-8 text-gray-600 mb-2" />
                                  <p>Aucun marchand trouvé.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredMerchants.map((merchant) => (
                              <tr key={merchant.id} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
                                      {merchant.shop_name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                      <div className="font-bold text-white">{merchant.shop_name || 'Sans Nom'}</div>
                                      <div className="text-xs text-gray-500">Inscrit le {new Date(merchant.created_at).toLocaleDateString('fr-FR')}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-300">
                                  {merchant.phone_number || "Non renseigné"}
                                </td>
                                <td className="px-6 py-4">
                                  <TierBadge tier={merchant.tier} />
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    merchant.is_suspended 
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${merchant.is_suspended ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                                    {merchant.is_suspended ? 'Suspendu' : 'Actif'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => toggleMerchantSuspension(merchant.id, merchant.is_suspended)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      merchant.is_suspended
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
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
                    <h2 className="text-3xl font-black text-white">Abonnements SaaS</h2>
                    <p className="text-gray-400 mt-1">Gérez la monétisation et vérifiez l'état des forfaits marchands.</p>
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
                      color="indigo"
                      isPopular
                    />
                    <PlanSummaryCard 
                      tier="Premium" 
                      count={tierDistribution.premium} 
                      price={`${TIER_PRICES.premium.toLocaleString('fr-FR')} FCFA/mois`} 
                      features={['Tout du plan Pro', 'Livreurs illimités', 'Support prioritaire WhatsApp', 'Domaine personnalisé']} 
                      color="amber"
                    />
                  </div>

                  {/* Future enhancements placeholder */}
                  <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-3xl p-8 text-center mt-8">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Paiements Automatiques à venir</h3>
                    <p className="text-indigo-200 max-w-lg mx-auto">
                      Bientôt, vous pourrez voir l'historique complet des paiements PayDunya des abonnements marchands directement ici. 
                      Les factures seront générées automatiquement.
                    </p>
                  </div>

                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Subcomponents

function KPICard({ title, value, icon: Icon, color, delay }) {
  const colorMap = {
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/20',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-700 transition-colors"
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-gray-400 font-medium text-sm">{title}</h3>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-black text-white relative z-10">{value}</p>
      
      {/* Glow effect on hover */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${colorMap[color].split(' ')[0]}`}></div>
    </motion.div>
  );
}

function TierBar({ label, count, total, color }) {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-500">{count} boutique(s) - {percentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const t = tier || 'free';
  if (t === 'premium' || t === 'elite') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-amber-400 border border-amber-500/30">
        Premium
      </span>
    );
  }
  if (t === 'pro') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
        Pro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
      Débutant
    </span>
  );
}

function PlanSummaryCard({ tier, count, price, features, color, isPopular }) {
  const colorStyles = {
    gray: 'border-gray-800 bg-gray-900',
    indigo: 'border-indigo-500/50 bg-indigo-900/10 shadow-xl shadow-indigo-500/5',
    amber: 'border-amber-500/30 bg-amber-900/10',
  };

  return (
    <div className={`border rounded-3xl p-6 relative flex flex-col ${colorStyles[color]}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          Plus Populaire
        </div>
      )}
      
      <h3 className="text-xl font-bold text-white">{tier}</h3>
      <div className="mt-2 text-2xl font-black text-white">{price}</div>
      <div className="text-sm text-gray-400 mt-1">{count} abonnés actifs</div>
      
      <div className="mt-6 flex-1 space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
