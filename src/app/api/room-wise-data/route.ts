import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// GET room-wise data: current + previous tenants and inventory
// Query params: roomId (single room) OR buildingId (all rooms) [optional floorId]
export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const buildingId = searchParams.get('buildingId');
    const floorId = searchParams.get('floorId');

    // ── Building-wide mode ────────────────────────────────────────────
    if (buildingId && !roomId) {
      // Step 1: Fetch building
      const building = await queryOne<{ id: string; name: string; totalFloors: number }>(
        `SELECT "id", "name", "totalFloors" FROM "Building" WHERE "id" = ?`,
        [buildingId]
      );

      if (!building) {
        return NextResponse.json({ mode: 'allRooms', rooms: [] });
      }

      // Fetch floors, rooms, and tenants in parallel
      const [allFloors, allRooms, allTenants] = await Promise.all([
        query<{ id: string; floorNumber: number; buildingId: string }>(
          `SELECT "id", "floorNumber", "buildingId" FROM "Floor" WHERE "buildingId" = ? ORDER BY "floorNumber" ASC`,
          [buildingId]
        ),
        query<{ id: string; roomNumber: string; floorId: string }>(
          `SELECT r."id", r."roomNumber", r."floorId" FROM "Room" r
           JOIN "Floor" f ON f."id" = r."floorId"
           WHERE f."buildingId" = ?
           ORDER BY r."roomNumber" ASC`,
          [buildingId]
        ),
        query<{
          id: string; name: string; designation: string | null; phone: string | null;
          roomId: string; startDate: string; endDate: string | null;
          isActive: number; createdAt: string;
        }>(
          `SELECT t."id", t."name", t."designation", t."phone", t."roomId",
                  t."startDate", t."endDate", t."isActive", t."createdAt"
           FROM "Tenant" t
           JOIN "Room" r ON r."id" = t."roomId"
           JOIN "Floor" f ON f."id" = r."floorId"
           WHERE f."buildingId" = ?
           ORDER BY t."createdAt" DESC`,
          [buildingId]
        ),
      ]);

      if (!allFloors || allFloors.length === 0) {
        return NextResponse.json({ mode: 'allRooms', rooms: [] });
      }

      // Step 2: Collect ALL room IDs in ONE pass (apply floorId filter)
      const allRoomIds: string[] = [];
      const filteredFloors = floorId
        ? allFloors.filter((f) => f.id === floorId)
        : allFloors;

      const roomsByFloor = new Map<string, typeof allRooms>();
      for (const r of allRooms) {
        const list = roomsByFloor.get(r.floorId) || [];
        list.push(r);
        roomsByFloor.set(r.floorId, list);
      }

      for (const floor of filteredFloors) {
        const floorRooms = roomsByFloor.get(floor.id) || [];
        for (const room of floorRooms) {
          allRoomIds.push(room.id);
        }
      }

      if (allRoomIds.length === 0) {
        return NextResponse.json({ mode: 'allRooms', rooms: [] });
      }

      // Step 3+4: Fetch inventory, vacate records, inventory snapshots, and room users in parallel
      const [allInventory, allVacateRecords, allSnapshots, allRoomUsersRaw] = await Promise.all([
        query<{
          id: string; itemName: string; quantity: number; condition: string;
          note: string | null; addedDate: string; tenantId: string | null;
          roomId: string; roomNumber: string; tenantName: string | null;
        }>(
          allRoomIds.length === 1
            ? `SELECT i."id", i."itemName", i."quantity", i."condition", i."note",
                      i."addedDate", i."tenantId", i."roomId", i."roomNumber",
                      t."name" as "tenantName"
               FROM "Inventory" i
               LEFT JOIN "Tenant" t ON t."id" = i."tenantId"
               WHERE i."roomId" = ?
               ORDER BY i."addedDate" DESC`
            : `SELECT i."id", i."itemName", i."quantity", i."condition", i."note",
                      i."addedDate", i."tenantId", i."roomId", i."roomNumber",
                      t."name" as "tenantName"
               FROM "Inventory" i
               LEFT JOIN "Tenant" t ON t."id" = i."tenantId"
               WHERE i."roomId" IN (${allRoomIds.map(() => '?').join(',')})
               ORDER BY i."addedDate" DESC`,
          allRoomIds
        ),
        query<{
          id: string; tenantId: string; tenantName: string;
          roomId: string; vacatedAt: string; inventorySnapshot: string;
        }>(
          allRoomIds.length === 1
            ? `SELECT "id", "tenantId", "tenantName", "roomId", "vacatedAt", "inventorySnapshot"
               FROM "VacateRecord" WHERE "roomId" = ?
               ORDER BY "vacatedAt" DESC`
            : `SELECT "id", "tenantId", "tenantName", "roomId", "vacatedAt", "inventorySnapshot"
               FROM "VacateRecord" WHERE "roomId" IN (${allRoomIds.map(() => '?').join(',')})
               ORDER BY "vacatedAt" DESC`,
          allRoomIds
        ),
        query<{
          id: string; tenantId: string; tenantName: string; roomId: string;
          roomNumber: string; snapshotType: string; inventorySnapshot: string; createdAt: string;
        }>(
          allRoomIds.length === 1
            ? `SELECT "id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt"
               FROM "InventorySnapshot" WHERE "roomId" = ?
               ORDER BY "createdAt" DESC`
            : `SELECT "id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt"
               FROM "InventorySnapshot" WHERE "roomId" IN (${allRoomIds.map(() => '?').join(',')})
               ORDER BY "createdAt" DESC`,
          allRoomIds
        ),
        // RoomUser query — simple approach (same as tenant-search, proven to work)
        query<{
          id: string; name: string; designation: string | null; phone: string | null; department: string | null;
          roomId: string; startDate: string; endDate: string | null;
          isActive: number; createdAt: string;
        }>(
          allRoomIds.length === 1
            ? `SELECT "id", "name", "designation", "phone", "department", "roomId",
                      "startDate", "endDate", "isActive", "createdAt"
               FROM "RoomUser" WHERE "roomId" = ?
               ORDER BY "createdAt" DESC`
            : `SELECT "id", "name", "designation", "phone", "department", "roomId",
                      "startDate", "endDate", "isActive", "createdAt"
               FROM "RoomUser" WHERE "roomId" IN (${allRoomIds.map(() => '?').join(',')})
               ORDER BY "createdAt" DESC`,
          allRoomIds
        ),
      ]);

      // Step 5: Group inventory and vacate records by roomId in memory
      const inventoryByRoom = new Map<string, typeof allInventory>();
      for (const inv of allInventory) {
        const list = inventoryByRoom.get(inv.roomId) || [];
        list.push(inv);
        inventoryByRoom.set(inv.roomId, list);
      }

      const vacateByRoom = new Map<string, typeof allVacateRecords>();
      for (const vr of allVacateRecords) {
        const list = vacateByRoom.get(vr.roomId) || [];
        list.push(vr);
        vacateByRoom.set(vr.roomId, list);
      }

      // Group tenants by roomId
      const tenantsByRoom = new Map<string, typeof allTenants>();
      for (const t of allTenants) {
        const list = tenantsByRoom.get(t.roomId) || [];
        list.push(t);
        tenantsByRoom.set(t.roomId, list);
      }

      // Group room users by roomId
      const allRoomUsers = allRoomUsersRaw || [];
      const roomUsersByRoom = new Map<string, typeof allRoomUsers>();
      for (const u of allRoomUsers) {
        const list = roomUsersByRoom.get(u.roomId) || [];
        list.push(u);
        roomUsersByRoom.set(u.roomId, list);
      }

      // Group snapshots by roomId
      const snapshotsByRoom = new Map<string, typeof allSnapshots>();
      for (const s of (allSnapshots || [])) {
        const list = snapshotsByRoom.get(s.roomId) || [];
        list.push(s);
        snapshotsByRoom.set(s.roomId, list);
      }

      // Step 6: Build response with in-memory grouping (no more DB queries)
      const allRoomData: any[] = [];

      for (const floor of filteredFloors) {
        const floorRooms = roomsByFloor.get(floor.id) || [];
        if (!floorRooms) continue;

        for (const room of floorRooms) {
          const allTenantsForRoom = tenantsByRoom.get(room.id) || [];
          const currentTenants = allTenantsForRoom.filter((t) => !!t.isActive);
          const previousTenants = allTenantsForRoom.filter((t) => !t.isActive);

          // Get inventory for this room from the pre-fetched map
          const roomInventory = inventoryByRoom.get(room.id) || [];

          // Inventory belongs to the ROOM — always show as current, regardless of tenant status
          // De-duplicate by itemName
          const seenItems = new Set<string>();
          const currentInventory = roomInventory.filter((inv) => {
            const key = inv.itemName;
            if (seenItems.has(key)) return false;
            seenItems.add(key);
            return true;
          });
          // No separate "previous inventory" — items stay in the room permanently
          const previousInventory: typeof roomInventory = [];

          // Get vacate records for this room from the pre-fetched map
          const vacateRecords = vacateByRoom.get(room.id) || [];

          // Get inventory snapshots for this room
          const inventorySnapshots = (snapshotsByRoom.get(room.id) || []).map((s) => ({ id: s.id, tenantId: s.tenantId, tenantName: s.tenantName, snapshotType: s.snapshotType, inventorySnapshot: s.inventorySnapshot, createdAt: s.createdAt }));

          // Get room users for this room (isActive can be 1, true, or "1")
          const allRoomUsersForRoom = roomUsersByRoom.get(room.id) || [];
          const currentRoomUsers = allRoomUsersForRoom.filter((u) => u.isActive === 1 || u.isActive === true || u.isActive === '1');
          const previousRoomUsers = allRoomUsersForRoom.filter((u) => u.isActive !== 1 && u.isActive !== true && u.isActive !== '1');

          allRoomData.push({
            roomId: room.id,
            roomNumber: room.roomNumber,
            floorNumber: floor.floorNumber,
            currentTenants: currentTenants.map((t) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate })),
            previousTenants: previousTenants.map((t) => ({ id: t.id, name: t.name, designation: t.designation, phone: t.phone, startDate: t.startDate, endDate: t.endDate })),
            currentRoomUsers: currentRoomUsers.map((u) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate })),
            previousRoomUsers: previousRoomUsers.map((u) => ({ id: u.id, name: u.name, designation: u.designation, phone: u.phone, department: u.department, startDate: u.startDate, endDate: u.endDate })),
            currentInventory: currentInventory.map((inv) => ({ id: inv.id, itemName: inv.itemName, quantity: inv.quantity, condition: inv.condition, note: inv.note, addedDate: inv.addedDate, tenantId: inv.tenantId, tenantName: inv.tenantName || null })),
            previousInventory: previousInventory.map((inv) => ({ id: inv.id, itemName: inv.itemName, quantity: inv.quantity, condition: inv.condition, note: inv.note, addedDate: inv.addedDate, tenantId: inv.tenantId, tenantName: inv.tenantName || null })),
            vacateRecords: vacateRecords.map((vr) => ({ id: vr.id, tenantId: vr.tenantId, tenantName: vr.tenantName, vacatedAt: vr.vacatedAt, inventorySnapshot: vr.inventorySnapshot })),
            inventorySnapshots,
          });
        }
      }

      return NextResponse.json({ mode: 'allRooms', buildingName: building.name, rooms: allRoomData }, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
    }

    // ── Single room mode ──────────────────────────────────────────────
    if (!roomId) {
      return NextResponse.json({ error: 'রুম আইডি দিন' }, { status: 400 });
    }

    const room = await queryOne<{
      id: string;
      roomNumber: string;
      floorNumber: number;
    }>(
      `SELECT r."id", r."roomNumber", f."floorNumber"
       FROM "Room" r
       JOIN "Floor" f ON f."id" = r."floorId"
       WHERE r."id" = ?`,
      [roomId]
    );

    if (!room) {
      return NextResponse.json({ error: 'রুম পাওয়া যায়নি' }, { status: 404 });
    }

    // Fetch tenants, inventory, vacate records, inventory snapshots, and room users in parallel
    const [allTenantsRaw, allInventoryRaw, vacateRecords, inventorySnapshots, allRoomUsersRaw] = await Promise.all([
      query<{
        id: string; name: string; designation: string | null; phone: string | null; department: string | null;
        roomId: string; startDate: string; endDate: string | null;
        isActive: number; createdAt: string;
      }>(
        `SELECT "id", "name", "designation", "phone", "department", "roomId",
                "startDate", "endDate", "isActive", "createdAt"
         FROM "Tenant" WHERE "roomId" = ?
         ORDER BY "createdAt" DESC`,
        [roomId]
      ),
      query<{
        id: string; itemName: string; quantity: number; condition: string;
        note: string | null; addedDate: string; tenantId: string | null;
        roomId: string; roomNumber: string; tenantName: string | null;
      }>(
        `SELECT i."id", i."itemName", i."quantity", i."condition", i."note",
                i."addedDate", i."tenantId", i."roomId", i."roomNumber",
                t."name" as "tenantName"
         FROM "Inventory" i
         LEFT JOIN "Tenant" t ON t."id" = i."tenantId"
         WHERE i."roomId" = ?
         ORDER BY i."addedDate" DESC`,
        [roomId]
      ),
      query<{
        id: string; tenantId: string; tenantName: string;
        roomId: string; vacatedAt: string; inventorySnapshot: string;
      }>(
        `SELECT "id", "tenantId", "tenantName", "roomId", "vacatedAt", "inventorySnapshot"
         FROM "VacateRecord" WHERE "roomId" = ?
         ORDER BY "vacatedAt" DESC`,
        [roomId]
      ),
      query<{
        id: string; tenantId: string; tenantName: string; roomId: string;
        roomNumber: string; snapshotType: string; inventorySnapshot: string; createdAt: string;
      }>(
        `SELECT "id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt"
         FROM "InventorySnapshot" WHERE "roomId" = ?
         ORDER BY "createdAt" DESC`,
        [roomId]
      ),
      query<{
        id: string; name: string; designation: string | null; phone: string | null; department: string | null;
        roomId: string; startDate: string; endDate: string | null;
        isActive: number; createdAt: string;
      }>(
        `SELECT "id", "name", "designation", "phone", "department", "roomId",
                "startDate", "endDate", "isActive", "createdAt"
         FROM "RoomUser" WHERE "roomId" = ?
         ORDER BY "createdAt" DESC`,
        [roomId]
      ),
    ]);

    const allTenants = allTenantsRaw || [];
    const currentTenants = allTenants.filter((t) => !!t.isActive);
    const previousTenants = allTenants.filter((t) => !t.isActive);

    // Room users: separate from tenants
    const allRoomUsers = allRoomUsersRaw || [];
    const currentRoomUsers = allRoomUsers.filter((u) => u.isActive === 1 || u.isActive === true || u.isActive === '1');
    const previousRoomUsers = allRoomUsers.filter((u) => u.isActive !== 1 && u.isActive !== true && u.isActive !== '1');

    // Inventory belongs to the ROOM — always show as current, regardless of tenant status
    // De-duplicate by itemName
    const seenItems = new Set<string>();
    const currentInventory = allInventoryRaw.filter((inv) => {
      const key = inv.itemName;
      if (seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });
    // No separate "previous inventory" — items stay in the room permanently
    const previousInventory: typeof allInventoryRaw = [];

    return NextResponse.json({
      roomId: room.id,
      roomNumber: room.roomNumber,
      currentTenants: currentTenants.map((t) => ({
        id: t.id,
        name: t.name,
        designation: t.designation,
        phone: t.phone,
        department: t.department,
        startDate: t.startDate,
      })),
      previousTenants: previousTenants.map((t) => ({
        id: t.id,
        name: t.name,
        designation: t.designation,
        phone: t.phone,
        department: t.department,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      currentRoomUsers: currentRoomUsers.map((u) => ({
        id: u.id,
        name: u.name,
        designation: u.designation,
        phone: u.phone,
        department: u.department,
        startDate: u.startDate,
      })),
      previousRoomUsers: previousRoomUsers.map((u) => ({
        id: u.id,
        name: u.name,
        designation: u.designation,
        phone: u.phone,
        department: u.department,
        startDate: u.startDate,
        endDate: u.endDate,
      })),
      currentInventory: currentInventory.map((inv) => ({
        id: inv.id,
        itemName: inv.itemName,
        quantity: inv.quantity,
        condition: inv.condition,
        note: inv.note,
        addedDate: inv.addedDate,
        tenantId: inv.tenantId,
        tenantName: inv.tenantName || null,
      })),
      previousInventory: previousInventory.map((inv) => ({
        id: inv.id,
        itemName: inv.itemName,
        quantity: inv.quantity,
        condition: inv.condition,
        note: inv.note,
        addedDate: inv.addedDate,
        tenantId: inv.tenantId,
        tenantName: inv.tenantName || null,
      })),
      vacateRecords: vacateRecords.map((vr) => ({
        id: vr.id,
        tenantId: vr.tenantId,
        tenantName: vr.tenantName,
        vacatedAt: vr.vacatedAt,
        inventorySnapshot: vr.inventorySnapshot,
      })),
      inventorySnapshots: (inventorySnapshots || []).map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenantName: s.tenantName,
        snapshotType: s.snapshotType,
        inventorySnapshot: s.inventorySnapshot,
        createdAt: s.createdAt,
      })),
    }, {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    console.error('[room-wise-data] Error:', error);
    return NextResponse.json(
      { error: 'তথ্য লোড করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
