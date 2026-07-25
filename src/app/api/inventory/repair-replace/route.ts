import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid } from '@/lib/turso';

// GET — fetch repair/replace history for inventory item(s)
// Supports: ?inventoryId=X (single) OR ?inventoryIds=a,b,c (batch)
// Batch returns: { [inventoryId]: { latestRepair: "...", latestReplace: "..." } }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get('inventoryId');
    const inventoryIds = searchParams.get('inventoryIds');

    if (inventoryIds) {
      // Batch mode: return latest repair/replace date per inventory item
      const ids = inventoryIds.split(',').filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'inventoryIds দিন' }, { status: 400 });
      }
      const records = await query(
        `SELECT "inventoryId", type, "actionDate", note FROM "InventoryRepairReplace" WHERE "inventoryId" IN (${ids.map(() => '?').join(',')}) ORDER BY "inventoryId" ASC, "actionDate" DESC`,
        ids
      );
      const result: Record<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }> = {};
      for (const r of records as any[]) {
        if (!result[r.inventoryId]) {
          result[r.inventoryId] = { latestRepair: '', latestReplace: '', repairNote: null, replaceNote: null };
        }
        const entry = result[r.inventoryId];
        const dateStr = r.actionDate ? r.actionDate.split('T')[0] : '';
        if (r.type === 'repair' && !entry.latestRepair) {
          entry.latestRepair = dateStr;
          entry.repairNote = r.note;
        } else if (r.type === 'replace' && !entry.latestReplace) {
          entry.latestReplace = dateStr;
          entry.replaceNote = r.note;
        }
      }
      return NextResponse.json(result);
    }

    // Single item mode (backward compatible)
    if (!inventoryId) {
      return NextResponse.json({ error: 'inventoryId দিন' }, { status: 400 });
    }

    const records = await query(
      `SELECT * FROM "InventoryRepairReplace" WHERE "inventoryId" = ? ORDER BY "actionDate" DESC`,
      [inventoryId]
    );

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'রেকর্ড লোড করতে সমস্যা' }, { status: 500 });
  }
}

// POST — add a new repair or replace record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inventoryId, type, actionDate, note } = body;

    if (!inventoryId || !type) {
      return NextResponse.json({ error: 'প্রয়োজনীয় তথ্য দিন' }, { status: 400 });
    }

    if (!['repair', 'replace'].includes(type)) {
      return NextResponse.json({ error: 'type repair বা replace হতে হবে' }, { status: 400 });
    }

    const id = uuid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO "InventoryRepairReplace" (id, "inventoryId", type, "actionDate", note, "createdAt") VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        inventoryId,
        type,
        actionDate ? new Date(actionDate).toISOString() : now,
        note?.trim() || null,
        now,
      ]
    );

    const record = await queryOne(
      `SELECT * FROM "InventoryRepairReplace" WHERE id = ?`,
      [id]
    );

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'রেকর্ড সেভ করতে সমস্যা' }, { status: 500 });
  }
}

// DELETE — remove a repair/replace record
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id দিন' }, { status: 400 });
    }
    await execute(`DELETE FROM "InventoryRepairReplace" WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'রেকর্ড মুছে ফেলতে সমস্যা' }, { status: 500 });
  }
}
