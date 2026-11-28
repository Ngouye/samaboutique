// Carte des boutiques : MapLibre et le fond OpenFreeMap « liberty » (comme l'annuaire du site), sans clé :
// routes en couleur avec leur nom, quartiers et lieux, noms en français quand ils existent.
// La carte est une petite page web intégrée. Les boutiques lui sont envoyées par message (jamais écrites
// dans son code), et chaque nom est affiché comme du texte : un nom de boutique ne peut rien y injecter.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform } from 'react-native';
import MapFrame from './MapFrame';

export const MAP_HTML = `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #f2efe9; font-family: -apple-system, Roboto, sans-serif; }
  .pin { display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateY(-6px); transition: transform .2s; }
  .pin .bubble { width: 46px; height: 46px; border-radius: 16px; background: #fff; padding: 3px; box-shadow: 0 8px 20px rgba(18,16,58,.28); border: 2px solid #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .pin img { width: 100%; height: 100%; border-radius: 12px; object-fit: cover; }
  .pin .initials { width: 100%; height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 15px; }
  .pin .tail { width: 10px; height: 10px; background: #fff; transform: rotate(45deg); margin-top: -6px; box-shadow: 3px 3px 6px rgba(18,16,58,.15); }
  .pin.active { transform: translateY(-6px) scale(1.22); z-index: 5; }
  .pin.active .bubble { border-color: #3b2fc9; }
  .me { width: 18px; height: 18px; border-radius: 50%; background: #3b82f6; border: 3px solid #fff; box-shadow: 0 0 0 8px rgba(59,130,246,.25); }
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style></head><body><div id="map"></div><script>
  var send = function (m) { var s = JSON.stringify(m); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else window.parent.postMessage(s, '*'); };
  var map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty', center: [-17.45, 14.71], zoom: 11, attributionControl: { compact: true } });
  var markers = {}; var me = null;
  // Noms en français (rues, quartiers, lieux) quand ils existent
  map.on('load', function () {
    try {
      (map.getStyle().layers || []).forEach(function (l) {
        var f = l.type === 'symbol' && l.layout && l.layout['text-field'];
        if (f && JSON.stringify(f).indexOf('name') !== -1) map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']]);
      });
    } catch (err) { /* noms d'origine */ }
  });
  function initials(name) { return String(name || '?').trim().split(/ +/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  window.setShops = function (list) {
    Object.keys(markers).forEach(function (k) { markers[k].remove(); }); markers = {};
    var bounds = new maplibregl.LngLatBounds();
    list.forEach(function (s) {
      var el = document.createElement('div'); el.className = 'pin';
      var bubble = document.createElement('div'); bubble.className = 'bubble';
      if (s.logo) { var img = document.createElement('img'); img.src = s.logo; img.alt = ''; bubble.appendChild(img); }
      else { var ini = document.createElement('div'); ini.className = 'initials'; ini.style.background = s.color || '#3b2fc9'; ini.textContent = initials(s.name); bubble.appendChild(ini); }
      var tail = document.createElement('div'); tail.className = 'tail';
      el.appendChild(bubble); el.appendChild(tail);
      el.addEventListener('click', function (e) { e.stopPropagation(); window.selectShop(s.name, true); send({ type: 'select', name: s.name }); });
      markers[s.name] = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lng, s.lat]).addTo(map);
      bounds.extend([s.lng, s.lat]);
    });
    if (list.length === 1) map.jumpTo({ center: [list[0].lng, list[0].lat], zoom: 14 });
    else if (list.length > 1) map.fitBounds(bounds, { padding: { top: 120, bottom: 260, left: 50, right: 50 }, maxZoom: 14, duration: 0 });
  };
  window.selectShop = function (name, fromMap) {
    Object.keys(markers).forEach(function (k) { markers[k].getElement().classList.toggle('active', k === name); });
    var m = markers[name]; if (m && !fromMap) map.flyTo({ center: m.getLngLat(), zoom: Math.max(map.getZoom(), 13.5), offset: [0, -90], duration: 900 });
  };
  window.showMe = function (lat, lng) {
    if (!me) { var d = document.createElement('div'); d.className = 'me'; me = new maplibregl.Marker({ element: d }).setLngLat([lng, lat]).addTo(map); }
    else me.setLngLat([lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: 13.5, offset: [0, -90], duration: 1100 });
  };
  window.addEventListener('message', function (e) {
    try { var m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if (!m || !m.type) return;
      if (m.type === 'shops') window.setShops(m.shops); if (m.type === 'select') window.selectShop(m.name); if (m.type === 'me') window.showMe(m.lat, m.lng);
    } catch (err) { /* message d'une autre origine */ }
  });
  // Les logos peuvent être posés avant la fin du chargement du fond de carte.
  map.on('error', function (e) { send({ type: 'error', message: String((e && e.error && e.error.message) || e) }); });
  send({ type: 'ready' });
</script></body></html>`;

const ShopsMap = forwardRef(function ShopsMap({ shops, onSelect }, ref) {
  const webview = useRef(null);
  const frame = useRef(null);
  const ready = useRef(false);
  const latest = useRef(shops);
  latest.current = shops;

  const post = useCallback((message) => {
    if (!ready.current) return;
    if (Platform.OS === 'web') frame.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
    else webview.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(message))} })); true;`);
  }, []);

  const pushShops = useCallback(() => {
    post({ type: 'shops', shops: (latest.current || []).map((s) => ({ name: s.shop_name, lat: s.latitude, lng: s.longitude, logo: s.logo_url || null, color: s.theme_color || null })) });
  }, [post]);

  useEffect(() => { pushShops(); }, [shops, pushShops]);

  useImperativeHandle(ref, () => ({
    select: (name) => post({ type: 'select', name }),
    showMe: (lat, lng) => post({ type: 'me', lat, lng }),
  }), [post]);

  const onMessage = useCallback((raw) => {
    let message = null;
    try { message = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
    if (message?.type === 'ready') { ready.current = true; pushShops(); }
    if (message?.type === 'select') onSelect?.(message.name);
  }, [onSelect, pushShops]);

  return <MapFrame html={MAP_HTML} onMessage={onMessage} webviewRef={webview} frameRef={frame} />;
});

export default ShopsMap;
