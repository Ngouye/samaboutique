// Favoris : produits et boutiques mis de côté, enregistrés sur le téléphone (rien n'est envoyé ailleurs).
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { store } from './storage';

const FavoritesContext = createContext(null);

// Ce qu'il faut pour afficher la carte sans rien recharger (la fiche s'ouvre ensuite à jour).
const slimProduct = (p, shop) => ({
  id: p.id, name: p.name, price_fcfa: p.price_fcfa, image_url: p.image_url, stock: p.stock, category: p.category,
  merchant_id: p.merchant_id, visibility: p.visibility, publish_at: p.publish_at,
  shop: shop ? { shop_name: shop.shop_name, theme_color: shop.theme_color || null, logo_url: shop.logo_url || null } : null,
});
const slimShop = (s) => ({
  shop_name: s.shop_name, logo_url: s.logo_url || null, banner_url: s.banner_url || null, cover_images: s.cover_images || null,
  theme_color: s.theme_color || null, description: s.description || null, address: s.address || null,
  products_count: s.products_count ?? null, rating: s.rating ?? null, reviews_count: s.reviews_count ?? null, min_price_fcfa: s.min_price_fcfa ?? null,
});

export function FavoritesProvider({ children }) {
  const data = useRef(null); // { products: { [id]: produit }, shops: { [nom]: boutique } }
  if (data.current === null) data.current = { products: {}, shops: {}, ...store.get('favorites', {}) };
  const [version, setVersion] = useState(0);

  const commit = useCallback((next) => {
    data.current = next;
    store.set('favorites', next);
    setVersion((v) => v + 1);
  }, []);

  const isProduct = useCallback((id) => Boolean(data.current.products[String(id)]), []);
  const isShop = useCallback((name) => Boolean(data.current.shops[String(name)]), []);

  // Ajoute ou retire ; renvoie true si l'élément est maintenant dans les favoris.
  const toggleProduct = useCallback((product, shop) => {
    const products = { ...data.current.products };
    const id = String(product.id);
    const added = !products[id];
    if (added) products[id] = { ...slimProduct(product, shop || product.shop), addedAt: Date.now() };
    else delete products[id];
    commit({ ...data.current, products });
    return added;
  }, [commit]);

  const toggleShop = useCallback((shop) => {
    const shops = { ...data.current.shops };
    const name = String(shop.shop_name);
    const added = !shops[name];
    if (added) shops[name] = { ...slimShop(shop), addedAt: Date.now() };
    else delete shops[name];
    commit({ ...data.current, shops });
    return added;
  }, [commit]);

  const products = useCallback(() => Object.values(data.current.products).sort((a, b) => b.addedAt - a.addedAt), []);
  const shops = useCallback(() => Object.values(data.current.shops).sort((a, b) => b.addedAt - a.addedAt), []);
  const count = useCallback(() => Object.keys(data.current.products).length + Object.keys(data.current.shops).length, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ isProduct, isShop, toggleProduct, toggleShop, products, shops, count }), [isProduct, isShop, toggleProduct, toggleShop, products, shops, count, version]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
