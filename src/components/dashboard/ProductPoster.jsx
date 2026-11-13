// Affiche produit pour le statut WhatsApp, Facebook ou Instagram : la photo avec le nom, le prix, une
// phrase de description, les moyens de paiement et un QR code vers la vitrine écrits dessus.
// Dessinée dans le navigateur (aucun service externe, aucun coût), aux couleurs du thème de la boutique.
import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Megaphone, Download, Share2, LoaderCircle, CircleAlert, Smartphone, Square } from './icons';
import { Modal } from './ui';
import { loadBitmap } from '../../utils/aiAssistant';
import { getShopTheme } from '../shop/themes';
import { BRAND } from '../../utils/brand';

const FORMATS = {
  story: { w: 1080, h: 1920, label: 'Statut (9:16)', icon: Smartphone },
  square: { w: 1080, h: 1080, label: 'Publication (carré)', icon: Square },
};
const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const PAYMENTS = 'Wave · Orange Money · Free Money · Wizall · À la livraison';
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR');

// Une phrase d'accroche : le début de la description, coupé proprement.
const teaser = (text, max = 150) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = word; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h); // anciens navigateurs : coins droits
};

// Couleur de la boutique, ou l'indigo de la marque si elle est trop sombre pour ressortir sur le fond nuit.
const readableAccent = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return BRAND.vivid;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.12 ? BRAND.vivid : hex;
};

