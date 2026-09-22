import React, { useState, useEffect } from 'react';
import { X, Phone, PartyPopper } from 'lucide-react';
import Icon3D from './Icon3D';
// Removed unused audio imports
import confetti from 'canvas-confetti';

const FortuneWheel = ({ merchantName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [phone, setPhone] = useState('');
  const [prize, setPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState('');

  const prizes = [
    { label: '-5%', color: '#F87171' },
    { label: 'Perdu', color: '#94A3B8' },
    { label: 'LIVRAISON GRATUITE', color: '#34D399' },
    { label: '-10%', color: '#60A5FA' },
    { label: 'Perdu', color: '#94A3B8' },
    { label: 'CADEAU SURPRISE', color: '#A78BFA' },
  ];

  useEffect(() => {
    // Check if already spun in this session
    if (sessionStorage.getItem('samaboutik_wheel_spun')) {
      return;
    }

    // Trigger after 15 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  const handleSpin = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      return;
    }
    setError('');
    setIsSpinning(true);

    // Calculate spin
    const spinDurations = 4000;
    const spins = 5; // 5 full rotations min
    
    // Weighted logic: Let's give them "Livraison Gratuite" (index 2) or "-10%" (index 3) mostly
    const winningIndex = Math.random() > 0.5 ? 2 : 3; 
    
    const segmentAngle = 360 / prizes.length;
    // Calculate exact rotation to land in the middle of the winning segment
    const targetRotation = (spins * 360) + (360 - (winningIndex * segmentAngle)) - (segmentAngle / 2);
    
    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setPrize(prizes[winningIndex].label);
      sessionStorage.setItem('samaboutik_wheel_spun', 'true');
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34D399', '#60A5FA', '#A78BFA']
      });
      
    }, spinDurations);
  };

  const closeWheel = () => {
    setIsOpen(false);
    sessionStorage.setItem('samaboutik_wheel_spun', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-500">
        
        {/* Header / Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-6 text-center text-white relative">
          <button 
            onClick={closeWheel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <Icon3D name="gift" className="w-16 h-16 mx-auto mb-2 drop-shadow-xl" />
          <h2 className="text-2xl font-black">Tentez votre chance !</h2>
          <p className="text-primary-100 text-sm mt-1">Tournez la roue et gagnez un cadeau exclusif chez {merchantName}.</p>
        </div>

        <div className="p-8 text-center overflow-hidden">
          
          {!hasSpun ? (
            <>
              {/* La Roue */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                {/* Flèche pointeur */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 drop-shadow-md"></div>
                
                {/* Cercle de la roue */}
                <div 
                  className="w-full h-full rounded-full border-4 border-slate-800 shadow-xl relative overflow-hidden"
                  style={{
                    transition: 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)',
                    transform: `rotate(${rotation}deg)`
                  }}
                >
                  {prizes.map((p, i) => {
                    const angle = (360 / prizes.length);
                    const rotate = i * angle;
                    return (
                      <div 
                        key={i} 
                        className="absolute w-full h-full top-0 left-0 origin-center"
                        style={{ transform: `rotate(${rotate}deg)` }}
                      >
                        <div 
                          className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] origin-bottom"
                          style={{
                            background: p.color,
                            transform: `rotate(${angle/2}deg) skewX(${90 - angle}deg)`,
                            transformOrigin: 'bottom left'
                          }}
                        ></div>
                        <div 
                           className="absolute top-[15%] left-[50%] -translate-x-1/2 -translate-y-1/2 origin-bottom text-white font-bold text-xs uppercase z-10 drop-shadow-md w-24 text-center"
                           style={{ transform: `rotate(${angle/2}deg)` }}
                        >
                           {p.label}
                        </div>
                      </div>
                    );
                  })}
                  {/* Centre de la roue */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border-4 border-slate-800 z-20 shadow-inner flex items-center justify-center">
                     <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Formulaire pour tourner */}
              <form onSubmit={handleSpin} className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="Votre numéro de téléphone"
                      className="w-full text-base font-bold text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSpinning}
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold mt-1 text-left">{error}</p>}
                </div>
                <button 
                  type="submit"
                  disabled={isSpinning}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 font-black text-lg py-4 rounded-2xl shadow-lg shadow-yellow-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isSpinning ? (
                     <div className="w-6 h-6 border-2 border-yellow-900/30 border-t-yellow-900 rounded-full animate-spin"></div>
                  ) : (
                    "TOURNER LA ROUE"
                  )}
                </button>
              </form>
              <p className="text-[10px] text-gray-400 mt-4">*Une seule participation autorisée.</p>
            </>
          ) : (
            <div className="py-6 animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                 <PartyPopper className="w-10 h-10 text-green-600 relative z-10" />
                 <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
               </div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Félicitations !</h3>
               <p className="text-gray-500 mb-6">Vous avez gagné :</p>
               
               <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-4 mb-6 shadow-xl shadow-emerald-500/20 transform -rotate-2">
                 <p className="text-3xl font-black">{prize}</p>
                 <p className="text-sm opacity-80 mt-1 font-medium">Faites une capture d'écran de ce code !</p>
               </div>

               <button 
                 onClick={closeWheel}
                 className="w-full bg-primary-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:bg-primary-700 transition-colors"
               >
                 Continuer mes achats
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FortuneWheel;
