// Silvergill API.
//
// A thin, honest REST layer: authenticate, scope every read to what the caller
// owns, and return the same record shapes the portal already renders.

import express from 'express';
import cors from 'cors';

import { pool, q, one, healthy } from './db.js';
import {
  requireAuth, requireRole, issueToken, verify, publicUser, scopeFor, canRead, audit, hash,
} from './auth.js';
import { extractEvent, configured as aiConfigured } from './anthropic.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' })); // photos arrive as data URLs

const ALLOWED = (process.env.CORS_ORIGINS || 'https://silvergill.onrender.com,http://localhost:5178')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin || ALLOWED.includes(origin)) return cb(null, true);
      return cb(new Error(`origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

/* ===========================================================================
   Row mapping — snake_case in the database, camelCase over the wire, because
   that is what the portal already expects.
   =========================================================================== */

const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toClient = (row) => {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  return out;
};
const list = (rows) => rows.map(toClient);

/** Tables the generic reader will serve, and the column it sorts by. */
const READABLE = {
  customers: 'name',
  suppliers: 'name',
  shipments: 'created_at desc',
  shipment_events: 'at desc',
  quotations: 'created_at desc',
  invoices: 'issued_at desc',
  bookings: 'raised_at desc',
  documents: 'uploaded_at desc',
  jobs: 'issued_at desc',
  supplier_invoices: 'submitted_at desc',
  rate_requests: 'raised_at desc',
  vehicles: 'reg',
  drivers: 'name',
  job_cards: 'raised_at desc',
  service_records: 'performed_at desc',
  fuel_logs: 'logged_at desc',
  inspections: 'inspected_at desc',
  incidents: 'reported_at desc',
  pods: 'captured_at desc',
  alert_rules: 'name',
  inbox_queue: 'received_at desc',
  audit_log: 'at desc',
};

/* ===========================================================================
   Writable tables.
   The portal creates records all over the place — a driver logs fuel, a
   coordinator raises a job card, a customer requests a booking. Rather than
   thirty near-identical handlers, one writer serves them all, but it will only
   touch a table listed here, only for the roles listed here, and only the
   columns listed here. Anything else the browser sends is dropped silently.
   =========================================================================== */

const WRITABLE = {
  incidents: {
    create: ['driver', 'ops'],
    update: ['ops'],
    columns: ['shipmentId', 'vehicleId', 'driverId', 'type', 'severity', 'description',
              'location', 'photos', 'status', 'reportedAt', 'synced'],
    json: ['photos'],
    prefix: 'INC',
  },
  fuel_logs: {
    create: ['driver', 'ops'],
    update: ['ops'],
    columns: ['vehicleId', 'driverId', 'litres', 'cost', 'odometer', 'station', 'loggedAt', 'synced'],
    prefix: 'FL',
  },
  inspections: {
    create: ['driver', 'ops'],
    update: ['ops'],
    columns: ['vehicleId', 'driverId', 'odometer', 'checks', 'notes', 'photos', 'inspectedAt', 'synced'],
    json: ['checks', 'photos'],
    prefix: 'INS',
  },
  job_cards: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['vehicleId', 'status', 'priority', 'fault', 'odometer', 'parts',
              'labourHours', 'labourRate', 'raisedBy', 'raisedAt', 'completedAt'],
    json: ['parts'],
    prefix: 'JC',
  },
  service_records: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['vehicleId', 'type', 'odometer', 'cost', 'performedAt', 'notes'],
    prefix: 'SVC',
  },
  quotations: {
    create: ['sales', 'ops', 'management'],
    update: ['sales', 'ops', 'management'],
    columns: ['customerId', 'commodity', 'origin', 'destination', 'weightTons', 'mode', 'port',
              'insurance', 'insuredValue', 'status', 'total', 'margin', 'createdBy', 'createdAt'],
    prefix: 'QT',
  },
  bookings: {
    create: ['client', 'sales', 'ops'],
    update: ['sales', 'ops'],
    columns: ['customerId', 'commodity', 'weightTons', 'originCode', 'portCode', 'modeCode',
              'readyDate', 'notes', 'reference', 'status', 'raisedBy', 'raisedAt', 'shipmentId'],
    prefix: 'BKG',
    // A customer may only book for themselves, whatever the payload claims.
    pin: (user, row) => (user.role === 'client' ? { ...row, customerId: user.customerId } : row),
  },
  documents: {
    create: ['ops', 'sales', 'management'],
    update: ['ops', 'management'],
    columns: ['shipmentId', 'type', 'fileName', 'status', 'confidence', 'uploadedAt', 'bcRef', 'fields'],
    json: ['fields'],
    prefix: 'DOC',
  },
  jobs: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['shipmentId', 'supplierId', 'description', 'status', 'value', 'currency', 'issuedAt', 'dueAt'],
    prefix: 'JOB',
  },
  supplier_invoices: {
    create: ['supplier', 'ops'],
    update: ['ops', 'management'],
    columns: ['supplierId', 'jobId', 'invoiceNumber', 'amount', 'currency', 'status',
              'submittedAt', 'notes', 'bcRef'],
    prefix: 'SINV',
    pin: (user, row) => (user.role === 'supplier' ? { ...row, supplierId: user.supplierId } : row),
  },
  rate_requests: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['lane', 'commodity', 'weightTons', 'modeCode', 'neededBy', 'status',
              'raisedBy', 'raisedAt', 'invited', 'responses', 'awardedTo'],
    json: ['invited', 'responses'],
    prefix: 'RFQ',
  },
  inbox_queue: {
    create: ['ops', 'driver', 'management'],
    update: ['ops'],
    columns: ['shipmentId', 'source', 'rawText', 'fromPhone', 'matchedBy', 'confidence',
              'extraction', 'status', 'receivedAt'],
    json: ['extraction'],
    prefix: 'INB',
  },
  shipments: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['customerId', 'commodity', 'weightTons', 'origin', 'destination', 'mode', 'port',
              'border', 'vehicleId', 'driverId', 'status', 'entity', 'revenue', 'cost',
              'dispatchedAt', 'etaAt', 'bcOrderNo', 'currentLocation', 'containerNo',
              'truckReg', 'driverPhone', 'trackingToken'],
    prefix: 'SHP',
  },
  alert_rules: {
    create: ['management', 'admin'],
    update: ['management', 'admin'],
    columns: ['name', 'metric', 'target', 'comparator', 'threshold', 'channel', 'active'],
    prefix: 'ALR',
  },
  vehicles: {
    create: ['ops', 'management'],
    update: ['ops', 'management'],
    columns: ['reg', 'make', 'model', 'year', 'type', 'odometer', 'entity', 'status',
              'driverId', 'lastServiceKm', 'serviceIntervalKm', 'fuelTankL', 'tyres'],
    json: ['tyres'],
    prefix: 'VEH',
  },
};

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Turn a browser payload into (columns, values), dropping anything not whitelisted. */
function projectWrite(spec, body) {
  const cols = [];
  const vals = [];
  for (const key of spec.columns) {
    if (body[key] === undefined) continue;
    cols.push(snake(key));
    vals.push(spec.json?.includes(key) ? JSON.stringify(body[key] ?? null) : body[key]);
  }
  return { cols, vals };
}

/* ===========================================================================
   Health
   =========================================================================== */

app.get('/api/health', async (_req, res) => {
  const db = await healthy();
  res.status(db ? 200 : 503).json({ ok: db, service: 'silvergill-api', db, ai: aiConfigured() });
});

/* ===========================================================================
   AI extraction.
   Registered before the generic routes so /api/events/extract is not read as
   a record lookup for a table called "events".

   The browser never sees the API key. It posts the raw update here; it gets
   back the same object the portal's offline extractor produces, so the caller
   can fall through to that on any failure without a second code path.
   =========================================================================== */

app.post('/api/events/extract', requireAuth, requireRole('ops', 'management', 'driver', 'sales'),
  async (req, res) => {
    const { text, imageBase64, mediaType, context } = req.body || {};
    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'text or imageBase64 is required' });
    }
    if (!aiConfigured()) {
      // Not an error: the portal has a working local extractor and will use it.
      return res.status(503).json({ error: 'hosted extraction is not configured', fallback: true });
    }

    try {
      const event = await extractEvent({ text, imageBase64, mediaType, context });
      return res.json({ ...event, extractedBy: 'model' });
    } catch (err) {
      console.error('[ai] extraction failed:', err.message);
      // Every failure here is recoverable — say so, so the client falls back
      // rather than showing the operator an error for a message it can still
      // parse locally.
      return res.status(502).json({ error: err.message, code: err.code ?? null, fallback: true });
    }
  });

/* ===========================================================================
   Auth
   =========================================================================== */

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await one('select * from users where email = $1', [String(email).trim()]);

  // One message for "no such user" and "wrong password" — telling them apart
  // hands an attacker a list of valid addresses.
  if (!user || !(await verify(password, user.password_hash))) {
    return res.status(401).json({ error: 'Those credentials were not recognised.' });
  }
  if (user.active === false) {
    return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
  }

  await q('update users set last_sign_in_at = now() where id = $1', [user.id]);
  const fresh = await one('select * from users where id = $1', [user.id]);
  await audit(publicUser(fresh), 'auth.signin', user.id, `${user.name} signed in`);

  return res.json({ token: issueToken(user), user: publicUser(fresh) });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await audit(req.user, 'auth.signout', req.user.id, `${req.user.name} signed out`);
  res.json({ ok: true });
});

/* ===========================================================================
   Public tracking — no authentication.
   Deliberately hand-written rather than generic: it returns only the columns a
   consignee is entitled to. No revenue, no cost, no customer, no BC reference.
   =========================================================================== */

app.get('/api/track/:token', async (req, res) => {
  const shipment = await one(
    `select id, origin, destination, status, mode, weight_tons, port, border,
            current_location, container_no, dispatched_at, eta_at, tracking_token
       from shipments
      where tracking_token = $1`,
    [String(req.params.token || '').trim()]
  );
  if (!shipment) return res.status(404).json({ error: 'not found' });

  const events = await q(
    `select id, type, label, location_text, at
       from shipment_events
      where shipment_id = $1 and approved = true
      order by at desc`,
    [shipment.id]
  );

  res.json({ shipment: toClient(shipment), events: list(events) });
});

/* ===========================================================================
   Reads that need their own scoping rule
   =========================================================================== */

/** Notifications are addressed either to a person or to a role. */
app.get('/api/notifications', requireAuth, async (req, res) => {
  const rows = await q(
    `select * from notifications
      where for_user_id = $1 or for_roles @> to_jsonb($2::text)
      order by at desc limit 200`,
    [req.user.id, req.user.role]
  );
  res.json(list(rows));
});

app.patch('/api/notifications/:id', requireAuth, async (req, res) => {
  const updated = await q(
    `update notifications set read = $1
      where id = $2 and (for_user_id = $3 or for_roles @> to_jsonb($4::text))
      returning id`,
    [Boolean(req.body?.read ?? true), req.params.id, req.user.id, req.user.role]
  );
  if (!updated.length) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
  await q(
    `update notifications set read = true
      where read = false and (for_user_id = $1 or for_roles @> to_jsonb($2::text))`,
    [req.user.id, req.user.role]
  );
  res.json({ ok: true });
});

/** The directory. Admin sees everyone; nobody else sees this at all. */
app.get('/api/users', requireAuth, requireRole('admin'), async (_req, res) => {
  const rows = await q('select * from users order by name');
  res.json(rows.map(publicUser));
});

/* ===========================================================================
   Generic scoped reads
   =========================================================================== */

app.get('/api/:table', requireAuth, async (req, res, next) => {
  const table = req.params.table;
  const order = READABLE[table];
  if (!order) return next();

  const scope = scopeFor(req.user, table);
  if (scope.clause === 'false') return res.json([]);

  const rows = await q(
    `select * from ${table} where ${scope.clause} order by ${order}`,
    scope.params
  );
  return res.json(list(rows));
});

app.get('/api/:table/:id', requireAuth, async (req, res, next) => {
  const { table, id } = req.params;
  if (!READABLE[table]) return next();

  if (!(await canRead(req.user, table, id))) {
    return res.status(403).json({ error: 'not available on your profile' });
  }
  const row = await one(`select * from ${table} where id = $1`, [id]);
  if (!row) return res.status(404).json({ error: 'not found' });
  return res.json(toClient(row));
});

/* ===========================================================================
   Writes that actually change the business
   =========================================================================== */

const newId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

/** Capture a proof of delivery and mark the consignment delivered. */
app.post('/api/pods', requireAuth, requireRole('driver', 'ops'), async (req, res) => {
  const { shipmentId, receivedBy, notes, photos = [], signature, lat, lng } = req.body || {};
  if (!shipmentId || !receivedBy || !signature) {
    return res.status(400).json({ error: 'shipmentId, receivedBy and signature are required' });
  }
  const shipment = await one('select * from shipments where id = $1', [shipmentId]);
  if (!shipment) return res.status(404).json({ error: 'unknown consignment' });

  const id = newId('POD');
  await q(
    `insert into pods(id, shipment_id, received_by, notes, photos, signature, lat, lng, synced)
     values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,true)`,
    [id, shipmentId, receivedBy, notes ?? null, JSON.stringify(photos), signature, lat ?? null, lng ?? null]
  );
  await q(`update shipments set status = 'Delivered' where id = $1`, [shipmentId]);
  await audit(req.user, 'pod.capture', shipmentId, `Proof of delivery captured, signed by ${receivedBy}`);

  const clients = await q(
    `select id from users where role = 'client' and customer_id = $1`,
    [shipment.customer_id]
  );
  for (const c of clients) {
    await q(
      `insert into notifications(id, for_user_id, severity, title, body, link)
       values ($1,$2,'info',$3,$4,'/portal/my/documents')`,
      [newId('NTF'), c.id, `${shipmentId} delivered`, `Signed for by ${receivedBy}.`]
    );
  }
  res.status(201).json({ id });
});

/** Approve a queued field update — the only path that moves a consignment. */
app.post('/api/inbox/:id/approve', requireAuth, requireRole('ops'), async (req, res) => {
  const item = await one('select * from inbox_queue where id = $1', [req.params.id]);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (item.status !== 'pending') return res.status(409).json({ error: 'already resolved' });

  const extraction = item.extraction || {};
  const label = req.body?.label || extraction.label || 'Update';

  await q(
    `insert into shipment_events
       (id, shipment_id, type, label, location_text, status_hint, source, confidence,
        approved, raw_text, matched_by, at, approved_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,now())`,
    [
      newId('EVT'), item.shipment_id, extraction.type || 'update', label,
      extraction.location_text ?? null, extraction.status_hint ?? null,
      item.source, item.confidence, item.raw_text, item.matched_by, item.received_at,
    ]
  );

  if (extraction.location_text) {
    await q('update shipments set current_location = $1 where id = $2', [extraction.location_text, item.shipment_id]);
  }
  if (extraction.status_hint) {
    await q('update shipments set status = $1 where id = $2', [extraction.status_hint, item.shipment_id]);
  }
  await q(`update inbox_queue set status = 'approved', approved_at = now() where id = $1`, [req.params.id]);
  await audit(req.user, 'inbox.approve', item.shipment_id, `Published "${label}"`);

  res.json({ ok: true });
});

app.post('/api/inbox/:id/reject', requireAuth, requireRole('ops'), async (req, res) => {
  const updated = await q(
    `update inbox_queue set status = 'rejected', approved_at = now()
      where id = $1 and status = 'pending' returning id`,
    [req.params.id]
  );
  if (!updated.length) return res.status(404).json({ error: 'not found or already resolved' });
  await audit(req.user, 'inbox.reject', req.params.id, 'Rejected a queued update');
  res.json({ ok: true });
});

/** A customer accepting or declining a quotation. */
app.post('/api/quotations/:id/respond', requireAuth, requireRole('client'), async (req, res) => {
  const accept = Boolean(req.body?.accept);
  const quote = await one(
    'select * from quotations where id = $1 and customer_id = $2',
    [req.params.id, req.user.customerId]
  );
  if (!quote) return res.status(404).json({ error: 'not found' });

  await q('update quotations set status = $1, responded_at = now() where id = $2', [
    accept ? 'Accepted' : 'Declined',
    quote.id,
  ]);
  await audit(req.user, accept ? 'quotation.accept' : 'quotation.decline', quote.id,
    `${req.user.name} ${accept ? 'accepted' : 'declined'} ${quote.id}`);
  res.json({ ok: true });
});

/** A contractor accepting or declining a work order. */
app.post('/api/jobs/:id/respond', requireAuth, requireRole('supplier'), async (req, res) => {
  const accept = Boolean(req.body?.accept);
  const job = await one('select * from jobs where id = $1 and supplier_id = $2', [
    req.params.id,
    req.user.supplierId,
  ]);
  if (!job) return res.status(404).json({ error: 'not found' });

  await q('update jobs set status = $1, responded_at = now() where id = $2', [
    accept ? 'Accepted' : 'Declined',
    job.id,
  ]);
  await audit(req.user, accept ? 'job.accept' : 'job.decline', job.id,
    `${req.user.name} ${accept ? 'accepted' : 'declined'} ${job.id}`);
  res.json({ ok: true });
});

/* ===== Admin: user management ===== */

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, entity, title, customerId, supplierId } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (role === 'client' && !customerId) {
    return res.status(400).json({ error: 'a customer account must be linked to a customer' });
  }
  if (role === 'supplier' && !supplierId) {
    return res.status(400).json({ error: 'a contractor account must be linked to a contractor' });
  }

  const exists = await one('select 1 from users where email = $1', [email]);
  if (exists) return res.status(409).json({ error: 'that email address is already in use' });

  const id = newId('u');
  await q(
    `insert into users(id, name, email, password_hash, role, entity, title, customer_id, supplier_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, name, email, await hash(password), role, entity ?? null, title ?? null,
     role === 'client' ? customerId : null, role === 'supplier' ? supplierId : null]
  );
  await audit(req.user, 'user.create', id, `Created ${name} (${role})`);
  res.status(201).json(publicUser(await one('select * from users where id = $1', [id])));
});

