<#
Apply the RPC migration and optionally run integration tests.

Usage:
  # Apply migration using supabase CLI (preferred)
  .\scripts\apply_migration_and_run_integration.ps1

  # Apply migration and run integration tests (requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
  .\scripts\apply_migration_and_run_integration.ps1 -RunTests

Notes:
- Prefers the `supabase` CLI if available. If not found, and if PostgreSQL connection env vars (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) are set, it will use psql.
- Integration tests are run via `npx jest` and will only run if the SUPABASE env vars are present.
- This script is intended for Windows PowerShell (not PowerShell Core-specific features are required).
#>
param(
  [switch]$RunTests
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$migrationFile = Join-Path $repoRoot 'supabase/migrations/20251001_create_rpc_complete_task_and_insert_next.sql'
$functionName = 'complete_task_and_insert_next'

function Command-Exists {
  param([string]$cmd)
  $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Apply-With-Supabase {
  Write-Host "Using supabase CLI to check/apply migration..."
  # Check if function exists
  try {
    $check = supabase db query --raw "SELECT proname FROM pg_proc WHERE proname = '$functionName';" 2>&1
  } catch {
    Write-Host "supabase db query failed: $_" -ForegroundColor Yellow
    return $false
  }

  if ($check -match $functionName) {
    Write-Host "Migration already applied: function '$functionName' exists." -ForegroundColor Green
    return $true
  }

  Write-Host "Applying migration file: $migrationFile"
  try {
    supabase db query --file $migrationFile
    Write-Host "Migration applied via supabase CLI." -ForegroundColor Green
    return $true
  } catch {
    Write-Host "Failed to apply migration via supabase CLI: $_" -ForegroundColor Red
    return $false
  }
}

function Apply-With-PSQL {
  Write-Host "Attempting to apply migration via psql..."
  # Require PG env vars
  $required = @('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE')
  $missing = @()
  foreach ($v in $required) { if (-not ${env:$v}) { $missing += $v } }
  if ($missing.Count -gt 0) {
    Write-Host "Missing PG env vars: $($missing -join ', '). Cannot use psql fallback." -ForegroundColor Yellow
    return $false
  }

  $conn = "postgresql://$($env:PGUSER):$($env:PGPASSWORD)@$($env:PGHOST):$($env:PGPORT)/$($env:PGDATABASE)"
  try {
    $check = psql $conn -c "SELECT proname FROM pg_proc WHERE proname = '$functionName';" 2>&1
  } catch {
    Write-Host "psql check failed: $_" -ForegroundColor Yellow
    return $false
  }
  if ($check -match $functionName) {
    Write-Host "Migration already applied: function '$functionName' exists." -ForegroundColor Green
    return $true
  }
  Write-Host "Applying migration file via psql: $migrationFile"
  try {
    psql $conn -f $migrationFile
    Write-Host "Migration applied via psql." -ForegroundColor Green
    return $true
  } catch {
    Write-Host "Failed to apply migration via psql: $_" -ForegroundColor Red
    return $false
  }
}

# Main
Write-Host "=== Apply migration: $migrationFile ==="
if (-not (Test-Path $migrationFile)) {
  Write-Host "Migration file not found: $migrationFile" -ForegroundColor Red
  exit 2
}

$applied = $false

if (Command-Exists 'supabase') {
  $applied = Apply-With-Supabase
} else {
  Write-Host "supabase CLI not found in PATH. Trying psql fallback if PG env vars are set..." -ForegroundColor Yellow
  if (Command-Exists 'psql') {
    $applied = Apply-With-PSQL
  } else {
    Write-Host "Neither supabase CLI nor psql found. Please install supabase CLI or set PG env vars for psql fallback." -ForegroundColor Red
    Write-Host "Supabase CLI: npm install -g supabase" -ForegroundColor Cyan
    exit 3
  }
}

if (-not $applied) {
  Write-Host "Migration did not apply. See messages above." -ForegroundColor Red
  exit 4
}

if ($RunTests) {
  Write-Host "=== Running integration tests ==="
  if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "Environment variables NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run integration tests." -ForegroundColor Yellow
    exit 0
  }
  # Run the integration tests via npx jest (PowerShell command)
  Write-Host "Running: npx jest __tests__/taskCompletion.integration.test.ts __tests__/taskCompletion.integration.invalid.test.ts -i --color --runInBand"
  $cmd = "npx jest __tests__/taskCompletion.integration.test.ts __tests__/taskCompletion.integration.invalid.test.ts -i --color --runInBand"
  try {
    iex $cmd
  } catch {
    Write-Host "Integration tests failed: $_" -ForegroundColor Red
    exit 5
  }
}

Write-Host "All done." -ForegroundColor Green
exit 0
