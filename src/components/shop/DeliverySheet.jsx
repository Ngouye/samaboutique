// Zones et tarifs de livraison de la boutique, du moins cher au plus cher.
import React from 'react';
import ShopSheet from './ShopSheet';
import { Truck, MapPin, ShieldCheck, Smartphone } from '../dashboard/icons';

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-FR');

export default function DeliverySheet({ zones, onClose }) {
  const sorted = [...zones].sort((a, b) => (a.price || 0) - (b.price || 0));
  return (
    <ShopSheet title="Livraison" icon={Truck} onClose={onClose}>
      <p className="sh-muted mb-4 text-sm">{sorted.length} zone{sorted.length > 1 ? 's' : ''} desservie{sorted.length > 1 ? 's' : ''}. Les frais s’ajoutent au total de la commande.</p>
      <ul className="space-y-2">
        {sorted.map((z) => (
          <li key={z.id || z.name} className="sh-fill sh-r-md flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <MapPin className="theme-text h-4 w-4 shrink-0" />
              <span className="sh-ink text-sm font-semibold">{z.name}</span>
            </span>
            <span className="sh-ink shrink-0 text-sm font-extrabold">{fmt(z.price)} F</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-2.5 text-sm">
        <p className="sh-muted flex items-start gap-2.5"><ShieldCheck className="theme-text mt-0.5 h-4 w-4 shrink-0" /> Votre colis n’est remis qu’avec votre code secret à 4 chiffres.</p>
        <p className="sh-muted flex items-start gap-2.5"><Smartphone className="theme-text mt-0.5 h-4 w-4 shrink-0" /> Payez à la livraison, ou par Wave, Orange Money, Free Money ou Wizall.</p>
      </div>
    </ShopSheet>
  );
}