app.patch('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const target = await one('select * from users where id = $1', [req.params.id]);
  if (!target) return res.status(404).json({ error: 'not found' });

  if (req.body?.active === false && target.id === req.user.id) {
    return res.status(400).json({ error: 'you cannot deactivate your own account' });
  }

  const fields = [];
  const params = [];
  const set = (col, val) => { params.push(val); fields.push(`${col} = $${params.length}`); };

  if (req.body.name !== undefined) set('name', req.body.name);
  if (req.body.title !== undefined) set('title', req.body.title);
  if (req.body.entity !== undefined) set('entity', req.body.entity);
  if (req.body.role !== undefined) set('role', req.body.role);
  if (req.body.active !== undefined) set('active', Boolean(req.body.active));
  if (req.body.password) set('password_hash', await hash(req.body.password));
  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });

  params.push(req.params.id);
  await q(`update users set ${fields.join(', ')} where id = $${params.length}`, params);
  await audit(req.user, 'user.update', req.params.id, `Updated ${target.name}`);
  res.json(publicUser(await one('select * from users where id = $1', [req.params.id])));
});

/* ===========================================================================
   Generic guarded writes.
   Last, so every hand-written endpoint above wins its route. A table absent
   from WRITABLE falls through to the 404 — the default is "no".
   =========================================================================== */

