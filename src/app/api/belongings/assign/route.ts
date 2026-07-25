import { NextRequest, NextResponse } from 'next/server';
import { query, execute, batch, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// POST - Assign belonging templates to all rooms in a building (optimized batch)
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { buildingId } = await req.json();

    if (!buildingId) {
      return NextResponse.json({ error: 'বিল্ডিং আইডি দরকার' }, { status: 400 });
    }

    // Get templates and floors in parallel
    const [templates, floorsWithRooms] = await Promise.all([
      query<{ id: string; buildingId: string; itemName: string; quantity: number }>(
        'SELECT * FROM "BelongingTemplate" WHERE "buildingId" = ?',
        [buildingId]
      ),
      query<{ id: string; floorNumber: number; buildingId: string; roomId: string; roomNumber: string }>(
        `SELECT f.id, f."floorNumber", f."buildingId", r.id as "roomId", r."roomNumber"
         FROM "Floor" f
         JOIN "Room" r ON r."floorId" = f.id
         WHERE f."buildingId" = ?
         ORDER BY f."floorNumber" ASC, r."roomNumber" ASC`,
        [buildingId]
      ),
    ]);

    if (templates.length === 0) {
      return NextResponse.json({ error: 'এই বিল্ডিংয়ে কোনো মালামাল টেমপ্লেট নেই' }, { status: 400 });
    }

    // Group rooms by floor to preserve the flatMap structure for logic
    const floorsMap = new Map<string, { id: string; floorNumber: number; buildingId: string; rooms: { id: string; roomNumber: string }[] }>();
    for (const row of floorsWithRooms) {
      if (!floorsMap.has(row.id)) {
        floorsMap.set(row.id, {
          id: row.id,
          floorNumber: row.floorNumber,
          buildingId: row.buildingId,
          rooms: [],
        });
      }
      floorsMap.get(row.id)!.rooms.push({ id: row.roomId, roomNumber: row.roomNumber });
    }
    const floors = Array.from(floorsMap.values());

    const allRooms = floors.flatMap((f) => f.rooms);
    if (allRooms.length === 0) {
      return NextResponse.json({ error: 'এই বিল্ডিংয়ে কোনো রুম নেই' }, { status: 400 });
    }

    // Batch check: Fetch ALL existing inventory items for ALL rooms in ONE query
    const roomIds = allRooms.map((r) => r.id);
    const templateNames = templates.map((t) => t.itemName);

    // Build placeholders for IN clauses
    const roomPlaceholders = roomIds.map(() => '?').join(',');
    const namePlaceholders = templateNames.map(() => '?').join(',');

    const existingItems = await query<{ id: string; roomId: string; itemName: string }>(
      `SELECT id, "roomId", "itemName" FROM "Inventory" WHERE "roomId" IN (${roomPlaceholders}) AND "itemName" IN (${namePlaceholders}) AND "tenantId" IS NULL`,
      [...roomIds, ...templateNames]
    );

    // Build a Set of "roomId-itemName" for fast lookup
    const existingKeys = new Set(existingItems.map((i) => `${i.roomId}::${i.itemName}`));

    // Prepare all items to create
    const itemsToCreate: { itemName: string; quantity: number; condition: string; roomNumber: string; roomId: string; tenantId: null }[] = [];

    for (const room of allRooms) {
      for (const template of templates) {
        const key = `${room.id}::${template.itemName}`;
        if (!existingKeys.has(key)) {
          itemsToCreate.push({
            itemName: template.itemName,
            quantity: template.quantity,
            condition: 'ভালো',
            roomNumber: room.roomNumber,
            roomId: room.id,
            tenantId: null,
          });
        }
      }
    }

    // Create all items in batch operations
    if (itemsToCreate.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
        const chunk = itemsToCreate.slice(i, i + BATCH_SIZE);
        const statements = chunk.map((item) => ({
          sql: `INSERT INTO "Inventory" (id, "itemName", quantity, "condition", "roomNumber", "tenantId", "roomId", "addedDate", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
          args: [uuid(), item.itemName, item.quantity, item.condition, item.roomNumber, item.tenantId, item.roomId],
        }));
        await batch(statements);
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount: itemsToCreate.length,
      roomCount: allRooms.length,
      itemCount: templates.length,
    });
  } catch (error) {
    console.error('Belongings assign error:', error);
    return NextResponse.json({ error: 'মালামাল বণ্টন করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
