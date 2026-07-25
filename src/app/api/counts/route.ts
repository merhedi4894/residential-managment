import { NextResponse } from 'next/server';
import { query } from '@/lib/turso';

export async function GET() {
  try {
    const [buildings, rooms, tenants] = await Promise.all([
      query<{ count: number }>('SELECT COUNT(*) as count FROM "Building"'),
      query<{ count: number }>('SELECT COUNT(*) as count FROM "Room"'),
      query<{ count: number }>('SELECT COUNT(*) as count FROM "Tenant" WHERE "isActive" = 1'),
    ]);
    return NextResponse.json({
      buildingCount: Number(buildings[0].count),
      roomCount: Number(rooms[0].count),
      tenantCount: Number(tenants[0].count),
    });
  } catch {
    return NextResponse.json({ buildingCount: 0, roomCount: 0, tenantCount: 0 });
  }
}
