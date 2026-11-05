import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Mail, Lock, Check, MailCheck, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { AuthShell, Field, PasswordField, SubmitButton, ErrorBanner, Divider, EASE } from '../components/auth/AuthUI';
import { authErrorMessage } from '../utils/authErrors';
import Turnstile, { captchaRequired } from '../components/auth/Turnstile';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function LoginSide() {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: EASE }} className="mb-auto ml-auto mt-2 w-72 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <img src="/logos/whatsapp.svg" alt="" className="h-5 w-5" />
          <span className="text-xs font-bold">Nouvelle commande</span>
          <span className="ml-auto text-[11px] text-slate-400">à l'instant</span>
        </div>
        <p className="text-sm text-slate-600">Fatou D. · 2 articles · <span className="font-bold text-emerald-700">25 000 F</span></p>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: EASE }} className="max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
        Tout votre commerce, au même endroit.
      </motion.h2>
      <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex flex-wrap gap-2.5 text-sm font-semibold">
        {[[Wallet, 'Wave & Orange Money'], [Truck, 'Livraison suivie en direct'], [ShieldCheck, 'Code de livraison sécurisé']].map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 backdrop-blur">
            <Icon className="h-4 w-4 text-emerald-300" /> {label}
          </li>
        ))}
      </motion.ul>
    </>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const captchaMissing = captchaRequired && !captchaToken;

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const emailError = touched.email && !EMAIL_RE.test(email.trim()) ? 'Entrez une adresse email valide.' : '';
  const passwordError = touched.password && !password ? 'Entrez votre mot de passe.' : '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!EMAIL_RE.test(email.trim()) || !password || captchaMissing) return;
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await login(email.trim(), password, captchaToken);
      if (authError) throw authError;
      setSuccess(true);
      navigate('/dashboard');
    } catch (err) {
      setError(authErrorMessage(err));
      setCaptchaKey((k) => k + 1); // un jeton de captcha ne sert qu'une fois
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setTouched({ email: true });
    if (!EMAIL_RE.test(email.trim()) || captchaMissing) return;
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (resetError) throw resetError;
      setMode('sent');
    } catch (err) {
      setError(authErrorMessage(err));
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setTouched({});
    setCaptchaKey((k) => k + 1);
  };

  const titles = {
    login: ['Connexion à votre boutique', 'Heureux de vous revoir. Entrez vos identifiants pour continuer.'],
    forgot: ['Mot de passe oublié', 'Indiquez l\'email de votre compte : nous vous envoyons un lien pour en choisir un nouveau.'],
    sent: ['Vérifiez vos emails', null],
  };

  return (
    <AuthShell
      title={titles[mode][0]}
      subtitle={titles[mode][1]}
      headerAction={<>Pas encore de boutique ? <Link to="/register" className="font-bold text-emerald-700 hover:underline">S'inscrire</Link></>}
      photo="/images/landing/hero-commercante.webp"
      photoAlt="Commerçante qui consulte ses commandes sur son téléphone"
      side={<LoginSide />}
    >
      <AnimatePresence mode="wait">
        {mode === 'login' && (
          <motion.form key="login" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.3 }} className="space-y-5" onSubmit={handleLogin} noValidate>
            <ErrorBanner message={error} />
            <Field
              id="email" type="email" label="Adresse email" icon={Mail} autoComplete="email" inputMode="email" placeholder="vous@exemple.com" required
              value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} error={emailError}
            />
            <PasswordField
              id="password" label="Mot de passe" icon={Lock} autoComplete="current-password" placeholder="Votre mot de passe" required
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, password: true }))} error={passwordError}
              labelAside={<button type="button" onClick={() => switchMode('forgot')} className="text-sm font-semibold text-emerald-700 hover:underline">Mot de passe oublié ?</button>}
            />
            <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />
            <SubmitButton disabled={captchaMissing} loading={loading} loadingText="Connexion…" success={success && <><Check className="h-5 w-5" strokeWidth={3} /> Connecté</>}>
              Se connecter <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SubmitButton>
            <Divider>Nouveau sur SamaBoutik ?</Divider>
            <Link to="/register" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-[15px] font-bold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50">
              Créer une boutique gratuitement
            </Link>
          </motion.form>
        )}

        {mode === 'forgot' && (
          <motion.form key="forgot" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.3 }} className="space-y-5" onSubmit={handleForgot} noValidate>
            <ErrorBanner message={error} />
            <Field
              id="reset-email" type="email" label="Adresse email" icon={Mail} autoComplete="email" inputMode="email" placeholder="vous@exemple.com" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched({ email: true })} error={emailError}
            />
            <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />
            <SubmitButton disabled={captchaMissing} loading={loading} loadingText="Envoi…">Envoyer le lien</SubmitButton>
            <button type="button" onClick={() => switchMode('login')} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </button>
          </motion.form>
        )}

        {mode === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><MailCheck className="h-5 w-5" /></span>
              <p className="text-[15px] leading-relaxed text-emerald-900">
                Si un compte existe pour <span className="font-bold">{email.trim()}</span>, vous allez recevoir un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les spams.
              </p>
            </div>
            <button type="button" onClick={() => switchMode('login')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-[15px] font-bold text-slate-800 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
