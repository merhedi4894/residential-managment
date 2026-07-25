import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, batch, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';
import bcrypt from 'bcryptjs';

// GET all buildings
export async function GET() {
  try {
    const [buildings, floors, rooms, tenants] = await Promise.all([
      query('SELECT * FROM "Building" ORDER BY "createdAt" ASC'),
      query('SELECT * FROM "Floor" ORDER BY "floorNumber" ASC'),
      query('SELECT * FROM "Room"'),
      query<{ id: string; name: string; isActive: number; roomId: string }>(
        'SELECT id, name, "isActive", "roomId" FROM "Tenant" WHERE "isActive" = 1'
      ),
    ]);

    // Group rooms by floorId
    const roomsByFloorId = new Map<string, any[]>();
    for (const room of rooms) {
      const list = roomsByFloorId.get(room.floorId) || [];
      list.push(room);
      roomsByFloorId.set(room.floorId, list);
    }

    // Group tenants by roomId (strip roomId from output, convert isActive to boolean)
    const tenantsByRoomId = new Map<string, any[]>();
    for (const t of tenants) {
      const { roomId, ...rest } = t;
      const list = tenantsByRoomId.get(roomId) || [];
      list.push({ ...rest, isActive: !!rest.isActive });
      tenantsByRoomId.set(roomId, list);
    }

    // Build nested structure matching Prisma include shape
    const result = buildings.map((building: any) => ({
      ...building,
      floors: floors
        .filter((f: any) => f.buildingId === building.id)
        .map((floor: any) => ({
          ...floor,
          rooms: (roomsByFloorId.get(floor.id) || []).map((room: any) => ({
            ...room,
            tenants: tenantsByRoomId.get(room.id) || [],
          })),
        })),
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'বিল্ডিং লোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// POST create building
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { name, totalFloors } = body;

    const buildingId = uuid();
    const now = new Date().toISOString();
    const floorCount = parseInt(totalFloors);

    // Create building + all floors in a single batch
    const statements: { sql: string; args: any[] }[] = [
      {
        sql: 'INSERT INTO "Building" (id, name, "totalFloors", "capacityPerRoom", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
        args: [buildingId, name, floorCount, parseInt(body.capacityPerRoom) || 1, now, now],
      },
      ...Array.from({ length: floorCount }, (_, i) => ({
        sql: 'INSERT INTO "Floor" (id, "floorNumber", "buildingId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
        args: [uuid(), i + 1, buildingId, now, now],
      })),
    ];
    await batch(statements);

    // Fetch created floors for response
    const floors = await query('SELECT * FROM "Floor" WHERE "buildingId" = ? ORDER BY "floorNumber" ASC', [buildingId]);

    // Fetch building for response
    const building = await queryOne('SELECT * FROM "Building" WHERE id = ?', [buildingId]);

    return NextResponse.json({ ...building, floors });
  } catch (error) {
    return NextResponse.json({ error: 'বিল্ডিং তৈরি করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH update building name and capacity
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, capacityPerRoom } = await req.json();

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'বিল্ডিং এর নাম দিন' }, { status: 400 });
    }

    const sets: string[] = ['"name" = ?'];
    const args: any[] = [name.trim()];

    if (capacityPerRoom !== undefined && capacityPerRoom !== null) {
      const cap = parseInt(capacityPerRoom);
      if (isNaN(cap) || cap < 1) {
        return NextResponse.json({ error: 'সিট সংখ্যা ১ বা তার বেশি হতে হবে' }, { status: 400 });
      }
      sets.push('"capacityPerRoom" = ?');
      args.push(cap);
    }

    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await execute(`UPDATE "Building" SET ${sets.join(', ')} WHERE id = ?`, args);

    const building = await queryOne('SELECT * FROM "Building" WHERE id = ?', [id]);
    return NextResponse.json(building);
  } catch (error) {
    return NextResponse.json({ error: 'বিল্ডিং আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE building (requires admin password verification)
export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { id, adminPassword } = await req.json();

    if (!adminPassword) {
      return NextResponse.json({ error: 'এডমিন পাসওয়ার্ড দিন' }, { status: 400 });
    }

    // Verify admin password
    const adminUser = await queryOne<{ password: string }>('SELECT password FROM "User" WHERE "isSetup" = 1 LIMIT 1');
    if (!adminUser) {
      return NextResponse.json({ error: 'এডমিন ইউজার পাওয়া যায়নি' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(adminPassword, adminUser.password);
    if (!isValid) {
      return NextResponse.json({ error: 'পাসওয়ার্ড ভুল হয়েছে' }, { status: 401 });
    }

    await execute('DELETE FROM "Building" WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'বিল্ডিং মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
