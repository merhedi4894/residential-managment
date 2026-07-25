import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, batch, uuid } from '@/lib/turso'
import { ensureTablesExist } from '@/lib/db-init';;

// GET all trouble reports (optionally filter by roomId or status)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status');
    const roomNumber = searchParams.get('roomNumber');

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const args: any[] = [];

    if (roomId) { conditions.push('roomId = ?'); args.push(roomId); }
    if (status) { conditions.push('status = ?'); args.push(status); }
    if (roomNumber) { conditions.push('roomNumber = ?'); args.push(roomNumber); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const reports = await query(
      `SELECT * FROM TroubleReport ${whereClause} ORDER BY reportedAt DESC`,
      args
    );

    if (reports.length === 0) {
      return NextResponse.json(reports, {
        headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
      });
    }

    // Collect unique roomIds for join
    const roomIds = [...new Set(reports.map((r: any) => r.roomId).filter(Boolean))];
    const rooms = roomIds.length > 0
      ? await query(`SELECT * FROM Room WHERE id IN (${roomIds.map(() => '?').join(',')})`, roomIds)
      : [];

    const roomMap = new Map(rooms.map((r: any) => [r.id, r]));

    const result = reports.map((report: any) => ({
      ...report,
      room: roomMap.get(report.roomId) || null,
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'ট্রাবল রিপোর্ট লোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// POST create trouble report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomNumber, roomId, description, reportedBy } = body;

    const id = uuid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO TroubleReport (id, roomNumber, roomId, description, reportedBy, reportedAt, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'পেন্ডিং', ?, ?)`,
      [id, roomNumber, roomId, description, reportedBy, now, now, now]
    );

    const report = await queryOne(`SELECT * FROM TroubleReport WHERE id = ?`, [id]);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: 'ট্রাবল রিপোর্ট তৈরি করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH resolve trouble report
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, resolutionNote, resolvedBy, description, reportedBy, newItems } = body;

    // Edit mode: update description and/or reportedBy only
    if (description !== undefined || reportedBy !== undefined) {
      const sets: string[] = ['updatedAt = ?'];
      const args: any[] = [new Date().toISOString()];

      if (description !== undefined) { sets.push('description = ?'); args.push(description); }
      if (reportedBy !== undefined) { sets.push('reportedBy = ?'); args.push(reportedBy); }

      args.push(id);
      await execute(`UPDATE TroubleReport SET ${sets.join(', ')} WHERE id = ?`, args);

      const report = await queryOne(`SELECT * FROM TroubleReport WHERE id = ?`, [id]);
      return NextResponse.json(report);
    }

    // Resolve mode
    const now = new Date().toISOString();
    await execute(
      `UPDATE TroubleReport SET status = ?, resolutionNote = ?, resolvedBy = ?, resolvedAt = ?, updatedAt = ? WHERE id = ?`,
      [status || 'সমাধান হয়েছে', resolutionNote, resolvedBy, now, now, id]
    );

    const report = await queryOne(`SELECT * FROM TroubleReport WHERE id = ?`, [id]);

    // Auto-add new inventory items if provided (e.g., new items added during repair)
    if (newItems && newItems.length > 0 && report?.roomId) {
      const room = await queryOne(`SELECT * FROM Room WHERE id = ?`, [report.roomId]);

      if (room) {
        const activeTenant = await queryOne(
          `SELECT * FROM Tenant WHERE roomId = ? AND isActive = 1 LIMIT 1`,
          [report.roomId]
        );

        const invNow = new Date().toISOString();
        await batch(
          (newItems as { itemName: string; quantity: number; condition?: string; note?: string }[]).map(item => ({
            sql: `INSERT INTO Inventory (id, itemName, quantity, condition, roomNumber, tenantId, roomId, note, addedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuid(),
              item.itemName,
              parseInt(String(item.quantity)),
              item.condition || 'ভালো',
              report.roomNumber,
              activeTenant?.id || null,
              report.roomId,
              `ট্রাবল রিপোর্ট থেকে যোগ: ${item.note || ''}`,
              invNow,
              invNow,
              invNow,
            ],
          }))
        );
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: 'ট্রাবল রিপোর্ট আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE trouble report
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await execute(`DELETE FROM TroubleReport WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'ট্রাবল রিপোর্ট মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
