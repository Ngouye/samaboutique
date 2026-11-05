// Faux Supabase (API REST) et faux PayDunya, lancés en local pour tester le serveur de paiement
// sans toucher aux vrais services.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const listen = (handler) => new Promise((resolve) => {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
});

const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (c) => { data += c; });
  req.on('end', () => resolve(data ? JSON.parse(data) : null));
});

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
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, '')).includes(String(row[key]))) return false;
  }
  return true;
}

export async function startFakeSupabase(initial) {
  const db = structuredClone(initial);
  const log = [];
  const { server, url } = await listen(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const table = u.pathname.replace('/rest/v1/', '');
    const params = [...u.searchParams.entries()];
    const single = (req.headers.accept || '').includes('vnd.pgrst.object');
    const body = await readBody(req);
    log.push({ method: req.method, table, params: Object.fromEntries(params), body });
    const rows = db[table] || (db[table] = []);

    if (req.method === 'GET') {
      const found = rows.filter((r) => matches(r, params));
      if (single) return found.length === 1 ? send(res, 200, found[0]) : send(res, 406, { code: 'PGRST116', message: 'not found' });
      return send(res, 200, found);
    }
    if (req.method === 'POST') {
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
  return { url, db, log, close: () => server.close() };
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
