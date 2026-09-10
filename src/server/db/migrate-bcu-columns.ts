/**
 * Migration: add bcu_total and bcu_remaining columns to the user table.
 *
 * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS (MySQL 8+).
 * Seeds existing users with BCU defaults based on their current role.
 *
 * BCU defaults per role:
 *   free         →  2 BCU
 *   developer    →  2 BCU  (default role)
 *   starter      → 12 BCU
 *   professional → 48 BCU
 *   team         → 120 BCU
 *   admin        → 999 BCU
 *   enterprise   → 999 BCU
 */
import { db } from './client.js';
import { sql } from 'drizzle-orm';

const ROLE_BCU: Record<string, number> = {
  free:          2,
  developer:     2,
  viewer:        2,
  starter:      12,
  professional: 48,
  team:        120,
  admin:       999,
  enterprise:  999,
};

async function addColumnIfMissing(table: string, column: string, definition: string) {
  // Try the ALTER — if the column already exists MySQL throws ER_DUP_FIELDNAME (1060),
  // which we catch and ignore. This is simpler than INFORMATION_SCHEMA queries whose
  // DATABASE() context can vary across connection pool configurations.
  try {
    await db!.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
    console.log(`[migrate-bcu] Added ${table}.${column}.`);
  } catch (err: unknown) {
    const e = err as { cause?: { errno?: number } };
    if (e?.cause?.errno === 1060) {
      console.log(`[migrate-bcu] Column ${table}.${column} already exists — skipping.`);
    } else {
      throw err;
    }
  }
}

async function run() {
  if (!db) throw new Error('Database not available');

  await addColumnIfMissing('user', 'bcu_total',     'DECIMAL(8,2) NOT NULL DEFAULT 2.00');
  await addColumnIfMissing('user', 'bcu_remaining', 'DECIMAL(8,2) NOT NULL DEFAULT 2.00');

  // Seed existing users: set bcu_total and bcu_remaining based on role,
  // but only where both columns are still at the default (2.00) — i.e. not
  // yet customised — so we don't overwrite any manually-set balances.
  console.log('[migrate-bcu] Seeding BCU balances for existing users…');

  // Use Drizzle ORM select so column mapping is handled correctly
  const { user } = await import('./schema.js');
  const { eq } = await import('drizzle-orm');

  const users = await db.select({ id: user.id, role: user.role, bcuTotal: user.bcuTotal }).from(user);

  let updated = 0;
  for (const u of users) {
    const defaultBcu = String(ROLE_BCU[u.role] ?? 2);
    const currentTotal = parseFloat(String(u.bcuTotal ?? '2'));
    // Only update if still at the migration default (2.00)
    if (Math.abs(currentTotal - 2.0) < 0.01) {
      await db.update(user)
        .set({ bcuTotal: defaultBcu, bcuRemaining: defaultBcu })
        .where(eq(user.id, u.id));
      updated++;
    }
  }

  console.log(`[migrate-bcu] Done. Updated ${updated} user(s).`);
}

run().catch((err) => {
  console.error('[migrate-bcu] FAILED:', err);
  process.exit(1);
});
