import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Image as ImageIcon } from 'lucide-react';

export default function ProductCard({ p, favorites, toggleFavorite, setSelectedProduct, addToCart }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex flex-col bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(p)}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {p.stock <= 0 ? (
             <span className="bg-black/80 backdrop-blur-md text-white px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider">Épuisé</span>
          ) : (
             <span className="bg-white/90 backdrop-blur-md text-black px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">Nouveau</span>
          )}
        </div>
        
        {/* Fav Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart className={`w-4 h-4 ${favorites.includes(p.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        
        {/* Quick Add Button (Desktop Overlay) */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 hidden md:block">
          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(p); }}
            disabled={p.stock <= 0}
            className="w-full bg-black/90 backdrop-blur-md text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
          >
            Ajout Rapide
          </button>
        </div>
      </div>

      {/* Info Container */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{p.category || 'Standard'}</p>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-1 cursor-pointer hover:underline" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
          </div>
        </div>
        
        {p.variants && p.variants.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mb-1">
            {p.variants.slice(0, 2).map((v, idx) => {
              const val = v.includes(':') ? v.split(':')[1].trim() : v;
              return (
                <span key={idx} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider truncate max-w-[80px]">
                  {val}
                </span>
              );
            })}
            {p.variants.length > 2 && (
              <span className="text-gray-400 text-[10px] font-bold px-1 py-0.5">+{p.variants.length - 2}</span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-1 mb-4 mt-1">
          {[1,2,3,4,5].map(star => (
            <Star key={star} className={`w-3 h-3 ${star === 5 ? 'text-gray-200 fill-gray-200' : 'text-yellow-400 fill-yellow-400'}`} />
          ))}
          <span className="text-xs text-gray-400 font-medium ml-1">(12)</span>
        </div>
        
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
          <div className="flex flex-col">
            <span className="font-black text-gray-900 text-base sm:text-lg">{(p.price_fcfa || 0).toLocaleString('fr-FR')} <span className="text-[10px] sm:text-xs text-gray-500 font-bold">FCFA</span></span>
          </div>
          
          {/* Mobile Add Button */}
          <button 
            onClick={() => addToCart(p)}
            disabled={p.stock <= 0}
            className="md:hidden w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 shadow-md"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
