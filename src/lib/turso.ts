// Lightweight Turso/LibSQL helper for all API routes
// No Prisma dependency — fast cold start on Vercel serverless

import { createClient, Client, Config } from '@libsql/client';

let _client: Client | null = null;

// Simple in-memory cache for GET queries (server-side, auto-expires)
const _cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15000; // 15 seconds — reduces repeated DB roundtrips

/**
 * Get or create a libsql client singleton for the current serverless function.
 * Safe to call multiple times — returns the same client.
 */
export function turso(): Client {
  if (!_client) {
    const url = process.env.DATABASE_URL || '';
    const token = process.env.TURSO_AUTH_TOKEN || '';
    const config: Config = {
      url,
      authToken: token || undefined,
      // Connection timeout: 12 seconds (Vercel cold starts can be slow)
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        return fetch(input, { ...init, signal: AbortSignal.timeout(12000) });
      },
    };
    _client = createClient(config);
  }
  return _client;
}

/**
 * Execute a SQL query with parameters.
 */
export async function query<T = any>(sql: string, args?: any[]): Promise<T[]> {
  const client = turso();
  // Check cache for GET-like queries (SELECT)
  const trimmedSql = sql.trim();
  if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA')) {
    const cacheKey = `${trimmedSql}::${JSON.stringify(args || [])}`;
    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data as T[];
    }
    const result = await client.execute({ sql, args: args as any[] });
    const data = result.rows as T[];
    _cache.set(cacheKey, { data, ts: Date.now() });
    // Prune old entries periodically
    if (_cache.size > 500) {
      for (const [key, val] of _cache) {
        if (Date.now() - val.ts > CACHE_TTL) _cache.delete(key);
      }
    }
    return data;
  }
  const result = await client.execute({ sql, args: args as any[] });
  return result.rows as T[];
}

/**
 * Invalidate cache (call after INSERT/UPDATE/DELETE)
 */
export function invalidateCache(): void {
  _cache.clear();
}

/**
 * Execute a SQL query and return the first row, or null.
 */
export async function queryOne<T = any>(sql: string, args?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] || null;
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE).
 */
export async function execute(sql: string, args?: any[]): Promise<void> {
  const client = turso();
  await client.execute({ sql, args: args as any[] });
  // Clear cache after any write operation
  _cache.clear();
}

/**
 * Execute multiple SQL statements in a batch.
 */
export async function batch(statements: { sql: string; args?: any[] }[]): Promise<void> {
  const client = turso();
  await client.batch(statements as any[]);
}

/**
 * Generate a UUID.
 */
export function uuid(): string {
  return crypto.randomUUID();
}
