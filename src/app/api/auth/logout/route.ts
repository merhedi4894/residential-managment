import { NextRequest, NextResponse } from 'next/server';

// POST - Logout (clear session)
export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;

    if (sessionToken) {
      const { getAuthClient } = await import('@/lib/turso-auth');
      const client = getAuthClient();
      await client.execute({
        sql: `UPDATE "User" SET "sessionToken" = NULL, "updatedAt" = datetime('now') WHERE "sessionToken" = ?`,
        args: [sessionToken],
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'লগআউট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
