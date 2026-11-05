import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Check, LoaderCircle, CircleAlert, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AuthShell, PasswordField, StrengthMeter, SubmitButton, ErrorBanner, EASE } from '../components/auth/AuthUI';
import { authErrorMessage } from '../utils/authErrors';

// Lien expiré ou invalide : Supabase l'indique dans l'adresse (#error_description=…).
function linkErrorFromUrl() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  return params.get('error_description') || params.get('error') || '';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(() => (linkErrorFromUrl() ? 'invalid' : 'checking')); // checking | ready | invalid | done
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Le lien reçu par email ouvre une session temporaire de récupération.
  useEffect(() => {
    if (linkErrorFromUrl()) return undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setStatus((s) => (s === 'checking' ? 'ready' : s));
    });
    supabase.auth.getSession().then(({ data: current }) => {
      if (current.session) setStatus((s) => (s === 'checking' ? 'ready' : s));
    });
    const timer = setTimeout(() => setStatus((s) => (s === 'checking' ? 'invalid' : s)), 5000);
    return () => {
      data?.subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const passwordError = touched.password && password.length < 8 ? 'Au moins 8 caractères.' : '';
  const confirmError = touched.confirm && confirm !== password ? 'Les deux mots de passe ne correspondent pas.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (password.length < 8 || confirm !== password) return;
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus('done');
      setTimeout(() => navigate('/dashboard'), 1600);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={status === 'invalid' ? 'Lien expiré' : 'Nouveau mot de passe'}
      subtitle={status === 'invalid' ? null : 'Choisissez un mot de passe que vous n\'utilisez pas ailleurs.'}
      headerAction={<Link to="/login" className="font-bold text-emerald-700 hover:underline">Se connecter</Link>}
      photo="/images/landing/boutique-mode.webp"
      photoAlt="Commerçante dans sa boutique"
      side={
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: EASE }} className="max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
          Votre boutique reste protégée.
        </motion.h2>
      }
    >
      {status === 'checking' && (
        <p className="flex items-center gap-2 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Vérification du lien…</p>
      )}

      {status === 'invalid' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] text-amber-900">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Ce lien n'est plus valable : il a déjà servi ou il a expiré. Demandez-en un nouveau depuis la page de connexion.</p>
          </div>
          <Link to="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f17] text-[15px] font-bold text-white hover:bg-emerald-800">
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Link>
        </div>
      )}

      {(status === 'ready' || status === 'done') && (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <ErrorBanner message={error} />
          <ErrorBanner tone="success" message={status === 'done' ? 'Mot de passe modifié. Redirection vers votre tableau de bord…' : ''} />
          <div>
            <PasswordField
              id="new-password" label="Nouveau mot de passe" icon={Lock} autoComplete="new-password" placeholder="8 caractères minimum" required autoFocus
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} error={passwordError}
            />
            {!passwordError && <StrengthMeter password={password} />}
          </div>
          <PasswordField
            id="confirm-password" label="Confirmer le mot de passe" icon={Lock} autoComplete="new-password" placeholder="Retapez le mot de passe" required
            value={confirm} onChange={(e) => setConfirm(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, confirm: true }))} error={confirmError}
          />
          <SubmitButton loading={loading} loadingText="Enregistrement…" success={status === 'done' && <><Check className="h-5 w-5" strokeWidth={3} /> Mot de passe modifié</>}>
            Enregistrer le mot de passe
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
