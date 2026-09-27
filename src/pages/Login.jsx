import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Mail, Lock, Bell, CircleCheck, TrendingUp, Check, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthShell, Field, PasswordField, SubmitButton, ErrorBanner, FloatingCard, EASE } from '../components/auth/AuthUI';

function LoginShowcase() {
  return (
    <div className="max-w-md">
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
        Votre boutique <span className="text-shimmer">vous attend.</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-lg text-white/70">
        Commandes, livraisons et paiements : tout est en temps réel dans votre tableau de bord.
      </motion.p>
      <div className="relative mt-10 h-64">
        <FloatingCard delay={0.5} className="absolute left-0 top-0 w-64">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15">
              <Bell className="h-5 w-5 text-emerald-300" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="text-xs text-white/50">Nouvelle commande</p>
              <p className="font-extrabold">+ 43 500 FCFA</p>
            </div>
          </div>
        </FloatingCard>
        <FloatingCard delay={0.8} float={14} duration={7} className="absolute right-0 top-20 w-56">
          <div className="flex items-center gap-3">
            <CircleCheck className="h-9 w-9 text-sky-300" />
            <div>
              <p className="text-xs text-white/50">Paiement reçu</p>
              <p className="text-sm font-bold">via Wave</p>
            </div>
          </div>
        </FloatingCard>
        <FloatingCard delay={1.1} float={8} duration={5} className="absolute bottom-0 left-12 w-60">
          <p className="mb-2 flex items-center gap-1.5 text-xs text-white/50"><TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> Ventes de la semaine</p>
          <div className="flex h-12 items-end gap-1.5">
            {[35, 55, 40, 70, 60, 85, 100].map((h, i) => (
              <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1.4 + i * 0.08, duration: 0.8, ease: EASE }} className="w-4 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-300" />
            ))}
          </div>
        </FloatingCard>
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const { error: authError } = await login(email, password);
      if (authError) throw authError;
      setSuccess(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : (err.message || 'Échec de la connexion'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      side={<LoginShowcase />}
      badge={<><Store className="h-3.5 w-3.5" /> Espace marchand</>}
      title="Content de vous revoir"
      subtitle="Connectez-vous pour gérer votre boutique SamaBoutik."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorBanner message={error} />
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, ease: EASE, duration: 0.6 }}>
          <Field id="email" type="email" label="Adresse email" icon={Mail} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, ease: EASE, duration: 0.6 }}>
          <PasswordField id="password" label="Mot de passe" icon={Lock} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-2">
          <SubmitButton loading={loading} loadingText="Connexion..." success={success && <><Check className="h-5 w-5" strokeWidth={3} /> Bienvenue !</>}>
            Se connecter <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </SubmitButton>
        </motion.div>
      </form>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8">
        <div className="relative my-6 flex items-center">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Nouveau ici ?</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <Link to="/register" className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 py-3.5 font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700">
          Créer ma boutique gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </AuthShell>
  );
}
