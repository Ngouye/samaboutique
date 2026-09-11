import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Star, Heart, ShoppingCart, Image as ImageIcon } from 'lucide-react';

export default function ProductCard({ p, favorites, toggleFavorite, setSelectedProduct, addToCart, index = 0 }) {
  const rating = p.rating || 0;
  const reviewsCount = p.reviews_count || 0;
  const isFavorite = favorites?.includes(p.id);
  const hasDiscount = p.compare_at_price > p.price_fcfa;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ duration: 0.4, delay: index * 0.05, type: 'spring', stiffness: 100 }}
      className="group flex flex-col bg-[#F9F9FB] rounded-3xl overflow-hidden border border-gray-100 hover:border-transparent hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 relative cursor-pointer h-full"
      onClick={() => setSelectedProduct(p)}
    >
      {/* Badges & Wishlist */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {hasDiscount && (
          <span className="bg-red-500 text-white px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider shadow-sm">
            Promo
          </span>
        )}
        {p.stock <= 0 && (
          <span className="bg-black text-white px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider shadow-sm">
            Vendu
          </span>
        )}
        {!hasDiscount && p.stock > 0 && (
          <span className="bg-gray-900 text-white px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase tracking-wider shadow-sm">
            Nouveau
          </span>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFavorite?.(p.id); }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-white text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Image Container */}
      <div className="relative aspect-square w-full pt-12 pb-4 px-6 flex items-center justify-center">
        {p.image_url ? (
          <img 
            src={p.image_url} 
            alt={p.name} 
            loading="lazy" 
            className="w-full h-full object-contain object-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-xl" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-2xl">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-4 md:p-5 flex flex-col flex-1 bg-white rounded-t-3xl mt-2 relative z-10">
        <h3 className="font-bold text-gray-900 text-sm md:text-base leading-snug line-clamp-2 mb-1 group-hover:text-orange-500 transition-colors">
          {p.name}
        </h3>
        
        <p className="text-[10px] md:text-xs text-gray-400 font-medium mb-3">
          {p.category || 'Catégorie'}
        </p>
        
        <div className="flex items-center gap-1 mb-4">
          <div className="flex text-orange-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-current' : 'fill-gray-200 text-gray-200'}`} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">({reviewsCount})</span>
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-black text-gray-900 text-lg md:text-xl tracking-tight leading-none">
              {p.price_fcfa.toLocaleString('fr-FR')} <span className="text-[10px] md:text-xs text-gray-500 font-bold">FCFA</span>
            </span>
            {hasDiscount && (
              <span className="text-gray-400 text-[10px] md:text-xs font-bold line-through mt-0.5">
                {p.compare_at_price.toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SPORTECH Add to cart button (Square at bottom right) */}
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          addToCart(p); 
        }}
        disabled={p.stock <= 0}
        className="absolute bottom-0 right-0 w-12 h-12 bg-gray-900 hover:bg-orange-500 text-white flex items-center justify-center rounded-tl-2xl transition-colors disabled:opacity-50 disabled:hover:bg-gray-900 z-20"
        aria-label="Ajouter au panier"
      >
        <ShoppingCart className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
