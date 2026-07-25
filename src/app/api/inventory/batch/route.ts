import { NextRequest, NextResponse } from 'next/server';
import { query, uuid, batch, invalidateCache } from '@/lib/turso';

// POST — batch add inventory items (single request for multiple items)
// All items are saved at room level with tenantId=null
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, tenantId, tenantIds, roomId, roomNumber } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'মালামালের তালিকা দিন' }, { status: 400 });
    }
    if (!roomId) {
      return NextResponse.json({ error: 'রুম আইডি দিন' }, { status: 400 });
    }

    // Inventory ALWAYS belongs to the ROOM, never to a tenant
    // Force tenantId to null regardless of what client sends
    const targetTenantIds: (string | null)[] = [null];

    const now = new Date().toISOString();

    // Fetch ALL existing items in room grouped by tenantId for per-tenant duplicate check
    const existingItems = await query<{ itemName: string; tenantId: string | null }>(
      `SELECT DISTINCT "itemName", "tenantId" FROM "Inventory" WHERE "roomId" = ?`,
      [roomId]
    );

    // Build per-tenant existing names map
    const existingByTenant = new Map<string, Set<string>>();
    for (const item of existingItems) {
      const key = item.tenantId || '__null__';
      if (!existingByTenant.has(key)) existingByTenant.set(key, new Set());
      existingByTenant.get(key)!.add(item.itemName.trim().toLowerCase());
    }

    // Build batch statements for each tenant
    const statements: { sql: string; args: any[] }[] = [];
    let totalAdded = 0;
    let totalSkipped = 0;

    for (const tid of targetTenantIds) {
      const existingNames = existingByTenant.get(tid || '__null__') || new Set();

      for (const item of items) {
        if (!item.itemName?.trim()) continue;
        const name = item.itemName.trim();

        if (existingNames.has(name.toLowerCase())) {
          totalSkipped++;
          continue;
        }

        const id = uuid();
        statements.push({
          sql: `INSERT INTO "Inventory" (id, "itemName", quantity, "condition", "roomNumber", "tenantId", "roomId", "note", "addedDate", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            name,
            parseInt(item.quantity) || 1,
            item.condition || 'ভালো',
            (roomNumber || '').trim(),
            tid || null,
            roomId,
            item.note?.trim() || null,
            now,
            now,
            now,
          ],
        });
        // Prevent duplicates within the same batch for the same tenant
        existingNames.add(name.toLowerCase());
        totalAdded++;
      }
    }

    if (statements.length === 0) {
      const msg = totalSkipped > 0
        ? `সব মালামাল ইতিমধ্যে আছে (${toBanglaNumber(totalSkipped)} টি ডুপ্লিকেট)`
        : 'যোগ করার মতো কোনো মালামাল নেই';
      return NextResponse.json({ added: 0, skipped: totalSkipped, message: msg });
    }

    // Execute all inserts in a single batch
    await batch(statements);
    invalidateCache();

    return NextResponse.json({
      added: totalAdded,
      skipped: totalSkipped,
      message: `${toBanglaNumber(totalAdded)} টি মালামাল যোগ হয়েছে${totalSkipped > 0 ? `, ${toBanglaNumber(totalSkipped)} টি ডুপ্লিকেট বাদ পড়েছে` : ''}`,
    });
  } catch (error) {
    console.error('[inventory/batch] Error:', error);
    return NextResponse.json({ error: 'মালামাল যোগ করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

function toBanglaNumber(num: number): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => banglaDigits[parseInt(d)]);
}
