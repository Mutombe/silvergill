// The portal's data layer.
//
// Reads are synchronous against an in-memory cache; writes are optimistic and
// then confirmed by the API. That combination is deliberate. Every screen in
// this portal was written against a synchronous `read()`, and tables, sorting,
// filtering and cross-linking all depend on having the rows in hand at render
// time. Making `read()` async would have meant rewriting every screen and
// scattering spinners through code that has no business knowing about the
// network.
//
// So the network lives here instead:
//
//   hydrate()   pulls everything the signed-in user is allowed to see, once,
//               at sign-in. The server decides what that is — this file asks
//               for collections and takes whatever comes back, which for a
//               customer is their own consignments and nothing else.
//   read()      serves the cache. Unchanged signature, unchanged behaviour.
//   insert()    writes to the cache immediately so the UI moves, then posts.
//               If the post fails the row is rolled back and the failure is
//               announced, rather than sitting in the interface pretending to
//               be saved.
//
// A collection the API does not accept writes for stays local. The server keeps
// its own audit trail; it does not need ours.

import * as seed from './seed';
import { LOCAL_ONLY, TABLE_FOR, get, patch, post } from './api';

const STORAGE_KEY = 'silvergill.portal.v1';

/** Every collection the portal knows about, and the fixture it falls back to. */
const COLLECTIONS = {
  users: seed.users,
  customers: seed.customers,
  shipments: seed.shipments,
  vehicles: seed.vehicles,
  drivers: seed.drivers,
  suppliers: seed.suppliers,
  jobs: seed.jobs,
  supplierInvoices: seed.supplierInvoices,
  pods: seed.pods,
  incidents: seed.incidents,
  fuelLogs: seed.fuelLogs,
  inspections: seed.inspections,
  serviceRecords: seed.serviceRecords,
  quotations: seed.quotations,
  documents: seed.documents,
  syncQueue: seed.syncQueue,
  invoices: seed.invoices,
  bookings: seed.bookings,
  jobCards: seed.jobCards,
  rateRequests: seed.rateRequests,
  auditLog: seed.auditLog,
  notifications: seed.notifications,
  alertRules: seed.alertRules,
  shipmentEvents: seed.shipmentEvents,
  inboxQueue: seed.inboxQueue,
};

/**
 * Collections the API will take a write for. Mirrors the server's WRITABLE map.
 * Anything not here is cache-only: reference data the portal never edits, or a
 * log the server maintains itself.
 */
const SERVER_WRITABLE = new Set([
  'incidents', 'fuelLogs', 'inspections', 'jobCards', 'serviceRecords',
  'quotations', 'bookings', 'documents', 'jobs', 'supplierInvoices',
  'rateRequests', 'inboxQueue', 'shipments', 'alertRules', 'vehicles',
]);

/**
 * Collections whose creation has its own endpoint rather than going through the
 * generic writer, because the server does more than insert a row.
 *
 * A proof of delivery is the example: capturing one also marks the consignment
 * delivered and tells the customer. Doing that from the browser would mean
 * three calls that can half-succeed; doing it in one handler means the
 * consignment is never delivered without its POD, or the reverse.
 */
const CUSTOM_CREATE = {
  pods: { path: '/api/pods', then: ['shipments', 'notifications'] },
};

/**
 * Collections fetched only for staff. Asking as a customer would earn a 403 for
 * no benefit, so we do not ask.
 */
const STAFF_ONLY = new Set(['users', 'customers', 'suppliers', 'drivers', 'auditLog', 'alertRules']);

const listeners = new Set();
const errorListeners = new Set();

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Every collection starts empty except the offline outbox.
 *
 * The fixtures are imported for their shape and for the outbox, not to be
 * shown. Seeding the cache with them would mean a signed-out visitor — or a
 * customer between sign-in and hydration — briefly sees somebody else's
 * consignments. An empty table for a moment is honest; the demo data is not.
 */
function freshStore() {
  const store = {};
  for (const key of Object.keys(COLLECTIONS)) {
    store[key] = LOCAL_ONLY.has(key) ? clone(COLLECTIONS[key]) : [];
  }
  return store;
}

