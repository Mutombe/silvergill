// Business Central integration boundary.
//
// Everything the portal pushes into Business Central goes through this module.
// Right now each call resolves against the local store and records an entry in
// the sync queue so the UI can show real sync state, retries and failures.
//
// To go live, replace `dispatch` with an authenticated call to the BC OData v4
// endpoint (typically POST /v2.0/{tenant}/{env}/api/v2.0/companies({id})/...)
// and keep the queue semantics — the offline behaviour in the field app depends
// on them.

import * as db from './db';

export const BC_ENDPOINTS = {
  pod: 'salesShipments/{no}/proofOfDelivery',
  incident: 'serviceOrders',
  fuelLog: 'itemJournalLines',
  inspection: 'serviceItemLines',
  quotation: 'salesQuotes',
  document: 'purchaseInvoices',
  jobStatus: 'purchaseOrders/{no}',
  supplierInvoice: 'purchaseInvoices',
};

/** Is the browser currently online? The field app keys its whole UX off this. */
export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Queue a record for posting into Business Central.
 * Always returns immediately — callers never block on connectivity.
 */
export function enqueue({ entity, endpoint, recordId, payload, label }) {
  return db.insert('syncQueue', {
    entity,
    endpoint: endpoint || BC_ENDPOINTS[entity] || 'unknown',
    recordId,
    label,
    payload,
    status: 'pending',
    attempts: 0,
    queuedAt: new Date().toISOString(),
    postedAt: null,
    error: null,
  });
}

/**
 * Attempt to flush the queue. Resolves with a summary.
 * Offline is not an error — the items simply stay queued.
 */
export async function flushQueue() {
  if (!isOnline()) {
    return { attempted: 0, posted: 0, failed: 0, offline: true };
  }

  const pending = db.read('syncQueue').filter((item) => item.status !== 'posted');
  let posted = 0;
  let failed = 0;

  for (const item of pending) {
    // Simulated round trip. Replace with the real fetch to BC.
    await new Promise((resolve) => setTimeout(resolve, 220));
    const result = await dispatch(item);

    if (result.ok) {
      posted += 1;
      db.update('syncQueue', item.id, {
        status: 'posted',
        attempts: item.attempts + 1,
        postedAt: new Date().toISOString(),
        bcRef: result.bcRef,
        error: null,
      });
      markSourceSynced(item, result.bcRef);
    } else {
      failed += 1;
      db.update('syncQueue', item.id, {
        status: 'failed',
        attempts: item.attempts + 1,
        error: result.error,
      });
    }
  }

  return { attempted: pending.length, posted, failed, offline: false };
}

// --- Replace everything below this line with real BC calls -------------------

async function dispatch(item) {
  // A real implementation would POST item.payload to item.endpoint with an
  // OAuth bearer token and return the BC document number from the response.
  const bcRef = `BC-${item.entity.toUpperCase().slice(0, 3)}-${Math.floor(100000 + hash(item.id) % 899999)}`;
  return { ok: true, bcRef };
}

/** Flip the `synced` flag on the record the queue entry came from. */
function markSourceSynced(item, bcRef) {
  const collection = {
    pod: 'pods',
    incident: 'incidents',
    fuelLog: 'fuelLogs',
    inspection: 'inspections',
    quotation: 'quotations',
    document: 'documents',
  }[item.entity];

  if (!collection || !item.recordId) return;
  db.update(collection, item.recordId, { synced: true, bcRef });
}

/** Deterministic small hash so demo reference numbers are stable per record. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pendingCount() {
  return db.read('syncQueue').filter((item) => item.status !== 'posted').length;
}
