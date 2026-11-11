/**
 * Development-only authentication demo seeder.
 * Run from the repository root: pnpm seed:auth
 * Creates or updates four verified demo accounts.
 */

import 'dotenv/config';
import * as bcrypt from 'bcrypt';

import { UserRole } from '../src/common/enums/user-role.enum.js';
import { AppDataSource } from '../src/database/data-source.js';
import { User } from '../src/users/entities/user.entity.js';

const demoUsers: Pick<User, 'email' | 'firstName' | 'lastName' | 'role'>[] = [
  {
    email: 'demo.admin@example.com',
    firstName: 'Demo',
    lastName: 'Admin',
    role: UserRole.ADMIN,
  },
  {
    email: 'demo.instructor1@example.com',
    firstName: 'Demo',
    lastName: 'Instructor One',
    role: UserRole.INSTRUCTOR,
  },
  {
    email: 'demo.instructor2@example.com',
    firstName: 'Demo',
    lastName: 'Instructor Two',
    role: UserRole.INSTRUCTOR,
  },
  {
    email: 'demo.student@example.com',
    firstName: 'Demo',
    lastName: 'Student',
    role: UserRole.STUDENT,
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Auth demo seeding is disabled in production.');
  }

  const password = process.env.SEED_AUTH_PASSWORD;

  if (!password || password.length < 8 || password.length > 128) {
    throw new Error(
      'Set SEED_AUTH_PASSWORD in your local .env (8-128 characters).',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await AppDataSource.initialize();

  try {
    // Upsert on email, so rerunning resets the same four accounts.
    await AppDataSource.getRepository(User).upsert(
      demoUsers.map((user) => ({ ...user, passwordHash, isVerified: true })),
      ['email'],
    );
  } finally {
    await AppDataSource.destroy();
  }

  console.log('Auth demo seed completed successfully.');

  for (const user of demoUsers) {
    console.log(`${user.role.padEnd(10)} ${user.email}`);
  }

  console.log('All accounts are verified and use SEED_AUTH_PASSWORD.');
  console.log('Warning: rerunning resets these four demo accounts.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error('Auth seed failed:', message);
  process.exitCode = 1;
});
