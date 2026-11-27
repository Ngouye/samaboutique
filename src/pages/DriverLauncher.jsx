// Page d'ouverture de l'application « Livreur » installée (manifest-livreur.webmanifest → /livreur) :
// renvoie le livreur vers l'espace de sa boutique, retenu sur ce téléphone lors de sa dernière visite.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { LogoMark } from '../components/brand/Logo';

export const DRIVER_SHOP_KEY = 'samaboutik_driver_shop';

export default function DriverLauncher() {
  let shop = '';
  try { shop = localStorage.getItem(DRIVER_SHOP_KEY) || ''; } catch { /* mémoire du navigateur indisponible */ }
  if (shop) return <Navigate to={`/livreur/${encodeURIComponent(shop)}`} replace />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0a24] p-6 text-center text-white">
      <div className="max-w-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/15"><LogoMark className="h-10 w-10" onDark /></span>
        <h1 className="mt-5 text-2xl font-extrabold">Espace livreur</h1>
        <p className="mt-2 text-white/65">Ouvrez une première fois le lien de livreur envoyé par votre boutique. Ensuite, cette application vous y emmènera directement.</p>
      </div>
    </div>
  );
}
