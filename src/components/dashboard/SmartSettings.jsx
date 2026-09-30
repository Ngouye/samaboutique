import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Store, Users, CircleCheck, Clock, CircleX, Hourglass, Globe } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { SectionCard, Toggle } from './ui';
import { timeAgo } from './status';

const EVENT_LABELS = {
  merchant_new_order: { label: 'Nouvelle commande', to: 'Vous' },
  customer_order_confirmed: { label: 'Commande confirmée + code', to: 'Client' },
  customer_in_transit: { label: 'Livreur en route', to: 'Client' },
  customer_delivered: { label: 'Commande livrée', to: 'Client' },
  customer_cancelled: { label: 'Commande annulée', to: 'Client' },
};

const STATUS = {
  sent: { label: 'Envoyé', icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pending: { label: 'En attente', icon: Clock, cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
  sending: { label: 'Envoi…', icon: Clock, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  failed: { label: 'Échec', icon: CircleX, cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  expired: { label: 'Expiré', icon: Hourglass, cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

function SettingRow({ icon: Icon, title, text, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70 ${disabled ? 'opacity-60' : ''}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/70">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
      <Toggle checked={checked} onChange={disabled ? () => {} : onChange} label={title} />
    </div>
  );
}

// Réglage enregistré immédiatement dans la fiche du marchand.
function useMerchantSetting(merchant, userId, column, showToast, messages) {
  const [value, setValue] = useState(merchant?.[column] !== false);
  useEffect(() => {
    setValue(merchant?.[column] !== false);
  }, [merchant, column]);
  const update = async (next) => {
    setValue(next);
    const { error } = await supabase.from('merchants').update({ [column]: next }).eq('id', userId);
    if (error) {
      setValue(!next);
      showToast(/column/.test(error.message) ? 'Fonction pas encore installée (new_features.sql).' : 'Enregistrement impossible. Réessayez.');
    } else {
      showToast(next ? messages.on : messages.off);
    }
  };
  return [value, update];
}

export function WhatsAppSettingsCard({ merchant, userId, showToast }) {
  const [notifyMe, setNotifyMe] = useMerchantSetting(merchant, userId, 'whatsapp_notify_merchant', showToast, { on: 'Vous serez prévenu sur WhatsApp à chaque commande.', off: 'Alertes WhatsApp désactivées pour vous.' });
  const [notifyCustomers, setNotifyCustomers] = useMerchantSetting(merchant, userId, 'whatsapp_notify_customers', showToast, { on: 'Vos clients recevront le suivi sur WhatsApp.', off: 'Messages clients désactivés.' });
  const [log, setLog] = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('notification_outbox')
      .select('id, event, status, created_at, last_error')
      .eq('merchant_id', userId)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data, error }) => setLog(error ? [] : data || []));
  }, [userId]);

  return (
    <SectionCard icon={MessageCircle} gradient="emerald" title="Notifications WhatsApp" subtitle="Messages envoyés automatiquement, sans rien faire">
      <div className="space-y-3">
        <SettingRow icon={Store} title="M'alerter à chaque commande" text={`Sur votre numéro ${merchant?.phone_number || ''}, avec le détail et l'adresse`} checked={notifyMe} onChange={setNotifyMe} />
        <SettingRow icon={Users} title="Tenir mes clients informés" text="Confirmation et code de livraison, livreur en route, commande livrée" checked={notifyCustomers} onChange={setNotifyCustomers} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Derniers messages</p>
        {log === null ? (
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ) : log.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Aucun message pour l'instant : ils apparaîtront ici dès votre prochaine commande.</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200/70">
            {log.map((n, i) => {
              const meta = EVENT_LABELS[n.event] || { label: n.event, to: '' };
              const st = STATUS[n.status] || STATUS.pending;
              return (
                <motion.li key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 bg-white px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800">{meta.label}</span>
                    <span className="ml-2 text-xs text-slate-400">{meta.to} · {timeAgo(n.created_at)}</span>
                  </span>
                  <span title={n.last_error || ''} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${st.cls}`}>
                    <st.icon className="h-3 w-3" /> {st.label}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

// Inscription à l'annuaire public « Boutiques près de moi ».
export function DirectoryToggle({ location, onChange, showToast }) {
  const [saving, setSaving] = useState(false);
  const update = async (next) => {
    setSaving(true);
    const { data, error } = await supabase.rpc('set_directory_visibility', { p_public: next });
    setSaving(false);
    if (error || data?.ok === false) {
      showToast(error ? 'Fonction pas encore installée (new_features.sql).' : data.error);
      return;
    }
    onChange({ ...location, is_public: next });
    showToast(next ? 'Votre boutique apparaît dans l\'annuaire SamaBoutik !' : 'Boutique retirée de l\'annuaire.');
  };
  return (
    <div className="mt-5">
      <SettingRow
        icon={Globe}
        title="Apparaître dans « Boutiques près de moi »"
        text="Les clients du quartier voient votre boutique sur la carte publique SamaBoutik (sans votre numéro)"
        checked={!!location?.is_public}
        onChange={update}
        disabled={saving}
      />
      {location?.is_public && (
        <a href="/boutiques" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-emerald-700 underline underline-offset-2">Voir l'annuaire →</a>
      )}
    </div>
  );
}
