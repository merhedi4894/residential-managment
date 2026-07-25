import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Login with username and password
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'ইউজারনেম ও পাসওয়ার্ড দিন' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // ── Connect to Turso with timeout ──
    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    // Find user by username
    const result = await client.execute({
      sql: `SELECT "id", "username", "password", "isSetup", "sessionToken" FROM "User" WHERE "username" = ?`,
      args: [trimmedUsername],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' }, { status: 401 });
    }

    const row = result.rows[0] as any;
    const storedPassword = row.password;

    if (!storedPassword) {
      return NextResponse.json({ error: 'ভুল পাসওয়ার্ড' }, { status: 401 });
    }

    let isValid = false;
    let needsHashUpgrade = false;

    // Check if stored password is a bcrypt hash (starts with $2)
    if (storedPassword.startsWith('$2')) {
      isValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Fallback: plain text comparison
      isValid = password === storedPassword;
      if (isValid) needsHashUpgrade = true;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'ভুল পাসওয়ার্ড' }, { status: 401 });
    }

    // If password was plain text, upgrade to bcrypt hash
    if (needsHashUpgrade) {
      try {
        const newHash = await bcrypt.hash(password, 10);
        await client.execute({
          sql: `UPDATE "User" SET "password" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
          args: [newHash, row.id],
        });
      } catch (upgradeErr: any) {
        console.error('[login] Failed to upgrade password hash:', upgradeErr?.message);
      }
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Update session token
    await client.execute({
      sql: `UPDATE "User" SET "sessionToken" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
      args: [sessionToken, row.id],
    });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: row.id, username: row.username },
      needsSetup: !row.isSetup,
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[login] Login error:', error?.message || error);
    return NextResponse.json({
      error: 'লগইন করতে সমস্যা হয়েছে',
    }, { status: 500 });
  }
}
