import { supabase } from '../supabaseClient';

const BUCKET = 'product-images';

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Réduit une photo dans le navigateur avant l'envoi : format WebP, côté le plus long limité,
// orientation du téléphone respectée, métadonnées (dont la position GPS) retirées.
// En cas de souci (format non lisible, vieux navigateur), le fichier d'origine est conservé.
export async function compressImage(file, { maxSize = 1600, quality = 0.82, keepTransparency = false } = {}) {
  if (!file?.type?.startsWith('image/') || /gif|svg/.test(file.type) || typeof createImageBitmap !== 'function') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  // Safari ne sait pas produire de WebP : JPEG à la place, sauf pour un logo transparent.
  if (blob?.type !== 'image/webp') {
    if (keepTransparency) return file;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (!blob || (scale === 1 && blob.size >= file.size)) return file;

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${ext}`, { type: blob.type });
}

const EXTENSIONS = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/avif': 'avif' };

// Compresse puis envoie la photo dans le dossier du marchand.
// Nom aléatoire impossible à deviner, et mise en cache d'un an (le nom change à chaque envoi).
// `thumbSize` : envoie aussi une miniature (même nom + « .thumb »), utilisée par les listes de produits.
export async function uploadShopImage(userId, file, { prefix = '', thumbSize = 0, ...options } = {}) {
  const ready = await compressImage(file, options);
  const ext = EXTENSIONS[ready.type] || 'jpg';
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${prefix}${id}.${ext}`;
  const upload = (target, body) => supabase.storage
    .from(BUCKET)
    .upload(target, body, { cacheControl: '31536000', contentType: body.type || undefined });

  const { error } = await upload(path, ready);
  if (error) throw error;

  if (thumbSize && (ext === 'webp' || ext === 'jpg')) {
    const thumb = await compressImage(file, { ...options, maxSize: thumbSize, quality: 0.78 });
    // Une miniature manquante n'empêche pas l'enregistrement : l'affichage reprend alors la photo complète.
    if (thumb.type === ready.type) await upload(`${userId}/${prefix}${id}.thumb.${ext}`, thumb).catch(() => {});
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, before: file.size, after: ready.size };
}

// Adresse de la miniature d'une photo produit envoyée avec `thumbSize` (nom en UUID).
// Les photos plus anciennes n'ont pas de miniature : l'adresse d'origine est renvoyée.
const UUID_IMAGE = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg)$/i;
export const thumbUrl = (url) => (url && UUID_IMAGE.test(url) ? url.replace(UUID_IMAGE, '/$1.thumb.$2') : url);

// Si la miniature n'existe pas (envoi interrompu), on bascule sur la photo complète.
export const fallbackToFull = (url) => (event) => {
  if (url && event.currentTarget.src !== url) event.currentTarget.src = url;
};

// « 2,4 Mo », « 180 Ko »
export const formatBytes = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

// Message affiché au marchand quand la photo a été allégée.
export const savingsMessage = ({ before, after }) =>
  after < before * 0.9 ? `Photo allégée : ${formatBytes(before)} → ${formatBytes(after)}` : null;