// Photo en mode « couvrir » dans un cadre arrondi.
function drawCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawPoster(canvas, { format, photo, product, shopName, shopUrl, accent, qr }) {
  const { w, h } = FORMATS[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const story = format === 'story';
  const pad = 64;

  // Fond nuit + halo à la couleur de la boutique
  ctx.fillStyle = BRAND.night;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, w * 0.9);
  glow.addColorStop(0, `${accent}66`);
  glow.addColorStop(1, `${accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // En-tête : initiale + nom de la boutique
  const headY = story ? 120 : 84;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(pad + 34, headY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 36px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((shopName || 'B').charAt(0).toUpperCase(), pad + 34, headY + 2);
  ctx.textAlign = 'left';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(wrap(ctx, shopName, w - pad * 2 - 300, 1)[0] || '', pad + 88, headY - 14);
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('Disponible maintenant', pad + 88, headY + 26);

  // Photo
  const photoY = story ? 210 : 160;
  const photoH = story ? 900 : 520;
  const photoW = story ? w - pad * 2 : 520;
  if (photo) drawCover(ctx, photo, pad, photoY, photoW, photoH, 44);

  // Prix (pastille)
  ctx.font = `800 ${story ? 64 : 52}px ${FONT}`;
  const priceText = `${fmt(product.price_fcfa)} FCFA`;
  const priceW = ctx.measureText(priceText).width + 72;
  const priceH = story ? 104 : 88;
  const priceX = story ? w - pad - priceW + 20 : pad + 24;
  const priceY = photoY + photoH - priceH / 2 - (story ? 0 : 40);
  ctx.fillStyle = accent;
  roundRect(ctx, priceX, priceY, priceW, priceH, priceH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceText, priceX + 36, priceY + priceH / 2 + 2);

  // Texte : nom, accroche, moyens de paiement
  const textX = story ? pad : pad + photoW + 48;
  const textW = story ? w - pad * 2 : w - textX - pad;
  let y = story ? photoY + photoH + 110 : photoY + 20;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${story ? 70 : 52}px ${FONT}`;
  for (const line of wrap(ctx, product.name, textW, story ? 2 : 4)) { ctx.fillText(line, textX, y); y += story ? 82 : 62; }
  y += 18;
  ctx.font = `500 ${story ? 36 : 30}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  for (const line of wrap(ctx, teaser(product.description), textW, story ? 3 : 4)) { ctx.fillText(line, textX, y); y += story ? 50 : 42; }
  if (story) {
    y += 22;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = '#fde68a';
    for (const line of wrap(ctx, PAYMENTS, textW, 2)) { ctx.fillText(line, textX, y); y += 42; }
  }

  // Pied : « Commandez ici » + adresse + QR code
  const footH = story ? 250 : 210;
  const footY = h - footH - (story ? 70 : 48);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, pad, footY, w - pad * 2, footH, 36);
  ctx.fill();
  const qrSize = footH - 48;
  if (qr) ctx.drawImage(qr, w - pad - 24 - qrSize, footY + 24, qrSize, qrSize);
  const footTextW = w - pad * 2 - qrSize - 96;
  ctx.fillStyle = BRAND.ink;
  ctx.textBaseline = 'top';
  ctx.font = `800 ${story ? 46 : 38}px ${FONT}`;
  ctx.fillText('Commandez ici', pad + 40, footY + (story ? 44 : 34));
  ctx.font = `600 ${story ? 28 : 24}px ${FONT}`;
  ctx.fillStyle = BRAND.signature;
  const display = decodeURIComponent(shopUrl.replace(/^https?:\/\//, ''));
  let fy = footY + (story ? 112 : 92);
  for (const line of wrap(ctx, display.replace(/\//g, '/ '), footTextW, 2)) { ctx.fillText(line.replace(/\/ /g, '/'), pad + 40, fy); fy += story ? 38 : 32; }
  if (!story) {
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = '#9a7a2c';
    ctx.fillText(wrap(ctx, PAYMENTS, footTextW, 1)[0], pad + 40, footY + footH - 52);
  }
}

export default function ProductPoster({ product, merchant, shopUrl, onClose }) {
  const canvasRef = useRef(null);
  const qrRef = useRef(null);
  const [format, setFormat] = useState('story');
  const [photo, setPhoto] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const accent = readableAccent(getShopTheme(merchant?.layout_style).accent);

  useEffect(() => {
    let alive = true;
    setState('loading');
    Promise.all([
      product?.image_url ? loadBitmap(product.image_url).catch(() => null) : Promise.resolve(null),
      document.fonts?.load(`800 64px ${FONT}`).catch(() => null),
    ]).then(([bitmap]) => {
      if (!alive) return;
      setPhoto(bitmap);
      setState(product?.image_url && !bitmap ? 'error' : 'ready');
    });
    return () => { alive = false; };
  }, [product?.image_url]);

  useEffect(() => {
    if (state === 'loading' || !canvasRef.current || !product) return;
    drawPoster(canvasRef.current, { format, photo, product, shopName: merchant?.shop_name, shopUrl, accent, qr: qrRef.current });
  }, [state, format, photo, product, merchant?.shop_name, shopUrl, accent]);

  const fileName = `affiche-${(product?.name || 'produit').toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.jpg`;
  const caption = product ? `${product.name} – ${fmt(product.price_fcfa)} FCFA\nCommandez ici : ${shopUrl}` : '';

  const toBlob = () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/jpeg', 0.92));

  const download = async () => {
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const share = async () => {
    const file = new File([await toBlob()], fileName, { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: caption }); } catch { /* partage annulé */ }
    } else {
      download();
    }
  };

  return (
    <Modal open={Boolean(product)} onClose={onClose} icon={Megaphone} gradient="emerald" title="Affiche du produit" subtitle="Pour votre statut WhatsApp, Facebook ou Instagram" maxWidth="max-w-xl">
      <QRCodeCanvas ref={qrRef} value={shopUrl || ' '} size={360} marginSize={0} fgColor={BRAND.ink} className="hidden" aria-hidden="true" />
      <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Format">
        {Object.entries(FORMATS).map(([id, f]) => (
          <button key={id} type="button" role="radio" aria-checked={format === id} onClick={() => setFormat(id)}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${format === id ? 'bg-ink text-white' : 'bg-[#f1efe8] text-stone-600 hover:text-ink'}`}>
            <f.icon className="h-4 w-4" /> {f.label}
          </button>
        ))}
      </div>
      <div className="relative mx-auto overflow-hidden rounded-2xl bg-[#f1efe8]" style={{ maxWidth: format === 'story' ? 300 : 420 }}>
        <canvas ref={canvasRef} className="block h-auto w-full" aria-label={`Affiche : ${product?.name || ''}`} role="img" />
        {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-brand-600" /></div>}
      </div>
      {state === 'error' && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> La photo du produit n’a pas pu être chargée : l’affiche est créée sans photo.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={download} disabled={state === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#dcd8cd] bg-white text-sm font-bold text-slate-800 disabled:opacity-50">
          <Download className="h-4 w-4" /> Télécharger
        </button>
        <button type="button" onClick={share} disabled={state === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-bold text-white disabled:opacity-50">
          <Share2 className="h-4 w-4" /> Partager
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-stone-500">Sur téléphone, « Partager » ouvre WhatsApp avec l’affiche et le lien de votre vitrine.</p>
    </Modal>
  );
}
