// Build-time script: push Prisma schema to database
// Works with both local SQLite and Turso (libsql://) URLs
const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl) {
  console.log('[sync-db] No DATABASE_URL set, skipping schema push');
  process.exit(0);
}

console.log('[sync-db] DATABASE_URL detected, pushing schema...');

try {
  // prisma db push uses DATABASE_URL env var automatically
  // With provider=sqlite and libsql:// URL, Prisma CLI uses libsql internally
  const result = execSync('npx prisma db push --accept-data-loss --skip-generate', {
    env: { ...process.env },
    stdio: 'pipe',
    timeout: 60000, // 60 second timeout
  });
  
  if (result) {
    console.log('[sync-db]', result.toString());
  }
  console.log('[sync-db] Schema push completed successfully');
} catch (e) {
  console.error('[sync-db] Schema push failed (non-fatal):');
  if (e.stdout) console.error('[sync-db] stdout:', e.stdout.toString());
  if (e.stderr) console.error('[sync-db] stderr:', e.stderr.toString());
  // Don't fail the build
}
