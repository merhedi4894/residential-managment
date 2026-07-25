import { NextResponse } from "next/server";
import { query } from "@/lib/turso";

// GET /api/guests/years — Returns only unique years from guest check-in dates
// Lightweight alternative to fetching all guests just for year extraction
export async function GET() {
  try {
    const rows = await query<{ checkInDate: string }>(
      `SELECT DISTINCT "checkInDate" FROM "Guest" ORDER BY "checkInDate" DESC`
    );

    const uniqueYears = [...new Set(rows.map((g) => new Date(g.checkInDate).getFullYear()))].sort((a, b) => b - a);
    return NextResponse.json(uniqueYears, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error("Guest years GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