/** Cache-only, cleared on sign-out; nothing sensitive outlives the session. */
let cache = freshStore();
let hydrated = false;

function notify() {
  listeners.forEach((fn) => fn());
}

/** Only the offline outbox is written to disk — it must survive losing signal. */
function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ syncQueue: cache.syncQueue }));
  } catch {
    // Quota exceeded (photos are data URLs). The queue stays in memory.
  }
}

function restoreLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.syncQueue)) cache.syncQueue = parsed.syncQueue;
  } catch {
    // Corrupt store; the fixtures already loaded.
  }
}
restoreLocal();

/** Subscribe to any store change. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Subscribe to write failures, so the shell can tell the user rather than lose them. */
export function onSyncError(fn) {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

function reportError(action, collection, err) {
  const message = err?.message || 'The change could not be saved.';
  console.warn(`[portal] ${action} ${collection} failed:`, message);
  errorListeners.forEach((fn) => fn({ action, collection, message }));
}

/* ===========================================================================
   Hydration
   =========================================================================== */

export const isHydrated = () => hydrated;

/**
 * Load everything this user may see. Collections are fetched in parallel and
 * failures are per-collection: one table being unavailable must not leave the
 * whole portal blank.
 *
 * @param {{ role?: string }} user
 * @returns {Promise<{ loaded: string[], failed: string[] }>}
 */
export async function hydrate(user) {
  const staff = ['admin', 'management', 'ops', 'sales'].includes(user?.role);
  const wanted = Object.keys(TABLE_FOR).filter((key) => {
    if (LOCAL_ONLY.has(key)) return false;
    if (key === 'users') return user?.role === 'admin';
    if (STAFF_ONLY.has(key)) return staff;
    return true;
  });

  const loaded = [];
  const failed = [];

  await Promise.all(
    wanted.map(async (collection) => {
      try {
        const rows = await get(`/api/${TABLE_FOR[collection]}`);
        cache[collection] = Array.isArray(rows) ? rows : [];
        loaded.push(collection);
      } catch (err) {
        // 403 is a legitimate answer — this account simply has no such rows.
        if (err?.status === 403) {
          cache[collection] = [];
          loaded.push(collection);
          return;
        }
        failed.push(collection);
        reportError('load', collection, err);
      }
    })
  );

  // Anything not fetched (reference data a customer cannot read) must not show
  // the demo fixtures — an empty table is truthful, stale sample data is not.
  for (const key of Object.keys(COLLECTIONS)) {
    if (LOCAL_ONLY.has(key)) continue;
    if (!loaded.includes(key) && !failed.includes(key)) cache[key] = [];
  }

  hydrated = true;
  notify();
  return { loaded, failed };
}

/** Drop everything but the offline outbox. Called on sign-out. */
export function clearStore() {
  const queue = cache.syncQueue;
  cache = freshStore();
  cache.syncQueue = queue;
  hydrated = false;
  notify();
}

/** Re-fetch a single collection — used after a write the server may have altered. */
export async function refresh(collection) {
  const table = TABLE_FOR[collection];
  if (!table) return;
  try {
    const rows = await get(`/api/${table}`);
    cache[collection] = Array.isArray(rows) ? rows : [];
    notify();
  } catch (err) {
    reportError('refresh', collection, err);
  }
}

/* ===========================================================================
   Reads — synchronous, against the cache
   =========================================================================== */

/** Read a whole collection (a copy — safe to sort/mutate in a component). */
export function read(collection) {
  return clone(cache[collection] || []);
}

/** Read a single record by id. */
export function find(collection, id) {
  const row = (cache[collection] || []).find((r) => r.id === id);
  return row ? clone(row) : null;
}

/* ===========================================================================
   Writes — optimistic locally, confirmed by the API
   =========================================================================== */

/** Replace a whole collection in the cache. Does not reach the server. */
export function write(collection, rows) {
  cache[collection] = clone(rows);
  if (LOCAL_ONLY.has(collection)) persistLocal();
  notify();
}

/** Append a record, generating an id when one is not supplied. */
export function insert(collection, record) {
  const row = { id: record.id || nextId(collection), ...record };
  cache[collection] = [row, ...(cache[collection] || [])];
  if (LOCAL_ONLY.has(collection)) persistLocal();
  notify();

  const custom = CUSTOM_CREATE[collection];
  if (custom) {
    post(custom.path, row)
      .then(async (saved) => {
        // The handler did more than insert; pull back whatever it also changed.
        if (saved?.id && saved.id !== row.id) {
          cache[collection] = (cache[collection] || []).map((r) =>
            (r.id === row.id ? { ...r, id: saved.id } : r));
        }
        notify();
        await Promise.all((custom.then || []).map(refresh));
      })
      .catch((err) => {
        cache[collection] = (cache[collection] || []).filter((r) => r.id !== row.id);
        notify();
        reportError('save', collection, err);
      });
  } else if (SERVER_WRITABLE.has(collection)) {
    post(`/api/${TABLE_FOR[collection]}`, row)
      .then((saved) => {
        // Take the server's version: it may have filled defaults or normalised
        // a timestamp, and the cache should agree with the database.
        if (saved?.id) {
          cache[collection] = (cache[collection] || []).map((r) => (r.id === row.id ? saved : r));
          notify();
        }
      })
      .catch((err) => {
        cache[collection] = (cache[collection] || []).filter((r) => r.id !== row.id);
        notify();
        reportError('save', collection, err);
      });
  }

  return clone(row);
}

/**
 * Change the cache without telling the server.
 *
 * For consequences another endpoint already owns — a consignment going
 * Delivered because a POD was captured, say. The row is refreshed from the
 * server moments later; this only stops the interface lagging behind the
 * action the user just took.
 */
export function localUpdate(collection, id, patchFields) {
  const rows = cache[collection] || [];
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...patchFields };
  notify();
  return clone(rows[index]);
}

