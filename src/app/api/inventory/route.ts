import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid } from '@/lib/turso'
import { ensureTablesExist } from '@/lib/db-init';;

// GET all inventory (optionally filter by roomId or tenantId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const tenantId = searchParams.get('tenantId');
    const roomNumber = searchParams.get('roomNumber');
    const lastTenant = searchParams.get('lastTenant');

    // If lastTenant=true && roomId provided, get disconnected (previous) inventory for that room
    // These are items left by the most recently vacated tenant
    if (lastTenant === 'true' && roomId) {
      const inventory = await query(
        `SELECT * FROM Inventory WHERE roomId = ? AND tenantId IS NULL ORDER BY addedDate ASC`,
        [roomId]
      );

      // Also find the last vacated tenant name for display
      const lastVacateRecord = await queryOne(
        `SELECT tenantName, tenantId FROM VacateRecord WHERE roomId = ? ORDER BY vacatedAt DESC LIMIT 1`,
        [roomId]
      );

      return NextResponse.json({
        tenantName: lastVacateRecord?.tenantName || "",
        tenantId: lastVacateRecord?.tenantId || "",
        items: inventory,
      }, {
        headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
      });
    }

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const args: any[] = [];

    if (roomId) { conditions.push('roomId = ?'); args.push(roomId); }
    if (tenantId) { conditions.push('tenantId = ?'); args.push(tenantId); }
    if (roomNumber) { conditions.push('roomNumber = ?'); args.push(roomNumber); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const inventory = await query(
      `SELECT * FROM Inventory ${whereClause} ORDER BY addedDate DESC`,
      args
    );

    if (inventory.length === 0) {
      return NextResponse.json(inventory, {
        headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
      });
    }

    // Collect unique tenantIds (non-null) and roomIds for join
    const tenantIds = [...new Set(inventory.map((i: any) => i.tenantId).filter(Boolean))];
    const roomIds = [...new Set(inventory.map((i: any) => i.roomId).filter(Boolean))];

    const [tenants, rooms] = await Promise.all([
      tenantIds.length > 0
        ? query(`SELECT * FROM Tenant WHERE id IN (${tenantIds.map(() => '?').join(',')})`, tenantIds)
        : Promise.resolve([]),
      roomIds.length > 0
        ? query(`SELECT * FROM Room WHERE id IN (${roomIds.map(() => '?').join(',')})`, roomIds)
        : Promise.resolve([]),
    ]);

    const tenantMap = new Map(tenants.map((t: any) => [t.id, { ...t, isActive: !!t.isActive }]));
    const roomMap = new Map(rooms.map((r: any) => [r.id, r]));

    const result = inventory.map((item: any) => ({
      ...item,
      tenant: item.tenantId ? (tenantMap.get(item.tenantId) || null) : null,
      room: roomMap.get(item.roomId) || null,
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'ইনভেন্টরি লোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// POST add inventory item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemName, quantity, condition, roomNumber, tenantId, roomId, note } = body;

    if (!itemName?.trim()) {
      return NextResponse.json({ error: 'মালামালের নাম দিন' }, { status: 400 });
    }

    // If roomId not provided, try to find room by roomNumber
    let resolvedRoomId = roomId;
    if (!resolvedRoomId && roomNumber) {
      const room = await queryOne(`SELECT id FROM Room WHERE roomNumber = ?`, [roomNumber.trim()]);
      if (room) {
        resolvedRoomId = room.id;
      }
    }

    if (!resolvedRoomId) {
      return NextResponse.json({ error: 'রুম পাওয়া যায়নি। আগে রুম তৈরি করুন।' }, { status: 400 });
    }

    // Check for duplicate item name in this room
    const existing = await query<{ itemName: string }>(
      `SELECT "itemName" FROM "Inventory" WHERE "roomId" = ? AND LOWER("itemName") = LOWER(?) LIMIT 1`,
      [resolvedRoomId, itemName.trim()]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: `"${itemName.trim()}" ইতিমধ্যে এই রুমে আছে। ডুপ্লিকেট মালামাল যোগ করা যাবে না।` }, { status: 409 });
    }

    const id = uuid();
    const now = new Date().toISOString();

    // Inventory ALWAYS belongs to the ROOM, never to a tenant
    // Force tenantId to null regardless of what client sends
    await execute(
      `INSERT INTO Inventory (id, itemName, quantity, condition, roomNumber, tenantId, roomId, note, addedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        itemName.trim(),
        parseInt(quantity) || 1,
        condition || 'ভালো',
        (roomNumber || '').trim(),
        null,
        resolvedRoomId,
        note?.trim() || null,
        now,
        now,
        now,
      ]
    );

    const item = await queryOne(`SELECT * FROM Inventory WHERE id = ?`, [id]);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'মালামাল যোগ করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH update inventory item
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, itemName, quantity, condition, note } = body;

    const sets: string[] = ['updatedAt = ?'];
    const args: any[] = [new Date().toISOString()];

    if (itemName) { sets.push('itemName = ?'); args.push(itemName); }
    if (quantity !== undefined) { sets.push('quantity = ?'); args.push(parseInt(quantity)); }
    if (condition) { sets.push('condition = ?'); args.push(condition); }
    if (note !== undefined) { sets.push('note = ?'); args.push(note); }

    args.push(id);
    await execute(`UPDATE Inventory SET ${sets.join(', ')} WHERE id = ?`, args);

    const item = await queryOne(`SELECT * FROM Inventory WHERE id = ?`, [id]);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'ইনভেন্টরি আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE inventory item
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await execute(`DELETE FROM Inventory WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'মালামাল মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
