// Génère src/components/dashboard/icons.js : les icônes Phosphor de l'espace commerçant, avec SEULEMENT le style
// utilisé par chacune (duotone, ou gras pour les petits signes). Le paquet complet embarque 6 styles par icône
// (environ 70 Ko compressés pour le tableau de bord) ; le fichier généré n'en garde qu'un.
//
// Usage : node scripts/dashboard-icons.mjs   (après avoir ajouté ou changé une icône dans la liste ci-dessous)
// Icônes : Phosphor Icons, licence MIT, https://phosphoricons.com
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'src/components/dashboard/icons.js');
const require = createRequire(path.join(ROOT, 'package.json'));
const DEFS = path.join(path.dirname(require.resolve('@phosphor-icons/react/package.json')), 'dist/defs');

// [nom utilisé dans le code (souvent l'ancien nom Lucide), icône Phosphor, style, commentaire facultatif]
const D = 'duotone';
const B = 'bold';
const F = 'fill';
const ICONS = [
  ['# Alertes et états'],
  ['AlertCircle', 'WarningCircle', D], ['CircleAlert', 'WarningCircle', D], ['TriangleAlert', 'Warning', D],
  ['CircleCheck', 'CheckCircle', D], ['CircleX', 'XCircle', D], ['Clock', 'Clock', D], ['Hourglass', 'Hourglass', D],
  ['ShieldCheck', 'ShieldCheck', D],
  ['# Petits signes, en trait gras'],
  ['ArrowDownRight', 'ArrowDownRight', B], ['ArrowRight', 'ArrowRight', B], ['ArrowUpRight', 'ArrowUpRight', B],
  ['Check', 'Check', B], ['ChevronDown', 'CaretDown', B], ['Download', 'DownloadSimple', B], ['Hash', 'Hash', B],
  ['LoaderCircle', 'CircleNotch', B], ['Minus', 'Minus', B], ['MoreHorizontal', 'DotsThree', B], ['Plus', 'Plus', B],
  ['TrendingUp', 'TrendUp', B], ['X', 'X', B],
  ['# Navigation et actions'],
  ['House', 'House', D], ['LayoutGrid', 'SquaresFour', D], ['Settings', 'GearSix', D], ['LogOut', 'SignOut', D],
  ['Search', 'MagnifyingGlass', D], ['ExternalLink', 'ArrowSquareOut', D], ['Share2', 'ShareNetwork', D],
  ['Copy', 'Copy', D], ['Save', 'FloppyDisk', D], ['Upload', 'UploadSimple', D], ['Pencil', 'PencilSimple', D],
  ['Trash2', 'Trash', D], ['Eye', 'Eye', D], ['QrCode', 'QrCode', D], ['Bell', 'Bell', D], ['BellOff', 'BellSlash', D],
  ['BellRing', 'BellRinging', D], ['Megaphone', 'MegaphoneSimple', D], ['Sparkles', 'Sparkle', D], ['Wand2', 'MagicWand', D],
  ['Rocket', 'RocketLaunch', D], ['Zap', 'Lightning', D], ['Palette', 'Palette', D], ['Square', 'Square', D],
  ['CalendarDays', 'CalendarBlank', D],
  ['# Boutique, produits, commandes'],
  ['Store', 'Storefront', D], ['ShoppingBag', 'ShoppingBag', D], ['Package', 'Package', D],
  ['PackageOpen', 'Basket', D, 'commande en préparation'], ['PackageX', 'Prohibit', D, 'produit en rupture'],
  ['Boxes', 'Cube', D], ['Layers', 'Stack', D], ['Tag', 'Tag', D], ['ImagePlus', 'ImageSquare', D],
  ['ImageOff', 'ImageBroken', D], ['Camera', 'Camera', D], ['Crown', 'Crown', D], ['Gem', 'Diamond', D],
  ['# Argent'],
  ['Banknote', 'Money', D], ['Coins', 'Coins', D], ['HandCoins', 'HandCoins', D], ['Wallet', 'Wallet', D],
  ['CreditCard', 'CreditCard', D],
  ['# Livraison et équipe'],
  ['Truck', 'Truck', D], ['Bike', 'Moped', D, 'livreur à deux-roues'], ['Moped', 'Moped', D],
  ['Motorcycle', 'Motorcycle', D], ['Bicycle', 'Bicycle', D], ['Car', 'Car', D], ['MapPin', 'MapPin', D],
  ['LocateFixed', 'GpsFix', D], ['Navigation', 'NavigationArrow', D], ['Users', 'UsersThree', D],
  ['UserPlus', 'UserPlus', D], ['IdCard', 'IdentificationCard', D],
  ['# Contact et réseaux'],
  ['Phone', 'Phone', D], ['Smartphone', 'DeviceMobile', D], ['Mail', 'EnvelopeSimple', D], ['Globe', 'Globe', D],
  ['MessageCircle', 'WhatsappLogo', D, 'utilisé pour WhatsApp'], ['WhatsApp', 'WhatsappLogo', D], ['Facebook', 'FacebookLogo', F],
  ['Instagram', 'InstagramLogo', B], ['TikTok', 'TiktokLogo', F],
  ['# Menu : version pleine de l’icône de la page ouverte'],
  ['HouseFill', 'House', F], ['ShoppingBagFill', 'ShoppingBag', F], ['PackageFill', 'Package', F],
  ['TruckFill', 'Truck', F], ['UsersFill', 'UsersThree', F], ['SettingsFill', 'GearSix', F],
  ['CreditCardFill', 'CreditCard', F], ['LayoutGridFill', 'SquaresFour', F],
  ['# Page d’accueil : section « Tout est inclus »'],
  ['ChartBar', 'ChartBar', D], ['Images', 'Images', D], ['MapTrifold', 'MapTrifold', D], ['SealCheck', 'SealCheck', D],
  ['Star', 'Star', F], ['LockKey', 'LockKey', D],
  ['# Vitrine'],
  ['Heart', 'Heart', D], ['HeartFill', 'Heart', F], ['ChevronRight', 'CaretRight', B], ['Info', 'Info', D],
  ['Lock', 'LockSimple', D], ['Flame', 'Fire', D], ['User', 'User', D], ['Send', 'PaperPlaneTilt', D],
  ['WifiOff', 'WifiSlash', D], ['RotateCw', 'ArrowClockwise', B], ['ClipboardCheck', 'ClipboardText', D],
  ['PartyPopper', 'Confetti', D], ['Link', 'LinkSimple', B], ['History', 'ClockCounterClockwise', D],
  ['SlidersHorizontal', 'SlidersHorizontal', D], ['ArrowLeft', 'ArrowLeft', B], ['ChevronLeft', 'CaretLeft', B],
  ['Receipt', 'Receipt', D], ['Devices', 'Devices', D], ['HandWaving', 'HandWaving', D],
  ['# Vitrine : catégories'],
  ['Shirt', 'TShirt', D], ['Watch', 'Watch', D], ['Laptop', 'Laptop', D], ['Headphones', 'Headphones', D],
  ['Footprints', 'Sneaker', D], ['Gamepad2', 'GameController', D], ['Utensils', 'ForkKnife', D], ['Baby', 'Baby', D],
  ['Sofa', 'Couch', D], ['Dumbbell', 'Barbell', D], ['BookOpen', 'BookOpen', D],
];

