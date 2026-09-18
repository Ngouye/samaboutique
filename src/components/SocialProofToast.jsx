import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SocialProofToast = ({ products }) => {
  const [toast, setToast] = useState(null);

  const firstNames = ['Fatou', 'Aminata', 'Awa', 'Khady', 'Ousmane', 'Moussa', 'Abdoulaye', 'Ndeye', 'Marie', 'Jean'];
  const cities = ['Dakar', 'Thiès', 'Rufisque', 'Mbour', 'Saint-Louis', 'Touba', 'Ziguinchor'];

  useEffect(() => {
    if (!products || products.length === 0) return;

    const showRandomToast = () => {
      const isPurchase = Math.random() > 0.4; // 60% chance of purchase, 40% chance of viewing
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      
      if (isPurchase) {
        const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        const timeAgo = Math.floor(Math.random() * 59) + 1;
        
        setToast({
          id: Date.now(),
          type: 'purchase',
          title: 'Nouvel achat !',
          message: `${randomName} (${randomCity}) vient d'acheter ce produit.`,
          product: randomProduct,
          time: `Il y a ${timeAgo} min`
        });
      } else {
        const viewersCount = Math.floor(Math.random() * 20) + 5;
        setToast({
          id: Date.now(),
          type: 'view',
          title: 'Très demandé 🔥',
          message: `${viewersCount} personnes regardent ce produit actuellement.`,
          product: randomProduct,
          time: 'En ce moment'
        });
      }

      // Hide toast after 6 seconds
      setTimeout(() => {
        setToast(null);
      }, 6000);
    };

    // Initial delay before first toast
    const initialTimer = setTimeout(() => {
      showRandomToast();
      
      // Then show a toast every 20-30 seconds
      const interval = setInterval(() => {
        showRandomToast();
      }, Math.floor(Math.random() * 10000) + 20000);

      return () => clearInterval(interval);
    }, 8000);

    return () => clearTimeout(initialTimer);
  }, [products]);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex gap-4 items-center w-[320px] pointer-events-auto relative overflow-hidden"
          >
            {/* Left Icon/Image */}
            <div className="w-14 h-14 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden relative border border-gray-100 flex items-center justify-center">
              {toast.product?.image_url ? (
                <img src={toast.product.image_url} alt={toast.product.name} className="w-full h-full object-cover" />
              ) : (
                toast.type === 'purchase' ? <ShoppingBag className="w-6 h-6 text-indigo-400" /> : <Eye className="w-6 h-6 text-orange-400" />
              )}
              {/* Badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                {toast.type === 'purchase' ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px]">🔥</div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <p className={`text-[10px] font-black uppercase tracking-wider ${toast.type === 'purchase' ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {toast.title}
                </p>
                <p className="text-[9px] text-gray-400 font-medium">{toast.time}</p>
              </div>
              <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
                {toast.message}
              </p>
              {toast.product && (
                <p className="text-xs text-gray-500 mt-1 truncate font-medium">
                  {toast.product.name}
                </p>
              )}
            </div>
            
            <button 
              onClick={() => setToast(null)}
              className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialProofToast;
