import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, batch, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// GET all tenants (optionally filter by roomId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    // Fetch tenants
    const tenants = roomId
      ? await query(`SELECT * FROM Tenant WHERE roomId = ? ORDER BY createdAt DESC`, [roomId])
      : await query(`SELECT * FROM Tenant ORDER BY createdAt DESC`);

    if (tenants.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
      });
    }

    // Collect unique roomIds
    const roomIds = [...new Set(tenants.map((t: any) => t.roomId))];
    const rooms = roomIds.length > 0
      ? await query(`SELECT * FROM Room WHERE id IN (${roomIds.map(() => '?').join(',')})`, roomIds)
      : [];

    // Collect unique floorIds from rooms
    const floorIds = [...new Set(rooms.map((r: any) => r.floorId))];
    const floors = floorIds.length > 0
      ? await query(`SELECT * FROM Floor WHERE id IN (${floorIds.map(() => '?').join(',')})`, floorIds)
      : [];

    // Collect unique buildingIds from floors
    const buildingIds = [...new Set(floors.map((f: any) => f.buildingId))];
    const buildings = buildingIds.length > 0
      ? await query(`SELECT id, name FROM Building WHERE id IN (${buildingIds.map(() => '?').join(',')})`, buildingIds)
      : [];

    // Create lookup maps
    const roomMap = new Map(rooms.map((r: any) => [r.id, r]));
    const floorMap = new Map(floors.map((f: any) => [f.id, f]));
    const buildingMap = new Map(buildings.map((b: any) => [b.id, b]));

    const tenantsWithBuilding = tenants.map((t: any) => {
      const room = roomMap.get(t.roomId);
      const floor = room ? floorMap.get(room.floorId) : undefined;
      const building = floor ? buildingMap.get(floor.buildingId) : undefined;

      return {
        ...t,
        isActive: !!t.isActive,
        room: room ? {
          ...room,
          floor: floor ? {
            ...floor,
            building: building ? { id: building.id, name: building.name } : null,
          } : null,
        } : null,
        buildingName: building?.name || "",
      };
    });

    return NextResponse.json(tenantsWithBuilding, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'ভাড়াটে লোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// POST create tenant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, designation, phone, department, roomId, startDate, inventoryItems } = body;

    const tenantId = uuid();
    const now = new Date().toISOString();

    // Create new tenant (no auto-deactivation; use vacate endpoint to deactivate)
    await execute(
      `INSERT INTO Tenant (id, name, designation, phone, department, roomId, startDate, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [tenantId, name, designation || null, phone || null, department || null, roomId, new Date(startDate).toISOString(), now, now]
    );

    // Inventory belongs to the ROOM, not to tenants — no auto-assign, no copy

    // Create initial inventory items (saved at room level with tenantId=null)
    if (inventoryItems && inventoryItems.length > 0) {
      // Get roomNumber from room if not provided
      let roomNumber = body.roomNumber || '';
      if (!roomNumber) {
        const room = await queryOne(`SELECT roomNumber FROM Room WHERE id = ?`, [roomId]);
        if (room) roomNumber = room.roomNumber;
      }

      await batch(
        inventoryItems.map((item: { itemName: string; quantity: number; condition: string; note?: string }) => ({
          sql: `INSERT INTO Inventory (id, itemName, quantity, condition, roomNumber, tenantId, roomId, note, addedDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuid(),
            item.itemName,
            parseInt(String(item.quantity)) || 1,
            item.condition || 'ভালো',
            roomNumber,
            null,
            roomId,
            item.note || null,
            now,
            now,
            now,
          ],
        }))
      );
    }

    // Create inventory snapshot for assign
    try {
      // Get roomNumber
      let roomNumber = body.roomNumber || '';
      if (!roomNumber) {
        const room = await queryOne(`SELECT roomNumber FROM Room WHERE id = ?`, [roomId]);
        if (room) roomNumber = room.roomNumber;
      }

      // Fetch current room inventory items
      const roomItems = await query<{ id: string; itemName: string; quantity: number; condition: string; note: string | null }>(
        `SELECT "id", "itemName", "quantity", "condition", "note" FROM "Inventory" WHERE "roomId" = ? ORDER BY "addedDate" ASC`,
        [roomId]
      );

      // De-duplicate by itemName
      const snapshotMap = new Map<string, { itemName: string; quantity: number; condition: string; note: string | null }>();
      const inventoryIds: string[] = [];
      for (const item of roomItems) {
        const key = item.itemName.trim().toLowerCase();
        if (!snapshotMap.has(key)) {
          snapshotMap.set(key, { itemName: item.itemName, quantity: item.quantity, condition: item.condition, note: item.note });
          inventoryIds.push(item.id);
        }
      }

      // Fetch repair/replace dates for each item
      let repairReplaceMap: Map<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }> = new Map();
      if (inventoryIds.length > 0) {
        try {
          const repairRecords = await query<{ inventoryId: string; type: string; actionDate: string; note: string | null }>(
            `SELECT "inventoryId", "type", "actionDate", "note" FROM "InventoryRepairReplace" WHERE "inventoryId" IN (${inventoryIds.map(() => '?').join(',')}) ORDER BY "actionDate" DESC`,
            inventoryIds
          );
          for (const rec of repairRecords) {
            const existing = repairReplaceMap.get(rec.inventoryId) || { latestRepair: '', latestReplace: '', repairNote: null, replaceNote: null };
            if (rec.type === 'repair' && !existing.latestRepair) { existing.latestRepair = rec.actionDate; existing.repairNote = rec.note; }
            else if (rec.type === 'replace' && !existing.latestReplace) { existing.latestReplace = rec.actionDate; existing.replaceNote = rec.note; }
            repairReplaceMap.set(rec.inventoryId, existing);
          }
        } catch { /* InventoryRepairReplace might not exist */ }
      }

      // Build snapshot JSON
      const inventorySnapshot = Array.from(snapshotMap.entries()).map(([key, item], idx) => {
        const invId = inventoryIds[idx];
        const rrData = repairReplaceMap.get(invId);
        return { ...item, latestRepair: rrData?.latestRepair || null, latestReplace: rrData?.latestReplace || null, repairNote: rrData?.repairNote || null, replaceNote: rrData?.replaceNote || null };
      });

      // Insert into InventorySnapshot
      if (roomNumber) {
        await execute(
          `INSERT INTO "InventorySnapshot" ("id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt") VALUES (?, ?, ?, ?, ?, 'assign', ?, datetime('now'))`,
          [uuid(), tenantId, name, roomId, roomNumber, JSON.stringify(inventorySnapshot)]
        );
      }
    } catch { /* snapshot creation failure should not block tenant creation */ }

    // Fetch and return the created tenant
    const tenant = await queryOne(`SELECT * FROM Tenant WHERE id = ?`, [tenantId]);
    return NextResponse.json({ ...tenant, isActive: !!tenant?.isActive });
  } catch (error) {
    return NextResponse.json({ error: 'ভাড়াটে তৈরি করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH vacate tenant OR update tenant info
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, name, designation, phone, department, startDate, endDate } = body;

    if (action === "updateInfo") {
      // Update tenant name, designation, phone, and/or startDate
      const sets: string[] = [];
      const args: any[] = [];

      if (name !== undefined) { sets.push('name = ?'); args.push(name); }
      if (designation !== undefined) { sets.push('designation = ?'); args.push(designation || null); }
      if (phone !== undefined) { sets.push('phone = ?'); args.push(phone || null); }
      if (department !== undefined) { sets.push('department = ?'); args.push(department || null); }
      if (startDate !== undefined) { sets.push('startDate = ?'); args.push(new Date(startDate).toISOString()); }
      if (endDate !== undefined) { sets.push('endDate = ?'); args.push(endDate ? new Date(endDate).toISOString() : null); }

      if (sets.length === 0) {
        return NextResponse.json({ error: 'আপডেট করার মতো কিছু নেই' }, { status: 400 });
      }

      sets.push('updatedAt = ?');
      args.push(new Date().toISOString());
      args.push(id);

      await execute(`UPDATE Tenant SET ${sets.join(', ')} WHERE id = ?`, args);

      const tenant = await queryOne(`SELECT * FROM Tenant WHERE id = ?`, [id]);
      return NextResponse.json({ ...tenant, isActive: !!tenant?.isActive });
    }

    // Default: vacate tenant
    const now = new Date().toISOString();
    await execute(
      `UPDATE Tenant SET isActive = 0, endDate = ?, updatedAt = ? WHERE id = ?`,
      [now, now, id]
    );

    const tenant = await queryOne(`SELECT * FROM Tenant WHERE id = ?`, [id]);
    return NextResponse.json({ ...tenant, isActive: !!tenant?.isActive });
  } catch (error) {
    return NextResponse.json({ error: 'ভাড়াটে আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE tenant
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await execute(`DELETE FROM Tenant WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'ভাড়াটে মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
