// Plafond mensuel d'utilisation de l'assistant IA, selon le forfait du commerçant.
// Ces services sont payés par SamaBoutik à l'usage : le plafond protège le budget de la plateforme.
import { supabaseAdmin } from './supabase.js';
import { reportWarning } from './monitoring.js';

export const MONTHLY_LIMITS = {
  product_sheet: { debutant: 30, pro: 300, premium: 1000 }, // fiche produit rédigée par Claude
  studio_photo: { debutant: 10, pro: 100, premium: 300 }, // photo studio Photoroom (environ 0,10 $ chacune)
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

// Forfait en cours (un forfait payant expiré compte comme Débutant).
export async function merchantPlan(merchantId) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('subscription_plan, subscription_status, subscription_end_date')
    .eq('id', merchantId)
    .maybeSingle();
  const plan = data?.subscription_plan;
  const active = data?.subscription_status !== 'expired'
    && (!data?.subscription_end_date || new Date(data.subscription_end_date) > new Date());
  return plan === 'pro' || plan === 'premium' ? (active ? plan : 'debutant') : 'debutant';
}

// { limit, used, remaining } pour ce mois. used vaut null si le compteur n'est pas encore installé
// (paiements_et_ia.sql non exécuté) : on laisse alors passer, la limite horaire du serveur protège.
export async function quotaFor(merchantId, kind) {
  const plan = await merchantPlan(merchantId);
  const limit = MONTHLY_LIMITS[kind][plan];
  const { count, error } = await supabaseAdmin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('kind', kind)
    .gte('created_at', startOfMonth());
  if (error || typeof count !== 'number') {
    reportWarning(`Compteur IA indisponible : ${error?.message || 'sans réponse'}`);
    return { plan, limit, used: null, remaining: limit };
  }
  return { plan, limit, used: count, remaining: Math.max(0, limit - count) };
}

export async function recordUsage(merchantId, kind) {
  const { error } = await supabaseAdmin.from('ai_usage').insert({ merchant_id: merchantId, kind });
  if (error) reportWarning(`Utilisation IA non comptée : ${error.message}`);
}
