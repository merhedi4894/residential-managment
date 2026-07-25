import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid, invalidateCache } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// GET: List snapshots by roomId
export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'রুম আইডি দিন' }, { status: 400 });
    }

    const snapshots = await query<{
      id: string; tenantId: string; tenantName: string; roomId: string;
      roomNumber: string; snapshotType: string; inventorySnapshot: string; createdAt: string;
    }>(
      `SELECT "id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt"
       FROM "InventorySnapshot" WHERE "roomId" = ?
       ORDER BY "createdAt" DESC`,
      [roomId]
    );

    return NextResponse.json(snapshots, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'স্ন্যাপশট লোড করতে সমস্যা' }, { status: 500 });
  }
}

// POST: Create a new snapshot
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { tenantId, tenantName, roomId, roomNumber, snapshotType, inventorySnapshot } = body;

    if (!tenantId || !tenantName || !roomId || !roomNumber || !inventorySnapshot) {
      return NextResponse.json({ error: 'প্রয়োজনীয় তথ্য দিন' }, { status: 400 });
    }

    const id = uuid();
    await execute(
      `INSERT INTO "InventorySnapshot" ("id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, tenantId, tenantName, roomId, roomNumber, snapshotType || 'assign', typeof inventorySnapshot === 'string' ? inventorySnapshot : JSON.stringify(inventorySnapshot)]
    );

    invalidateCache();

    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json({ error: 'স্ন্যাপশট তৈরি করতে সমস্যা' }, { status: 500 });
  }
}

// PATCH: Update snapshot
export async function PATCH(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { id, inventorySnapshot, tenantName, snapshotType, createdAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'আইডি দিন' }, { status: 400 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (inventorySnapshot !== undefined) {
      sets.push('"inventorySnapshot" = ?');
      args.push(typeof inventorySnapshot === 'string' ? inventorySnapshot : JSON.stringify(inventorySnapshot));
    }
    if (tenantName !== undefined) {
      sets.push('"tenantName" = ?');
      args.push(tenantName);
    }
    if (snapshotType !== undefined) {
      sets.push('"snapshotType" = ?');
      args.push(snapshotType);
    }
    if (createdAt !== undefined && createdAt) {
      sets.push('"createdAt" = ?');
      args.push(createdAt);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'আপডেট করার মতো কিছু নেই' }, { status: 400 });
    }

    args.push(id);
    await execute(
      `UPDATE "InventorySnapshot" SET ${sets.join(', ')} WHERE "id" = ?`,
      args
    );

    invalidateCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'স্ন্যাপশট আপডেট করতে সমস্যা' }, { status: 500 });
  }
}

// DELETE: Delete a snapshot
export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'আইডি দিন' }, { status: 400 });
    }

    await execute(`DELETE FROM "InventorySnapshot" WHERE "id" = ?`, [id]);
    invalidateCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'স্ন্যাপশট মুছে ফেলতে সমস্যা' }, { status: 500 });
  }
}
