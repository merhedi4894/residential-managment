import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Security setup (change username, password, security question)
export async function POST(req: NextRequest) {
  try {
    const { currentUsername, newUsername, newPassword, securityQuestion, securityAnswer } = await req.json();

    if (!currentUsername || !newUsername || !newPassword || !securityQuestion || !securityAnswer) {
      return NextResponse.json({ error: 'সব তথ্য দিন' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' }, { status: 400 });
    }

    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    // Find user by current username
    const result = await client.execute({
      sql: `SELECT "id", "username" FROM "User" WHERE "username" = ?`,
      args: [currentUsername],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ইউজার পাওয়া যায়নি' }, { status: 404 });
    }

    const row = result.rows[0] as any;

    // Check if new username is already taken
    if (newUsername !== currentUsername) {
      const existing = await client.execute({
        sql: `SELECT "id" FROM "User" WHERE "username" = ? AND "id" != ?`,
        args: [newUsername, row.id],
      });
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'এই ইউজারনেম আগে থেকেই আছে' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const hashedAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Update user
    await client.execute({
      sql: `UPDATE "User" SET "username" = ?, "password" = ?, "securityQuestion" = ?, "securityAnswer" = ?, "isSetup" = 1, "sessionToken" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
      args: [newUsername, hashedPassword, securityQuestion, hashedAnswer, sessionToken, row.id],
    });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: row.id, username: newUsername },
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[setup] Error:', error);
    return NextResponse.json({ error: 'সেটআপ করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
