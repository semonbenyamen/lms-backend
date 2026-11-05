/**
 * Development-only authentication seed for the LMS main branch.
 * Run from the repository root: pnpm seed:auth
 * Creates/updates four dedicated demo accounts; no courses or lessons required.
 */
'use strict';

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const demoUsers = [
  { email: 'demo.admin@example.com', firstName: 'Demo', lastName: 'Admin', role: 'admin' },
  { email: 'demo.instructor1@example.com', firstName: 'Demo', lastName: 'Instructor One', role: 'instructor' },
  { email: 'demo.instructor2@example.com', firstName: 'Demo', lastName: 'Instructor Two', role: 'instructor' },
  { email: 'demo.student@example.com', firstName: 'Demo', lastName: 'Student', role: 'student' },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Auth demo seeding is disabled when NODE_ENV=production.');
  }
  const databaseUrl = process.env.DATABASE_URL;
  const password = process.env.SEED_AUTH_PASSWORD;
  if (!databaseUrl) throw new Error('DATABASE_URL is required in .env.');
  if (!password || password.length < 8 || password.length > 128) {
    throw new Error('Set SEED_AUTH_PASSWORD in your local .env (8-128 characters).');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 12);

    for (const user of demoUsers) {
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, is_verified
        ) VALUES (
          $1, $2, $3, $4, $5::public.users_role_enum, true
        )
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          is_verified = true,
          updated_at = now()
        RETURNING id, email, role, is_verified
      `, [user.email, passwordHash, user.firstName, user.lastName, user.role]);
      if (result.rowCount !== 1) throw new Error(`Could not seed ${user.email}`);
    }

    await client.query('COMMIT');
    console.log('Auth demo seed completed successfully.');
    for (const user of demoUsers) console.log(`${user.role.padEnd(10)} ${user.email}`);
    console.log('All accounts are verified and use SEED_AUTH_PASSWORD from your local .env.');
    console.log('Warning: rerunning resets these four demo accounts to SEED_AUTH_PASSWORD.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Auth seed failed:', error.message);
  process.exitCode = 1;
});
