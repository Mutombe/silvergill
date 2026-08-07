// Seed the database from the portal's own fixture file.
//
// It imports ../../website/src/portal/data/seed.js directly rather than
// keeping a second copy, so the demo data can never drift out of step with
// what the frontend was built against.
//
// Idempotent: every insert is an upsert keyed on id, so re-running is safe.
// Passwords are hashed here — the plaintext in the fixture never reaches the
// database.

import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool, q } from './db.js';
import { hash } from './auth.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '..', '..', 'website', 'src', 'portal', 'data', 'seed.js');
const seed = await import(pathToFileURL(fixturePath).href);

const J = (v) => JSON.stringify(v ?? null);
let counts = {};

async function upsert(table, columns, rows, mapper) {
  if (!rows?.length) return;
  const cols = columns.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const updates = columns.slice(1).map((c) => `${c} = excluded.${c}`).join(', ');
  const sql = `insert into ${table}(${cols}) values (${placeholders})
               on conflict (id) do update set ${updates}`;
  for (const row of rows) {
    await q(sql, await mapper(row));
  }
  counts[table] = rows.length;
}

async function run() {
  console.log('[seed] loading fixtures from the portal');

  await upsert('customers',
    ['id', 'name', 'bc_no', 'entity', 'terms', 'credit_limit'],
    seed.customers,
    (c) => [c.id, c.name, c.bcNo, c.entity, c.terms, c.creditLimit]);

  await upsert('suppliers',
    ['id', 'name', 'type', 'entity', 'rating', 'bc_no'],
    seed.suppliers,
    (s) => [s.id, s.name, s.type, s.entity, s.rating, s.bcNo]);

  // Drivers before vehicles, then vehicles back-fill the driver's vehicle_id:
  // the two tables reference each other.
  await upsert('drivers',
    ['id', 'name', 'licence', 'expiry', 'entity', 'score', 'phone'],
    seed.drivers,
    (d) => [d.id, d.name, d.licence, d.expiry, d.entity, d.score, d.phone]);

  await upsert('vehicles',
    ['id', 'reg', 'make', 'model', 'year', 'type', 'odometer', 'entity', 'status',
     'driver_id', 'last_service_km', 'service_interval_km', 'fuel_tank_l', 'tyres'],
    seed.vehicles,
    (v) => [v.id, v.reg, v.make, v.model, v.year, v.type, v.odometer, v.entity, v.status,
            v.driverId, v.lastServiceKm, v.serviceIntervalKm, v.fuelTankL, J(v.tyres)]);

  for (const d of seed.drivers) {
    if (d.vehicleId) await q('update drivers set vehicle_id = $1 where id = $2', [d.vehicleId, d.id]);
  }

  await upsert('users',
    ['id', 'name', 'email', 'password_hash', 'role', 'entity', 'title',
     'customer_id', 'supplier_id', 'active', 'created_at'],
    seed.users,
    async (u) => [u.id, u.name, u.email, await hash(u.password), u.role, u.entity, u.title,
                  u.customerId ?? null, u.supplierId ?? null, u.active !== false, u.createdAt]);

  await upsert('shipments',
    ['id', 'customer_id', 'commodity', 'weight_tons', 'origin', 'destination', 'mode', 'port',
     'border', 'vehicle_id', 'driver_id', 'status', 'entity', 'revenue', 'cost',
     'dispatched_at', 'eta_at', 'bc_order_no', 'current_location', 'container_no',
     'truck_reg', 'driver_phone', 'tracking_token'],
    seed.shipments,
    (s) => [s.id, s.customerId, s.commodity, s.weightTons, s.origin, s.destination, s.mode,
            s.port, s.border, s.vehicleId, s.driverId, s.status, s.entity, s.revenue, s.cost,
            s.dispatchedAt, s.etaAt, s.bcOrderNo, s.currentLocation, s.containerNo,
            s.truckReg, s.driverPhone, s.trackingToken]);

  await upsert('shipment_events',
    ['id', 'shipment_id', 'type', 'label', 'location_text', 'status_hint', 'source',
     'confidence', 'approved', 'raw_text', 'matched_by', 'at', 'approved_at'],
    seed.shipmentEvents,
    (e) => [e.id, e.shipmentId, e.type, e.label, e.locationText, e.statusHint, e.source,
            e.confidence, e.approved, e.rawText, e.matchedBy, e.at, e.approvedAt]);

  await upsert('inbox_queue',
    ['id', 'shipment_id', 'source', 'raw_text', 'from_phone', 'matched_by', 'confidence',
     'extraction', 'status', 'received_at'],
    seed.inboxQueue,
    (i) => [i.id, i.shipmentId, i.source, i.rawText, i.fromPhone, i.matchedBy, i.confidence,
            J(i.extraction), i.status, i.receivedAt]);

  await upsert('quotations',
    ['id', 'customer_id', 'commodity', 'origin', 'destination', 'weight_tons', 'mode', 'port',
     'insurance', 'insured_value', 'status', 'total', 'margin', 'created_by', 'created_at'],
    seed.quotations,
    (x) => [x.id, x.customerId, x.commodity, x.origin, x.destination, x.weightTons, x.mode,
            x.port, x.insurance, x.insuredValue, x.status, x.total, x.margin, x.createdBy, x.createdAt]);

  await upsert('invoices',
    ['id', 'customer_id', 'shipment_id', 'entity', 'issued_at', 'due_at', 'amount',
     'paid_amount', 'currency', 'status', 'bc_no', 'lines'],
    seed.invoices,
    (i) => [i.id, i.customerId, i.shipmentId, i.entity, i.issuedAt, i.dueAt, i.amount,
            i.paidAmount, i.currency, i.status, i.bcNo, J(i.lines)]);

  await upsert('bookings',
    ['id', 'customer_id', 'commodity', 'weight_tons', 'origin_code', 'port_code', 'mode_code',
     'ready_date', 'notes', 'reference', 'status', 'raised_by', 'raised_at', 'shipment_id'],
    seed.bookings,
    (b) => [b.id, b.customerId, b.commodity, b.weightTons, b.originCode, b.portCode, b.modeCode,
            b.readyDate, b.notes, b.reference, b.status, b.raisedBy, b.raisedAt, b.shipmentId]);

  await upsert('documents',
    ['id', 'shipment_id', 'type', 'file_name', 'status', 'confidence', 'uploaded_at', 'bc_ref', 'fields'],
    seed.documents,
    (d) => [d.id, d.shipmentId, d.type, d.fileName, d.status, d.confidence, d.uploadedAt, d.bcRef, J(d.fields)]);

  await upsert('jobs',
    ['id', 'shipment_id', 'supplier_id', 'description', 'status', 'value', 'currency', 'issued_at', 'due_at'],
    seed.jobs,
    (j) => [j.id, j.shipmentId, j.supplierId, j.description, j.status, j.value, j.currency, j.issuedAt, j.dueAt]);

  await upsert('supplier_invoices',
    ['id', 'supplier_id', 'job_id', 'invoice_number', 'amount', 'currency', 'status',
     'submitted_at', 'notes', 'bc_ref'],
    seed.supplierInvoices,
    (i) => [i.id, i.supplierId, i.jobId, i.invoiceNumber, i.amount, i.currency, i.status,
            i.submittedAt, i.notes, i.bcRef]);

  await upsert('rate_requests',
    ['id', 'lane', 'commodity', 'weight_tons', 'mode_code', 'needed_by', 'status',
     'raised_by', 'raised_at', 'invited', 'responses', 'awarded_to'],
    seed.rateRequests,
    (r) => [r.id, r.lane, r.commodity, r.weightTons, r.modeCode, r.neededBy, r.status,
            r.raisedBy, r.raisedAt, J(r.invited), J(r.responses), r.awardedTo ?? null]);

  await upsert('job_cards',
    ['id', 'vehicle_id', 'status', 'priority', 'fault', 'odometer', 'parts',
     'labour_hours', 'labour_rate', 'raised_by', 'raised_at', 'completed_at'],
    seed.jobCards,
    (c) => [c.id, c.vehicleId, c.status, c.priority, c.fault, c.odometer, J(c.parts),
            c.labourHours, c.labourRate, c.raisedBy, c.raisedAt, c.completedAt]);

  await upsert('service_records',
    ['id', 'vehicle_id', 'type', 'odometer', 'cost', 'performed_at', 'notes'],
    seed.serviceRecords,
    (s) => [s.id, s.vehicleId, s.type, s.odometer, s.cost, s.performedAt, s.notes]);

  await upsert('fuel_logs',
    ['id', 'vehicle_id', 'driver_id', 'litres', 'cost', 'odometer', 'station', 'logged_at', 'synced'],
    seed.fuelLogs,
    (f) => [f.id, f.vehicleId, f.driverId, f.litres, f.cost, f.odometer, f.station, f.loggedAt, f.synced]);

  await upsert('inspections',
    ['id', 'vehicle_id', 'driver_id', 'odometer', 'checks', 'notes', 'photos', 'inspected_at', 'synced'],
    seed.inspections,
    (i) => [i.id, i.vehicleId, i.driverId, i.odometer, J(i.checks), i.notes, J(i.photos), i.inspectedAt, i.synced]);

  await upsert('incidents',
    ['id', 'shipment_id', 'vehicle_id', 'driver_id', 'type', 'severity', 'description',
     'location', 'photos', 'status', 'reported_at', 'synced'],
    seed.incidents,
    (i) => [i.id, i.shipmentId, i.vehicleId, i.driverId, i.type, i.severity, i.description,
            i.location, J(i.photos), i.status, i.reportedAt, i.synced]);

  await upsert('pods',
    ['id', 'shipment_id', 'driver_id', 'received_by', 'notes', 'photos', 'signature',
     'lat', 'lng', 'captured_at', 'synced'],
    seed.pods,
    (p) => [p.id, p.shipmentId, p.driverId, p.receivedBy, p.notes, J(p.photos), p.signature,
            p.lat, p.lng, p.capturedAt, p.synced]);

  await upsert('notifications',
    ['id', 'for_roles', 'for_user_id', 'severity', 'title', 'body', 'link', 'read', 'at'],
    seed.notifications,
    (n) => [n.id, J(n.forRoles), n.forUserId, n.severity, n.title, n.body, n.link, n.read, n.at]);

  await upsert('audit_log',
    ['id', 'user_id', 'user_name', 'role', 'action', 'entity', 'summary', 'at'],
    seed.auditLog,
    (a) => [a.id, a.userId, a.userName, a.role, a.action, a.entity, a.summary, a.at]);

  await upsert('alert_rules',
    ['id', 'name', 'metric', 'target', 'comparator', 'threshold', 'channel', 'active'],
    seed.alertRules,
    (r) => [r.id, r.name, r.metric, r.target, r.comparator, r.threshold, r.channel, r.active]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`[seed] ${total} rows across ${Object.keys(counts).length} tables`);
  for (const [t, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(4)}  ${t}`);
}

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
