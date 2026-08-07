// Entity registry — the backbone of cross-linking.
//
// Every record type is declared once, here: where its detail page lives, how to
// title it, which fields it shows, and which other records it connects to. The
// generic detail page, the link component and the breadcrumb trail all read
// from this, so adding a relationship means adding one line — not a new screen.
//
// Route grammar is fixed: /portal/records/<entity>/:id. One shape, always.

import * as db from './data/db';
import {
  commodities, ports, transportModes, borders, ROLE_LABELS,
} from './data/seed';

export const RECORD_BASE = '/portal/records';

/** The canonical address of any record. The only place a detail URL is built. */
export const recordPath = (entity, id) =>
  entity && id ? `${RECORD_BASE}/${entity}/${encodeURIComponent(id)}` : null;

const lookup = (collection, id) => (id ? db.find(collection, id) : null);
const nameOf = (collection, id, field = 'name') => lookup(collection, id)?.[field] ?? null;

const commodityName = (code) => commodities.find((c) => c.code === code)?.name ?? code;
const portName = (code) => {
  const p = ports.find((x) => x.code === code);
  return p ? `${p.name}, ${p.country}` : code;
};
const modeName = (code) => transportModes.find((m) => m.code === code)?.name ?? code;
const borderName = (code) => borders.find((b) => b.code === code)?.name ?? code;

/**
 * Each entry declares:
 *   collection  which store collection holds it
 *   label       singular, for breadcrumbs and headings
 *   plural      for the list breadcrumb
 *   icon        lucide icon name
 *   listPath    the module screen this record belongs to
 *   roles       who may open the detail page (null = anyone signed in)
 *   title       the headline string
 *   subtitle    one line under it
 *   status      a value for the header badge
 *   fields      [label, value, linkTo?] — linkTo is [entity, id]
 *   related     sections of connected records
 *   scope       optional row-level guard: (record, auth) => boolean
 */