app.post('/api/:table', requireAuth, async (req, res, next) => {
  const table = req.params.table;
  const spec = WRITABLE[table];
  if (!spec) return next();

  if (req.user.role !== 'admin' && !spec.create.includes(req.user.role)) {
    return res.status(403).json({ error: 'not permitted for your role' });
  }

  const body = spec.pin ? spec.pin(req.user, req.body || {}) : (req.body || {});
  const { cols, vals } = projectWrite(spec, body);
  if (!cols.length) return res.status(400).json({ error: 'nothing to write' });

  const id = typeof body.id === 'string' && body.id ? body.id : newId(spec.prefix);
  const placeholders = vals.map((_, i) => `$${i + 2}`);
  // Cast the JSON columns explicitly; everything else is inferred.
  const casts = cols.map((c, i) =>
    spec.json?.some((k) => snake(k) === c) ? `${placeholders[i]}::jsonb` : placeholders[i]);

  try {
    await q(
      `insert into ${table}(id, ${cols.join(', ')}) values ($1, ${casts.join(', ')})`,
      [id, ...vals]
    );
  } catch (err) {
    // A bad foreign key is the caller's mistake, not a server fault.
    if (err.code === '23503' || err.code === '23505' || err.code === '23514') {
      return res.status(400).json({ error: err.detail || err.message });
    }
    throw err;
  }

  await audit(req.user, `${table}.create`, id, `Created ${id}`);
  const row = await one(`select * from ${table} where id = $1`, [id]);
  return res.status(201).json(toClient(row));
});

