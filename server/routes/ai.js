// Assistant IA des commerçants :
//  - POST /api/ai/product-sheet : à partir de la photo d'un produit, Claude rédige la fiche (nom,
//    description, catégorie, mots-clés, caractéristiques). Le commerçant relit avant d'enregistrer.
//  - POST /api/ai/studio-photo : Photoroom détoure le vrai produit et le pose sur un fond studio ou un
//    décor ; le produit lui-même n'est pas modifié (une image inventée tromperait les clients).
//  - GET  /api/ai/quota : utilisations restantes ce mois-ci.
// Réservé aux commerçants connectés ; les clés restent sur le serveur.
import express from 'express';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { supabaseAdmin } from '../lib/supabase.js';
import { reportError } from '../lib/monitoring.js';
import { quotaFor, recordUsage } from '../lib/aiQuota.js';
import { CATEGORY_FEATURES, CATEGORY_NAMES } from '../lib/productCategories.js';

const router = express.Router();
const MODEL = 'claude-opus-5-5';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // limite d'une image pour Claude ; le site envoie ~300 Ko
const IMAGE_DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

// ---------------------------------------------------------------- Accès : commerçant connecté
async function requireMerchant(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ success: false, error: 'Connectez-vous pour utiliser l’assistant.' });
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.id) return res.status(401).json({ success: false, error: 'Session expirée : reconnectez-vous.' });
    req.merchantId = data.user.id;
    return next();
  } catch (error) {
    reportError(error, 'Assistant IA : vérification de session');
    return res.status(503).json({ success: false, error: 'Service momentanément indisponible. Réessayez dans un instant.' });
  }
}

// Limite horaire par commerçant (en plus du plafond mensuel) : évite les rafales de clics.
const perMerchant = (limit) => rateLimit({
  windowMs: 60 * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.merchantId,
  message: { success: false, error: 'Trop de demandes en une heure. Réessayez un peu plus tard.' },
});

const readImage = (dataUrl) => {
  const match = typeof dataUrl === 'string' ? dataUrl.match(IMAGE_DATA_URL) : null;
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
  return { mediaType: match[1], base64: match[2], bytes };
};

const quotaReached = (kind, quota) => ({
  success: false,
  quota,
  error: kind === 'studio_photo'
    ? `Vous avez utilisé vos ${quota.limit} photos studio de ce mois. Passez à un forfait supérieur pour en créer davantage.`
    : `Vous avez utilisé vos ${quota.limit} fiches rédigées par l’IA ce mois-ci. Passez à un forfait supérieur pour en créer davantage.`,
});

// ---------------------------------------------------------------- Fiche produit (Claude)
const ProductSheet = z.object({
  is_product: z.boolean(),
  issue: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(CATEGORY_NAMES),
  tags: z.array(z.string()),
  features: z.array(z.object({ name: z.string(), value: z.string() })),
});

const SYSTEM_PROMPT = `Tu rédiges des fiches produits pour des boutiques en ligne au Sénégal (plateforme SamaBoutik). À partir de la photo d'un produit, et parfois d'une indication du commerçant, tu remplis la fiche en français. Le commerçant relit la fiche avant de la publier.

Règles :
- Décris seulement ce qui se voit sur la photo ou ce que le commerçant indique. N'invente ni marque, ni matière, ni taille, ni caractéristique technique : quand une information n'est pas certaine, laisse sa valeur vide.
- name : le nom du produit tel qu'on l'écrirait dans une vitrine, clair et précis (60 caractères au plus), sans prix ni emoji.
- description : 2 à 4 phrases courtes, chaleureuses et concrètes, qui donnent envie d'acheter : ce qu'est le produit, ses points forts visibles, et l'usage ou les occasions qui lui conviennent. Pas de prix, pas de promesse invérifiable, pas d'emoji.
- category : la catégorie de la liste qui correspond le mieux.
- tags : 3 à 8 mots-clés en minuscules que les clients sénégalais taperaient pour trouver ce produit (par exemple wax, bazin, tabaski, korité, mariage), seulement s'ils correspondent vraiment.
- features : une entrée par caractéristique de la catégorie choisie (liste ci-dessous), avec une valeur vide quand elle ne se voit pas.
- is_product et issue : si la photo ne montre pas un produit à vendre, ou si elle est trop floue ou trop sombre pour le décrire, mets is_product à false et explique en une phrase dans issue comment refaire la photo ; sinon is_product à true et issue vide.

Caractéristiques par catégorie :
${CATEGORY_NAMES.map((c) => `- ${c} : ${CATEGORY_FEATURES[c].join(', ')}`).join('\n')}`;

