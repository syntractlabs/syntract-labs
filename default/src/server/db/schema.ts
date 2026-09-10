/**
 * Drizzle ORM schema entrypoint.
 *
 * After modifying this file:
 * 1. Run: npx drizzle-kit generate
 * 2. Run: npx drizzle-kit migrate
 */
import { mysqlTable, varchar, text, boolean, timestamp, int, json, longtext, decimal } from 'drizzle-orm/mysql-core';

// ── BetterAuth required tables ────────────────────────────────────────────────

export const user = mysqlTable('user', {
  id:            varchar('id', { length: 36 }).primaryKey(),
  name:          text('name').notNull(),
  email:         varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  isAdmin:       boolean('is_admin').notNull().default(false),
  // Role-based access: admin | developer | viewer (default: developer)
  role:          varchar('role', { length: 20 }).notNull().default('developer'),
  // BCU balance — total allocated and remaining spendable units.
  // Stored as DECIMAL(8,2) to support fractional BCUs (e.g. 1.5 BCU used).
  // bcuTotal is the lifetime allocation for the current plan period.
  // bcuRemaining is decremented after each successful build.
  bcuTotal:      decimal('bcu_total', { precision: 8, scale: 2 }).notNull().default('2.00'),
  bcuRemaining:  decimal('bcu_remaining', { precision: 8, scale: 2 }).notNull().default('2.00'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const session = mysqlTable('session', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     varchar('token', { length: 255 }).notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    varchar('user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const account = mysqlTable('account', {
  id:                    varchar('id', { length: 36 }).primaryKey(),
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  // issuer: synthetic issuer used by BetterAuth to distinguish credential vs OAuth accounts.
  // Local credential accounts use 'local:credential'; OAuth accounts use 'local:oauth:<provider>'.
  issuer:                text('issuer'),
  userId:                varchar('user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  expiresAt:             timestamp('expires_at'),
  scope:                 text('scope'),
  password:              text('password'),
  createdAt:             timestamp('created_at').notNull().defaultNow(),
  updatedAt:             timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const verification = mysqlTable('verification', {
  id:         varchar('id', { length: 36 }).primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── SynTract app tables ───────────────────────────────────────────────────────

export const apiKey = mysqlTable('api_key', {
  id:           varchar('id', { length: 36 }).primaryKey(),
  userId:       varchar('user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  name:         varchar('name', { length: 100 }).notNull(),
  keyHash:      varchar('key_hash', { length: 64 }).notNull().unique(),  // SHA-256 hex of the raw key
  keyPrefix:    varchar('key_prefix', { length: 14 }).notNull(),         // "dk_live_XXXXXX" — shown in UI
  requestCount: int('request_count').notNull().default(0),
  lastUsedAt:   timestamp('last_used_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});

// ── AI build jobs ─────────────────────────────────────────────────────────────

export const buildJob = mysqlTable('build_job', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  userId:      varchar('user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  prompt:      text('prompt').notNull(),
  plan:        longtext('plan'),                                      // agent's reasoning / plan steps (JSON array of strings)
  status:      varchar('status', { length: 20 }).notNull().default('queued'), // queued | planning | building | complete | failed
  result:      longtext('result'),                                    // final deliverable — can be 200-400KB of agent output
  error:       text('error'),                                         // error message if failed
  durationMs:  int('duration_ms'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ── API request logs ──────────────────────────────────────────────────────────

export const apiLog = mysqlTable('api_log', {
  id:           varchar('id', { length: 36 }).primaryKey(),
  userId:       varchar('user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  apiKeyId:     varchar('api_key_id', { length: 36 }).references(() => apiKey.id, { onDelete: 'set null' }),
  apiKeyPrefix: varchar('api_key_prefix', { length: 14 }),   // kept for display even if key deleted
  endpoint:     varchar('endpoint', { length: 100 }).notNull().default('/v1/extract'),
  method:       varchar('method', { length: 10 }).notNull().default('POST'),
  statusCode:   int('status_code').notNull(),
  durationMs:   int('duration_ms').notNull(),
  inputTokens:  int('input_tokens').notNull().default(0),
  outputTokens: int('output_tokens').notNull().default(0),
  documentName: varchar('document_name', { length: 255 }),   // original filename
  errorMessage: text('error_message'),                        // null on success
  responseBody: json('response_body'),                        // stored for log detail view
  createdAt:    timestamp('created_at').notNull().defaultNow(),
});
