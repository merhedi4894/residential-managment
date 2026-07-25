import { NextResponse } from 'next/server';
import { query } from '@/lib/turso';

// GET comprehensive overview: buildings → floors → rooms → { allTenants, inventories }
export async function GET() {
  try {
    // Fetch all tables in parallel (flat queries, no N+1)
    const [buildings, floors, rooms, tenants, inventories] = await Promise.all([
      query<{ id: string; name: string; totalFloors: number }>(
        `SELECT "id", "name", "totalFloors" FROM "Building" ORDER BY "createdAt" ASC`
      ),
      query<{ id: string; floorNumber: number; buildingId: string }>(
        `SELECT "id", "floorNumber", "buildingId" FROM "Floor" ORDER BY "floorNumber" ASC`
      ),
      query<{ id: string; roomNumber: string; floorId: string }>(
        `SELECT "id", "roomNumber", "floorId" FROM "Room" ORDER BY "roomNumber" ASC`
      ),
      query<{
        id: string; name: string; phone: string | null; roomId: string;
        startDate: string; endDate: string | null; isActive: number; createdAt: string;
      }>(
        `SELECT "id", "name", "phone", "roomId", "startDate", "endDate", "isActive", "createdAt"
         FROM "Tenant" ORDER BY "createdAt" DESC`
      ),
      query<{
        id: string; itemName: string; quantity: number; condition: string;
        note: string | null; addedDate: string; tenantId: string | null; roomId: string;
      }>(
        `SELECT "id", "itemName", "quantity", "condition", "note", "addedDate", "tenantId", "roomId"
         FROM "Inventory" ORDER BY "addedDate" DESC`
      ),
    ]);

    // Group floors by buildingId
    const floorsByBuilding = new Map<string, typeof floors>();
    for (const f of floors) {
      const list = floorsByBuilding.get(f.buildingId) || [];
      list.push(f);
      floorsByBuilding.set(f.buildingId, list);
    }

    // Group rooms by floorId
    const roomsByFloor = new Map<string, typeof rooms>();
    for (const r of rooms) {
      const list = roomsByFloor.get(r.floorId) || [];
      list.push(r);
      roomsByFloor.set(r.floorId, list);
    }

    // Group tenants by roomId
    const tenantsByRoom = new Map<string, typeof tenants>();
    for (const t of tenants) {
      const list = tenantsByRoom.get(t.roomId) || [];
      list.push(t);
      tenantsByRoom.set(t.roomId, list);
    }

    // Group inventories by roomId
    const inventoryByRoom = new Map<string, typeof inventories>();
    for (const inv of inventories) {
      const list = inventoryByRoom.get(inv.roomId) || [];
      list.push(inv);
      inventoryByRoom.set(inv.roomId, list);
    }

    // Build the nested structure
    const overview = buildings.map((b) => {
      const buildingFloors = floorsByBuilding.get(b.id) || [];

      return {
        id: b.id,
        name: b.name,
        totalFloors: b.totalFloors,
        floors: buildingFloors.map((f) => {
          const floorRooms = roomsByFloor.get(f.id) || [];

          return {
            id: f.id,
            floorNumber: f.floorNumber,
            rooms: floorRooms.map((r) => {
              const roomTenants = tenantsByRoom.get(r.id) || [];
              const roomInventories = inventoryByRoom.get(r.id) || [];

              // Latest active tenant
              const activeTenant = roomTenants.find((t) => !!t.isActive) || null;
              // All tenants sorted newest first
              const allTenants = roomTenants.map((t) => ({
                id: t.id,
                name: t.name,
                phone: t.phone,
                startDate: t.startDate,
                endDate: t.endDate,
                isActive: !!t.isActive,
              }));

              // Current inventory: items belonging to the active tenant,
              // or if no active tenant, items from the most recent tenant
              let currentInventories = roomInventories;
              if (activeTenant) {
                currentInventories = roomInventories.filter(
                  (inv) => inv.tenantId === activeTenant.id
                );
              } else if (roomTenants.length > 0) {
                const latestTenant = roomTenants[0]; // already sorted desc
                currentInventories = roomInventories.filter(
                  (inv) => inv.tenantId === latestTenant.id
                );
              }

              return {
                id: r.id,
                roomNumber: r.roomNumber,
                activeTenant: activeTenant
                  ? {
                      id: activeTenant.id,
                      name: activeTenant.name,
                      phone: activeTenant.phone,
                      startDate: activeTenant.startDate,
                    }
                  : null,
                allTenants,
                inventories: currentInventories.map((inv) => ({
                  id: inv.id,
                  itemName: inv.itemName,
                  quantity: inv.quantity,
                  condition: inv.condition,
                  note: inv.note,
                  addedDate: inv.addedDate,
                })),
                totalInventoryItems: currentInventories.length,
              };
            }),
          };
        }),
      };
    });

    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: 'ওভারভিউ লোড করতে সমস্যা হয়েছে' },
      { status: 500 }
    );
  }
}
