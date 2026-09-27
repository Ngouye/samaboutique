import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

// Clés PayDunya : Edge Functions -> Secrets (supabase secrets set PAYDUNYA_MASTER_KEY=...)
const PAYDUNYA_MASTER_KEY = Deno.env.get('PAYDUNYA_MASTER_KEY')
const PAYDUNYA_PRIVATE_KEY = Deno.env.get('PAYDUNYA_PRIVATE_KEY')
const PAYDUNYA_TOKEN = Deno.env.get('PAYDUNYA_TOKEN')
const PAYDUNYA_API_URL = Deno.env.get('PAYDUNYA_API_URL') ?? 'https://app.paydunya.com/api/v1'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
// Adresses autorisées pour les redirections après paiement (séparées par des virgules)
const FRONTEND_URLS = (Deno.env.get('FRONTEND_URL') ?? '').split(',').map((u) => u.trim()).filter(Boolean)

// Seuls ces forfaits sont payants ; le prix est fixé ici, jamais par le navigateur.
const PLANS: Record<string, { amount: number; label: string }> = {
  pro: { amount: 5000, label: 'PRO' },
  premium: { amount: 15000, label: 'PREMIUM' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PAYDUNYA_MASTER_KEY || !PAYDUNYA_PRIVATE_KEY || !PAYDUNYA_TOKEN) {
      return json({ success: false, error: 'Le paiement n\'est pas encore configuré.' })
    }

    // Le marchand est identifié par son jeton de connexion, jamais par un identifiant envoyé dans le corps.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return json({ success: false, error: 'Veuillez vous reconnecter.' }, 401)
    }

    const { plan } = await req.json()
    const selected = PLANS[plan]
    if (!selected) {
      return json({ success: false, error: 'Forfait inconnu.' }, 400)
    }

    const { data: merchant } = await supabase.from('merchants').select('shop_name').eq('id', user.id).single()
    const shopName = merchant?.shop_name ?? 'Boutique'

    const origin = req.headers.get('origin') ?? ''
    const baseUrl = FRONTEND_URLS.length === 0 || FRONTEND_URLS.includes(origin) ? (origin || FRONTEND_URLS[0]) : FRONTEND_URLS[0]

    const paydunyaPayload = {
      invoice: {
        total_amount: selected.amount,
        description: `Abonnement SaaS - Forfait ${selected.label} - ${shopName}`,
      },
      store: {
        name: 'SamaBoutik SaaS',
        website_url: baseUrl,
      },
      custom_data: { type: 'subscription', merchant_id: user.id, plan },
      actions: {
        return_url: `${baseUrl}/dashboard?payment=success&plan=${plan}`,
        cancel_url: `${baseUrl}/dashboard?payment=cancel`,
        callback_url: `${SUPABASE_URL}/functions/v1/paydunya-webhook`,
      },
    }

    const response = await fetch(`${PAYDUNYA_API_URL}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
      },
      body: JSON.stringify(paydunyaPayload),
    })

    const result = await response.json()

    if (result.response_code === '00') {
      return json({ success: true, invoice_url: result.response_text, token: result.token })
    }
    // 200 pour que le front puisse lire le message d'erreur
    return json({ success: false, error: `PayDunya : ${result.response_text || 'erreur inconnue'}` })
  } catch (error) {
    console.error('paydunya-checkout', error)
    return json({ success: false, error: 'Erreur lors de la création du paiement.' })
  }
})
