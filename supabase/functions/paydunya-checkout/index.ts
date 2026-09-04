import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuration de vos clés PayDunya (à mettre dans le dashboard Supabase : Edge Functions -> Secrets)
// ex: supabase secrets set PAYDUNYA_MASTER_KEY=votre_cle
const PAYDUNYA_MASTER_KEY = Deno.env.get('PAYDUNYA_MASTER_KEY') || 'votre_master_key_test';
const PAYDUNYA_PRIVATE_KEY = Deno.env.get('PAYDUNYA_PRIVATE_KEY') || 'votre_private_key_test';
const PAYDUNYA_TOKEN = Deno.env.get('PAYDUNYA_TOKEN') || 'votre_token_test';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion du CORS pour que votre frontend puisse appeler la fonction
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { merchantId, email, shopName, plan } = await req.json()
    
    // Déterminer le montant en fonction du plan choisi
    let amount = 5000; // Pro par défaut
    if (plan === 'premium') amount = 15000;

    // Récupérer l'URL du site (ex: https://monsite.vercel.app ou http://localhost:5173)
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    // 1. Préparation de la requête pour PayDunya (Création de la facture)
    const paydunyaPayload = {
      invoice: {
        total_amount: amount,
        description: `Abonnement SaaS - Forfait ${plan.toUpperCase()} - ${shopName}`
      },
      store: {
        name: "SamaBoutik SaaS",
        website_url: origin
      },
      custom_data: {
        merchant_id: merchantId,
        plan: plan
      },
      actions: {
        return_url: `${origin}/dashboard?payment=success&plan=${plan}`,
        cancel_url: `${origin}/dashboard?payment=cancel`,
        // L'URL où PayDunya enverra la confirmation finale
        callback_url: "https://kvtqcxyqjsodzdjshits.supabase.co/functions/v1/paydunya-webhook" 
      }
    };

    // 2. Appel de l'API PayDunya (ou Simulation si on n'a pas de vraies clés)
    if (PAYDUNYA_MASTER_KEY.includes('votre_master_key')) {
      // MODE DEMO / SIMULATION
      console.log("Mode DEMO: Simulation de facture PayDunya");
      return new Response(
        JSON.stringify({ 
          success: true, 
          invoice_url: `${origin}/dashboard?payment=success&plan=${plan}`, 
          token: "demo_token_12345" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const response = await fetch("https://app.paydunya.com/api/v1/checkout-invoice/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_MASTER_KEY,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_PRIVATE_KEY,
        "PAYDUNYA-TOKEN": PAYDUNYA_TOKEN
      },
      body: JSON.stringify(paydunyaPayload)
    });

    const result = await response.json();

    if (result.response_code === "00") {
      // Succès : On renvoie l'URL de paiement au navigateur
      return new Response(
        JSON.stringify({ success: true, invoice_url: result.response_text, token: result.token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      // Échec : On renvoie 200 pour que le front puisse lire le JSON, mais avec success: false
      return new Response(
        JSON.stringify({ success: false, error: `PayDunya API Error: ${result.response_text || JSON.stringify(result)}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
