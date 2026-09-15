import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialisation du client Supabase avec la Service Role Key (droits d'admin)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Variables d'environnement PayDunya
const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;
const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;
const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;
const PAYDUNYA_API_URL = process.env.PAYDUNYA_API_URL || 'https://app.paydunya.com/api/v1';

// Route 1: Créer une demande de paiement (Checkout)
router.post('/create', async (req, res) => {
  try {
    const { orderDetails, merchantInfo } = req.body;
    
    // 1. Sauvegarder la commande en statut 'PENDING' dans Supabase
    // On génère un code PIN aléatoire pour la livraison
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const { data: order, error: orderError } = await supabase.from('orders').insert([{
      merchant_id: orderDetails.merchant_id,
      customer_name: orderDetails.name,
      customer_phone: orderDetails.phone,
      customer_address: orderDetails.address,
      delivery_zone: orderDetails.zone,
      total_amount_fcfa: orderDetails.totalAmount,
      cart_items: orderDetails.cartItems,
      delivery_pin: pinCode,
      payment_method: 'MOBILE_MONEY',
      status: 'PENDING'
    }]).select().single();

    if (orderError) throw orderError;

    // 2. Configuration du Split Payment (Paiement Partagé)
    // 5% pour Samaboutik, 95% pour le Marchand
    const commissionPlatform = Math.floor(orderDetails.totalAmount * 0.05);
    const amountMerchant = orderDetails.totalAmount - commissionPlatform;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

    // Configuration de la requête PayDunya API
    const paydunyaPayload = {
      invoice: {
        total_amount: orderDetails.totalAmount,
        description: `Commande sur ${merchantInfo.shop_name}`,
        store: {
          name: "Samaboutik Marketplace"
        },
        custom_data: {
          order_id: order.id
        }
      },
      store: {
        name: "Samaboutik",
        website_url: frontendUrl // L'URL de notre frontend
      },
      // Configuration des actions d'URL (redirections et webhook)
      actions: {
        cancel_url: `${frontendUrl}/${merchantInfo.shop_name}?payment=cancel`,
        return_url: `${frontendUrl}/${merchantInfo.shop_name}?payment=success&orderId=${order.id}`,
        callback_url: `${backendUrl}/api/payments/webhook` // Le webhook que PayDunya appellera
      }
    };

    // NOTE: Si nous avions un compte marchand enfant PayDunya pour ce vendeur, nous ajouterions la configuration split ici.
    // Étant donné que PayDunya nécessite que le marchand enfant soit créé au préalable côté PayDunya, 
    // l'implémentation exacte du split nécessitera l'utilisation des "Accounts" de facturation partagée PayDunya.
    // Pour cet exemple, nous générons simplement le checkout master.

    // 3. Envoyer la demande à PayDunya
    const response = await axios.post(`${PAYDUNYA_API_URL}/checkout-invoice/create`, paydunyaPayload, {
      headers: {
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.response_code === '00') {
      res.json({
        success: true,
        paymentUrl: response.data.response_text,
        token: response.data.token,
        orderId: order.id
      });
    } else {
      res.status(400).json({ success: false, error: "Échec de création de la facture PayDunya", details: response.data });
    }

  } catch (error) {
    console.error("Erreur serveur lors de la création du paiement :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route 2: Webhook PayDunya (Appelé automatiquement en arrière-plan)
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    
    // Le hash pour vérifier que la requête vient bien de PayDunya
    // (Dans la réalité, vous vérifiez hash vs votre master key pour plus de sécurité)
    if (payload.status === 'completed') {
      const orderId = payload.custom_data.order_id;
      
      // Mettre à jour l'order dans Supabase pour indiquer que le paiement est reçu
      const { data: order, error: orderError } = await supabase.from('orders')
        .update({ status: 'PREPARING' }) // La commande est payée, elle passe en préparation
        .eq('id', orderId)
        .select('merchant_id, total_amount_fcfa')
        .single();

      if (orderError) {
        console.error("Erreur Webhook lors de la mise à jour de la BD:", orderError);
      } else {
        console.log(`Commande ${orderId} validée et payée !`);

        // === ETAPE : PAIEMENT AUTOMATIQUE DU MARCHAND (PAYOUT) ===
        try {
          // 1. Récupérer les infos du marchand
          const { data: merchant, error: merchantError } = await supabase.from('merchants')
            .select('payout_phone_number, payout_provider')
            .eq('id', order.merchant_id)
            .single();

          if (merchantError) throw merchantError;

          if (merchant.payout_phone_number) {
            // 2. Calcul du montant (95% pour le vendeur, 5% de commission)
            const commission = Math.floor(order.total_amount_fcfa * 0.05);
            const payoutAmount = order.total_amount_fcfa - commission;

            console.log(`Lancement du transfert PayDunya de ${payoutAmount} FCFA vers ${merchant.payout_phone_number}...`);

            // 3. Demande de virement (Direct Pay)
            const payoutPayload = {
              account_alias: merchant.payout_phone_number,
              amount: payoutAmount
            };

            const payoutResponse = await axios.post(`${PAYDUNYA_API_URL}/direct-pay/credit-account`, payoutPayload, {
              headers: {
                'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
                'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
                'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
                'Content-Type': 'application/json'
              }
            });

            if (payoutResponse.data && payoutResponse.data.response_code === '00') {
              console.log(`Transfert réussi vers le vendeur ! Transaction ID: ${payoutResponse.data.transaction_id}`);
            } else {
              console.error("Échec du transfert PayDunya:", payoutResponse.data);
            }
          } else {
            console.warn("Aucun numéro de paiement renseigné par ce vendeur. Le transfert manuel sera nécessaire.");
          }
        } catch (payoutErr) {
          console.error("Erreur lors du transfert d'argent au vendeur:", payoutErr.response ? payoutErr.response.data : payoutErr.message);
        }
      }
    }

    // Il est important de toujours renvoyer 200 OK à PayDunya
    res.status(200).send("Webhook reçu");
  } catch (error) {
    console.error("Erreur Webhook :", error);
    res.status(500).send("Erreur interne");
  }
});

export default router;
