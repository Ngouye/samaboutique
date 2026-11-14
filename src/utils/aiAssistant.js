// Appels à l'assistant IA du serveur (fiche produit rédigée par Claude, photo studio Photoroom).
import { supabase } from '../supabaseClient';
import { isOffline, NETWORK_MESSAGE } from './networkErrors';
import { IA_API } from './apiUrls';

// Microservice de l'assistant IA (Northflank : service « ia ») ; à défaut, le même serveur que les paiements.
const API = IA_API;

// Image (fichier ou adresse) décodée en bitmap, pour la redimensionner ou la dessiner.
export async function loadBitmap(source) {
  const blob = source instanceof Blob ? source : await (await fetch(source, { mode: 'cors' })).blob();
  return createImageBitmap(blob);
}

// Photo prête à envoyer : JPEG de 1280 px au plus (environ 200 à 400 Ko), quel que soit le format d'origine.
export async function photoToDataUrl(source, maxSide = 1280) {
  const bitmap = await loadBitmap(source);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

// « data:image/webp;base64,… » -> fichier (sans fetch : la politique de sécurité du site l'interdit pour data:).
export function dataUrlToFile(dataUrl, name) {
  const [head, base64] = dataUrl.split(',');
  const type = head.match(/data:([^;]+)/)?.[1] || 'image/webp';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

export async function aiRequest(path, body) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  let res;
  try {
    res = await fetch(`${API}/api/ai/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(isOffline() ? NETWORK_MESSAGE : 'L’assistant est momentanément injoignable. Réessayez dans un instant.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const error = new Error(data.error || 'L’assistant n’a pas pu répondre. Réessayez.');
    error.quota = data.quota;
    throw error;
  }
  return data;
}
