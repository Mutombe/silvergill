// Authentication and, more importantly, authorisation.
//
// The browser is not trusted. Roles decide which endpoints exist for you; the
// scope attached to your account decides which ROWS you can see. That scope is
// applied in SQL, not in the client — a customer cannot see another customer's
// consignments even by crafting the request by hand.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { one, q } from './db.js';

const SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '12h';

if (!SECRET || SECRET.length < 24) {
  console.error('[auth] JWT_SECRET is missing or too short — refusing to start.');
  process.exit(1);
}

export const hash = (plain) => bcrypt.hash(plain, 10);
export const verify = (plain, digest) => bcrypt.compare(plain, digest);

export function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      customerId: user.customer_id ?? null,
      supplierId: user.supplier_id ?? null,
    },
    SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/** Strip anything the browser has no business holding. */
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  entity: u.entity,
  title: u.title,
  customerId: u.customer_id ?? null,
  supplierId: u.supplier_id ?? null,
  active: u.active,
  lastSignInAt: u.last_sign_in_at,
  createdAt: u.created_at,
});

/** Populates req.user, or 401s. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'authentication required' });

  let claims;
  try {
    claims = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'session expired or invalid' });
  }

  // Re-read the account every request: a deactivated user must lose access
  // immediately, not when their token happens to expire.
  const user = await one('select * from users where id = $1', [claims.sub]);
  if (!user || user.active === false) {
    return res.status(401).json({ error: 'account is not active' });
  }

  req.user = publicUser(user);
  return next();
}

/** Gate an endpoint on role. Admin passes everything. */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'not permitted for your role' });
};

/**
 * The row-level guard.
 *
 * Returns a SQL fragment and params that constrain a query to what this user
 * may see. Every list and read endpoint composes this in — it is the single
 * place tenancy is decided.
 */
export function scopeFor(user, table) {
  if (!user) return { clause: 'false', params: [] };
  if (['admin', 'management', 'ops', 'sales'].includes(user.role)) {
    return { clause: 'true', params: [] };
  }

  if (user.role === 'client') {
    switch (table) {
      case 'shipments':
      case 'quotations':
      case 'invoices':
      case 'bookings':
        return { clause: 'customer_id = $1', params: [user.customerId] };
      case 'documents':
      case 'pods':
      case 'shipment_events':
        return {
          clause: 'shipment_id in (select id from shipments where customer_id = $1)',
          params: [user.customerId],
        };
      default:
        return { clause: 'false', params: [] };
    }
  }

  if (user.role === 'supplier') {
    switch (table) {
      case 'jobs':
      case 'supplier_invoices':
        return { clause: 'supplier_id = $1', params: [user.supplierId] };
      case 'rate_requests':
        return { clause: 'invited @> to_jsonb($1::text)', params: [user.supplierId] };
      default:
        return { clause: 'false', params: [] };
    }
  }

  if (user.role === 'driver') {
    switch (table) {
      case 'shipments':
        return {
          clause: 'driver_id in (select id from drivers where lower(name) = lower($1))',
          params: [user.name],
        };
      case 'vehicles':
      case 'incidents':
      case 'fuel_logs':
      case 'inspections':
      case 'pods':
        return { clause: 'true', params: [] };
      default:
        return { clause: 'false', params: [] };
    }
  }

  return { clause: 'false', params: [] };
}

/** Can this user read this specific row? Used on single-record reads. */
export async function canRead(user, table, id) {
  const scope = scopeFor(user, table);
  if (scope.clause === 'false') return false;
  if (scope.clause === 'true') return true;
  // The scope clause already uses $1..$n, so the id takes the next placeholder.
  const row = await one(
    `select 1 from ${table} where id = $${scope.params.length + 1} and (${scope.clause})`,
    [...scope.params, id]
  );
  return Boolean(row);
}

/** Record an audited action. */
export async function audit(user, action, entity, summary) {
  await q(
    `insert into audit_log(id, user_id, user_name, role, action, entity, summary)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user?.id ?? null,
      user?.name ?? 'system',
      user?.role ?? null,
      action,
      entity ?? null,
      summary,
    ]
  );
}
