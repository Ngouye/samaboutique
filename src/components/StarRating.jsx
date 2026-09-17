import React from 'react';
import { Star, StarHalf } from 'lucide-react';

export const StarRating = ({ rating = 0, size = 16, interactive = false, onRate = () => {} }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = rating >= star - 0.5 && rating < star;
        const isEmpty = !isFull && !isHalf;
        
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            {isFull ? (
              <Star className="text-yellow-400 fill-yellow-400" size={size} />
            ) : isHalf ? (
              <StarHalf className="text-yellow-400 fill-yellow-400" size={size} />
            ) : (
              <Star className="text-gray-300" size={size} />
            )}
          </button>
        );
      })}
    </div>
  );
};
