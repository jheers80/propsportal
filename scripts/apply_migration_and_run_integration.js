#!/usr/bin/env node
/*
Node script to apply the RPC migration and optionally run integration tests.

Usage:
  node scripts/apply_migration_and_run_integration.js            # apply migration
  node scripts/apply_migration_and_run_integration.js --run-tests  # apply migration and run integration tests

Notes:
- Prefers the `supabase` CLI if available. Falls back to psql using PG env vars.
- Integration tests run via `npx jest` and require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
*/
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const migrationFile = path.join(repoRoot, 'supabase', 'migrations', '20251001_create_rpc_complete_task_and_insert_next.sql');
const functionName = 'complete_task_and_insert_next';

function exists(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function hasSupabaseCli() {
  return exists('supabase --version');
}

function hasPsql() {
  return exists('psql --version');
}

function applyWithSupabase() {
  console.log('Using supabase CLI to check/apply migration...');
  try {
    const check = execSync(`supabase db query --raw "SELECT proname FROM pg_proc WHERE proname = '${functionName}';"`, { encoding: 'utf8' });
    if (check && check.toLowerCase().includes(functionName)) {
      console.log(`Migration already applied: function '${functionName}' exists.`);
      return true;
    }
  } catch (err) {
    console.warn('supabase db query failed:', err.message);
    // continue to try applying
  }

  console.log(`Applying migration file: ${migrationFile}`);
  try {
    execSync(`supabase db query --file "${migrationFile}"`, { stdio: 'inherit' });
    console.log('Migration applied via supabase CLI.');
    return true;
  } catch (err) {
    console.error('Failed to apply migration via supabase CLI:', err.message);
    return false;
  }
}

function applyWithPsql() {
  console.log('Attempting to apply migration via psql...');
  const required = ['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`Missing PG env vars: ${missing.join(', ')}. Cannot use psql fallback.`);
    return false;
  }
  const conn = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  try {
    const check = execSync(`psql "${conn}" -c "SELECT proname FROM pg_proc WHERE proname = '${functionName}';"`, { encoding: 'utf8' });
    if (check && check.toLowerCase().includes(functionName)) {
      console.log(`Migration already applied: function '${functionName}' exists.`);
      return true;
    }
  } catch (err) {
    console.warn('psql check failed:', err.message);
    // continue to apply
  }
  try {
    execSync(`psql "${conn}" -f "${migrationFile}"`, { stdio: 'inherit' });
    console.log('Migration applied via psql.');
    return true;
  } catch (err) {
    console.error('Failed to apply migration via psql:', err.message);
    return false;
  }
}

function runIntegrationTests() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run integration tests.');
    return false;
  }
  console.log('Running integration tests...');
  const cmd = 'npx';
  const args = ['jest', '__tests__/taskCompletion.integration.test.ts', '__tests__/taskCompletion.integration.invalid.test.ts', '-i', '--color', '--runInBand'];
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  return res.status === 0;
}

async function main() {
  if (!fs.existsSync(migrationFile)) {
    console.error('Migration file not found:', migrationFile);
    process.exit(2);
  }

  let applied = false;
  if (hasSupabaseCli()) {
    applied = applyWithSupabase();
  } else if (hasPsql()) {
    applied = applyWithPsql();
  } else {
    console.error('Neither supabase CLI nor psql found in PATH. Please install supabase CLI or set PG env vars for psql fallback.');
    console.error('Supabase CLI: npm install -g supabase');
    process.exit(3);
  }

  if (!applied) {
    console.error('Migration did not apply. See messages above.');
    process.exit(4);
  }

  const shouldRunTests = process.argv.includes('--run-tests') || process.argv.includes('-r');
  if (shouldRunTests) {
    const ok = runIntegrationTests();
    if (!ok) {
      console.error('Integration tests failed.');
      process.exit(5);
    }
  }

  console.log('All done.');
}

main();
