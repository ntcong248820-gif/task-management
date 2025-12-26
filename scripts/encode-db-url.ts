#!/usr/bin/env tsx

/**
 * Helper script to properly encode DATABASE_URL for Supabase
 *
 * Usage:
 *   npx tsx scripts/encode-db-url.ts
 *
 * This will prompt you for your password and generate a properly encoded URL
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔐 Supabase DATABASE_URL Encoder\n');

  const username = await question('Enter username (e.g., postgres.jtdeuxvwcwtqzjndhrlg): ');
  const password = await question('Enter password (e.g., Thanhcong2002@): ');
  const host = await question('Enter host (e.g., aws-0-ap-southeast-1.pooler.supabase.com): ');
  const usePooler = await question('Use connection pooler? (y/n, default: n): ');

  const port = usePooler.toLowerCase() === 'y' ? '6543' : '5432';
  const database = 'postgres';

  // URL encode the password
  const encodedPassword = encodeURIComponent(password);

  const databaseUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${database}`;

  console.log('\n✅ Generated DATABASE_URL:\n');
  console.log(databaseUrl);
  console.log('\n📋 Copy this to your Render environment variables');
  console.log('\n⚠️  IMPORTANT:');
  if (port === '6543') {
    console.log('   - You are using connection pooler (port 6543)');
    console.log('   - This may cause "Tenant or user not found" errors');
    console.log('   - Consider using direct connection (port 5432) instead');
  } else {
    console.log('   - You are using direct connection (port 5432) ✓');
    console.log('   - This is recommended for Render deployments');
  }

  rl.close();
}

main().catch(console.error);
