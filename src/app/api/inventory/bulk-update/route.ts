import { NextRequest, NextResponse } from 'next/server';
import { batch, invalidateCache } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

export async function PATCH(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { items } = body; // [{ id, quantity, condition }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Use batch() — single HTTP round-trip instead of N sequential calls
    const statements = items.map(item => ({
      sql: `UPDATE "Inventory" SET quantity = ?, condition = ?, "updatedAt" = ? WHERE id = ?`,
      args: [parseInt(item.quantity) || 0, item.condition || "ভালো", now, item.id],
    }));
    await batch(statements);

    // Clear cache once at the end
    invalidateCache();

    return NextResponse.json({ success: true, updated: items.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "বাল্ক আপডেট করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}
