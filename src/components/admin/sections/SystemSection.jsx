import { motion } from 'framer-motion';
import { MessageCircle, Bot, ShieldCheck, Clock, CircleCheck, CircleX, Hourglass, Send, Sparkles, ImagePlus, Crown, ShieldAlert, Trash2 } from 'lucide-react';
import { StatGrid, StatTile, Panel } from '../AdminKit';
import { rise } from '../../dashboard/ui';
import { fmt } from '../../dashboard/analytics';

const EVENT_LABELS = {
  merchant_new_order: 'Nouvelle commande (boutique)',
  customer_order_confirmed: 'Commande confirmée (client)',
  customer_in_transit: 'Livreur en route (client)',
  customer_delivered: 'Commande livrée (client)',
  customer_cancelled: 'Commande annulée (client)',
};
const SCOPE_LABELS = {
  track: 'Suivi de commande (par numéro)',
  track_ip: 'Suivi de commande (par connexion)',
  driver_login: 'Connexion livreur (par numéro)',
  driver_login_ip: 'Connexion livreur (par connexion)',
  order_ip: 'Commandes passées (par connexion)',
  order_pin: 'Codes de livraison essayés',
  review_ip: 'Avis déposés (par connexion)',
  review_product: 'Avis déposés (par produit)',
};
const ACTION_META = {
  subscription_changed: { label: 'Offre modifiée', icon: Crown, tone: 'bg-amber-50 text-amber-700' },
  merchant_suspended: { label: 'Boutique suspendue', icon: ShieldAlert, tone: 'bg-red-50 text-red-700' },
  merchant_restored: { label: 'Boutique réactivée', icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
  review_deleted: { label: 'Avis supprimé', icon: Trash2, tone: 'bg-slate-100 text-slate-700' },
};
const PLAN_LABELS = { debutant: 'Débutant', pro: 'Pro', premium: 'Premium' };
const dateTime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function auditDetail(entry, merchantName) {
  const d = entry.details || {};
  if (entry.action === 'subscription_changed') {
    const end = d.to_end ? ` jusqu'au ${new Date(d.to_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
    return `${merchantName} : ${PLAN_LABELS[d.from_plan] || d.from_plan || '—'} → ${PLAN_LABELS[d.to_plan] || d.to_plan}${end}`;
  }
  if (entry.action === 'review_deleted') return `${d.customer_name || 'Client'} · ${d.rating} ★ · « ${d.comment || ''} »`;
  return `${merchantName}${d.reason ? ` · ${d.reason}` : ''}`;
}

export default function SystemSection({ health, merchants }) {
  const wa = health?.whatsapp?.by_status || {};
  const waTotal = Object.values(wa).reduce((s, v) => s + Number(v), 0);
  const waOk = waTotal ? Math.round(((Number(wa.sent) || 0) / waTotal) * 100) : null;
  const ai = health?.ai?.by_kind || {};
  const security = health?.security_24h || {};
  const securityTotal = Object.values(security).reduce((s, v) => s + Number(v), 0);
  const audit = health?.audit || [];
  const nameOf = (id) => merchants.find((m) => m.id === id)?.shop_name || 'Boutique';

  return (
    <>
      <StatGrid>
        <StatTile label="Messages WhatsApp (30 j)" value={fmt(waTotal)} sub={waOk == null ? 'aucun envoi' : `${waOk} % envoyés avec succès`} icon={MessageCircle} gradient="emerald" />
        <StatTile label="En échec" value={fmt(Number(wa.failed || 0) + Number(wa.expired || 0))} sub={`${Number(wa.pending || 0) + Number(wa.sending || 0)} en attente`} icon={CircleX} gradient="rose" />
        <StatTile label="Assistant IA (30 j)" value={fmt(Number(ai.product_sheet || 0) + Number(ai.studio_photo || 0))} sub={`${ai.product_sheet || 0} fiches · ${ai.studio_photo || 0} photos studio`} icon={Bot} gradient="violet" />
        <StatTile label="Essais bloqués (24 h)" value={fmt(securityTotal)} sub="limites anti-abus" icon={ShieldCheck} gradient="sky" />
      </StatGrid>

      <motion.div variants={rise} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Notifications WhatsApp (30 derniers jours)" icon={Send}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: 'sent', l: 'Envoyés', icon: CircleCheck, c: 'text-emerald-700 bg-emerald-50' },
              { k: 'pending', l: 'En attente', icon: Hourglass, c: 'text-slate-700 bg-slate-100' },
              { k: 'failed', l: 'Échecs', icon: CircleX, c: 'text-red-700 bg-red-50' },
              { k: 'expired', l: 'Expirés', icon: Clock, c: 'text-amber-800 bg-amber-50' },
            ].map((x) => (
              <div key={x.k} className={`rounded-xl p-3 ${x.c}`}>
                <x.icon className="h-4 w-4" />
                <p className="mt-1 font-figures text-xl font-bold">{fmt(Number(wa[x.k] || 0))}</p>
                <p className="text-xs">{x.l}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Derniers échecs</p>
          {(health?.whatsapp?.recent_failures || []).length === 0 ? (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Aucun échec récent. 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {health.whatsapp.recent_failures.map((f) => (
                <li key={f.id} className="py-2">
                  <p className="font-semibold text-slate-800">{EVENT_LABELS[f.event] || f.event} · <span className="font-normal text-slate-500">{f.shop_name || '—'}</span></p>
                  <p className="text-xs text-red-700">{f.last_error || 'Erreur inconnue'} · {f.attempts} essai{f.attempts > 1 ? 's' : ''}</p>
                  <p className="text-[11px] text-slate-400">{dateTime(f.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Assistant IA (30 derniers jours)" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-800"><Sparkles className="h-4 w-4" /><p className="mt-1 font-figures text-xl font-bold">{fmt(ai.product_sheet || 0)}</p><p className="text-xs">Fiches produit rédigées</p></div>
              <div className="rounded-xl bg-sky-50 p-3 text-sky-800"><ImagePlus className="h-4 w-4" /><p className="mt-1 font-figures text-xl font-bold">{fmt(ai.studio_photo || 0)}</p><p className="text-xs">Photos studio</p></div>
            </div>
            {(health?.ai?.top_shops || []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {health.ai.top_shops.map((t) => <li key={t.shop_name || '—'} className="flex justify-between"><span className="truncate text-slate-700">{t.shop_name || '—'}</span><span className="font-figures font-bold">{t.n}</span></li>)}
              </ul>
            )}
          </Panel>

          <Panel title="Sécurité (24 dernières heures)" icon={ShieldCheck}>
            {securityTotal === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Aucun essai suspect bloqué.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {Object.entries(security).sort((a, b) => b[1] - a[1]).map(([scope, count]) => (
                  <li key={scope} className="flex justify-between gap-3"><span className="text-slate-700">{SCOPE_LABELS[scope] || scope}</span><span className="font-figures font-bold">{count}</span></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </motion.div>

      <motion.div variants={rise}>
        <Panel title="Journal des actions de l'administration" icon={Clock}>
          {audit.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Aucune action pour le moment. Les changements d'offre, suspensions et suppressions d'avis apparaîtront ici.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {audit.map((a) => {
                const meta = ACTION_META[a.action] || { label: a.action, icon: Clock, tone: 'bg-slate-100 text-slate-700' };
                return (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}><meta.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                      <p className="truncate text-xs text-slate-600">{auditDetail(a, nameOf(a.target))}</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-slate-400"><p>{dateTime(a.created_at)}</p><p className="max-w-[140px] truncate">{a.admin_email || ''}</p></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </motion.div>
    </>
  );
}
