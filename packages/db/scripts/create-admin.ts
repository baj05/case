#!/usr/bin/env node
/**
 * Bootstrap the first platform_admin account.
 *
 * Signup (the public form) always creates a 'public' role — there is no self-
 * service path to platform_admin, by design (RT-011). An operator runs this
 * once, locally, to create the account that can reach /admin and /dashboard's
 * moderation queue.
 *
 *   node packages/db/scripts/create-admin.ts --email you@example.com --name "Your Name" --password "..."
 */
import { parseArgs } from 'node:util';
import { isInitialised } from '../src/client.ts';
import { createUser, AuthError } from '../src/repositories/auth.ts';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
  },
});

if (!isInitialised()) {
  process.stderr.write('Database not initialised. Run `npm run ingest` first.\n');
  process.exit(1);
}
if (!values.email || !values.name || !values.password) {
  process.stderr.write('Usage: --email you@example.com --name "Your Name" --password "at-least-8-chars"\n');
  process.exit(1);
}
if (values.password.length < 8) {
  process.stderr.write('Password must be at least 8 characters.\n');
  process.exit(1);
}

try {
  const user = createUser({ email: values.email, fullName: values.name, password: values.password, platformRole: 'platform_admin' });
  process.stdout.write(`Created platform_admin #${user.id} — ${user.email}\n`);
} catch (error) {
  if (error instanceof AuthError && error.code === 'EMAIL_TAKEN') {
    process.stderr.write('An account with this email already exists.\n');
  } else {
    process.stderr.write(`Failed: ${(error as Error).message}\n`);
  }
  process.exit(1);
}
