// Base de données « façon Supabase » en mémoire (PGlite = vrai PostgreSQL compilé en WebAssembly).
// Les scripts SQL du projet y sont installés dans l'ordre, puis les tests jouent les rôles
// visiteur (anon), marchand connecté (authenticated) et serveur (service_role).
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Schéma historique (déjà en place sur la base de production)
const BASE_SCRIPTS = [
  'supabase_schema.sql', 'supabase_reviews.sql', 'add_features.sql', 'add_advanced_features.sql',
  'create_drivers_table.sql', 'add_pin_code.sql', 'add_driver_tracking.sql', 'add_driver_assignment.sql',
  'secure_driver_login.sql', 'add_payment_options.sql', 'add_merchant_info.sql', 'update_merchants_table.sql',
];
// Ordre d'installation documenté dans GUIDE_SECURITE.md
export const INSTALL_ORDER = ['security_fixes.sql', 'security_fixes_2.sql', 'admin_locations.sql', 'new_features.sql', 'security_fixes_3.sql'];

export const IDS = {
  MERCHANT: '11111111-1111-1111-1111-111111111111',
  OTHER: '22222222-2222-2222-2222-222222222222',
  ADMIN: '33333333-3333-3333-3333-333333333333',
  BOUBOU: 'aaaaaaaa-0000-0000-0000-000000000001',
  MONTRE: 'aaaaaaaa-0000-0000-0000-000000000002',
  DRIVER: 'dddddddd-0000-0000-0000-000000000001',
  DRIVER_2: 'dddddddd-0000-0000-0000-000000000002',
};

const SUPABASE_ENV = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
  CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255), raw_user_meta_data JSONB, created_at TIMESTAMPTZ DEFAULT now(), last_sign_in_at TIMESTAMPTZ);
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
  CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN);
  CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  CREATE FUNCTION public.uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
  GRANT USAGE ON SCHEMA public, auth, storage, extensions TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth, storage TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
  GRANT INSERT, SELECT ON storage.objects TO authenticated;
`;

const SEED = `
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ('${IDS.MERCHANT}', 'awa@test.sn', '{"shop_name":"Chez Awa","phone_number":"77 123 45 67"}'),
    ('${IDS.OTHER}', 'ali@test.sn', '{"shop_name":"Chez Ali","phone_number":"772"}'),
    ('${IDS.ADMIN}', 'boss@test.sn', '{"shop_name":"Admin","phone_number":"773"}');
  INSERT INTO public.platform_admins (user_id) VALUES ('${IDS.ADMIN}') ON CONFLICT DO NOTHING;
  INSERT INTO public.products (id, merchant_id, name, price_fcfa, stock, category) VALUES
    ('${IDS.BOUBOU}', '${IDS.MERCHANT}', 'Boubou', 25000, 10, 'Vêtements'),
    ('${IDS.MONTRE}', '${IDS.OTHER}', 'Montre Ali', 18000, 5, 'Montres & Bijoux');
  INSERT INTO public.drivers (id, merchant_id, full_name, phone_number, cni_number) VALUES
    ('${IDS.DRIVER}', '${IDS.MERCHANT}', 'Mamadou', '770000001', 'CNI-1'),
    ('${IDS.DRIVER_2}', '${IDS.MERCHANT}', 'Lamine', '770000002', 'CNI-2');
`;

export async function createDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_ENV);
  for (const file of BASE_SCRIPTS) {
    try { await db.exec(read(file)); } catch { /* scripts historiques partiellement redondants */ }
  }
  const installErrors = [];
  for (const file of INSTALL_ORDER) {
    try { await db.exec(read(file)); } catch (e) { installErrors.push(`${file} : ${e.message}`); }
  }
  await db.exec(SEED);

  // Joue un rôle Supabase : visiteur, marchand connecté (sub), serveur. `aal2` = double authentification validée.
  const as = async (role, sub = null, { ip = '1.1.1.1', aal = 'aal1' } = {}) => {
    await db.exec('RESET ROLE');
    const claims = JSON.stringify(sub ? { role, sub, aal } : { role });
    await db.query(`SELECT set_config('request.jwt.claims', $1, false), set_config('request.headers', $2, false)`, [claims, JSON.stringify({ 'x-forwarded-for': ip })]);
    await db.exec(`SET ROLE ${role}`);
  };
  // Service d'authentification de Supabase (création des comptes) : droits complets.
  const asAuthService = async () => {
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('request.jwt.claims', '', false)`);
  };
  const query = async (sql, params) => (await db.query(sql, params)).rows;
  // Comme query, mais renvoie l'erreur au lieu de la lever.
  const attempt = async (sql, params) => {
    try { return { rows: await query(sql, params) }; } catch (e) { return { error: e.message }; }
  };
  // Valeur unique : SELECT f(...) AS v
  const value = async (sql, params) => (await query(sql, params))[0]?.v;

  return { db, as, asAuthService, query, attempt, value, installErrors, close: () => db.close() };
}

export const cart = (productId = IDS.BOUBOU, { price = 1, quantity = 2, name = 'Boubou (M)' } = {}) =>
  JSON.stringify([{ product_id: productId, name, price, quantity }]);

export const isDenied = (result) => /permission denied/.test(result.error || '');
