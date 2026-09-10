/**
 * Ensures the `role` column exists on the `user` table.
 * Called once at server startup — safe to run multiple times.
 *
 * Uses a column-existence check instead of `ADD COLUMN IF NOT EXISTS`
 * because the latter requires MySQL 8.0.3+ and is not available on all
 * hosted MySQL versions.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export async function migrateUserRole(): Promise<void> {
  try {
    // Check whether the column already exists via information_schema
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'user'
        AND COLUMN_NAME  = 'role'
    `);

    // Drizzle returns rows as an array-like; grab the first row's cnt value
    const firstRow = (rows as unknown as Array<Record<string, unknown>>)[0];
    const cnt = Number(firstRow?.cnt ?? firstRow?.['COUNT(*)'] ?? 0);

    if (cnt > 0) {
      console.log(JSON.stringify({ event: 'db.migrate.user_role.already_exists' }));
      return;
    }

    // Column does not exist — add it
    await db.execute(sql`
      ALTER TABLE user
        ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'developer'
    `);
    console.log(JSON.stringify({ event: 'db.migrate.user_role.ok' }));
  } catch (err) {
    // Duplicate column error is a safe race condition (two instances starting simultaneously)
    const msg = String(err);
    if (msg.includes('Duplicate column') || msg.includes('ER_DUP_FIELDNAME')) {
      console.log(JSON.stringify({ event: 'db.migrate.user_role.already_exists' }));
    } else {
      console.error(JSON.stringify({ event: 'db.migrate.user_role.failed', error: msg }));
      throw err; // re-throw so startup logs surface the real problem
    }
  }
}
