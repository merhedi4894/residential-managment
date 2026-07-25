import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/turso'
import { ensureTablesExist } from '@/lib/db-init';;

// GET /api/room-search?roomId=xxx
// Returns current tenant, previous tenants, current inventory, previous inventory for a room
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'রুম আইডি দিন' }, { status: 400 });
    }

    // Parallelize all 3 queries — they all only depend on URL param roomId
    const [roomRow, allTenants, allInventory] = await Promise.all([
      // Room with floor and building
      queryOne<{
        id: string;
        roomNumber: string;
        buildingName: string;
        floorNumber: number;
      }>(
        `SELECT r."id", r."roomNumber", b."name" as "buildingName", f."floorNumber"
         FROM "Room" r
         JOIN "Floor" f ON f."id" = r."floorId"
         JOIN "Building" b ON b."id" = f."buildingId"
         WHERE r."id" = ?`,
        [roomId]
      ),
      // All tenants for the room ordered by createdAt desc
      query<{
        id: string;
        name: string;
        phone: string | null;
        startDate: string;
        endDate: string | null;
        isActive: number;
      }>(
        `SELECT "id", "name", "phone", "startDate", "endDate", "isActive"
         FROM "Tenant" WHERE "roomId" = ?
         ORDER BY "createdAt" DESC`,
        [roomId]
      ),
      // All inventory for the room with tenant info, ordered by addedDate desc
      query<{
        id: string;
        itemName: string;
        quantity: number;
        condition: string;
        roomNumber: string;
        tenantId: string | null;
        roomId: string;
        addedDate: string;
        note: string | null;
        tenantName: string | null;
        tenantId_fk: string | null;
      }>(
        `SELECT i."id", i."itemName", i."quantity", i."condition", i."roomNumber",
                i."tenantId", i."roomId", i."addedDate", i."note",
                t."name" as "tenantName", t."id" as "tenantId_fk"
         FROM "Inventory" i
         LEFT JOIN "Tenant" t ON t."id" = i."tenantId"
         WHERE i."roomId" = ?
         ORDER BY i."addedDate" DESC`,
        [roomId]
      ),
    ]);

    if (!roomRow) {
      return NextResponse.json({ error: 'রুম পাওয়া যায়নি' }, { status: 404 });
    }

    // Separate current (active) and previous (inactive) tenants
    const currentTenant = allTenants.find((t) => !!t.isActive) || null;
    const previousTenants = allTenants.filter((t) => !t.isActive);

    // Separate current and previous inventory
    // Build inventory with tenant shape matching original: { id, name }
    const allInventoryMapped = allInventory.map((inv) => ({
      id: inv.id,
      itemName: inv.itemName,
      quantity: inv.quantity,
      condition: inv.condition,
      roomNumber: inv.roomNumber,
      tenantId: inv.tenantId,
      roomId: inv.roomId,
      addedDate: inv.addedDate,
      note: inv.note,
      tenant: inv.tenantId ? { id: inv.tenantId, name: inv.tenantName } : null,
    }));

    // Inventory belongs to the ROOM — always show as current, regardless of tenant status
    // De-duplicate by itemName
    const seenKeys = new Set<string>();
    const currentInventory = allInventoryMapped.filter((inv) => {
      const key = inv.itemName;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    // No separate "previous inventory" — items stay in the room permanently
    const previousInventory: typeof allInventoryMapped = [];

    return NextResponse.json({
      room: {
        id: roomRow.id,
        roomNumber: roomRow.roomNumber,
        buildingName: roomRow.buildingName,
        floorNumber: roomRow.floorNumber,
      },
      currentTenant: currentTenant
        ? {
            id: currentTenant.id,
            name: currentTenant.name,
            phone: currentTenant.phone,
            startDate: currentTenant.startDate,
            endDate: currentTenant.endDate,
            isActive: !!currentTenant.isActive,
          }
        : null,
      previousTenants: previousTenants.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        startDate: t.startDate,
        endDate: t.endDate,
        isActive: !!t.isActive,
      })),
      currentInventory: currentInventory.map((inv) => ({
        id: inv.id,
        itemName: inv.itemName,
        quantity: inv.quantity,
        condition: inv.condition,
        roomNumber: inv.roomNumber,
        tenantId: inv.tenantId,
        roomId: inv.roomId,
        addedDate: inv.addedDate,
        note: inv.note,
        tenant: inv.tenant,
      })),
      previousInventory: previousInventory.map((inv) => ({
        id: inv.id,
        itemName: inv.itemName,
        quantity: inv.quantity,
        condition: inv.condition,
        roomNumber: inv.roomNumber,
        tenantId: inv.tenantId,
        roomId: inv.roomId,
        addedDate: inv.addedDate,
        note: inv.note,
        tenant: inv.tenant,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'রুম তথ্য লোড করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