/** Shallow-merge a patch into one record. */
export function update(collection, id, patchFields) {
  const rows = cache[collection] || [];
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const before = rows[index];
  rows[index] = { ...before, ...patchFields };
  if (LOCAL_ONLY.has(collection)) persistLocal();
  notify();

  if (SERVER_WRITABLE.has(collection)) {
    patch(`/api/${TABLE_FOR[collection]}/${encodeURIComponent(id)}`, patchFields)
      .then((saved) => {
        if (saved?.id) {
          cache[collection] = (cache[collection] || []).map((r) => (r.id === id ? saved : r));
          notify();
        }
      })
      .catch((err) => {
        cache[collection] = (cache[collection] || []).map((r) => (r.id === id ? before : r));
        notify();
        reportError('update', collection, err);
      });
  }

  return clone(rows[index]);
}

export function remove(collection, id) {
  cache[collection] = (cache[collection] || []).filter((r) => r.id !== id);
  if (LOCAL_ONLY.has(collection)) persistLocal();
  notify();
}

/** Reset the offline outbox back to its fixture. Used by the demo controls. */
export function resetStore() {
  cache.syncQueue = clone(COLLECTIONS.syncQueue);
  persistLocal();
  notify();
}

/* ===========================================================================
   Identifiers
   =========================================================================== */

const ID_PREFIX = {
  shipments: 'SHP',
  pods: 'POD',
  incidents: 'INC',
  fuelLogs: 'FL',
  inspections: 'INS',
  quotations: 'QT',
  documents: 'DOC',
  jobs: 'JOB',
  supplierInvoices: 'SINV',
  serviceRecords: 'SVC',
  syncQueue: 'SYNC',
  invoices: 'INV',
  bookings: 'BKG',
  jobCards: 'JC',
  rateRequests: 'RFQ',
  auditLog: 'AUD',
  notifications: 'NTF',
  alertRules: 'ALR',
  shipmentEvents: 'EVT',
  inboxQueue: 'INB',
  vehicles: 'VEH',
  users: 'u',
};

let counter = 0;

/** Monotonic, human-readable ids. Unique within a session. */
export function nextId(collection) {
  const prefix = ID_PREFIX[collection] || collection.slice(0, 3).toUpperCase();
  counter += 1;
  const stamp = Date.now().toString().slice(-5);
  return `${prefix}-${stamp}${counter}`;
}
