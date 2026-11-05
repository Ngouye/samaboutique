import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const version = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || new Date().toISOString().slice(0, 16);

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  build: {
    rolldownOptions: {
      output: {
        // Bibliothèques regroupées en fichiers séparés : téléchargés en parallèle,
        // et gardés en cache par le navigateur quand seul le code du site change.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 30 },
            { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 20 },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