// Arbre d'éléments React -> [balise, attributs, enfants?]
function serialize(node) {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(serialize);
  const { type, props } = node;
  if (typeof type !== 'string') return serialize(props.children); // Fragment
  const { children, ...attrs } = props;
  const kids = serialize(children);
  return [kids.length ? [type, attrs, kids] : [type, attrs]];
}

const lines = [];
for (const [name, phosphor, weight, note] of ICONS) {
  if (name.startsWith('#')) { lines.push('', `// ${name.slice(2)}`); continue; }
  const file = path.join(DEFS, `${phosphor}.es.js`);
  if (!fs.existsSync(file)) throw new Error(`Icône Phosphor introuvable : ${phosphor}`);
  const weights = (await import(pathToFileURL(file).href)).default;
  if (!weights.has(weight)) throw new Error(`Style « ${weight} » absent pour ${phosphor}`);
  const nodes = serialize(weights.get(weight));
  lines.push(`export const ${name} = /* @__PURE__ */ icon('${name}', ${JSON.stringify(nodes)});${note ? ` // ${note}` : ''}`);
}

const header = `// FICHIER GÉNÉRÉ par scripts/dashboard-icons.mjs : ne pas modifier à la main.
// Icônes de l'espace commerçant : Phosphor Icons (licence MIT, https://phosphoricons.com), style duotone
// (trait net + aplat léger de la même couleur), et trait gras pour les petits signes.
// Elles gardent les noms Lucide utilisés jusque-là, pour que les pages du tableau de bord n'aient pas à changer.
// « @__PURE__ » : une page qui n'importe que quelques icônes n'embarque que celles-là.
import { createElement, forwardRef } from 'react';

const draw = (nodes) => nodes.map(([tag, attrs, kids], i) => createElement(tag, { key: i, ...attrs }, kids ? draw(kids) : undefined));

function icon(name, nodes) {
  const Icon = forwardRef(function DashboardIcon(props, ref) {
    const rest = { ...props };
    const size = rest.size ?? 24;
    // Réglages propres à Lucide, sans effet ici (l'épaisseur vient du style choisi).
    delete rest.size;
    delete rest.strokeWidth;
    delete rest.absoluteStrokeWidth;
    const decorative = !rest['aria-label'] && !rest['aria-labelledby'];
    return createElement(
      'svg',
      { ref, xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: '0 0 256 256', fill: 'currentColor', ...(decorative ? { 'aria-hidden': true, focusable: 'false' } : {}), ...rest },
      draw(nodes),
    );
  });
  Icon.displayName = name;
  return Icon;
}
`;
fs.writeFileSync(OUT, header + lines.join('\n') + '\n');
console.log(`${ICONS.filter(([n]) => !n.startsWith('#')).length} icônes écrites dans ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} Ko)`);
