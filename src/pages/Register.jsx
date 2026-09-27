import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, ArrowRight, Mail, Lock, Phone, Check, Sparkles, ShoppingBag, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess, playPop } from '../utils/audio';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthShell, Field, PasswordField, StrengthMeter, SubmitButton, ErrorBanner, EASE } from '../components/auth/AuthUI';

// Aperçu en direct de la boutique pendant la saisie.
function ShopPreview({ shopName, phoneNumber, email, password }) {
  const steps = [
    { label: 'Boutique nommée', done: shopName.trim().length > 1 },
    { label: 'Contact WhatsApp', done: phoneNumber.replace(/\D/g, '').length >= 8 },
    { label: 'Compte sécurisé', done: /\S+@\S+\.\S+/.test(email) && password.length >= 6 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const name = shopName.trim() || 'Votre boutique';

  return (
    <div className="max-w-md">
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
        Votre vitrine prend vie <span className="text-shimmer">en direct.</span>
      </motion.h2>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: EASE }} className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-mono text-xs text-white/60">
          <Globe className="h-3.5 w-3.5 text-emerald-300" />
          <span className="truncate">samaboutik.sn/boutique/<span className="text-emerald-300">{encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}</span></span>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5">
          <div className="flex items-center gap-3">
            <motion.span key={name.charAt(0)} initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-extrabold text-emerald-700 shadow-lg">
              {name.charAt(0).toUpperCase()}
            </motion.span>
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.p key={name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="truncate text-xl font-extrabold">{name}</motion.p>
              </AnimatePresence>
              <p className="text-xs text-emerald-100/80">{phoneNumber || 'Votre numéro WhatsApp'}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-white/5 p-2">
              <div className="flex aspect-square items-center justify-center rounded-lg bg-white/10"><ShoppingBag className="h-5 w-5 text-white/30" /></div>
              <div className="mt-2 h-1.5 w-3/4 rounded bg-white/15" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-emerald-400/40" />
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-6 space-y-2.5">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <motion.span
              animate={{ scale: s.done ? [1, 1.3, 1] : 1, backgroundColor: s.done ? 'rgb(52 211 153)' : 'rgba(255,255,255,0.08)' }}
              transition={{ duration: 0.4 }}
              className="flex h-7 w-7 items-center justify-center rounded-full"
            >
              {s.done && <Check className="h-4 w-4 text-[#030a07]" strokeWidth={3} />}
            </motion.span>
            <span className={`font-semibold transition-colors ${s.done ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
          </div>
        ))}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div animate={{ width: `${(doneCount / steps.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" />
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await register(email, password, shopName, phoneNumber);

      setSuccess(true);
      playSuccess();
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#2dd4bf', '#fbbf24', '#ffffff']
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

  const fields = [
    <Field key="shop" id="shopName" label="Nom de la boutique" icon={Store} required value={shopName} onChange={(e) => setShopName(e.target.value)} />,
    <Field key="phone" id="phone" type="tel" label="Téléphone (WhatsApp)" icon={Phone} autoComplete="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />,
    <Field key="email" id="email" type="email" label="Adresse email" icon={Mail} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />,
    <div key="pw">
      <PasswordField id="password" label="Mot de passe (6 caractères min.)" icon={Lock} autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <StrengthMeter password={password} />
    </div>,
  ];

  return (
    <AuthShell
      side={<ShopPreview shopName={shopName} phoneNumber={phoneNumber} email={email} password={password} />}
      badge={<><Sparkles className="h-3.5 w-3.5" /> Gratuit pour démarrer</>}
      title="Lancez votre boutique"
      subtitle="Rejoignez SamaBoutik et commencez à vendre en 2 minutes."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorBanner message={error} />
        {fields.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08, ease: EASE, duration: 0.6 }}>
            {f}
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-2">
          <SubmitButton onMouseEnter={playPop} loading={loading} loadingText="Création en cours..." success={success && <><Check className="h-5 w-5" strokeWidth={3} /> Boutique créée !</>}>
            Créer ma boutique <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </SubmitButton>
        </motion.div>
      </form>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 text-center text-sm text-slate-500">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">Connectez-vous</Link>
      </motion.p>
    </AuthShell>
  );
}
