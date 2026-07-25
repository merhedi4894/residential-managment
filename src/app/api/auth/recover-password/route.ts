import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Recover password using security question
export async function POST(req: NextRequest) {
  try {
    const { username, securityAnswer, newPassword } = await req.json();

    if (!username || !securityAnswer || !newPassword) {
      return NextResponse.json({ error: 'সব তথ্য দিন' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' }, { status: 400 });
    }

    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    // Find user
    const result = await client.execute({
      sql: `SELECT "id", "username", "securityAnswer" FROM "User" WHERE "username" = ?`,
      args: [username],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ইউজারনেম পাওয়া যায়নি' }, { status: 404 });
    }

    const row = result.rows[0] as any;
    const storedAnswer = row.securityAnswer;

    // Verify security answer (support both bcrypt and plain text)
    let isValid = false;
    if (storedAnswer.startsWith('$2')) {
      isValid = await bcrypt.compare(securityAnswer.toLowerCase().trim(), storedAnswer);
    } else {
      isValid = securityAnswer.toLowerCase().trim() === storedAnswer.toLowerCase().trim();
    }

    if (!isValid) {
      return NextResponse.json({ error: 'নিরাপত্তা প্রশ্নের উত্তর ভুল' }, { status: 401 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sessionToken = crypto.randomBytes(32).toString('hex');

    await client.execute({
      sql: `UPDATE "User" SET "password" = ?, "sessionToken" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
      args: [hashedPassword, sessionToken, row.id],
    });

    // Set cookie so user is logged in after recovery
    const response = NextResponse.json({
      success: true,
      message: 'পাসওয়ার্ড পুনরুদ্ধার সফল হয়েছে',
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
    console.error('[recover] Error:', error?.message || error);
    return NextResponse.json({ error: 'পাসওয়ার্ড পুনরুদ্ধার করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// GET - Get security question for a username
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'ইউজারনেম দিন' }, { status: 400 });
    }

    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    const result = await client.execute({
      sql: `SELECT "securityQuestion" FROM "User" WHERE "username" = ?`,
      args: [username],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ইউজারনেম পাওয়া যায়নি' }, { status: 404 });
    }

    return NextResponse.json({ securityQuestion: (result.rows[0] as any).securityQuestion });
  } catch {
    return NextResponse.json({ error: 'তথ্য পেতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
