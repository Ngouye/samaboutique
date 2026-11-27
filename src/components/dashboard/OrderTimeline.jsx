// Historique d'une commande (journal de livraisons_suivi.sql) : passée, payée, acceptée, prise par un livreur,
// problème signalé, rendue, livrée, annulée. Rien ne s'affiche tant que le script n'est pas installé.
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Bike, CircleCheck, CircleX, Clock, CreditCard, ShoppingBag, Store, TriangleAlert, History } from './icons';

const STYLE = {
  created: { icon: ShoppingBag, tone: 'bg-stone-100 text-stone-600' },
  payment: { icon: CreditCard, tone: 'bg-emerald-50 text-emerald-700' },
  status: { icon: Store, tone: 'bg-sky-50 text-sky-700' },
  driver_taken: { icon: Bike, tone: 'bg-violet-50 text-violet-700' },
  driver_released: { icon: Clock, tone: 'bg-amber-50 text-amber-700' },
  driver_issue: { icon: TriangleAlert, tone: 'bg-red-50 text-red-700' },
  delivered: { icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
};

const timeLabel = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function OrderTimeline({ orderId, refreshKey }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('order_events')
      .select('id, kind, status, actor, actor_name, message, created_at')
      .eq('order_id', orderId)
      .order('id', { ascending: true })
      .then(({ data, error }) => { if (alive) setEvents(error ? [] : data || []); });
    return () => { alive = false; };
  }, [orderId, refreshKey]);

  if (!events?.length) return null;
  return (
    <div className="mt-3 border-t border-dashed border-stone-300 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-500"><History className="h-3.5 w-3.5" /> Historique</p>
      <ol className="space-y-2">
        {events.map((e) => {
          const { icon: Icon, tone } = STYLE[e.kind] || (e.status === 'CANCELLED' ? { icon: CircleX, tone: 'bg-slate-100 text-slate-600' } : STYLE.status);
          return (
            <li key={e.id} className="flex items-start gap-2.5">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${e.kind === 'driver_issue' ? 'font-bold text-red-700' : 'font-medium text-ink'}`}>
                  {e.kind === 'driver_issue' ? `Problème signalé par ${e.actor_name} : ` : ''}{e.message}
                </p>
                <p className="text-xs text-stone-400">{timeLabel(e.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
