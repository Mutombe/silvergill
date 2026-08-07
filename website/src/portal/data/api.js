// The one place the portal talks to the network.
//
// Everything above this file — every screen, every table, every form — is
// unchanged whether it is reading a local fixture or a Postgres row eight
// thousand kilometres away. That is the point: the seam is here, and it is
// thin.

/**
 * Where the API lives. Set VITE_API_URL at build time; an empty value means
 * same-origin, which is what a reverse-proxied deployment wants.
 *
 * Guarded because `import.meta.env` only exists under Vite — the test harness
 * bundles these modules for plain Node, and a bare access throws there.
 */
const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';

/** No trailing slash, so `${BASE}/api/...` never doubles up. */
export const API_BASE = String(RAW_BASE).replace(/\/+$/, '');

const TOKEN_KEY = 'silvergill.portal.token';

let token = null;
try {
  token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

export const getToken = () => token;

/**
 * Store the session token. `remember` decides whether it survives closing the
 * tab; the other store is cleared either way so two tokens can never disagree.
 */
export function setToken(value, remember = false) {
  token = value || null;
  try {
    const keep = remember ? localStorage : sessionStorage;
    const drop = remember ? sessionStorage : localStorage;
    drop.removeItem(TOKEN_KEY);
    if (value) keep.setItem(TOKEN_KEY, value);
    else keep.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing with storage disabled: the token still works for this
    // page, it just will not survive a reload.
  }
}

/** Raised for any non-2xx response, carrying the status so callers can branch. */
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const unauthorisedHandlers = new Set();

/** Called when the server rejects our token, so the app can sign out cleanly. */
export function onUnauthorised(fn) {
  unauthorisedHandlers.add(fn);
  return () => unauthorisedHandlers.delete(fn);
}

export async function request(path, { method = 'GET', body, signal, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // A cold free-tier dyno, a dropped connection, a captive portal — all the
    // same to the caller, and all worth saying plainly.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, null);
  }

  if (response.status === 204) return null;

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      setToken(null);
      unauthorisedHandlers.forEach((fn) => fn());
    }
    throw new ApiError(payload?.error || `Request failed (${response.status})`, response.status, payload);
  }

  return payload;
}

export const get = (path, opts) => request(path, { ...opts, method: 'GET' });
export const post = (path, body, opts) => request(path, { ...opts, method: 'POST', body });
export const patch = (path, body, opts) => request(path, { ...opts, method: 'PATCH', body });

/* ===========================================================================
   Collection names ↔ API tables
   The portal has always called these collections in camelCase; the database
   calls them tables in snake_case. This map is the whole translation.
   =========================================================================== */

export const TABLE_FOR = {
  users: 'users',
  customers: 'customers',
  suppliers: 'suppliers',
  drivers: 'drivers',
  vehicles: 'vehicles',
  shipments: 'shipments',
  shipmentEvents: 'shipment_events',
  inboxQueue: 'inbox_queue',
  quotations: 'quotations',
  invoices: 'invoices',
  bookings: 'bookings',
  documents: 'documents',
  jobs: 'jobs',
  supplierInvoices: 'supplier_invoices',
  rateRequests: 'rate_requests',
  jobCards: 'job_cards',
  serviceRecords: 'service_records',
  fuelLogs: 'fuel_logs',
  inspections: 'inspections',
  incidents: 'incidents',
  pods: 'pods',
  notifications: 'notifications',
  auditLog: 'audit_log',
  alertRules: 'alert_rules',
};

/** Collections that live only in the browser — the offline outbox is ours alone. */
export const LOCAL_ONLY = new Set(['syncQueue']);