const clean = (text, max) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);

// Fiche nettoyée : longueurs bornées, caractéristiques limitées à celles de la catégorie.
function tidySheet(sheet) {
  const allowed = CATEGORY_FEATURES[sheet.category] || [];
  const features = {};
  for (const { name, value } of sheet.features) {
    if (allowed.includes(name) && clean(value, 60)) features[name] = clean(value, 60);
  }
  const tags = [...new Set(sheet.tags.map((t) => clean(t, 30).toLowerCase()).filter(Boolean))].slice(0, 8);
  return {
    name: clean(sheet.name, 80),
    description: String(sheet.description || '').trim().slice(0, 1000),
    category: sheet.category,
    tags,
    features,
  };
}

let anthropicClient = null;
const anthropic = () => {
  anthropicClient ||= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return anthropicClient;
};

router.post('/product-sheet', requireMerchant, perMerchant(40), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ success: false, error: 'L’assistant de rédaction n’est pas encore activé sur ce serveur.' });
  }
  const image = readImage(req.body?.image);
  if (!image) return res.status(400).json({ success: false, error: 'Photo manquante ou trop lourde (5 Mo au plus).' });
  const hint = clean(req.body?.hint, 300);

  const quota = await quotaFor(req.merchantId, 'product_sheet');
  if (quota.remaining <= 0) return res.status(402).json(quotaReached('product_sheet', quota));

  try {
    const response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // en cas de refus par les filtres de sécurité, un autre modèle reprend la demande
      output_config: { effort: 'low', format: betaZodOutputFormat(ProductSheet) },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
          { type: 'text', text: hint ? `Indication du commerçant :\n<indication>${hint}</indication>\n\nRédige la fiche de ce produit.` : 'Rédige la fiche de ce produit.' },
        ],
      }],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ success: false, error: 'L’assistant ne peut pas décrire cette photo. Essayez avec une autre photo du produit.' });
    }
    const sheet = response.parsed_output;
    if (!sheet || response.stop_reason === 'max_tokens') {
      return res.status(502).json({ success: false, error: 'La fiche n’a pas pu être rédigée. Réessayez.' });
    }
    if (!sheet.is_product) {
      return res.status(422).json({ success: false, error: clean(sheet.issue, 240) || 'Cette photo ne montre pas clairement un produit. Prenez-le en photo de plus près, bien éclairé.' });
    }

    await recordUsage(req.merchantId, 'product_sheet');
    return res.json({
      success: true,
      sheet: tidySheet(sheet),
      quota: { ...quota, used: quota.used === null ? null : quota.used + 1, remaining: Math.max(0, quota.remaining - 1) },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ success: false, error: 'L’assistant est très demandé. Réessayez dans une minute.' });
    }
    if (error instanceof Anthropic.BadRequestError) {
      reportError(error, 'Assistant IA : demande refusée');
      return res.status(400).json({ success: false, error: 'Cette photo n’a pas pu être lue. Essayez avec une photo JPEG ou PNG.' });
    }
    if (error instanceof Anthropic.APIError || error instanceof Anthropic.APIConnectionError) {
      reportError(error, 'Assistant IA : service Claude');
      return res.status(503).json({ success: false, error: 'L’assistant est momentanément indisponible. Réessayez dans un instant.' });
    }
    reportError(error, 'Assistant IA : fiche produit');
    return res.status(500).json({ success: false, error: 'La fiche n’a pas pu être rédigée. Réessayez.' });
  }
});

