import { NextResponse } from 'next/server';

// GET - Ultra-lightweight keep-warm endpoint
// Warms both the serverless function AND the DB connection to prevent cold start delays
export async function GET() {
  const startTime = Date.now();

  try {
    // Warm both DB client AND auth client in parallel
    const dbPromise = (async () => {
      try {
        const { createClient } = await import('@libsql/client');
        const tursoUrl = process.env.DATABASE_URL || '';
        const tursoToken = process.env.TURSO_AUTH_TOKEN || '';

        if (!tursoUrl.startsWith('libsql://')) return 'no_turso';

        const client = createClient({
          url: tursoUrl,
          authToken: tursoToken || undefined,
        });

        // Race the query against a 5s timeout
        const result = await Promise.race([
          client.execute({ sql: `SELECT 1 as ok` }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);

        client.close();
        return 'ok';
      } catch {
        return 'skip';
      }
    })();

    // Also pre-warm the auth client (getAuthClient) so /api/auth/me cold start is avoided
    const authPromise = (async () => {
      try {
        const { getAuthClient } = await import('@/lib/turso-auth');
        const authClient = getAuthClient();
        await Promise.race([
          authClient.execute({ sql: `SELECT 1 as ok` }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        return 'ok';
      } catch {
        return 'skip';
      }
    })();

    const [dbStatus, authStatus] = await Promise.all([dbPromise, authPromise]);
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      status: 'warm',
      db: dbStatus,
      auth: authStatus,
      responseTimeMs: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: 'warm',
      db: 'skip',
      auth: 'skip',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
}
