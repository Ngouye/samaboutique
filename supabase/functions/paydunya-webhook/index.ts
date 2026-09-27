import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

// Webhook PayDunya pour les abonnements SaaS : c'est le SEUL endroit qui active un forfait.
// À déployer sans vérification JWT (PayDunya n'envoie pas de jeton Supabase) :
//   supabase functions deploy paydunya-webhook --no-verify-jwt

const PAYDUNYA_MASTER_KEY = Deno.env.get('PAYDUNYA_MASTER_KEY') ?? ''
const PAYDUNYA_PRIVATE_KEY = Deno.env.get('PAYDUNYA_PRIVATE_KEY') ?? ''
const PAYDUNYA_TOKEN = Deno.env.get('PAYDUNYA_TOKEN') ?? ''
const PAYDUNYA_API_URL = Deno.env.get('PAYDUNYA_API_URL') ?? 'https://app.paydunya.com/api/v1'

const PLAN_PRICES: Record<string, number> = { pro: 5000, premium: 15000 }
const PERIOD_DAYS = 30

async function sha512Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Comparaison en temps constant
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// PayDunya envoie la notification en formulaire (data[hash], data[invoice][token]…) ou en JSON.
async function readNotification(req: Request): Promise<{ hash?: string; token?: string }> {
  const type = req.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    const body = await req.json()
    const data = body?.data ?? body
    return { hash: data?.hash, token: data?.invoice?.token }
  }
  const form = await req.formData()
  return {
    hash: form.get('data[hash]')?.toString(),
    token: form.get('data[invoice][token]')?.toString(),
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non autorisée', { status: 405 })

  try {
    if (!PAYDUNYA_MASTER_KEY) return new Response('Non configuré', { status: 500 })

    const { hash, token } = await readNotification(req)
    const expected = await sha512Hex(PAYDUNYA_MASTER_KEY)
    if (!hash || !safeEqual(hash, expected)) {
      console.warn('Notification PayDunya rejetée : signature invalide')
      return new Response('Signature invalide', { status: 401 })
    }
    if (!token) return new Response('Token manquant', { status: 400 })

    // Double vérification : on redemande le statut réel de la facture à PayDunya.
    const confirmResponse = await fetch(`${PAYDUNYA_API_URL}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
      headers: {
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
      },
    })
    const confirmed = await confirmResponse.json()
    if (confirmed?.response_code !== '00' || confirmed.status !== 'completed') {
      return new Response('Paiement non complété', { status: 200 })
    }

    const custom = confirmed.custom_data ?? {}
    if (custom.type !== 'subscription') {
      return new Response('Ignoré', { status: 200 })
    }

    const plan = String(custom.plan ?? '')
    const merchantId = String(custom.merchant_id ?? '')
    const expectedAmount = PLAN_PRICES[plan]
    if (!expectedAmount || !merchantId || Number(confirmed.invoice?.total_amount) !== expectedAmount) {
      console.error('Abonnement incohérent', { plan, merchantId, amount: confirmed.invoice?.total_amount })
      return new Response('Paiement incohérent', { status: 400 })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Idempotence : une facture déjà enregistrée ne prolonge pas l'abonnement une seconde fois.
    const { error: logError } = await supabase.from('subscription_payments').insert({
      invoice_token: token,
      merchant_id: merchantId,
      plan,
      amount_fcfa: expectedAmount,
    })
    if (logError) {
      if (logError.code === '23505') return new Response('Déjà traité', { status: 200 })
      throw logError
    }

    const { data: merchant } = await supabase
      .from('merchants')
      .select('subscription_end_date')
      .eq('id', merchantId)
      .single()

    // Prolonge à partir de la date de fin actuelle si l'abonnement est encore en cours.
    const now = Date.now()
    const currentEnd = merchant?.subscription_end_date ? new Date(merchant.subscription_end_date).getTime() : 0
    const newEnd = new Date(Math.max(now, currentEnd) + PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateError } = await supabase
      .from('merchants')
      .update({ subscription_plan: plan, subscription_status: 'active', subscription_end_date: newEnd })
      .eq('id', merchantId)
    if (updateError) throw updateError

    console.log(`Abonnement ${plan} activé pour ${merchantId} jusqu'au ${newEnd}`)
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('paydunya-webhook', error)
    return new Response('Erreur interne', { status: 500 })
  }
})
