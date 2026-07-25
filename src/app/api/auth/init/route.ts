import { NextRequest, NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db-init';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST - Create initial admin user (only works if no users exist)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'অবৈধ অনুরোধ' }, { status: 400 });
  }

  const { username, password, securityQuestion, securityAnswer } = body;

  if (!username || !password || !securityQuestion || !securityAnswer) {
    return NextResponse.json({ error: 'সব তথ্য দিন' }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  const trimmedQuestion = securityQuestion.trim();

  try {
    // Hash credentials in parallel with table check
    const [hashedPassword, hashedAnswer] = await Promise.all([
      bcrypt.hash(password, 10),
      bcrypt.hash(securityAnswer.toLowerCase().trim(), 10),
      ensureTablesExist(),
    ]);

    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    // Check if any user already exists
    const existing = await client.execute({
      sql: `SELECT "id", "username" FROM "User" LIMIT 1`,
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'ইউজার ইতিমধ্যে তৈরি হয়েছে' }, { status: 400 });
    }

    // Insert user
    const id = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO "User" ("id","username","password","securityQuestion","securityAnswer","isSetup","createdAt","updatedAt") VALUES (?,?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      args: [id, trimmedUsername, hashedPassword, trimmedQuestion, hashedAnswer],
    });

    return NextResponse.json({ success: true, message: 'এডমিন ইউজার তৈরি হয়েছে' });
  } catch (error: any) {
    console.error('[init] Error:', error?.message || error);
    return NextResponse.json({
      error: 'ইউজার তৈরি করতে সমস্যা হয়েছে',
      debug: error?.message || String(error)
    }, { status: 500 });
  }
}

// GET - Check if init is needed (no users exist)
export async function GET() {
  try {
    const { getAuthClient } = await import('@/lib/turso-auth');
    const client = getAuthClient();

    const result = await client.execute({ sql: `SELECT COUNT(*) as cnt FROM "User"` });
    const count = Number(result.rows[0]?.cnt) || 0;
    return NextResponse.json({ needsInit: count === 0 });
  } catch (error: any) {
    console.error('[init] GET error:', error?.message);
    return NextResponse.json({ needsInit: false });
  }
}
