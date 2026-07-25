import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, uuid } from "@/lib/turso"
import { ensureTablesExist } from "@/lib/db-init";;

function toEnglishDigits(str: string): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return str.replace(/[০-৯]/g, (d) => String(bengaliDigits.indexOf(d)));
}

// Self-migration: ensure Guest table has all required columns
// This runs automatically to fix schema drift between Prisma schema and actual DB
let migrationRan = false;
async function ensureGuestColumns() {
  if (migrationRan) return;
  try {
    // Check which columns exist in the Guest table
    const tableInfo = await query<{ name: string }>(
      `PRAGMA table_info("Guest")`
    );
    const existingCols = new Set(tableInfo.map((c) => c.name));

    const migrations: { col: string; type: string }[] = [];
    if (!existingCols.has("checkInTime")) migrations.push({ col: "checkInTime", type: "TEXT" });
    if (!existingCols.has("checkOutTime")) migrations.push({ col: "checkOutTime", type: "TEXT" });
    if (!existingCols.has("roomId")) migrations.push({ col: "roomId", type: "TEXT" });
    if (!existingCols.has("roomNumber")) migrations.push({ col: "roomNumber", type: "TEXT" });
    if (!existingCols.has("isBooked")) migrations.push({ col: "isBooked", type: "BOOLEAN DEFAULT 0" });

    for (const m of migrations) {
      try {
        await execute(
          `ALTER TABLE "Guest" ADD COLUMN "${m.col}" ${m.type}`
        );
        console.log(`[guest-migration] Added column: ${m.col}`);
      } catch (e) {
        console.log(`[guest-migration] Column ${m.col} already exists or error:`, e);
      }
    }

    migrationRan = true;
    if (migrations.length > 0) {
      console.log(`[guest-migration] Migrated ${migrations.length} columns`);
    }
  } catch (error) {
    console.error("[guest-migration] Migration check failed:", error);
    // Don't block the request even if migration fails
  }
}

function convertGuestRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    isPaid: !!row.isPaid,
    isBooked: !!row.isBooked,
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureGuestColumns();

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const roomId = searchParams.get("roomId");
    const active = searchParams.get("active");

    const conditions: string[] = [];
    const args: any[] = [];

    if (!all && (month || year)) {
      const engYear = year ? parseInt(toEnglishDigits(year)) : null;
      const engMonth = month ? parseInt(toEnglishDigits(month)) : null;

      if (engYear && !isNaN(engYear)) {
        if (engMonth && !isNaN(engMonth) && engMonth >= 1 && engMonth <= 12) {
          conditions.push('checkInDate >= ?');
          args.push(new Date(engYear, engMonth - 1, 1).toISOString());
          conditions.push('checkInDate < ?');
          args.push(new Date(engYear, engMonth, 1).toISOString());
        } else {
          conditions.push('checkInDate >= ?');
          args.push(new Date(engYear, 0, 1).toISOString());
          conditions.push('checkInDate < ?');
          args.push(new Date(engYear + 1, 0, 1).toISOString());
        }
      } else if (engMonth && !isNaN(engMonth) && engMonth >= 1 && engMonth <= 12) {
        const cy = new Date().getFullYear();
        conditions.push('checkInDate >= ?');
        args.push(new Date(cy, engMonth - 1, 1).toISOString());
        conditions.push('checkInDate < ?');
        args.push(new Date(cy, engMonth, 1).toISOString());
      }
    }

    if (roomId) { conditions.push('roomId = ?'); args.push(roomId); }
    if (active === "true") { conditions.push('isBooked = 1'); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const guests = await query(
      `SELECT * FROM Guest ${whereClause} ORDER BY checkInDate DESC`,
      args
    );

    return NextResponse.json(guests.map(convertGuestRow), {
      headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=10' },
    });
  } catch (error) {
    console.error("Guest GET error:", error);
    return NextResponse.json({ error: "গেস্ট লোড করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureGuestColumns();

    const body = await req.json();
    const { name, address, mobile, referredBy, checkInDate, checkInTime, checkOutDate, checkOutTime, totalBill, note, isPaid, roomId, roomNumber, isBooked } = body;

    if (!name?.trim() || !checkInDate) {
      return NextResponse.json({ error: "নাম এবং চেক-ইন তারিখ দিন" }, { status: 400 });
    }

    const parsedCheckIn = new Date(checkInDate);
    if (isNaN(parsedCheckIn.getTime())) {
      return NextResponse.json({ error: "চেক-ইন তারিখ সঠিক নয়" }, { status: 400 });
    }

    let parsedCheckOut: Date | null = null;
    if (checkOutDate) {
      parsedCheckOut = new Date(checkOutDate);
      if (isNaN(parsedCheckOut.getTime())) {
        return NextResponse.json({ error: "চেক-আউট তারিখ সঠিক নয়" }, { status: 400 });
      }
    }

    const id = uuid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO Guest (id, name, address, mobile, referredBy, checkInDate, checkInTime, checkOutDate, checkOutTime, totalBill, note, isPaid, isBooked, roomId, roomNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        address?.trim() || null,
        mobile?.trim() || null,
        referredBy?.trim() || null,
        parsedCheckIn.toISOString(),
        checkInTime?.trim() || null,
        parsedCheckOut ? parsedCheckOut.toISOString() : null,
        checkOutTime?.trim() || null,
        totalBill?.trim() || null,
        note?.trim() || null,
        isPaid === true ? 1 : 0,
        isBooked === true ? 1 : 0,
        roomId || null,
        roomNumber?.trim() || null,
        now,
        now,
      ]
    );

    const guest = await queryOne(`SELECT * FROM Guest WHERE id = ?`, [id]);
    return NextResponse.json(convertGuestRow(guest));
  } catch (error) {
    console.error("Guest POST error:", error);
    return NextResponse.json({ error: "গেস্ট তৈরি করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureGuestColumns();

    const body = await req.json();
    const { id, name, address, mobile, referredBy, checkInDate, checkOutDate, checkInTime, checkOutTime, totalBill, note, isPaid, roomId, roomNumber, isBooked } = body;

    if (!id) {
      return NextResponse.json({ error: "গেস্ট ID প্রয়োজন" }, { status: 400 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { sets.push('name = ?'); args.push(name.trim()); }
    if (address !== undefined) { sets.push('address = ?'); args.push(address?.trim() || null); }
    if (mobile !== undefined) { sets.push('mobile = ?'); args.push(mobile?.trim() || null); }
    if (referredBy !== undefined) { sets.push('referredBy = ?'); args.push(referredBy?.trim() || null); }
    if (checkInTime !== undefined) { sets.push('checkInTime = ?'); args.push(checkInTime?.trim() || null); }
    if (checkOutTime !== undefined) { sets.push('checkOutTime = ?'); args.push(checkOutTime?.trim() || null); }
    if (roomId !== undefined) { sets.push('roomId = ?'); args.push(roomId || null); }
    if (roomNumber !== undefined) { sets.push('roomNumber = ?'); args.push(roomNumber?.trim() || null); }
    if (isBooked !== undefined) { sets.push('isBooked = ?'); args.push(isBooked ? 1 : 0); }
    if (checkInDate) {
      const p = new Date(checkInDate);
      if (!isNaN(p.getTime())) { sets.push('checkInDate = ?'); args.push(p.toISOString()); }
    }
    if (checkOutDate !== undefined) {
      if (checkOutDate) {
        const p = new Date(checkOutDate);
        if (!isNaN(p.getTime())) { sets.push('checkOutDate = ?'); args.push(p.toISOString()); }
      } else {
        sets.push('checkOutDate = ?');
        args.push(null);
      }
    }
    if (totalBill !== undefined) { sets.push('totalBill = ?'); args.push(totalBill?.trim() || null); }
    if (note !== undefined) { sets.push('note = ?'); args.push(note?.trim() || null); }
    if (isPaid !== undefined) { sets.push('isPaid = ?'); args.push(isPaid ? 1 : 0); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "আপডেট করার মতো কিছু নেই" }, { status: 400 });
    }

    sets.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await execute(`UPDATE Guest SET ${sets.join(', ')} WHERE id = ?`, args);

    const guest = await queryOne(`SELECT * FROM Guest WHERE id = ?`, [id]);
    return NextResponse.json(convertGuestRow(guest));
  } catch (error) {
    console.error("Guest PATCH error:", error);
    return NextResponse.json({ error: "গেস্ট আপডেট করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureGuestColumns();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "গেস্ট ID প্রয়োজন" }, { status: 400 });
    }
    await execute(`DELETE FROM Guest WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Guest DELETE error:", error);
    return NextResponse.json({ error: "গেস্ট মুছে ফেলতে সমস্যা হয়েছে" }, { status: 500 });
  }
}
