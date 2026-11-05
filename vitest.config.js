import { defineConfig } from 'vitest/config';

// Tests automatiques : `npm test` (voir GUIDE_FIABILITE.md).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 180_000,
    // Valeurs factices : aucun test ne contacte le vrai Supabase.
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'cle-de-test' },
  },
});
