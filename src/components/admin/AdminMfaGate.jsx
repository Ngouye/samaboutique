import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Smartphone, LoaderCircle, KeyRound, LogOut, Copy, Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorBanner, SubmitButton, EASE } from '../auth/AuthUI';

// Double authentification obligatoire pour l'espace administrateur.
// La base refuse les données admin tant que la session n'est pas validée par un code (niveau « aal2 »).
export default function AdminMfaGate({ children }) {
  const { logout } = useAuth();
  const [step, setStep] = useState('loading'); // loading | enroll | verify | ok | error
  const [factorId, setFactorId] = useState(null);
  const [enrollment, setEnrollment] = useState(null); // { qr, secret }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        setError("Impossible de vérifier la sécurité de la session. Rechargez la page.");
        setStep('error');
        return;
      }
      if (data.currentLevel === 'aal2') {
        setStep('ok');
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.[0];
      if (verified) {
        setFactorId(verified.id);
        setStep('verify');
      } else {
        setStep('enroll');
      }
    })();
  }, []);

  useEffect(() => {
    if (step === 'verify' || enrollment) setTimeout(() => inputRef.current?.focus(), 150);
  }, [step, enrollment]);

  const startEnrollment = async () => {
    setBusy(true);
    setError('');
    try {
      // Un enrôlement commencé puis abandonné bloquerait le suivant : on le retire d'abord.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all || []) {
        if (factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `SamaBoutik admin ${new Date().toLocaleDateString('fr-FR')}` });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setEnrollment({ qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      setError(/disabled|not enabled/i.test(err.message || '')
        ? 'La double authentification est désactivée dans Supabase (Authentication → Multi-Factor). Activez « TOTP ».'
        : err.message || "Impossible de préparer la double authentification.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Entrez les 6 chiffres affichés par votre application.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (verifyError) {
      setCode('');
      setError('Code incorrect ou expiré. Utilisez le code actuellement affiché.');
      return;
    }
    setStep('ok');
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  };

  if (step === 'ok') return children;

  return (
    <div className="font-jakarta flex min-h-screen items-center justify-center bg-[#fbfaf7] px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="w-full max-w-[440px] rounded-[1.75rem] bg-white p-7 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.45)] ring-1 ring-black/5 sm:p-9">
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f17] text-emerald-300">
          <ShieldCheck className="h-6 w-6" />
        </span>

        {step === 'loading' && (
          <p className="flex items-center gap-2 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Vérification de la sécurité…</p>
        )}

        {step === 'error' && <ErrorBanner message={error} />}

        {step === 'verify' && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1f17]">Code de sécurité</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">Ouvrez votre application d'authentification et saisissez le code à 6 chiffres de SamaBoutik.</p>
            <CodeForm inputRef={inputRef} code={code} setCode={setCode} onSubmit={verify} busy={busy} error={error} label="Valider" />
          </>
        )}

        {step === 'enroll' && !enrollment && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1f17]">Protégez l'espace administrateur</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              En plus du mot de passe, un code à 6 chiffres généré sur votre téléphone sera demandé. Même si quelqu'un découvre votre mot de passe, il ne pourra pas entrer.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-slate-700">
              <li className="flex gap-3"><Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> <span>Installez <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b> (gratuits).</span></li>
              <li className="flex gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> <span>Scannez le QR code affiché à l'étape suivante.</span></li>
            </ul>
            <div className="mt-7 space-y-4">
              <ErrorBanner message={error} />
              <button type="button" onClick={startEnrollment} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b1f17] text-[15px] font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 'Configurer maintenant'}
              </button>
            </div>
          </>
        )}

        {step === 'enroll' && enrollment && (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0b1f17]">Scannez ce QR code</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">Dans l'application d'authentification, touchez « + » puis « Scanner un QR code ».</p>
            <div className="mt-6 flex justify-center rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <img src={enrollment.qr} alt="QR code de double authentification" className="h-44 w-44" />
            </div>
            <button type="button" onClick={copySecret} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-50">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              Impossible de scanner ? Clé : <span className="font-mono font-semibold text-slate-800">{enrollment.secret}</span>
            </button>
            <CodeForm inputRef={inputRef} code={code} setCode={setCode} onSubmit={verify} busy={busy} error={error} label="Activer la double authentification" />
          </>
        )}

        <button type="button" onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </motion.div>
    </div>
  );
}

function CodeForm({ inputRef, code, setCode, onSubmit, busy, error, label }) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <ErrorBanner message={error} />
      <div>
        <label htmlFor="mfa-code" className="mb-1.5 block text-sm font-semibold text-slate-800">Code à 6 chiffres</label>
        <input
          ref={inputRef}
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="h-14 w-full rounded-xl border border-slate-300 bg-white text-center font-mono text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
        />
      </div>
      <SubmitButton loading={busy} loadingText="Vérification…">{label}</SubmitButton>
    </form>
  );
}
