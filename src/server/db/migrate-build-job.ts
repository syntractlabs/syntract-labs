/**
 * Ensures the build_job table exists and columns are correctly typed.
 * Called once at server startup — safe to run multiple times.
 *
 * IMPORTANT: result/plan columns must be LONGTEXT (up to 4GB), not TEXT (65KB).
 * The agent outputs 200-400KB per build — TEXT silently truncates the FILE_MANIFEST
 * block at the end, causing "No FILE_MANIFEST found" errors on every preview attempt.
 */
import { db } from './client';
import { sql } from 'drizzle-orm';

export async function migrateBuildJob(): Promise<void> {
  // ── Step 1: Create table if it doesn't exist yet ──────────────────────────
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS build_job (
        id           VARCHAR(36)   NOT NULL PRIMARY KEY,
        user_id      VARCHAR(36)   NOT NULL,
        prompt       TEXT          NOT NULL,
        plan         LONGTEXT      NULL,
        status       VARCHAR(20)   NOT NULL DEFAULT 'queued',
        result       LONGTEXT      NULL,
        error        TEXT          NULL,
        duration_ms  INT           NULL,
        created_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_build_job_user_id (user_id),
        INDEX idx_build_job_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log(JSON.stringify({ event: 'db.migrate.build_job.create.ok' }));
  } catch (err) {
    console.error(JSON.stringify({ event: 'db.migrate.build_job.create.failed', error: String(err) }));
  }

  // ── Step 2: Upgrade result + plan columns to LONGTEXT if they are TEXT ────
  // MySQL TEXT = 65,535 bytes max. Agent output is 200-400KB — it gets silently
  // truncated, cutting off the FILE_MANIFEST block at the end of the response.
  // LONGTEXT = 4GB max. ALTER TABLE … MODIFY is idempotent (LONGTEXT → LONGTEXT is a no-op).
  try {
    await db.execute(sql`
      ALTER TABLE build_job
        MODIFY COLUMN result LONGTEXT NULL,
        MODIFY COLUMN plan   LONGTEXT NULL
    `);
    console.log(JSON.stringify({ event: 'db.migrate.build_job.longtext.ok' }));
  } catch (err) {
    // Non-fatal: table may not exist yet (handled above) or already correct type
    console.warn(JSON.stringify({ event: 'db.migrate.build_job.longtext.warn', error: String(err) }));
  }
}
