// Database access.
//
// One pool for the process. Neon pools connections at its own proxy, so a small
// client-side pool is correct — a large one just holds idle sockets open.

import pg from 'pg';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error('[db] DATABASE_URL is not set — the API cannot start.');
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  // Neon terminates TLS at its proxy with a certificate chain Node does not
  // ship a root for; the connection is still encrypted.
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  // An idle client dying must not take the process with it.
  console.error('[db] idle client error:', err.message);
});

/** Run a query. Always parameterised — never string-concatenate user input. */
export async function q(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

/** First row, or null. */
export async function one(text, params = []) {
  const rows = await q(text, params);
  return rows[0] ?? null;
}

/** Run a set of statements in a transaction, rolling back on any error. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function healthy() {
  try {
    await pool.query('select 1');
    return true;
  } catch {
    return false;
  }
}
