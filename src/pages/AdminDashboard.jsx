import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { ShieldAlert, Store, Package, Users, ShieldCheck, Activity, Search, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch all merchants
      const { data: merchantsData, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (merchantsError) throw merchantsError;
      setMerchants(merchantsData || []);

      // Fetch all products (to count them)
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
      alert("Erreur lors de la mise à jour. Avez-vous exécuté le script SQL ?");
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone_number?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30">
      
      {/* Top Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">SamaBoutik Admin</h1>
                <p className="text-xs text-indigo-400">Super Control Center</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Boutiques Actives</h3>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-white">{merchants.filter(m => !m.is_suspended).length}</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Boutiques Suspendues</h3>
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-white">{merchants.filter(m => m.is_suspended).length}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Produits Hébergés</h3>
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-white">{totalProducts}</p>
          </motion.div>
        </div>

        {/* Merchants List */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Liste des Marchands
              </h2>
              <p className="text-sm text-gray-400 mt-1">Gérez l'accès des marchands à la plateforme SamaBoutik.</p>
            </div>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Rechercher une boutique..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-950 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Boutique</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Inscription</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Activity className="w-8 h-8 animate-spin text-indigo-500" />
                        Chargement des données...
                      </div>
                    </td>
                  </tr>
                ) : filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Aucun marchand trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {merchant.shop_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base">{merchant.shop_name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">{merchant.description || "Pas de description"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-300">
                        {merchant.phone_number || "Non renseigné"}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(merchant.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
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
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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

      </main>
    </div>
  );
}