app.patch('/api/:table/:id', requireAuth, async (req, res, next) => {
  const { table, id } = req.params;
  const spec = WRITABLE[table];
  if (!spec) return next();

  if (req.user.role !== 'admin' && !spec.update.includes(req.user.role)) {
    return res.status(403).json({ error: 'not permitted for your role' });
  }
  // Updating a row you were never allowed to read is not a thing.
  if (!(await canRead(req.user, table, id))) {
    return res.status(403).json({ error: 'not available on your profile' });
  }

  const { cols, vals } = projectWrite(spec, req.body || {});
  if (!cols.length) return res.status(400).json({ error: 'nothing to update' });

  const assignments = cols.map((c, i) => {
    const cast = spec.json?.some((k) => snake(k) === c) ? '::jsonb' : '';
    return `${c} = $${i + 1}${cast}`;
  });

  await q(`update ${table} set ${assignments.join(', ')} where id = $${vals.length + 1}`, [...vals, id]);
  await audit(req.user, `${table}.update`, id, `Updated ${id}`);
  return res.json(toClient(await one(`select * from ${table} where id = $1`, [id])));
});

/* ===========================================================================
   Fallbacks
   =========================================================================== */

app.use('/api', (_req, res) => res.status(404).json({ error: 'no such endpoint' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api]', err.message);
  const status = /origin not allowed/.test(err.message) ? 403 : 500;
  res.status(status).json({ error: status === 403 ? err.message : 'internal error' });
});

const port = process.env.PORT || 3001;
const server = app.listen(port, () => console.log(`[api] listening on ${port}`));

const shutdown = async () => {
  server.close();
  await pool.end().catch(() => {});
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
