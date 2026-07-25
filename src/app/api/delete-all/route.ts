import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/turso';
import bcrypt from 'bcryptjs';

// POST - Verify admin password and delete all data
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

    // Delete all data — Building cascades to Floor→Room→Tenant,TroubleReport,VacateRecord,Inventory
    // Guest is independent (no FK to other tables)
    await Promise.all([
      execute('DELETE FROM "Building"'),
      execute('DELETE FROM "Guest"'),
    ]);

    return NextResponse.json({ success: true, message: 'সমস্ত ডাটা মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('Delete all error:', error);
    return NextResponse.json({ error: 'ডাটা মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
