// Cadre de la carte sur téléphone : WebView (page web intégrée).
import { WebView } from 'react-native-webview';

export default function MapFrame({ html, onMessage, webviewRef }) {
  return (
    <WebView
      ref={webviewRef}
      source={{ html, baseUrl: 'https://samaboutik-nine.vercel.app' }}
      originWhitelist={['*']}
      onMessage={(e) => onMessage(e.nativeEvent.data)}
      style={{ flex: 1, backgroundColor: '#eef0f3' }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
    />
  );
}
