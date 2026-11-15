// Panier de l'application : un panier par boutique (une commande = une boutique), comme sur le site.
// Enregistré sur le téléphone : il est encore là après la fermeture de l'application.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { store } from './storage';

const CartContext = createContext(null);

// « M - Noir » : taille et couleur choisies (même libellé que le site).
export const variantLabel = (size, color) => [size, color].filter(Boolean).join(' - ');
export const cartKey = (productId, variant) => (variant ? `${productId}-${variant}` : String(productId));

const stockLeft = (product) => (typeof product.stock === 'number' ? product.stock : Infinity);
const stockMessage = (product) => (product.stock <= 0
  ? `${product.name} est épuisé`
  : `Plus que ${product.stock} en stock pour ${product.name}`);

// Seules les informations utiles au panier sont gardées (la base recalcule les prix à la commande).
const slim = (p) => ({ id: p.id, name: p.name, price_fcfa: p.price_fcfa, image_url: p.image_url, stock: p.stock, merchant_id: p.merchant_id });

export function CartProvider({ children }) {
  const carts = useRef(null); // { [nom de la boutique]: { [clé]: { product, variant, quantity } } }
  if (carts.current === null) carts.current = store.get('carts', {});
  const [version, setVersion] = useState(0);

  const commit = useCallback((next) => {
    carts.current = next;
    store.set('carts', next);
    setVersion((v) => v + 1);
  }, []);

  const count = useCallback((shopName) => Object.values(carts.current[shopName] || {}).reduce((n, line) => n + line.quantity, 0), []);

  // Logo et couleur de chaque boutique du panier (affichés dans l'onglet Panier).
  const metas = useRef(null);
  if (metas.current === null) metas.current = store.get('cartShops', {});
  const shopMeta = useCallback((shopName) => metas.current[shopName] || null, []);

  // Ajoute un exemplaire ; refuse de dépasser le stock (la base refuserait la commande de toute façon).
  const add = useCallback((shopName, product, variant = '', meta = null) => {
    const shopCart = carts.current[shopName] || {};
    const inCart = Object.values(shopCart).reduce((n, line) => n + (line.product.id === product.id ? line.quantity : 0), 0);
    if (inCart >= stockLeft(product)) return { ok: false, message: stockMessage(product) };
    const key = cartKey(product.id, variant);
    if (meta && (meta.logo_url || meta.theme_color)) {
      metas.current = { ...metas.current, [shopName]: { logo_url: meta.logo_url || null, theme_color: meta.theme_color || null } };
      store.set('cartShops', metas.current);
    }
    commit({
      ...carts.current,
      [shopName]: { ...shopCart, [key]: { product: slim(product), variant, quantity: (shopCart[key]?.quantity || 0) + 1 } },
    });
    return { ok: true, count: count(shopName) };
  }, [commit, count]);

  const lines = useCallback((shopName) => Object.entries(carts.current[shopName] || {}).map(([key, line]) => ({ key, ...line })), []);

  // Sous-total des articles (prix enregistré au moment de l'ajout ; la base recalcule de toute façon).
  const subtotal = useCallback((shopName) => Object.values(carts.current[shopName] || {})
    .reduce((n, line) => n + (Number(line.product.price_fcfa) || 0) * line.quantity, 0), []);

  // Nouvelle quantité d'une ligne (0 = retirée) ; refuse de dépasser le stock du produit.
  const setQuantity = useCallback((shopName, key, quantity) => {
    const shopCart = { ...(carts.current[shopName] || {}) };
    const line = shopCart[key];
    if (!line) return { ok: false };
    if (quantity <= 0) {
      delete shopCart[key];
      commit({ ...carts.current, [shopName]: shopCart });
      return { ok: true };
    }
    const others = Object.entries(shopCart).reduce((n, [k, l]) => n + (k !== key && l.product.id === line.product.id ? l.quantity : 0), 0);
    if (others + quantity > stockLeft(line.product)) return { ok: false, message: stockMessage(line.product) };
    shopCart[key] = { ...line, quantity };
    commit({ ...carts.current, [shopName]: shopCart });
    return { ok: true };
  }, [commit]);

  const clear = useCallback((shopName) => {
    const next = { ...carts.current };
    delete next[shopName];
    commit(next);
  }, [commit]);

  // Tous les paniers en cours (une ligne par boutique), et le nombre total d'articles.
  const shops = useCallback(() => Object.keys(carts.current)
    .map((shop) => ({ shop, lines: lines(shop), count: count(shop), subtotal: subtotal(shop) }))
    .filter((c) => c.count > 0), [lines, count, subtotal]);
  const totalCount = useCallback(() => Object.keys(carts.current).reduce((n, shop) => n + count(shop), 0), [count]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ add, count, lines, subtotal, setQuantity, clear, shops, totalCount, shopMeta }), [add, count, lines, subtotal, setQuantity, clear, shops, totalCount, shopMeta, version]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
