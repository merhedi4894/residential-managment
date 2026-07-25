import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, batch, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// POST - Vacate tenant: snapshot current room inventory, deactivate tenant
// Inventory belongs to the ROOM and is NEVER modified during vacate
// Body: { tenantId }
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'ভাড়াটে আইডি দিন' }, { status: 400 });
    }

    // Get tenant with room info
    const tenant = await queryOne<{
      id: string;
      name: string;
      roomId: string;
      isActive: boolean;
      roomNumber: string;
    }>(
      `SELECT t."id", t."name", t."roomId", t."isActive", r."roomNumber"
       FROM "Tenant" t
       JOIN "Room" r ON r."id" = t."roomId"
       WHERE t."id" = ?`,
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: 'ভাড়াটে পাওয়া যায়নি' }, { status: 404 });
    }

    if (!tenant.isActive) {
      return NextResponse.json({ error: 'এই ভাড়াটে ইতিমধ্যে অসক্রিয়' }, { status: 400 });
    }

    // Capture current room inventory state as snapshot
    // This is the FULL room inventory — items belong to the room, not tenants
    const roomItems = await query<{ id: string; itemName: string; quantity: number; condition: string; note: string | null }>(
      `SELECT "id", "itemName", "quantity", "condition", "note"
       FROM "Inventory" WHERE "roomId" = ?
       ORDER BY "addedDate" ASC`,
      [tenant.roomId]
    );

    // De-duplicate by itemName (keep first occurrence), track IDs for repair/replace lookup
    const snapshotMap = new Map<string, { itemName: string; quantity: number; condition: string; note: string | null }>();
    const inventoryIds: string[] = [];
    for (const item of roomItems) {
      const key = item.itemName.trim().toLowerCase();
      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, {
          itemName: item.itemName,
          quantity: item.quantity,
          condition: item.condition,
          note: item.note,
        });
        inventoryIds.push(item.id);
      }
    }

    // Fetch latest repair/replace dates for all inventory items
    let repairReplaceMap: Map<string, { latestRepair: string; latestReplace: string; repairNote: string | null; replaceNote: string | null }> = new Map();
    if (inventoryIds.length > 0) {
      try {
        const repairRecords = await query<{ inventoryId: string; type: string; actionDate: string; note: string | null }>(
          `SELECT "inventoryId", "type", "actionDate", "note"
           FROM "InventoryRepairReplace"
           WHERE "inventoryId" IN (${inventoryIds.map(() => '?').join(',')})
           ORDER BY "actionDate" DESC`,
          inventoryIds
        );
        // Build map: for each inventoryId, keep latest repair and latest replace
        for (const rec of repairRecords) {
          const existing = repairReplaceMap.get(rec.inventoryId) || { latestRepair: '', latestReplace: '', repairNote: null, replaceNote: null };
          if (rec.type === 'repair' && !existing.latestRepair) {
            existing.latestRepair = rec.actionDate;
            existing.repairNote = rec.note;
          } else if (rec.type === 'replace' && !existing.latestReplace) {
            existing.latestReplace = rec.actionDate;
            existing.replaceNote = rec.note;
          }
          repairReplaceMap.set(rec.inventoryId, existing);
        }
      } catch {
        // InventoryRepairReplace table might not exist yet — ignore
      }
    }

    // Build inventory IDs array in order (first occurrence per itemName)
    const firstOccurrenceIds: string[] = [];
    const seenNames = new Set<string>();
    for (const item of roomItems) {
      const key = item.itemName.trim().toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        firstOccurrenceIds.push(item.id);
      }
    }

    // Merge repair/replace data into snapshot
    const inventorySnapshot = Array.from(snapshotMap.entries()).map(([key, item], idx) => {
      const invId = firstOccurrenceIds[idx];
      const rrData = repairReplaceMap.get(invId);
      return {
        ...item,
        latestRepair: rrData?.latestRepair || null,
        latestReplace: rrData?.latestReplace || null,
        repairNote: rrData?.repairNote || null,
        replaceNote: rrData?.replaceNote || null,
      };
    });

    // Mark tenant as inactive
    await execute(
      `UPDATE "Tenant" SET "isActive" = 0, "endDate" = datetime('now'), "updatedAt" = datetime('now') WHERE "id" = ?`,
      [tenantId]
    );

    // Create vacate record with room inventory snapshot
    const vacateRecordId = uuid();
    await execute(
      `INSERT INTO "VacateRecord" ("id", "tenantId", "tenantName", "roomId", "roomNumber", "inventorySnapshot", "vacatedAt", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [vacateRecordId, tenant.id, tenant.name, tenant.roomId, tenant.roomNumber, JSON.stringify(inventorySnapshot)]
    );

    // Also insert into InventorySnapshot with snapshotType = 'vacate'
    try {
      await execute(
        `INSERT INTO "InventorySnapshot" ("id", "tenantId", "tenantName", "roomId", "roomNumber", "snapshotType", "inventorySnapshot", "createdAt") VALUES (?, ?, ?, ?, ?, 'vacate', ?, datetime('now'))`,
        [uuid(), tenant.id, tenant.name, tenant.roomId, tenant.roomNumber, JSON.stringify(inventorySnapshot)]
      );
    } catch { /* snapshot creation failure should not block vacate */ }

    const vacateRecord = {
      id: vacateRecordId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomId: tenant.roomId,
      roomNumber: tenant.roomNumber,
      inventorySnapshot: JSON.stringify(inventorySnapshot),
    };

    // Inventory is NEVER modified — items stay in the room as-is
    // No disconnection, no deletion, no transfer

    const updatedTenant = await queryOne<{
      id: string;
      name: string;
      designation: string | null;
      phone: string | null;
      roomId: string;
      startDate: string;
      endDate: string | null;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    }>(
      `SELECT "id", "name", "designation", "phone", "roomId", "startDate", "endDate", "isActive", "createdAt", "updatedAt"
       FROM "Tenant" WHERE "id" = ?`,
      [tenantId]
    );

    return NextResponse.json({
      tenant: updatedTenant,
      vacateRecord,
    });
  } catch (error) {
    console.error('Vacate error:', error);
    return NextResponse.json({ error: 'রুম ছেড়ে দিতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE - Delete a VacateRecord and its associated Tenant
// Body: { id }
export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'আইডি দিন' }, { status: 400 });
    }

    // Get the vacate record to find the tenantId
    const vacateRecord = await queryOne<{
      id: string;
      tenantId: string;
      roomId: string;
    }>(
      `SELECT "id", "tenantId", "roomId" FROM "VacateRecord" WHERE "id" = ?`,
      [id]
    );

    if (!vacateRecord) {
      return NextResponse.json({ error: 'ভাকেট রেকর্ড পাওয়া যায়নি' }, { status: 404 });
    }

    // Delete the vacate record
    await execute(`DELETE FROM "VacateRecord" WHERE "id" = ?`, [id]);

    // Delete the associated tenant record
    await execute(`DELETE FROM "Tenant" WHERE "id" = ?`, [vacateRecord.tenantId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vacate delete error:', error);
    return NextResponse.json({ error: 'মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH - Update a VacateRecord (e.g., clear inventorySnapshot, update tenantName)
// Body: { id, inventorySnapshot?, tenantName? }
export async function PATCH(req: NextRequest) {
  try {
    await ensureTablesExist();
    const body = await req.json();
    const { id, inventorySnapshot, tenantName } = body;

    if (!id) {
      return NextResponse.json({ error: 'আইডি দিন' }, { status: 400 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (inventorySnapshot !== undefined) {
      sets.push('"inventorySnapshot" = ?');
      args.push(inventorySnapshot);
    }
    if (tenantName !== undefined) {
      sets.push('"tenantName" = ?');
      args.push(tenantName);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'আপডেট করার মতো কিছু নেই' }, { status: 400 });
    }

    args.push(id);
    await execute(
      `UPDATE "VacateRecord" SET ${sets.join(', ')} WHERE "id" = ?`,
      args
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vacate patch error:', error);
    return NextResponse.json({ error: 'আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
