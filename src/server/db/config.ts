/**
 * Database configuration loader
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';

export interface DatabaseCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getDatabaseCredentials(): DatabaseCredentials {
  // 1. Nomad task-local config.json (AAB/dev-supervisor containers)
  const configPath = join(env.NOMAD_TASK_DIR || '/local', 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.DATABASE?.VALUE) {
        const db = config.DATABASE.VALUE;
        if (db.HOST && db.PORT && db.USERNAME && db.PASSWORD && db.NAME) {
          return {
            host: db.HOST,
            port: parseInt(String(db.PORT), 10),
            user: db.USERNAME,
            password: db.PASSWORD,
            database: db.NAME,
          };
        }
      }
    } catch {
      // fall through
    }
  }

  // 2. DATABASE_URL connection string — fall through on any parse error
  if (env.DATABASE_URL) {
    try {
      const url = new URL(env.DATABASE_URL);
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
      };
    } catch {
      // fall through to individual env vars
    }
  }

  // 3. Individual env vars — Railway MySQL plugin injects MYSQL* automatically
  const host     = env.DB_HOST     || env.MYSQLHOST;
  const port     = env.DB_PORT     || env.MYSQLPORT;
  const user     = env.DB_USER     || env.MYSQLUSER;
  const password = env.DB_PASSWORD || env.MYSQLPASSWORD;
  const database = env.DB_NAME     || env.MYSQLDATABASE;

  if (host && user && password && database) {
    return {
      host,
      port: port ? parseInt(port, 10) : 3306,
      user,
      password,
      database,
    };
  }

  throw new Error(
    'Database credentials not found. Provide DATABASE_URL or set ' +
    'DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME as environment variables.'
  );
}
