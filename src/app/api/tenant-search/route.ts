import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/turso';

// Bangla → English digit mapping
function toEnglishDigits(str: string): string {
  const banglaDigits: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return str.replace(/[০-৯]/g, (d) => banglaDigits[d] || d);
}

// Normalize a room number search string to uppercase for matching
// e.g. "2d", "d2", "D2", "২D", "D২", "d২", "২d" → "2D" or "D2"
function normalizeRoomNumber(str: string): string[] {
  const english = toEnglishDigits(str).toUpperCase();
  const results = new Set<string>();
  results.add(english);
  // If it starts with a letter, also try number-first variant
  const letterFirst = english.match(/^([A-Z]+)(\d+)$/);
  if (letterFirst) results.add(`${letterFirst[2]}${letterFirst[1]}`);
  // If it starts with a number, also try letter-first variant
  const numberFirst = english.match(/^(\d+)([A-Z]+)$/);
  if (numberFirst) results.add(`${numberFirst[2]}${numberFirst[1]}`);
  return Array.from(results);
}

// GET — search by room number OR tenant name
// Room search: one result per room (all tenants merged into one entry)
// Name search: one result per tenant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 1) {
      return NextResponse.json([]);
    }

    const results: any[] = [];

    // ── Detect if query looks like a room number (contains digit) ──
    const hasDigit = /\d/.test(toEnglishDigits(q));

    // ── Search by room number (fuzzy, case-insensitive, Bengali numerals) ──
    if (hasDigit) {
      const normalizedRoom = normalizeRoomNumber(q);
      const roomConditions = normalizedRoom.map(() => `r."roomNumber" LIKE ?`).join(' OR ');
      const roomArgs = normalizedRoom.map((n) => `%${n}%`);

      const roomResults = await query<any>(
        `SELECT
          r."id" as "roomId",
          r."roomNumber",
          f."floorNumber",
          b."name" as "buildingName",
          b."id" as "buildingId"
         FROM "Room" r
         JOIN "Floor" f ON f."id" = r."floorId"
         JOIN "Building" b ON b."id" = f."buildingId"
         WHERE ${roomConditions}
         ORDER BY r."roomNumber" ASC
         LIMIT 30`,
        roomArgs
      );

      // For each room, get ALL active tenants and room users → merge into ONE entry
      for (const room of roomResults) {
        const tenants = await query<any>(
          `SELECT t."id", t."name", t."designation", t."phone", t."startDate", t."roomId", t."isActive"
           FROM "Tenant" t WHERE t."roomId" = ? AND t."isActive" = 1`,
          [room.roomId]
        );
        const roomUsers = await query<any>(
          `SELECT ru."id", ru."name", ru."designation", ru."department", ru."roomId"
           FROM "RoomUser" ru WHERE ru."roomId" = ? AND ru."isActive" = 1`,
          [room.roomId]
        );

        results.push({
          id: tenants.length > 0 ? tenants[0].id : room.roomId,
          name: tenants.map((t) => t.name).join(', '),
          designation: tenants.map((t) => t.designation).filter(Boolean).join(', ') || null,
          phone: tenants.map((t) => t.phone).filter(Boolean).join(', ') || null,
          startDate: tenants.length > 0 ? tenants[0].startDate : null,
          roomId: room.roomId,
          isActive: 1,
          roomNumber: room.roomNumber,
          floorNumber: room.floorNumber,
          buildingName: room.buildingName,
          buildingId: room.buildingId,
          tenantCount: tenants.length,
          roomUsers,
          searchType: 'room',
        });
      }
    }

    // ── Search by tenant name (min 2 chars) ──
    if (q.length >= 2 && !hasDigit) {
      const tenants = await query<any>(
        `SELECT
          t."id", t."name", t."designation", t."phone", t."startDate",
          t."roomId", t."isActive",
          r."roomNumber",
          f."floorNumber",
          b."name" as "buildingName",
          b."id" as "buildingId"
         FROM "Tenant" t
         JOIN "Room" r ON r."id" = t."roomId"
         JOIN "Floor" f ON f."id" = r."floorId"
         JOIN "Building" b ON b."id" = f."buildingId"
         WHERE t."isActive" = 1 AND t."name" LIKE ?
         ORDER BY t."name" ASC
         LIMIT 20`,
        [`%${q}%`]
      );
      for (const t of tenants) {
        results.push({ ...t, searchType: 'tenant' });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[tenant-search] Error:', error);
    return NextResponse.json({ error: 'সার্চ করতে সমস্যা' }, { status: 500 });
  }
}
