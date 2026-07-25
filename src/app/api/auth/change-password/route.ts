import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST - Change password (requires current password)
export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    const sessionToken = req.cookies.get('session_token')?.value;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'বর্তমান ও নতুন পাসওয়ার্ড দিন' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে' }, { status: 400 });
    }

    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    // Find user by session
    const result = await client.execute({
      sql: `SELECT "id", "password" FROM "User" WHERE "sessionToken" = ?`,
      args: [sessionToken],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'অনুমতি নেই' }, { status: 401 });
    }

    const row = result.rows[0] as any;

    // Verify current password (support plain text fallback)
    let isValid = false;
    if (row.password.startsWith('$2')) {
      isValid = await bcrypt.compare(currentPassword, row.password);
    } else {
      isValid = currentPassword === row.password;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'বর্তমান পাসওয়ার্ড ভুল' }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.execute({
      sql: `UPDATE "User" SET "password" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
      args: [hashedPassword, row.id],
    });

    return NextResponse.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন হয়েছে' });
  } catch (error) {
    console.error('[change-password] Error:', error);
    return NextResponse.json({ error: 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
