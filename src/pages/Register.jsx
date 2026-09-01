import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playPop } from '../utils/audio';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await register(email, password, shopName, phoneNumber);
      
      // Ultra-premium effects!
      playSuccess();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#EC4899', '#8B5CF6']
      });
      
      setTimeout(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const plan = searchParams.get('plan');
        if (plan === 'pro' || plan === 'premium') {
          navigate(`/dashboard?checkout=${plan}`);
        } else {
          navigate('/dashboard');
        }
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Échec de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-mesh">
      {/* Background Decoratives (Aurora) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-1"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-aurora-2"></div>
      <div className="absolute top-[40%] left-[20%] w-[20%] h-[30%] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none animate-aurora-1" style={{animationDelay: '2s'}}></div>

      <div className="flex-1 flex items-center justify-center p-6 z-10 py-12">
        <div className="w-full max-w-md glass rounded-3xl p-10 relative">
          
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="h-20 w-20 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform mb-4">
              <img src="/logo.jpg" alt="SamaBoutik Logo" className="w-full h-full object-cover mix-blend-multiply" />
            </Link>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center">
              Lancer votre boutique
            </h2>
            <p className="mt-3 text-sm text-gray-500 text-center">
              Rejoignez <span className="text-[#4F46E5] font-bold">SamaBoutik</span> et vendez en 2 minutes.
            </p>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-50/80 backdrop-blur-sm p-4 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="shopName" className="block text-sm font-semibold text-gray-700 mb-1.5">Nom de la boutique</label>
              <input
                id="shopName"
                type="text"
                required
                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Ex: Mon Super Store"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">Numéro de téléphone (WhatsApp)</label>
              <input
                id="phone"
                type="tel"
                required
                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+221 77 000 00 00"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse Email</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength="6"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={playPop}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent rounded-[1.25rem] text-sm font-bold text-white bg-gradient-to-r from-[#4F46E5] to-[#EC4899] hover:from-[#4338CA] hover:to-[#DB2777] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-xl shadow-indigo-500/30 overflow-hidden animate-shine transform transition-transform active:scale-[0.98]"
            >
              {loading ? 'Création en cours...' : (
                <>
                  Créer ma boutique
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-bold text-[#4F46E5] hover:text-[#4338CA] hover:underline transition-colors">
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
