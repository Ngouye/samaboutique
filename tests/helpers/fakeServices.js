// Faux Supabase (API REST) et faux PayDunya, lancés en local pour tester le serveur de paiement
// sans toucher aux vrais services.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});

const readRaw = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});
const readBody = async (req) => {
  const data = (await readRaw(req)).toString('utf8');
  return data ? JSON.parse(data) : null;
};

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

// Filtres PostgREST utilisés par le serveur : col=eq.valeur, col=in.(a,b)
function matches(row, params) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq' && String(row[key]) !== value) return false;
    if (op === 'gte' && !(String(row[key]) >= value)) return false;
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, '')).includes(String(row[key]))) return false;
  }
  return true;
}

// initial.users : { jeton: { id, email } } pour simuler les sessions (GET /auth/v1/user).
export async function startFakeSupabase(initial) {
  const { users = {}, ...tables } = initial;
  const db = structuredClone(tables);
  const log = [];
  // state.failNextInsert = { code, message } : la prochaine insertion est refusée comme par un déclencheur SQL.
  const state = { failNextInsert: null };
  const { server, url } = await listen(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/auth/v1/user') {
      const user = users[(req.headers.authorization || '').replace(/^Bearer /, '')];
      return user ? send(res, 200, { ...user, aud: 'authenticated', role: 'authenticated' }) : send(res, 401, { code: 401, msg: 'invalid JWT' });
    }
    const table = u.pathname.replace('/rest/v1/', '');
    const params = [...u.searchParams.entries()];
    const single = (req.headers.accept || '').includes('vnd.pgrst.object');
    const body = await readBody(req);
    log.push({ method: req.method, table, params: Object.fromEntries(params), body });
    const rows = db[table] || (db[table] = []);

    if (req.method === 'HEAD') {
      // select(..., { count: 'exact', head: true }) : le total est dans l'en-tête Content-Range
      const found = rows.filter((r) => matches(r, params));
      res.writeHead(200, { 'content-range': `*/${found.length}` });
      return res.end();
    }
    if (req.method === 'GET') {
      const found = rows.filter((r) => matches(r, params));
      if (single) return found.length === 1 ? send(res, 200, found[0]) : send(res, 406, { code: 'PGRST116', message: 'not found' });
      return send(res, 200, found);
    }
    if (req.method === 'POST') {
      if (state.failNextInsert) {
        const refusal = state.failNextInsert;
        state.failNextInsert = null;
        return send(res, 400, { details: null, hint: null, ...refusal });
      }
      const inserted = (Array.isArray(body) ? body : [body]).map((r) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...r }));
      rows.push(...inserted);
      return single ? send(res, 201, inserted[0]) : send(res, 201, inserted);
    }
    if (req.method === 'PATCH') {
      const updated = rows.filter((r) => matches(r, params));
      for (const r of updated) Object.assign(r, body);
      return u.searchParams.has('select') ? send(res, 200, updated) : send(res, 204);
    }
    return send(res, 405, { message: 'méthode non gérée' });
  });
  return { url, db, log, state, close: () => server.close() };
}

export async function startFakePaydunya() {
  const state = { invoices: [], payouts: [], confirm: {} };
  const { server, url } = await listen(async (req, res) => {
    const body = await readBody(req);
    if (req.method === 'POST' && req.url.endsWith('/checkout-invoice/create')) {
      const token = `tok_${state.invoices.length + 1}`;
      state.invoices.push({ token, body, headers: req.headers });
      return send(res, 200, { response_code: '00', response_text: `https://paydunya.test/checkout/${token}`, token });
    }
    const confirm = req.url.match(/\/checkout-invoice\/confirm\/(.+)$/);
    if (req.method === 'GET' && confirm) {
      return send(res, 200, state.confirm[decodeURIComponent(confirm[1])] || { response_code: '00', status: 'pending' });
    }
    if (req.method === 'POST' && req.url.endsWith('/direct-pay/credit-account')) {
      state.payouts.push(body);
      return send(res, 200, { response_code: '00', transaction_id: `tr_${state.payouts.length}` });
    }
    return send(res, 404, {});
  });
  return { url, state, close: () => server.close() };
}

// Faux Claude (Messages API) : enregistre les demandes, répond avec state.reply(body).
export async function startFakeAnthropic() {
  const state = { requests: [], reply: null };
  const { server, url } = await listen(async (req, res) => {
    const body = await readBody(req);
    state.requests.push({ url: req.url, headers: req.headers, body });
    if (req.method !== 'POST' || !req.url.startsWith('/v1/messages')) return send(res, 404, {});
    const { status = 200, message } = state.reply(body);
    return send(res, status, message);
  });
  return { url, state, close: () => server.close() };
}

// Réponse Messages API contenant un JSON (sortie structurée).
export const claudeJson = (obj, stop_reason = 'end_turn') => ({
  status: 200,
  message: {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason, stop_sequence: null,
    content: stop_reason === 'refusal' ? [] : [{ type: 'text', text: JSON.stringify(obj) }],
    usage: { input_tokens: 1500, output_tokens: 300 },
  },
});

// Faux Photoroom (POST /v2/edit, multipart) : renvoie une image, ou state.status si défini.
export async function startFakePhotoroom() {
  const state = { requests: [], status: 200 };
  const { server, url } = await listen(async (req, res) => {
    const raw = await readRaw(req);
    state.requests.push({ url: req.url, headers: req.headers, text: raw.toString('latin1') });
    if (state.status !== 200) return send(res, state.status, { detail: 'erreur simulée' });
    res.writeHead(200, { 'content-type': 'image/webp' });
    return res.end(Buffer.from('RIFF0000WEBPimage-retravaillee'));
  });
  return { url, state, close: () => server.close() };
}
