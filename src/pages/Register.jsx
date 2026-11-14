import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, ArrowRight, Mail, Lock, Phone, Check, MapPin, LocateFixed, LoaderCircle, Globe, MailCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPosition } from '../utils/geolocation';
import { authErrorMessage } from '../utils/authErrors';
import Turnstile, { captchaRequired } from '../components/auth/Turnstile';
import { AuthShell, HeaderLink, Field, PasswordField, StrengthMeter, SubmitButton, ErrorBanner, EASE } from '../components/auth/AuthUI';
import { isThemeId, PENDING_THEME_KEY } from '../components/shop/themes';
import { BRAND } from '../utils/brand';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Numéro sénégalais : on garde les 9 chiffres (77 123 45 67), sans l'indicatif collé devant.
function localDigits(value) {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('00221')) digits = digits.slice(5);
  else if (digits.startsWith('221') && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
}
const formatPhone = (d) => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
const phoneIsValid = (d) => /^[37]\d{8}$/.test(d);

function RegisterSide({ shopName, phoneDigits }) {
  const name = shopName.trim() || 'Votre boutique';
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: EASE }} className="mb-auto ml-auto mt-2 w-80 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <Globe className="h-3.5 w-3.5 text-brand-600" />
          <span className="truncate">{window.location.host}/boutique/<span className="font-semibold text-slate-800">{name}</span></span>
        </div>
        <div className="flex items-center gap-3 p-4">
          <motion.span key={name.charAt(0)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-xl font-extrabold text-white">
            {name.charAt(0).toUpperCase()}
          </motion.span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{name}</p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {phoneDigits ? `+221 ${formatPhone(phoneDigits)}` : 'Boutique en ligne'}
            </p>
          </div>
        </div>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: EASE }} className="max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
        Votre vitrine en ligne, en quelques minutes.
      </motion.h2>
      <ul className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-[15px] text-white/85">
        {["Jusqu'à 10 produits gratuits", 'Wave, Orange Money, livraison', 'Alertes WhatsApp', 'Suivi des livraisons'].map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400 text-night"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
            {t}
          </motion.li>
        ))}
      </ul>
    </>
  );
}