export const ENTITIES = {
  /* ===================== Consignments ===================== */
  shipments: {
    collection: 'shipments',
    label: 'Consignment',
    plural: 'Consignments',
    icon: 'Ship',
    listPath: '/portal/tracking',
    title: (r) => r.id,
    subtitle: (r) => `${r.origin} → ${r.destination}`,
    status: (r) => r.status,
    scope: (r, auth) =>
      auth.role === 'client' ? r.customerId === auth.customerId : true,
    fields: (r) => [
      ['Customer', nameOf('customers', r.customerId), ['customers', r.customerId]],
      ['Commodity', commodityName(r.commodity)],
      ['Weight', `${r.weightTons} tonnes`],
      ['Transport mode', modeName(r.mode)],
      ['Origin', r.origin],
      ['Destination', r.destination],
      ['Port', portName(r.port)],
      ['Border', r.border ? borderName(r.border) : null],
      ['Current location', r.currentLocation],
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Driver phone', r.driverPhone],
      ['Container', r.containerNo],
      ['Dispatched', r.dispatchedAt, null, 'date'],
      ['Planned ETA', r.etaAt, null, 'date'],
      ['Tracking reference', r.trackingToken],
      ['BC sales order', r.bcOrderNo],
      ['Entity', r.entity],
    ],
    related: (r) => [
      { entity: 'shipmentEvents', title: 'Event history', rows: db.read('shipmentEvents').filter((e) => e.shipmentId === r.id) },
      { entity: 'documents', title: 'Documents', rows: db.read('documents').filter((d) => d.shipmentId === r.id) },
      { entity: 'invoices', title: 'Invoices', rows: db.read('invoices').filter((i) => i.shipmentId === r.id) },
      { entity: 'jobs', title: 'Contractor work orders', rows: db.read('jobs').filter((j) => j.shipmentId === r.id) },
      { entity: 'incidents', title: 'Incidents', rows: db.read('incidents').filter((i) => i.shipmentId === r.id) },
      { entity: 'pods', title: 'Proof of delivery', rows: db.read('pods').filter((p) => p.shipmentId === r.id) },
    ],
  },

  /* ===================== Customers ===================== */
  customers: {
    collection: 'customers',
    label: 'Customer',
    plural: 'Customers',
    icon: 'Building2',
    listPath: '/portal/group',
    roles: ['ops', 'sales', 'management', 'admin'],
    title: (r) => r.name,
    subtitle: (r) => `${r.bcNo} · ${r.entity}`,
    fields: (r) => [
      ['Business Central account', r.bcNo],
      ['Entity', r.entity],
      ['Payment terms', r.terms],
      ['Credit limit', r.creditLimit, null, 'money'],
    ],
    related: (r) => [
      { entity: 'shipments', title: 'Consignments', rows: db.read('shipments').filter((s) => s.customerId === r.id) },
      { entity: 'quotations', title: 'Quotations', rows: db.read('quotations').filter((q) => q.customerId === r.id) },
      { entity: 'invoices', title: 'Invoices', rows: db.read('invoices').filter((i) => i.customerId === r.id) },
      { entity: 'bookings', title: 'Booking requests', rows: db.read('bookings').filter((b) => b.customerId === r.id) },
      { entity: 'users', title: 'Portal users', rows: db.read('users').filter((u) => u.customerId === r.id) },
    ],
  },

  /* ===================== Quotations ===================== */
  quotations: {
    collection: 'quotations',
    label: 'Quotation',
    plural: 'Quotations',
    icon: 'Calculator',
    listPath: '/portal/quotations',
    title: (r) => r.id,
    subtitle: (r) => `${r.origin} → ${r.destination}`,
    status: (r) => r.status,
    scope: (r, auth) => (auth.role === 'client' ? r.customerId === auth.customerId : true),
    fields: (r) => [
      ['Customer', nameOf('customers', r.customerId), ['customers', r.customerId]],
      ['Commodity', commodityName(r.commodity)],
      ['Weight', `${r.weightTons} tonnes`],
      ['Transport mode', modeName(r.mode)],
      ['Origin', r.origin],
      ['Destination', r.destination],
      ['Insurance', r.insurance ? 'Included' : 'Not included'],
      ['Declared value', r.insurance ? r.insuredValue : null, null, 'money'],
      ['Quoted total', r.total, null, 'money'],
      ['Margin', r.margin, null, 'pct'],
      ['Raised', r.createdAt, null, 'date'],
      ['Raised by', nameOf('users', r.createdBy), ['users', r.createdBy]],
    ],
    related: () => [],
  },

  /* ===================== Invoices ===================== */
  invoices: {
    collection: 'invoices',
    label: 'Invoice',
    plural: 'Invoices',
    icon: 'ReceiptText',
    listPath: '/portal/admin',
    title: (r) => r.id,
    subtitle: (r) => nameOf('customers', r.customerId),
    status: (r) => r.status,
    scope: (r, auth) => (auth.role === 'client' ? r.customerId === auth.customerId : true),
    fields: (r) => [
      ['Customer', nameOf('customers', r.customerId), ['customers', r.customerId]],
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Issued', r.issuedAt, null, 'date'],
      ['Due', r.dueAt, null, 'date'],
      ['Invoice total', r.amount, null, 'money'],
      ['Received', r.paidAmount, null, 'money'],
      ['Balance', (r.amount ?? 0) - (r.paidAmount ?? 0), null, 'money'],
      ['BC document', r.bcNo],
      ['Entity', r.entity],
    ],
    lines: (r) => r.lines || [],
    related: () => [],
  },

  /* ===================== Documents ===================== */
  documents: {
    collection: 'documents',
    label: 'Document',
    plural: 'Documents',
    icon: 'FileText',
    listPath: '/portal/documents',
    title: (r) => r.fileName,
    subtitle: (r) => r.type,
    status: (r) => r.status,
    fields: (r) => [
      ['Type', r.type],
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Extraction confidence', r.confidence != null ? Math.round(r.confidence * 100) : null, null, 'pct0'],
      ['Filed', r.uploadedAt, null, 'datetime'],
      ['BC reference', r.bcRef],
    ],
    extracted: (r) => r.fields || {},
    related: () => [],
  },

  /* ===================== Vehicles ===================== */
  vehicles: {
    collection: 'vehicles',
    label: 'Vehicle',
    plural: 'Fleet',
    icon: 'Truck',
    listPath: '/portal/fleet',
    roles: ['ops', 'management', 'admin', 'driver'],
    title: (r) => r.reg,
    subtitle: (r) => `${r.make} ${r.model} · ${r.year}`,
    status: (r) => r.status,
    fields: (r) => [
      ['Registration', r.reg],
      ['Make & model', `${r.make} ${r.model}`],
      ['Year', r.year],
      ['Type', r.type],
      ['Odometer', r.odometer, null, 'km'],
      ['Entity', r.entity],
      ['Assigned driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Last service', r.lastServiceKm, null, 'km'],
      ['Service interval', r.serviceIntervalKm, null, 'km'],
      ['Tank capacity', r.fuelTankL ? `${r.fuelTankL} L` : null],
    ],
    related: (r) => [
      { entity: 'jobCards', title: 'Workshop job cards', rows: db.read('jobCards').filter((j) => j.vehicleId === r.id) },
      { entity: 'serviceRecords', title: 'Service history', rows: db.read('serviceRecords').filter((s) => s.vehicleId === r.id) },
      { entity: 'fuelLogs', title: 'Fuel logs', rows: db.read('fuelLogs').filter((f) => f.vehicleId === r.id) },
      { entity: 'inspections', title: 'Inspections', rows: db.read('inspections').filter((i) => i.vehicleId === r.id) },
      { entity: 'incidents', title: 'Incidents', rows: db.read('incidents').filter((i) => i.vehicleId === r.id) },
      { entity: 'shipments', title: 'Consignments carried', rows: db.read('shipments').filter((s) => s.vehicleId === r.id) },
    ],
  },

  /* ===================== Drivers ===================== */
  drivers: {
    collection: 'drivers',
    label: 'Driver',
    plural: 'Drivers',
    icon: 'IdCard',
    listPath: '/portal/fleet',
    roles: ['ops', 'management', 'admin'],
    title: (r) => r.name,
    subtitle: (r) => `Licence ${r.licence}`,
    fields: (r) => [
      ['Licence number', r.licence],
      ['Licence expiry', r.expiry, null, 'date'],
      ['Phone', r.phone],
      ['Entity', r.entity],
      ['Assigned vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Behaviour score', r.score, null, 'plain'],
    ],
    related: (r) => [
      { entity: 'shipments', title: 'Consignments', rows: db.read('shipments').filter((s) => s.driverId === r.id) },
      { entity: 'incidents', title: 'Incidents reported', rows: db.read('incidents').filter((i) => i.driverId === r.id) },
      { entity: 'fuelLogs', title: 'Fuel logged', rows: db.read('fuelLogs').filter((f) => f.driverId === r.id) },
      { entity: 'inspections', title: 'Inspections', rows: db.read('inspections').filter((i) => i.driverId === r.id) },
      { entity: 'pods', title: 'Deliveries signed', rows: db.read('pods').filter((p) => p.driverId === r.id) },
    ],
  },

  /* ===================== Suppliers ===================== */
  suppliers: {
    collection: 'suppliers',
    label: 'Contractor',
    plural: 'Contractors',
    icon: 'Handshake',
    listPath: '/portal/suppliers',
    roles: ['ops', 'management', 'admin'],
    title: (r) => r.name,
    subtitle: (r) => `${r.type} · ${r.entity}`,
    fields: (r) => [
      ['Type', r.type],
      ['Entity', r.entity],
      ['Rating', r.rating],
      ['BC vendor', r.bcNo],
    ],
    related: (r) => [
      { entity: 'jobs', title: 'Work orders', rows: db.read('jobs').filter((j) => j.supplierId === r.id) },
      { entity: 'supplierInvoices', title: 'Invoices submitted', rows: db.read('supplierInvoices').filter((i) => i.supplierId === r.id) },
      { entity: 'rateRequests', title: 'Rate requests', rows: db.read('rateRequests').filter((q) => q.invited?.includes(r.id)) },
      { entity: 'users', title: 'Portal users', rows: db.read('users').filter((u) => u.supplierId === r.id) },
    ],
  },

  /* ===================== Work orders ===================== */
  jobs: {
    collection: 'jobs',
    label: 'Work order',
    plural: 'Work orders',
    icon: 'ClipboardList',
    listPath: '/portal/suppliers',
    title: (r) => r.id,
    subtitle: (r) => nameOf('suppliers', r.supplierId),
    status: (r) => r.status,
    scope: (r, auth) => (auth.role === 'supplier' ? r.supplierId === auth.supplierId : true),
    fields: (r) => [
      ['Contractor', nameOf('suppliers', r.supplierId), ['suppliers', r.supplierId]],
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Scope', r.description],
      ['Value', r.value, null, 'money'],
      ['Issued', r.issuedAt, null, 'date'],
      ['Due', r.dueAt, null, 'date'],
      ['Last update', r.lastUpdate],
    ],
    related: (r) => [
      { entity: 'supplierInvoices', title: 'Invoices against this order', rows: db.read('supplierInvoices').filter((i) => i.jobId === r.id) },
    ],
  },

  /* ===================== Workshop job cards ===================== */
  jobCards: {
    collection: 'jobCards',
    label: 'Job card',
    plural: 'Workshop',
    icon: 'Wrench',
    listPath: '/portal/fleet',
    roles: ['ops', 'management', 'admin'],
    title: (r) => r.id,
    subtitle: (r) => nameOf('vehicles', r.vehicleId, 'reg'),
    status: (r) => r.status,
    fields: (r) => [
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Priority', r.priority],
      ['Fault', r.fault],
      ['Odometer', r.odometer, null, 'km'],
      ['Raised', r.raisedAt, null, 'datetime'],
      ['Raised by', nameOf('users', r.raisedBy), ['users', r.raisedBy]],
      ['Labour', r.labourHours ? `${r.labourHours} h at $${r.labourRate}/h` : null],
      ['Completed', r.completedAt, null, 'datetime'],
    ],
    lines: (r) => (r.parts || []).map((p) => ({ description: `${p.name} × ${p.qty}`, amount: p.qty * p.unitCost })),
    related: () => [],
  },

  /* ===================== Supplier invoices ===================== */
  supplierInvoices: {
    collection: 'supplierInvoices',
    label: 'Contractor invoice',
    plural: 'Contractor invoices',
    icon: 'Receipt',
    listPath: '/portal/suppliers',
    title: (r) => r.invoiceNumber,
    subtitle: (r) => nameOf('suppliers', r.supplierId),
    status: (r) => r.status,
    scope: (r, auth) => (auth.role === 'supplier' ? r.supplierId === auth.supplierId : true),
    fields: (r) => [
      ['Contractor', nameOf('suppliers', r.supplierId), ['suppliers', r.supplierId]],
      ['Work order', r.jobId, ['jobs', r.jobId]],
      ['Amount', r.amount, null, 'money'],
      ['Submitted', r.submittedAt, null, 'datetime'],
      ['BC reference', r.bcRef],
      ['Notes', r.notes],
    ],
    related: () => [],
  },

  /* ===================== Bookings ===================== */
  bookings: {
    collection: 'bookings',
    label: 'Booking request',
    plural: 'Bookings',
    icon: 'CalendarPlus',
    listPath: '/portal/my/quotes',
    title: (r) => r.id,
    subtitle: (r) => nameOf('customers', r.customerId),
    status: (r) => r.status,
    scope: (r, auth) => (auth.role === 'client' ? r.customerId === auth.customerId : true),
    fields: (r) => [
      ['Customer', nameOf('customers', r.customerId), ['customers', r.customerId]],
      ['Your reference', r.reference],
      ['Commodity', commodityName(r.commodity)],
      ['Weight', `${r.weightTons} tonnes`],
      ['Mode', modeName(r.modeCode)],
      ['Cargo ready', r.readyDate, null, 'date'],
      ['Allocated consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Raised', r.raisedAt, null, 'datetime'],
      ['Notes', r.notes],
    ],
    related: () => [],
  },

  /* ===================== Rate requests ===================== */
  rateRequests: {
    collection: 'rateRequests',
    label: 'Rate request',
    plural: 'Rate requests',
    icon: 'Gavel',
    listPath: '/portal/suppliers',
    title: (r) => r.id,
    subtitle: (r) => r.lane,
    status: (r) => r.status,
    fields: (r) => [
      ['Lane', r.lane],
      ['Commodity', commodityName(r.commodity)],
      ['Weight', `${r.weightTons} tonnes`],
      ['Mode', modeName(r.modeCode)],
      ['Needed by', r.neededBy, null, 'date'],
      ['Contractors invited', r.invited?.length],
      ['Awarded to', nameOf('suppliers', r.awardedTo), ['suppliers', r.awardedTo]],
    ],
    related: () => [],
  },

  /* ===================== Users ===================== */
  users: {
    collection: 'users',
    label: 'User',
    plural: 'Users',
    icon: 'UserCog',
    listPath: '/portal/admin',
    roles: ['admin'],
    title: (r) => r.name,
    subtitle: (r) => r.email,
    status: (r) => (r.active === false ? 'Deactivated' : 'Active'),
    fields: (r) => [
      ['Email', r.email],
      ['Role', ROLE_LABELS[r.role] || r.role],
      ['Position', r.title],
      ['Entity', r.entity],
      ['Linked customer', nameOf('customers', r.customerId), ['customers', r.customerId]],
      ['Linked contractor', nameOf('suppliers', r.supplierId), ['suppliers', r.supplierId]],
      ['Created', r.createdAt, null, 'date'],
      ['Last sign-in', r.lastSignInAt, null, 'datetime'],
    ],
    related: (r) => [
      { entity: 'auditLog', title: 'Activity', rows: db.read('auditLog').filter((a) => a.userId === r.id) },
    ],
  },

  /* ===================== Field records ===================== */
  incidents: {
    collection: 'incidents',
    label: 'Incident',
    plural: 'Incidents',
    icon: 'TriangleAlert',
    listPath: '/portal/operations',
    title: (r) => `${r.type} — ${r.location || 'no location'}`,
    subtitle: (r) => r.severity ? `${r.severity} severity` : null,
    status: (r) => r.status,
    fields: (r) => [
      ['Type', r.type],
      ['Severity', r.severity],
      ['Location', r.location],
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Reported', r.reportedAt, null, 'datetime'],
      ['Detail', r.description],
    ],
    related: () => [],
  },

  fuelLogs: {
    collection: 'fuelLogs',
    label: 'Fuel log',
    plural: 'Fuel logs',
    icon: 'Fuel',
    listPath: '/portal/fleet',
    title: (r) => `${r.litres} L — ${r.station}`,
    subtitle: (r) => nameOf('vehicles', r.vehicleId, 'reg'),
    fields: (r) => [
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Litres', r.litres],
      ['Cost', r.cost, null, 'money'],
      ['Odometer', r.odometer, null, 'km'],
      ['Station', r.station],
      ['Logged', r.loggedAt, null, 'datetime'],
    ],
    related: () => [],
  },

  inspections: {
    collection: 'inspections',
    label: 'Inspection',
    plural: 'Inspections',
    icon: 'ClipboardCheck',
    listPath: '/portal/fleet',
    title: (r) => `Daily check — ${nameOf('vehicles', r.vehicleId, 'reg') || r.vehicleId}`,
    subtitle: (r) => (r.checks ? `${Object.values(r.checks).filter((v) => v === 'fail').length} failed items` : null),
    fields: (r) => [
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Odometer', r.odometer, null, 'km'],
      ['Inspected', r.inspectedAt, null, 'datetime'],
      ['Notes', r.notes],
    ],
    checks: (r) => r.checks || {},
    related: () => [],
  },

  serviceRecords: {
    collection: 'serviceRecords',
    label: 'Service record',
    plural: 'Service history',
    icon: 'Wrench',
    listPath: '/portal/fleet',
    title: (r) => `${r.type} — ${nameOf('vehicles', r.vehicleId, 'reg') || r.vehicleId}`,
    subtitle: (r) => r.notes,
    fields: (r) => [
      ['Vehicle', nameOf('vehicles', r.vehicleId, 'reg'), ['vehicles', r.vehicleId]],
      ['Type', r.type],
      ['Odometer', r.odometer, null, 'km'],
      ['Cost', r.cost, null, 'money'],
      ['Performed', r.performedAt, null, 'date'],
      ['Notes', r.notes],
    ],
    related: () => [],
  },

  pods: {
    collection: 'pods',
    label: 'Proof of delivery',
    plural: 'Proofs of delivery',
    icon: 'PenLine',
    listPath: '/portal/operations',
    title: (r) => `POD — ${r.shipmentId}`,
    subtitle: (r) => (r.receivedBy ? `Signed by ${r.receivedBy}` : null),
    fields: (r) => [
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Received by', r.receivedBy],
      ['Driver', nameOf('drivers', r.driverId), ['drivers', r.driverId]],
      ['Captured', r.capturedAt, null, 'datetime'],
      ['Location', r.lat ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : null],
      ['Notes', r.notes],
    ],
    signature: (r) => r.signature,
    photos: (r) => r.photos || [],
    related: () => [],
  },

  shipmentEvents: {
    collection: 'shipmentEvents',
    label: 'Event',
    plural: 'Events',
    icon: 'Navigation',
    listPath: '/portal/inbox',
    title: (r) => r.label,
    subtitle: (r) => r.shipmentId,
    fields: (r) => [
      ['Consignment', r.shipmentId, ['shipments', r.shipmentId]],
      ['Type', r.type],
      ['Location', r.locationText],
      ['Status applied', r.statusHint],
      ['Source', r.source],
      ['Confidence', r.confidence, null, 'pct0'],
      ['Occurred', r.at, null, 'datetime'],
      ['Approved', r.approvedAt, null, 'datetime'],
      ['Original message', r.rawText],
    ],
    related: () => [],
  },

  auditLog: {
    collection: 'auditLog',
    label: 'Audit entry',
    plural: 'Audit trail',
    icon: 'ScrollText',
    listPath: '/portal/admin',
    roles: ['admin', 'management'],
    title: (r) => r.summary,
    subtitle: (r) => `${r.userName} · ${r.action}`,
    fields: (r) => [
      ['User', r.userName, ['users', r.userId]],
      ['Role', ROLE_LABELS[r.role] || r.role],
      ['Action', r.action],
      ['Record', r.entity],
      ['When', r.at, null, 'datetime'],
    ],
    related: () => [],
  },
};

export const entityDef = (entity) => ENTITIES[entity] || null;

/** Resolve a record, or null if the entity or id is unknown. */
export function resolveRecord(entity, id) {
  const def = entityDef(entity);
  if (!def) return null;
  return db.find(def.collection, id);
}

/**
 * A short, human label for a record — what a link should read as.
 * Falls back to the id so a link is never blank.
 */
export function recordLabel(entity, id) {
  const def = entityDef(entity);
  if (!def) return id ?? null;
  const record = db.find(def.collection, id);
  if (!record) return id ?? null;
  try {
    return def.title(record) ?? id;
  } catch {
    return id;
  }
}

/** May this signed-in user open this record? */
export function canOpenRecord(entity, record, auth) {
  const def = entityDef(entity);
  if (!def || !record) return false;
  if (def.roles && auth?.role !== 'admin' && !def.roles.includes(auth?.role)) return false;
  if (def.scope && !def.scope(record, auth || {})) return false;
  return true;
}
