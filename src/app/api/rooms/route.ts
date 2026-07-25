import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid } from '@/lib/turso';

// POST create room on a floor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomNumber, floorId } = body;
    const id = uuid();
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO "Room" (id, "roomNumber", "floorId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
      [id, roomNumber, floorId, now, now]
    );

    const room = await queryOne('SELECT * FROM "Room" WHERE id = ?', [id]);
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: 'রুম তৈরি করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH update room number
export async function PATCH(req: NextRequest) {
  try {
    const { id, roomNumber } = await req.json();

    if (!id || !roomNumber?.trim()) {
      return NextResponse.json({ error: 'রুম নম্বর দিন' }, { status: 400 });
    }

    const now = new Date().toISOString();
    await execute(
      'UPDATE "Room" SET "roomNumber" = ?, "updatedAt" = ? WHERE id = ?',
      [roomNumber.trim(), now, id]
    );

    const room = await queryOne('SELECT * FROM "Room" WHERE id = ?', [id]);
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: 'রুম আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE room
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await execute('DELETE FROM "Room" WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'রুম মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
