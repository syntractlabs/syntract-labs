/**
 * Ensures the `issuer` column exists on the `account` table.
 * Required by BetterAuth >= 1.2 which uses issuer to distinguish
 * credential vs OAuth accounts during sign-in.
 * Called once at server startup — safe to run multiple times.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export async function migrateAccountIssuer(): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'account'
        AND COLUMN_NAME  = 'issuer'
    `);

    const firstRow = (rows as unknown as Array<Record<string, unknown>>)[0];
    const cnt = Number(firstRow?.cnt ?? firstRow?.['COUNT(*)'] ?? 0);

    if (cnt > 0) {
      console.log(JSON.stringify({ event: 'db.migrate.account_issuer.already_exists' }));
      return;
    }

    await db.execute(sql`ALTER TABLE account ADD COLUMN issuer TEXT`);
    console.log(JSON.stringify({ event: 'db.migrate.account_issuer.added' }));
  } catch (err) {
    const msg = String(err);
    if (msg.includes('Duplicate column') || msg.includes('ER_DUP_FIELDNAME')) {
      console.log(JSON.stringify({ event: 'db.migrate.account_issuer.already_exists' }));
    } else {
      console.error(JSON.stringify({ event: 'db.migrate.account_issuer.failed', error: msg }));
      throw err;
    }
  }
}
