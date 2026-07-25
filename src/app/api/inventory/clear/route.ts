import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/turso';
import bcrypt from 'bcryptjs';

// POST - Verify admin password and delete ALL inventory items from all rooms
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'পাসওয়ার্ড দিন' }, { status: 400 });
    }

    // Get the admin user
    const user = await queryOne<{ id: string; username: string; password: string }>(
      'SELECT id, username, password FROM "User" LIMIT 1'
    );

    if (!user) {
      return NextResponse.json({ error: 'কোনো ইউজার পাওয়া যায়নি' }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'ভুল পাসওয়ার্ড' }, { status: 401 });
    }

    // Count before deleting
    const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM "Inventory"');
    const count = countRow?.count ?? 0;

    // Delete ALL inventory items (both current and previous/disconnected)
    await execute('DELETE FROM "Inventory"');

    return NextResponse.json({
      success: true,
      deletedCount: count,
      message: `${count}টি মালামাল মুছে ফেলা হয়েছে`,
    });
  } catch (error) {
    console.error('Clear inventory error:', error);
    return NextResponse.json({ error: 'মালামাল মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