// ---------------------------------------------------------------- Photo studio (Photoroom)
// Fonds proposés. Pour les décors, Photoroom génère l'arrière-plan autour du vrai produit détouré.
export const STUDIO_STYLES = {
  studio: { color: 'FFFFFF' },
  marbre: { prompt: 'On a light marble surface, soft natural daylight from the side, elegant minimalist studio, realistic product photography' },
  bois: { prompt: 'On a warm wooden table, soft blurred green plants in the background, warm golden light, realistic product photography' },
  wax: { prompt: 'On a table covered with a colorful West African wax print fabric, soft daylight, realistic product photography' },
};

router.post('/studio-photo', requireMerchant, perMerchant(20), async (req, res) => {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, error: 'La photo studio n’est pas encore activée sur ce serveur.' });
  const image = readImage(req.body?.image);
  if (!image) return res.status(400).json({ success: false, error: 'Photo manquante ou trop lourde (5 Mo au plus).' });
  const style = STUDIO_STYLES[req.body?.style] ? req.body.style : 'studio';

  const quota = await quotaFor(req.merchantId, 'studio_photo');
  if (quota.remaining <= 0) return res.status(402).json(quotaReached('studio_photo', quota));

  try {
    const form = new FormData();
    const extension = image.mediaType.split('/')[1];
    form.append('imageFile', new Blob([image.bytes], { type: image.mediaType }), `produit.${extension}`);
    form.append('removeBackground', 'true');
    form.append('padding', '0.12');
    form.append('outputSize', '1200x1200');
    form.append('scaling', 'fit');
    form.append('export.format', 'webp');
    if (STUDIO_STYLES[style].prompt) {
      form.append('background.prompt', STUDIO_STYLES[style].prompt); // le décor généré inclut déjà l'ombre
    } else {
      form.append('background.color', STUDIO_STYLES[style].color);
      form.append('shadow.mode', 'ai.soft');
    }

    const baseUrl = (process.env.PHOTOROOM_API_URL || 'https://image-api.photoroom.com').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/v2/edit`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
    if (response.status === 402) {
      reportError(new Error('Photoroom : crédit épuisé'), 'Photo studio');
      return res.status(503).json({ success: false, error: 'La photo studio est momentanément indisponible. Réessayez plus tard.' });
    }
    if (!response.ok) {
      reportError(new Error(`Photoroom : réponse ${response.status}`), 'Photo studio');
      return res.status(502).json({ success: false, error: 'La photo n’a pas pu être retravaillée. Essayez avec une autre photo, bien nette.' });
    }
    const output = Buffer.from(await response.arrayBuffer());
    await recordUsage(req.merchantId, 'studio_photo');
    return res.json({
      success: true,
      image: `data:image/webp;base64,${output.toString('base64')}`,
      quota: { ...quota, used: quota.used === null ? null : quota.used + 1, remaining: Math.max(0, quota.remaining - 1) },
    });
  } catch (error) {
    reportError(error, 'Photo studio');
    return res.status(503).json({ success: false, error: 'La photo studio est momentanément indisponible. Réessayez dans un instant.' });
  }
});

router.get('/quota', requireMerchant, async (req, res) => {
  const [sheet, studio] = await Promise.all([quotaFor(req.merchantId, 'product_sheet'), quotaFor(req.merchantId, 'studio_photo')]);
  res.json({
    success: true,
    enabled: { product_sheet: Boolean(process.env.ANTHROPIC_API_KEY), studio_photo: Boolean(process.env.PHOTOROOM_API_KEY) },
    quota: { product_sheet: sheet, studio_photo: studio },
  });
});

export default router;
