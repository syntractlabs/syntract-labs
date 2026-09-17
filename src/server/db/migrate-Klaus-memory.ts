/**
 * Ensures the Klaus_memory table exists.
 * Key-value store for Klaus's cross-session learning.
 * Called once at server startup — safe to run multiple times.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export async function migrateKlausMemory(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS Klaus_memory (
        mem_key    VARCHAR(255)  NOT NULL PRIMARY KEY,
        mem_value  LONGTEXT      NOT NULL,
        updated_at DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(JSON.stringify({ event: 'db.migrate.Klaus_memory.ok' }));
  } catch (err) {
    console.error(JSON.stringify({ event: 'db.migrate.Klaus_memory.failed', error: String(err) }));
  }
}
