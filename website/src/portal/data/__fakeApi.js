/* eslint-disable no-console */
// An in-memory stand-in for the Silvergill API, for the jsdom suites.
//
// It is not a mock in the usual sense — it does not stub out `api.js` or
// `db.js`. It replaces `fetch`, so the tests exercise the real client, the
// real hydration, the real AuthContext, and the real row-level filtering the
// screens depend on. The only thing it fakes is the wire.
//
// The scoping rules below deliberately mirror server/src/auth.js. If the two
// ever disagree, that disagreement is worth finding here rather than in
// production — so keep them in step.

import * as seed from './seed';

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Table name over the wire → fixture collection. */
const TABLES = {
  users: 'users',
  customers: 'customers',
  suppliers: 'suppliers',
  drivers: 'drivers',
  vehicles: 'vehicles',
  shipments: 'shipments',
  shipment_events: 'shipmentEvents',
  inbox_queue: 'inboxQueue',
  quotations: 'quotations',
  invoices: 'invoices',
  bookings: 'bookings',
  documents: 'documents',
  jobs: 'jobs',
  supplier_invoices: 'supplierInvoices',
  rate_requests: 'rateRequests',
  job_cards: 'jobCards',
  service_records: 'serviceRecords',
  fuel_logs: 'fuelLogs',
  inspections: 'inspections',
  incidents: 'incidents',
  pods: 'pods',
  notifications: 'notifications',
  audit_log: 'auditLog',
  alert_rules: 'alertRules',
};

let store = {};
const tokens = new Map();
let counter = 0;

/** The backing rows, so a suite can arrange a state the API has no route for. */
export const fakeStore = () => store;

export function resetFakeApi() {
  store = {};
  for (const collection of Object.values(TABLES)) store[collection] = clone(seed[collection] || []);
  tokens.clear();
}
resetFakeApi();

const strip = (u) => {
  const { password, ...safe } = u;
  return safe;
};

/** Mirrors scopeFor() on the server. */
function scoped(user, table) {
  const rows = store[TABLES[table]] || [];
  if (['admin', 'management', 'ops', 'sales'].includes(user.role)) return rows;

  const mine = (ids) => rows.filter((r) => ids.includes(r.shipmentId));

  if (user.role === 'client') {
    const shipmentIds = store.shipments
      .filter((s) => s.customerId === user.customerId)
      .map((s) => s.id);
    switch (table) {
      case 'shipments': case 'quotations': case 'invoices': case 'bookings':
        return rows.filter((r) => r.customerId === user.customerId);
      case 'documents': case 'pods': case 'shipment_events':
        return mine(shipmentIds);
      default: return [];
    }
  }

  if (user.role === 'supplier') {
    switch (table) {
      case 'jobs': case 'supplier_invoices':
        return rows.filter((r) => r.supplierId === user.supplierId);
      case 'rate_requests':
        return rows.filter((r) => (r.invited || []).includes(user.supplierId));
      default: return [];
    }
  }

  if (user.role === 'driver') {
    switch (table) {
      case 'shipments': {
        const ids = store.drivers
          .filter((d) => d.name.toLowerCase() === user.name.toLowerCase())
          .map((d) => d.id);
        return rows.filter((r) => ids.includes(r.driverId));
      }
      case 'vehicles': case 'incidents': case 'fuel_logs': case 'inspections': case 'pods':
        return rows;
      default: return [];
    }
  }

  return [];
}

const json = (status, body) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  });

function handle(path, method, body, token) {
  const url = path.replace(/^https?:\/\/[^/]+/, '');
  const parts = url.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (url === '/api/health') return json(200, { ok: true, db: true, ai: false });

  /* ---- auth ---- */
  if (url === '/api/auth/login' && method === 'POST') {
    const match = store.users.find(
      (u) => u.email.toLowerCase() === String(body?.email || '').trim().toLowerCase()
    );
    if (!match || match.password !== body?.password) {
      return json(401, { error: 'Those credentials were not recognised.' });
    }
    if (match.active === false) {
      return json(403, { error: 'This account has been deactivated. Contact your administrator.' });
    }
    counter += 1;
    const issued = `fake-token-${counter}`;
    tokens.set(issued, match.id);
    return json(200, { token: issued, user: strip(match) });
  }

  const userId = token ? tokens.get(token) : null;
  const user = userId ? store.users.find((u) => u.id === userId) : null;
  const authed = user && user.active !== false;

  /* ---- public tracker ---- */
  if (parts[0] === 'track') {
    const found = store.shipments.find((s) => s.trackingToken === decodeURIComponent(parts[1] || ''));
    if (!found) return json(404, { error: 'not found' });
    const safe = {};
    for (const k of ['id', 'origin', 'destination', 'status', 'mode', 'weightTons', 'port',
                     'border', 'currentLocation', 'containerNo', 'dispatchedAt', 'etaAt',
                     'trackingToken']) safe[k] = found[k];
    return json(200, {
      shipment: safe,
      events: store.shipmentEvents
        .filter((e) => e.shipmentId === found.id && e.approved)
        .map((e) => ({ id: e.id, type: e.type, label: e.label, locationText: e.locationText, at: e.at }))
        .sort((a, b) => new Date(b.at) - new Date(a.at)),
    });
  }

  if (!authed) return json(401, { error: 'authentication required' });

  if (url === '/api/auth/me') return json(200, { user: strip(user) });
  if (url === '/api/auth/logout') return json(200, { ok: true });

  /* ---- notifications ---- */
  if (parts[0] === 'notifications') {
    if (method === 'GET') {
      return json(200, store.notifications.filter(
        (n) => n.forUserId === user.id || (n.forRoles || []).includes(user.role)
      ));
    }
    return json(200, { ok: true });
  }

  if (parts[0] === 'users' && method === 'GET') {
    if (user.role !== 'admin') return json(403, { error: 'not permitted for your role' });
    return json(200, store.users.map(strip));
  }

  /* ---- generic reads ---- */
  const collection = TABLES[parts[0]];
  if (collection && method === 'GET') {
    const rows = scoped(user, parts[0]);
    if (!parts[1]) return json(200, rows);
    const row = rows.find((r) => r.id === decodeURIComponent(parts[1]));
    if (!row) {
      const exists = (store[collection] || []).some((r) => r.id === decodeURIComponent(parts[1]));
      return json(exists ? 403 : 404, { error: exists ? 'not available on your profile' : 'not found' });
    }
    return json(200, row);
  }

  /* ---- writes ---- */
  if (collection && method === 'POST') {
    const row = { id: body?.id || `${parts[0]}-${(counter += 1)}`, ...body };
    if (user.role === 'client' && parts[0] === 'bookings') row.customerId = user.customerId;
    store[collection] = [row, ...store[collection]];
    return json(201, row);
  }
  if (collection && method === 'PATCH' && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    const i = store[collection].findIndex((r) => r.id === id);
    if (i === -1) return json(404, { error: 'not found' });
    store[collection][i] = { ...store[collection][i], ...body };
    return json(200, store[collection][i]);
  }

  return json(404, { error: 'no such endpoint' });
}

/** Install the stub. Returns a function that puts the real fetch back. */
export function installFakeApi() {
  const real = globalThis.fetch;
  globalThis.fetch = (input, init = {}) => {
    const path = typeof input === 'string' ? input : input.url;
    const token = (init.headers?.Authorization || '').replace(/^Bearer /, '') || null;
    const body = init.body ? JSON.parse(init.body) : undefined;
    return handle(path, init.method || 'GET', body, token);
  };
  return () => { globalThis.fetch = real; };
}
