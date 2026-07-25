import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, uuid } from '@/lib/turso';
import { ensureTablesExist } from '@/lib/db-init';

// GET - Fetch belonging templates for a building
export async function GET(req: NextRequest) {
  try {
    const buildingId = req.nextUrl.searchParams.get('buildingId');
    if (!buildingId) {
      return NextResponse.json({ error: 'বিল্ডিং আইডি দরকার' }, { status: 400 });
    }

    const templates = await query(
      'SELECT * FROM "BelongingTemplate" WHERE "buildingId" = ? ORDER BY "createdAt" ASC',
      [buildingId]
    );

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Belongings GET error:', error);
    return NextResponse.json({ error: 'মালামাল লোড করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// POST - Create a new belonging template
export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { buildingId, itemName, quantity } = await req.json();

    if (!buildingId || !itemName?.trim()) {
      return NextResponse.json({ error: 'বিল্ডিং ও মালামালের নাম দিন' }, { status: 400 });
    }

    const id = uuid();
    const now = new Date().toISOString();

    await execute(
      'INSERT INTO "BelongingTemplate" (id, "buildingId", "itemName", quantity, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
      [id, buildingId, itemName.trim(), parseInt(quantity) || 1, now, now]
    );

    const template = await queryOne('SELECT * FROM "BelongingTemplate" WHERE id = ?', [id]);
    return NextResponse.json(template);
  } catch (error) {
    console.error('Belongings POST error:', error);
    return NextResponse.json({ error: 'মালামাল যোগ করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// PATCH - Update a belonging template
export async function PATCH(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { id, itemName, quantity } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'আইডি দরকার' }, { status: 400 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (itemName !== undefined) {
      sets.push('"itemName" = ?');
      args.push(itemName.trim());
    }
    if (quantity !== undefined) {
      sets.push('quantity = ?');
      args.push(parseInt(quantity) || 1);
    }

    if (sets.length > 0) {
      sets.push('"updatedAt" = ?');
      args.push(new Date().toISOString());
      args.push(id);

      await execute(`UPDATE "BelongingTemplate" SET ${sets.join(', ')} WHERE id = ?`, args);
    }

    const template = await queryOne('SELECT * FROM "BelongingTemplate" WHERE id = ?', [id]);
    return NextResponse.json(template);
  } catch (error) {
    console.error('Belongings PATCH error:', error);
    return NextResponse.json({ error: 'মালামাল আপডেট করতে সমস্যা হয়েছে' }, { status: 500 });
  }
}

// DELETE - Remove a belonging template
export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'আইডি দরকার' }, { status: 400 });
    }

    await execute('DELETE FROM "BelongingTemplate" WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Belongings DELETE error:', error);
    return NextResponse.json({ error: 'মালামাল মুছে ফেলতে সমস্যা হয়েছে' }, { status: 500 });
  }
}
