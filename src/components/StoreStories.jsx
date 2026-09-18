import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import Icon3D from './Icon3D';

export default function StoreStories({ products = [], onProductClick }) {
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [progress, setProgress] = useState(0);

  // We only take products that have images to make beautiful stories (max 8)
  const storyProducts = products.filter(p => p.image_url).slice(0, 8);

  // Handle story progress automatically
  useEffect(() => {
    let timer;
    if (activeStoryIndex !== null) {
      setProgress(0); // reset progress when story changes
      const duration = 5000; // 5 seconds per story
      const interval = 50; // update every 50ms
      const step = (interval / duration) * 100;

      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Move to next story or close if at the end
            if (activeStoryIndex < storyProducts.length - 1) {
              setActiveStoryIndex(activeStoryIndex + 1);
              return 0;
            } else {
              setActiveStoryIndex(null);
              return 0;
            }
          }
          return prev + step;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [activeStoryIndex, storyProducts.length]);

  const handleNext = (e) => {
    e.stopPropagation();
    if (activeStoryIndex < storyProducts.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    }
  };

  if (storyProducts.length === 0) return null;

  return (
    <>
      {/* Story Bubbles Row */}
      <div className="w-full bg-white/50 backdrop-blur-md pt-6 pb-4 border-b border-gray-100 overflow-x-auto scrollbar-hide sticky top-0 z-40">
        <div className="flex gap-4 px-4 sm:px-6 max-w-7xl mx-auto">
          {storyProducts.map((product, idx) => (
            <div 
              key={product.id} 
              className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
              onClick={() => setActiveStoryIndex(idx)}
            >
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 shadow-md overflow-hidden">
                {/* Anneau rotatif */}
                <div className="spinning-border"></div>
                {/* Conteneur image */}
                <div className="absolute inset-[3px] rounded-full border-2 border-white overflow-hidden bg-white z-10">
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[10px] font-bold text-gray-800 w-20 text-center truncate">
                {product.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen Story Viewer */}
      <AnimatePresence>
        {activeStoryIndex !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-black sm:bg-black/90 sm:p-4 flex items-center justify-center backdrop-blur-lg"
          >
            <div className="w-full h-full sm:max-w-md sm:h-[85vh] sm:rounded-[2.5rem] bg-black relative overflow-hidden flex flex-col shadow-2xl">
              
              {/* Image Background */}
              <img 
                src={storyProducts[activeStoryIndex].image_url}
                alt={storyProducts[activeStoryIndex].name}
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

              {/* Top Progress Bars */}
              <div className="absolute top-0 left-0 w-full px-3 pt-4 flex gap-1.5 z-20">
                {storyProducts.map((_, i) => (
                  <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-white transition-all duration-75"
                      style={{ 
                        width: i === activeStoryIndex ? `${progress}%` : (i < activeStoryIndex ? '100%' : '0%') 
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header Info */}
              <div className="absolute top-8 left-0 w-full px-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <Icon3D name="fire" className="w-6 h-6 drop-shadow-md" />
                  <span className="text-white font-bold text-sm drop-shadow-md">Nouveauté</span>
                </div>
                <button 
                  onClick={() => setActiveStoryIndex(null)}
                  className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Clickable Area for Prev/Next */}
              <div className="absolute inset-0 flex z-10 pt-20 pb-32">
                <div className="w-1/3 h-full" onClick={handlePrev} />
                <div className="w-2/3 h-full" onClick={handleNext} />
              </div>

              {/* Bottom Action Area */}
              <div className="absolute bottom-0 left-0 w-full p-6 z-20 flex flex-col gap-4">
                <div>
                  <h3 className="text-white text-3xl font-black mb-1 line-clamp-2 leading-tight drop-shadow-lg">
                    {storyProducts[activeStoryIndex].name}
                  </h3>
                  <p className="text-white/90 text-xl font-bold drop-shadow-md">
                    {storyProducts[activeStoryIndex].price} FCFA
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    onProductClick(storyProducts[activeStoryIndex]);
                    setActiveStoryIndex(null);
                  }}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  <ShoppingBag className="w-5 h-5" />
                  VOIR L'ARTICLE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
