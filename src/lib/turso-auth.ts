// Shared Turso client for auth routes with connection timeout
// Prevents infinite hangs on Vercel serverless cold starts

import { createClient, Client } from '@libsql/client';

let _client: Client | null = null;

export function getAuthClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '';
  const token = process.env.TURSO_AUTH_TOKEN || '';

  _client = createClient({
    url,
    authToken: token || undefined,
    // 12s connection timeout to prevent hanging on slow/unreachable Turso (Vercel cold starts)
    fetch: (input: any, init: any) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
  });

  return _client;
}