function SectionTitle({ step, children }) {
  return (
    <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] text-slate-600">{step}</span>
      {children}
    </p>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  // Nom et thème choisis dans la démonstration de la page d'accueil (?boutique=…&theme=…)
  const [shopName, setShopName] = useState(() => (new URLSearchParams(window.location.search).get('boutique') || '').slice(0, 60));
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [listInDirectory, setListInDirectory] = useState(true);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);

  const errors = {
    shopName: shopName.trim().length < 2 ? 'Donnez un nom à votre boutique (2 caractères minimum).' : '',
    phone: !phoneIsValid(phoneDigits) ? 'Numéro à 9 chiffres, par exemple 77 123 45 67.' : '',
    email: !EMAIL_RE.test(email.trim()) ? 'Entrez une adresse email valide.' : '',
    password: password.length < 8 ? 'Au moins 8 caractères.' : '',
  };
  const show = (field) => (touched[field] ? errors[field] : '');
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const captureLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      setLocation(await getCurrentPosition());
    } catch (err) {
      setLocationError(err.reason === 'denied'
        ? 'Autorisation refusée. Vous pourrez localiser votre boutique plus tard depuis vos paramètres.'
        : err.message);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ shopName: true, phone: true, email: true, password: true });
    if (Object.values(errors).some(Boolean) || (captchaRequired && !captchaToken)) return;
    setError('');
    setLoading(true);
    try {
      const chosenTheme = new URLSearchParams(window.location.search).get('theme');
      if (isThemeId(chosenTheme)) {
        try { localStorage.setItem(PENDING_THEME_KEY, chosenTheme); } catch { /* stockage indisponible */ }
      }
      const data = await register(email.trim(), password, shopName.trim(), `+221${phoneDigits}`, location ? { ...location, public: listInDirectory } : null, captchaToken);
      // Confirmation par email activée dans Supabase : pas encore de session.
      if (!data?.session) {
        setNeedsConfirmation(true);
        return;
      }
      setSuccess(true);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 }, colors: [BRAND.signature, BRAND.ink, BRAND.gold, '#ffffff'] });
      const plan = new URLSearchParams(window.location.search).get('plan');
      setTimeout(() => navigate(plan === 'pro' || plan === 'premium' ? `/dashboard?checkout=${plan}` : '/dashboard'), 1400);
    } catch (err) {
      setError(authErrorMessage(err));
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créez votre boutique"
      subtitle="Gratuit pour démarrer, sans carte bancaire. Vous pourrez tout modifier plus tard."
      headerAction={<HeaderLink prompt="Déjà inscrit ?" to="/login">Se connecter</HeaderLink>}
      photo="/images/landing/colis-commande.webp"
      photoAlt="Commerçante qui prépare ses colis"
      side={<RegisterSide shopName={shopName} phoneDigits={phoneDigits} />}
    >
      {needsConfirmation ? (
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><MailCheck className="h-5 w-5" /></span>
            <p className="text-[15px] leading-relaxed text-brand-900">
              Votre boutique <span className="font-bold">{shopName.trim()}</span> est créée. Cliquez sur le lien envoyé à <span className="font-bold">{email.trim()}</span> pour activer votre compte, puis connectez-vous.
            </p>
          </div>
          <Link to="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-bold text-white hover:bg-brand-800">
            Aller à la connexion <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
      <form className="space-y-8" onSubmit={handleSubmit} noValidate>
        <ErrorBanner message={error} />

        <section className="space-y-5">
          <SectionTitle step="1">Votre boutique</SectionTitle>
          <Field
            id="shopName" label="Nom de la boutique" icon={Store} placeholder="Ex : Chez Awa Mode" required maxLength={60} autoComplete="organization"
            value={shopName} onChange={(e) => setShopName(e.target.value)} onBlur={blur('shopName')} error={show('shopName')}
            hint={shopName.trim() ? `Adresse de votre vitrine : ${window.location.host}/boutique/${shopName.trim()}` : 'Le nom affiché à vos clients.'}
          />
          <Field
            id="phone" type="tel" inputMode="numeric" label="Numéro WhatsApp" icon={Phone} prefix="+221" placeholder="77 123 45 67" required autoComplete="tel-national"
            value={formatPhone(phoneDigits)} onChange={(e) => setPhoneDigits(localDigits(e.target.value))} onBlur={blur('phone')} error={show('phone')}
            hint="Vous y recevrez vos commandes ; vos clients pourront vous écrire."
          />

          <div className={`rounded-xl border p-4 transition-colors ${location ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${location ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                <MapPin className="h-5 w-5" />
              </span>
              {/* Téléphone : le bouton passe sous le texte, qui garde toute la largeur */}
              <div className="min-w-0 flex-1 sm:flex sm:items-start sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{location ? 'Boutique localisée' : 'Localiser la boutique'} <span className="font-normal text-slate-400">· facultatif</span></p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {location ? `Précision ± ${Math.round(location.accuracy)} m. Modifiable dans vos paramètres.` : 'Depuis votre boutique, pour apparaître sur la carte « Boutiques près de moi ».'}
                  </p>
                </div>
                {location ? (
                  <button type="button" onClick={() => setLocation(null)} className="mt-2 text-sm font-semibold text-slate-500 hover:text-slate-800 sm:mt-0">Retirer</button>
                ) : (
                  <button type="button" onClick={captureLocation} disabled={locating} className="mt-3 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:mt-0">
                    {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} {locating ? 'Recherche…' : 'Localiser'}
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {location && (
                <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex cursor-pointer items-start gap-3 overflow-hidden border-t border-brand-200/70 pt-3 text-sm text-slate-600">
                  <input type="checkbox" checked={listInDirectory} onChange={(e) => setListInDirectory(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-700" />
                  <span><span className="font-semibold text-slate-900">Afficher ma boutique dans l'annuaire public.</span> Votre numéro n'y apparaît pas.</span>
                </motion.label>
              )}
            </AnimatePresence>
            {locationError && <p className="mt-2 text-sm font-medium text-rose-600">{locationError}</p>}
          </div>
        </section>

        <section className="space-y-5">
          <SectionTitle step="2">Votre compte</SectionTitle>
          <Field
            id="email" type="email" inputMode="email" label="Adresse email" icon={Mail} placeholder="vous@exemple.com" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} onBlur={blur('email')} error={show('email')}
          />
          <div>
            <PasswordField
              id="password" label="Mot de passe" icon={Lock} placeholder="8 caractères minimum" required minLength={8} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={blur('password')} error={show('password')}
            />
            {!show('password') && <StrengthMeter password={password} />}
          </div>
        </section>

        <div className="space-y-4">
          <Turnstile onToken={setCaptchaToken} resetKey={captchaKey} />
          <SubmitButton disabled={captchaRequired && !captchaToken} loading={loading} loadingText="Création de votre boutique…" success={success && <><Check className="h-5 w-5" strokeWidth={3} /> Boutique créée</>}>
            Créer ma boutique <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SubmitButton>
          <p className="text-center text-xs leading-relaxed text-slate-400">Vous pourrez ajouter vos produits, votre logo et vos zones de livraison juste après.</p>
        </div>
      </form>
      )}
    </AuthShell>
  );
}
