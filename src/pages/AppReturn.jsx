// Page de retour après un paiement fait depuis l'application mobile : elle rouvre l'application SamaBoutik.
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';
import { appReturnStatus, appReturnTarget } from '../utils/appReturn';

export default function AppReturn() {
  const { search } = useLocation();
  const target = appReturnTarget(search);
  const cancelled = appReturnStatus(search) === 'annule';

  useEffect(() => {
    document.title = 'Retour à l’application · SamaBoutik';
    if (target) window.location.replace(target);
  }, [target]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-xl shadow-ink/5 ring-1 ring-black/5">
        <LogoMark className="mx-auto h-14 w-14" />
        {target ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{cancelled ? 'Paiement annulé' : 'Paiement terminé'}</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              {cancelled ? 'Aucun montant n’a été prélevé. ' : 'Merci ! '}Retour à l’application SamaBoutik…
            </p>
            <a href={target} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-brand-700 py-4 font-bold text-white shadow-lg shadow-brand-700/25 transition-colors hover:bg-brand-800">
              Ouvrir l’application
            </a>
            <p className="mt-4 text-xs leading-relaxed text-stone-400">Si l’application ne s’ouvre pas, fermez simplement cette page : votre commande vous attend dans l’application.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Lien invalide</h1>
            <p className="mt-2 text-sm text-stone-500">Ce lien de retour n’est pas valide.</p>
            <Link to="/" className="mt-6 inline-flex rounded-2xl bg-ink px-6 py-3 font-bold text-white">Aller sur SamaBoutik</Link>
          </>
        )}
      </div>
    </main>
  );
}
