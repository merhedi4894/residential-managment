import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// GET room users for a room
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'রুম আইডি দিন' }, { status: 400 });
    }
    const roomUsers = await query(
      `SELECT * FROM RoomUser WHERE roomId = ? ORDER BY createdAt DESC`,
      [roomId]
    );
    return NextResponse.json(roomUsers, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'রুম ব্যবহারকারী লোড করতে সমস্যা' }, { status: 500 });
  }
}

// POST create room user
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { name, designation, phone, department, roomId, startDate } = body;
    if (!name || !roomId || !startDate) {
      return NextResponse.json({ error: 'নাম, রুম এবং শুরুর তারিখ দিন' }, { status: 400 });
    }
    const id = uuid();
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO RoomUser (id, name, designation, phone, department, roomId, startDate, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, name, designation || null, phone || null, department || null, roomId, new Date(startDate).toISOString(), now, now]
    );
    const created = await queryOne(`SELECT * FROM RoomUser WHERE id = ?`, [id]);
    return NextResponse.json({ ...created, isActive: !!created?.isActive });
  } catch (error) {
    return NextResponse.json({ error: 'রুম ব্যবহারকারী তৈরি করতে সমস্যা' }, { status: 500 });
  }
}

// PATCH update room user info or deactivate
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, name, designation, phone, department, startDate } = body;

    if (action === 'updateInfo') {
      const sets: string[] = [];
      const args: any[] = [];
      if (name !== undefined) { sets.push('name = ?'); args.push(name); }
      if (designation !== undefined) { sets.push('designation = ?'); args.push(designation || null); }
      if (phone !== undefined) { sets.push('phone = ?'); args.push(phone || null); }
      if (department !== undefined) { sets.push('department = ?'); args.push(department || null); }
      if (startDate !== undefined) { sets.push('startDate = ?'); args.push(new Date(startDate).toISOString()); }
      if (sets.length === 0) {
        return NextResponse.json({ error: 'আপডেট করার মতো কিছু নেই' }, { status: 400 });
      }
      sets.push('updatedAt = ?');
      args.push(new Date().toISOString());
      args.push(id);
      await execute(`UPDATE RoomUser SET ${sets.join(', ')} WHERE id = ?`, args);
      const updated = await queryOne(`SELECT * FROM RoomUser WHERE id = ?`, [id]);
      return NextResponse.json({ ...updated, isActive: !!updated?.isActive });
    }

    // Default: deactivate room user (leave room)
    const now = new Date().toISOString();
    await execute(
      `UPDATE RoomUser SET isActive = 0, endDate = ?, updatedAt = ? WHERE id = ?`,
      [now, now, id]
    );
    const updated = await queryOne(`SELECT * FROM RoomUser WHERE id = ?`, [id]);
    return NextResponse.json({ ...updated, isActive: !!updated?.isActive });
  } catch (error) {
    return NextResponse.json({ error: 'রুম ব্যবহারকারী আপডেট করতে সমস্যা' }, { status: 500 });
  }
}

// DELETE room user
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await execute(`DELETE FROM RoomUser WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'রুম ব্যবহারকারী মুছে ফেলতে সমস্যা' }, { status: 500 });
  }
}
