import { NextRequest, NextResponse } from 'next/server';

// GET - Check current session
export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Use shared auth client with timeout
    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    const result = await client.execute({
      sql: `SELECT "id", "username", "isSetup" FROM "User" WHERE "sessionToken" = ?`,
      args: [sessionToken],
    });

    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      return NextResponse.json({
        authenticated: true,
        user: { id: row.id, username: row.username },
        needsSetup: !row.isSetup,
      });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[auth/me] Error:', msg);
    // Distinguish timeout/network errors from auth errors
    if (msg.includes('timeout') || msg.includes('abort') || msg.includes('fetch') || msg.includes('network') || msg.includes('signal')) {
      return NextResponse.json({ authenticated: false, serverUnavailable: true, error: 'সার্ভারে সংযোগ করতে সমস্যা হচ্ছে' }, { status: 503 });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
