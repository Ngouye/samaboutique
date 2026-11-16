// Cadre de la carte sur le web (tests sur ordinateur) : <iframe> chargé depuis une adresse « blob: »
// (avec srcDoc, MapLibre ne peut pas lancer son processus de tuiles).
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

export default function MapFrame({ html, onMessage, frameRef }) {
  const src = useMemo(() => URL.createObjectURL(new Blob([html], { type: 'text/html' })), [html]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  useEffect(() => {
    const listener = (e) => { if (e.source === frameRef.current?.contentWindow) onMessage(e.data); };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage, frameRef]);
  return (
    <View style={{ flex: 1 }}>
      <iframe ref={frameRef} src={src} title="Carte des boutiques" style={{ border: 0, width: '100%', height: '100%' }} />
    </View>
  );
}
