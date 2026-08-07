// Local persistence layer for the Silvergill Operations Portal.
//
// Every screen reads and writes through this module. When the real backend is
// ready, swap the bodies of `read`, `write` and `mutate` for API calls — the
// component layer never touches storage directly and will not need changing.

import * as seed from './seed';

const STORAGE_KEY = 'silvergill.portal.v1';

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

const listeners = new Set();

const clone = (value) => JSON.parse(JSON.stringify(value));

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Backfill any collection added after a user's store was first written.
    let patched = false;
    for (const key of Object.keys(COLLECTIONS)) {
      if (!Array.isArray(parsed[key])) {
        parsed[key] = clone(COLLECTIONS[key]);
        patched = true;
      }
    }
    if (patched) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return null;
  }
}

function freshStore() {
  const store = {};
  for (const [key, value] of Object.entries(COLLECTIONS)) store[key] = clone(value);
  return store;
}

let cache = load() || freshStore();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    // Quota exceeded is realistic here: photos are stored as data URLs.
    console.warn('[portal] could not persist store', err);
  }
  listeners.forEach((fn) => fn());
}

/** Subscribe to any store change. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Read a whole collection (a copy — safe to sort/mutate in a component). */
export function read(collection) {
  return clone(cache[collection] || []);
}

/** Read a single record by id. */
export function find(collection, id) {
  const row = (cache[collection] || []).find((r) => r.id === id);
  return row ? clone(row) : null;
}

/** Replace a whole collection. */
export function write(collection, rows) {
  cache[collection] = clone(rows);
  persist();
}

/** Append a record, generating an id when one is not supplied. */
export function insert(collection, record) {
  const row = { id: record.id || nextId(collection), ...record };
  cache[collection] = [row, ...(cache[collection] || [])];
  persist();
  return clone(row);
}

/** Shallow-merge a patch into one record. */
export function update(collection, id, patch) {
  const rows = cache[collection] || [];
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...patch };
  persist();
  return clone(rows[index]);
}

export function remove(collection, id) {
  cache[collection] = (cache[collection] || []).filter((r) => r.id !== id);
  persist();
}

/** Reset every collection back to seed data. */
export function resetStore() {
  cache = freshStore();
  persist();
}

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
  users: 'u',
};

let counter = 0;

/** Monotonic, human-readable ids. Unique within a session, stable enough for a demo. */
export function nextId(collection) {
  const prefix = ID_PREFIX[collection] || collection.slice(0, 3).toUpperCase();
  counter += 1;
  const stamp = Date.now().toString().slice(-5);
  return `${prefix}-${stamp}${counter}`;
}
