// Apply the schema. Idempotent — safe to run on every deploy.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(join(here, 'schema.sql'), 'utf8');

  // citext gives case-insensitive email uniqueness without a functional index.
  await pool.query('create extension if not exists citext');
  await pool.query(sql);

  const { rows } = await pool.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  );
  console.log(`[migrate] ${rows.length} tables present:`);
  console.log('  ' + rows.map((r) => r.table_name).join(', '));
}

migrate()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[migrate] failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
